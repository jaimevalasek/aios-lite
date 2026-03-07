'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const {
  runCloudImportSquad,
  runCloudImportGenome,
  runCloudPublishGenome,
  runCloudPublishSquad
} = require('../src/commands/cloud');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-cloud-command-'));
}

function createLogger() {
  return {
    lines: [],
    log(line) {
      this.lines.push(String(line));
    },
    error(line) {
      this.lines.push(String(line));
    }
  };
}

function createSnapshot() {
  return {
    kind: 'aioslite.squad',
    exportVersion: 1,
    squad: {
      id: 'sq_123',
      name: 'YouTube Creator',
      slug: 'youtube-creator',
      description: 'Squad para roteiros e assets.',
      goal: 'Criar conteudo de video.',
      visibility: 'FREE',
      status: 'PUBLISHED',
      ownerUsername: 'jaime',
      projectName: 'YT Lab'
    },
    version: {
      id: 'sv_123',
      versionNumber: '1.0.0',
      versionCode: 1,
      title: 'Initial release',
      summary: 'Primeiro snapshot',
      changeLog: null,
      compatibilityMin: '1.1.1',
      compatibilityMax: '1.x',
      schemaVersion: '1',
      sourceType: 'dashboard_publish',
      isCurrent: true,
      createdAt: new Date().toISOString(),
      manifestJson: null,
      agentsManifestJson: [
        {
          slug: 'orquestrador',
          name: 'Orquestrador',
          description: 'Coordena o squad',
          content: '# Orquestrador\n\nCoordene as tarefas do squad.'
        },
        {
          slug: 'roteirista-viral',
          name: 'Roteirista Viral',
          description: 'Cria roteiros fortes'
        }
      ],
      genomesManifestJson: null
    },
    appliedGenomes: [
      {
        scopeType: 'SQUAD',
        agentSlug: null,
        priority: 10,
        genome: {
          id: 'gn_123',
          name: 'Storytelling Retencao',
          slug: 'storytelling-retencao',
          visibility: 'FREE',
          status: 'PUBLISHED',
          sourceKind: 'AIOSLITE'
        },
        version: {
          id: 'gv_123',
          versionNumber: '1.0.0',
          versionCode: 1,
          title: 'Initial',
          summary: 'Heuristicas iniciais',
          schemaVersion: '1',
          contentMarkdown: '# O que saber\n\n- Gancho\n- Retencao',
          manifestJson: null,
          createdAt: new Date().toISOString()
        }
      },
      {
        scopeType: 'AGENT',
        agentSlug: 'roteirista-viral',
        priority: 20,
        genome: {
          id: 'gn_456',
          name: 'Copy CTR',
          slug: 'copy-ctr',
          visibility: 'PRIVATE',
          status: 'PUBLISHED',
          sourceKind: 'LOCAL'
        },
        version: {
          id: 'gv_456',
          versionNumber: '1.1.0',
          versionCode: 2,
          title: 'Refined',
          summary: 'CTR refinado',
          schemaVersion: '1',
          contentMarkdown: '# Skills\n\n- Titulos\n- Hooks',
          manifestJson: null,
          createdAt: new Date().toISOString()
        }
      }
    ]
  };
}

function createGenomeSnapshot() {
  return {
    kind: 'aioslite.genome',
    exportVersion: 1,
    genome: {
      id: 'gn_cloud_1',
      name: 'Storytelling BR',
      slug: 'storytelling-br',
      description: 'Genoma para storytelling em portugues.',
      visibility: 'FREE',
      status: 'PUBLISHED',
      sourceKind: 'AIOSLITE',
      ownerUsername: 'jaime'
    },
    version: {
      id: 'gv_cloud_1',
      versionNumber: '2.0.0',
      versionCode: 2,
      title: 'Refined',
      summary: 'Heuristicas refinadas',
      schemaVersion: '1',
      isCurrent: true,
      createdAt: new Date().toISOString(),
      contentMarkdown: '# O que saber\n\n- Ritmo\n- Gancho\n- Retencao',
      manifestJson: null
    }
  };
}

function createDataUrl(payload) {
  return `data:application/json,${encodeURIComponent(JSON.stringify(payload))}`;
}

