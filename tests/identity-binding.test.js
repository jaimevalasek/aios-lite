'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runPrototypeCheck } = require('../src/commands/prototype-check');

const SLUG = 'kanban';
const OTHER_SLUG = 'billing';

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-identity-'));
}

async function writeFile(dir, relPath, content) {
  const full = path.join(dir, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
}

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: () => {}, lines };
}

// Minimum viable identity record — only the frontmatter matters to the binding guard;
// `verify:artifact --kind=identity` owns the body contract.
function identityRecord({ scope = 'briefing', slug = SLUG, kind = 'identity' } = {}) {
  return `---
${kind ? `kind: ${kind}\n` : ''}scope: ${scope}
slug: ${slug}
source: references
generated_by: reference-identity-extract
---

## Design pillars
Operational calm.
`;
}

function manifest({ identity = null } = {}) {
  return `---
feature: ${SLUG}
status: approved
${identity ? `identity: ${identity}\n` : ''}---

# Prototype manifest

## Core interactions
- \`add card\` — adds a card to a list
`;
}

function prd({ identityLines = '', prototype = true } = {}) {
  const prototypeFrontmatter = prototype
    ? `prototype: .aioson/briefings/${SLUG}/prototype.html
prototype_status: current
prototype_feature: ${SLUG}`
    : `prototype: null
prototype_status: none
prototype_feature: null`;
  const contract = prototype
    ? `
## Prototype contract
- status: current
- feature: ${SLUG}
- prototype: .aioson/briefings/${SLUG}/prototype.html
- manifest: .aioson/briefings/${SLUG}/prototype-manifest.md
`
    : '';
  return `---
feature: ${SLUG}
${prototypeFrontmatter}
${identityLines}---

# Kanban
${contract}
## Acceptance Criteria
- AC-1: \`add card\` persists and re-renders.
`;
}

// Full happy-path workspace: owned prototype + approved manifest + PRD.
async function seed(dir, { prdContent, manifestContent = manifest(), prototype = true } = {}) {
  await writeFile(dir, `.aioson/context/prd-${SLUG}.md`, prdContent);
  if (prototype) {
    await writeFile(dir, `.aioson/briefings/${SLUG}/prototype.html`, '<!doctype html><title>k</title>');
    await writeFile(dir, `.aioson/briefings/${SLUG}/prototype-manifest.md`, manifestContent);
  }
}

async function run(dir, options = {}) {
  return runPrototypeCheck({
    args: [dir],
    options: { json: true, feature: SLUG, ...options },
    logger: makeLogger()
  });
}

test('identity — silence stays green when nothing upstream declared one', async () => {
  const dir = await makeTmpDir();
  await seed(dir, { prdContent: prd() });

  const r = await run(dir);

  assert.equal(r.ok, true);
  assert.equal(r.status, 'ok');
  assert.equal(r.identity.declared, false);
  assert.deepEqual(r.identity.issues, []);
});

test('identity — dropped between the approved manifest and the PRD is a hard failure', async () => {
  const dir = await makeTmpDir();
  await seed(dir, {
    prdContent: prd(),
    manifestContent: manifest({ identity: `.aioson/briefings/${SLUG}/identity.md` })
  });
  await writeFile(dir, `.aioson/briefings/${SLUG}/identity.md`, identityRecord());

  const r = await run(dir);

  assert.equal(r.ok, false);
  assert.equal(r.status, 'fail');
  assert.equal(r.reason, 'identity_binding_dropped');
  assert.match(r.message, /identity\.md/);
});

test('identity — a carried, feature-owned record passes', async () => {
  const dir = await makeTmpDir();
  await seed(dir, {
    prdContent: prd({
      identityLines: `identity: .aioson/briefings/${SLUG}/identity.md\nidentity_status: current\n`
    }),
    manifestContent: manifest({ identity: `.aioson/briefings/${SLUG}/identity.md` })
  });
  await writeFile(dir, `.aioson/briefings/${SLUG}/identity.md`, identityRecord());

  const r = await run(dir);

  assert.equal(r.ok, true);
  assert.equal(r.status, 'ok');
  assert.equal(r.identity.status, 'current');
  assert.equal(r.identity.identity, `.aioson/briefings/${SLUG}/identity.md`);
  assert.equal(r.checks.identity_path_owned, true);
  assert.equal(r.checks.identity_record_exists, true);
  assert.equal(r.checks.identity_scope_matches, true);
});

test('identity — a dangling binding fails', async () => {
  const dir = await makeTmpDir();
  await seed(dir, {
    prdContent: prd({
      identityLines: `identity: .aioson/briefings/${SLUG}/identity.md\nidentity_status: current\n`
    })
  });

  const r = await run(dir);

  assert.equal(r.ok, false);
  assert.equal(r.reason, 'dangling_identity');
});

