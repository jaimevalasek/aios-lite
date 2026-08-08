'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  SOURCE_PACK_MODULE,
  SQL_SOURCE_MODULE,
  discoverBriefingSourcePacks,
  inspectBriefingSourcePack
} = require('../src/lib/briefing-source-pack');
const { validateSourceLineage } = require('../src/lib/feature-source-lineage');

const ROOT = path.resolve(__dirname, '..');

async function makeProject(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-briefing-sources-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'plans'), { recursive: true });
  return root;
}

async function write(root, relativePath, content) {
  const absolute = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content);
}

async function listFiles(root) {
  const files = [];
  async function walk(current, relative) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path.join(current, entry.name), rel);
      else if (entry.isFile()) files.push(rel.replace(/\\/g, '/'));
    }
  }
  await walk(root, '');
  return files.sort();
}

function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'bin', 'aioson.js'), ...args], { cwd: ROOT });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('discovers SQL-only and mixed directory packs without requiring Markdown', async (t) => {
  const root = await makeProject(t);
  await write(root, 'plans/legacy-billing/schema.sql', `
CREATE TABLE accounts (
  id BIGINT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE
);
`);
  await write(root, 'plans/legacy-billing/20260101_add_orders.sql', `
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id)
);
ALTER TABLE accounts ADD COLUMN status VARCHAR(20) NOT NULL;
`);
  await write(root, 'plans/mixed-system/notes.txt', 'Rebuild the supplied billing system for internal operators.\n');
  await write(root, 'plans/mixed-system/schema.sql', 'CREATE TABLE invoices (id INTEGER PRIMARY KEY);\n');
  await write(root, 'plans/mixed-system/openapi.yaml', 'openapi: 3.1.0\ninfo:\n  title: Billing\n  version: 1.0.0\n');
  await write(root, 'plans/mixed-system/payment-example.json', '{"status":"paid"}\n');
  await write(root, 'plans/loose-legacy.md', '# Legacy loose source\n');
  await write(root, 'plans/done/retired-system/schema.sql', 'CREATE TABLE retired (id INTEGER);\n');

  const result = await discoverBriefingSourcePacks(root);
  assert.equal(result.ok, true);
  assert.deepEqual(result.packs.map((pack) => pack.slug), ['legacy-billing', 'mixed-system']);
  assert.equal(result.packs.find((pack) => pack.slug === 'legacy-billing').has_sql, true);
  assert.equal(result.packs.find((pack) => pack.slug === 'legacy-billing').mixed, false);
  assert.equal(result.packs.find((pack) => pack.slug === 'mixed-system').mixed, true);
  assert.deepEqual(result.loose_files.map((file) => file.path), ['plans/loose-legacy.md']);
  assert.deepEqual(result.ignored_directories, ['plans/done']);
});

