'use strict';

const { createAdapter } = require('./base');
const { TOOL_CAPS } = require('../../lib/tool-capabilities');

// Qwen Code non-interactive contract. CLI-level approval mode still applies
// in safe mode, so plan is the read-only boundary; sandbox and safe mode also
// isolate execution from project customizations. 'workspace-write' uses the
// registry's unattended flag (a lane worker edits files and runs tests).
module.exports = createAdapter('qwen', input => [
  ...(input.model === 'configured-default' ? [] : ['--model', input.model]),
  ...(input.sandbox_mode === 'read-only' ? ['--approval-mode', 'plan', '--sandbox', '--safe-mode'] : []),
  ...(input.sandbox_mode === 'workspace-write' ? TOOL_CAPS.qwen.yolo_args : []),
  '--prompt',
  input.prompt_text,
  '--output-format',
  'text'
]);
