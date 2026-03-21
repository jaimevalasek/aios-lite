'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-json-cli-'));
}

function runCli(args, cwd = process.cwd()) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), 'bin/aioson.js'), ...args], {
      cwd,
      env: process.env
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function createSquadSnapshot() {
  return {
    kind: 'aiosforge.squad',
    exportVersion: 1,
    squad: {
      id: 'sq_123',
      name: 'YouTube Creator',
      slug: 'youtube-creator',
      description: 'Squad para roteiros e assets.',
      goal: 'Criar conteudo de video.',
      visibility: 'FREE',
      status: 'PUBLISHED',
      ownerUsername: 'jaime',
      projectName: 'YT Lab'
    },
    version: {
      id: 'sv_123',
      versionNumber: '1.0.0',
      versionCode: 1,
      title: 'Initial release',
      summary: 'Primeiro snapshot',
      changeLog: null,
      compatibilityMin: '1.1.1',
      compatibilityMax: '1.x',
      schemaVersion: '1',
      sourceType: 'dashboard_publish',
      isCurrent: true,
      createdAt: new Date().toISOString(),
      manifestJson: null,
      agentsManifestJson: null,
      genomesManifestJson: null
    },
    appliedGenomes: []
  };
}

function createGenomeSnapshot() {
  return {
    kind: 'aiosforge.genome',
    exportVersion: 1,
    genome: {
      id: 'gn_cloud_1',
      name: 'Storytelling BR',
      slug: 'storytelling-br',
      description: 'Genome para storytelling em portugues.',
      visibility: 'FREE',
      status: 'PUBLISHED',
      sourceKind: 'AIOSLITE',
      ownerUsername: 'jaime'
    },
    version: {
      id: 'gv_cloud_1',
      versionNumber: '2.0.0',
      versionCode: 2,
      title: 'Refined',
      summary: 'Heuristicas refinadas',
      schemaVersion: '1',
      isCurrent: true,
      createdAt: new Date().toISOString(),
      contentMarkdown: '# O que saber\n\n- Ritmo\n- Gancho\n- Retencao',
      manifestJson: null
    }
  };
}

function createDataUrl(payload) {
  return `data:application/json,${encodeURIComponent(JSON.stringify(payload))}`;
}

test('info --json returns structured payload', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['info', dir, '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.targetDir, path.resolve(dir));
});

test('init --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['init', 'demo-json-init', '--json'], dir);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(Array.isArray(parsed.copied), true);
  assert.equal(typeof parsed.existingInstall, 'boolean');
});

test('install --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['install', dir, '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(Array.isArray(parsed.copied), true);
  assert.equal(typeof parsed.existingInstall, 'boolean');
});

test('update --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  const install = await runCli(['install', dir, '--json']);
  assert.equal(install.code, 0);

  const update = await runCli(['update', dir, '--json']);
  assert.equal(update.code, 0);
  assert.equal(update.stderr.trim(), '');
  const parsed = JSON.parse(update.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(Array.isArray(parsed.copied), true);
  assert.equal(typeof parsed.existingInstall, 'boolean');
});

test('agents --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['agents', dir, '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(typeof parsed.count, 'number');
  assert.equal(Array.isArray(parsed.agents), true);
  assert.equal(typeof parsed.locale, 'string');
  const uxAgent = parsed.agents.find((agent) => agent.id === 'ux-ui');
  assert.equal(uxAgent.displayName, 'UI/UX');
});

test('agent:prompt --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['agent:prompt', 'setup', dir, '--tool=codex', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.agent, 'setup');
  assert.equal(parsed.tool, 'codex');
  assert.equal(typeof parsed.locale, 'string');
  assert.equal(typeof parsed.prompt, 'string');
});

test('workflow:next --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  await fs.mkdir(path.join(dir, '.aioson/context'), { recursive: true });
  await fs.writeFile(
    path.join(dir, '.aioson/context/project.context.md'),
    `---\nproject_name: "demo"\nproject_type: "web_app"\nprofile: "developer"\nframework: "Next.js"\nframework_installed: true\nclassification: "SMALL"\nconversation_language: "en"\naioson_version: "1.2.1"\n---\n\n# Project Context\n`,
    'utf8'
  );
  await fs.writeFile(path.join(dir, '.aioson/context/prd.md'), '# PRD\n', 'utf8');

  const cli = await runCli(['workflow:next', dir, '--tool=codex', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.agent, 'analyst');
  assert.equal(parsed.current, 'analyst');
  assert.equal(parsed.statePath, '.aioson/context/workflow.state.json');
});

