'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateGenomeObject,
  validateGenomeMeta,
  assertValidGenome,
  assertValidGenomeMeta
} = require('../src/genome-schema');

function createValidGenome() {
  return {
    slug: 'copywriting',
    domain: 'Copywriting',
    type: 'domain',
    language: 'pt-BR',
    depth: 'standard',
    version: 2,
    format: 'genome-v2',
    evidenceMode: 'inferred',
    sections: {
      knowledge: ['Conhecimento central.'],
      philosophies: [],
      mentalModels: [],
      heuristics: [],
      frameworks: [],
      methodologies: [],
      mentes: ['### O Estrategista\n- Cognitive signature: pensa em narrativa'],
      skills: ['- SKILL: hooks — abre mensagens'],
      evidence: [],
      applicationNotes: []
    }
  };
}

function createValidMeta() {
  return {
    schemaVersion: 2,
    version: 2,
    format: 'genome-v2',
    slug: 'copywriting',
    domain: 'Copywriting',
    type: 'domain',
    language: 'pt-BR',
    depth: 'standard',
    evidenceMode: 'inferred',
    sourceCount: 0,
    counts: {
      knowledgeNodes: 1,
      philosophies: 0,
      mentalModels: 0,
      heuristics: 0,
      frameworks: 0,
      methodologies: 0,
      mentes: 1,
      skills: 1,
      evidence: 0,
      applicationNotes: 0
    },
    origin: {
      mode: 'llm',
      sourceFiles: [],
      sourceUrls: []
    },
    compat: {
      legacyMarkdownCompatible: true,
      synthesizedFromLegacy: false
    },
    bindings: {
      squads: [],
      agents: []
    },
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z'
  };
}

function createValidGenomeV3() {
  return {
    slug: 'naval-ravikant-leverage',
    domain: 'Naval Ravikant - Leverage',
    type: 'persona',
    language: 'pt-BR',
    depth: 'deep',
    version: 3,
    format: 'genome-v3',
    evidenceMode: 'evidenced',
    personaSource: 'Naval Ravikant',
    disc: 'DC',
    enneagram: '5w6',
    bigFive: 'O:H C:M E:L A:L N:L',
    mbti: 'INTJ',
    confidence: 'medium',
    profilerReport: '.aioson/profiler-reports/naval-ravikant/enriched-profile.md',
    sections: {
      knowledge: ['Leverage compounds through code and media.'],
      philosophies: ['Play long-term games with long-term people.'],
      mentalModels: ['Use leverage to decouple output from hours.'],
      heuristics: ['Bound downside, keep upside open.'],
      frameworks: ['Leverage + accountability + specific knowledge.'],
      methodologies: ['Reduce decisions to durable incentives.'],
      mentes: ['### The Leverage Architect\n- Cognitive signature: searches for asymmetry'],
      skills: ['- SKILL: leverage-audit — scores ideas by asymmetry'],
      cognitiveProfile: ['DISC DC inferred from direct and analytical behavior.'],
      communicationStyle: ['Compressed, analytical, high-certainty communication.'],
      biases: ['May overweight leverage over operational constraints.'],
      conflictResolution: [],
      evidence: ['Essays, interviews, and public posts.'],
      applicationNotes: ['Use in strategy and market selection.']
    }
  };
}

test('validateGenomeObject rejects invalid type', () => {
  const result = validateGenomeObject({
    ...createValidGenome(),
    type: 'nonsense'
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' | '), /type/i);
});

test('validateGenomeObject rejects invalid depth', () => {
  const result = validateGenomeObject({
    ...createValidGenome(),
    depth: 'extreme'
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' | '), /depth/i);
});

test('validateGenomeObject rejects invalid evidenceMode', () => {
  const result = validateGenomeObject({
    ...createValidGenome(),
    evidenceMode: 'guessed'
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' | '), /evidence/i);
});

test('assertValidGenome and assertValidGenomeMeta accept valid minimal objects', () => {
  assert.doesNotThrow(() => assertValidGenome(createValidGenome()));
  assert.doesNotThrow(() => assertValidGenomeMeta(createValidMeta()));
});

test('assertValidGenome accepts valid genome v3 persona objects', () => {
  assert.doesNotThrow(() => assertValidGenome(createValidGenomeV3()));
});

test('validateGenomeMeta rejects invalid schemaVersion', () => {
  const result = validateGenomeMeta({
    ...createValidMeta(),
    schemaVersion: 1
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' | '), /schemaVersion/i);
});

test('validateGenomeObject rejects incomplete genome v3 persona objects', () => {
  const result = validateGenomeObject({
    ...createValidGenomeV3(),
    personaSource: '',
    sections: {
      ...createValidGenomeV3().sections,
      cognitiveProfile: []
    }
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' | '), /personaSource|cognitiveProfile/i);
});
