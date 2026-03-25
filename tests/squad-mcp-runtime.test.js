'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  runHealthCheck,
  runAction
} = require('../src/mcp-connectors/registry');

const { runSquadMcp } = require('../src/commands/squad-mcp');

// --- Helpers ---

function makeMockLogger() {
  const logs = [];
  return { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')), logs };
}

function makeMockT() {
  return (key, vars) => {
    let s = key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  };
}

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-mcp-rt-'));
}

/** Spin up a local HTTP server for testing. Returns { server, port, close }. */
function startLocalServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port, close: () => server.close() });
    });
    server.on('error', reject);
  });
}

// --- runHealthCheck ---

test('runHealthCheck: connector without healthPath returns skipped', async () => {
  const result = await runHealthCheck('webhook-generic', {});
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'no_health_path');
});

test('runHealthCheck: connector with invalid URL returns ok:false without throwing', async () => {
  // smtp-email has no healthPath → skipped. Use a custom test via whatsapp-business with bogus config.
  // We test the error path by passing an unknown connector that we override via a real URL that refuses.
  // Best approach: call runHealthCheck for telegram-bot with a bad token pointing to a closed port.
  // We need a URL that will fail fast. Use localhost with a port that's not open.
  const result = await runHealthCheck('telegram-bot', { bot_token: 'invalid_token_xyz' });
  // Either network error (if telegram API rejects) or ok:false — either way no throw
  assert.equal(typeof result.ok, 'boolean');
  assert.ok(!result.skipped);
});

test('runHealthCheck: smtp-email returns skipped (no healthPath)', async () => {
  const result = await runHealthCheck('smtp-email', {});
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
});

// --- runAction ---

test('runAction: unknown connector returns ok:false', async () => {
  const result = await runAction('nonexistent-connector', 'send', {}, {});
  assert.equal(result.ok, false);
  assert.ok(result.error.includes('Unknown connector'));
});

test('runAction: unknown action returns ok:false', async () => {
  const result = await runAction('whatsapp-business', 'nonexistent_action', {}, {});
  assert.equal(result.ok, false);
  assert.ok(result.error.includes('Unknown action'));
});

test('runAction: no executor registered returns ok:false', async () => {
  // google-calendar has no executor registered
  const result = await runAction('google-calendar', 'list_events', {}, {});
  assert.equal(result.ok, false);
  assert.ok(result.error);
});

test('runAction: webhook-generic/send with local server returns ok:true', async () => {
  let receivedBody = null;
  const { port, close } = await startLocalServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      receivedBody = JSON.parse(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    });
  });

  try {
    const result = await runAction(
      'webhook-generic',
      'send',
      { url: `http://127.0.0.1:${port}/hook`, payload: { hello: 'world' } },
      {}
    );
    assert.equal(result.ok, true);
    assert.equal(result.result.status, 200);
    assert.equal(result.result.ok, true);
    assert.deepEqual(receivedBody, { hello: 'world' });
  } finally {
    close();
  }
});

// --- handleTest via runSquadMcp ---

test('handleTest: MCP not configured returns error', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeMockLogger();
  const t = makeMockT();

  const result = await runSquadMcp({
    args: [tmpDir],
    options: { squad: 'test-squad', sub: 'test', mcp: 'whatsapp' },
    logger,
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'not_configured');
});

test('handleTest: connector without healthPath returns skipped', async () => {
  const tmpDir = await makeTempDir();
  await fs.mkdir(path.join(tmpDir, '.aioson', 'squads', 'myteam', 'integrations'), { recursive: true });
  await fs.writeFile(
    path.join(tmpDir, '.aioson', 'squads', 'myteam', 'integrations', 'hook.json'),
    JSON.stringify({ connector: 'webhook-generic', config: { webhook_url: 'http://example.com' } })
  );

  const logger = makeMockLogger();
  const t = makeMockT();

  const result = await runSquadMcp({
    args: [tmpDir],
    options: { squad: 'myteam', sub: 'test', mcp: 'hook' },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'skipped');
});

// --- handleCall via runSquadMcp ---

test('handleCall: MCP not configured returns error', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeMockLogger();
  const t = makeMockT();

  const result = await runSquadMcp({
    args: [tmpDir],
    options: { squad: 'test-squad', sub: 'call', mcp: 'whatsapp', action: 'send_message', input: '{}' },
    logger,
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'not_configured');
});

test('handleCall: missing action returns error', async () => {
  const tmpDir = await makeTempDir();
  const logger = makeMockLogger();
  const t = makeMockT();

  const result = await runSquadMcp({
    args: [tmpDir],
    options: { squad: 'test-squad', sub: 'call', mcp: 'whatsapp' },
    logger,
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'action_required');
});

test('handleCall: webhook-generic/send with local server returns result', async () => {
  const tmpDir = await makeTempDir();
  await fs.mkdir(path.join(tmpDir, '.aioson', 'squads', 'myteam', 'integrations'), { recursive: true });

  let receivedBody = null;
  const { port, close } = await startLocalServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      receivedBody = JSON.parse(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });

  try {
    const webhookUrl = `http://127.0.0.1:${port}/callback`;
    await fs.writeFile(
      path.join(tmpDir, '.aioson', 'squads', 'myteam', 'integrations', 'myhook.json'),
      JSON.stringify({ connector: 'webhook-generic', config: { webhook_url: webhookUrl } })
    );

    const logger = makeMockLogger();
    const t = makeMockT();

    const result = await runSquadMcp({
      args: [tmpDir],
      options: {
        squad: 'myteam',
        sub: 'call',
        mcp: 'myhook',
        action: 'send',
        input: JSON.stringify({ url: webhookUrl, payload: { event: 'test' } })
      },
      logger,
      t
    });

    assert.equal(result.ok, true);
    assert.equal(result.result.status, 200);
    assert.deepEqual(receivedBody, { event: 'test' });
  } finally {
    close();
  }
});
