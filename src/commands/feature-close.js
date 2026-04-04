'use strict';

/**
 * aioson feature:close — close a feature after QA sign-off.
 *
 * Updates spec-{slug}.md (adds QA sign-off block), features.md (sets status to done),
 * and project-pulse.md (removes from active work).
 *
 * Usage:
 *   aioson feature:close . --feature=checkout --verdict=PASS
 *   aioson feature:close . --feature=checkout --verdict=PASS --residual="Email delivery not tested E2E"
 *   aioson feature:close . --feature=checkout --verdict=FAIL --notes="Auth edge case missing"
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { contextDir, readFileSafe, parseFrontmatter } = require('../preflight-engine');

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

async function updateSpecFile(specPath, verdict, residual, date) {
  const content = await readFileSafe(specPath);
  if (!content) return false;

  const signOff = [
    '',
    '## QA Sign-off',
    '',
    `- **Date:** ${date}`,
    `- **Verdict:** ${verdict}`,
    residual ? `- **Residual:** ${residual}` : null,
    `- **Gate D (execution):** ${verdict === 'PASS' ? 'approved' : 'rejected'}`,
    ''
  ].filter((l) => l !== null).join('\n');

  // Update gate_execution in frontmatter first (on original content)
  const newStatus = verdict === 'PASS' ? 'approved' : 'rejected';
  const fm = parseFrontmatter(content);
  let baseContent = content;
  if (Object.keys(fm).length > 0) {
    baseContent = content.replace(
      /^---\r?\n[\s\S]*?\r?\n---/,
      (block) => {
        if (block.includes('gate_execution')) {
          return block.replace(/gate_execution:\s*.+/, `gate_execution: ${newStatus}`);
        }
        return block.replace(/^---\r?\n/, `---\ngate_execution: ${newStatus}\n`);
      }
    );
  }

  // Now apply QA sign-off on top of the frontmatter-updated content
  if (baseContent.includes('## QA Sign-off')) {
    const updated = baseContent.replace(
      /## QA Sign-off[\s\S]*?(?=\n##|\s*$)/,
      signOff.trimStart()
    );
    await fs.writeFile(specPath, updated, 'utf8');
  } else {
    await fs.writeFile(specPath, baseContent + signOff, 'utf8');
  }

  return true;
}

async function updateFeaturesFile(featuresPath, slug, verdict, date) {
  const content = await readFileSafe(featuresPath);
  if (!content) return false;

  const status = verdict === 'PASS' ? 'done' : 'qa_failed';

  // Try to find and update the feature row
  const updated = content.replace(
    new RegExp(`(\\|[^|]*${slug}[^|]*\\|[^|]*\\|)[^|]*(\\|)`, 'g'),
    (match, before, after) => `${before} ${status} (${date}) ${after}`
  );

  if (updated !== content) {
    await fs.writeFile(featuresPath, updated, 'utf8');
    return true;
  }

  // Append if not found
  const line = `| ${slug} | ${verdict === 'PASS' ? 'done' : 'qa_failed'} | ${date} | QA ${verdict} |`;
  await fs.appendFile(featuresPath, `\n${line}\n`, 'utf8');
  return true;
}

async function runFeatureClose({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = options.feature ? String(options.feature) : null;
  const verdict = options.verdict ? String(options.verdict).toUpperCase() : null;
  const residual = options.residual ? String(options.residual) : null;
  const notes = options.notes ? String(options.notes) : null;

  if (!slug) {
    if (options.json) return { ok: false, reason: 'missing_feature' };
    logger.log('--feature=<slug> is required.');
    return { ok: false };
  }

  if (!verdict || !['PASS', 'FAIL'].includes(verdict)) {
    if (options.json) return { ok: false, reason: 'invalid_verdict' };
    logger.log('--verdict=PASS or --verdict=FAIL is required.');
    return { ok: false };
  }

  const today = nowDate();
  const dir = contextDir(targetDir);
  const updates = [];

  // 1. Update spec file
  const specPath = path.join(dir, `spec-${slug}.md`);
  const specUpdated = await updateSpecFile(specPath, verdict, residual || notes, today);
  if (specUpdated) {
    updates.push(`spec-${slug}.md: added QA sign-off (${today}, ${verdict})`);
  } else {
    updates.push(`spec-${slug}.md: not found (skipped)`);
  }

  // 2. Update features.md
  const featuresPath = path.join(dir, 'features.md');
  const featuresContent = await readFileSafe(featuresPath);
  if (featuresContent) {
    await updateFeaturesFile(featuresPath, slug, verdict, today);
    updates.push(`features.md: ${slug} → ${verdict === 'PASS' ? 'done' : 'qa_failed'} (${today})`);
  } else {
    updates.push('features.md: not found (skipped)');
  }

  // 3. Update project-pulse.md
  const pulsePath = path.join(dir, 'project-pulse.md');
  const pulseContent = await readFileSafe(pulsePath);
  if (pulseContent) {
    const fm = parseFrontmatter(pulseContent);
    const status = verdict === 'PASS' ? 'closed' : 'qa_failed';
    const updatedPulse = pulseContent
      .replace(/active_feature:\s*.+/, `active_feature: (none)`)
      .replace(/active_work:\s*".+"/, `active_work: ""`)
      .replace(/last_agent:\s*.+/, `last_agent: qa`)
      .replace(/last_gate:\s*.+/, `last_gate: Gate D: ${verdict === 'PASS' ? 'approved' : 'rejected'}`);
    await fs.writeFile(pulsePath, updatedPulse, 'utf8');
    updates.push('project-pulse.md: updated active work');
  }

  const result = {
    ok: true,
    feature: slug,
    verdict,
    date: today,
    residual: residual || notes || null,
    updates
  };

  if (options.json) return result;

  logger.log(`Feature closure — ${slug}:`);
  for (const u of updates) logger.log(`  ${u}`);

  return result;
}

module.exports = { runFeatureClose };
