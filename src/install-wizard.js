'use strict';

const readline = require('node:readline');
const { getCliVersionSync } = require('./version');

const TOOLS = [
  { id: 'claude', label: 'Claude Code', desc: 'Slash commands, CLAUDE.md, .claude/' },
  { id: 'codex', label: 'Codex (OpenAI)', desc: 'AGENTS.md protocol' },
  { id: 'gemini', label: 'Gemini CLI', desc: 'GEMINI.md + .gemini/commands/' },
  { id: 'opencode', label: 'OpenCode', desc: 'OPENCODE.md protocol' }
];

const USES = [
  {
    id: 'development',
    label: 'Development',
    desc: 'Agent workflow: setup → analyst → architect → dev → qa',
    locked: true
  },
  {
    id: 'squads',
    label: 'Squads',
    desc: 'Create and run AI squads (squad, genome, orache, profiler)',
    locked: false
  }
];

function getBanner(version, stdout) {
  const cols = (stdout && stdout.columns) || 80;
  const noColor = process.env.NO_COLOR !== undefined;
  const dumb = process.env.TERM === 'dumb';

  if (dumb || cols < 50) {
    return `AIOSON v${version}\n\n`;
  }

  const cyan = noColor ? '' : '\x1b[1;36m';
  const border = noColor ? '' : '\x1b[36m';
  const dim = noColor ? '' : '\x1b[90m';
  const reset = noColor ? '' : '\x1b[0m';

  return [
    `  ${border}╭───────────────────────────────────────────╮${reset}`,
    `  ${border}│${reset}                                           ${border}│${reset}`,
    `  ${border}│${reset}  ${cyan}█████╗ ██╗ ██████╗ ███████╗ ██████╗ ███╗   ██╗${reset}  ${border}│${reset}`,
    `  ${border}│${reset}  ${cyan}██╔══██╗██║██╔═══██╗██╔════╝██╔═══██╗████╗  ██║${reset}  ${border}│${reset}`,
    `  ${border}│${reset}  ${cyan}███████║██║██║   ██║███████╗██║   ██║██╔██╗ ██║${reset}  ${border}│${reset}`,
    `  ${border}│${reset}  ${cyan}██╔══██║██║██║   ██║╚════██║██║   ██║██║╚██╗██║${reset}  ${border}│${reset}`,
    `  ${border}│${reset}  ${cyan}██║  ██║██║╚██████╔╝███████║╚██████╔╝██║ ╚████║${reset}  ${border}│${reset}`,
    `  ${border}│${reset}  ${cyan}╚═╝  ╚═╝╚═╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝${reset}  ${border}│${reset}`,
    `  ${border}│${reset}                                           ${border}│${reset}`,
    `  ${border}│${reset}     ${dim}AI Operating Framework  v${version}${reset}        ${border}│${reset}`,
    `  ${border}│${reset}                                           ${border}│${reset}`,
    `  ${border}╰───────────────────────────────────────────╯${reset}`,
    ''
  ].join('\n') + '\n';
}

function renderScreen1(cursor, selected, warn, stdout) {
  stdout.write('\x1Bc');
  stdout.write(getBanner(getCliVersionSync(), stdout));
  stdout.write('  AIOSON — Installation Wizard  (1/2)\n\n');
  stdout.write('  Which AI tools will you use in this project?\n');
  stdout.write('  (use ↑/↓ to move, space to select, enter to continue)\n\n');

  for (let i = 0; i < TOOLS.length; i++) {
    const tool = TOOLS[i];
    const pointer = i === cursor ? '►' : ' ';
    const check = selected.has(tool.id) ? '✓' : ' ';
    stdout.write(`  ${pointer} [${check}] ${tool.label.padEnd(20)} ${tool.desc}\n`);
  }

  if (warn) {
    stdout.write('\n  ⚠  Select at least one tool to continue.\n');
  }
  stdout.write('\n');
}

function renderScreen2(cursor, selected, stdout) {
  stdout.write('\x1Bc');
  stdout.write(getBanner(getCliVersionSync(), stdout));
  stdout.write('  AIOSON — Installation Wizard  (2/2)\n\n');
  stdout.write('  What will you do with AIOSON?\n');
  stdout.write('  (space to select, enter to confirm)\n\n');

  for (let i = 0; i < USES.length; i++) {
    const use = USES[i];
    const pointer = i === cursor ? '►' : ' ';
    const check = selected.has(use.id) ? '✓' : ' ';
    const lock = use.locked ? ' (always on)' : '';
    stdout.write(`  ${pointer} [${check}] ${use.label}${lock}\n`);
    stdout.write(`         ${use.desc}\n`);
  }
  stdout.write('\n');
}

function renderConfirm(tools, uses, stdout) {
  const TOOL_NAMES = {
    claude: 'Claude Code',
    codex: 'Codex',
    gemini: 'Gemini CLI',
    opencode: 'OpenCode'
  };
  const toolNames = tools.map(id => TOOL_NAMES[id] || id).join(', ');
  const modeLabel = uses.includes('squads') ? 'Development + Squads' : 'Development';

  stdout.write('\x1Bc');
  stdout.write('  Ready to install:\n\n');
  stdout.write(`    Tools  →  ${toolNames}\n`);
  stdout.write(`    Mode   →  ${modeLabel}\n\n`);
  stdout.write('  Press enter to install or q to cancel.\n\n');
}

