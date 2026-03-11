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

test('validateGenomeMeta rejects invalid schemaVersion', () => {
  const result = validateGenomeMeta({
    ...createValidMeta(),
    schemaVersion: 1
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' | '), /schemaVersion/i);
});
