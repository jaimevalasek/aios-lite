'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runSquadDoctor } = require('../src/commands/squad-doctor');
const { openRuntimeDb, startRun, upsertContentItem } = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-squad-doctor-'));
}

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

async function createSquadSkeleton(dir, slug) {
  const squadDir = path.join(dir, '.aioson', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(squadDir, 'docs'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', slug), { recursive: true });
  await fs.mkdir(path.join(dir, 'media', slug), { recursive: true });
  await fs.writeFile(path.join(dir, 'CLAUDE.md'), `# Workspace\n\n${slug}\n`, 'utf8');
  await fs.writeFile(path.join(dir, 'AGENTS.md'), `# Workspace\n\n${slug}\n`, 'utf8');

  await fs.writeFile(
    path.join(squadDir, 'squad.md'),
    `Squad: ${slug}\nMode: Squad\nGoal: Gerar conteudos\nAgents: .aioson/squads/${slug}/agents/\nOutput: output/${slug}/\nLogs: aios-logs/${slug}/\n`,
    'utf8'
  );
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Rules\n', 'utf8');
  await fs.writeFile(path.join(squadDir, 'docs', 'design-doc.md'), '# Design doc\n', 'utf8');
  await fs.writeFile(path.join(squadDir, 'docs', 'readiness.md'), '# Readiness\n', 'utf8');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orquestrador\n', 'utf8');
  await fs.writeFile(
    path.join(squadDir, 'squad.manifest.json'),
    JSON.stringify(
      {
        schemaVersion: '1.0.0',
        slug,
        name: 'Composicao Gospel',
        mode: 'content',
        mission: 'Gerar conteudos musicais',
        goal: 'Publicar letras e estruturas',
        rules: {
          outputsDir: `output/${slug}`,
          logsDir: `aios-logs/${slug}`,
          mediaDir: `media/${slug}`
        },
        skills: [
          {
            slug: 'coord',
            title: 'Coordenação'
          }
        ],
        executors: [
          {
            slug: 'orquestrador',
            title: 'Orquestrador',
            role: 'Coordena a squad',
            file: `.aioson/squads/${slug}/agents/orquestrador.md`,
            skills: ['coord']
          }
        ]
      },
      null,
      2
    ),
    'utf8'
  );
}

test('squad:doctor reports healthy squad when manifest and content index are consistent', async () => {
  const dir = await makeTempDir();
  const slug = 'composicao-gospel';
  await createSquadSkeleton(dir, slug);

  const runtime = await openRuntimeDb(dir);
  try {
    upsertContentItem(runtime.db, {
      contentKey: 'musica-01',
      squadSlug: slug,
      title: 'Musica 01',
      contentType: 'song',
      layoutType: 'document',
      payload: {
        contentKey: 'musica-01',
        title: 'Musica 01',
        contentType: 'song',
        layoutType: 'document',
        blocks: [{ type: 'rich-text', content: 'Verso 1\n\nRefrao' }]
      },
      jsonPath: `output/${slug}/musica-01/content.json`,
      htmlPath: `output/${slug}/musica-01/index.html`,
      createdByAgent: '@compositor'
    });
  } finally {
    runtime.db.close();
  }

  const { t } = createTranslator('pt-BR');
  const logger = createCollectLogger();
  const result = await runSquadDoctor({
    args: [dir],
    options: { squad: slug },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.failed, 0);
  assert.equal(result.summary.warned, 0);
});

test('squad:doctor warns about stale runs and output files pending indexing', async () => {
  const dir = await makeTempDir();
  const slug = 'composicao-gospel';
  await createSquadSkeleton(dir, slug);
  await fs.writeFile(path.join(dir, 'output', slug, 'letra-final.md'), '# Letra\n\nVerso 1', 'utf8');

  const runtime = await openRuntimeDb(dir);
  try {
    const runKey = startRun(runtime.db, {
      agentName: '@compositor',
      squadSlug: slug,
      title: 'Gerar letra'
    });
    runtime.db
      .prepare('UPDATE agent_runs SET updated_at = ? WHERE run_key = ?')
      .run('2020-01-01T00:00:00.000Z', runKey);
  } finally {
    runtime.db.close();
  }

  const { t } = createTranslator('pt-BR');
  const logger = createCollectLogger();
  const result = await runSquadDoctor({
    args: [dir],
    options: { squad: slug, 'stale-minutes': 5 },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.failed, 0);
  assert.equal(result.summary.warned >= 2, true);
  assert.equal(logger.lines.some((line) => line.includes('possivelmente travadas')), true);
  assert.equal(logger.lines.some((line) => line.includes('pendentes de indexacao')), true);
});
