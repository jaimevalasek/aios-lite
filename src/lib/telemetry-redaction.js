'use strict';

/**
 * Telemetry redaction — the single choke point that keeps secrets out of the
 * runtime store.
 *
 * Every execution event (runtime:log, agent:done notes, context:brief
 * decisions, hook emissions) lands in `.aioson/runtime/aios.sqlite` through
 * `insertEvent` / `insertExecutionEvent`. Until now only the orchestrated
 * execution stream sanitized its payloads; the general stream stored whatever
 * an agent or hook passed in — an API key pasted into a task summary, a
 * bearer token echoed by a failing command — verbatim, in a file that is
 * backed up, ingested by retros, and read by dashboards.
 *
 * The rules are the ones the commit guard already trusts (`secrets-regex`):
 * value-shaped secrets (cloud/provider keys, private-key blocks) are blanked
 * wherever they appear; assignment-shaped credentials keep their key and lose
 * their value, in plain text and inside JSON payloads alike. Deterministic,
 * build-free, and cheap enough to run on every write.
 */

const { PATTERNS } = require('./security/secrets-regex');

// Assignment-shaped detectors in secrets-regex match `password = '…'` including
// the key name; telemetry keeps the key and blanks only the value, so those
// are covered by the key-preserving regexes below and skipped here.
const VALUE_PATTERNS = PATTERNS.filter((entry) => !String(entry.id).startsWith('generic-'));

const PRIVATE_KEY_BLOCK_RE = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;

const CREDENTIAL_KEY = '(?:authorization|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|secret[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key|password|passwd|pwd|secret|token)';

// `password: hunter22`, `token=abc…`, `Authorization: Bearer eyJ…` — plain text.
const PLAIN_ASSIGNMENT_RE = new RegExp(`\\b(${CREDENTIAL_KEY})(\\s*[:=]\\s*(?:bearer\\s+)?)([^\\s,;"']+)`, 'gi');

// `"api_key": "…"` inside serialized payloads. The replacement carries no
// quote or backslash, so the JSON stays parseable.
const JSON_FIELD_RE = new RegExp(`("${CREDENTIAL_KEY}"\\s*:\\s*")((?:[^"\\\\]|\\\\.)*)(")`, 'gi');

const REDACTED = '[REDACTED]';

function redactValues(text) {
  let out = text.replace(PRIVATE_KEY_BLOCK_RE, '[REDACTED:private-key-block]');
  for (const entry of VALUE_PATTERNS) {
    out = out.replace(entry.pattern, `[REDACTED:${entry.id}]`);
  }
  return out;
}

function redactTelemetryText(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  return redactValues(text).replace(PLAIN_ASSIGNMENT_RE, (match, key, sep, value) => (
    value.startsWith('[REDACTED') ? match : `${key}${sep}${REDACTED}`
  ));
}

function redactTelemetryJson(json) {
  if (typeof json !== 'string' || json.length === 0) return json;
  return redactTelemetryText(redactValues(json).replace(JSON_FIELD_RE, (match, open, value, close) => (
    value.length === 0 || value.startsWith('[REDACTED') ? match : `${open}${REDACTED}${close}`
  )));
}

// Applied to the row right before INSERT; only the free-text columns change.
function redactTelemetryRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const out = { ...record };
  if (typeof out.message === 'string') out.message = redactTelemetryText(out.message);
  if (typeof out.payload_json === 'string') out.payload_json = redactTelemetryJson(out.payload_json);
  return out;
}

module.exports = {
  redactTelemetryText,
  redactTelemetryJson,
  redactTelemetryRecord
};
