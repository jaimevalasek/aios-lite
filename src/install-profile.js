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
  gemini: [
    '.gemini/GEMINI.md',
    /^\.gemini\/commands\//
  ],
  opencode: [
    'OPENCODE.md'
  ]
};

// Prefixos/arquivos que pertencem ao use-case "squads"
const SQUAD_PATHS = [
  /^\.aioson\/agents\/(squad|orache|genome|profiler-researcher|profiler-enricher|profiler-forge|design-hybrid-forge)\.md$/,
  /^\.aioson\/locales\/[^/]+\/agents\/(squad|orache|genome|profiler-researcher|profiler-enricher|profiler-forge|design-hybrid-forge)\.md$/,
  /^\.aioson\/tasks\/squad-/,
  /^\.aioson\/skills\/squad\//,
  /^\.aioson\/templates\/squads\//,
  /^\.aioson\/squads\//
];

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

const DEFAULT_PROFILE = { tools: ['claude'], uses: ['development'] };

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

  // Squad-specific files
  if (matchesAny(rel, SQUAD_PATHS)) {
    return (profile.uses || []).includes('squads');
  }

  // Everything else (core agents, locales, dev skills) → always install
  return true;
}

module.exports = {
  shouldIncludeForProfile,
  TOOL_FILES,
  SQUAD_PATHS,
  ALWAYS_INSTALL,
  DEFAULT_PROFILE
};
