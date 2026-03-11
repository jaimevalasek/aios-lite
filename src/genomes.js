'use strict';

const GENOME_TYPES = ['domain', 'function', 'persona', 'hybrid'];
const GENOME_DEPTHS = ['surface', 'standard', 'deep'];
const GENOME_EVIDENCE_MODES = ['inferred', 'evidenced', 'hybrid'];
const GENOME_SECTION_KEYS = [
  'knowledge',
  'philosophies',
  'mentalModels',
  'heuristics',
  'frameworks',
  'methodologies',
  'mentes',
  'skills',
  'evidence',
  'applicationNotes'
];

function normalizeText(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function humanizeSlug(value) {
  return normalizeText(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return fallback;
  return allowed.includes(normalized) ? normalized : normalized;
}

function normalizeInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeIntegerPreservingInvalid(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return value;
  return parsed;
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
}

function normalizeTimestamp(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const timestamp = new Date(text);
  if (Number.isNaN(timestamp.getTime())) return '';
  return timestamp.toISOString();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

function formatMenteBlock(value) {
  if (!value || typeof value !== 'object') return '';
  const name = normalizeText(value.name || value.title);
  const lines = [];

  if (name) lines.push(`### ${name}`);

  const cognitiveSignature = normalizeText(value.cognitiveSignature || value.signature);
  const favouriteQuestion = normalizeText(value.favouriteQuestion || value.question);
  const blindSpot = normalizeText(value.blindSpot);
  const notes = normalizeText(value.notes || value.body || value.description);

  if (cognitiveSignature) lines.push(`- Cognitive signature: ${cognitiveSignature}`);
  if (favouriteQuestion) lines.push(`- Favourite question: ${favouriteQuestion}`);
  if (blindSpot) lines.push(`- Blind spot: ${blindSpot}`);
  if (notes) lines.push(notes);

  return lines.join('\n').trim();
}

function formatSkillBlock(value) {
  if (!value || typeof value !== 'object') return '';
  const name = normalizeText(value.name || value.slug || value.title);
  const description = normalizeText(value.description || value.summary || value.body);

  if (name && description) return `- SKILL: ${name} — ${description}`;
  if (name) return `- SKILL: ${name}`;
  return description;
}

function formatGenericBlock(value) {
  if (!value || typeof value !== 'object') return '';
  const markdown = normalizeText(value.markdown);
  if (markdown) return markdown;

  const title = normalizeText(value.title || value.name);
  const body = normalizeText(value.body || value.description || value.notes);
  if (title && body) return `### ${title}\n${body}`;
  if (title) return title;
  return body;
}

function normalizeSectionEntries(sectionKey, value) {
  const source = Array.isArray(value)
    ? value
    : value === undefined || value === null || value === ''
      ? []
      : [value];

  return source
    .map((entry) => {
      if (typeof entry === 'string') return normalizeText(entry);
      if (sectionKey === 'mentes') return formatMenteBlock(entry);
      if (sectionKey === 'skills') return formatSkillBlock(entry);
      return formatGenericBlock(entry);
    })
    .filter(Boolean);
}

function createEmptyGenome() {
  return {
    slug: '',
    domain: '',
    type: 'domain',
    language: 'en',
    depth: 'standard',
    version: 2,
    format: 'genome-v2',
    evidenceMode: 'inferred',
    sourceCount: 0,
    generated: '',
    legacyFormat: false,
    hasFrontmatter: false,
    sections: {
      knowledge: [],
      philosophies: [],
      mentalModels: [],
      heuristics: [],
      frameworks: [],
      methodologies: [],
      mentes: [],
      skills: [],
      evidence: [],
      applicationNotes: []
    }
  };
}

function normalizeGenome(input = {}) {
  const genome = createEmptyGenome();
  const merged = {
    ...genome,
    ...input,
    sections: {
      ...genome.sections,
      ...(input.sections || {})
    }
  };

  const domain = normalizeText(merged.domain || merged.title || merged.name);
  const slug = slugify(merged.slug || merged.genome || domain);

  const sections = {};
  for (const key of GENOME_SECTION_KEYS) {
    sections[key] = normalizeSectionEntries(key, merged.sections[key]);
  }

  return {
    ...merged,
    slug,
    domain: domain || humanizeSlug(slug),
    type: normalizeEnum(merged.type, GENOME_TYPES, 'domain'),
    language: normalizeText(merged.language, 'en') || 'en',
    depth: normalizeEnum(merged.depth, GENOME_DEPTHS, 'standard'),
    version: 2,
    format: 'genome-v2',
    evidenceMode: normalizeEnum(
      merged.evidenceMode || merged.evidence_mode,
      GENOME_EVIDENCE_MODES,
      'inferred'
    ),
    sourceCount: normalizeInteger(
      merged.sourceCount ?? merged.sourcesCount ?? merged.sources_count,
      0
    ),
    generated: normalizeDate(merged.generated),
    legacyFormat: Boolean(merged.legacyFormat),
    hasFrontmatter: Boolean(merged.hasFrontmatter),
    sections
  };
}

function countGenomeSections(input = {}) {
  const genome = normalizeGenome(input);
  return {
    knowledgeNodes: genome.sections.knowledge.length,
    philosophies: genome.sections.philosophies.length,
    mentalModels: genome.sections.mentalModels.length,
    heuristics: genome.sections.heuristics.length,
    frameworks: genome.sections.frameworks.length,
    methodologies: genome.sections.methodologies.length,
    mentes: genome.sections.mentes.length,
    skills: genome.sections.skills.length,
    evidence: genome.sections.evidence.length,
    applicationNotes: genome.sections.applicationNotes.length
  };
}

function normalizeCounts(value = {}) {
  return {
    knowledgeNodes: normalizeInteger(value.knowledgeNodes, 0),
    philosophies: normalizeInteger(value.philosophies, 0),
    mentalModels: normalizeInteger(value.mentalModels, 0),
    heuristics: normalizeInteger(value.heuristics, 0),
    frameworks: normalizeInteger(value.frameworks, 0),
    methodologies: normalizeInteger(value.methodologies, 0),
    mentes: normalizeInteger(value.mentes, 0),
    skills: normalizeInteger(value.skills, 0),
    evidence: normalizeInteger(value.evidence, 0),
    applicationNotes: normalizeInteger(value.applicationNotes, 0)
  };
}

function timestampFromGenome(genome) {
  const explicit = normalizeTimestamp(genome && genome.generated);
  if (explicit) return explicit;
  const generated = normalizeDate(genome && genome.generated);
  if (generated) {
    const synthesized = normalizeTimestamp(`${generated}T00:00:00.000Z`);
    if (synthesized) return synthesized;
  }
  return new Date().toISOString();
}

function normalizeGenomeMeta(input = {}) {
  const genome = input.genome ? normalizeGenome(input.genome) : null;
  const genomeCounts = genome ? countGenomeSections(genome) : normalizeCounts({});
  const counts = normalizeCounts({
    ...genomeCounts,
    ...(input.counts || {})
  });
  const createdAt = normalizeTimestamp(input.createdAt) || timestampFromGenome(genome || input);
  const updatedAt = normalizeTimestamp(input.updatedAt) || createdAt;

  return {
    schemaVersion: normalizeIntegerPreservingInvalid(input.schemaVersion, 2),
    format: normalizeText(input.format, 'genome-v2') || 'genome-v2',
    slug: slugify(input.slug || (genome && genome.slug)),
    domain: normalizeText(input.domain || (genome && genome.domain)) || humanizeSlug(input.slug || (genome && genome.slug)),
    type: normalizeEnum(input.type || (genome && genome.type), GENOME_TYPES, 'domain'),
    language: normalizeText(input.language || (genome && genome.language), 'en') || 'en',
    depth: normalizeEnum(input.depth || (genome && genome.depth), GENOME_DEPTHS, 'standard'),
    evidenceMode: normalizeEnum(
      input.evidenceMode || input.evidence_mode || (genome && genome.evidenceMode),
      GENOME_EVIDENCE_MODES,
      'inferred'
    ),
    sourceCount: normalizeInteger(
      input.sourceCount ??
        input.sourcesCount ??
        input.sources_count ??
        (genome && genome.sourceCount),
      0
    ),
    counts,
    origin: {
      mode: normalizeText(input.origin && input.origin.mode, 'llm') || 'llm',
      sourceFiles: normalizeStringArray(input.origin && input.origin.sourceFiles),
      sourceUrls: normalizeStringArray(input.origin && input.origin.sourceUrls)
    },
    compat: {
      legacyMarkdownCompatible:
        input.compat && Object.prototype.hasOwnProperty.call(input.compat, 'legacyMarkdownCompatible')
          ? Boolean(input.compat.legacyMarkdownCompatible)
          : true,
      synthesizedFromLegacy:
        input.compat && Object.prototype.hasOwnProperty.call(input.compat, 'synthesizedFromLegacy')
          ? Boolean(input.compat.synthesizedFromLegacy)
          : false
    },
    bindings: {
      squads: normalizeStringArray(input.bindings && input.bindings.squads),
      agents: normalizeStringArray(input.bindings && input.bindings.agents)
    },
    createdAt,
    updatedAt
  };
}

function isGenomeV2(genome) {
  if (!genome || typeof genome !== 'object') return false;
  if (genome.legacyFormat) return false;
  const format = normalizeText(genome.format).toLowerCase();
  const version = Number.parseInt(String(genome.version || ''), 10);
  return format === 'genome-v2' || version >= 2;
}

function synthesizeMetaFromLegacy(genome, input = {}) {
  const normalizedGenome = normalizeGenome({
    ...genome,
    legacyFormat: true
  });

  return normalizeGenomeMeta({
    ...input,
    genome: normalizedGenome,
    compat: {
      ...(input.compat || {}),
      legacyMarkdownCompatible: true,
      synthesizedFromLegacy: true
    },
    createdAt: input.createdAt || timestampFromGenome(normalizedGenome),
    updatedAt: input.updatedAt || timestampFromGenome(normalizedGenome)
  });
}

module.exports = {
  GENOME_TYPES,
  GENOME_DEPTHS,
  GENOME_EVIDENCE_MODES,
  GENOME_SECTION_KEYS,
  createEmptyGenome,
  normalizeGenome,
  normalizeGenomeMeta,
  isGenomeV2,
  synthesizeMetaFromLegacy,
  countGenomeSections
};
