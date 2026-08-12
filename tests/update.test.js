'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { installTemplate } = require('../src/installer');
const { createTranslator } = require('../src/i18n');
const { runUpdate } = require('../src/commands/update');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-update-'));
}

async function readRepoTemplate(relPath) {
  return fs.readFile(path.resolve(__dirname, '..', 'template', relPath), 'utf8');
}

// Every real (non-dry-run) runUpdate below passes 'no-hooks': true — the
// default hooks install would otherwise write machine-global AI tool settings
// during the test run.
function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

test('update reapplies canonical prompts from project context language', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  const contextContent = `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "MICRO"
interaction_language: "es"
conversation_language: "es"
aioson_version: "0.1.8"
---

# Project Context
`;
  await fs.writeFile(contextPath, contextContent, 'utf8');

  const { t } = createTranslator('en');
  const logger = createQuietLogger();
  const result = await runUpdate({
    args: [dir],
    options: { 'no-hooks': true },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(Boolean(result.localeSync), true);
  assert.equal(result.localeSync.locale, 'es');
  assert.equal(result.localeSync.promptLocale, 'en');
  assert.equal(
    await fs.readFile(path.join(dir, '.aioson/agents/setup.md'), 'utf8'),
    await readRepoTemplate('.aioson/agents/setup.md')
  );
});

test('update honors explicit --lang override for canonical prompt synchronization', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  const contextContent = `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "MICRO"
interaction_language: "es"
conversation_language: "es"
aioson_version: "0.1.9"
---

# Project Context
`;
  await fs.writeFile(contextPath, contextContent, 'utf8');

  const { t } = createTranslator('en');
  const logger = createQuietLogger();
  const result = await runUpdate({
    args: [dir],
    options: { lang: 'fr', 'no-hooks': true },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(Boolean(result.localeSync), true);
  assert.equal(result.localeSync.locale, 'fr');
  assert.equal(result.localeSync.promptLocale, 'en');
  assert.equal(
    await fs.readFile(path.join(dir, '.aioson/agents/setup.md'), 'utf8'),
    await readRepoTemplate('.aioson/agents/setup.md')
  );
});

test('update --dry-run with --lang plans locale sync without mutating files', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  const contextContent = `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "MICRO"
interaction_language: "en"
conversation_language: "en"
aioson_version: "0.1.9"
---

# Project Context
`;
  await fs.writeFile(contextPath, contextContent, 'utf8');

  const setupPath = path.join(dir, '.aioson/agents/setup.md');
  const before = await fs.readFile(setupPath, 'utf8');

  const { t } = createTranslator('en');
  const logger = createQuietLogger();
  const result = await runUpdate({
    args: [dir],
    options: { 'dry-run': true, lang: 'pt-BR' },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(Boolean(result.localeSync), true);
  assert.equal(result.localeSync.locale, 'pt-BR');
  assert.equal(result.localeSync.promptLocale, 'en');
  assert.equal(result.localeSync.dryRun, true);

  const after = await fs.readFile(setupPath, 'utf8');
  assert.equal(after, before);
});

test('update default brings new template files into projects on older versions', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  await fs.writeFile(contextPath, `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "MICRO"
interaction_language: "en"
conversation_language: "en"
aioson_version: "1.8.0"
---

# Project Context
`, 'utf8');

  // Simulate a project that was installed on an older release that did not
  // yet ship briefing.md (the cypher → briefing rebrand in 0d40a4b).
  const briefingAgent = path.join(dir, '.aioson/agents/briefing.md');
  const briefingCmd = path.join(dir, '.claude/commands/aioson/agent/briefing.md');
  await fs.unlink(briefingAgent);
  await fs.unlink(briefingCmd);

  const { t } = createTranslator('en');
  const result = await runUpdate({
    args: [dir],
    options: { 'no-hooks': true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(await fileExists(briefingAgent), true, 'briefing agent prompt must be restored by default update');
  assert.equal(await fileExists(briefingCmd), true, 'briefing slash command must be restored by default update');
});

test('update --selective preserves the legacy conservative mode (new files are skipped)', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const contextPath = path.join(dir, '.aioson/context/project.context.md');
  await fs.writeFile(contextPath, `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "MICRO"
interaction_language: "en"
conversation_language: "en"
aioson_version: "1.8.0"
---

# Project Context
`, 'utf8');

  const briefingAgent = path.join(dir, '.aioson/agents/briefing.md');
  await fs.unlink(briefingAgent);

  const { t } = createTranslator('en');
  const result = await runUpdate({
    args: [dir],
    options: { selective: true, 'no-hooks': true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(await fileExists(briefingAgent), false, 'selective update must preserve legacy skip behavior for absent files');
});

test('update refreshes framework integration docs and preserves project-owned integration docs', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const officialRel = '.aioson/docs/integrations/dashboard-app-form-publish-mapping.md';
  const officialPath = path.join(dir, officialRel);
  const projectOwnedPath = path.join(dir, '.aioson/docs/integrations/project-owned-connector.md');
  const projectOwnedContent = '# Project connector\n\nKeep this local integration note.\n';

  await fs.writeFile(officialPath, '# Old framework integration doc\n', 'utf8');
  await fs.writeFile(projectOwnedPath, projectOwnedContent, 'utf8');

  const { t } = createTranslator('en');
  const result = await runUpdate({
    args: [dir],
    options: { 'no-hooks': true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(await fs.readFile(officialPath, 'utf8'), await readRepoTemplate(officialRel));
  assert.equal(await fs.readFile(projectOwnedPath, 'utf8'), projectOwnedContent);
  assert.equal(
    result.backedUp.some((file) => file.endsWith(officialRel)),
    true,
    'managed framework integration doc should be backed up before overwrite'
  );
});

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

// ─── Downgrade guard ─────────────────────────────────────────────────────────
// The template copy comes from the installed CLI's own bundle, so a stale
// global CLI running `update` on a newer project would mass-downgrade every
// managed file. install.json's template_version is the project side of the
// comparison.

async function stampTemplateVersion(dir, version) {
  const metaPath = path.join(dir, '.aioson/install.json');
  const data = JSON.parse(await fs.readFile(metaPath, 'utf8'));
  data.template_version = version;
  await fs.writeFile(metaPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

test('update blocks when the project template is newer than the CLI', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });
  await stampTemplateVersion(dir, '999.0.0');

  const { t } = createTranslator('en');
  await assert.rejects(
    () => runUpdate({ args: [dir], options: { 'no-hooks': true }, logger: createQuietLogger(), t }),
    (err) => {
      assert.match(err.message, /999\.0\.0/);
      assert.match(err.message, /--allow-downgrade/);
      return true;
    }
  );
});

test('update --allow-downgrade proceeds past the downgrade guard', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });
  await stampTemplateVersion(dir, '999.0.0');

  const { t } = createTranslator('en');
  const result = await runUpdate({
    args: [dir],
    options: { 'no-hooks': true, 'allow-downgrade': true },
    logger: createQuietLogger(),
    t
  });
  assert.equal(result.ok, true);
});

test('update proceeds when template_version is absent or unparseable', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });
  await stampTemplateVersion(dir, 'not-a-version');

  const { t } = createTranslator('en');
  const result = await runUpdate({
    args: [dir],
    options: { 'no-hooks': true },
    logger: createQuietLogger(),
    t
  });
  assert.equal(result.ok, true, 'unknown project version must not block the update');
});

test('install --force hits the same downgrade guard (no backups in install mode)', async () => {
  const { runInstall } = require('../src/commands/install');
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });
  await stampTemplateVersion(dir, '999.0.0');

  const { t } = createTranslator('en');
  await assert.rejects(
    () => runInstall({
      args: [dir],
      options: { force: true, 'no-hooks': true, 'no-interactive': true },
      logger: createQuietLogger(),
      t
    }),
    /--allow-downgrade/
  );

  // Without overwrite the guard stays out of the way — plain install on an
  // existing project only fills gaps and must keep working from any CLI.
  const result = await runInstall({
    args: [dir],
    options: { 'no-hooks': true, 'no-interactive': true },
    logger: createQuietLogger(),
    t
  });
  assert.ok(result, 'non-overwrite install proceeds');
});
