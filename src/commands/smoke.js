'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ensureDir } = require('../utils');
const { runInstall } = require('./install');
const { runSetupContext } = require('./setup-context');
const { runLocaleApply } = require('./locale-apply');
const { runAgentsList, runAgentPrompt } = require('./agents');
const { runContextValidate } = require('./context-validate');
const { runDoctor } = require('../doctor');
const { runUpdate } = require('./update');
const { detectFramework } = require('../detector');
const { validateProjectContextFile } = require('../context');
const { runParallelInit } = require('./parallel-init');
const { runParallelAssign } = require('./parallel-assign');
const { runParallelStatus } = require('./parallel-status');
const { runParallelDoctor } = require('./parallel-doctor');

const WEB3_SMOKE_TARGETS = ['ethereum', 'solana', 'cardano'];
const SMOKE_PROFILES = ['standard', 'mixed', 'parallel'];
const WEB3_PROFILE_BY_TARGET = {
  ethereum: {
    framework: 'Hardhat',
    network: 'ethereum',
    seedPackage: {
      name: 'demo-dapp',
      devDependencies: { hardhat: '^2.24.0' }
    },
    files: [{ path: 'hardhat.config.ts', content: 'export default {};\n' }]
  },
  solana: {
    framework: 'Anchor',
    network: 'solana',
    seedPackage: {
      name: 'demo-dapp',
      dependencies: { '@coral-xyz/anchor': '^0.30.1' }
    },
    files: [{ path: 'Anchor.toml', content: '[provider]\ncluster="devnet"\n' }]
  },
  cardano: {
    framework: 'Cardano',
    network: 'cardano',
    seedPackage: {
      name: 'demo-dapp',
      dependencies: { 'lucid-cardano': '^0.10.11' }
    },
    files: [{ path: 'aiken.toml', content: 'name = "demo"\nversion = "0.1.0"\n' }]
  }
};

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

function assertStep(condition, t, key, params = {}) {
  if (!condition) {
    throw new Error(t(key, params));
  }
}

function normalizeWeb3Target(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return '';
  return value;
}

function resolveWeb3Profile(rawTarget) {
  const target = normalizeWeb3Target(rawTarget);
  if (!target) return null;
  if (!WEB3_SMOKE_TARGETS.includes(target)) return { invalid: true, target };
  return {
    target,
    ...WEB3_PROFILE_BY_TARGET[target]
  };
}

async function seedWeb3Workspace(projectDir, profile) {
  const pkgPath = path.join(projectDir, 'package.json');
  await fs.writeFile(pkgPath, `${JSON.stringify(profile.seedPackage, null, 2)}\n`, 'utf8');
  for (const file of profile.files) {
    await fs.writeFile(path.join(projectDir, file.path), file.content, 'utf8');
  }
}

