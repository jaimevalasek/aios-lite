'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { ensureDir } = require('../utils');

function toArg(value) {
  return typeof value === 'string' ? value : String(value);
}

function commandFailureDetail(result, t) {
  const stderr = String((result && result.stderr) || '').trim();
  const stdout = String((result && result.stdout) || '').trim();
  return stderr || stdout || t('package_test.error_unknown_detail');
}

async function runCommand(cmd, args, options = {}) {
  const cwd = options.cwd || process.cwd();
  const env = { ...process.env, ...(options.env || {}) };
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args.map((arg) => toArg(arg)), {
      cwd,
      env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        code: Number(code || 0),
        stdout,
        stderr
      });
    });
  });
}

function parsePackResult(stdout) {
  const lines = String(stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';
  return lines[lines.length - 1];
}

async function resolveTarballFromDir(packDir) {
  const files = await fs.readdir(packDir);
  const tgz = files.filter((file) => file.endsWith('.tgz'));
  if (tgz.length === 0) return '';

  let latestName = '';
  let latestTime = -1;
  for (const file of tgz) {
    const stat = await fs.stat(path.join(packDir, file));
    if (stat.mtimeMs >= latestTime) {
      latestTime = stat.mtimeMs;
      latestName = file;
    }
  }
  return latestName;
}

async function runPackageTest({ args, options = {}, logger, t }) {
  const sourceDir = path.resolve(process.cwd(), args[0] || '.');
  const keep = Boolean(options.keep);
  const dryRun = Boolean(options['dry-run']);
  const jsonMode = Boolean(options.json);

  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-package-test-'));
  const projectName = 'sample-app';
  const projectDir = path.join(workspaceRoot, projectName);
  const packDir = path.join(workspaceRoot, 'dist');
  const npmCacheDir = path.join(workspaceRoot, '.npm-cache');
  await ensureDir(packDir);
  await ensureDir(npmCacheDir);

  const steps = [];
  let tarballName = '';
  let tarballPath = '';
  let doctorResult = null;
  let mcpResult = null;

  try {
    if (dryRun) {
      steps.push('dry-run:plan-only');
      return {
        ok: true,
        dryRun: true,
        keep,
        sourceDir,
        workspaceRoot,
        projectDir,
        steps
      };
    }

    const pack = await runCommand('npm', ['pack', '--silent', '--pack-destination', packDir], {
      cwd: sourceDir,
      env: {
        NPM_CONFIG_CACHE: npmCacheDir,
        npm_config_cache: npmCacheDir
      }
    });
    if (pack.code !== 0) {
      throw new Error(
        t('package_test.error_npm_pack', {
          detail: commandFailureDetail(pack, t)
        })
      );
    }
    tarballName = parsePackResult(pack.stdout);
    if (!tarballName) {
      tarballName = await resolveTarballFromDir(packDir);
    }
    if (!tarballName) {
      throw new Error(t('package_test.error_tarball_missing'));
    }
    tarballPath = path.join(packDir, tarballName);
    steps.push('pack');

    const init = await runCommand(
      'npx',
      ['--yes', '--package', tarballPath, 'aioson', 'init', projectName, '--locale=en'],
      {
        cwd: workspaceRoot,
        env: {
          NPM_CONFIG_CACHE: npmCacheDir,
          npm_config_cache: npmCacheDir
        }
      }
    );
    if (init.code !== 0) {
      throw new Error(
        t('package_test.error_npx_init', {
          detail: commandFailureDetail(init, t)
        })
      );
    }
    steps.push('npx:init');

    const setup = await runCommand(
      'npx',
      [
        '--yes',
        '--package',
        tarballPath,
        'aioson',
        'setup:context',
        projectDir,
        '--defaults',
        '--project-name=sample-app',
        '--project-type=web_app',
        '--profile=developer',
        '--framework=Node/Express',
        '--framework-installed=true',
        '--language=en',
        '--backend-choice=4',
        '--database-choice=3'
      ],
      {
        cwd: workspaceRoot,
        env: {
          NPM_CONFIG_CACHE: npmCacheDir,
          npm_config_cache: npmCacheDir
        }
      }
    );
    if (setup.code !== 0) {
      throw new Error(
        t('package_test.error_npx_setup_context', {
          detail: commandFailureDetail(setup, t)
        })
      );
    }
    steps.push('npx:setup-context');

    const doctor = await runCommand(
      'npx',
      ['--yes', '--package', tarballPath, 'aioson', 'doctor', projectDir, '--json'],
      {
        cwd: workspaceRoot,
        env: {
          NPM_CONFIG_CACHE: npmCacheDir,
          npm_config_cache: npmCacheDir
        }
      }
    );
    if (doctor.code !== 0) {
      throw new Error(
        t('package_test.error_npx_doctor', {
          detail: commandFailureDetail(doctor, t)
        })
      );
    }
    doctorResult = JSON.parse(doctor.stdout);
    if (!doctorResult.ok) {
      throw new Error(t('package_test.error_doctor_not_ok'));
    }
    steps.push('npx:doctor');

    const mcp = await runCommand(
      'npx',
      ['--yes', '--package', tarballPath, 'aioson', 'mcp:init', projectDir, '--json'],
      {
        cwd: workspaceRoot,
        env: {
          NPM_CONFIG_CACHE: npmCacheDir,
          npm_config_cache: npmCacheDir
        }
      }
    );
    if (mcp.code !== 0) {
      throw new Error(
        t('package_test.error_npx_mcp_init', {
          detail: commandFailureDetail(mcp, t)
        })
      );
    }
    mcpResult = JSON.parse(mcp.stdout);
    if (!mcpResult.ok) {
      throw new Error(t('package_test.error_mcp_not_ok'));
    }
    steps.push('npx:mcp-init');

    const output = {
      ok: true,
      dryRun: false,
      keep,
      sourceDir,
      workspaceRoot,
      projectDir,
      tarballName,
      tarballPath,
      steps,
      doctorOk: doctorResult.ok,
      mcpServerCount: mcpResult.serverCount
    };

    if (jsonMode) {
      return output;
    }

    logger.log(t('package_test.start', { sourceDir }));
    logger.log(t('package_test.pack_done', { tarball: tarballName }));
    logger.log(t('package_test.completed', { count: steps.length }));
    logger.log(t('package_test.workspace', { path: workspaceRoot }));

    return output;
  } finally {
    if (!keep && !dryRun) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  }
}

module.exports = {
  runPackageTest,
  runCommand,
  commandFailureDetail,
  parsePackResult,
  resolveTarballFromDir
};