test('legacy dashboard commands return a structured migration error with --json', async () => {
  const dir = await makeTempDir();
  const cli = await runCli([
    'dashboard:init',
    dir,
    '--json'
  ]);
  assert.equal(cli.code, 1);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, 'dashboard_moved');
  assert.equal(parsed.error.command, 'dashboard:init');
  assert.equal(parsed.error.message.includes('.aioson/'), true);
});

test('cloud:import:squad --dry-run --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  const snapshot = createSquadSnapshot();
  const url = createDataUrl(snapshot);
  const cli = await runCli(['cloud:import:squad', dir, `--url=${url}`, '--dry-run', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.resource, 'squad');
  assert.equal(parsed.slug, 'youtube-creator');
  assert.equal(parsed.versionNumber, '1.0.0');
  assert.equal(parsed.dryRun, true);
});

test('cloud:import:genome --dry-run --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  const snapshot = createGenomeSnapshot();
  const url = createDataUrl(snapshot);
  const cli = await runCli(['cloud:import:genome', dir, `--url=${url}`, '--dry-run', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.resource, 'genome');
  assert.equal(parsed.slug, 'storytelling-br');
  assert.equal(parsed.versionNumber, '2.0.0');
  assert.equal(parsed.dryRun, true);
});

test('cloud:publish:genome --dry-run --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  const genomeDir = path.join(dir, '.aioson', 'genomes');
  await fs.mkdir(genomeDir, { recursive: true });
  await fs.writeFile(path.join(genomeDir, 'storytelling-br.md'), '# Storytelling BR\n\nHeuristicas.\n', 'utf8');

  const cli = await runCli([
    'cloud:publish:genome',
    dir,
    '--slug=storytelling-br',
    '--resource-version=2.0.0',
    '--base-url=https://aiosforge.com',
    '--dry-run',
    '--json'
  ]);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.resource, 'genome');
  assert.equal(parsed.slug, 'storytelling-br');
  assert.equal(parsed.versionNumber, '2.0.0');
  assert.equal(parsed.dryRun, true);
});

test('genome:doctor --json returns compatible genome diagnosis', async () => {
  const dir = await makeTempDir();
  const genomeDir = path.join(dir, '.aioson', 'genomes');
  await fs.mkdir(genomeDir, { recursive: true });
  await fs.writeFile(
    path.join(genomeDir, 'legacy-copy.md'),
    '---\ngenome: legacy-copy\ntype: domain\n---\n\n# Genome: Legacy Copy\n\n## O que saber\n\n- Oferta\n',
    'utf8'
  );

  const cli = await runCli([
    'genome:doctor',
    path.join(genomeDir, 'legacy-copy.md'),
    '--json'
  ]);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.detectedFormat, 'legacy-markdown');
  assert.equal(parsed.migrated, true);
  assert.equal(parsed.slug, 'legacy-copy');
});

test('genome:migrate --json returns dry-run payload without mutating files', async () => {
  const dir = await makeTempDir();
  const genomeDir = path.join(dir, '.aioson', 'genomes');
  const target = path.join(genomeDir, 'legacy-copy.md');
  await fs.mkdir(genomeDir, { recursive: true });
  const original = '---\ngenome: legacy-copy\ntype: domain\n---\n\n# Genome: Legacy Copy\n\n## O que saber\n\n- Oferta\n';
  await fs.writeFile(target, original, 'utf8');

  const cli = await runCli([
    'genome:migrate',
    target,
    '--json'
  ]);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.kind, 'file');
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.changed, true);
  const after = await fs.readFile(target, 'utf8');
  assert.equal(after, original);
});

test('squad:repair-genomes --json returns dry-run payload without mutating manifest', async () => {
  const dir = await makeTempDir();
  const manifestPath = path.join(dir, 'legacy.manifest.json');
  const original = JSON.stringify(
    {
      slug: 'legacy-squad',
      genomes: ['growth-marketing'],
      executors: [
        {
          slug: 'writer',
          genomes: ['copywriter-direct-response']
        }
      ]
    },
    null,
    2
  );
  await fs.writeFile(manifestPath, original, 'utf8');

  const cli = await runCli([
    'squad:repair-genomes',
    manifestPath,
    '--json'
  ]);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.changed, true);
  assert.equal(typeof parsed.after.genomeBindings, 'object');
  const after = await fs.readFile(manifestPath, 'utf8');
  assert.equal(after, original);
});

