'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runParallelInit } = require('../src/commands/parallel-init');
const { runParallelAssign, extractScopesFromContent } = require('../src/commands/parallel-assign');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-parallel-assign-'));
}

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

async function writeContext(dir, classification = 'MEDIUM') {
  const contextPath = path.join(dir, '.aios-lite/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "${classification}"
conversation_language: "en"
aios_lite_version: "0.1.9"
---

# Project Context
`,
    'utf8'
  );
}

async function writeArchitecture(dir) {
  const filePath = path.join(dir, '.aios-lite/context/architecture.md');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    `# Architecture

## Auth Module
## Billing Module
## Notification Pipeline
## Admin Dashboard
`,
    'utf8'
  );
}

test('extractScopesFromContent prioritizes headings', () => {
  const content = `# Doc\n\n## API Gateway\n## Event Worker\n`;
  const result = extractScopesFromContent(content);
  assert.equal(result.method, 'headings');
  assert.deepEqual(result.scopes, ['API Gateway', 'Event Worker']);
});

test('parallel:assign distributes scopes across lane files', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await writeArchitecture(dir);

  await runParallelInit({
    args: [dir],
    options: { workers: 3 },
    logger: createQuietLogger(),
    t
  });

  const result = await runParallelAssign({
    args: [dir],
    options: { workers: 3, source: 'architecture' },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.scopeCount, 4);
  assert.equal(result.assignments.length, 3);

  const lane1 = await fs.readFile(
    path.join(dir, '.aios-lite/context/parallel/agent-1.status.md'),
    'utf8'
  );
  const lane2 = await fs.readFile(
    path.join(dir, '.aios-lite/context/parallel/agent-2.status.md'),
    'utf8'
  );
  const lane3 = await fs.readFile(
    path.join(dir, '.aios-lite/context/parallel/agent-3.status.md'),
    'utf8'
  );

  assert.equal(lane1.includes('- Auth Module'), true);
  assert.equal(lane1.includes('- Admin Dashboard'), true);
  assert.equal(lane2.includes('- Billing Module'), true);
  assert.equal(lane3.includes('- Notification Pipeline'), true);
});

test('parallel:assign dry-run does not mutate lane files', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await writeArchitecture(dir);

  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const lanePath = path.join(dir, '.aios-lite/context/parallel/agent-1.status.md');
  const before = await fs.readFile(lanePath, 'utf8');

  const result = await runParallelAssign({
    args: [dir],
    options: { workers: 2, source: 'architecture', 'dry-run': true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  const after = await fs.readFile(lanePath, 'utf8');
  assert.equal(after, before);
});

test('parallel:assign fails when parallel directory is missing', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await writeArchitecture(dir);

  await assert.rejects(
    runParallelAssign({
      args: [dir],
      options: { source: 'architecture' },
      logger: createQuietLogger(),
      t
    }),
    /Parallel directory not found/
  );
});