test('logically organizes an unstructured mixed pack without moving user files', async (t) => {
  const root = await makeProject(t);
  await write(root, 'plans/rebuild-system/notes.txt', 'Create a replacement for the supplied system.\n');
  await write(root, 'plans/rebuild-system/schema.sql', `
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  email TEXT NOT NULL UNIQUE
);
`);
  await write(root, 'plans/rebuild-system/002_add_projects.sql', `
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id)
);
`);
  await write(root, 'plans/rebuild-system/openapi.yaml', 'openapi: 3.1.0\n');
  await write(root, 'plans/rebuild-system/sample-payload.json', '{"project_id":42}\n');
  await write(root, 'plans/rebuild-system/domain-glossary', 'Project: a unit of work owned by one user.\n');

  const before = await listFiles(path.join(root, 'plans', 'rebuild-system'));
  const result = await inspectBriefingSourcePack(root, 'rebuild-system');
  const after = await listFiles(path.join(root, 'plans', 'rebuild-system'));

  assert.equal(result.ok, true);
  assert.equal(result.source_policy, 'read_only');
  assert.equal(result.organization_policy, 'logical_only');
  assert.deepEqual(before, after, 'inspection must not reorganize physical sources');
  assert.deepEqual(result.load_modules, [SOURCE_PACK_MODULE, SQL_SOURCE_MODULE]);
  assert.equal(result.needs_intent_question, false);
  assert.deepEqual(result.migration_order, ['plans/rebuild-system/002_add_projects.sql']);

  const schema = result.files.find((file) => file.path.endsWith('/schema.sql'));
  const migration = result.files.find((file) => file.path.endsWith('/002_add_projects.sql'));
  const notes = result.files.find((file) => file.path.endsWith('/notes.txt'));
  const openapi = result.files.find((file) => file.path.endsWith('/openapi.yaml'));
  const sample = result.files.find((file) => file.path.endsWith('/sample-payload.json'));
  const glossary = result.files.find((file) => file.path.endsWith('/domain-glossary'));
  assert.equal(schema.kind, 'sql_schema');
  assert.equal(schema.role, 'current_state');
  assert.ok(schema.sql.objects.includes('users'));
  assert.match(schema.fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(migration.kind, 'sql_migration');
  assert.equal(migration.migration_order, 1);
  assert.equal(notes.role, 'intent');
  assert.equal(openapi.role, 'contract');
  assert.equal(sample.role, 'example');
  assert.equal(glossary.kind, 'text_source');
  assert.equal(glossary.load_policy, 'read');
});

test('keeps unsafe data and binary sources in the inventory but blocks their content', async (t) => {
  const root = await makeProject(t);
  await write(root, 'plans/sensitive-pack/schema.sql', 'CREATE TABLE users (id INTEGER PRIMARY KEY);\n');
  await write(root, 'plans/sensitive-pack/dump.sql', "INSERT INTO users (id) VALUES (1);\n");
  await write(root, 'plans/sensitive-pack/procedures.sql', `
CREATE PROCEDURE close_account()
BEGIN
  UPDATE users SET status = 'closed';
END;
`);
  await write(root, 'plans/sensitive-pack/.env', 'DATABASE_URL=redacted-placeholder\n');
  await write(root, 'plans/sensitive-pack/database.sqlite', Buffer.from([0, 1, 2, 3]));

  const result = await inspectBriefingSourcePack(root, 'sensitive-pack');
  assert.equal(result.ok, true);
  assert.equal(result.needs_intent_question, true);
  const dump = result.files.find((file) => file.path.endsWith('/dump.sql'));
  const env = result.files.find((file) => file.path.endsWith('/.env'));
  const database = result.files.find((file) => file.path.endsWith('/database.sqlite'));
  const procedures = result.files.find((file) => file.path.endsWith('/procedures.sql'));
  assert.equal(dump.kind, 'sql_data');
  assert.equal(dump.load_policy, 'metadata_only');
  assert.ok(dump.warnings.includes('sql_contains_data_statements'));
  assert.equal(env.load_policy, 'blocked');
  assert.equal(database.load_policy, 'blocked');
  assert.equal(procedures.kind, 'sql_source');
  assert.equal(procedures.load_policy, 'read');
  assert.ok(result.warnings.includes('blocked_sources_present'));
  assert.ok(result.warnings.includes('sql_data_requires_safe_handling'));
});

test('briefing:sources dispatches through the CLI with clean JSON output', async (t) => {
  const root = await makeProject(t);
  await write(root, 'plans/sql-blueprint/schema.sql', 'CREATE TABLE teams (id INTEGER PRIMARY KEY);\n');

  const cli = await runCli([
    'briefing:sources',
    root,
    '--slug=sql-blueprint',
    '--json',
    '--locale=pt-BR'
  ]);
  assert.equal(cli.code, 0, cli.stderr);
  assert.equal(cli.stderr, '');
  const result = JSON.parse(cli.stdout);
  assert.equal(result.ok, true);
  assert.equal(result.slug, 'sql-blueprint');
  assert.equal(result.has_sql, true);
  assert.equal(result.files[0].kind, 'sql_schema');
  assert.ok(result.load_modules.includes(SQL_SOURCE_MODULE));
});

test('source lineage includes SQL and auxiliary files from the shared collector', async (t) => {
  const root = await makeProject(t);
  const sources = [
    ['plans/source-lineage/schema.sql', 'CREATE TABLE tasks (id INTEGER PRIMARY KEY);\n'],
    ['plans/source-lineage/context.txt', 'Tasks are managed by project members.\n']
  ];
  for (const [relativePath, content] of sources) await write(root, relativePath, content);
  const inventoryRows = sources.map(([relativePath, content], index) => {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `| SRC-00${index + 1} | ${relativePath} | sha256:${hash} | Consulted source |`;
  }).join('\n');
  const briefing = `---
source_plans: ["plans/source-lineage/schema.sql", "plans/source-lineage/context.txt"]
---

### Source Inventory
| Source | Path | Fingerprint | Purpose |
|---|---|---|---|
${inventoryRows}

### Source Promise Map
| Promise | Source | Approved intent | State |
|---|---|---|---|
| PROM-source-lineage-01 | SRC-001, SRC-002 | Preserve task ownership | required |
`;
  const result = await validateSourceLineage({
    targetDir: root,
    slug: 'source-lineage',
    briefing,
    prd: '',
    productMap: { allCaps: [] },
    acceptance: { rows: [] },
    lifecycle: {}
  });
  assert.equal(
    result.findings.some((finding) => finding.check === 'source_plan_not_in_inventory'),
    false,
    JSON.stringify(result.findings)
  );
  assert.deepEqual(result.inventory.map((item) => item.path), sources.map(([relativePath]) => relativePath));
});
