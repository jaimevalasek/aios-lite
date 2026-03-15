'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const {
  runScanProject,
  resolveSummaryMode,
  resolveRequestedFolders,
  buildScanIndexMarkdown,
  buildPrompt
} = require('../src/commands/scan-project');

function createCollectLogger() {
  const lines = [];
  return {
    lines,
    log(line) {
      lines.push(String(line));
    },
    error(line) {
      lines.push(String(line));
    }
  };
}

test('scan:project requires --folder before scanning', async () => {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-scan-project-required-folder-'));
  const originalExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    await fs.writeFile(path.join(projectDir, 'package.json'), '{ "name": "demo" }\n', 'utf8');

    const { t } = createTranslator('pt-BR');
    const logger = createCollectLogger();
    const result = await runScanProject({
      args: [projectDir],
      options: {},
      logger,
      t
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'folder_required');
    assert.equal(
      logger.lines.some((line) => line.includes('Informe --folder=<pasta[,pasta2]>')),
      true
    );
  } finally {
    process.exitCode = originalExitCode;
    await fs.rm(projectDir, { recursive: true, force: true });
  }
});

test('scan:project explains missing provider API key with direct config guidance', async () => {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-scan-project-'));
  const originalExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    await fs.writeFile(
      path.join(projectDir, 'aioson-models.json'),
      `${JSON.stringify({
        preferred_scan_provider: 'deepseek',
        providers: {
          deepseek: {
            api_key: 'YOUR_DEEPSEEK_API_KEY',
            model: 'deepseek-chat',
            base_url: 'https://api.deepseek.com/v1'
          }
        }
      }, null, 2)}\n`,
      'utf8'
    );
    await fs.writeFile(path.join(projectDir, 'package.json'), '{ "name": "demo" }\n', 'utf8');
    await fs.mkdir(path.join(projectDir, 'src'));
    await fs.writeFile(path.join(projectDir, 'src', 'main.js'), 'console.log("demo");\n', 'utf8');

    const { t } = createTranslator('pt-BR');
    const logger = createCollectLogger();
    const result = await runScanProject({
      args: [projectDir],
      options: { 'with-llm': true, folder: 'src' },
      logger,
      t
    });

    assert.equal(result.ok, false);
    assert.equal(
      logger.lines.some((line) =>
        line.includes('A chave de API do provider "deepseek" ainda nao foi configurada em aioson-models.json')
      ),
      true
    );
    assert.equal(
      logger.lines.some((line) => line.includes('providers.deepseek.api_key')),
      true
    );
  } finally {
    process.exitCode = originalExitCode;
    await fs.rm(projectDir, { recursive: true, force: true });
  }
});

