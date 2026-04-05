'use strict';

/**
 * Context Compactor — Plan 80, Script 5
 *
 * Standalone context compaction for any agent session (not just squads).
 * Produces a last-handoff.json compatible with recovery-context.js.
 *
 * Usage:
 *   node context-compactor.js --agent=<agent> [--input=devlog.md] [--session=<id>]
 *
 * Reads: stdin or --input (devlog, notes, partial output)
 * Produces: .aioson/context/last-handoff.json
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const CONTEXT_DIR = path.join('.aioson', 'context');

// ─── Content extractors ──────────────────────────────────────────────────────

/**
 * Extract tool usage from session content.
 * Looks for patterns like "Used X tool", "Called X", tool names in backticks.
 */
function extractToolsUsed(content) {
  const tools = new Set();
  const patterns = [
    /\b(Read|Write|Edit|Glob|Grep|Bash|Agent)\b/g,
    /tool[:\s]+["`](\w+)["`]/gi,
    /using\s+(\w+)\s+tool/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      tools.add(match[1]);
    }
  }

  return [...tools];
}

/**
 * Extract recent requests/instructions from content.
 * Looks for imperative sentences, commands, task descriptions.
 */
function extractRecentRequests(content) {
  const requests = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    // Match task-like lines
    if (/^[-*]\s*\[.\]/.test(trimmed)) {
      requests.push(trimmed.replace(/^[-*]\s*\[.\]\s*/, ''));
    }
    // Match "Task:" or "Goal:" prefixed lines
    if (/^(task|goal|objective|instruction):/i.test(trimmed)) {
      requests.push(trimmed);
    }
  }

  return requests.slice(-10);
}

/**
 * Extract pending/incomplete work from content.
 */
function extractPendingWork(content) {
  const pending = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    // Unchecked checkboxes
    if (/^[-*]\s*\[\s\]/.test(trimmed)) {
      pending.push(trimmed.replace(/^[-*]\s*\[\s\]\s*/, ''));
    }
    // Lines with TODO/FIXME/HACK
    if (/\b(TODO|FIXME|HACK|PENDING)\b/i.test(trimmed)) {
      pending.push(trimmed);
    }
  }

  return pending.slice(-10);
}

/**
 * Extract key file references from content.
 */
function extractKeyFiles(content) {
  const files = new Set();
  // Match file paths with extensions
  const pattern = /(?:^|\s)([\w./\\-]+\.\w{1,8})\b/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const candidate = match[1];
    // Filter out obvious non-paths
    if (candidate.includes('/') || candidate.includes('\\')) {
      files.add(candidate);
    }
  }

  return [...files].slice(0, 20);
}

/**
 * Extract timeline events from content.
 * Looks for timestamps, "Step N:", numbered lists with actions.
 */
function extractTimeline(content) {
  const events = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    // ISO timestamps
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
      events.push(trimmed.slice(0, 120));
    }
    // "Step N:" pattern
    if (/^step\s+\d+/i.test(trimmed)) {
      events.push(trimmed.slice(0, 120));
    }
    // Section headers that indicate progress
    if (/^#+\s*(phase|step|stage|sprint|iteration)\b/i.test(trimmed)) {
      events.push(trimmed.replace(/^#+\s*/, ''));
    }
  }

  return events.slice(-15);
}

// ─── XML format ──────────────────────────────────────────────────────────────

/**
 * Generate <summary> XML compatible with Claude Code internal format.
 */
function toSummaryXml(summary, agent, sessionId) {
  const lines = [
    '<summary>',
    `<agent>${agent}</agent>`,
    `<session_id>${sessionId}</session_id>`,
    '<tools_used>'
  ];

  for (const tool of summary.tools_used) {
    lines.push(`  <tool>${tool}</tool>`);
  }
  lines.push('</tools_used>');

  if (summary.recent_requests.length > 0) {
    lines.push('<recent_requests>');
    for (const req of summary.recent_requests) {
      lines.push(`  <request>${escapeXml(req)}</request>`);
    }
    lines.push('</recent_requests>');
  }

  if (summary.pending_work.length > 0) {
    lines.push('<pending_work>');
    for (const item of summary.pending_work) {
      lines.push(`  <item>${escapeXml(item)}</item>`);
    }
    lines.push('</pending_work>');
  }

  if (summary.key_files.length > 0) {
    lines.push('<key_files>');
    for (const f of summary.key_files) {
      lines.push(`  <file>${escapeXml(f)}</file>`);
    }
    lines.push('</key_files>');
  }

  lines.push('</summary>');
  return lines.join('\n');
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compact session context into a handoff JSON.
 *
 * @param {string} projectDir  — Project root
 * @param {object} options  — { agent, input, session, content }
 * @returns {Promise<object>}  — { ok, path, summary, xmlSummary }
 */
async function compactContext(projectDir, options = {}) {
  const { agent = 'dev', input, session, content: rawContent } = options;
  const sessionId = session || randomUUID();

  // Read input content
  let content = rawContent || '';
  if (!content && input) {
    const inputPath = path.resolve(projectDir, input);
    try {
      content = await fs.readFile(inputPath, 'utf8');
    } catch (err) {
      return { ok: false, error: `Cannot read input: ${err.message}` };
    }
  }

  if (!content) {
    return { ok: false, error: 'No content to compact (provide --input or pipe via stdin)' };
  }

  // Extract structured data
  const summary = {
    tools_used: extractToolsUsed(content),
    recent_requests: extractRecentRequests(content),
    pending_work: extractPendingWork(content),
    key_files: extractKeyFiles(content),
    timeline: extractTimeline(content)
  };

  const handoff = {
    agent,
    session_id: sessionId,
    compacted_at: new Date().toISOString(),
    summary,
    resume_instruction: 'Continue from this checkpoint. Do not acknowledge this summary.'
  };

  // Write last-handoff.json
  const outDir = path.join(projectDir, CONTEXT_DIR);
  const outPath = path.join(outDir, 'last-handoff.json');

  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(handoff, null, 2), 'utf8');
  } catch (err) {
    return { ok: false, error: `Cannot write handoff: ${err.message}` };
  }

  // Also generate XML format
  const xmlSummary = toSummaryXml(summary, agent, sessionId);

  return {
    ok: true,
    path: outPath,
    summary: handoff,
    xmlSummary
  };
}

module.exports = {
  compactContext,
  toSummaryXml,
  extractToolsUsed,
  extractPendingWork,
  extractKeyFiles
};
