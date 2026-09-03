'use strict';

const { createAdapter } = require('./base');

// Grok CLI headless contract (from the installed build's own help):
//   grok -p/--single <prompt> [-m <model>] [--reasoning-effort <level>]
//        --output-format plain [--always-approve | --permission-mode plan]
// (`--output-format` accepts plain|json|streaming-json|streaming-messages-json;
// proven against grok 1.0.3 by a real signature probe.)
// sandbox_mode is translated by the registry (src/lib/tool-capabilities.js)
// through createAdapter: 'read-only' → `--permission-mode plan`;
// 'workspace-write' → `--always-approve` (auto-approve all tool executions).
// The prompt is one argv value: shell:false, never interpolated.
module.exports = createAdapter('grok', (input) => [
  ...(input.sandbox_args || []),
  ...(input.model === 'configured-default' ? [] : ['--model', input.model]),
  ...(input.reasoning_effort ? ['--reasoning-effort', input.reasoning_effort] : []),
  '--output-format',
  'plain',
  '--single',
  input.prompt_text
]);
