'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { runInstallWizard, __test__ } = require('../src/install-wizard');

function createMockStdin() {
  const stdin = new PassThrough();
  stdin.isTTY = true;
  stdin.isRaw = false;
  stdin._paused = true;
  stdin.setRawModeCalls = [];
  stdin.resumeCalls = 0;
  stdin.pauseCalls = 0;
  stdin.setRawMode = (value) => {
    stdin.isRaw = value;
    stdin.setRawModeCalls.push(value);
  };
  stdin.resume = () => {
    stdin.resumeCalls += 1;
    stdin._paused = false;
    return stdin;
  };
  stdin.pause = () => {
    stdin.pauseCalls += 1;
    stdin._paused = true;
    return stdin;
  };
  stdin.isPaused = () => stdin._paused;
  return stdin;
}

function createMockStdout() {
  return {
    isTTY: true,
    columns: 120,
    output: '',
    write(chunk) {
      this.output += String(chunk);
      return true;
    }
  };
}

test('runInstallWizard returns null when stdin is not TTY', async () => {
  const stdin = createMockStdin();
  stdin.isTTY = false;
  const stdout = createMockStdout();

  const result = await runInstallWizard({}, { stdin, stdout });
  assert.equal(result, null);
});

test('runInstallWizard returns null when stdout is not TTY', async () => {
  const stdin = createMockStdin();
  const stdout = createMockStdout();
  stdout.isTTY = false;

  const result = await runInstallWizard({}, { stdin, stdout });
  assert.equal(result, null);
});

test('runInstallWizard returns null when noInteractive is true', async () => {
  const stdin = createMockStdin();
  const stdout = createMockStdout();

  const result = await runInstallWizard({ noInteractive: true }, { stdin, stdout });
  assert.equal(result, null);
});

test('q key during screen1 returns null (cancel)', async () => {
  const stdin = createMockStdin();
  const stdout = createMockStdout();

  const p = runInstallWizard({}, { stdin, stdout });

  // Wait a tick for the event listener to be set up
  await new Promise(resolve => setImmediate(resolve));

  // Emit q keypress
  stdin.emit('keypress', 'q', { name: 'q', ctrl: false });

  const result = await p;
  assert.equal(result, null);
});

test('ctrl+c during screen1 returns null', async () => {
  const stdin = createMockStdin();
  const stdout = createMockStdout();

  const p = runInstallWizard({}, { stdin, stdout });

  await new Promise(resolve => setImmediate(resolve));

  stdin.emit('keypress', null, { name: 'c', ctrl: true });

  const result = await p;
  assert.equal(result, null);
});

test('TOOLS list contains claude, codex, gemini, opencode', () => {
  const ids = __test__.TOOLS.map(t => t.id);
  assert.deepEqual(ids, ['claude', 'codex', 'gemini', 'opencode']);
});

test('USES list has development locked and squads unlocked', () => {
  const dev = __test__.USES.find(u => u.id === 'development');
  const squads = __test__.USES.find(u => u.id === 'squads');
  assert.equal(dev.locked, true);
  assert.equal(squads.locked, false);
});

test('getBanner returns simple text on narrow terminal', () => {
  const stdout = { isTTY: true, columns: 40 };
  const banner = __test__.getBanner('1.0.0', stdout);
  assert.ok(banner.includes('AIOSON v1.0.0'));
  assert.equal(banner.includes('╭'), false);
});

test('getBanner returns ASCII art on wide terminal', () => {
  const stdout = { isTTY: true, columns: 120 };
  const banner = __test__.getBanner('1.0.0', stdout);
  assert.ok(banner.includes('╭'));
  assert.ok(banner.includes('AI Operating Framework'));
});

test('renderScreen1 writes tool names to stdout', () => {
  const stdout = createMockStdout();
  const selected = new Set(['claude']);
  __test__.renderScreen1(0, selected, false, stdout);
  assert.ok(stdout.output.includes('Claude Code'));
  assert.ok(stdout.output.includes('Codex (OpenAI)'));
  assert.ok(stdout.output.includes('Gemini CLI'));
  assert.ok(stdout.output.includes('OpenCode'));
});

test('renderScreen1 shows warning when warn=true', () => {
  const stdout = createMockStdout();
  const selected = new Set();
  __test__.renderScreen1(0, selected, true, stdout);
  assert.ok(stdout.output.includes('Select at least one tool'));
});

test('renderScreen2 shows development as always on', () => {
  const stdout = createMockStdout();
  const selected = new Set(['development']);
  __test__.renderScreen2(0, selected, stdout);
  assert.ok(stdout.output.includes('always on'));
  assert.ok(stdout.output.includes('Squads'));
});

test('renderConfirm shows tool and mode summary', () => {
  const stdout = createMockStdout();
  __test__.renderConfirm(['claude', 'codex'], ['development', 'squads'], stdout);
  assert.ok(stdout.output.includes('Claude Code'));
  assert.ok(stdout.output.includes('Codex'));
  assert.ok(stdout.output.includes('Development + Squads'));
});

test('renderConfirm shows Development only mode without squads', () => {
  const stdout = createMockStdout();
  __test__.renderConfirm(['claude'], ['development'], stdout);
  assert.ok(stdout.output.includes('Development'));
  assert.equal(stdout.output.includes('Squads'), false);
});
