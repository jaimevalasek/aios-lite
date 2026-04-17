'use strict';

/**
 * aioson commit:prepare — pre-collect commit context so @committer spends tokens
 * only on creative work (message writing), not on file exploration.
 *
 * Usage:
 *   aioson commit:prepare .
 *   aioson commit:prepare . --staged-only
 *   aioson commit:prepare . --agent-safe --staged-only --mode=headless
 *   aioson commit:prepare . --json
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const readline = require('node:readline');
const { runGitGuard } = require('./git-guard');
const { promptCheckbox } = require('../lib/terminal-checkbox');

function runGit(gitRoot, args, options = {}) {
  return execFileSync('git', args, {
    cwd: gitRoot,
    encoding: options.encoding || 'utf8',
    maxBuffer: options.maxBuffer || 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function resolveGitRoot(projectDir) {
  return String(runGit(projectDir, ['rev-parse', '--show-toplevel'])).trim();
}

function parseGitStatusShort(gitRoot) {
  const output = runGit(gitRoot, ['status', '--short']);
  const lines = output.split('\n').filter(Boolean);
  const staged = [];
  const unstaged = [];
  const untracked = [];

  for (const line of lines) {
    const status = line.slice(0, 2);
    const rawPath = line.slice(3);
    // Handle "R" rename format: "R  old -> new"
    const filePath = rawPath.includes(' -> ') ? rawPath.split(' -> ').pop() : rawPath;

    const isStaged = status[0] !== ' ' && status[0] !== '?';
    const isUnstaged = status[1] !== ' ' && status[1] !== '?';
    const isUntracked = status === '??';

    if (isUntracked) {
      untracked.push(filePath);
    } else {
      if (isStaged) staged.push(filePath);
      if (isUnstaged) unstaged.push(filePath);
    }
  }

  return { staged, unstaged, untracked };
}

function askQuestion(rl, questionText) {
  return new Promise((resolve) => {
    rl.question(questionText, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function promptFileSelectionCheckbox(files) {
  if (files.length === 0) return [];

  process.stdout.write('\nSelecione os arquivos para adicionar ao stage (todos começam marcados):\n');

  const selected = await promptCheckbox(
    files,
    '↑/↓ navegar | Espaço selecionar | Enter confirmar | a=todos | n=limpar'
  );

  return selected;
}

async function promptYesNo(questionText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await askQuestion(rl, `${questionText} (s/N): `);
  rl.close();
  return answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim';
}

async function promptMenu(items, questionText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  process.stdout.write('\n');
  items.forEach((item, i) => {
    process.stdout.write(`  ${i + 1}. ${item}\n`);
  });
  process.stdout.write('\n');

  const answer = await askQuestion(rl, `${questionText} `);
  rl.close();

  const num = parseInt(answer, 10);
  if (isNaN(num) || num < 1 || num > items.length) return -1;
  return num;
}

function findLatestRelevantPlan(gitRoot) {
  const candidates = [
    path.join(gitRoot, '.aioson', 'plans'),
    path.join(gitRoot, 'plans')
  ];

  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir)
      .map((name) => {
        const full = path.join(dir, name);
        try {
          const stat = fs.statSync(full);
          return { name, full, mtime: stat.mtime };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime);

    for (const entry of entries) {
      const manifest = path.join(entry.full, 'manifest.md');
      if (fs.existsSync(manifest)) {
        try {
          return fs.readFileSync(manifest, 'utf8');
        } catch {
          // ignore read errors
        }
      }
    }
  }

  return null;
}

function isPrepStale(prep) {
  if (!prep || !prep.generatedAt) return true;
  const generated = new Date(prep.generatedAt).getTime();
  const now = Date.now();
  return Number.isNaN(generated) || now - generated > 30 * 60 * 1000;
}

function wasPrepCommitted(prep) {
  return Boolean(prep && prep.committedAt);
}

async function runCommitPrepare({ args, options, logger }) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const jsonMode = Boolean(options.json);
  const stagedOnly = Boolean(options['staged-only'] || options.stagedOnly);
  const agentSafe = Boolean(options['agent-safe'] || options.agentSafe);
  const requestedMode = String(options.mode || '').trim().toLowerCase();
  const headlessMode = requestedMode === 'headless' || agentSafe;
  const nonInteractive = jsonMode || Boolean(options['non-interactive'] || options.nonInteractive) || agentSafe;
  const hasTty = Boolean(process.stdin && process.stdin.isTTY && process.stdout && process.stdout.isTTY);
  const interactiveSelectionAllowed = !nonInteractive && hasTty && !headlessMode;

  let gitRoot;
  try {
    gitRoot = resolveGitRoot(projectDir);
  } catch (error) {
    const failure = {
      ok: false,
      error: 'not_a_git_repository',
      message: `Unable to find git root in ${projectDir}: ${error.message}`
    };
    if (jsonMode) return failure;
    logger.error(failure.message);
    process.exitCode = 1;
    return failure;
  }

  const prepDir = path.join(gitRoot, '.aioson', 'context');
  const prepPath = path.join(prepDir, 'commit-prep.json');

  const { staged, unstaged, untracked } = parseGitStatusShort(gitRoot);

  let existingPrep = null;
  try {
    existingPrep = JSON.parse(fs.readFileSync(prepPath, 'utf8'));
  } catch {
    existingPrep = null;
  }

  const currentStagedSet = new Set(staged);
  const prepStagedSet = new Set(Array.isArray(existingPrep?.stagedFiles) ? existingPrep.stagedFiles : []);
  const stagedFilesChanged = currentStagedSet.size !== prepStagedSet.size || [...currentStagedSet].some((f) => !prepStagedSet.has(f));

  const shouldReuse = existingPrep && existingPrep.ready && !isPrepStale(existingPrep) && !wasPrepCommitted(existingPrep) && !stagedFilesChanged;

  if (shouldReuse && stagedOnly) {
    if (!jsonMode) {
      logger.log('Reutilizando commit-prep.json existente e válido.');
    }
    return {
      ok: true,
      gitRoot,
      prepPath,
      reused: true,
      stagedCount: Array.isArray(existingPrep.stagedFiles) ? existingPrep.stagedFiles.length : 0,
      guardOk: Boolean(existingPrep.guard && existingPrep.guard.ok),
      ready: true
    };
  }
  const allModified = [...new Set([...unstaged, ...untracked])];

  let filesToStage = [];

  if (stagedOnly) {
    filesToStage = [];
    if (!jsonMode) {
      logger.log('Modo --staged-only: usando apenas arquivos já no stage.');
    }
  } else if (allModified.length > 0) {
    if (!jsonMode) {
      logger.log('Arquivos modificados ou não rastreados encontrados:');
    }

    if (!interactiveSelectionAllowed) {
      const failure = {
        ok: false,
        error: headlessMode ? 'explicit_staging_required_in_headless' : 'explicit_staging_required',
        message: headlessMode
          ? 'Modo agent-safe/headless não pode abrir seleção interativa de arquivos. Faça stage explícito antes de continuar ou rode com --staged-only se quiser usar somente o stage atual.'
          : 'Modo não interativo sem TTY não pode abrir seleção de arquivos. Faça stage explícito antes de continuar ou rode com --staged-only.',
        gitRoot,
        stagedFiles: staged,
        unstagedFiles: unstaged,
        untrackedFiles: untracked,
        modifiedFiles: allModified,
        suggestedCommands: headlessMode
          ? [
              'git add -- <explicit-paths>',
              'aioson commit:prepare . --agent-safe --staged-only --mode=headless'
            ]
          : [
              'git add -- <explicit-paths>',
              'aioson commit:prepare . --staged-only'
            ],
        ready: false,
        nonInteractive: true,
        agentSafe,
        mode: requestedMode || null
      };
      if (jsonMode) return failure;
      logger.error(failure.message);
      logger.error('Comandos sugeridos:');
      failure.suggestedCommands.forEach((command) => logger.error(`  ${command}`));
      process.exitCode = 1;
      return failure;
    }

    const choice = await promptMenu([
          'selecionar arquivos específicos',
          'prosseguir apenas com o que já está no stage',
          'cancelar'
        ], 'O que deseja fazer?');

    if (choice === 1) {
      filesToStage = await promptFileSelectionCheckbox(allModified);
    } else if (choice === 2) {
      filesToStage = [];
    } else {
      const cancelResult = { ok: false, error: 'cancelled_by_user', message: 'Operação cancelada pelo usuário.' };
      if (jsonMode) return cancelResult;
      logger.log('Cancelado.');
      return cancelResult;
    }
  }

  if (filesToStage.length > 0) {
    try {
      runGit(gitRoot, ['add', '--', ...filesToStage]);
      if (!jsonMode) {
        logger.log(`Adicionados ao stage: ${filesToStage.join(', ')}`);
      }
    } catch (error) {
      const failure = {
        ok: false,
        error: 'git_add_failed',
        message: `git add failed: ${error.message}`
      };
      if (jsonMode) return failure;
      logger.error(failure.message);
      process.exitCode = 1;
      return failure;
    }
  }

  // Re-read staged files after add
  const afterAddStatus = parseGitStatusShort(gitRoot);
  const stagedFiles = afterAddStatus.staged;

  if (stagedFiles.length === 0) {
    const emptyResult = {
      ok: false,
      error: 'no_staged_files',
      message: 'Nenhum arquivo no stage para commit.',
      gitRoot,
      stagedFiles: [],
      ready: false
    };
    if (jsonMode) return emptyResult;
    logger.error(emptyResult.message);
    process.exitCode = 1;
    return emptyResult;
  }

  // Run git guard
  const guardResult = await runGitGuard({
    args: [projectDir],
    options: { json: true },
    logger: { log: () => {}, error: () => {} }
  });

  if (!guardResult.ok) {
    const failure = {
      ok: false,
      error: 'guard_failed',
      message: 'aioson git:guard bloqueou o commit. Corrija os problemas antes de continuar.',
      gitRoot,
      guard: guardResult,
      stagedFiles,
      ready: false
    };
    if (jsonMode) return failure;
    logger.error(failure.message);
    if (guardResult.errors && guardResult.errors.length > 0) {
      logger.error('Erros:');
      guardResult.errors.forEach((e) => logger.error(`  - ${e.path}: ${e.reason} [${e.id}]`));
    }
    if (guardResult.warnings && guardResult.warnings.length > 0) {
      logger.error('Avisos:');
      guardResult.warnings.forEach((w) => logger.error(`  - ${w.path}: ${w.reason} [${w.id}]`));
    }
    if (guardResult.suggestedCommands && guardResult.suggestedCommands.length > 0) {
      logger.error('Comandos sugeridos:');
      guardResult.suggestedCommands.forEach((cmd) => logger.error(`  ${cmd}`));
    }
    process.exitCode = 1;
    return failure;
  }

  // Collect diff
  let diff = '';
  try {
    diff = runGit(gitRoot, ['diff', '--staged']);
  } catch (error) {
    diff = `// error reading diff: ${error.message}`;
  }

  // Collect recent log
  let recentLog = [];
  try {
    const logOutput = runGit(gitRoot, ['log', '-n', '3', '--oneline']);
    recentLog = logOutput.split('\n').filter(Boolean);
  } catch {
    recentLog = [];
  }

  // Collect project pulse
  let projectPulse = null;
  const pulsePath = path.join(gitRoot, '.aioson', 'context', 'project-pulse.md');
  if (fs.existsSync(pulsePath)) {
    try {
      projectPulse = fs.readFileSync(pulsePath, 'utf8');
    } catch {
      projectPulse = null;
    }
  }

  // Collect relevant plan
  const relevantPlan = findLatestRelevantPlan(gitRoot);

  const prep = {
    generatedAt: new Date().toISOString(),
    gitRoot,
    preparationMode: agentSafe ? 'agent_safe' : stagedOnly ? 'staged_only' : interactiveSelectionAllowed ? 'interactive' : 'non_interactive',
    status: {
      staged,
      unstaged,
      untracked,
      filesToStage
    },
    stagedFiles,
    guard: guardResult,
    diff,
    recentLog,
    projectPulse,
    relevantPlan,
    ready: true
  };

  fs.mkdirSync(prepDir, { recursive: true });
  fs.writeFileSync(prepPath, JSON.stringify(prep, null, 2), 'utf8');

  if (!jsonMode) {
    logger.log(`\n✔ Commit prep pronto. Dados salvos em: ${prepPath}`);
    logger.log(`  Arquivos no stage: ${stagedFiles.length}`);
    logger.log(`  Guard: passou`);
    logger.log(`  Diff: ${diff.split('\n').length} linhas`);
    logger.log(`\nAgora ative @committer — ele usará esses dados sem gastar tokens em exploração.`);
  }

  return {
    ok: true,
    gitRoot,
    prepPath,
    stagedCount: stagedFiles.length,
    guardOk: true,
    ready: true
  };
}

module.exports = { runCommitPrepare };
