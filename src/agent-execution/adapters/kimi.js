'use strict';

const { createAdapter } = require('./base');

// Official Kimi Code non-interactive contract:
// kimi [-m <model>] -p <prompt> --output-format text [--add-dir <dir> ...]
// sandbox_mode is translated by the registry (src/lib/tool-capabilities.js)
// through createAdapter: 'read-only' → plan; 'workspace-write' → the
// registry's unattended flag (a lane worker edits files and runs tests
// non-interactively).
module.exports = createAdapter('kimi', (input) => [
  ...(input.sandbox_args || []),
  ...(input.model === 'configured-default' ? [] : ['--model', input.model]),
  ...(input.writable_roots || []).flatMap((root) => ['--add-dir', root]),
  '--prompt',
  input.prompt_text,
  '--output-format',
  'text'
]);
