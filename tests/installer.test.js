'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { installTemplate, detectExistingInstall } = require('../src/installer');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-installer-'));
}

test('installTemplate creates base installation', async () => {
  const dir = await makeTempDir();
  const result = await installTemplate(dir, { mode: 'install' });

  assert.equal(result.copied.length > 0, true);
  assert.equal(await detectExistingInstall(dir), true);
  assert.equal(await fileExists(path.join(dir, 'CLAUDE.md')), true);
  assert.equal(await fileExists(path.join(dir, '.aioson/config.md')), true);
  assert.equal(await fileExists(path.join(dir, '.aioson/context/.gitkeep')), true);
  assert.equal(await fileExists(path.join(dir, '.aioson/runtime/aios.sqlite')), true);
  assert.equal(result.runtime && result.runtime.dbPath.endsWith(path.join('.aioson', 'runtime', 'aios.sqlite')), true);
});

test('update mode creates backups for managed files', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const target = path.join(dir, 'AGENTS.md');
  await fs.writeFile(target, '# custom\n', 'utf8');

  const result = await installTemplate(dir, {
    mode: 'update',
    overwrite: true,
    backupOnOverwrite: true
  });

  assert.equal(result.backedUp.length > 0, true);

  const backupsDir = path.join(dir, '.aioson/backups');
  assert.equal(await fileExists(backupsDir), true);
});

test('context folder is preserved during update', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const contextFile = path.join(dir, '.aioson/context/project.context.md');
  const customContext = 'custom-context';
  await fs.writeFile(contextFile, customContext, 'utf8');

  await installTemplate(dir, {
    mode: 'update',
    overwrite: true,
    backupOnOverwrite: true
  });

  const readBack = await fs.readFile(contextFile, 'utf8');
  assert.equal(readBack, customContext);
});

test('project-local models config is preserved during update', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });

  const configPath = path.join(dir, 'aioson-models.json');
  const customConfig = `${JSON.stringify({
    preferred_scan_provider: 'deepseek',
    providers: {
      deepseek: {
        api_key: 'sk-custom',
        model: 'deepseek-chat',
        base_url: 'https://api.deepseek.com/v1'
      }
    }
  }, null, 2)}\n`;
  await fs.writeFile(configPath, customConfig, 'utf8');

  await installTemplate(dir, {
    mode: 'update',
    overwrite: true,
    backupOnOverwrite: true
  });

  const readBack = await fs.readFile(configPath, 'utf8');
  assert.equal(readBack, customConfig);
});

test('installTemplate writes Forge metadata and gitignore entry', async () => {
  const dir = await makeTempDir();

  await installTemplate(dir, { mode: 'install' });

  const installMeta = JSON.parse(
    await fs.readFile(path.join(dir, '.aioson', 'install.json'), 'utf8')
  );
  const gitignore = await fs.readFile(path.join(dir, '.gitignore'), 'utf8');

  assert.equal(installMeta.managed_by, 'aioson');
  assert.equal(typeof installMeta.template_version, 'string');
  assert.equal(gitignore.includes('aioson-models.json'), true);
  assert.equal(gitignore.includes('!AGENTS.md'), true);
  assert.equal(gitignore.includes('!.claude/**'), true);
  assert.equal(gitignore.includes('!.gemini/**'), true);
  assert.equal(gitignore.includes('!.aioson/**'), true);
  assert.equal(gitignore.includes('.aioson/runtime/'), true);
  assert.equal(gitignore.includes('.aioson/cloud-imports/'), true);
  assert.equal(gitignore.includes('.aioson/mcp/servers.local.json'), true);
});

test('installTemplate appends keep rules for shared AIOS files even when project already ignores broad folders', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(
    path.join(dir, '.gitignore'),
    '.aioson/\n.claude/\n.gemini/\nAGENTS.md\nCLAUDE.md\nOPENCODE.md\n',
    'utf8'
  );

  await installTemplate(dir, { mode: 'install' });

  const gitignore = await fs.readFile(path.join(dir, '.gitignore'), 'utf8');
  assert.equal(gitignore.includes('.aioson/\n'), true);
  assert.equal(gitignore.includes('!.aioson/**'), true);
  assert.equal(gitignore.includes('!.claude/**'), true);
  assert.equal(gitignore.includes('!.gemini/**'), true);
  assert.equal(gitignore.includes('!AGENTS.md'), true);
  assert.equal(gitignore.includes('!CLAUDE.md'), true);
  assert.equal(gitignore.includes('!OPENCODE.md'), true);
});

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
