'use strict';

// Every harness the registry knows is a live/prompt tool — the registry
// (src/lib/tool-capabilities.js) is the single host list, and each entry
// carries the unattended flag the launch surfaces default to.
const { listSupportedTools } = require('./lib/tool-capabilities');
const SUPPORTED_PROMPT_TOOLS = new Set(listSupportedTools());

function resolvePromptTool(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (SUPPORTED_PROMPT_TOOLS.has(normalized)) {
    return normalized;
  }

  return 'codex';
}

module.exports = {
  SUPPORTED_PROMPT_TOOLS,
  resolvePromptTool
};
