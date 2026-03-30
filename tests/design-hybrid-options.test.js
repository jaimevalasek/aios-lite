'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { __test__ } = require('../src/commands/design-hybrid-options');

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
    output: '',
    write(chunk) {
      this.output += String(chunk);
      return true;
    }
  };
}

test('design-hybrid prompt restores stdin state and clears readline listeners across groups', async () => {
  const stdin = createMockStdin();
  const stdout = createMockStdout();
  const ui = __test__.getUiText('en');
  const group = {
    title: 'Style modes',
    guidance: 'Choose 1-3 overall visual attitudes.',
    options: [
      {
        id: 'classic-editorial',
        label: 'Classic editorial',
        description: 'Measured hierarchy, serif authority, quieter luxury.'
      }
    ]
  };

  const firstPrompt = __test__.promptMultiSelectGroup(group, ui, { stdin, stdout });
  process.nextTick(() => {
    stdin.emit('data', Buffer.from('\r'));
  });
  const firstSelected = await firstPrompt;

  const secondPrompt = __test__.promptMultiSelectGroup(group, ui, { stdin, stdout });
  process.nextTick(() => {
    stdin.emit('data', Buffer.from('\r'));
  });
  const secondSelected = await secondPrompt;

  assert.deepEqual(firstSelected, []);
  assert.deepEqual(secondSelected, []);
  assert.deepEqual(stdin.setRawModeCalls, [true, false, true, false]);
  assert.equal(stdin.resumeCalls >= 2, true);
  assert.equal(stdin.pauseCalls >= 2, true);
  assert.equal(stdin.isPaused(), true);
  assert.equal(stdin.listenerCount('data'), 0);
  assert.equal(stdin.listenerCount('keypress'), 0);
  assert.match(stdout.output, /AIOSON — Design Hybrid Options/);
});
