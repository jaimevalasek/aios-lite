'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');

const CORE_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_DASHBOARD_ROOT = path.resolve(CORE_ROOT, '..', 'aios-dashboard');
const BLOCK_ORDER = ['A', 'B', 'C', 'D'];

const BLOCKS = {
  A: {
    key: 'A',
    label: 'Bloco A — Core do aioson',
    repo: 'core',
    command: ['npm', 'run', 'test:genome-2.0:block-a'],
    gate: [
      'persistencia do genome 2.0',
      'binding em squad estavel',
      'compatibilidade de leitura antiga e nova'
    ]
  },
  B: {
    key: 'B',
    label: 'Bloco B — Dashboard / incubacao e catalogo',
    repo: 'dashboard',
    command: ['npm', 'run', 'test:genome-2.0:block-b'],
    gate: [
      'artisan suporta Genome Brief',
      'catalogo /genomes le genomes antigos e novos'
    ]
  },
  C: {
    key: 'C',
    label: 'Bloco C — Dashboard / bindings e pipeline',
    repo: 'dashboard',
    command: ['npm', 'run', 'test:genome-2.0:block-c'],
    gate: [
      'bindings de squad e executor estaveis',
      'pipeline mostra genomes apenas como contexto'
    ]
  },
  D: {
    key: 'D',
    label: 'Bloco D — Consolidacao',
    repo: 'dashboard',
    command: ['npm', 'run', 'test:genome-2.0:block-d'],
    gate: [
      'suite automatizada completa',
      'checklist manual pronto para fechamento'
    ]
  }
};

function parseArgs(argv = []) {
  const options = {
    block: 'all',
    dashboardRoot: DEFAULT_DASHBOARD_ROOT,
    skipDashboard: false,
    dryRun: false,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--skip-dashboard') {
      options.skipDashboard = true;
      continue;
    }

    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (argument === '--json') {
      options.json = true;
      continue;
    }

    if (argument === '--block') {
      options.block = String(argv[index + 1] || 'all');
      index += 1;
      continue;
    }

    if (argument.startsWith('--block=')) {
      options.block = argument.split('=', 2)[1];
      continue;
    }

    if (argument === '--dashboard-root') {
      options.dashboardRoot = path.resolve(String(argv[index + 1] || DEFAULT_DASHBOARD_ROOT));
      index += 1;
      continue;
    }

    if (argument.startsWith('--dashboard-root=')) {
      options.dashboardRoot = path.resolve(argument.split('=', 2)[1]);
      continue;
    }

    throw new Error(`Unknown option: ${argument}`);
  }

  return options;
}

function normalizeBlock(value) {
  const normalized = String(value || 'all').trim().toUpperCase();
  if (!normalized || normalized === 'ALL') return 'all';
  if (BLOCKS[normalized]) return normalized;
  throw new Error(`Unsupported block "${value}". Expected one of: A, B, C, D, all.`);
}

function buildRolloutPlan(input = {}) {
  const options = {
    ...input,
    block: normalizeBlock(input.block),
    dashboardRoot: path.resolve(input.dashboardRoot || DEFAULT_DASHBOARD_ROOT),
    skipDashboard: Boolean(input.skipDashboard)
  };

  const requestedBlocks = options.block === 'all' ? BLOCK_ORDER : [options.block];
  const plan = [];

  for (const key of requestedBlocks) {
    const block = BLOCKS[key];
    if (options.skipDashboard && block.repo === 'dashboard') continue;

    plan.push({
      key: block.key,
      label: block.label,
      repo: block.repo,
      cwd: block.repo === 'core' ? CORE_ROOT : options.dashboardRoot,
      command: [...block.command],
      gate: [...block.gate]
    });
  }

  return plan;
}

function formatPlan(plan) {
  const lines = [];

  for (const block of plan) {
    lines.push(`${block.key}. ${block.label}`);
    lines.push(`   repo: ${block.repo}`);
    lines.push(`   cwd: ${block.cwd}`);
    lines.push(`   cmd: ${block.command.join(' ')}`);
    lines.push(`   gate: ${block.gate.join('; ')}`);
  }

  return lines.join('\n');
}

function validatePlan(plan) {
  if (!plan.length) {
    throw new Error('Rollout plan is empty. Remove --skip-dashboard or choose a valid block.');
  }

  for (const block of plan) {
    if (block.repo === 'dashboard' && !existsSync(block.cwd)) {
      throw new Error(
        `Dashboard repo not found at ${block.cwd}. Pass --dashboard-root=<path> or use --skip-dashboard.`
      );
    }
  }
}

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      stdio: 'inherit',
      shell: false
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed with exit code ${code}: ${command.join(' ')}`));
    });
  });
}

async function runGenome20Rollout(input = {}) {
  const plan = buildRolloutPlan(input);
  validatePlan(plan);

  if (input.dryRun) {
    return {
      ok: true,
      dryRun: true,
      plan
    };
  }

  for (const block of plan) {
    process.stdout.write(`\n==> ${block.label}\n`);
    process.stdout.write(`cwd: ${block.cwd}\n`);
    process.stdout.write(`cmd: ${block.command.join(' ')}\n`);
    await runCommand(block.command, block.cwd);
  }

  return {
    ok: true,
    dryRun: false,
    plan
  };
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));

  runGenome20Rollout(options)
    .then((result) => {
      if (options.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      if (result.dryRun) {
        process.stdout.write(`${formatPlan(result.plan)}\n`);
        return;
      }

      process.stdout.write('\nGenome 2.0 rollout checks completed successfully.\n');
    })
    .catch((error) => {
      process.stderr.write(`${error.stack || error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  BLOCKS,
  DEFAULT_DASHBOARD_ROOT,
  buildRolloutPlan,
  parseArgs,
  runGenome20Rollout
};
