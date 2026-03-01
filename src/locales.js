'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { AGENT_DEFINITIONS } = require('./constants');
const { exists, ensureDir } = require('./utils');

const SUPPORTED_AGENT_LOCALES = ['en', 'pt-BR', 'es', 'fr'];

function normalizeLanguageTag(value) {
  return String(value || '').trim();
}

function localeForPath(value) {
  return String(value || '').replace(/_/g, '-');
}

function resolveAgentLocale(languageTag) {
  const tag = normalizeLanguageTag(languageTag);
  if (!tag) return 'en';
  const canonical = tag.replace(/_/g, '-');

  const exact = SUPPORTED_AGENT_LOCALES.find(
    (locale) => locale.toLowerCase() === canonical.toLowerCase()
  );
  if (exact) return exact;

  const base = canonical.split('-')[0].toLowerCase();
  if (base === 'pt') return 'pt-BR';
  if (base === 'en') return 'en';
  if (base === 'es') return 'es';
  if (base === 'fr') return 'fr';

  return 'en';
}

function getLocalizedAgentPath(agentId, locale) {
  return `.aios-lite/locales/${localeForPath(locale)}/agents/${agentId}.md`;
}

function getActiveAgentPath(agentId) {
  return `.aios-lite/agents/${agentId}.md`;
}

async function applyAgentLocale(targetDir, locale, options = {}) {
  const resolved = resolveAgentLocale(locale);
  const dryRun = Boolean(options.dryRun);
  const copied = [];
  const missing = [];

  for (const agent of AGENT_DEFINITIONS) {
    const sourceRel = getLocalizedAgentPath(agent.id, resolved);
    const destRel = getActiveAgentPath(agent.id);
    const sourceAbs = path.join(targetDir, sourceRel);
    const destAbs = path.join(targetDir, destRel);

    if (!(await exists(sourceAbs))) {
      missing.push(sourceRel);
      continue;
    }

    if (!dryRun) {
      await ensureDir(path.dirname(destAbs));
      await fs.copyFile(sourceAbs, destAbs);
    }
    copied.push({ source: sourceRel, target: destRel });
  }

  return {
    locale: resolved,
    copied,
    missing,
    dryRun
  };
}

module.exports = {
  SUPPORTED_AGENT_LOCALES,
  normalizeLanguageTag,
  resolveAgentLocale,
  getLocalizedAgentPath,
  getActiveAgentPath,
  applyAgentLocale
};
