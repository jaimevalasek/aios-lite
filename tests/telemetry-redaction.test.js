'use strict';

/**
 * Secrets never reach the runtime store. The general execution-event stream
 * (runtime:log, agent:done notes, context:brief decisions, hook emissions)
 * stored whatever it was handed; only the orchestrated stream sanitized. Now
 * every row passes one redaction choke point before INSERT.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  redactTelemetryText,
  redactTelemetryJson,
  redactTelemetryRecord
} = require('../src/lib/telemetry-redaction');
const {
  openRuntimeDb,
  startTask,
  startRun,
  appendRunEvent,
  appendContextBriefEvent
} = require('../src/runtime-store');

const AWS_KEY = 'AKIA' + 'ABCDEFGHIJKLMNOP';
const OPENAI_KEY = 'sk-' + 'abcdefghijklmnopqrstuvwxyz0123';

test('value-shaped secrets are blanked wherever they appear in free text', () => {
  const text = `deploy failed with key ${AWS_KEY} and provider ${OPENAI_KEY} in env`;
  const out = redactTelemetryText(text);
  assert.ok(!out.includes(AWS_KEY));
  assert.ok(!out.includes(OPENAI_KEY));
  assert.match(out, /\[REDACTED:aws-access-key\]/);
  assert.match(out, /\[REDACTED:openai-api-key\]/);
});

test('assignment-shaped credentials keep the key and lose the value', () => {
  // `dummy-` / `placeholder-` mark these as fixtures for the commit guard; the
  // redactor still blanks them because the key, not the value, is the signal.
  const out = redactTelemetryText('retrying with password: dummy-hunter22, token=placeholder-abc123 Authorization: Bearer eyJhbGciOi.payload.sig');
  assert.equal(out, 'retrying with password: [REDACTED], token=[REDACTED] Authorization: Bearer [REDACTED]');
});

test('private key blocks are removed whole, not just their header', () => {
  const block = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow\nline2\n-----END RSA PRIVATE KEY-----';
  const out = redactTelemetryText(`cert dump:\n${block}\ndone`);
  assert.equal(out, 'cert dump:\n[REDACTED:private-key-block]\ndone');
});

test('JSON payloads stay parseable and credential fields are blanked by key', () => {
  const payload = JSON.stringify({
    api_key: 'live-key-value-1234',
    nested: { password: 'p@ss"quoted', note: `token ${AWS_KEY}` },
    plain: 'unchanged',
    token: ''
  });
  const out = redactTelemetryJson(payload);
  const parsed = JSON.parse(out);
  assert.equal(parsed.api_key, '[REDACTED]');
  assert.equal(parsed.nested.password, '[REDACTED]');
  assert.equal(parsed.nested.note, 'token [REDACTED:aws-access-key]');
  assert.equal(parsed.plain, 'unchanged');
  assert.equal(parsed.token, '', 'an empty credential field is left alone');
});

test('ordinary prose and counts are untouched', () => {
  const text = 'token budget 8000 chars; tokens: 1200; the secret sauce is tests; password reset flow implemented';
  assert.equal(redactTelemetryText(text), text);
  const record = { message: 'brief_built:planning', payload_json: JSON.stringify({ must_load: ['.aioson/rules/x.md'], task_chars: 42 }) };
  assert.deepEqual(redactTelemetryRecord(record), record);
});

test('every execution-event writer passes through the choke point', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-redaction-'));
  const { db } = await openRuntimeDb(dir);
  try {
    const taskKey = startTask(db, { title: 'redaction probe' });
    const runKey = startRun(db, { agentName: 'dev', taskKey, title: 'probe' });
    appendRunEvent(db, {
      runKey,
      eventType: 'update',
      message: `curl failed: Authorization: Bearer ${OPENAI_KEY}`,
      payload: { access_token: 'dummy-abcdefghijk', detail: `aws ${AWS_KEY}` }
    });
    appendContextBriefEvent(db, {
      agentName: 'dev',
      message: 'brief_built:executing',
      payload: { mode: 'executing', must_load: ['.aioson/rules/security-baseline.md'], task_note: `rotate ${AWS_KEY}` }
    });

    const rows = db.prepare("SELECT message, payload_json FROM execution_events WHERE event_type IN ('update', 'brief_built') ORDER BY id").all();
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.ok(!row.message.includes(OPENAI_KEY), `message leaked: ${row.message}`);
      assert.ok(!String(row.payload_json).includes(AWS_KEY), `payload leaked: ${row.payload_json}`);
      assert.ok(!String(row.payload_json).includes('dummy-abcdefghijk'), `assignment leaked: ${row.payload_json}`);
    }
    // A provider-shaped value is named by its detector even inside an assignment.
    assert.equal(rows[0].message, 'curl failed: Authorization: Bearer [REDACTED:openai-api-key]');
    const briefPayload = JSON.parse(rows[1].payload_json);
    assert.deepEqual(briefPayload.must_load, ['.aioson/rules/security-baseline.md'], 'routing paths survive redaction');
    assert.equal(briefPayload.task_note, 'rotate [REDACTED:aws-access-key]');

    const legacy = db.prepare("SELECT message FROM agent_events WHERE event_type = 'update' ORDER BY id").all();
    assert.equal(legacy.length, 1);
    assert.ok(!legacy[0].message.includes(OPENAI_KEY), 'agent_events mirror leaked');
  } finally {
    db.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