async function seedMixedWorkspace(projectDir) {
  const rootPackage = {
    name: 'demo-monorepo',
    private: true,
    workspaces: ['apps/web', 'packages/contracts'],
    dependencies: {
      next: '^15.0.0'
    },
    devDependencies: {
      hardhat: '^2.24.0'
    }
  };

  await ensureDir(path.join(projectDir, 'apps/web'));
  await ensureDir(path.join(projectDir, 'packages/contracts'));

  await fs.writeFile(path.join(projectDir, 'package.json'), `${JSON.stringify(rootPackage, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(projectDir, 'next.config.js'), 'module.exports = {};\n', 'utf8');
  await fs.writeFile(path.join(projectDir, 'hardhat.config.ts'), 'export default {};\n', 'utf8');

  await fs.writeFile(
    path.join(projectDir, 'apps/web/package.json'),
    `${JSON.stringify({ name: '@demo/web', private: true, dependencies: { next: '^15.0.0' } }, null, 2)}\n`,
    'utf8'
  );
  await fs.writeFile(
    path.join(projectDir, 'packages/contracts/package.json'),
    `${JSON.stringify({ name: '@demo/contracts', private: true, devDependencies: { hardhat: '^2.24.0' } }, null, 2)}\n`,
    'utf8'
  );
}

async function seedParallelContextDocs(projectDir) {
  const contextDir = path.join(projectDir, '.aios-lite/context');
  await ensureDir(contextDir);

  const discovery = `# Discovery

## Scope candidates
- Authentication
- Billing
- Notifications
`;
  const architecture = `# Architecture

## Authentication Module
## Billing Module
## Notification Pipeline
`;
  const prd = `# PRD

## Modules
- Authentication
- Billing
- Notifications
`;

  await fs.writeFile(path.join(contextDir, 'discovery.md'), discovery, 'utf8');
  await fs.writeFile(path.join(contextDir, 'architecture.md'), architecture, 'utf8');
  await fs.writeFile(path.join(contextDir, 'prd.md'), prd, 'utf8');
}

async function runSmokeTest({ args, options, logger, t }) {
  const language = String(options.language || options.lang || 'en');
  const keep = Boolean(options.keep);
  const jsonMode = Boolean(options.json);
  const smokeProfile = String(options.profile || 'standard').trim().toLowerCase();
  if (!SMOKE_PROFILES.includes(smokeProfile)) {
    throw new Error(t('smoke.invalid_profile', { profile: smokeProfile }));
  }
  const web3Profile = resolveWeb3Profile(options.web3);
  if (web3Profile && web3Profile.invalid) {
    throw new Error(t('smoke.invalid_web3_target', { target: web3Profile.target }));
  }
  if (smokeProfile === 'mixed' && web3Profile) {
    throw new Error(t('smoke.profile_conflict'));
  }

  const baseDir = path.resolve(process.cwd(), args[0] || os.tmpdir());
  await ensureDir(baseDir);

  const workspaceRoot = await fs.mkdtemp(path.join(baseDir, 'aios-lite-smoke-'));
  const projectDir = path.join(workspaceRoot, 'demo');
  await ensureDir(projectDir);

  const steps = [];
  const quietLogger = createQuietLogger();
  const log = jsonMode ? () => {} : logger.log.bind(logger);

  try {
    log(t('smoke.start', { projectDir }));
    if (web3Profile) {
      log(t('smoke.using_web3_profile', { target: web3Profile.target }));
      await seedWeb3Workspace(projectDir, web3Profile);
      steps.push(`seed:web3:${web3Profile.target}`);
      log(t('smoke.seeded_web3_workspace', { target: web3Profile.target }));
    } else if (smokeProfile === 'mixed') {
      log(t('smoke.using_mixed_profile'));
      await seedMixedWorkspace(projectDir);
      steps.push('seed:mixed');
      log(t('smoke.seeded_mixed_workspace'));
    } else if (smokeProfile === 'parallel') {
      log(t('smoke.using_parallel_profile'));
    }

    const installResult = await runInstall({
      args: [projectDir],
      options: {},
      logger: quietLogger,
      t
    });
    assertStep(installResult.copied.length > 0, t, 'smoke.assert_install_files');
    steps.push('install');
    log(t('smoke.step_ok', { step: 'install' }));

    if (web3Profile) {
      const detection = await detectFramework(projectDir);
      assertStep(
        detection.framework === web3Profile.framework,
        t,
        'smoke.assert_web3_framework',
        { framework: detection.framework }
      );
      steps.push(`detect:web3:${web3Profile.target}`);
      log(
        t('smoke.web3_detected', {
          framework: detection.framework,
          network: web3Profile.network
        })
      );
    }

    const setupResult = await runSetupContext({
      args: [projectDir],
      options: {
        defaults: true,
        'project-name': 'demo',
        language,
        ...(web3Profile || smokeProfile === 'mixed'
          ? {}
          : {
              'project-type': 'web_app',
              profile: 'developer',
              framework: 'Node',
              'framework-installed': true
            }),
        ...(smokeProfile === 'parallel'
          ? {
              classification: 'MEDIUM'
            }
          : {})
      },
      logger: quietLogger,
      t
    });
    assertStep(Boolean(setupResult.filePath), t, 'smoke.assert_setup_written');
    if (web3Profile) {
      assertStep(setupResult.data.projectType === 'dapp', t, 'smoke.assert_setup_project_type_dapp');
      assertStep(
        String(setupResult.data.web3Networks || '').includes(web3Profile.network),
        t,
        'smoke.assert_setup_web3_network'
      );
      assertStep(
        setupResult.data.framework === web3Profile.framework,
        t,
        'smoke.assert_setup_web3_framework'
      );
    } else if (smokeProfile === 'mixed') {
      assertStep(setupResult.data.projectType === 'dapp', t, 'smoke.assert_mixed_project_type_dapp');
      assertStep(setupResult.data.web3Enabled === true, t, 'smoke.assert_mixed_web3_enabled');
      assertStep(setupResult.data.framework === 'Hardhat', t, 'smoke.assert_mixed_framework');
      steps.push('verify:mixed-context');
      log(t('smoke.mixed_context_verified', { framework: setupResult.data.framework }));
    }
    steps.push('setup:context');
    log(t('smoke.step_ok', { step: 'setup:context' }));

    const localeResult = await runLocaleApply({
      args: [projectDir],
      options: { lang: language },
      logger: quietLogger,
      t
    });
    assertStep(localeResult.copied.length > 0, t, 'smoke.assert_locale_apply_files');
    steps.push('locale:apply');
    log(t('smoke.step_ok', { step: 'locale:apply' }));

    const agentsResult = await runAgentsList({
      args: [projectDir],
      options: { lang: language },
      logger: quietLogger,
      t
    });
    assertStep(agentsResult.count >= 7, t, 'smoke.assert_agents_count');
    steps.push('agents');
    log(t('smoke.step_ok', { step: 'agents' }));

    const promptResult = await runAgentPrompt({
      args: ['setup', projectDir],
      options: { tool: 'codex', lang: language },
      logger: quietLogger,
      t
    });
    assertStep(
      promptResult.prompt.includes('.aios-lite'),
      t,
      'smoke.assert_prompt_path'
    );
    steps.push('agent:prompt');
    log(t('smoke.step_ok', { step: 'agent:prompt' }));

    const contextResult = await runContextValidate({
      args: [projectDir],
      options: {},
      logger: quietLogger,
      t
    });
    assertStep(contextResult.ok, t, 'smoke.assert_context_validate');
    steps.push('context:validate');
    log(t('smoke.step_ok', { step: 'context:validate' }));

    if (web3Profile) {
      const parsedContext = await validateProjectContextFile(projectDir);
      assertStep(parsedContext.valid, t, 'smoke.assert_web3_context_valid');
      assertStep(parsedContext.data.project_type === 'dapp', t, 'smoke.assert_web3_context_project_type');
      assertStep(parsedContext.data.web3_enabled === true, t, 'smoke.assert_web3_context_enabled');
      assertStep(
        String(parsedContext.data.web3_networks || '').includes(web3Profile.network),
        t,
        'smoke.assert_web3_context_network'
      );
      steps.push(`verify:web3-context:${web3Profile.target}`);
      log(t('smoke.web3_context_verified', { network: web3Profile.network }));
    }

    const doctorResult = await runDoctor(projectDir);
    assertStep(doctorResult.ok, t, 'smoke.assert_doctor_ok');
    steps.push('doctor');
    log(t('smoke.step_ok', { step: 'doctor' }));

    if (smokeProfile === 'parallel') {
      await seedParallelContextDocs(projectDir);
      steps.push('seed:parallel-context');
      log(t('smoke.seeded_parallel_context'));

      const parallelInit = await runParallelInit({
        args: [projectDir],
        options: { workers: 3 },
        logger: quietLogger,
        t
      });
      assertStep(parallelInit.ok, t, 'smoke.assert_parallel_init_ok');
      assertStep(parallelInit.workers === 3, t, 'smoke.assert_parallel_init_workers');
      steps.push('parallel:init');
      log(t('smoke.step_ok', { step: 'parallel:init' }));

      const parallelAssign = await runParallelAssign({
        args: [projectDir],
        options: { source: 'architecture', workers: 3 },
        logger: quietLogger,
        t
      });
      assertStep(parallelAssign.ok, t, 'smoke.assert_parallel_assign_ok');
      assertStep(parallelAssign.scopeCount > 0, t, 'smoke.assert_parallel_assign_scope');
      steps.push('parallel:assign');
      log(t('smoke.step_ok', { step: 'parallel:assign' }));

      const parallelStatus = await runParallelStatus({
        args: [projectDir],
        options: {},
        logger: quietLogger,
        t
      });
      assertStep(parallelStatus.ok, t, 'smoke.assert_parallel_status_ok');
      assertStep(parallelStatus.laneCount === 3, t, 'smoke.assert_parallel_status_lanes');
      steps.push('parallel:status');
      log(t('smoke.parallel_status_verified', { count: parallelStatus.laneCount }));

      const parallelDoctor = await runParallelDoctor({
        args: [projectDir],
        options: { workers: 3 },
        logger: quietLogger,
        t
      });
      assertStep(parallelDoctor.ok, t, 'smoke.assert_parallel_doctor_ok');
      assertStep(parallelDoctor.summary.failed === 0, t, 'smoke.assert_parallel_doctor_summary');
      steps.push('parallel:doctor');
      log(t('smoke.step_ok', { step: 'parallel:doctor' }));
    }

    await runUpdate({
      args: [projectDir],
      options: {},
      logger: quietLogger,
      t
    });
    steps.push('update');
    log(t('smoke.step_ok', { step: 'update' }));

    const output = {
      ok: true,
      language,
      targetDir: projectDir,
      web3Target: web3Profile ? web3Profile.target : null,
      profile: smokeProfile,
      steps,
      stepCount: steps.length,
      workspaceRoot,
      projectDir,
      kept: keep
    };

    if (jsonMode) {
      return output;
    }
    logger.log(t('smoke.completed'));
    logger.log(t('smoke.steps_count', { count: steps.length }));

    return output;
  } finally {
    if (!keep) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
      if (!jsonMode) {
        logger.log(t('smoke.workspace_removed', { path: workspaceRoot }));
      }
    } else {
      if (!jsonMode) {
        logger.log(t('smoke.workspace_kept', { path: workspaceRoot }));
      }
    }
  }
}

module.exports = {
  runSmokeTest
};
