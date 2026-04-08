'use strict';

const {
  GENOME_DEPTHS,
  GENOME_EVIDENCE_MODES,
  GENOME_FORMATS,
  GENOME_CONFIDENCE_LEVELS,
  GENOME_TYPES,
  GENOME_RELATION_TYPES,
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

function validateVersionField(input, key, errors) {
  if (!hasOwn(input, key)) return;
  const parsed = Number.parseInt(String(input[key] || ''), 10);
  if (parsed === 2 || parsed === 3) return;
  errors.push(`${key} must be 2 or 3`);
}

function validateFormatAndVersion(normalized, errors, versionKey = 'version', formatKey = 'format') {
  if (!GENOME_FORMATS.includes(normalized.format)) {
    errors.push(`${formatKey} must be one of: ${GENOME_FORMATS.join(', ')}`);
  }

  if (![2, 3].includes(normalized.version)) {
    errors.push(`${versionKey} must be 2 or 3`);
  }

  if (normalized.format === 'genome-v3' && normalized.version !== 3) {
    errors.push('format genome-v3 requires version 3');
  }

  if (normalized.version === 3 && normalized.format !== 'genome-v3') {
    errors.push('version 3 requires format genome-v3');
  }
}

function validatePersonaV3Requirements(normalized, sections, errors) {
  if (normalized.version < 3 || normalized.type !== 'persona') return;

  const requiredFields = [
    ['personaSource', normalized.personaSource],
    ['disc', normalized.disc],
    ['enneagram', normalized.enneagram],
    ['bigFive', normalized.bigFive],
    ['mbti', normalized.mbti],
    ['confidence', normalized.confidence],
    ['profilerReport', normalized.profilerReport]
  ];

  for (const [key, value] of requiredFields) {
    if (!String(value || '').trim()) {
      errors.push(`${key} is required for genome-v3 persona profiles`);
    }
  }

  for (const key of ['cognitiveProfile', 'communicationStyle', 'biases']) {
    if (!Array.isArray(sections[key]) || sections[key].length === 0) {
      errors.push(`sections.${key} must contain at least one entry for genome-v3 persona profiles`);
    }
  }

  // track 4.0 — optional, validate only if present
  if (normalized.hexacoH && !GENOME_CONFIDENCE_LEVELS.includes(normalized.hexacoH)) {
    errors.push(`hexaco_h must be one of: ${GENOME_CONFIDENCE_LEVELS.join(', ')}`);
  }
  if (Array.isArray(normalized.relations)) {
    for (const rel of normalized.relations) {
      if (rel.type && !GENOME_RELATION_TYPES.includes(rel.type)) {
        errors.push(`relations[].type must be one of: ${GENOME_RELATION_TYPES.join(', ')}`);
      }
    }
  }
}

function validateGenomeObject(input) {
  const genome = normalizeGenome(input);
  const errors = [];
  const sections = input && typeof input.sections === 'object' ? genome.sections : null;

  if (!genome.slug) errors.push('slug is required');
  if (!genome.domain) errors.push('domain is required');
  validateEnumField(input, 'type', GENOME_TYPES, errors);
  validateEnumField(input, 'depth', GENOME_DEPTHS, errors);
  validateEnumField(input, 'evidenceMode', GENOME_EVIDENCE_MODES, errors);
  validateEnumField(input, 'evidence_mode', GENOME_EVIDENCE_MODES, errors);
  validateEnumField(input, 'confidence', GENOME_CONFIDENCE_LEVELS, errors);
  validateVersionField(input, 'version', errors);
  if (hasOwn(input, 'format')) {
    const value = String(input.format || '').trim().toLowerCase();
    if (!GENOME_FORMATS.includes(value)) {
      errors.push(`format must be one of: ${GENOME_FORMATS.join(', ')}`);
    }
  }
  validateFormatAndVersion(genome, errors);

  if (!sections) {
    errors.push('sections must be an object');
  } else {
    for (const key of ['knowledge', 'mentes', 'skills', 'cognitiveProfile', 'communicationStyle', 'biases', 'conflictResolution']) {
      if (!Array.isArray(sections[key])) {
        errors.push(`sections.${key} must be an array`);
      }
    }
  }

  validatePersonaV3Requirements(genome, genome.sections, errors);

  return buildResult(errors, genome, 'genome');
}

function validateGenomeMeta(input) {
  const meta = normalizeGenomeMeta(input);
  const errors = [];

  if (!hasOwn(input, 'schemaVersion') || ![2, 3].includes(Number.parseInt(String(input.schemaVersion), 10))) {
    errors.push('schemaVersion must be 2 or 3');
  }
  validateVersionField(input, 'version', errors);
  if (hasOwn(input, 'format')) {
    const value = String(input.format || '').trim().toLowerCase();
    if (!GENOME_FORMATS.includes(value)) {
      errors.push(`format must be one of: ${GENOME_FORMATS.join(', ')}`);
    }
  }
  validateFormatAndVersion(meta, errors);
  if (!meta.slug) errors.push('slug is required');
  if (!meta.domain) errors.push('domain is required');
  validateEnumField(input, 'type', GENOME_TYPES, errors);
  validateEnumField(input, 'depth', GENOME_DEPTHS, errors);
  validateEnumField(input, 'evidenceMode', GENOME_EVIDENCE_MODES, errors);
  validateEnumField(input, 'evidence_mode', GENOME_EVIDENCE_MODES, errors);
  validateEnumField(input, 'confidence', GENOME_CONFIDENCE_LEVELS, errors);
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
        cognitiveProfile: Array(meta.counts.cognitiveProfile).fill('x'),
        communicationStyle: Array(meta.counts.communicationStyle).fill('x'),
        biases: Array(meta.counts.biases).fill('x'),
        traitInteractions: Array(meta.counts.traitInteractions || 0).fill('x'),
        conflictResolution: Array(meta.counts.conflictResolution).fill('x'),
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
  if (hasOwn(input, 'dependencies') && input.dependencies !== null && typeof input.dependencies === 'object') {
    if ('skills' in input.dependencies && !Array.isArray(input.dependencies.skills)) {
      errors.push('dependencies.skills must be an array of strings');
    }
    if ('genomes' in input.dependencies && !Array.isArray(input.dependencies.genomes)) {
      errors.push('dependencies.genomes must be an array of strings');
    }
  }
  validatePersonaV3Requirements(
    {
      version: meta.version,
      type: meta.type,
      personaSource: meta.personaSource,
      disc: meta.disc,
      enneagram: meta.enneagram,
      bigFive: meta.bigFive,
      mbti: meta.mbti,
      confidence: meta.confidence,
      profilerReport: meta.profilerReport
    },
    {
      cognitiveProfile: Array(meta.counts.cognitiveProfile).fill('x'),
      communicationStyle: Array(meta.counts.communicationStyle).fill('x'),
      biases: Array(meta.counts.biases).fill('x'),
      traitInteractions: Array(meta.counts.traitInteractions || 0).fill('x')
    },
    errors
  );

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