test('scan:project runs in local-only mode by default and writes folder-specific scan files', async () => {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-scan-project-local-'));
  const originalExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      `${JSON.stringify({
        name: 'demo-app',
        scripts: { dev: 'next dev' },
        dependencies: { next: '15.0.0', react: '19.0.0' }
      }, null, 2)}\n`,
      'utf8'
    );
    await fs.mkdir(path.join(projectDir, 'src', 'components'), { recursive: true });
    await fs.writeFile(path.join(projectDir, 'src', 'app.js'), 'console.log("hi");\n', 'utf8');
    await fs.writeFile(path.join(projectDir, 'src', 'components', 'button.js'), 'export const button = true;\n', 'utf8');
    await fs.mkdir(path.join(projectDir, '.aioson', 'agents'), { recursive: true });
    await fs.mkdir(path.join(projectDir, '.aioson', 'context'), { recursive: true });
    await fs.mkdir(path.join(projectDir, '.aioson', 'squads', 'custom-squad'), { recursive: true });
    await fs.mkdir(path.join(projectDir, '.aioson', 'genomas'), { recursive: true });
    await fs.writeFile(path.join(projectDir, '.aioson', 'agents', 'setup.md'), '# managed\n', 'utf8');
    await fs.writeFile(path.join(projectDir, '.aioson', 'squads', 'memory.md'), '# managed memory\n', 'utf8');
    await fs.writeFile(path.join(projectDir, '.aioson', 'context', 'discovery.md'), '# discovery\n', 'utf8');
    await fs.writeFile(
      path.join(projectDir, '.aioson', 'squads', 'custom-squad', 'squad.manifest.json'),
      '{ "slug": "custom-squad" }\n',
      'utf8'
    );
    await fs.writeFile(path.join(projectDir, '.aioson', 'genomas', 'demo.md'), '# demo genome\n', 'utf8');

    const { t } = createTranslator('pt-BR');
    const logger = createCollectLogger();
    const result = await runScanProject({
      args: [projectDir],
      options: { 'summary-mode': 'titles', folder: 'src' },
      logger,
      t
    });

    assert.equal(result.ok, true);
    assert.equal(result.llmRequested, false);
    assert.equal(result.summaryMode, 'titles');
    assert.deepEqual(result.requestedFolders, ['src']);
    assert.equal(result.discoveryPath, null);
    assert.equal(result.skeletonPath, null);
    assert.equal(logger.lines.some((line) => line.includes('scan local apenas')), true);

    const indexPath = path.join(projectDir, '.aioson/context/scan-index.md');
    const foldersPath = path.join(projectDir, '.aioson/context/scan-folders.md');
    const srcPath = path.join(projectDir, '.aioson/context/scan-src.md');
    const forgePath = path.join(projectDir, '.aioson/context/scan-aioson.md');
    const indexContent = await fs.readFile(indexPath, 'utf8');
    const foldersContent = await fs.readFile(foldersPath, 'utf8');
    const sourceContent = await fs.readFile(srcPath, 'utf8');
    const forgeContent = await fs.readFile(forgePath, 'utf8');

    assert.match(indexContent, /# Scan Index/);
    assert.match(indexContent, /scan-src\.md/);
    assert.match(indexContent, /### package\.json/);
    assert.doesNotMatch(indexContent, /- Summary:/);
    assert.match(foldersContent, /# Folder Map/);
    assert.match(foldersContent, /\|-- src\//);
    assert.match(foldersContent, /\.aioson\//);
    assert.doesNotMatch(foldersContent, /agents\//);
    assert.match(sourceContent, /# Folder Scan: src/);
    assert.match(sourceContent, /\|-- src\//);
    assert.match(sourceContent, /\|  \|-- components\//);
    assert.match(sourceContent, /button\.js/);
    assert.match(forgeContent, /# AIOSON Generated Map/);
    assert.match(forgeContent, /## Context Pages/);
    assert.match(forgeContent, /## Squads/);
    assert.match(forgeContent, /## Genomas/);
    assert.match(forgeContent, /\|-- \.aioson\/context\//);
    assert.match(forgeContent, /custom-squad\//);
    assert.match(forgeContent, /demo\.md/);
    assert.match(forgeContent, /discovery\.md/);
    assert.doesNotMatch(forgeContent, /agents\//);
    assert.doesNotMatch(forgeContent, /memory\.md/);
  } finally {
    process.exitCode = originalExitCode;
    await fs.rm(projectDir, { recursive: true, force: true });
  }
});

test('scan:project resolves summary mode and requested folders safely', () => {
  assert.equal(resolveSummaryMode(), 'summaries');
  assert.equal(resolveSummaryMode('titles'), 'titles');
  assert.equal(resolveSummaryMode('raw'), 'raw');
  assert.equal(resolveSummaryMode('SUMMARIES'), 'summaries');
  assert.equal(resolveSummaryMode('unknown'), 'summaries');

  assert.deepEqual(resolveRequestedFolders('src, app ,src'), ['src', 'app']);
  assert.deepEqual(resolveRequestedFolders(['src', 'app/components']), ['src', 'app/components']);
  assert.deepEqual(resolveRequestedFolders(), []);
});

test('scan:project builds a compact scan index with folder scans, optional summaries and sizes', () => {
  const markdownWithSummaries = buildScanIndexMarkdown({
    keyFiles: [{
      path: 'package.json',
      sizeBytes: 4096,
      title: 'demo package manifest',
      summary: 'Scripts: 3 | Dependencies: 7 | Framework clues: Next.js'
    }],
    topLevelStats: new Map([
      ['[root files]', { files: 1, sizeBytes: 4096 }],
      ['src', { files: 1, sizeBytes: 2048 }]
    ]),
    generatedAt: '2026-03-13T12:00:00Z',
    includeSummaries: true,
    foldersPath: '/tmp/project/.aioson/context/scan-folders.md',
    folderScans: [{
      folder: 'src',
      relativePath: '.aioson/context/scan-src.md',
      absolutePath: '/tmp/project/.aioson/context/scan-src.md'
    }],
    forgePath: '/tmp/project/.aioson/context/scan-aioson.md',
    forgeArtifactCount: 2
  });

  assert.match(markdownWithSummaries, /# Scan Index/);
  assert.match(markdownWithSummaries, /scan-folders\.md/);
  assert.match(markdownWithSummaries, /scan-src\.md/);
  assert.match(markdownWithSummaries, /Folder `src\/`: `\/tmp\/project\/\.aioson\/context\/scan-src\.md`/);
  assert.match(markdownWithSummaries, /AIOSON generated entries: 2/);
  assert.match(markdownWithSummaries, /\| src \| 1 \| 2\.00 KB \|/);
  assert.match(markdownWithSummaries, /### package\.json/);
  assert.match(markdownWithSummaries, /- Title: demo package manifest/);
  assert.match(markdownWithSummaries, /- Summary: Scripts: 3 \| Dependencies: 7 \| Framework clues: Next\.js/);
  assert.match(markdownWithSummaries, /- Approx size: 4\.00 KB/);

  const markdownTitlesOnly = buildScanIndexMarkdown({
    keyFiles: [{
      path: 'package.json',
      sizeBytes: 512,
      title: 'demo package manifest',
      summary: 'Should not appear'
    }],
    topLevelStats: new Map([['[root files]', { files: 1, sizeBytes: 512 }]]),
    generatedAt: '2026-03-13T12:00:00Z',
    includeSummaries: false,
    foldersPath: '/tmp/project/.aioson/context/scan-folders.md',
    folderScans: [{
      folder: 'app',
      relativePath: '.aioson/context/scan-app.md',
      absolutePath: '/tmp/project/.aioson/context/scan-app.md'
    }],
    forgePath: '/tmp/project/.aioson/context/scan-aioson.md',
    forgeArtifactCount: 0
  });

  assert.doesNotMatch(markdownTitlesOnly, /Should not appear/);
  assert.match(markdownTitlesOnly, /scan-app\.md/);
  assert.match(markdownTitlesOnly, /- Title: demo package manifest/);
});

test('scan:project prompt keeps raw file contents optional and includes requested folder scans', () => {
  const promptWithSummaries = buildPrompt({
    scanIndexMarkdown: '# Scan Index\n\n## Key files\n### package.json',
    folderMapMarkdown: '# Folder Map\n\n```text\nsrc/\n```',
    folderScans: [
      {
        folder: 'src',
        markdown: '# Folder Scan: src\n\n```text\nsrc/\n  app.js\n```'
      },
      {
        folder: 'app',
        markdown: '# Folder Scan: app\n\n```text\napp/\n  page.tsx\n```'
      }
    ],
    forgeMapMarkdown: '# AIOSON Generated Map\n\n## Squads\n```text\n.aioson/squads/\n```',
    keyContents: { 'package.json': '{ "name": "demo" }' },
    projectContext: 'framework: next',
    specContent: 'ship the MVP',
    summaryMode: 'summaries'
  });

  assert.match(promptWithSummaries, /## Scan Index/);
  assert.match(promptWithSummaries, /## Folder Map/);
  assert.match(promptWithSummaries, /## Folder Scan: src/);
  assert.match(promptWithSummaries, /## Folder Scan: app/);
  assert.match(promptWithSummaries, /## AIOSON Generated Map/);
  assert.doesNotMatch(promptWithSummaries, /## Key Files/);
  assert.match(promptWithSummaries, /## Project Context \(aioson\)/);
  assert.match(promptWithSummaries, /## Development Memory \(spec\.md\)/);

  const promptWithRaw = buildPrompt({
    scanIndexMarkdown: '# Scan Index\n\n## Key files\n### package.json',
    folderMapMarkdown: '# Folder Map\n\n```text\nsrc/\n```',
    folderScans: [{
      folder: 'src',
      markdown: '# Folder Scan: src\n\n```text\nsrc/\n  app.js\n```'
    }],
    forgeMapMarkdown: '# AIOSON Generated Map\n\n_No generated AIOSON artifacts detected yet_',
    keyContents: { 'package.json': '{ "name": "demo" }' },
    projectContext: '',
    specContent: '',
    summaryMode: 'raw'
  });

  assert.match(promptWithRaw, /## Key Files/);
  assert.match(promptWithRaw, /### package\.json/);
  assert.match(promptWithRaw, /\{ "name": "demo" \}/);
});

test('scan:project dry-run returns requested folder paths without writing files', async () => {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-scan-project-dry-run-'));
  const originalExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      `${JSON.stringify({
        name: 'demo-app',
        scripts: { dev: 'next dev' },
        dependencies: { next: '15.0.0', react: '19.0.0' }
      }, null, 2)}\n`,
      'utf8'
    );
    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'app'), { recursive: true });
    await fs.writeFile(path.join(projectDir, 'src', 'app.js'), 'console.log("hi");\n', 'utf8');
    await fs.writeFile(path.join(projectDir, 'app', 'page.tsx'), 'export default function Page() {}\n', 'utf8');

    const { t } = createTranslator('pt-BR');
    const logger = createCollectLogger();
    const result = await runScanProject({
      args: [projectDir],
      options: { 'dry-run': true, 'summary-mode': 'titles', folder: 'src,app' },
      logger,
      t
    });

    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
    assert.equal(result.summaryMode, 'titles');
    assert.equal(result.provider, null);
    assert.equal(result.model, null);
    assert.equal(result.llmRequested, false);
    assert.deepEqual(result.requestedFolders, ['src', 'app']);
    assert.equal(
      result.scanIndexPath,
      path.join(projectDir, '.aioson/context/scan-index.md')
    );
    assert.equal(
      result.scanFoldersPath,
      path.join(projectDir, '.aioson/context/scan-folders.md')
    );
    assert.deepEqual(result.scanFolderPaths, [
      path.join(projectDir, '.aioson/context/scan-src.md'),
      path.join(projectDir, '.aioson/context/scan-app.md')
    ]);
    assert.equal(
      result.scanForgePath,
      path.join(projectDir, '.aioson/context/scan-aioson.md')
    );
    assert.equal(
      logger.lines.some((line) => line.includes('nenhuma chamada LLM feita')),
      true
    );
    await assert.rejects(fs.access(result.scanIndexPath));
    await assert.rejects(fs.access(result.scanFoldersPath));
    await assert.rejects(fs.access(result.scanFolderPaths[0]));
    await assert.rejects(fs.access(result.scanFolderPaths[1]));
    await assert.rejects(fs.access(result.scanForgePath));
  } finally {
    process.exitCode = originalExitCode;
    await fs.rm(projectDir, { recursive: true, force: true });
  }
});
