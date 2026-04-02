'use strict';

/**
 * aioson squad:bus — Intra-squad message bus CLI
 *
 * Subcommands:
 *   post    — Post a message to the bus
 *   read    — Read messages from the bus
 *   watch   — Watch for new messages in real time (polls)
 *   summary — Show bus activity summary for a session
 *   clear   — Delete the bus file for a session
 *   list    — List sessions with active bus files
 *
 * Usage:
 *   aioson squad:bus . --squad=content-team post --from=researcher --type=finding --content="..."
 *   aioson squad:bus . --squad=content-team read --session=SESSION_ID [--to=writer] [--type=finding]
 *   aioson squad:bus . --squad=content-team watch --session=SESSION_ID [--to=writer]
 *   aioson squad:bus . --squad=content-team summary --session=SESSION_ID
 *   aioson squad:bus . --squad=content-team clear --session=SESSION_ID
 *   aioson squad:bus . --squad=content-team list
 */

const path = require('node:path');
const bus = require('../squad/intra-bus');

function formatMessage(msg, { compact = false } = {}) {
  if (compact) {
    return `[${msg.ts.slice(0, 19)}] ${msg.from}→${msg.to} (${msg.type}): ${String(msg.content).slice(0, 120)}`;
  }
  return [
    `id:      ${msg.id}`,
    `from:    ${msg.from}`,
    `to:      ${msg.to}`,
    `type:    ${msg.type}`,
    `ts:      ${msg.ts}`,
    `content: ${msg.content}`,
    msg.metadata && Object.keys(msg.metadata).length > 0
      ? `meta:    ${JSON.stringify(msg.metadata)}`
      : null
  ].filter(Boolean).join('\n');
}

