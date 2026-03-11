'use strict';

const {
  GENOME_SECTION_KEYS,
  countGenomeSections,
  normalizeGenome
} = require('./genomes');

const SECTION_ORDER = [
  ['knowledge', 'O que saber'],
  ['philosophies', 'Filosofias'],
  ['mentalModels', 'Modelos mentais'],
  ['heuristics', 'Heurísticas'],
  ['frameworks', 'Frameworks'],
  ['methodologies', 'Metodologias'],
  ['mentes', 'Mentes'],
  ['skills', 'Skills'],
  ['evidence', 'Evidence'],
  ['applicationNotes', 'Application notes']
];

const SECTION_ALIASES = new Map([
  ['o que saber', 'knowledge'],
  ['what to know', 'knowledge'],
  ['filosofias', 'philosophies'],
  ['philosophies', 'philosophies'],
  ['modelos mentais', 'mentalModels'],
  ['mental models', 'mentalModels'],
  ['heuristicas', 'heuristics'],
  ['heuristics', 'heuristics'],
  ['frameworks', 'frameworks'],
  ['metodologias', 'methodologies'],
  ['methodologies', 'methodologies'],
  ['mentes', 'mentes'],
  ['minds', 'mentes'],
  ['skills', 'skills'],
  ['habilidades', 'skills'],
  ['evidence', 'evidence'],
  ['evidencias', 'evidence'],
  ['application notes', 'applicationNotes'],
  ['notas de aplicacao', 'applicationNotes']
]);

function stripBOM(value) {
  return String(value || '').replace(/^\uFEFF/, '');
}

function normalizeHeading(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseScalar(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function extractFrontmatter(markdown) {
  const text = stripBOM(markdown);
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return {
      attributes: {},
      body: text,
      hasFrontmatter: false
    };
  }

  const lines = text.split(/\r?\n/);
  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex === -1) {
    throw new Error('Invalid genome markdown: unclosed frontmatter block.');
  }

  const attributes = {};
  for (let index = 1; index < closingIndex; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) {
      throw new Error(`Invalid genome frontmatter line: ${line}`);
    }

    attributes[match[1]] = parseScalar(match[2]);
  }

  return {
    attributes,
    body: lines.slice(closingIndex + 1).join('\n'),
    hasFrontmatter: true
  };
}

function splitParagraphBlocks(text) {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  let current = [];

  function pushCurrent() {
    if (current.length === 0) return;
    const block = current.join('\n').trim();
    if (block) blocks.push(block);
    current = [];
  }

  for (const line of lines) {
    if (!line.trim()) {
      pushCurrent();
      continue;
    }
    current.push(line);
  }

  pushCurrent();
  return blocks;
}

function splitSubheadingBlocks(text) {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  let current = [];

  function pushCurrent() {
    if (current.length === 0) return;
    const block = current.join('\n').trim();
    if (block) blocks.push(block);
    current = [];
  }

  for (const line of lines) {
    if (/^###\s+/.test(line.trim())) {
      pushCurrent();
      current = [line];
      continue;
    }

    if (!line.trim() && current.length === 0) continue;
    current.push(line);
  }

  pushCurrent();
  return blocks;
}

function splitListBlocks(text) {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  let current = [];

  function pushCurrent() {
    if (current.length === 0) return;
    const block = current.join('\n').trim();
    if (block) blocks.push(block);
    current = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const isListStart = /^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed);

    if (isListStart) {
      pushCurrent();
      current = [line];
      continue;
    }

    if (!trimmed && current.length === 0) continue;
    current.push(line);
  }

  pushCurrent();
  return blocks;
}

function emptySections() {
  return {
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
  };
}

function materializeSection(sectionKey, content) {
  if (!content.trim()) return [];
  if (sectionKey === 'mentes') {
    const blocks = splitSubheadingBlocks(content);
    return blocks.length > 0 ? blocks : splitParagraphBlocks(content);
  }
  if (sectionKey === 'skills') {
    const blocks = splitListBlocks(content);
    return blocks.length > 0 ? blocks : splitParagraphBlocks(content);
  }
  return splitParagraphBlocks(content);
}

function parseGenomeSections(markdown) {
  const sections = emptySections();
  const lines = String(markdown || '').split(/\r?\n/);
  let currentSection = null;
  let buffer = [];

  function flush() {
    if (!currentSection) {
      buffer = [];
      return;
    }
    sections[currentSection] = materializeSection(currentSection, buffer.join('\n'));
    buffer = [];
  }

  for (const line of lines) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) {
      flush();
      currentSection = SECTION_ALIASES.get(normalizeHeading(match[1])) || null;
      continue;
    }

    if (!currentSection) continue;
    buffer.push(line);
  }

  flush();
  return sections;
}