test('cloud:publish:squad --dry-run --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  await fs.mkdir(path.join(dir, '.aioson', 'squads'), { recursive: true });
  await fs.mkdir(path.join(dir, '.aioson', 'genomes'), { recursive: true });
  await fs.mkdir(path.join(dir, 'agents', 'youtube-creator'), { recursive: true });

  await fs.writeFile(
    path.join(dir, '.aioson', 'squads', 'youtube-creator.md'),
    [
      'Squad: YouTube Creator',
      'Goal: Criar roteiros e assets',
      'Agents: agents/youtube-creator/',
      '',
      'Genomes:',
      '- .aioson/genomes/storytelling-retencao.md',
      ''
    ].join('\n'),
    'utf8'
  );
  await fs.writeFile(
    path.join(dir, 'agents', 'youtube-creator', 'orquestrador.md'),
    '# Orquestrador\n\nCoordena o squad.\n',
    'utf8'
  );
  await fs.writeFile(
    path.join(dir, '.aioson', 'genomes', 'storytelling-retencao.md'),
    '# Storytelling Retencao\n\nGancho e retencao.\n',
    'utf8'
  );

  const cli = await runCli([
    'cloud:publish:squad',
    dir,
    '--slug=youtube-creator',
    '--resource-version=1.0.0',
    '--base-url=https://aiosforge.com',
    '--dry-run',
    '--json'
  ]);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.resource, 'squad');
  assert.equal(parsed.slug, 'youtube-creator');
  assert.equal(parsed.versionNumber, '1.0.0');
  assert.equal(parsed.dryRun, true);
});

test('locale:apply --json returns structured payload without human logs', async () => {
  const dir = await makeTempDir();
  const install = await runCli(['install', dir, '--json']);
  assert.equal(install.code, 0);

  const cli = await runCli(['locale:apply', dir, '--dry-run', '--lang=fr', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.locale, 'fr');
  assert.equal(parsed.dryRun, true);
  assert.equal(Array.isArray(parsed.copied), true);
});

test('setup:context --defaults --json returns structured payload', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['setup:context', dir, '--defaults', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(typeof parsed.filePath, 'string');
  assert.equal(typeof parsed.classificationScore, 'number');
  assert.equal(typeof parsed.data, 'object');
  assert.equal(typeof parsed.data.projectName, 'string');
  assert.equal(typeof parsed.data.aiosonVersion, 'string');
});

test('i18n:add --dry-run --json returns scaffold plan payload', async () => {
  const cli = await runCli(['i18n:add', 'zz', '--dry-run', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.locale, 'zz');
  assert.equal(parsed.dryRun, true);
  assert.equal(typeof parsed.filePath, 'string');
});

test('context:validate --json returns non-zero and reason for missing file', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['context:validate', dir, '--json']);
  assert.equal(cli.code, 1);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.reason, 'missing_file');
});

test('doctor --json returns report payload and non-zero for unhealthy workspace', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['doctor', dir, '--json']);
  assert.equal(cli.code, 1);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.fix.enabled, false);
  assert.equal(Array.isArray(parsed.report.checks), true);
});

test('test:smoke --json returns structured success payload', async () => {
  const cli = await runCli(['test:smoke', '--json', '--web3=ethereum']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.profile, 'standard');
  assert.equal(parsed.web3Target, 'ethereum');
  assert.equal(parsed.stepCount >= 10, true);
});

test('test:smoke --json works with es and fr locales', async () => {
  for (const locale of ['es', 'fr']) {
    const cli = await runCli(['test:smoke', '--json', `--locale=${locale}`]);
    assert.equal(cli.code, 0);
    assert.equal(cli.stderr.trim(), '');
    const parsed = JSON.parse(cli.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.profile, 'standard');
    assert.equal(parsed.web3Target, null);
    assert.equal(parsed.stepCount >= 8, true);
  }
});

test('test:smoke --json supports parallel profile', async () => {
  const cli = await runCli(['test:smoke', '--json', '--profile=parallel']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.profile, 'parallel');
  assert.equal(parsed.steps.includes('parallel:init'), true);
  assert.equal(parsed.steps.includes('parallel:assign'), true);
  assert.equal(parsed.steps.includes('parallel:status'), true);
  assert.equal(parsed.steps.includes('parallel:doctor'), true);
});

test('mcp:init --json returns structured plan payload', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['mcp:init', dir, '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.serverCount >= 4, true);
  assert.equal(parsed.presetCount >= 1, true);
  assert.equal(Array.isArray(parsed.presetFiles), true);
  assert.equal(Array.isArray(parsed.plan.servers), true);
});

