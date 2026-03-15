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
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-genomes-core-'));
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

function createGenomeV3Fixture() {
  return normalizeGenome({
    domain: 'Naval Ravikant - Leverage',
    language: 'pt-BR',
    type: 'persona',
    depth: 'deep',
    version: 3,
    format: 'genome-v3',
    evidenceMode: 'evidenced',
    sourceCount: 8,
    generated: '2026-03-13',
    personaSource: 'Naval Ravikant',
    disc: 'DC',
    enneagram: '5w6',
    bigFive: 'O:H C:M E:L A:L N:L',
    mbti: 'INTJ',
    confidence: 'medium',
    profilerReport: '.aioson/profiler-reports/naval-ravikant/enriched-profile.md',
    sections: {
      knowledge: ['Leverage comes from code, media, capital, and specific knowledge.'],
      philosophies: ['Play long-term games with long-term people.'],
      mentalModels: ['Start by asking where leverage compounds asymmetrically.'],
      heuristics: ['If the upside scales and the downside is bounded, keep looking.'],
      frameworks: ['Assess opportunity through leverage, accountability, and compounding.'],
      methodologies: ['Distill complex markets into durable incentives and asymmetries.'],
      mentes: ['### The Leverage Architect\n- Cognitive signature: looks for asymmetric upside first'],
      skills: ['- SKILL: leverage-audit — evaluates work by scalability and compounding'],
      cognitiveProfile: ['DISC DC with high dominance and compliance, inferred from direct and analytical communication.'],
      communicationStyle: ['Analytical, compressed, aphoristic, and high-certainty.'],
      biases: ['Tends to overweight leverage and underestimate execution drag in early teams.'],
      conflictResolution: [],
      evidence: ['Podcast interviews, essays, and public threads from 2018-2025.'],
      applicationNotes: ['Best applied to strategic and market-selection decisions.']
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

test('normalizeGenome and serializeGenomeMarkdown preserve genome v3 persona fields', () => {
  const genome = createGenomeV3Fixture();
  const meta = normalizeGenomeMeta({ genome });
  const markdown = serializeGenomeMarkdown(genome);
  const parsed = parseGenomeMarkdown(markdown);

  assert.equal(genome.version, 3);
  assert.equal(genome.format, 'genome-v3');
  assert.equal(genome.personaSource, 'Naval Ravikant');
  assert.equal(genome.sections.cognitiveProfile.length, 1);
  assert.equal(meta.schemaVersion, 3);
  assert.equal(meta.version, 3);
  assert.equal(meta.format, 'genome-v3');
  assert.match(markdown, /format: genome-v3/);
  assert.match(markdown, /persona_source: Naval Ravikant/);
  assert.match(markdown, /## Perfil Cognitivo/);
  assert.match(markdown, /## Estilo de Comunicação/);
  assert.match(markdown, /## Vieses e Pontos Cegos/);
  assert.equal(parsed.version, 3);
  assert.equal(parsed.sections.communicationStyle.length, 1);
});

test('writeGenome persists markdown and meta files together', async () => {
  const dir = await makeTempDir();
  const genome = createGenomeFixture();
  const result = await writeGenome(dir, genome);

  const markdownPath = path.join(dir, '.aioson', 'genomas', 'growth-marketing.md');
  const metaPath = path.join(dir, '.aioson', 'genomas', 'growth-marketing.meta.json');
  const markdown = await fs.readFile(markdownPath, 'utf8');
  const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));

  assert.equal(result.genome.slug, 'growth-marketing');
  assert.equal(result.meta.schemaVersion, 2);
  assert.equal(await genomeExists(dir, 'growth-marketing'), true);
  assert.deepEqual(await listGenomes(dir), ['growth-marketing']);
  assert.match(markdown, /# Genome: Growth Marketing/);
  assert.equal(meta.compat.synthesizedFromLegacy, false);
});

test('writeGenome persists genome v3 persona metadata', async () => {
  const dir = await makeTempDir();
  const genome = createGenomeV3Fixture();
  const result = await writeGenome(dir, genome);

  const markdownPath = path.join(dir, '.aioson', 'genomas', 'naval-ravikant-leverage.md');
  const metaPath = path.join(dir, '.aioson', 'genomas', 'naval-ravikant-leverage.meta.json');
  const markdown = await fs.readFile(markdownPath, 'utf8');
  const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));

  assert.equal(result.genome.version, 3);
  assert.equal(result.meta.schemaVersion, 3);
  assert.equal(meta.version, 3);
  assert.equal(meta.format, 'genome-v3');
  assert.equal(meta.personaSource, 'Naval Ravikant');
  assert.match(markdown, /# Genome: Naval Ravikant - Leverage/);
});

test('managed files include genome schemas', () => {
  assert.equal(MANAGED_FILES.includes('.aioson/schemas/genome.schema.json'), true);
  assert.equal(MANAGED_FILES.includes('.aioson/schemas/genome-meta.schema.json'), true);
});