async function runSquadBus({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const sub = String(options.sub || args[1] || 'read').trim();
  const squadSlug = String(options.squad || options.s || '').trim();
  const sessionId = String(options.session || '').trim();

  if (!squadSlug) {
    logger.error('Error: --squad is required');
    return { ok: false, error: 'missing_squad' };
  }

  // ── POST ──────────────────────────────────────────────────────────────────
  if (sub === 'post') {
    const from = String(options.from || '').trim();
    const to = String(options.to || '*').trim();
    const type = String(options.type || 'finding').trim();
    const content = String(options.content || options.message || '').trim();
    const sid = sessionId || String(options.s || 'default').trim();

    if (!from) { logger.error('Error: --from is required for post'); return { ok: false }; }
    if (!content) { logger.error('Error: --content is required for post'); return { ok: false }; }

    let metadata = {};
    if (options.meta) {
      try { metadata = JSON.parse(options.meta); } catch { /* ignore */ }
    }

    const msg = await bus.post(targetDir, squadSlug, sid, { from, to, type, content, metadata });

    if (options.json) return { ok: true, message: msg };

    logger.log(`✓ Posted to bus [${sid}]`);
    logger.log(formatMessage(msg));
    return { ok: true, message: msg };
  }

  // ── READ ──────────────────────────────────────────────────────────────────
  if (sub === 'read') {
    if (!sessionId) { logger.error('Error: --session is required for read'); return { ok: false }; }

    const filters = {
      from: options.from || undefined,
      to: options.to || undefined,
      type: options.type || undefined,
      since: options.since || undefined,
      last: options.last ? Number(options.last) : undefined
    };

    const messages = await bus.read(targetDir, squadSlug, sessionId, filters);

    if (options.json) return { ok: true, messages };

    if (messages.length === 0) {
      logger.log('No messages found.');
      return { ok: true, messages: [] };
    }

    logger.log(`Bus [${sessionId}] — ${messages.length} message(s):`);
    logger.log('─'.repeat(60));
    for (const msg of messages) {
      logger.log(formatMessage(msg, { compact: !!options.compact }));
      logger.log('─'.repeat(60));
    }
    return { ok: true, messages };
  }

  // ── WATCH ─────────────────────────────────────────────────────────────────
  if (sub === 'watch') {
    if (!sessionId) { logger.error('Error: --session is required for watch'); return { ok: false }; }

    const pollMs = options.poll ? Number(options.poll) : 1500;
    const timeoutMs = options.timeout ? Number(options.timeout) * 1000 : 10 * 60 * 1000; // 10m default

    logger.log(`Watching bus [${sessionId}] (Ctrl+C to stop, timeout ${Math.round(timeoutMs / 60000)}m)...`);

    const filters = {
      to: options.to || undefined,
      type: options.type || undefined
    };

    let count = 0;
    const stop = bus.watch(targetDir, squadSlug, sessionId, (msg) => {
      count++;
      logger.log(formatMessage(msg, { compact: false }));
      logger.log('─'.repeat(60));
    }, { pollMs, timeoutMs, ...filters });

    await new Promise((resolve) => {
      process.on('SIGINT', resolve);
      process.on('SIGTERM', resolve);
      setTimeout(resolve, timeoutMs);
    });

    stop();
    logger.log(`Watch ended. ${count} message(s) received.`);
    return { ok: true, count };
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  if (sub === 'summary') {
    if (!sessionId) { logger.error('Error: --session is required for summary'); return { ok: false }; }

    const s = await bus.summary(targetDir, squadSlug, sessionId);

    if (options.json) return { ok: true, summary: s };

    logger.log(`Bus summary [${sessionId}]`);
    logger.log('─'.repeat(50));
    logger.log(`Total messages : ${s.total}`);
    if (s.total === 0) {
      logger.log('No messages yet.');
      return { ok: true, summary: s };
    }
    logger.log(`First message  : ${s.first_ts}`);
    logger.log(`Last message   : ${s.last_ts}`);
    logger.log('');
    logger.log('By type:');
    for (const [type, count] of Object.entries(s.by_type)) {
      logger.log(`  ${type.padEnd(12)} ${count}`);
    }
    logger.log('');
    logger.log('By executor:');
    for (const [exec, count] of Object.entries(s.by_executor)) {
      logger.log(`  ${exec.padEnd(20)} ${count}`);
    }
    if (s.blocks.length > 0) {
      logger.log('');
      logger.log(`⚠ Blocks (${s.blocks.length}):`);
      for (const b of s.blocks) {
        logger.log(`  [${b.ts.slice(0, 19)}] ${b.from}: ${b.content}`);
      }
    }
    return { ok: true, summary: s };
  }

  // ── CLEAR ─────────────────────────────────────────────────────────────────
  if (sub === 'clear') {
    if (!sessionId) { logger.error('Error: --session is required for clear'); return { ok: false }; }

    const result = await bus.clear(targetDir, squadSlug, sessionId);

    if (options.json) return result;

    if (result.ok) {
      logger.log(`✓ Bus cleared for session [${sessionId}]`);
    } else {
      logger.log(`No bus file found for session [${sessionId}]`);
    }
    return result;
  }

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (sub === 'list') {
    const sessions = await bus.listSessions(targetDir, squadSlug);

    if (options.json) return { ok: true, sessions };

    if (sessions.length === 0) {
      logger.log('No bus sessions found.');
      return { ok: true, sessions: [] };
    }

    logger.log(`Bus sessions for squad "${squadSlug}" (${sessions.length}):`);
    logger.log('─'.repeat(60));
    for (const s of sessions) {
      logger.log(`  ${s.session_id.padEnd(36)}  ${(s.size_bytes / 1024).toFixed(1)}KB  ${s.modified_at.slice(0, 19)}`);
    }
    return { ok: true, sessions };
  }

  logger.error(`Unknown subcommand: ${sub}. Valid: post, read, watch, summary, clear, list`);
  return { ok: false, error: 'unknown_subcommand' };
}

module.exports = { runSquadBus };
