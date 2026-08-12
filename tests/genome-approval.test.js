'use strict';

// Tests for the genome approval contract (approval by artifact, frozen only by
// the user) and its coupling with the squad pilot: `pilot.builders` records the
// compiled genome identities that built the pilot, and drift after either
// freeze is surfaced deterministically.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { normalizeBinding, normalizeApproval } = require('../src/genomes/bindings');
const { analyzeGenomeApprovals, findGenomeApprovalDrift, specimenDirRel } = require('../src/lib/genome-approval-lint');
const { runGenomeApprove } = require('../src/commands/genome-approve');
const { analyzeSquadPilot } = require('../src/lib/squad-pilot-lint');
const { runSquadPilotApprove } = require('../src/commands/squad-pilot-approve');

const REPO = path.resolve(__dirname, '..');

function quietLogger() {
  return { log: () => {}, error: () => {}, warn: () => {} };
}

function tmpProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-gap-'));
}

function baseManifest(slug, extra = {}) {
  return { schemaVersion: '1.0.0', slug, name: slug, mode: 'software', mission: 'm', goal: 'g', ...extra };
}

function writeSquadManifest(root, slug, manifest) {
  const dir = path.join(root, '.aioson', 'squads', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'squad.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function readManifest(root, slug) {
  return JSON.parse(fs.readFileSync(path.join(root, '.aioson', 'squads', slug, 'squad.manifest.json'), 'utf8'));
}

function writeSpecimen(root, squad, genome) {
  const dir = path.join(root, 'output', squad, 'specimen', genome);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<main>specimen</main>', 'utf8');
}

function compiledBinding(slug, extra = {}) {
  return { slug, status: 'compiled', sourceHash: 'sha256:aaa', compilationId: 'comp-1', ...extra };
}

function freshApproval(squad, genome, extra = {}) {
  return {
    specimen: `output/${squad}/specimen/${genome}`,
    sourceHash: 'sha256:aaa',
    compilationId: 'comp-1',
    approvedAt: '2026-08-12T00:00:00.000Z',
    ...extra
  };
}

const GOOD_PILOT_DOC = `# Pilot

## Pilot task
Build the flagship pipeline board.

## Validations
- \`npm run build\` → PASS (exit 0)

## Binds
- Visual and interaction signature.

## Does not bind
- Backend scale.
`;

function writePilotFixture(root, slug, { manifestExtra = {}, pilot = {} } = {}) {
  writeSquadManifest(root, slug, baseManifest(slug, {
    deliveryLane: 'standard',
    pilot: { status: 'draft', task: 'flagship board', entrypoint: `output/${slug}/pilot/index.html`, ...pilot },
    ...manifestExtra
  }));
  const docsDir = path.join(root, '.aioson', 'squads', slug, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'PILOT.md'), GOOD_PILOT_DOC, 'utf8');
  const pilotDir = path.join(root, 'output', slug, 'pilot');
  fs.mkdirSync(pilotDir, { recursive: true });
  fs.writeFileSync(path.join(pilotDir, 'index.html'), '<main>pilot</main>', 'utf8');
}

// ── binding normalization ───────────────────────────────────────────────────

test('normalizeBinding keeps the legacy shape without approval and normalizes a snake_case one', () => {
  const bare = normalizeBinding({ slug: 'voice', status: 'compiled' });
  assert.equal('approval' in bare, false, 'bindings without approval must keep their exact legacy shape');

  const approved = normalizeBinding({
    slug: 'voice',
    status: 'compiled',
    approval: {
      specimen: 'output/s/specimen/voice',
      source_hash: 'sha256:aaa',
      compilation_id: 'comp-1',
      approved_at: '2026-08-12T00:00:00.000Z'
    }
  });
  assert.deepEqual(approved.approval, {
    specimen: 'output/s/specimen/voice',
    sourceHash: 'sha256:aaa',
    compilationId: 'comp-1',
    approvedAt: '2026-08-12T00:00:00.000Z'
  });

  assert.equal(normalizeApproval({}), null);
  assert.equal(normalizeApproval('approved'), null);
  assert.equal(normalizeApproval(null), null);
});

// ── approval lint ───────────────────────────────────────────────────────────