function makeRawSession(io) {
  const stdin = io.stdin || process.stdin;
  const wasRaw = Boolean(stdin.isRaw);
  const wasPaused = typeof stdin.isPaused === 'function' ? stdin.isPaused() : true;

  readline.emitKeypressEvents(stdin);
  if (typeof stdin.setRawMode === 'function') stdin.setRawMode(true);
  if (typeof stdin.resume === 'function') stdin.resume();

  function restore() {
    if (typeof stdin.setRawMode === 'function') stdin.setRawMode(wasRaw);
    if (wasPaused && typeof stdin.pause === 'function') stdin.pause();
  }

  return { stdin, restore };
}

async function promptScreen1(io = {}) {
  const stdout = io.stdout || process.stdout;
  const { stdin, restore } = makeRawSession(io);

  let cursor = 0;
  const selected = new Set(['claude']);
  let warn = false;

  renderScreen1(cursor, selected, warn, stdout);

  return new Promise((resolve) => {
    let cleanedUp = false;

    function cleanup() {
      if (cleanedUp) return;
      cleanedUp = true;
      stdin.removeListener('keypress', onKeypress);
      restore();
    }

    function onKeypress(_str, key) {
      if (!key) return;

      if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        cleanup();
        resolve(null);
        return;
      }

      if (key.name === 'up') {
        cursor = cursor === 0 ? TOOLS.length - 1 : cursor - 1;
        renderScreen1(cursor, selected, warn, stdout);
        return;
      }

      if (key.name === 'down') {
        cursor = cursor === TOOLS.length - 1 ? 0 : cursor + 1;
        renderScreen1(cursor, selected, warn, stdout);
        return;
      }

      if (key.name === 'space') {
        const id = TOOLS[cursor].id;
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        warn = false;
        renderScreen1(cursor, selected, warn, stdout);
        return;
      }

      if (key.name === 'return') {
        if (selected.size === 0) {
          warn = true;
          renderScreen1(cursor, selected, warn, stdout);
          return;
        }
        cleanup();
        resolve([...selected]);
      }
    }

    stdin.on('keypress', onKeypress);
  });
}

async function promptScreen2(io = {}) {
  const stdout = io.stdout || process.stdout;
  const { stdin, restore } = makeRawSession(io);

  let cursor = 0;
  const selected = new Set(['development']);

  renderScreen2(cursor, selected, stdout);

  return new Promise((resolve) => {
    let cleanedUp = false;

    function cleanup() {
      if (cleanedUp) return;
      cleanedUp = true;
      stdin.removeListener('keypress', onKeypress);
      restore();
    }

    function onKeypress(_str, key) {
      if (!key) return;

      if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        cleanup();
        resolve(null);
        return;
      }

      if (key.name === 'up') {
        cursor = cursor === 0 ? USES.length - 1 : cursor - 1;
        renderScreen2(cursor, selected, stdout);
        return;
      }

      if (key.name === 'down') {
        cursor = cursor === USES.length - 1 ? 0 : cursor + 1;
        renderScreen2(cursor, selected, stdout);
        return;
      }

      if (key.name === 'space') {
        const use = USES[cursor];
        if (!use.locked) {
          if (selected.has(use.id)) selected.delete(use.id);
          else selected.add(use.id);
          renderScreen2(cursor, selected, stdout);
        }
        return;
      }

      if (key.name === 'return') {
        cleanup();
        resolve([...selected]);
      }
    }

    stdin.on('keypress', onKeypress);
  });
}

async function promptConfirm(tools, uses, io = {}) {
  const stdout = io.stdout || process.stdout;
  const { stdin, restore } = makeRawSession(io);

  renderConfirm(tools, uses, stdout);

  return new Promise((resolve) => {
    let cleanedUp = false;

    function cleanup() {
      if (cleanedUp) return;
      cleanedUp = true;
      stdin.removeListener('keypress', onKeypress);
      restore();
    }

    function onKeypress(_str, key) {
      if (!key) return;

      if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        cleanup();
        resolve(false);
        return;
      }

      if (key.name === 'return') {
        cleanup();
        resolve(true);
      }
    }

    stdin.on('keypress', onKeypress);
  });
}

/**
 * Runs the interactive install wizard.
 * Returns { tools: string[], uses: string[] } or null (cancelled / non-TTY / --no-interactive).
 */
async function runInstallWizard(options = {}, io = {}) {
  const stdin = io.stdin || process.stdin;
  const stdout = io.stdout || process.stdout;

  if (!stdin.isTTY || !stdout.isTTY) return null;
  if (options.noInteractive) return null;

  const tools = await promptScreen1(io);
  if (!tools) return null;

  const uses = await promptScreen2(io);
  if (!uses) return null;

  const confirmed = await promptConfirm(tools, uses, io);
  if (!confirmed) return null;

  stdout.write('\x1Bc');
  return { tools, uses };
}

module.exports = {
  runInstallWizard,
  __test__: {
    renderScreen1,
    renderScreen2,
    renderConfirm,
    getBanner,
    TOOLS,
    USES,
    promptScreen1,
    promptScreen2
  }
};
