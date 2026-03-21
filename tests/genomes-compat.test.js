'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  parseGenomeMarkdown,
  supportsLegacyGenomeMarkdown
} = require('../src/genome-format');
const { readGenome } = require('../src/genome-files');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-genomes-compat-'));
}

test('parseGenomeMarkdown supports legacy genome markdown', () => {
  const markdown = `---
genome: copywriting
domain: Copywriting
language: pt-BR
depth: standard
generated: 2026-03-10
mentes: 1
skills: 1
---

# Genome: Copywriting

## O que saber

Promessa, dor e clareza precisam aparecer juntas.

## Mentes

### O Estrategista
- Cognitive signature: pensa em posicionamento e ângulo
- Favourite question: "qual promessa move a audiência?"
- Blind spot: detalhes visuais

## Skills

- SKILL: hooks — cria ganchos com tensão e benefício`;

  const genome = parseGenomeMarkdown(markdown);

  assert.equal(genome.slug, 'copywriting');
  assert.equal(genome.legacyFormat, true);
  assert.equal(genome.sections.knowledge.length, 1);
  assert.equal(genome.sections.mentes.length, 1);
  assert.equal(genome.sections.skills.length, 1);
  assert.equal(supportsLegacyGenomeMarkdown(markdown), true);
});

test('parseGenomeMarkdown tolerates markdown without frontmatter', () => {
  const genome = parseGenomeMarkdown('# Storytelling BR\n\nHeurísticas para vídeos curtos.\n');

  assert.equal(genome.slug, 'storytelling-br');
  assert.equal(genome.domain, 'Storytelling BR');
  assert.equal(genome.legacyFormat, true);
  assert.equal(genome.sections.knowledge.length, 1);
});

test('readGenome synthesizes metadata when .meta.json does not exist', async () => {
  const dir = await makeTempDir();
  const genomeDir = path.join(dir, '.aioson', 'genomes');
  await fs.mkdir(genomeDir, { recursive: true });
  await fs.writeFile(
    path.join(genomeDir, 'copywriting.md'),
    `---
genome: copywriting
domain: Copywriting
language: pt-BR
depth: standard
generated: 2026-03-10
mentes: 1
skills: 1
---

# Genome: Copywriting

## O que saber

Promessa e clareza definem a leitura.

## Mentes

### O Estrategista
- Cognitive signature: busca vantagem narrativa
- Favourite question: "qual é a promessa?"
- Blind spot: acabamento visual

## Skills

- SKILL: hooks — abre textos com tensão`,
    'utf8'
  );

  const result = await readGenome(dir, 'copywriting');

  assert.equal(result.genome.slug, 'copywriting');
  assert.equal(result.meta.schemaVersion, 2);
  assert.equal(result.meta.compat.synthesizedFromLegacy, true);
  assert.equal(result.meta.counts.mentes, 1);
  assert.match(result.meta.createdAt, /^2026-03-10T/);
});

test('parseGenomeMarkdown preserves genome v3 persona fields and sections', () => {
  const markdown = `---
genome: naval-ravikant-leverage
domain: Naval Ravikant - Leverage
type: persona
language: pt-BR
depth: deep
version: 3
format: genome-v3
evidence_mode: evidenced
generated: 2026-03-13
sources_count: 8
mentes: 1
skills: 1
persona_source: Naval Ravikant
disc: DC
enneagram: 5w6
big_five: O:H C:M E:L A:L N:L
mbti: INTJ
confidence: medium
profiler_report: .aioson/profiler-reports/naval-ravikant/enriched-profile.md
---

# Genome: Naval Ravikant - Leverage

## O que saber

Leverage compounds through code and media.

## Filosofias

Play long-term games with long-term people.

## Modelos mentais

Look for asymmetric upside first.

## Heurísticas

Bound downside and keep upside open.

## Frameworks

Use leverage, accountability, and specific knowledge.

## Metodologias

Reduce choices to incentives and compounding.

## Mentes

### The Leverage Architect
- Cognitive signature: searches for asymmetry

## Skills

- SKILL: leverage-audit — scores ideas by asymmetry

## Perfil Cognitivo

DISC DC inferred from direct and analytical behavior.

## Estilo de Comunicação

Compressed, analytical, high-certainty communication.

## Vieses e Pontos Cegos

May overweight leverage over operational constraints.

## Evidence

Essays, interviews, and public posts.

## Application notes

Use in strategy and market selection.
`;

  const genome = parseGenomeMarkdown(markdown);

  assert.equal(genome.version, 3);
  assert.equal(genome.format, 'genome-v3');
  assert.equal(genome.personaSource, 'Naval Ravikant');
  assert.equal(genome.sections.cognitiveProfile.length, 1);
  assert.equal(genome.sections.communicationStyle.length, 1);
  assert.equal(genome.sections.biases.length, 1);
});

test('readGenome throws a clear error when metadata json is invalid', async () => {
  const dir = await makeTempDir();
  const genomeDir = path.join(dir, '.aioson', 'genomes');
  await fs.mkdir(genomeDir, { recursive: true });
  await fs.writeFile(path.join(genomeDir, 'storytelling-br.md'), '# Storytelling BR\n\nHeurísticas.\n', 'utf8');
  await fs.writeFile(path.join(genomeDir, 'storytelling-br.meta.json'), '{ invalid json', 'utf8');

  await assert.rejects(
    () => readGenome(dir, 'storytelling-br'),
    /Invalid genome meta JSON|Invalid genome meta|Unexpected token/
  );
});