test('cloud:import:squad imports snapshot into .aios-lite/cloud-imports', async () => {
  const projectDir = await makeTempDir();
  const logger = createLogger();
  const { t } = createTranslator('pt-BR');
  const snapshot = createSnapshot();
  const url = createDataUrl(snapshot);

  const result = await runCloudImportSquad({
    args: [projectDir],
    options: { url },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.slug, 'youtube-creator');
  assert.equal(result.versionNumber, '1.0.0');

  const importedRaw = await fs.readFile(result.latestFile, 'utf8');
  const imported = JSON.parse(importedRaw);
  assert.equal(imported.kind, 'aioslite.squad');
  assert.equal(imported.squad.slug, 'youtube-creator');
  assert.equal(imported.version.versionNumber, '1.0.0');

  const metadataRaw = await fs.readFile(path.join(projectDir, '.aios-lite', 'squads', 'youtube-creator.md'), 'utf8');
  assert.match(metadataRaw, /Mode: CloudImport/);
  assert.match(metadataRaw, /Agents: agents\/youtube-creator\//);
  assert.match(metadataRaw, /storytelling-retencao\.md/);
  assert.match(metadataRaw, /roteirista-viral: \.aios-lite\/genomas\/copy-ctr\.md/);

  const orchestratorRaw = await fs.readFile(
    path.join(projectDir, 'agents', 'youtube-creator', 'orquestrador.md'),
    'utf8'
  );
  assert.match(orchestratorRaw, /Coordene as tarefas do squad/);

  const stubRaw = await fs.readFile(
    path.join(projectDir, 'agents', 'youtube-creator', 'roteirista-viral.md'),
    'utf8'
  );
  assert.match(stubRaw, /Imported from AIOS Lite Cloud/);
  assert.match(stubRaw, /The cloud snapshot did not include a full prompt body/);

  const genomeRaw = await fs.readFile(
    path.join(projectDir, '.aios-lite', 'genomas', 'storytelling-retencao.md'),
    'utf8'
  );
  assert.match(genomeRaw, /# O que saber/);
});

test('cloud:import:squad --dry-run validates remote snapshot without writing files', async () => {
  const projectDir = await makeTempDir();
  const logger = createLogger();
  const { t } = createTranslator('en');
  const snapshot = createSnapshot();
  const url = createDataUrl(snapshot);

  const result = await runCloudImportSquad({
    args: [projectDir],
    options: { url, 'dry-run': true },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  const importDir = path.join(projectDir, '.aios-lite', 'cloud-imports', 'squads', 'youtube-creator');
  const stat = await fs.stat(importDir).catch(() => null);
  assert.equal(stat, null);
});

test('cloud:import:genome imports snapshot into .aios-lite/cloud-imports and materializes local genome', async () => {
  const projectDir = await makeTempDir();
  const logger = createLogger();
  const { t } = createTranslator('pt-BR');
  const snapshot = createGenomeSnapshot();
  const url = createDataUrl(snapshot);

  const result = await runCloudImportGenome({
    args: [projectDir],
    options: { url },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.resource, 'genome');
  assert.equal(result.slug, 'storytelling-br');
  assert.equal(result.versionNumber, '2.0.0');

  const importedRaw = await fs.readFile(result.latestFile, 'utf8');
  const imported = JSON.parse(importedRaw);
  assert.equal(imported.kind, 'aioslite.genome');
  assert.equal(imported.genome.slug, 'storytelling-br');

  const genomeRaw = await fs.readFile(
    path.join(projectDir, '.aios-lite', 'genomas', 'storytelling-br.md'),
    'utf8'
  );
  assert.match(genomeRaw, /# O que saber/);

  const manifestRaw = await fs.readFile(
    path.join(projectDir, '.aios-lite', 'cloud-imports', 'installed', 'genomes', 'storytelling-br', 'manifest.json'),
    'utf8'
  );
  const manifest = JSON.parse(manifestRaw);
  assert.equal(manifest.kind, 'aioslite.local-installed-genome');
  assert.equal(manifest.version.versionNumber, '2.0.0');
});

test('cloud:import:genome --dry-run validates remote snapshot without writing files', async () => {
  const projectDir = await makeTempDir();
  const logger = createLogger();
  const { t } = createTranslator('en');
  const snapshot = createGenomeSnapshot();
  const url = createDataUrl(snapshot);

  const result = await runCloudImportGenome({
    args: [projectDir],
    options: { url, 'dry-run': true },
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  const importDir = path.join(projectDir, '.aios-lite', 'cloud-imports', 'genomes', 'storytelling-br');
  const stat = await fs.stat(importDir).catch(() => null);
  assert.equal(stat, null);
});

test('cloud:publish:genome posts local genome snapshot to cloud endpoint', async () => {
  const projectDir = await makeTempDir();
  const logger = createLogger();
  const { t } = createTranslator('en');
  const genomePath = path.join(projectDir, '.aios-lite', 'genomas', 'storytelling-br.md');
  await fs.mkdir(path.dirname(genomePath), { recursive: true });
  await fs.writeFile(genomePath, '# Storytelling BR\n\nHeuristicas para videos.\n', 'utf8');

  const result = await runCloudPublishGenome({
    args: [projectDir],
    options: {
      slug: 'storytelling-br',
      'resource-version': '2.0.0',
      url: 'https://example.com/api/publish/genomes'
    },
    logger,
    t,
    dependencies: {
      fetchImpl: async (_url, request) => ({
        ok: true,
        text: async () =>
          JSON.stringify({
            ok: true,
            resource: 'genome',
            received: JSON.parse(request.body)
          })
      })
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.resource, 'genome');
  assert.equal(result.response.resource, 'genome');
  assert.equal(result.response.received.genome.slug, 'storytelling-br');
  assert.equal(result.response.received.version.versionNumber, '2.0.0');
});

test('cloud:publish:squad posts local squad snapshot to cloud endpoint', async () => {
  const projectDir = await makeTempDir();
  const logger = createLogger();
  const { t } = createTranslator('pt-BR');

  await fs.mkdir(path.join(projectDir, '.aios-lite', 'squads'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.aios-lite', 'genomas'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'agents', 'youtube-creator'), { recursive: true });

  await fs.writeFile(
    path.join(projectDir, '.aios-lite', 'squads', 'youtube-creator.md'),
    [
      'Squad: YouTube Creator',
      'Goal: Criar roteiros e assets',
      'Agents: agents/youtube-creator/',
      'Output: output/youtube-creator/',
      'Logs: aios-logs/youtube-creator/',
      '',
      'Genomes:',
      '- .aios-lite/genomas/storytelling-retencao.md',
      '',
      'AgentGenomes:',
      '- roteirista-viral: .aios-lite/genomas/copy-ctr.md',
      ''
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(
    path.join(projectDir, 'agents', 'youtube-creator', 'orquestrador.md'),
    '# Orquestrador\n\nCoordena o squad.\n',
    'utf8'
  );
  await fs.writeFile(
    path.join(projectDir, 'agents', 'youtube-creator', 'roteirista-viral.md'),
    '# Roteirista Viral\n\nCria roteiros fortes.\n',
    'utf8'
  );
  await fs.writeFile(
    path.join(projectDir, '.aios-lite', 'genomas', 'storytelling-retencao.md'),
    '# Storytelling Retencao\n\nGancho e retencao.\n',
    'utf8'
  );
  await fs.writeFile(
    path.join(projectDir, '.aios-lite', 'genomas', 'copy-ctr.md'),
    '# Copy CTR\n\nTitulos com CTR.\n',
    'utf8'
  );

  const result = await runCloudPublishSquad({
    args: [projectDir],
    options: {
      slug: 'youtube-creator',
      'resource-version': '1.0.0',
      url: 'https://example.com/api/publish/squads'
    },
    logger,
    t,
    dependencies: {
      fetchImpl: async (_url, request) => ({
        ok: true,
        text: async () =>
          JSON.stringify({
            ok: true,
            resource: 'squad',
            received: JSON.parse(request.body)
          })
      })
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.resource, 'squad');
  assert.equal(result.agentCount, 2);
  assert.equal(result.genomeCount, 2);
  assert.equal(result.response.received.squad.slug, 'youtube-creator');
  assert.equal(result.response.received.version.versionNumber, '1.0.0');
  assert.equal(result.response.received.version.agentsManifestJson.length, 2);
  assert.equal(result.response.received.appliedGenomes.length, 2);
});