function extractTitle(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (!match) continue;
    return match[1]
      .replace(/^(Genome|Genoma)\s*:\s*/i, '')
      .trim();
  }
  return '';
}

function bodyWithoutTitle(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const output = [];
  let titleSkipped = false;

  for (const line of lines) {
    if (!titleSkipped && /^#\s+/.test(line.trim())) {
      titleSkipped = true;
      continue;
    }
    output.push(line);
  }

  return output.join('\n').trim();
}

function hasNewSectionContent(sections) {
  const keys = GENOME_SECTION_KEYS.filter((key) => !['knowledge', 'mentes', 'skills'].includes(key));
  return keys.some((key) => Array.isArray(sections[key]) && sections[key].length > 0);
}

function parseGenomeMarkdown(markdown) {
  const extracted = extractFrontmatter(markdown);
  const title = extractTitle(extracted.body);
  const sections = parseGenomeSections(extracted.body);
  const counts = countGenomeSections({ sections });
  const hasSectionContent = Object.values(counts).some((count) => count > 0);
  const fallbackKnowledge = !hasSectionContent ? splitParagraphBlocks(bodyWithoutTitle(extracted.body)) : [];
  const frontmatter = extracted.attributes;

  const detectedV2 =
    Number.parseInt(String(frontmatter.version || ''), 10) >= 2 ||
    String(frontmatter.format || '').trim().toLowerCase() === 'genome-v2' ||
    Boolean(frontmatter.type) ||
    Boolean(frontmatter.evidence_mode) ||
    Boolean(frontmatter.sources_count) ||
    hasNewSectionContent(sections);

  const genome = normalizeGenome({
    slug: frontmatter.genome || frontmatter.slug,
    domain: frontmatter.domain || title,
    type: frontmatter.type,
    language: frontmatter.language,
    depth: frontmatter.depth,
    evidenceMode: frontmatter.evidence_mode || frontmatter.evidenceMode,
    sourceCount: frontmatter.sources_count ?? frontmatter.sourceCount,
    generated: frontmatter.generated,
    hasFrontmatter: extracted.hasFrontmatter,
    legacyFormat: !detectedV2,
    sections: hasSectionContent
      ? sections
      : {
          ...sections,
          knowledge: fallbackKnowledge
        }
  });

  return genome;
}

function formatFrontmatterValue(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const text = String(value || '').replace(/\r?\n/g, ' ').trim();
  if (!text) return '""';
  if (/[:#]/.test(text)) return JSON.stringify(text);
  return text;
}

function renderSectionEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return '';
  return entries.map((entry) => String(entry || '').trim()).filter(Boolean).join('\n\n');
}

function serializeGenomeMarkdown(input) {
  const genome = normalizeGenome(input);
  const counts = countGenomeSections(genome);
  const generated = genome.generated || new Date().toISOString().slice(0, 10);
  const frontmatter = [
    '---',
    `genome: ${formatFrontmatterValue(genome.slug)}`,
    `domain: ${formatFrontmatterValue(genome.domain)}`,
    `type: ${formatFrontmatterValue(genome.type)}`,
    `language: ${formatFrontmatterValue(genome.language)}`,
    `depth: ${formatFrontmatterValue(genome.depth)}`,
    'version: 2',
    'format: genome-v2',
    `evidence_mode: ${formatFrontmatterValue(genome.evidenceMode)}`,
    `generated: ${formatFrontmatterValue(generated)}`,
    `sources_count: ${formatFrontmatterValue(genome.sourceCount)}`,
    `mentes: ${formatFrontmatterValue(counts.mentes)}`,
    `skills: ${formatFrontmatterValue(counts.skills)}`,
    '---'
  ];

  const parts = [
    frontmatter.join('\n'),
    `# Genome: ${genome.domain}`
  ];

  for (const [key, heading] of SECTION_ORDER) {
    const body = renderSectionEntries(genome.sections[key]);
    parts.push(body ? `## ${heading}\n\n${body}` : `## ${heading}`);
  }

  return `${parts.join('\n\n')}\n`;
}

function supportsLegacyGenomeMarkdown(markdown) {
  const genome = parseGenomeMarkdown(markdown);
  if (!genome.legacyFormat) return false;
  const counts = countGenomeSections(genome);
  return counts.knowledgeNodes > 0 || counts.mentes > 0 || counts.skills > 0 || Boolean(genome.domain);
}

module.exports = {
  SECTION_ORDER,
  extractFrontmatter,
  parseGenomeMarkdown,
  serializeGenomeMarkdown,
  parseGenomeSections,
  supportsLegacyGenomeMarkdown
};
