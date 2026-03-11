'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { MANAGED_FILES } = require('../src/constants');
const {
  normalizeGenome,
  normalizeGenomeMeta,
  countGenomeSections
} = require('../src/genomes');
const {
  serializeGenomeMarkdown,
  parseGenomeMarkdown
} = require('../src/genome-format');
const {
  writeGenome,
  listGenomes,
  genomeExists
} = require('../src/genome-files');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-genomes-core-'));
}

function createGenomeFixture() {
  return normalizeGenome({
    domain: 'Growth Marketing',
    language: 'pt-BR',
    type: 'domain',
    depth: 'deep',
    evidenceMode: 'hybrid',
    sourceCount: 2,
    generated: '2026-03-10',
    sections: {
      knowledge: ['Crescimento exige canal, oferta e retenção trabalhando juntos.'],
      philosophies: ['Comece pela hipótese de alavanca, não pela lista infinita de táticas.'],
      mentalModels: ['Loops de aquisição e retenção se reforçam quando o produto entrega valor rápido.'],
      heuristics: ['Se não existe baseline, não existe otimização confiável.'],
      frameworks: ['Pirate funnel com foco em ativação e retenção.'],
      methodologies: ['Rodadas curtas de experimento com hipótese, métrica e decisão explícita.'],
      mentes: [
        '### O Estrategista\n- Cognitive signature: conecta posicionamento, canal e timing\n- Favourite question: "qual hipótese move o ponteiro agora?"\n- Blind spot: microdetalhes de execução'
      ],
      skills: ['- SKILL: hooks — abre mensagens com promessa clara e específica'],
      evidence: ['Benchmarks internos e leitura de comportamento observado.'],
      applicationNotes: ['Aplicar primeiro em squads de aquisição e conteúdo.']
    }
  });
}

test('normalizeGenome and countGenomeSections preserve genome v2 fields', () => {
  const genome = createGenomeFixture();
  const counts = countGenomeSections(genome);
  const meta = normalizeGenomeMeta({ genome });

  assert.equal(genome.slug, 'growth-marketing');
  assert.equal(genome.format, 'genome-v2');
  assert.equal(genome.evidenceMode, 'hybrid');
  assert.equal(counts.knowledgeNodes, 1);
  assert.equal(counts.mentes, 1);
  assert.equal(counts.skills, 1);
  assert.equal(meta.schemaVersion, 2);
  assert.equal(meta.counts.frameworks, 1);
  assert.equal(meta.sourceCount, 2);
});

test('serializeGenomeMarkdown writes canonical genome v2 sections', () => {
  const markdown = serializeGenomeMarkdown(createGenomeFixture());
  const parsed = parseGenomeMarkdown(markdown);

  assert.match(markdown, /^---/);
  assert.match(markdown, /format: genome-v2/);
  assert.match(markdown, /evidence_mode: hybrid/);
  assert.match(markdown, /sources_count: 2/);
  assert.match(markdown, /## Filosofias/);
  assert.match(markdown, /## Modelos mentais/);
  assert.match(markdown, /## Heurísticas/);
  assert.match(markdown, /## Evidence/);
  assert.match(markdown, /## Application notes/);
  assert.equal(parsed.legacyFormat, false);
  assert.equal(parsed.sections.methodologies.length, 1);
});

test('writeGenome persists markdown and meta files together', async () => {
  const dir = await makeTempDir();
  const genome = createGenomeFixture();
  const result = await writeGenome(dir, genome);

  const markdownPath = path.join(dir, '.aios-lite', 'genomas', 'growth-marketing.md');
  const metaPath = path.join(dir, '.aios-lite', 'genomas', 'growth-marketing.meta.json');
  const markdown = await fs.readFile(markdownPath, 'utf8');
  const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));

  assert.equal(result.genome.slug, 'growth-marketing');
  assert.equal(result.meta.schemaVersion, 2);
  assert.equal(await genomeExists(dir, 'growth-marketing'), true);
  assert.deepEqual(await listGenomes(dir), ['growth-marketing']);
  assert.match(markdown, /# Genome: Growth Marketing/);
  assert.equal(meta.compat.synthesizedFromLegacy, false);
});

test('managed files include genome schemas', () => {
  assert.equal(MANAGED_FILES.includes('.aios-lite/schemas/genome.schema.json'), true);
  assert.equal(MANAGED_FILES.includes('.aios-lite/schemas/genome-meta.schema.json'), true);
});
