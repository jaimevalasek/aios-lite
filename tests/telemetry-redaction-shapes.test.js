'use strict';

/**
 * The redaction choke point covers the shapes the first cut missed (audit of
 * 9e55c94c): quoted assignments (the dominant shell/config form), env-prefixed
 * keys (AWS_SECRET_ACCESS_KEY, GH_TOKEN), the pt-BR senha key,
 * URL credentials, a truncated private-key block, JSON string values that
 * hold an assignment with an escaped quote (the serialized-string pass could
 * corrupt the payload AND leave the secret), the run/task rows (`summary`,
 * `title`, `goal`) and the three emitters that wrote their own INSERT.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { redactTelemetryText, redactTelemetryJson } = require('../src/lib/telemetry-redaction');
const { openRuntimeDb, startTask, startRun, updateRun } = require('../src/runtime-store');
const { emitGuardEvent } = require('../src/harness/guard-events');
const { emitChainAuditEvent } = require('../src/neural-chain-telemetry');
const { emitSubTaskEvent } = require('../src/sub-task-telemetry');

// Fixture values: `dummy-` / `placeholder-` mark them as fixtures for the
// commit guard; the redactor still blanks them because the key, not the
// value, is the signal.
const QUOTED = 'dummy-abcdefghijklmnopqrstuvwxyz0123';
const GH = 'ghp_' + 'placeholder0123456789abcdef';
const AWS_FIXTURE = 'dummy-wJalrXUtnFEMI/K7MDENG';

test('quoted assignment values are blanked whole, the key survives', () => {
  const cases = [
    [`api_key="${QUOTED}"`, 'api_key=[REDACTED]'],
    [`password: "dummy-hunter22222222"`, 'password: [REDACTED]'],
    [`PASSWORD='dummy-longsecretvalue12'`, 'PASSWORD=[REDACTED]'],
    [`export TOKEN="${GH}"; npm publish`, 'export TOKEN=[REDACTED]; npm publish'],
    [`access_token="dummy-with spaces inside"`, 'access_token=[REDACTED]']
  ];
  for (const [input, expected] of cases) {
    assert.equal(redactTelemetryText(input), expected, input);
  }
});

test('env-prefixed keys, pt-BR senha and URL credentials lose their value', () => {
  assert.equal(redactTelemetryText(`AWS_SECRET_ACCESS_KEY=${AWS_FIXTURE}`), 'AWS_SECRET_ACCESS_KEY=[REDACTED]');
  assert.equal(redactTelemetryText(`GH_TOKEN=${GH}`), 'GH_TOKEN=[REDACTED]');
  assert.equal(redactTelemetryText('DB_PASSWORD=dummy-hunter2hunter2'), 'DB_PASSWORD=[REDACTED]');
  assert.equal(redactTelemetryText('NEXT_PUBLIC_API_KEY: dummy-abcdef123456'), 'NEXT_PUBLIC_API_KEY: [REDACTED]');
  assert.equal(redactTelemetryText('senha=dummy-minhasenha123'), 'senha=[REDACTED]');
  assert.equal(
    redactTelemetryText('DATABASE_URL=postgres://admin:dummy-s3cr3tpass@db.internal:5432/app'),
    'DATABASE_URL=postgres://admin:[REDACTED]@db.internal:5432/app'
  );
});

test('counts, paths, placeholders and near-miss keys stay untouched', () => {
  const untouched = [
    'token: 1200',
    'tokens: 1200; token_count: 42; TOKEN_LIMIT=4096',
    'pwd: /c/dev/aioson',
    'PASSWORD_FILE=./secrets/x',
    'token: <token>',
    'secret: ${SECRET}',
    'password: ***',
    'the secret sauce is tests; password reset flow implemented',
    'max_token = 4096'
  ];
  for (const text of untouched) {
    assert.equal(redactTelemetryText(text), text, text);
  }
});

test('a private-key block truncated before its END marker is blanked to the end', () => {
  const text = 'dump:\n-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\nline2\nline3';
  assert.equal(redactTelemetryText(text), 'dump:\n[REDACTED:private-key-block]');
});

test('JSON string values holding an assignment with a quote stay parseable and lose the secret', () => {
  const payload = JSON.stringify({
    note: 'token=abc"def',
    command: 'export TOKEN="abc"; run deploy',
    nested: { list: ['password: "p@ss"', 'plain'] },
    api_key: 'k'.repeat(24),
    password_policy: '8 chars min',
    token_count: 42
  });
  const out = redactTelemetryJson(payload);
  const parsed = JSON.parse(out);
  assert.ok(!out.includes('abc'), `secret leaked: ${out}`);
  assert.equal(parsed.command, 'export TOKEN=[REDACTED]; run deploy');
  assert.equal(parsed.nested.list[0], 'password: [REDACTED]');
  assert.equal(parsed.nested.list[1], 'plain');
  assert.equal(parsed.api_key, '[REDACTED]');
  assert.equal(parsed.password_policy, '8 chars min', 'a key that merely contains a credential word is not a credential');
  assert.equal(parsed.token_count, 42);

  const clean = JSON.stringify({ must_load: ['.aioson/rules/x.md'], task_chars: 7 }, null, 2);
  assert.equal(redactTelemetryJson(clean), clean, 'an untouched payload keeps its bytes');
  assert.equal(redactTelemetryJson('not json: token=abcdef'), 'not json: token=[REDACTED]');
});

test('run and task rows and the three direct emitters pass through the same choke point', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-redaction-shapes-'));
  const { db } = await openRuntimeDb(dir);
  try {
    const taskKey = startTask(db, { title: `rotate GH_TOKEN=${GH}`, goal: `use password: "dummy-hunter22222222"` });
    const runKey = startRun(db, { agentName: 'dev', taskKey, title: `probe api_key="${QUOTED}"`, summary: `started with token=${GH}` });
    updateRun(db, { runKey, status: 'completed', summary: `done AWS_SECRET_ACCESS_KEY=${AWS_FIXTURE}` });

    const task = db.prepare('SELECT title, goal FROM tasks WHERE task_key = ?').get(taskKey);
    assert.equal(task.title, 'rotate GH_TOKEN=[REDACTED]');
    assert.equal(task.goal, 'use password: [REDACTED]');
    const run = db.prepare('SELECT title, summary FROM agent_runs WHERE run_key = ?').get(runKey);
    assert.equal(run.title, 'probe api_key=[REDACTED]');
    assert.equal(run.summary, 'done AWS_SECRET_ACCESS_KEY=[REDACTED]');

    emitChainAuditEvent(db, { agent: 'dev', message: `chain failed token=${GH}`, error: `401 with api_key="${QUOTED}"` });
    const audit = db.prepare("SELECT message, payload_json FROM execution_events WHERE event_type = 'chain_audit'").get();
    assert.equal(audit.message, 'chain failed token=[REDACTED]');
    assert.equal(JSON.parse(audit.payload_json).error, '401 with api_key=[REDACTED]');
  } finally {
    db.close();
  }

  try {
    assert.equal(await emitGuardEvent(dir, {
      eventType: 'budget_warning',
      message: `budget check saw password: "dummy-hunter22222222"`,
      payload: { detail: `secret_token=${GH}` }
    }), true);
    await emitSubTaskEvent(dir, { message: `scout with token=${GH}`, payload: { note: `senha=dummy-minhasenha123` } });

    const { db: reopened } = await openRuntimeDb(dir);
    try {
      const guard = reopened.prepare("SELECT message, payload_json FROM execution_events WHERE event_type = 'budget_warning'").get();
      assert.equal(guard.message, 'budget check saw password: [REDACTED]');
      assert.equal(JSON.parse(guard.payload_json).detail, 'secret_token=[REDACTED]');
      const sub = reopened.prepare("SELECT message, payload_json FROM agent_events WHERE event_type = 'sub_task'").get();
      assert.equal(sub.message, 'scout with token=[REDACTED]');
      assert.equal(JSON.parse(sub.payload_json).note, 'senha=[REDACTED]');
    } finally {
      reopened.close();
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
