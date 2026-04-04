'use strict';

/**
 * aioson state:save — create/update dev-state.md for @dev session resumption.
 *
 * Replaces the manual dev-state.md update block. Stores active feature,
 * phase, next step, spec version, and context package.
 *
 * Usage:
 *   aioson state:save . --feature=checkout --phase=3 --next="Implement notification listeners" \
 *     --spec-version=3 --status=in_progress
 *   aioson state:save . --feature=checkout --next="Continue payment webhook" --status=in_progress
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { contextDir, readFileSafe, parseFrontmatter, scanArtifacts } = require('../preflight-engine');

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

async function runStateSave({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = options.feature ? String(options.feature) : null;
  const phase = options.phase ? String(options.phase) : null;
  const next = options.next ? String(options.next) : null;
  const specVersion = options['spec-version'] ? String(options['spec-version']) : null;
  const status = options.status ? String(options.status) : 'in_progress';
  const plan = options.plan ? String(options.plan) : null;

  if (!slug) {
    if (options.json) return { ok: false, reason: 'missing_feature' };
    logger.log('--feature=<slug> is required.');
    return { ok: false };
  }

  if (!next) {
    if (options.json) return { ok: false, reason: 'missing_next' };
    logger.log('--next="<next step>" is required.');
    return { ok: false };
  }

  // Build context package based on what exists
  const artifacts = await scanArtifacts(targetDir, slug);
  const contextPackage = [];
  if (artifacts.project_context.exists) contextPackage.push('project.context.md');
  if (artifacts.spec.exists) contextPackage.push(`spec-${slug}.md`);
  if (plan) contextPackage.push(plan);
  else if (artifacts.implementation_plan.exists) contextPackage.push(`implementation-plan-${slug}.md`);

  const today = nowDate();
  const statePath = path.join(contextDir(targetDir), 'dev-state.md');

  const existingContent = await readFileSafe(statePath);
  const existingFm = existingContent ? parseFrontmatter(existingContent) : {};

  // Build history entry
  const historyLine = `- ${today}: phase ${phase || existingFm.active_phase || '?'} — ${next}`;
  const existingHistory = [];
  if (existingContent) {
    const historyMatch = existingContent.match(/## History\n([\s\S]*?)(?=\n##|\s*$)/);
    if (historyMatch) {
      const lines = historyMatch[1].split('\n').filter((l) => l.trim().startsWith('-'));
      existingHistory.push(...lines.slice(-4)); // keep last 4 + new = 5 total
    }
  }
  const history = [...existingHistory, historyLine];

  const lines = [
    '---',
    `last_updated: ${today}`,
    `active_feature: ${slug}`,
    phase ? `active_phase: ${phase}` : (existingFm.active_phase ? `active_phase: ${existingFm.active_phase}` : null),
    `next_step: "${next}"`,
    specVersion ? `last_spec_version: ${specVersion}` : (existingFm.last_spec_version ? `last_spec_version: ${existingFm.last_spec_version}` : null),
    `status: ${status}`,
    '---',
    '',
    '# Dev State',
    '',
    `**Feature:** ${slug}`,
    phase ? `**Phase:** ${phase}` : null,
    `**Status:** ${status}`,
    `**Next step:** ${next}`,
    '',
    '## Context package',
    '',
    ...contextPackage.map((f, i) => `${i + 1}. ${f}`),
    '',
    '## History',
    '',
    ...history,
    ''
  ].filter((l) => l !== null);

  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, lines.join('\n'), 'utf8');

  const result = {
    ok: true,
    path: path.relative(targetDir, statePath),
    active_feature: slug,
    active_phase: phase,
    next_step: next,
    last_spec_version: specVersion,
    context_package: contextPackage
  };

  if (options.json) return result;

  logger.log('dev-state.md updated:');
  logger.log(`  active_feature: ${slug}`);
  if (phase) logger.log(`  active_phase: ${phase}`);
  logger.log(`  next_step: "${next}"`);
  if (specVersion) logger.log(`  last_spec_version: ${specVersion}`);
  logger.log(`  context_package: [${contextPackage.join(', ')}]`);

  return result;
}

module.exports = { runStateSave };