test('identity — borrowing another feature\'s record fails', async () => {
  const dir = await makeTmpDir();
  await seed(dir, {
    prdContent: prd({
      identityLines: `identity: .aioson/briefings/${OTHER_SLUG}/identity.md\nidentity_status: current\n`
    })
  });
  await writeFile(dir, `.aioson/briefings/${OTHER_SLUG}/identity.md`, identityRecord({ slug: OTHER_SLUG }));

  const r = await run(dir);

  assert.equal(r.ok, false);
  assert.equal(r.reason, 'identity_feature_mismatch');
});

test('identity — PRD binding that contradicts the manifest fails', async () => {
  const dir = await makeTmpDir();
  await seed(dir, {
    prdContent: prd({
      identityLines: 'identity: .aioson/context/identity.md\nidentity_status: project\n'
    }),
    manifestContent: manifest({ identity: `.aioson/briefings/${SLUG}/identity.md` })
  });
  await writeFile(dir, '.aioson/context/identity.md', identityRecord({ scope: 'brand', slug: 'project' }));

  const r = await run(dir);

  assert.equal(r.ok, false);
  assert.equal(r.reason, 'identity_binding_conflict');
});

test('identity — a non-canonical exploration record may never bind a PRD', async () => {
  const dir = await makeTmpDir();
  await seed(dir, {
    prdContent: prd({
      identityLines: `identity: .aioson/briefings/${SLUG}/identity.md\nidentity_status: current\n`
    })
  });
  await writeFile(dir, `.aioson/briefings/${SLUG}/identity.md`, identityRecord({ scope: 'exploration' }));

  const r = await run(dir);

  assert.equal(r.ok, false);
  assert.equal(r.reason, 'identity_scope_non_canonical');
});

test('identity — the shared brand record is a legitimate binding', async () => {
  const dir = await makeTmpDir();
  await seed(dir, {
    prdContent: prd({
      identityLines: 'identity: .aioson/context/identity.md\nidentity_status: project\n'
    }),
    manifestContent: manifest({ identity: '.aioson/context/identity.md' })
  });
  await writeFile(dir, '.aioson/context/identity.md', identityRecord({ scope: 'brand', slug: 'project' }));

  const r = await run(dir);

  assert.equal(r.ok, true);
  assert.equal(r.identity.status, 'project');
  assert.equal(r.identity.scope, 'brand');
});

test('identity — an explicit none contradicting the manifest fails', async () => {
  const dir = await makeTmpDir();
  await seed(dir, {
    prdContent: prd({ identityLines: 'identity: null\nidentity_status: none\n' }),
    manifestContent: manifest({ identity: `.aioson/briefings/${SLUG}/identity.md` })
  });
  await writeFile(dir, `.aioson/briefings/${SLUG}/identity.md`, identityRecord());

  const r = await run(dir);

  assert.equal(r.ok, false);
  assert.equal(r.reason, 'identity_binding_dropped');
});

test('identity — an explicit none with no upstream record is intent-first and passes', async () => {
  const dir = await makeTmpDir();
  await seed(dir, { prdContent: prd({ identityLines: 'identity: null\nidentity_status: none\n' }) });

  const r = await run(dir);

  assert.equal(r.ok, true);
  assert.equal(r.identity.status, 'none');
  assert.equal(r.identity.declared, true);
});

test('identity — an unknown status value fails', async () => {
  const dir = await makeTmpDir();
  await seed(dir, {
    prdContent: prd({
      identityLines: `identity: .aioson/briefings/${SLUG}/identity.md\nidentity_status: approved\n`
    })
  });
  await writeFile(dir, `.aioson/briefings/${SLUG}/identity.md`, identityRecord());

  const r = await run(dir);

  assert.equal(r.ok, false);
  assert.equal(r.reason, 'invalid_identity_status');
});

test('identity — strict warns (never fails) when a visual feature stays silent', async () => {
  const dir = await makeTmpDir();
  await seed(dir, { prdContent: prd() });

  const r = await run(dir, { strict: true });

  assert.equal(r.ok, true);
  assert.equal(r.status, 'warn');
  assert.equal(r.reason, 'identity_binding_undeclared');
});

test('identity — a feature without a prototype still carries its identity binding', async () => {
  const dir = await makeTmpDir();
  await seed(dir, {
    prdContent: prd({
      prototype: false,
      identityLines: `identity: .aioson/briefings/${SLUG}/identity.md\nidentity_status: current\n`
    }),
    prototype: false
  });
  await writeFile(dir, `.aioson/briefings/${SLUG}/identity.md`, identityRecord());

  const r = await run(dir);

  assert.equal(r.ok, true);
  assert.equal(r.status, 'not_applicable');
  assert.equal(r.identity.status, 'current');
  assert.equal(r.checks.identity_record_exists, true);
});
