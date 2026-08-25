'use strict';

const { createAdapter } = require('./base');
const { TOOL_CAPS } = require('../../lib/tool-capabilities');

// Official Kimi Code non-interactive contract:
// kimi [-m <model>] -p <prompt> --output-format text [--add-dir <dir> ...]
// sandbox_mode: 'read-only' → plan; 'workspace-write' → the registry's
// unattended flag (a lane worker edits files and runs tests non-interactively).
module.exports = createAdapter('kimi', (input) => [
  ...(input.sandbox_mode === 'read-only' ? ['--plan'] : []),
  ...(input.sandbox_mode === 'workspace-write' ? TOOL_CAPS.kimi.yolo_args : []),
  ...(input.model === 'configured-default' ? [] : ['--model', input.model]),
  ...(input.writable_roots || []).flatMap((root) => ['--add-dir', root]),
  '--prompt',
  input.prompt_text,
  '--output-format',
  'text'
]);
