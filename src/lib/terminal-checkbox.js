'use strict';

/**
 * Lightweight terminal checkbox UI using raw mode and keypress events.
 * No external dependencies.
 */

const readline = require('node:readline');

function countVisualLines(text, cols) {
  return text.split('\n').reduce((acc, line) => {
    return acc + Math.max(1, Math.ceil((line.length || 1) / cols));
  }, 0);
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

function promptCheckbox(items, hint = '↑/↓ navegar | Espaço selecionar | Enter confirmar | Esc cancelar | a=todos | n=limpar') {
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
      const cols = stdout.columns || 80;
      if (renderedLines > 0) {
        stdout.write(`\x1B[${renderedLines}A\x1B[J`);
      }
      const output = render(state, selectedIndex, hint);
      renderedLines = countVisualLines(output, cols);
      stdout.write(output + '\n');
    }

    function cleanup() {
      if (stdin.setRawMode) {
        stdin.setRawMode(wasRaw);
      }
      stdin.pause();
      stdin.removeListener('keypress', onKeypress);
      const cols = stdout.columns || 80;
      if (renderedLines > 0) {
        stdout.write(`\x1B[${renderedLines}A\x1B[J`);
      }
      renderedLines = 0;
    }

    function confirm() {
      cleanup();
      resolve(state.filter((s) => s.checked).map((s) => s.label));
    }

    function cancel() {
      cleanup();
      resolve(null);
    }

    function onKeypress(str, key) {
      if (!key) return;

      if (key.name === 'c' && key.ctrl) {
        cancel();
        return;
      }

      if (key.name === 'escape') {
        cancel();
        return;
      }

      if (key.name === 'return' || key.name === 'enter') {
        confirm();
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
