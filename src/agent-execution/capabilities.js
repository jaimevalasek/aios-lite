'use strict';

const { TOOL_CAPS } = require('../lib/tool-capabilities');

// Per-host execution capability matrix, derived from the single host registry
// (src/lib/tool-capabilities.js `execution` block) so there is no second list
// to keep in sync. Native subagents and fresh sessions stay unsupported on
// every host: the only executable mode is an external non-interactive process
// (see ./adapters). A registry entry without an `execution` block (interactive
// only) is absent here and therefore fails closed as an unsupported host.
function buildMatrix(registry) {
  const matrix = {};
  for (const [host, entry] of Object.entries(registry)) {
    if (!entry || !entry.execution) continue;
    matrix[host] = {
      native_subagent: false,
      fresh_session: false,
      external_process: true,
      additional_workspaces: entry.execution.additional_workspaces === true,
      model_catalog: entry.execution.model_catalog === true,
      reasoning_effort: entry.execution.reasoning_effort === true,
      executable: entry.binary
    };
  }
  return matrix;
}

const MATRIX = buildMatrix(TOOL_CAPS);

function capabilities(host) { return { ...(MATRIX[host] || {}), source: 'registered_adapter' }; }
function requiredCapability(mode) { return mode === 'subagent' ? 'native_subagent' : mode === 'fresh-session' ? 'fresh_session' : mode === 'external' ? 'external_process' : null; }
module.exports = { MATRIX, buildMatrix, capabilities, requiredCapability };
