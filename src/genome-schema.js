'use strict';

const {
  GENOME_DEPTHS,
  GENOME_EVIDENCE_MODES,
  GENOME_TYPES,
  countGenomeSections,
  normalizeGenome,
  normalizeGenomeMeta
} = require('./genomes');

function buildResult(errors, payload, key) {
  return {
    valid: errors.length === 0,
    errors,
    [key]: payload
  };
}

function hasOwn(input, key) {
  return Boolean(input) && Object.prototype.hasOwnProperty.call(input, key);
}

function validateEnumField(input, key, allowedValues, errors) {
  if (!hasOwn(input, key)) return;
  const value = String(input[key] || '').trim().toLowerCase();
  if (!value || allowedValues.includes(value)) return;
  errors.push(`${key} must be one of: ${allowedValues.join(', ')}`);
}

function validateGenomeObject(input) {
  const genome = normalizeGenome(input);
  const errors = [];
  const sections = input && typeof input.sections === 'object' ? input.sections : null;

  if (!genome.slug) errors.push('slug is required');
  if (!genome.domain) errors.push('domain is required');
  validateEnumField(input, 'type', GENOME_TYPES, errors);
  validateEnumField(input, 'depth', GENOME_DEPTHS, errors);
  validateEnumField(input, 'evidenceMode', GENOME_EVIDENCE_MODES, errors);
  validateEnumField(input, 'evidence_mode', GENOME_EVIDENCE_MODES, errors);
  if (hasOwn(input, 'format') && String(input.format).trim() !== 'genome-v2') {
    errors.push('format must be genome-v2');
  }
  if (hasOwn(input, 'version') && Number.parseInt(String(input.version), 10) !== 2) {
    errors.push('version must be 2');
  }

  if (!sections) {
    errors.push('sections must be an object');
  } else {
    for (const key of ['knowledge', 'mentes', 'skills']) {
      if (!Array.isArray(sections[key])) {
        errors.push(`sections.${key} must be an array`);
      }
    }
  }

  return buildResult(errors, genome, 'genome');
}

function validateGenomeMeta(input) {
  const meta = normalizeGenomeMeta(input);
  const errors = [];

  if (!hasOwn(input, 'schemaVersion') || Number.parseInt(String(input.schemaVersion), 10) !== 2) {
    errors.push('schemaVersion must be 2');
  }
  if (hasOwn(input, 'format') && meta.format !== 'genome-v2') errors.push('format must be genome-v2');
  if (!meta.slug) errors.push('slug is required');
  if (!meta.domain) errors.push('domain is required');
  validateEnumField(input, 'type', GENOME_TYPES, errors);
  validateEnumField(input, 'depth', GENOME_DEPTHS, errors);
  validateEnumField(input, 'evidenceMode', GENOME_EVIDENCE_MODES, errors);
  validateEnumField(input, 'evidence_mode', GENOME_EVIDENCE_MODES, errors);
  if (!meta.counts || typeof meta.counts !== 'object') {
    errors.push('counts must be an object');
  } else {
    const counts = countGenomeSections({
      sections: {
        knowledge: Array(meta.counts.knowledgeNodes).fill('x'),
        philosophies: Array(meta.counts.philosophies).fill('x'),
        mentalModels: Array(meta.counts.mentalModels).fill('x'),
        heuristics: Array(meta.counts.heuristics).fill('x'),
        frameworks: Array(meta.counts.frameworks).fill('x'),
        methodologies: Array(meta.counts.methodologies).fill('x'),
        mentes: Array(meta.counts.mentes).fill('x'),
        skills: Array(meta.counts.skills).fill('x'),
        evidence: Array(meta.counts.evidence).fill('x'),
        applicationNotes: Array(meta.counts.applicationNotes).fill('x')
      }
    });
    for (const key of Object.keys(counts)) {
      if (counts[key] !== meta.counts[key]) {
        errors.push(`counts.${key} must be a non-negative integer`);
      }
    }
  }
  if (!meta.createdAt) errors.push('createdAt is required');
  if (!meta.updatedAt) errors.push('updatedAt is required');

  return buildResult(errors, meta, 'meta');
}

function assertValidGenome(input) {
  const result = validateGenomeObject(input);
  if (!result.valid) {
    throw new Error(`Invalid genome: ${result.errors.join('; ')}`);
  }
  return result.genome;
}

function assertValidGenomeMeta(input) {
  const result = validateGenomeMeta(input);
  if (!result.valid) {
    throw new Error(`Invalid genome meta: ${result.errors.join('; ')}`);
  }
  return result.meta;
}

module.exports = {
  validateGenomeObject,
  validateGenomeMeta,
  assertValidGenome,
  assertValidGenomeMeta
};
