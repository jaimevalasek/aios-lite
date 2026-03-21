'use strict';

const {
  parseGenomeMarkdown,
  serializeGenomeMarkdown
} = require('../../genome-format');
const { isGenomeV2, normalizeGenome } = require('../../genomes');
const { mergeGenomeBindings, normalizeGenomeBindings } = require('../../genomes/bindings');

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasLegacyObjectSignals(input) {
  return Boolean(
    input &&
      (
        input.genome ||
        input.slug ||
        input.domain ||
        input.title ||
        input.name ||
        isObject(input.sections) ||
        Array.isArray(input.knowledge) ||
        Array.isArray(input.mentes) ||
        Array.isArray(input.skills)
      )
  );
}

function buildSectionsFromLegacyObject(input = {}) {
  if (isObject(input.sections)) {
    return input.sections;
  }

  return {
    knowledge: Array.isArray(input.knowledge) ? input.knowledge : [],
    philosophies: Array.isArray(input.philosophies) ? input.philosophies : [],
    mentalModels: Array.isArray(input.mentalModels) ? input.mentalModels : [],
    heuristics: Array.isArray(input.heuristics) ? input.heuristics : [],
    frameworks: Array.isArray(input.frameworks) ? input.frameworks : [],
    methodologies: Array.isArray(input.methodologies) ? input.methodologies : [],
    mentes: Array.isArray(input.mentes) ? input.mentes : Array.isArray(input.minds) ? input.minds : [],
    skills: Array.isArray(input.skills) ? input.skills : [],
    evidence: Array.isArray(input.evidence) ? input.evidence : [],
    applicationNotes: Array.isArray(input.applicationNotes) ? input.applicationNotes : []
  };
}

function hasExplicitModernMarkdownMarkers(input) {
  const text = String(input || '');
  return (
    /\nformat:\s*genome-v[23]\s*$/im.test(text) ||
    /\nversion:\s*[23]\s*$/im.test(text) ||
    /\nevidence_mode:\s*.+$/im.test(text) ||
    /\nsources_count:\s*\d+\s*$/im.test(text) ||
    /^##\s+(Filosofias|Modelos mentais|Heurísticas|Heuristicas|Frameworks|Metodologias|Perfil Cognitivo|Estilo de Comunicação|Vieses e Pontos Cegos|Evidence|Application notes)\s*$/im.test(text)
  );
}

function hasLegacyMarkdownSignals(input) {
  const text = String(input || '');
  return (
    /^\s*---\s*$/m.test(text) ||
    /\n(?:genome|slug):\s*.+$/im.test(text) ||
    /^#\s+(Genome|Genome)\s*:/im.test(text) ||
    /^##\s+(O que saber|Mentes|Skills)\s*$/im.test(text)
  );
}

function toCompatibleGenomeDocument(input, options = {}) {
  return normalizeGenome({
    ...(isObject(input) ? input : {}),
    sections: buildSectionsFromLegacyObject(input),
    legacyFormat: false,
    hasFrontmatter: true,
    sourcePath: options.filePath || null
  });
}

function detectGenomeFormat(input) {
  if (!input) return 'unknown';

  if (typeof input === 'string') {
    try {
      if (hasExplicitModernMarkdownMarkers(input)) {
        const parsed = parseGenomeMarkdown(input);
        return parsed.version >= 3 || parsed.format === 'genome-v3' ? 'v3-markdown' : 'v2-markdown';
      }
      if (hasLegacyMarkdownSignals(input)) return 'legacy-markdown';
      const genome = parseGenomeMarkdown(input);
      if (genome.version >= 3 || genome.format === 'genome-v3') return 'v3-markdown';
      if (isGenomeV2(genome)) return 'v2-markdown';
      if (genome.legacyFormat) return 'legacy-markdown';
    } catch {
      return 'unknown';
    }
    return 'unknown';
  }

  if (isObject(input)) {
    const normalized = normalizeGenome(input);
    if (normalized.version >= 3 || normalized.format === 'genome-v3') return 'v3-object';
    if (isGenomeV2(input)) return 'v2-object';
    if (hasLegacyObjectSignals(input)) return 'legacy-object';
  }

  return 'unknown';
}

function loadCompatibleGenome(input, options = {}) {
  const format = detectGenomeFormat(input);

  if (format === 'v2-markdown' || format === 'v3-markdown' || format === 'legacy-markdown') {
    const parsed = parseGenomeMarkdown(input);
    return {
      format,
      document: toCompatibleGenomeDocument(parsed, options),
      migrated: format === 'legacy-markdown'
    };
  }

  if (format === 'v2-object' || format === 'v3-object') {
    return {
      format,
      document: toCompatibleGenomeDocument(input, options),
      migrated: false
    };
  }

  if (format === 'legacy-object') {
    return {
      format,
      document: toCompatibleGenomeDocument(
        {
          slug: input.slug || input.genome,
          domain: input.domain || input.title || input.name || input.slug || input.genome,
          type: input.type,
          language: input.language,
          depth: input.depth,
          version: input.version,
          format: input.format,
          evidenceMode: input.evidenceMode || input.evidence_mode,
          sourceCount: input.sourceCount ?? input.sourcesCount ?? input.sources_count,
          generated: input.generated,
          personaSource: input.personaSource || input.persona_source,
          personaSources: input.personaSources || input.persona_sources,
          disc: input.disc,
          enneagram: input.enneagram,
          bigFive: input.bigFive || input.big_five,
          mbti: input.mbti,
          confidence: input.confidence,
          profilerReport: input.profilerReport || input.profiler_report,
          hybridMode: input.hybridMode || input.hybrid_mode,
          sections: buildSectionsFromLegacyObject(input)
        },
        options
      ),
      migrated: true
    };
  }

  throw new Error('Unsupported genome format.');
}

function serializeCompatibleGenome(document, options = {}) {
  return serializeGenomeMarkdown(toCompatibleGenomeDocument(document, options));
}

function normalizeCompatibleBindings(bindings = {}) {
  return normalizeGenomeBindings(bindings);
}

function hasLegacySquadGenomeSignals(manifest = {}) {
  return Boolean(
    Array.isArray(manifest.genomes) ||
      isObject(manifest.genomes) ||
      isObject(manifest.genomeBindings) ||
      (Array.isArray(manifest.executors) &&
        manifest.executors.some((executor) => Array.isArray(executor && executor.genomes) && executor.genomes.length > 0))
  );
}

function normalizeLegacySquadGenomes(manifest = {}) {
  if (!isObject(manifest)) return {};
  if (!hasLegacySquadGenomeSignals(manifest)) return { ...manifest };

  const genomeBindings = mergeGenomeBindings({
    blueprintBindings: manifest.genomeBindings,
    manifestBindings: manifest.genomeBindings || manifest.genomes,
    legacyExecutors: manifest.executors
  });

  return {
    ...manifest,
    genomeBindings
  };
}

module.exports = {
  detectGenomeFormat,
  loadCompatibleGenome,
  serializeCompatibleGenome,
  normalizeCompatibleBindings,
  normalizeLegacySquadGenomes
};