test('a coherent approval on a compiled binding passes clean', () => {
  const root = tmpProject();
  writeSpecimen(root, 's', 'voice');
  writeSquadManifest(root, 's', baseManifest('s', {
    genomeBindings: { squad: [compiledBinding('voice', { approval: freshApproval('s', 'voice') })] }
  }));
  const res = analyzeGenomeApprovals({ targetDir: root, squadSlug: 's' });
  assert.deepEqual(res.issues, []);
  assert.equal(res.metrics.approvals, 1);
  assert.equal(res.metrics.stale, 0);
});

test('approval staleness and incoherence are issues: drifted hash, non-compiled binding, missing specimen, escape, no identity', () => {
  const root = tmpProject();
  writeSpecimen(root, 's', 'voice');

  const drifted = baseManifest('s', {
    genomeBindings: { squad: [compiledBinding('voice', { sourceHash: 'sha256:bbb', approval: freshApproval('s', 'voice') })] }
  });
  writeSquadManifest(root, 's', drifted);
  let res = analyzeGenomeApprovals({ targetDir: root, squadSlug: 's' });
  assert.equal(res.issues.length, 1);
  assert.match(res.issues[0], /stale/);
  assert.equal(res.metrics.stale, 1);

  writeSquadManifest(root, 's', baseManifest('s', {
    genomeBindings: { squad: [compiledBinding('voice', { status: 'stale', approval: freshApproval('s', 'voice') })] }
  }));
  res = analyzeGenomeApprovals({ targetDir: root, squadSlug: 's' });
  assert.match(res.issues.join('\n'), /status is "stale"/);

  writeSquadManifest(root, 's', baseManifest('s', {
    genomeBindings: { squad: [compiledBinding('voice', { approval: freshApproval('s', 'missing-genome', { specimen: 'output/s/specimen/missing-genome' }) })] }
  }));
  res = analyzeGenomeApprovals({ targetDir: root, squadSlug: 's' });
  assert.match(res.issues.join('\n'), /missing or empty on disk/);

  writeSquadManifest(root, 's', baseManifest('s', {
    genomeBindings: { squad: [compiledBinding('voice', { approval: freshApproval('s', 'voice', { specimen: 'output/../secret' }) })] }
  }));
  res = analyzeGenomeApprovals({ targetDir: root, squadSlug: 's' });
  assert.match(res.issues.join('\n'), /must not contain/);

  writeSquadManifest(root, 's', baseManifest('s', {
    genomeBindings: { squad: [compiledBinding('voice', { approval: freshApproval('s', 'voice', { specimen: '.aioson/specimen' }) })] }
  }));
  res = analyzeGenomeApprovals({ targetDir: root, squadSlug: 's' });
  assert.match(res.issues.join('\n'), /must live under output\//);

  writeSquadManifest(root, 's', baseManifest('s', {
    genomeBindings: { squad: [compiledBinding('voice', { approval: { specimen: 'output/s/specimen/voice', approvedAt: '2026-08-12T00:00:00.000Z' } })] }
  }));
  res = analyzeGenomeApprovals({ targetDir: root, squadSlug: 's' });
  assert.match(res.issues.join('\n'), /no compilation identity/);
});

test('findGenomeApprovalDrift names only the squads whose approval of THIS genome drifted', () => {
  const root = tmpProject();
  writeSpecimen(root, 'fresh', 'voice');
  writeSpecimen(root, 'drifted', 'voice');
  writeSquadManifest(root, 'fresh', baseManifest('fresh', {
    genomeBindings: { squad: [compiledBinding('voice', { approval: freshApproval('fresh', 'voice') })] }
  }));
  writeSquadManifest(root, 'drifted', baseManifest('drifted', {
    genomeBindings: { squad: [compiledBinding('voice', { compilationId: 'comp-2', approval: freshApproval('drifted', 'voice') })] }
  }));
  writeSquadManifest(root, 'other', baseManifest('other', {
    genomeBindings: { squad: [compiledBinding('other-genome', { sourceHash: 'sha256:zzz', approval: freshApproval('other', 'other-genome') })] }
  }));

  const warnings = findGenomeApprovalDrift({ targetDir: root, genomeSlug: 'voice' });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /squad "drifted"/);
  assert.match(warnings[0], /re-approve with genome:approve/);
});

// ── genome:approve — the user freeze ────────────────────────────────────────

