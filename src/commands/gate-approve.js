'use strict';

/**
 * aioson gate:approve — approve a phase gate for a feature.
 *
 * Validates with gate:check before writing. If gate:check fails, blocks approval.
 * Writes flat frontmatter fields to spec-{slug}.md:
 *   gate_requirements, gate_design, gate_plan, gate_execution
 *
 * Usage:
 *   aioson gate:approve . --feature=checkout --gate=C
 *   aioson gate:approve . --feature=checkout --gate=C --json
 *
 * If gate:check fails, shows exact manual fallback: file, field, and value to set.
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const {
  contextDir,
  readFileSafe,
  fileExists,
  parseFrontmatter,
  parseGatesFromSpec,
  GATE_NAMES,
  GATE_ALIASES
} = require('../preflight-engine');
const { runGateCheck } = require('./gate-check');

const BAR = '━'.repeat(45);

const GATE_FLAT_FIELDS = {
  A: 'gate_requirements',
  B: 'gate_design',
  C: 'gate_plan',
  D: 'gate_execution'
};

const GATE_NEXT_AGENTS = {
  A: { agent: '@architect', action: '/architect', why: 'Gate A (requirements) approved — architecture can proceed' },
  B: { agent: '@pm', action: '/pm', why: 'Gate B (design) approved — implementation plan can be written' },
  C: { agent: '@orchestrator or @dev', action: '/orchestrator (MEDIUM) or /dev (MICRO/SMALL)', why: 'Gate C (plan) approved — implementation can proceed' },
  D: { agent: 'feature complete', action: 'mark feature done in features.md', why: 'Gate D (execution) approved — feature is complete' }
};

/**
 * Update or insert a flat frontmatter field in a markdown file.
 * Preserves all other frontmatter fields. Uses flat key: value format.
 */
function updateFrontmatterField(content, field, value) {
  const fmMatch = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!fmMatch) {
    // No frontmatter — prepend it
    return `---\n${field}: ${value}\n---\n\n${content}`;
  }

  const prefix = fmMatch[1];
  const fmBody = fmMatch[2];
  const suffix = fmMatch[3];
  const rest = content.slice(fmMatch[0].length);

  const lines = fmBody.split(/\r?\n/);
  let found = false;
  const updated = lines.map((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return line;
    const key = line.slice(0, colonIdx).trim();
    if (key === field) {
      found = true;
      return `${field}: ${value}`;
    }
    return line;
  });

  if (!found) updated.push(`${field}: ${value}`);

  return `${prefix}${updated.join('\n')}${suffix}${rest}`;
}

async function runGateApprove({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = options.feature ? String(options.feature) : null;
  let gateLetter = options.gate ? String(options.gate).toUpperCase() : null;

  if (!slug) {
    if (options.json) return { ok: false, reason: 'missing_feature' };
    logger.log('--feature=<slug> is required.');
    return { ok: false };
  }

  if (!gateLetter) {
    if (options.json) return { ok: false, reason: 'missing_gate' };
    logger.log('--gate=<A|B|C|D> is required.');
    return { ok: false };
  }

  // Resolve aliases
  if (GATE_ALIASES[gateLetter.toLowerCase()]) {
    gateLetter = GATE_ALIASES[gateLetter.toLowerCase()];
  }

  if (!GATE_NAMES[gateLetter]) {
    if (options.json) return { ok: false, reason: 'invalid_gate', gate: gateLetter };
    logger.log(`Invalid gate: ${gateLetter}. Use A, B, C, or D.`);
    return { ok: false };
  }

  // Step 1: run gate:check first (AC-SDLC-06 — gate:approve fails if gate:check fails)
  const silentLogger = { log: () => {} };
  const check = await runGateCheck({
    args: [targetDir],
    options: { feature: slug, gate: gateLetter, json: true },
    logger: silentLogger
  });

  const specFile = path.join(contextDir(targetDir), `spec-${slug}.md`);
  const specExists = await fileExists(specFile);
  const specFieldName = GATE_FLAT_FIELDS[gateLetter];
  const gateName = GATE_NAMES[gateLetter];

  if (!check.ok) {
    // Gate check failed — block approval and show manual fallback (AC-SDLC-08)
    const result = {
      ok: false,
      blocked: true,
      gate: gateLetter,
      gate_name: gateName,
      feature: slug,
      reason: 'gate_check_failed',
      missing: check.missing || [],
      manual_fallback: specExists
        ? `To manually approve when prerequisites are met:\n  File: .aioson/context/spec-${slug}.md\n  Field: ${specFieldName}\n  Value: approved`
        : `spec-${slug}.md does not exist. Create it with ${specFieldName}: approved in frontmatter after prerequisites are satisfied.`
    };

    if (options.json) return result;

    logger.log('');
    logger.log(`Gate ${gateLetter} (${gateName}) — ${slug}`);
    logger.log(BAR);
    logger.log(`Result: ✗ BLOCKED — gate:check did not pass`);
    logger.log('');
    logger.log('Missing prerequisites:');
    for (const m of check.missing || []) logger.log(`  ✗ ${m}`);
    logger.log('');
    logger.log('Manual fallback (use only after all prerequisites are satisfied):');
    logger.log(`  File:  .aioson/context/spec-${slug}.md`);
    logger.log(`  Field: ${specFieldName}`);
    logger.log(`  Value: approved`);
    logger.log('');
    logger.log('Tip: re-run gate:check after satisfying prerequisites, then gate:approve again.');
    logger.log('');
    return result;
  }

  // Step 2: write flat frontmatter field (AC-SDLC-07 — flat format, not nested phase_gates)
  let content = specExists ? await readFileSafe(specFile) : null;

  if (!content) {
    // Create minimal spec with gate field
    content = `---\nfeature: ${slug}\n${specFieldName}: approved\n---\n\n# Spec — ${slug}\n\nCreated by gate:approve.\n`;
  } else {
    content = updateFrontmatterField(content, specFieldName, 'approved');
  }

  await fs.writeFile(specFile, content, 'utf8');

  const nextInfo = GATE_NEXT_AGENTS[gateLetter];
  const result = {
    ok: true,
    gate: gateLetter,
    gate_name: gateName,
    feature: slug,
    field_written: specFieldName,
    spec_file: `.aioson/context/spec-${slug}.md`,
    next_agent: nextInfo.agent,
    next_action: nextInfo.action,
    why: nextInfo.why
  };

  if (options.json) return result;

  logger.log('');
  logger.log(`Gate ${gateLetter} (${gateName}) — ${slug}`);
  logger.log(BAR);
  logger.log(`Result: ✓ APPROVED`);
  logger.log('');
  logger.log(`Written: ${specFieldName}: approved → .aioson/context/spec-${slug}.md`);
  logger.log('');
  logger.log(`Next agent: ${nextInfo.agent}`);
  logger.log(`Why: ${nextInfo.why}`);
  logger.log(`Action: ${nextInfo.action}`);
  logger.log('');

  return result;
}

module.exports = { runGateApprove };
