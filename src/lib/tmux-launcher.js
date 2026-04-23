'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

async function isTmuxAvailable() {
  return new Promise((resolve) => {
    const child = spawn('which', ['tmux'], { stdio: 'pipe' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

function buildSessionName(targetDir, agentName) {
  const base = targetDir.split(/[\\/]/).pop() || 'aioson';
  const agent = String(agentName || '').replace(/^@/, '');
  const sanitized = `${base}-${agent}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50);
  return sanitized;
}

function resolveAiosonBinary() {
  if (process.argv[1]) {
    return path.resolve(process.argv[1]);
  }
  return 'aioson';
}

async function hasSession(sessionName) {
  return new Promise((resolve) => {
    const child = spawn('tmux', ['has-session', '-t', sessionName], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function killSession(sessionName) {
  return new Promise((resolve) => {
    const kill = spawn('tmux', ['kill-session', '-t', sessionName], { stdio: 'ignore' });
    kill.on('close', () => resolve());
    kill.on('error', () => resolve());
  });
}

async function createTmuxSession(sessionName, targetDir, binaryPath, toolArgs) {
  const args = [
    'new-session',
    '-d',
    '-s', sessionName,
    '-c', targetDir,
    binaryPath,
    ...toolArgs
  ];

  return new Promise((resolve, reject) => {
    const child = spawn('tmux', args, { stdio: 'ignore' });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`tmux new-session exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function configureTmuxSession(sessionName) {
  const commands = [
    // Mouse on so scroll works in the main pane; the bottom pane is 1 line
    // and non-interactive, so accidental focus is harmless
    ['set-option', '-t', sessionName, 'mouse', 'on'],
    // Hide tmux status line (we use our own pane)
    ['set-option', '-t', sessionName, 'status', 'off'],
    // Hide pane borders for a clean look
    ['set-option', '-t', sessionName, 'pane-border-status', 'off'],
    // Prevent focus events from shifting to the bottom pane
    ['set-option', '-t', sessionName, 'focus-events', 'off']
  ];

  for (const cmd of commands) {
    await new Promise((resolve, reject) => {
      const child = spawn('tmux', cmd, { stdio: 'ignore' });
      child.on('error', (err) => reject(err));
      child.on('close', () => resolve());
    });
  }
}

async function createStatusPane(sessionName, targetDir) {
  const aiosonBin = resolveAiosonBinary();
  const safeDir = String(targetDir || '.').replace(/"/g, '\\"');
  const safeBin = String(aiosonBin).replace(/"/g, '\\"');

  // Command runs directly in the pane (no interactive bash)
  // printTmuxBar writes WITHOUT newline; we clear the line before each refresh
  const cmd = `while true; do printf '\\033[2K\\r'; AIOSON_TMUX_BAR=1 "${safeBin}" live:status "${safeDir}" --format=tmux-bar; sleep 2; done`;

  return new Promise((resolve, reject) => {
    const split = spawn('tmux', [
      'split-window',
      '-v',
      '-t', `${sessionName}:0.0`,
      '-c', targetDir,
      '-l', '1',
      cmd
    ], { stdio: 'ignore' });
    split.on('error', (err) => reject(err));
    split.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`tmux split-window exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function focusTopPane(sessionName) {
  return new Promise((resolve, reject) => {
    const focus = spawn('tmux', [
      'select-pane',
      '-t', `${sessionName}:0.0`
    ], { stdio: 'ignore' });
    focus.on('error', (err) => reject(err));
    focus.on('close', () => resolve());
  });
}

async function attachSession(sessionName) {
  return new Promise((resolve, reject) => {
    const attach = spawn('tmux', ['attach', '-t', sessionName], { stdio: 'inherit' });
    attach.on('error', (err) => reject(err));
    attach.on('close', () => resolve());
  });
}

async function launchTmuxSession(options) {
  const { targetDir, agentName, tool, binaryPath, toolArgs = [] } = options;
  const sessionName = buildSessionName(targetDir, agentName);

  await killSession(sessionName);
  await createTmuxSession(sessionName, targetDir, binaryPath, toolArgs);
  await configureTmuxSession(sessionName);
  await createStatusPane(sessionName, targetDir);
  await focusTopPane(sessionName);

  try {
    await attachSession(sessionName);
  } finally {
    await killSession(sessionName);
  }

  return { ok: true, sessionName };
}

module.exports = {
  isTmuxAvailable,
  launchTmuxSession,
  buildSessionName,
  hasSession,
  attachSession,
  resolveAiosonBinary
};
