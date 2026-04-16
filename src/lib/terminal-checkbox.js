'use strict';

/**
 * Lightweight terminal checkbox UI using raw mode and keypress events.
 * No external dependencies.
 */

const readline = require('node:readline');

function clearLines(count) {
  for (let i = 0; i < count; i += 1) {
    process.stdout.write('\x1B[1A\x1B[2K');
  }
}

function render(items, selectedIndex, hint) {
  const lines = items.map((item, index) => {
    const marker = item.checked ? '[x]' : '[ ]';
    const prefix = index === selectedIndex ? '> ' : '  ';
    return `${prefix}${marker} ${item.label}`;
  });
  lines.push('');
  lines.push(hint);
  return lines.join('\n');
}

function promptCheckbox(items, hint = '↑/↓ navegar | Espaço selecionar | Enter confirmar | a=todos | n=limpar') {
  return new Promise((resolve) => {
    const state = items.map((label) => ({ label, checked: true }));
    let selectedIndex = 0;
    let renderedLines = 0;

    const stdin = process.stdin;
    const stdout = process.stdout;

    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    readline.emitKeypressEvents(stdin);

    function draw() {
      if (renderedLines > 0) {
        clearLines(renderedLines);
      }
      const output = render(state, selectedIndex, hint);
      renderedLines = output.split('\n').length;
      stdout.write(output + '\n');
    }

    function finish() {
      if (stdin.setRawMode) {
        stdin.setRawMode(wasRaw);
      }
      stdin.pause();
      stdin.removeListener('keypress', onKeypress);
      if (renderedLines > 0) {
        clearLines(renderedLines);
      }
      const result = state.filter((s) => s.checked).map((s) => s.label);
      resolve(result);
    }

    function onKeypress(str, key) {
      if (!key) return;

      if (key.name === 'c' && key.ctrl) {
        finish();
        return;
      }

      if (key.name === 'return' || key.name === 'enter') {
        finish();
        return;
      }

      if (key.name === 'up') {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : state.length - 1;
        draw();
        return;
      }

      if (key.name === 'down') {
        selectedIndex = selectedIndex < state.length - 1 ? selectedIndex + 1 : 0;
        draw();
        return;
      }

      if (key.name === 'space') {
        state[selectedIndex].checked = !state[selectedIndex].checked;
        draw();
        return;
      }

      if (str === 'a' || str === 'A') {
        state.forEach((s) => { s.checked = true; });
        draw();
        return;
      }

      if (str === 'n' || str === 'N') {
        state.forEach((s) => { s.checked = false; });
        draw();
        return;
      }
    }

    stdin.on('keypress', onKeypress);
    draw();
  });
}

module.exports = { promptCheckbox };
