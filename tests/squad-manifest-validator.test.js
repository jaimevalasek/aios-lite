'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  SHIPPED_SCHEMA_PATH,
  hashObject,
  isContainedPath,
  resolveManifestSchemaPath,
  validateSquadManifest,
  validatePremiumManifest
} = require('../src/squad/manifest-validator');
const { resolveContainedPath, validateEvalReport } = require('../src/squad/eval-contract');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-manifest-validator-'));
}

test('AC-premium-14 loads the shipped Draft-07 schema when a workspace copy is absent', async () => {
  const projectDir = await makeTempDir();
  const schemaPath = await resolveManifestSchemaPath(projectDir);
  assert.equal(schemaPath, SHIPPED_SCHEMA_PATH);

  const result = await validateSquadManifest(projectDir, {
    schemaVersion: '1.0.0',
    slug: 'premium-squad',
    name: 'Premium Squad',
    mode: 'research',
    mission: 'Research safely',
    goal: 'Produce grounded output'
  });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('AC-premium-14 returns normalized errors for full canonical schema violations', async () => {
  const projectDir = await makeTempDir();
  const result = await validateSquadManifest(projectDir, {
    schemaVersion: '1.0.0',
    slug: 'premium-squad',
    name: 'Premium Squad',
    mode: 'unsupported-mode',
    mission: 'Research safely'
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'schema.required'));
  assert.ok(result.errors.some((error) => error.code === 'schema.enum'));
});

test('schema path containment rejects sibling and prefix-confusion paths', () => {
  const root = path.resolve('C:\\project');
  assert.equal(isContainedPath(root, path.join(root, '.aioson', 'schema.json')), true);
  assert.equal(isContainedPath(root, path.resolve('C:\\project-evil\\schema.json')), false);
});

test('real path containment rejects schemas and source files reached through an escaping directory link', async () => {
  const projectDir = await makeTempDir();
  const outsideDir = await makeTempDir();
  const aiosonDir = path.join(projectDir, '.aioson');
  const schemasLink = path.join(aiosonDir, 'schemas');
  const sourceLink = path.join(projectDir, 'linked-sources');
  await fs.mkdir(aiosonDir, { recursive: true });
  await fs.writeFile(
    path.join(outsideDir, 'squad-manifest.schema.json'),
    '{"type":"object"}\n'
  );
  await fs.writeFile(path.join(outsideDir, 'secret.md'), 'outside\n');
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  await fs.symlink(outsideDir, schemasLink, linkType);
  await fs.symlink(outsideDir, sourceLink, linkType);

  assert.equal(await resolveManifestSchemaPath(projectDir), SHIPPED_SCHEMA_PATH);
  assert.equal(
    await resolveContainedPath(projectDir, 'linked-sources/secret.md'),
    null
  );
});

function makePremiumManifest(slug) {
  return {
    researchPolicy: { policy: 'closed-world' },
    composition: { persistent_core: ['owner', 'reviewer'] },
    executors: [
      {
        slug: 'owner',
        type: 'agent',
        persistent: true,
        contribution: 'Integrate evidence',
        decisionRights: ['final integration'],
        file: `.aioson/squads/${slug}/agents/owner.md`
      },
      {
        slug: 'reviewer',
        type: 'reviewer',
        persistent: true,
        contribution: 'Review evidence',
        decisionRights: ['quality veto'],
        file: `.aioson/squads/${slug}/agents/reviewer.md`
      }
    ],
    evaluation: {
      contractVersion: '1.0.0',
      criteria: [{ id: 'c1' }],
      heldOutCases: [{ id: 'h1' }]
    }
  };
}

test('premium readiness rejects malformed and schema-valid fabricated eval reports', async () => {
  const projectDir = await makeTempDir();
  const slug = 'eval-schema-squad';
  const manifest = makePremiumManifest(slug);
  const evalDir = path.join(projectDir, '.aioson', 'squads', slug, 'evals');
  const latestPath = path.join(evalDir, 'latest.json');
  await fs.mkdir(evalDir, { recursive: true });
  await fs.writeFile(latestPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    verdict: 'PASS',
    inputs: { manifest_hash: hashObject(manifest) },
    critical_failures: 0
  }));

  const malformed = await validatePremiumManifest(projectDir, slug, manifest);
  assert.ok(malformed.errors.some((error) => error.includes('Latest eval report is invalid')));

  const fabricated = {
    schemaVersion: '1.0.0',
    squad: slug,
    generated_at: new Date().toISOString(),
    verdict: 'PASS',
    inputs: {
      manifest_hash: hashObject(manifest),
      source_hash: '0'.repeat(64),
      sources: manifest.executors.map((executor) => ({
        path: executor.file,
        hash: null
      }))
    },
    precheck: { status: 'pass', strict: true, errors: [], warnings: [] },
    source_rubric: {
      status: 'pass',
      criteria: [{ id: 'c1', kind: 'grounding', status: 'pass', critical: true }]
    },
    held_out: {
      status: 'pass',
      cases: [{ id: 'h1', task: null, deterministic: true, seed: null, executions: [], dimensions: [] }]
    },
    genome_comparison: {
      status: 'not-applicable',
      bindings: [],
      dimensions: [],
      reason: 'No genome binding declared'
    },
    dimensions: {},
    critical_failures: 0,
    reproduction: {
      command: `aioson squad:eval . --squad=${slug} --json`,
      deterministic: true,
      contract: '1.0.0',
      run_id: '00000000-0000-4000-8000-000000000000',
      engine_hash: '0'.repeat(64),
      evidence_hash: '0'.repeat(64)
    }
  };
  assert.equal((await validateEvalReport(projectDir, fabricated)).valid, true);
  await fs.writeFile(latestPath, JSON.stringify(fabricated));

  const rejected = await validatePremiumManifest(projectDir, slug, manifest);
  assert.equal(rejected.errors.some((error) => error.includes('source hash is stale')), true);
  assert.equal(rejected.errors.some((error) => error.includes('different evaluation engine')), true);
});

