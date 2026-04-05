'use strict';

/**
 * Bus Bridge — Plan 81, Phase 1.3
 *
 * Bidirectional bridge between Agent Teams mailbox and intra-bus JSONL.
 * Ensures that when squads use Agent Teams engine, all communication
 * is still persisted in the intra-bus for:
 *   - Historical analysis by learning-extractor
 *   - Cross-session context via recovery-context.js
 *   - Pattern detection by pattern-detector.js
 *
 * Directions:
 *   mailbox → bus: intercepts SendMessage via PostToolUse hook
 *   bus → mailbox: coordinator reads bus and relays to team-lead
 */

const bus = require('./intra-bus');

// ─── Mailbox → Bus ──────────────────────────────────────────────────────────

/**
 * Bridge a SendMessage tool call from Agent Teams mailbox to intra-bus.
 * Called via PostToolUse hook when matcher='SendMessage'.
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {string} sessionId
 * @param {string} toolInput  — JSON string from TOOL_INPUT env var
 */
async function bridgeMailboxToBus(projectDir, squadSlug, sessionId, toolInput) {
  let parsed;
  try {
    parsed = typeof toolInput === 'string' ? JSON.parse(toolInput) : toolInput;
  } catch {
    return { ok: false, error: 'invalid_tool_input' };
  }

  const { to, message, from } = parsed;
  if (!message) return { ok: false, error: 'no_message' };

  // Map mailbox message to bus message type
  const type = inferMessageType(message);

  const posted = await bus.post(projectDir, squadSlug, sessionId, {
    from: from || 'agent-teams',
    to: to || '*',
    type,
    content: message,
    metadata: {
      source: 'mailbox-bridge',
      original_to: to
    }
  });

  return { ok: true, busMessageId: posted.id };
}

/**
 * Infer a bus message type from mailbox message content.
 */
function inferMessageType(message) {
  const lower = (message || '').toLowerCase();

  if (/\b(block|stuck|cannot|unable|help)\b/i.test(lower)) return 'block';
  if (/\b(done|completed|finished|result)\b/i.test(lower)) return 'result';
  if (/\b(found|discovered|noticed)\b/i.test(lower)) return 'finding';
  if (/\b(question|how|what|why|should)\b/i.test(lower)) return 'question';
  if (/\b(review|feedback|suggest)\b/i.test(lower)) return 'feedback';

  return 'status';
}

// ─── Bus → Mailbox ──────────────────────────────────────────────────────────

/**
 * Read recent bus messages and format them for Agent Teams team-lead consumption.
 * Used by coordinator to relay bus intelligence to the team.
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {string} sessionId
 * @param {object} [filters]  — { since, types }
 * @returns {Promise<object[]>}  — formatted messages for mailbox relay
 */
async function readBusForMailbox(projectDir, squadSlug, sessionId, filters = {}) {
  const { since, types } = filters;
  const messages = await bus.read(projectDir, squadSlug, sessionId, {
    since,
    type: types
  });

  // Filter out messages already from mailbox bridge (prevent loops)
  const filtered = messages.filter(
    (m) => !m.metadata || m.metadata.source !== 'mailbox-bridge'
  );

  return filtered.map((m) => ({
    from: m.from,
    to: m.to,
    type: m.type,
    content: m.content,
    ts: m.ts,
    mailboxFormat: `[${m.type}] ${m.from}: ${m.content}`
  }));
}

/**
 * Get a summary of bus state for team-lead injection.
 * Returns a concise text block suitable for Agent Teams context.
 */
async function busSummaryForTeam(projectDir, squadSlug, sessionId) {
  const busSummary = await bus.summary(projectDir, squadSlug, sessionId);

  if (!busSummary || busSummary.total === 0) {
    return 'Bus: empty (no inter-executor messages yet)';
  }

  const lines = [
    `Bus: ${busSummary.total} messages`,
    `  Types: ${Object.entries(busSummary.by_type).map(([t, c]) => `${t}(${c})`).join(', ')}`,
    `  Executors: ${Object.entries(busSummary.by_executor).map(([e, c]) => `${e}(${c})`).join(', ')}`
  ];

  if (busSummary.blocks.length > 0) {
    lines.push(`  ⚠ Unresolved blocks: ${busSummary.blocks.length}`);
    for (const b of busSummary.blocks.slice(0, 3)) {
      lines.push(`    - ${b.from}: ${b.content.slice(0, 80)}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  bridgeMailboxToBus,
  readBusForMailbox,
  busSummaryForTeam,
  inferMessageType
};
