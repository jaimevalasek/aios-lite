'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { TEMPLATE_DIR } = require('../installer');

const AGENTS = [
  'setup',
  'analyst',
  'architect',
  'pm',
  'ux-ui',
  'dev',
  'qa',
  'orchestrator',
  'squad',
  'genoma',
  'profiler-researcher',
  'profiler-enricher',
  'profiler-forge'
];
const LOCALES = ['en', 'pt-BR', 'es', 'fr'];

// Sections expected in base agents (English heading variants)
const REQUIRED_BASE_SECTIONS = [
  {
    key: 'mission',
    patterns: [/^## Mission/m, /^## Missao/m, /^## Mision/m],
    label: 'Mission section'
  },
  {
    key: 'hard_constraints',
    patterns: [/^## Hard constraints/m, /^## Restricoes/m, /^## Restricciones/m, /^## Contraintes/m],
    label: 'Hard constraints section'
  },
  {
    key: 'output_contract',
    // Not all agents have a formal output contract section but most do
    patterns: [
      /^## Output contract/m,
      /^## Required output/m,
      /^## Contrato de output/m,
      /^## Contrat d.output/m,
      /^## Output requerido/m,
      /^## Output obrigatorio/m,
    ],
    label: 'Output contract section',
    optional: true  // orchestrator, dev don't have formal output contract headings
  }
];

// Language instruction pattern expected at top of every locale file
const LANG_INSTRUCTION_PATTERNS = {
  'pt-BR': /INSTRUÇÃO ABSOLUTA/,
  es:      /INSTRUCCIÓN ABSOLUTA/,
  fr:      /INSTRUCTION ABSOLUE/,
  en:      /ABSOLUTE INSTRUCTION/
};

function hasSectionMatch(content, patterns) {
  return patterns.some(p => p.test(content));
}

function isLangInstructionNearTop(content, locale) {
  const pattern = LANG_INSTRUCTION_PATTERNS[locale];
  if (!pattern) return true; // unknown locale, skip
  // Must appear within first 15 lines
  const lines = content.split('\n').slice(0, 15).join('\n');
  return pattern.test(lines);
}

async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function runTestAgents({ options, logger }) {
  const jsonMode = Boolean(options.json);
  const log = jsonMode ? () => {} : logger.log.bind(logger);

  const baseAgentsDir = path.join(TEMPLATE_DIR, '.aioson', 'agents');
  const localesDir    = path.join(TEMPLATE_DIR, '.aioson', 'locales');

  const checks = [];
  let passed = 0;
  let failed = 0;

  function addCheck(name, ok, detail = '') {
    checks.push({ name, ok, detail });
    if (ok) {
      passed++;
      log(`  ✓ ${name}`);
    } else {
      failed++;
      log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    }
  }

  // ── Base agents ─────────────────────────────────────────────────────────
  log('');
  log('Base agents:');
  for (const agent of AGENTS) {
    const filePath = path.join(baseAgentsDir, `${agent}.md`);
    const content = await readFile(filePath);

    addCheck(
      `@${agent} exists`,
      content !== null,
      content === null ? `File not found: ${filePath}` : ''
    );

    if (content === null) continue;

    for (const section of REQUIRED_BASE_SECTIONS) {
      if (section.optional) continue;
      addCheck(
        `@${agent} has ${section.label}`,
        hasSectionMatch(content, section.patterns)
      );
    }

    // .md-only context rule
    addCheck(
      `@${agent} has .aioson/context/ .md-only rule`,
      content.includes('.aioson/context/') &&
      (content.includes('only `.md`') || content.includes('somente arquivos `.md`') ||
       content.includes('solo archivos `.md`') || content.includes('uniquement des fichiers `.md`') ||
       content.includes('accepts only `.md`') || content.includes('context/` rule'))
    );
  }

  // ── Locale agents ────────────────────────────────────────────────────────
  for (const locale of LOCALES) {
    log('');
    log(`Locale: ${locale}`);
    const localeAgentsDir = path.join(localesDir, locale, 'agents');

    for (const agent of AGENTS) {
      const filePath = path.join(localeAgentsDir, `${agent}.md`);
      const content = await readFile(filePath);

      addCheck(
        `@${agent} (${locale}) exists`,
        content !== null,
        content === null ? `File not found: ${filePath}` : ''
      );

      if (content === null) continue;

      addCheck(
        `@${agent} (${locale}) has language instruction at top`,
        isLangInstructionNearTop(content, locale)
      );
    }
  }

  // ── Skills presence ──────────────────────────────────────────────────────
  log('');
  log('Key skills:');
  const criticalSkills = ['interface-design.md', 'static-html-patterns.md', 'git-conventions.md'];
  const skillsDir = path.join(TEMPLATE_DIR, '.aioson', 'skills', 'static');
  for (const skill of criticalSkills) {
    const content = await readFile(path.join(skillsDir, skill));
    addCheck(`skill: ${skill}`, content !== null && content.length > 100);
  }

  const packagedDesignSkill = await readFile(
    path.join(TEMPLATE_DIR, '.aioson', 'skills', 'design', 'cognitive-ui', 'SKILL.md')
  );
  addCheck('skill package: cognitive-ui', packagedDesignSkill !== null && packagedDesignSkill.length > 100);

  // ── Summary ──────────────────────────────────────────────────────────────
  log('');
  const total = passed + failed;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  if (!jsonMode) {
    log(`Result: ${passed}/${total} checks passed (${score}%)`);
    if (failed > 0) {
      log(`${failed} check(s) failed — run with --json for machine-readable output.`);
    } else {
      log('All checks passed.');
    }
  }

  return {
    ok: failed === 0,
    passed,
    failed,
    total,
    score,
    checks
  };
}

module.exports = { runTestAgents };