test('premium readiness rejects an executor directory junction that resolves outside the project', async () => {
  const projectDir = await makeTempDir();
  const outsideDir = await makeTempDir();
  const slug = 'linked-executor-squad';
  const squadDir = path.join(projectDir, '.aioson', 'squads', slug);
  const agentsLink = path.join(squadDir, 'agents');
  await fs.mkdir(squadDir, { recursive: true });
  await fs.writeFile(path.join(outsideDir, 'owner.md'), '# Outside owner\n');
  await fs.writeFile(path.join(outsideDir, 'reviewer.md'), '# Outside reviewer\n');
  await fs.symlink(
    outsideDir,
    agentsLink,
    process.platform === 'win32' ? 'junction' : 'dir'
  );

  const result = await validatePremiumManifest(
    projectDir,
    slug,
    makePremiumManifest(slug),
    { skipEval: true }
  );

  assert.ok(result.errors.some((error) => error.includes('resolves outside squad agents directory')));
});

test('AC-premium-04 strict live-required readiness enforces 6h freshness, policy identity and grounded claims', async () => {
  const projectDir = await makeTempDir();
  const slug = 'freshness-squad';
  const squadDir = path.join(projectDir, '.aioson', 'squads', slug);
  const evidenceDir = path.join(squadDir, 'sessions', 'session-1', 'evidence');
  await fs.mkdir(evidenceDir, { recursive: true });
  const manifest = {
    researchPolicy: {
      policy: 'live-required',
      maxAgeHours: 72,
      evidencePackRequired: true
    },
    composition: { persistent_core: ['owner', 'reviewer'] },
    executors: [
      {
        slug: 'owner',
        type: 'agent',
        persistent: true,
        contribution: 'Integrate evidence',
        decisionRights: ['final integration'],
        file: `.aioson/squads/${slug}/agents/owner.md`
      },
      {
        slug: 'reviewer',
        type: 'reviewer',
        persistent: true,
        contribution: 'Review evidence',
        decisionRights: ['quality veto'],
        file: `.aioson/squads/${slug}/agents/reviewer.md`
      }
    ],
    evaluation: {
      contractVersion: '1.0.0',
      criteria: [{ id: 'c1' }],
      heldOutCases: [{ id: 'h1' }]
    }
  };
  const pack = {
    schemaVersion: '1.0.0',
    topic: 'freshness',
    squad: slug,
    policy: { type: 'live-required' },
    status: 'pass',
    provider: { available: true, source: 'fixture' },
    collected_at: new Date(Date.now() - 7 * 3_600_000).toISOString(),
    sources: [{
      id: 'source-1',
      url: 'https://example.test/source',
      content_hash: 'a'.repeat(64)
    }],
    claims: [{
      id: 'claim-1',
      text: 'Current fact',
      status: 'supported',
      source_ids: ['source-1'],
      citations: ['https://example.test/source']
    }]
  };
  const packPath = path.join(evidenceDir, 'freshness.json');
  await fs.writeFile(packPath, JSON.stringify(pack));
  const stale = await validatePremiumManifest(projectDir, slug, manifest, { skipEval: true });
  assert.ok(stale.errors.some((error) => error.includes('older than 6 hour')));

  pack.collected_at = new Date().toISOString();
  pack.policy.type = 'live-check';
  await fs.writeFile(packPath, JSON.stringify(pack));
  const wrongPolicy = await validatePremiumManifest(projectDir, slug, manifest, { skipEval: true });
  assert.ok(wrongPolicy.errors.some((error) => error.includes('no Evidence Pack found')));

  pack.policy.type = 'live-required';
  pack.claims = [];
  await fs.writeFile(packPath, JSON.stringify(pack));
  const ungrounded = await validatePremiumManifest(projectDir, slug, manifest, { skipEval: true });
  assert.ok(ungrounded.errors.some((error) => error.includes('not live/verified')));

  pack.claims = [{
    id: 'claim-1',
    text: 'Current fact',
    status: 'supported',
    source_ids: ['source-1'],
    citations: ['https://example.test/source']
  }];
  await fs.writeFile(packPath, JSON.stringify(pack));
  const ready = await validatePremiumManifest(projectDir, slug, manifest, { skipEval: true });
  assert.equal(
    ready.errors.some((error) => error.includes('research evidence') || error.includes('Evidence Pack')),
    false,
    ready.errors.join('\n')
  );
});
