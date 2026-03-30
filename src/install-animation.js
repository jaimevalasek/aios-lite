'use strict';

const AIOSON_LETTERS = [
  // A
  ['  █████╗ ', ' ██╔══██╗', ' ███████║', ' ██╔══██║', ' ██║  ██║', ' ╚═╝  ╚═╝'],
  // I
  ['██╗', '██║', '██║', '██║', '██║', '╚═╝'],
  // O
  [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  // S
  ['███████╗', '██╔════╝', '███████╗', '╚════██║', '███████║', '╚══════╝'],
  // O
  [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  // N
  ['███╗   ██╗', '████╗  ██║', '██╔██╗ ██║', '██║╚██╗██║', '██║ ╚████║', '╚═╝  ╚═══╝']
];

const LETTER_DELAY_MS = 130;
const TAGLINE_CHAR_DELAY_MS = 25;
const PULSE_DELAY_MS = 150;
const HEIGHT = 6;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function renderProgress({ copied, total, file }, stdout = process.stdout) {
  if (!stdout.isTTY) return;
  const pct = Math.round((copied / total) * 20);
  const bar = '█'.repeat(pct) + '░'.repeat(20 - pct);
  const shortFile = file.length > 35 ? '...' + file.slice(-32) : file;
  const line = `  \x1b[36m●\x1b[0m  Installing  \x1b[90m[${bar}]\x1b[0m  ${copied}/${total}  \x1b[90m${shortFile}\x1b[0m`;
  stdout.write(`\r\x1b[K${line}`);
}

async function renderRevealAnimation(version, stdout = process.stdout) {
  if (!stdout.isTTY) return;

  const noColor = process.env.NO_COLOR !== undefined;
  const dumb = process.env.TERM === 'dumb';
  const cols = stdout.columns || 80;

  if (dumb || cols < 50) return;

  const cyan = noColor ? '' : '\x1b[1;36m';
  const dim = noColor ? '' : '\x1b[90m';
  const reset = noColor ? '' : '\x1b[0m';
  const bold = noColor ? '' : '\x1b[1m';

  // Clear progress line
  stdout.write('\r\x1b[K\n');

  // Phase 1: Reveal letter by letter
  for (let letterIdx = 0; letterIdx <= AIOSON_LETTERS.length; letterIdx++) {
    if (letterIdx > 0) stdout.write(`\x1b[${HEIGHT}A`);

    for (let row = 0; row < HEIGHT; row++) {
      stdout.write('\x1b[K    ');
      for (let l = 0; l < letterIdx; l++) {
        stdout.write(`${cyan}${AIOSON_LETTERS[l][row]}${reset} `);
      }
      stdout.write('\n');
    }

    if (letterIdx < AIOSON_LETTERS.length) {
      await sleep(LETTER_DELAY_MS);
    }
  }

  // Phase 2: Tagline slide-in
  const tagline = `AI Operating Framework  v${version}`;
  stdout.write('\n    ');
  for (const ch of tagline) {
    stdout.write(`${dim}${ch}${reset}`);
    await sleep(TAGLINE_CHAR_DELAY_MS);
  }
  stdout.write('\n');

  // Phase 3: Breathing pulse (1 cycle)
  await sleep(PULSE_DELAY_MS);
  stdout.write(`\x1b[${HEIGHT + 2}A`);
  for (let row = 0; row < HEIGHT; row++) {
    stdout.write('\x1b[K    ');
    for (const letter of AIOSON_LETTERS) {
      stdout.write(`${bold}${cyan}${letter[row]}${reset} `);
    }
    stdout.write('\n');
  }
  stdout.write('\n'); // skip tagline line
  stdout.write('\n'); // space before summary

  await sleep(PULSE_DELAY_MS);
}

function renderInstallSummary({ result, installProfile, stdout = process.stdout }) {
  const isTTY = Boolean(stdout.isTTY);
  const noColor = process.env.NO_COLOR !== undefined;

  const green = (isTTY && !noColor) ? '\x1b[32m' : '';
  const dim = (isTTY && !noColor) ? '\x1b[90m' : '';
  const cyan = (isTTY && !noColor) ? '\x1b[36m' : '';
  const yellow = (isTTY && !noColor) ? '\x1b[33m' : '';
  const reset = (isTTY && !noColor) ? '\x1b[0m' : '';

  const TOOL_NAMES = {
    claude: 'Claude Code',
    codex: 'Codex',
    gemini: 'Gemini CLI',
    opencode: 'OpenCode'
  };

  const DESIGN_NAMES = {
    'none':                      'None',
    'clean-saas-ui':             'Clean SaaS UI',
    'aurora-command-ui':         'Aurora Command UI',
    'cognitive-core-ui':         'Cognitive Core UI',
    'bold-editorial-ui':         'Bold Editorial UI',
    'warm-craft-ui':             'Warm Craft UI',
    'glassmorphism-ui':          'Glassmorphism UI',
    'neo-brutalist-ui':          'Neo-Brutalist UI',
    'premium-command-center-ui': 'Premium Command Center UI',
    'interface-design':          'Interface Design'
  };

  const LOCALE_NAMES = {
    'en':    'English',
    'pt-BR': 'Português (Brasil)',
    'es':    'Español',
    'fr':    'Français'
  };

  const toolNames = installProfile
    ? installProfile.tools.map(t => TOOL_NAMES[t] || t).join(', ')
    : 'All';

  const modeLabel = !installProfile
    ? 'All'
    : installProfile.uses.includes('squads')
      ? 'Development + Squads'
      : 'Development';

  const designLabel = installProfile
    ? (DESIGN_NAMES[installProfile.design || 'none'] || installProfile.design || 'None')
    : null;

  const localeLabel = installProfile
    ? (LOCALE_NAMES[installProfile.locale || 'en'] || installProfile.locale || 'English')
    : null;

  const copiedCount = result.copied.length;
  const profileSkipped = result.skipped.filter(s => s.reason === 'not-in-profile').length;
  const existingSkipped = result.skipped.filter(s => s.reason === 'already-exists').length;
  const otherSkipped = result.skipped.length - profileSkipped - existingSkipped;

  if (!isTTY) {
    stdout.write(`aioson: installed ${copiedCount} files`);
    if (existingSkipped) stdout.write(`, ${existingSkipped} already exist`);
    if (profileSkipped) stdout.write(`, ${profileSkipped} not in profile`);
    stdout.write('\n');
    const toolsStr   = installProfile ? installProfile.tools.join(',') : 'all';
    const modeStr    = installProfile ? installProfile.uses.join(',') : 'all';
    const designStr  = installProfile ? (installProfile.design || 'none') : 'all';
    const localeStr  = installProfile ? (installProfile.locale || 'en') : 'all';
    stdout.write(`aioson: tools=${toolsStr} mode=${modeStr} design=${designStr} locale=${localeStr}\n`);
    stdout.write('aioson: run /setup to continue\n');
    return;
  }

  // Strip ANSI codes to measure visible length
  function visLen(s) {
    return s.replace(/\x1b\[[0-9;]*m/g, '').length;
  }

  // Internal width (between │ borders), including 1 space padding each side
  const W = 41;

  function row(content) {
    const padding = ' '.repeat(Math.max(0, W - visLen(content)));
    return `  │ ${content}${padding} │`;
  }

  // Build skip detail lines
  const skipLines = [];
  if (existingSkipped > 0) {
    skipLines.push(row(`${dim}─  ${existingSkipped} files already up to date${reset}`));
  }
  if (profileSkipped > 0) {
    skipLines.push(row(`${dim}─  ${profileSkipped} files skipped (not in profile)${reset}`));
  }
  if (otherSkipped > 0) {
    skipLines.push(row(`${dim}─  ${otherSkipped} files skipped (protected)${reset}`));
  }

  const profileLines = [
    row(`${cyan}Tools${reset}   →  ${cyan}${toolNames}${reset}`),
    row(`${cyan}Mode${reset}    →  ${cyan}${modeLabel}${reset}`)
  ];
  if (designLabel) profileLines.push(row(`${cyan}Design${reset}  →  ${cyan}${designLabel}${reset}`));
  if (localeLabel) profileLines.push(row(`${cyan}Locale${reset}  →  ${cyan}${localeLabel}${reset}`));

  const lines = [
    `  ╭${'─'.repeat(W + 2)}╮`,
    `  │${' '.repeat(W + 2)}│`,
    row(`${green}✓${reset}  ${copiedCount} files installed`),
    ...skipLines,
    `  │${' '.repeat(W + 2)}│`,
    ...profileLines,
    `  │${' '.repeat(W + 2)}│`,
    row(`${yellow}Next: run /setup in your AI tool${reset}`),
    `  │${' '.repeat(W + 2)}│`,
    `  ╰${'─'.repeat(W + 2)}╯`,
  ];

  stdout.write(lines.join('\n') + '\n');
}

module.exports = {
  renderProgress,
  renderRevealAnimation,
  renderInstallSummary,
  __test__: {
    AIOSON_LETTERS,
    sleep
  }
};
