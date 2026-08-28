'use strict';

// Arquivos que pertencem a cada tool
const TOOL_FILES = {
  claude: [
    'CLAUDE.md',
    /^\.claude\//
  ],
  codex: [
    'AGENTS.md'
  ],
  opencode: [
    'OPENCODE.md'
  ]
};

// Squad agent/task/skill paths (non-locale)
const SQUAD_PATHS = [
  /^\.aioson\/agents\/(squad|orache|genome|profiler-researcher|profiler-enricher|profiler-forge)\.md$/,
  /^\.aioson\/docs\/squad\//,
  /^\.aioson\/docs\/genome\//,
  /^\.aioson\/tasks\/squad-/,
  /^\.aioson\/skills\/squad\//,
  /^\.aioson\/templates\/squads\//,
  /^\.aioson\/squads\//
];

const {
  DESIGN_ENGINE_ID,
  RETIRED_DESIGN_PRESETS,
  normalizeDesignProfile
} = require('./lib/design-presets');

// Design skill IDs the template ships. The fixed presets were retired (see
// lib/design-presets.js): the engine is the only entry, and every profile
// installs it.
const DESIGN_IDS = [DESIGN_ENGINE_ID];

// Special value meaning "install all design skills"
const DESIGN_ALL = 'all';

// Caminhos de locale por código
const LOCALE_IDS = ['en', 'es', 'fr', 'pt-BR'];

// Arquivos sempre instalados (core invariante)
const ALWAYS_INSTALL = [
  /^\.aioson\/config\.md$/,
  /^\.aioson\/schemas\//,
  /^\.aioson\/mcp\//,
  /^\.aioson\/context\//,
  /^\.aioson\/installed-skills\//,
  /^\.aioson\/my-agents\//,
  /^aioson-models\.json$/
];

const DEFAULT_PROFILE = {
  tools: ['claude'],
  uses: ['development'],
  design: 'none',
  locale: 'en'
};

function matchesAny(rel, patterns) {
  for (const p of patterns) {
    if (typeof p === 'string') {
      if (rel === p) return true;
    } else if (p.test(rel)) {
      return true;
    }
  }
  return false;
}

function isFileForAnyTool(rel) {
  for (const patterns of Object.values(TOOL_FILES)) {
    if (matchesAny(rel, patterns)) return true;
  }
  return false;
}

/**
 * Returns true if the file should be installed given the profile.
 * null profile = install everything (current behavior / fallback).
 */
function shouldIncludeForProfile(rel, profile) {
  if (!profile) return true;

  // Always install core
  if (matchesAny(rel, ALWAYS_INSTALL)) return true;

  // Tool-specific files
  if (isFileForAnyTool(rel)) {
    return (profile.tools || []).some(tool => matchesAny(rel, TOOL_FILES[tool] || []));
  }

  // Squad-specific files (non-locale)
  if (matchesAny(rel, SQUAD_PATHS)) {
    return (profile.uses || []).includes('squads');
  }

  // Design skills: .aioson/skills/design/<id>/
  const designMatch = rel.match(/^\.aioson\/skills\/design\/([^/]+)\//);
  if (designMatch) {
    const skillId = designMatch[1];
    // The one design ENGINE is not a preset. Every visual producer (the
    // refiner, dev, ux-ui, a squad's ui-specialist) resolves a blank
    // `design_skill` to it, so every profile ships the engine — otherwise the
    // framework points at a file the consumer never received. Nothing else
    // under skills/design/ ships; a retired id a saved profile still names
    // is normalized away, never matched.
    if (skillId === DESIGN_ENGINE_ID) return true;
    const chosen = normalizeDesignProfile(profile.design).design;
    if (chosen === DESIGN_ALL) return true;
    if (Array.isArray(chosen)) return chosen.includes(skillId);
    return chosen !== 'none' && skillId === chosen;
  }

  // Everything else (core agents, dev skills, process, etc.) → always install
  return true;
}

module.exports = {
  shouldIncludeForProfile,
  TOOL_FILES,
  SQUAD_PATHS,
  DESIGN_IDS,
  LOCALE_IDS,
  ALWAYS_INSTALL,
  DEFAULT_PROFILE,
  DESIGN_ENGINE_ID,
  RETIRED_DESIGN_PRESETS,
  normalizeDesignProfile
};
