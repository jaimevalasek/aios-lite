'use strict';

/**
 * aioson workflow:mode — the Autopilot resolution, exposed as a command.
 *
 * resolveAutopilotSignal is the single source of truth for "is autopilot on?"
 * (activation flags → per-feature scheme disarm → v2 execution manifest →
 * project frontmatter → seeded scheme), but until now only engine code could
 * ask it — every kernel prompt re-derived the precedence chain by reading three
 * files. One call returns { enabled, source }; the precedence order lives in
 * src/ and its tests, not in prose across five prompts.
 */

const path = require('node:path');
const { resolveAutopilotSignal } = require('../autopilot-signal');

async function runWorkflowMode({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = options.feature ? String(options.feature).trim() : null;
  const signal = await resolveAutopilotSignal(targetDir, {
    slug,
    auto: Boolean(options.auto),
    step: Boolean(options.step)
  });
  const result = { ok: true, feature: slug, enabled: signal.enabled, source: signal.source };
  if (options.json) return result;
  logger.log(`workflow:mode — autopilot ${signal.enabled ? 'ON' : 'OFF'} (source: ${signal.source || 'none'})${slug ? ` for ${slug}` : ''}`);
  return result;
}

module.exports = { runWorkflowMode };
