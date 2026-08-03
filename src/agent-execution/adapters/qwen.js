'use strict';

const { createAdapter } = require('./base');

// Qwen Code non-interactive contract. CLI-level approval mode still applies
// in safe mode, so plan is the read-only boundary; sandbox and safe mode also
// isolate execution from project customizations.
module.exports = createAdapter('qwen', input => [
  ...(input.model === 'configured-default' ? [] : ['--model', input.model]),
  ...(input.sandbox_mode === 'read-only' ? ['--approval-mode', 'plan', '--sandbox', '--safe-mode'] : []),
  '--prompt',
  input.prompt_text,
  '--output-format',
  'text'
]);
