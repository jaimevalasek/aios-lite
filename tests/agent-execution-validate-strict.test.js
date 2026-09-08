'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runAgentExecution } = require('../src/commands/agent-execution');
const { signatureKey, writeSignatures } = require('../src/lib/host-signature');

const logger = { log() {}, error() {} };

function signed(host, model, effort, { expired = false } = {}) {
  return {
    host, model, reasoning_effort: effort, status: 'valid', reason: null,
    checked_at: '2026-08-25T10:00:00.000Z',
    expires_at: expired ? '2026-08-25T11:00:00.000Z' : '2999-01-01T00:00:00.000Z'
  };
}

async function setup(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aed-strict-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  await fs.mkdir(path.join(dir, '.aioson/context'), { recursive: true });
  const signatureEnv = { ...process.env, AIOSON_HOST_SIGNATURES: path.join(dir, 'signatures.json') };
  const init = await runAgentExecution({ args: [dir], options: { sub: 'init', feature: 'demo', host: 'claude', json: true }, logger });
  assert.equal(init.ok, true);
  return { dir, signatureEnv, manifestPath: path.join(dir, init.path) };
}

// Pin the Codex catalog so the model resolution never depends on the machine
// running the suite — the signature layer is what is under test here.
const catalogLoader = async () => ({
  available: true,
  source: 'fixture',
  fetched_at: '2026-08-25',
  models: [{ slug: 'gpt-5.6', display_name: 'GPT-5.6', supported_efforts: ['medium', 'high'] }]
});

function validate(dir, signatureEnv, extra = {}) {
  return runAgentExecution({ args: [dir], options: { sub: 'validate', feature: 'demo', json: true, ...extra }, logger, catalogLoader, signatureEnv });
}

test('validate without --strict keeps the validated_at_dispatch contract byte for byte', async (t) => {
  const { dir, signatureEnv } = await setup(t);
  const result = await validate(dir, signatureEnv);
  assert.equal(result.ok, true);
  assert.equal(result.availability, 'validated_at_dispatch');
  assert.equal(Object.hasOwn(result, 'signatures'), false);
  assert.deepEqual(result.errors, []);
});

test('validate --strict requires a valid signature for every ENABLED agent and ignores disabled ones', async (t) => {
  const { dir, signatureEnv } = await setup(t);
  let result = await validate(dir, signatureEnv, { strict: true });
  assert.equal(result.ok, false);
  assert.equal(result.availability, 'validated_against_signatures');
  assert.deepEqual(
    result.errors.map((error) => [error.path, error.message]).sort(),
    [['$.agents.dev.model', 'signature_missing'], ['$.agents.qa.model', 'signature_missing']]
  );
  assert.match(result.errors[0].hint, /^aioson host:signature \. --host=claude --model=configured-default$/);
  assert.deepEqual(Object.keys(result.signatures.agents).sort(), ['dev', 'qa']);
  assert.equal(result.signatures.agents.dev.state, 'missing');
  assert.equal(result.signatures.path, signatureEnv.AIOSON_HOST_SIGNATURES);

  await writeSignatures({ signatures: { [signatureKey('claude', 'configured-default', null)]: signed('claude', 'configured-default', null) } }, { env: signatureEnv });
  result = await validate(dir, signatureEnv, { strict: true });
  assert.equal(result.ok, true);
  assert.equal(result.signatures.agents.dev.state, 'valid');
  assert.equal(result.signatures.agents.qa.state, 'valid');
  assert.equal(result.signatures.agents.qa.expires_at, '2999-01-01T00:00:00.000Z');
});

test('validate --strict reports expired signatures and lane hosts/models with their effort, warning on unsigned fallbacks', async (t) => {
  const { dir, signatureEnv, manifestPath } = await setup(t);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.agents.dev.host = 'codex';
  manifest.agents.dev.model = 'gpt-5.6';
  manifest.agents.dev.reasoning_effort = 'high';
  manifest.agents.dev.fallbacks = [{ host: 'opencode', model: 'configured-default', on: ['unavailable'] }];
  manifest.development_lanes.strategy = 'split';
  manifest.development_lanes.lanes.frontend.enabled = true;
  manifest.development_lanes.lanes.frontend.host = 'kimi';
  manifest.development_lanes.lanes.frontend.model = 'kimi-k3';
  manifest.development_lanes.lanes.frontend.write_paths = ['src/ui/**'];
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  await writeSignatures({
    signatures: {
      [signatureKey('codex', 'gpt-5.6', 'high')]: signed('codex', 'gpt-5.6', 'high', { expired: true }),
      [signatureKey('claude', 'configured-default', null)]: signed('claude', 'configured-default', null)
    }
  }, { env: signatureEnv });

  let result = await validate(dir, signatureEnv, { strict: true });
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => [error.path, error.message]).sort(),
    [['$.agents.dev.model', 'signature_expired'], ['$.development_lanes.lanes.frontend.model', 'signature_missing']]
  );
  const laneError = result.errors.find((error) => error.path.includes('frontend'));
  assert.equal(laneError.host, 'kimi');
  assert.equal(laneError.model, 'kimi-k3');
  assert.equal(laneError.hint, 'aioson host:signature . --host=kimi --model=kimi-k3');
  const devError = result.errors.find((error) => error.path === '$.agents.dev.model');
  assert.equal(devError.reasoning_effort, 'high');
  assert.equal(devError.hint, 'aioson host:signature . --host=codex --model=gpt-5.6 --effort=high');
  // The backend lane stays disabled → never required.
  assert.equal(Object.hasOwn(result.signatures.development_lanes, 'backend'), false);
  // An unsigned declared fallback is a warning, never a blocker.
  const fallbackWarning = { path: '$.agents.dev.fallbacks', message: 'fallback_signature_missing', host: 'opencode', model: 'configured-default' };
  assert.deepEqual(result.signatures.warnings, [fallbackWarning]);

  await writeSignatures({
    signatures: {
      [signatureKey('codex', 'gpt-5.6', 'high')]: signed('codex', 'gpt-5.6', 'high'),
      [signatureKey('kimi', 'kimi-k3', null)]: signed('kimi', 'kimi-k3', null),
      [signatureKey('claude', 'configured-default', null)]: signed('claude', 'configured-default', null)
    }
  }, { env: signatureEnv });
  result = await validate(dir, signatureEnv, { strict: true });
  assert.equal(result.ok, true);
  assert.equal(result.signatures.agents.dev.state, 'valid');
  assert.equal(result.signatures.development_lanes.frontend.state, 'valid');
  // qa keeps running on the manifest host with the default model, so its signature is still required and present.
  assert.equal(result.signatures.agents.qa.state, 'valid');
  assert.deepEqual(result.signatures.warnings, [fallbackWarning]);
});
