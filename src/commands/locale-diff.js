'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { TEMPLATE_DIR } = require('../installer');

const AGENTS = ['setup', 'analyst', 'architect', 'pm', 'ux-ui', 'dev', 'qa', 'orchestrator'];
const LOCALES = ['en', 'pt-BR', 'es', 'fr'];

// Extract ## Section headings from markdown content
function extractSections(content) {
  const sections = [];
  for (const line of content.split('\n')) {
    if (/^#{1,3} /.test(line)) {
      sections.push(line.trim());
    }
  }
  return sections;
}

// Normalize a heading to a comparable key (remove locale-specific punctuation/accents)
function normalizeHeading(heading) {
  return heading
    .toLowerCase()
    .replace(/[áàâãä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9# ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function runLocaleDiff({ args, options, logger }) {
  const jsonMode = Boolean(options.json);
  const log = jsonMode ? () => {} : logger.log.bind(logger);

  const filterAgent = args[0] || null; // optional: check only one agent
  const filterLocale = options.lang || options.language || null;

  const baseAgentsDir = path.join(TEMPLATE_DIR, '.aioson', 'agents');
  const localesDir    = path.join(TEMPLATE_DIR, '.aioson', 'locales');

  const agentsToCheck = filterAgent
    ? AGENTS.filter(a => a === filterAgent)
    : AGENTS;
  const localesToCheck = filterLocale
    ? LOCALES.filter(l => l === filterLocale)
    : LOCALES;

  const report = [];
  let totalMissing = 0;

  for (const agent of agentsToCheck) {
    const baseFile = path.join(baseAgentsDir, `${agent}.md`);
    const baseContent = await readFile(baseFile);
    if (!baseContent) {
      log(`WARN: base agent @${agent} not found`);
      continue;
    }

    const baseSections = extractSections(baseContent);
    const baseNorm = baseSections.map(s => ({ original: s, key: normalizeHeading(s) }));

    for (const locale of localesToCheck) {
      const localeFile = path.join(localesDir, locale, 'agents', `${agent}.md`);
      const localeContent = await readFile(localeFile);
      if (!localeContent) {
        log(`WARN: @${agent} (${locale}) not found`);
        continue;
      }

      const localeSections = extractSections(localeContent);
      const localeNormSet = new Set(localeSections.map(s => normalizeHeading(s)));

      const missing = baseNorm.filter(({ key }) => !localeNormSet.has(key));

      if (missing.length > 0) {
        totalMissing += missing.length;
        const entry = {
          agent,
          locale,
          missingSections: missing.map(m => m.original)
        };
        report.push(entry);
        if (!jsonMode) {
          log(`@${agent} (${locale}) — ${missing.length} section(s) missing in locale:`);
          for (const m of missing) {
            log(`  - ${m.original}`);
          }
        }
      }
    }
  }

  if (!jsonMode) {
    log('');
    if (totalMissing === 0) {
      log('No drift detected — all locale files contain equivalent sections to base.');
    } else {
      log(`${totalMissing} section(s) present in base but missing in locale files.`);
      log('These may be intentional simplifications or unintentional drift.');
    }
  }

  return {
    ok: totalMissing === 0,
    totalMissing,
    agents: agentsToCheck,
    locales: localesToCheck,
    drifts: report
  };
}

module.exports = { runLocaleDiff };