test('genome:approve freezes the compiled binding identity and re-freezes after an enrich', async () => {
  const root = tmpProject();
  writeSpecimen(root, 's', 'voice');
  writeSquadManifest(root, 's', baseManifest('s', {
    genomeBindings: { squad: [compiledBinding('voice')] }
  }));

  const res = await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice' }, logger: quietLogger() });
  assert.equal(res.ok, true);
  assert.equal(res.scope, 'squad');
  assert.equal(res.specimen, 'output/s/specimen/voice');

  let manifest = readManifest(root, 's');
  const approval = manifest.genomeBindings.squad[0].approval;
  assert.equal(approval.sourceHash, 'sha256:aaa');
  assert.equal(approval.compilationId, 'comp-1');
  assert.match(approval.approvedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(analyzeGenomeApprovals({ targetDir: root, squadSlug: 's' }).issues, []);

  // Enrich: the binding is recompiled with a new identity → approval goes stale.
  manifest.genomeBindings.squad[0].sourceHash = 'sha256:bbb';
  manifest.genomeBindings.squad[0].compilationId = 'comp-2';
  writeSquadManifest(root, 's', manifest);
  assert.match(analyzeGenomeApprovals({ targetDir: root, squadSlug: 's' }).issues.join('\n'), /stale/);

  // The user re-freezes; the approval now pins the new identity.
  const again = await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice' }, logger: quietLogger() });
  assert.equal(again.ok, true);
  assert.equal(again.sourceHash, 'sha256:bbb');
  assert.deepEqual(analyzeGenomeApprovals({ targetDir: root, squadSlug: 's' }).issues, []);
});

test('genome:approve refuses everything the contract forbids', async () => {
  const root = tmpProject();
  const logger = quietLogger();

  assert.equal((await runGenomeApprove({ args: [root], options: {}, logger })).error, 'missing_slug');
  assert.equal((await runGenomeApprove({ args: [root], options: { squad: 'NOPE!', genome: 'voice' }, logger })).error, 'invalid_slug');
  assert.equal((await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice' }, logger })).error, 'manifest_missing');

  writeSquadManifest(root, 's', baseManifest('s', { genomeBindings: { squad: [compiledBinding('other')] } }));
  assert.equal((await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice' }, logger })).error, 'binding_missing');

  writeSquadManifest(root, 's', baseManifest('s', { genomeBindings: { squad: [{ slug: 'voice', status: 'resolved' }] } }));
  assert.equal((await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice' }, logger })).error, 'binding_not_compiled');

  writeSquadManifest(root, 's', baseManifest('s', { genomeBindings: { squad: [{ slug: 'voice', status: 'compiled' }] } }));
  assert.equal((await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice' }, logger })).error, 'binding_identity_missing');

  writeSquadManifest(root, 's', baseManifest('s', { genomeBindings: { squad: [compiledBinding('voice')] } }));
  assert.equal((await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice' }, logger })).error, 'specimen_missing');

  writeSpecimen(root, 's', 'voice');
  assert.equal(
    (await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice', specimen: 'output/../x' }, logger })).error,
    'specimen_invalid'
  );
});

test('genome:approve resolves scope: ambiguous without --executor, targeted with it', async () => {
  const root = tmpProject();
  const logger = quietLogger();
  writeSpecimen(root, 's', 'voice');
  writeSquadManifest(root, 's', baseManifest('s', {
    genomeBindings: {
      squad: [compiledBinding('voice')],
      executors: { writer: [compiledBinding('voice', { compilationId: 'comp-w' })] }
    }
  }));

  assert.equal((await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice' }, logger })).error, 'binding_ambiguous');

  const res = await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice', executor: 'writer' }, logger });
  assert.equal(res.ok, true);
  assert.equal(res.scope, 'executor');
  assert.equal(res.executor, 'writer');
  const manifest = readManifest(root, 's');
  assert.equal(manifest.genomeBindings.executors.writer[0].approval.compilationId, 'comp-w');
  assert.equal('approval' in manifest.genomeBindings.squad[0], false, 'squad-scope entry must stay untouched');
});

test('genome:approve writes onto a legacy `genomes` array entry without restructuring it', async () => {
  const root = tmpProject();
  writeSpecimen(root, 's', 'voice');
  writeSquadManifest(root, 's', baseManifest('s', {
    genomes: [compiledBinding('voice')]
  }));

  const res = await runGenomeApprove({ args: [root], options: { squad: 's', genome: 'voice' }, logger: quietLogger() });
  assert.equal(res.ok, true);
  const manifest = readManifest(root, 's');
  assert.ok(Array.isArray(manifest.genomes), 'legacy format must be preserved');
  assert.equal(manifest.genomes[0].approval.sourceHash, 'sha256:aaa');
  assert.equal(manifest.genomeBindings, undefined);
});

test('verify:artifact --kind=genome surfaces approval drift as advisory warnings', async () => {
  const root = tmpProject();
  fs.mkdirSync(path.join(root, '.aioson', 'genomes'), { recursive: true });
  fs.writeFileSync(path.join(root, '.aioson', 'genomes', 'voice.md'), '# Genome: voice\n\n## Operating Procedure\n1. Write.\n', 'utf8');
  writeSpecimen(root, 's', 'voice');
  writeSquadManifest(root, 's', baseManifest('s', {
    genomeBindings: { squad: [compiledBinding('voice', { sourceHash: 'sha256:bbb', approval: freshApproval('s', 'voice') })] }
  }));

  const { runVerifyArtifact } = require('../src/commands/verify-artifact');
  await runVerifyArtifact({ args: [root], options: { kind: 'genome', slug: 'voice', advisory: true }, logger: quietLogger() });
  const report = JSON.parse(fs.readFileSync(path.join(root, '.aioson', 'context', 'verify-artifact-genome.json'), 'utf8'));
  assert.match((report.warnings || []).join('\n'), /squad "s".*stale.*re-approve with genome:approve/);
});

// ── pilot ↔ genome coupling: builders frozen at approval ────────────────────

test('squad:pilot-approve records the compiled builder identities in pilot.builders', async () => {
  const root = tmpProject();
  writePilotFixture(root, 'crm', {
    manifestExtra: {
      genomeBindings: {
        squad: [compiledBinding('voice')],
        executors: { builder: [compiledBinding('layout', { compilationId: 'comp-l' }), { slug: 'draft-only', status: 'pending' }] }
      }
    }
  });

  const res = await runSquadPilotApprove({ args: [root], options: { squad: 'crm' }, logger: quietLogger() });
  assert.equal(res.ok, true);
  assert.equal(res.builders, 2, 'only compiled bindings are builders');

  const pilot = readManifest(root, 'crm').pilot;
  assert.deepEqual(pilot.builders, [
    { genome: 'voice', scope: 'squad', executor: null, sourceHash: 'sha256:aaa', compilationId: 'comp-1' },
    { genome: 'layout', scope: 'executor', executor: 'builder', sourceHash: 'sha256:aaa', compilationId: 'comp-l' }
  ]);

  const clean = analyzeSquadPilot({ targetDir: root, slug: 'crm' });
  assert.deepEqual(clean.issues, []);
  assert.deepEqual(clean.warnings, []);
  assert.equal(clean.metrics.builder_drift, 0);
});

test('builder drift after pilot approval is a warning, never an issue: the deliverable is intact, the squad is not', async () => {
  const root = tmpProject();
  writePilotFixture(root, 'crm', {
    manifestExtra: { genomeBindings: { squad: [compiledBinding('voice')] } }
  });
  await runSquadPilotApprove({ args: [root], options: { squad: 'crm' }, logger: quietLogger() });

  // Enrich: the same genome recompiles with a new identity.
  let manifest = readManifest(root, 'crm');
  manifest.genomeBindings.squad[0].sourceHash = 'sha256:bbb';
  writeSquadManifest(root, 'crm', manifest);
  let res = analyzeSquadPilot({ targetDir: root, slug: 'crm' });
  assert.deepEqual(res.issues, []);
  assert.match(res.warnings.join('\n'), /compilation identity drift/);
  assert.equal(res.metrics.builder_drift, 1);

  // The builder stops being compiled at all.
  manifest = readManifest(root, 'crm');
  manifest.genomeBindings.squad[0].status = 'stale';
  writeSquadManifest(root, 'crm', manifest);
  res = analyzeSquadPilot({ targetDir: root, slug: 'crm' });
  assert.match(res.warnings.join('\n'), /no longer compiled/);

  // A new genome is compiled in after the freeze.
  manifest = readManifest(root, 'crm');
  manifest.genomeBindings.squad = [compiledBinding('voice'), compiledBinding('tone', { compilationId: 'comp-t' })];
  writeSquadManifest(root, 'crm', manifest);
  res = analyzeSquadPilot({ targetDir: root, slug: 'crm' });
  assert.match(res.warnings.join('\n'), /compiled into the squad after pilot approval/);
});

test('an approved pilot without a builders record warns only when compiled genomes exist', async () => {
  const root = tmpProject();
  writePilotFixture(root, 'crm', {
    manifestExtra: { genomeBindings: { squad: [compiledBinding('voice')] } }
  });
  await runSquadPilotApprove({ args: [root], options: { squad: 'crm' }, logger: quietLogger() });

  const manifest = readManifest(root, 'crm');
  delete manifest.pilot.builders;
  writeSquadManifest(root, 'crm', manifest);
  const res = analyzeSquadPilot({ targetDir: root, slug: 'crm' });
  assert.match(res.warnings.join('\n'), /does not record its builder genome identities/);

  // With no bindings at all, the missing record is silent — nothing to drift.
  const bare = tmpProject();
  writePilotFixture(bare, 'crm');
  await runSquadPilotApprove({ args: [bare], options: { squad: 'crm' }, logger: quietLogger() });
  const bareManifest = readManifest(bare, 'crm');
  assert.deepEqual(bareManifest.pilot.builders, []);
  delete bareManifest.pilot.builders;
  writeSquadManifest(bare, 'crm', bareManifest);
  const clean = analyzeSquadPilot({ targetDir: bare, slug: 'crm' });
  assert.deepEqual(clean.warnings, []);
});

// ── contract pins: kernel, docs, schema, template parity ────────────────────

test('genome approval contract is pinned in the kernel and docs, workspace identical to template', () => {
  for (const rel of [
    path.join('agents', 'genome.md'),
    path.join('docs', 'genome', 'evidence-and-quality.md'),
    path.join('docs', 'genome', 'runtime-application.md'),
    path.join('docs', 'squad', 'genome-bindings.md'),
    path.join('docs', 'squad', 'pilot-gate.md')
  ]) {
    const workspace = fs.readFileSync(path.join(REPO, '.aioson', rel), 'utf8');
    const template = fs.readFileSync(path.join(REPO, 'template', '.aioson', rel), 'utf8');
    assert.equal(workspace, template, `workspace and template disagree for ${rel}`);
  }

  const kernel = fs.readFileSync(path.join(REPO, 'template', '.aioson', 'agents', 'genome.md'), 'utf8');
  assert.match(kernel, /Do not run `genome:approve`/);
  assert.match(kernel, /freeze belongs exclusively to the user/);

  const quality = fs.readFileSync(path.join(REPO, 'template', '.aioson', 'docs', 'genome', 'evidence-and-quality.md'), 'utf8');
  assert.match(quality, /## Approval by artifact/);
  assert.ok(quality.includes('output/{squad-slug}/specimen/{genome-slug}/'));
  assert.match(quality, /genome:approve \. --squad=<squad> --genome=<slug>/);

  const runtime = fs.readFileSync(path.join(REPO, 'template', '.aioson', 'docs', 'genome', 'runtime-application.md'), 'utf8');
  assert.match(runtime, /user-frozen `approval` block/);

  const pilotGate = fs.readFileSync(path.join(REPO, 'template', '.aioson', 'docs', 'squad', 'pilot-gate.md'), 'utf8');
  assert.match(pilotGate, /`pilot\.builders`/);
});

test('the squad manifest schema documents pilot.builders and the binding approval block', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(REPO, 'template', '.aioson', 'schemas', 'squad-manifest.schema.json'), 'utf8'));
  const builders = schema.properties.pilot.properties.builders;
  assert.equal(builders.type, 'array');
  assert.deepEqual(builders.items.required, ['genome']);
  assert.ok(schema.properties.genomeBindings.properties.squad.items.oneOf[1].properties.approval);
  assert.ok(schema.properties.genomeBindings.properties.executors.additionalProperties.items.oneOf[1].properties.approval);
});

test('specimen location is pinned: output/{squad}/specimen/{genome}', () => {
  assert.equal(specimenDirRel('crm', 'voice'), 'output/crm/specimen/voice');
});