test('mcp:doctor --json returns structured validation payload', async () => {
  const dir = await makeTempDir();
  const init = await runCli(['mcp:init', dir, '--json']);
  assert.equal(init.code, 0);

  const cli = await runCli(['mcp:doctor', dir, '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(typeof parsed.strictEnv, 'boolean');
  assert.equal(Array.isArray(parsed.checks), true);
  assert.equal(typeof parsed.summary.total, 'number');
  assert.equal(typeof parsed.summary.failed, 'number');
});

test('test:package --dry-run --json returns plan payload', async () => {
  const cli = await runCli(['test:package', '--dry-run', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.dryRun, true);
  assert.equal(Array.isArray(parsed.steps), true);
});

test('workflow:plan --json returns workflow payload', async () => {
  const cli = await runCli(['workflow:plan', '--classification=SMALL', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.classification, 'SMALL');
  assert.equal(Array.isArray(parsed.commands), true);
  assert.equal(parsed.commands.includes('@architect'), true);
});

test('parallel:init --json returns structured parallel workspace payload', async () => {
  const dir = await makeTempDir();
  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---\nproject_name: \"demo\"\nproject_type: \"web_app\"\nprofile: \"developer\"\nframework: \"Node\"\nframework_installed: true\nclassification: \"MEDIUM\"\nconversation_language: \"en\"\naioson_version: \"0.1.9\"\n---\n\n# Project Context\n`,
    'utf8'
  );

  const cli = await runCli(['parallel:init', dir, '--json', '--workers=2']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.workers, 2);
  assert.equal(parsed.classification, 'MEDIUM');
  assert.equal(Array.isArray(parsed.files), true);
  assert.equal(parsed.files.length, 3);
});

test('parallel:doctor --json returns structured diagnosis payload', async () => {
  const dir = await makeTempDir();
  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---\nproject_name: \"demo\"\nproject_type: \"web_app\"\nprofile: \"developer\"\nframework: \"Node\"\nframework_installed: true\nclassification: \"MEDIUM\"\nconversation_language: \"en\"\naioson_version: \"0.1.9\"\n---\n\n# Project Context\n`,
    'utf8'
  );

  const init = await runCli(['parallel:init', dir, '--workers=2', '--json']);
  assert.equal(init.code, 0);

  const cli = await runCli(['parallel:doctor', dir, '--workers=2', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.workers, 2);
  assert.equal(typeof parsed.fix.enabled, 'boolean');
  assert.equal(Array.isArray(parsed.checks), true);
  assert.equal(typeof parsed.summary.failed, 'number');
});

test('parallel:assign --json returns structured assignment payload', async () => {
  const dir = await makeTempDir();
  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  const architecturePath = path.join(dir, '.aioson/context/architecture.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---\nproject_name: \"demo\"\nproject_type: \"web_app\"\nprofile: \"developer\"\nframework: \"Node\"\nframework_installed: true\nclassification: \"MEDIUM\"\nconversation_language: \"en\"\naioson_version: \"0.1.9\"\n---\n\n# Project Context\n`,
    'utf8'
  );
  await fs.writeFile(
    architecturePath,
    '# Architecture\n\n## Auth Module\n## Billing Module\n## Notification Pipeline\n',
    'utf8'
  );

  const init = await runCli(['parallel:init', dir, '--workers=2', '--json']);
  assert.equal(init.code, 0);

  const cli = await runCli([
    'parallel:assign',
    dir,
    '--source=architecture',
    '--workers=2',
    '--json'
  ]);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.workers, 2);
  assert.equal(parsed.source, 'architecture');
  assert.equal(typeof parsed.scopeCount, 'number');
  assert.equal(Array.isArray(parsed.assignments), true);
});

test('parallel:status --json returns consolidated lane report payload', async () => {
  const dir = await makeTempDir();
  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---\nproject_name: \"demo\"\nproject_type: \"web_app\"\nprofile: \"developer\"\nframework: \"Node\"\nframework_installed: true\nclassification: \"MEDIUM\"\nconversation_language: \"en\"\naioson_version: \"0.1.9\"\n---\n\n# Project Context\n`,
    'utf8'
  );

  const init = await runCli(['parallel:init', dir, '--workers=2', '--json']);
  assert.equal(init.code, 0);

  const cli = await runCli(['parallel:status', dir, '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.laneCount, 2);
  assert.equal(typeof parsed.scopeCount, 'number');
  assert.equal(typeof parsed.blockerCount, 'number');
  assert.equal(typeof parsed.deliverables.total, 'number');
  assert.equal(typeof parsed.sharedDecisions.entries, 'number');
  assert.equal(Array.isArray(parsed.lanes), true);
});

test('unknown command with --json returns structured error', async () => {
  const cli = await runCli(['unknown', '--json']);
  assert.equal(cli.code, 1);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, 'unknown_command');
});
