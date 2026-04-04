'use strict';

/**
 * aioson sizing — Sheldon's sizing decision (inplace / phased_inplace / phased_external).
 *
 * Reads a PRD file and counts entities, phases, integrations, user flows, and ACs.
 * Returns a sizing score and delivery recommendation.
 *
 * Usage:
 *   aioson sizing . --prd=.aioson/context/prd-checkout.md
 *   aioson sizing . --feature=checkout
 *   aioson sizing . --feature=checkout --json
 */

const path = require('node:path');
const { readFileSafe, contextDir } = require('../preflight-engine');

const BAR = '━'.repeat(30);

// Scoring:
//   main entities > 3    → +1
//   delivery phases > 1  → +2
//   external integrations → +1
//   user flows > 3       → +0 (no penalty)
//   AC count > 10        → +1
//   Score 0-2 → inplace
//   Score 3   → phased_inplace
//   Score 4+  → phased_external

function countEntities(content) {
  // Look for entity mentions: model/entity/table patterns
  const patterns = [
    /\b(model|entity|table|resource|object)\s+["`']?([A-Z][a-zA-Z]+)["`']?/g,
    /## [A-Z][a-zA-Z]+ (Model|Entity|Table)/g,
    /\b([A-Z][a-zA-Z]+Model)\b/g
  ];
  const entities = new Set();
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(content)) !== null) {
      entities.add((m[2] || m[1]).toLowerCase());
    }
  }
  // Also count H3 headings as potential entities
  const h3 = content.match(/^### [A-Z][a-zA-Z ]+$/gm) || [];
  return Math.max(entities.size, Math.floor(h3.length / 2));
}

function countPhases(content) {
  // Look for delivery phase / phase N patterns
  const phaseRe = /\b(phase|stage|sprint|iteration)\s+\d+/gi;
  const deliveryRe = /##\s+(phase|stage|delivery|sprint)\s+\d+/gi;
  const phases = new Set();
  let m;
  while ((m = phaseRe.exec(content)) !== null) phases.add(m[0].toLowerCase());
  while ((m = deliveryRe.exec(content)) !== null) phases.add(m[0].toLowerCase());
  return phases.size;
}

function countIntegrations(content) {
  const integrations = [
    /\b(stripe|paypal|braintree|square|mercadopago)\b/gi,
    /\b(sendgrid|mailchimp|ses|postmark|smtp)\b/gi,
    /\b(twilio|vonage|nexmo|sms)\b/gi,
    /\b(s3|cloudinary|gcs|azure)\b/gi,
    /\b(oauth|auth0|firebase|cognito)\b/gi,
    /\b(redis|elasticsearch|algolia)\b/gi,
    /\bAPI\s+(call|integration)\b/gi,
    /\bwebhook[s]?\b/gi,
    /\bexternal\s+service[s]?\b/gi
  ];
  const found = new Set();
  for (const pattern of integrations) {
    let m;
    while ((m = pattern.exec(content)) !== null) found.add(m[0].toLowerCase());
  }
  return found.size;
}

function countUserFlows(content) {
  // User flow = "as a X, I want to Y" or numbered flow steps
  const asAre = content.match(/As an? [a-z]+, I want/gi) || [];
  const flowRe = content.match(/\bflow\s+\d+\b/gi) || [];
  return asAre.length + flowRe.length;
}

function countACs(content) {
  // Acceptance criteria: checkboxes or "AC-N" patterns
  const checkboxes = content.match(/^[-*]\s+\[[ x]\]/gmi) || [];
  const acRe = content.match(/\bAC[-\s]?\d+\b/g) || [];
  return Math.max(checkboxes.length, acRe.length);
}

function sizingDecision(score) {
  if (score <= 2) return { decision: 'inplace', instruction: 'Implement directly in PRD' };
  if (score === 3) return { decision: 'phased_inplace', instruction: 'Add ## Delivery plan section to PRD' };
  return { decision: 'phased_external', instruction: 'Create separate delivery plan document' };
}

async function runSizing({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = options.feature ? String(options.feature) : null;

  let prdPath = options.prd ? path.resolve(targetDir, options.prd) : null;

  if (!prdPath && slug) {
    prdPath = path.join(contextDir(targetDir), `prd-${slug}.md`);
  }

  if (!prdPath) {
    if (options.json) return { ok: false, reason: 'no_prd', message: 'Provide --prd=<path> or --feature=<slug>' };
    logger.log('Provide --prd=<path> or --feature=<slug>');
    return { ok: false };
  }

  const content = await readFileSafe(prdPath);
  if (!content) {
    if (options.json) return { ok: false, reason: 'file_not_found', path: prdPath };
    logger.log(`File not found: ${path.relative(targetDir, prdPath)}`);
    return { ok: false };
  }

  const entities = countEntities(content);
  const phases = countPhases(content);
  const integrations = countIntegrations(content);
  const flows = countUserFlows(content);
  const acs = countACs(content);

  const entityScore = entities > 3 ? 1 : 0;
  const phaseScore = phases > 1 ? 2 : 0;
  const intScore = integrations >= 1 ? 1 : 0;
  const flowScore = 0; // flows ≤ 3 → +0; only informational
  const acScore = acs > 10 ? 1 : 0;

  const totalScore = entityScore + phaseScore + intScore + flowScore + acScore;
  const { decision, instruction } = sizingDecision(totalScore);

  const result = {
    ok: true,
    prd_path: path.relative(targetDir, prdPath),
    metrics: { entities, phases, integrations, user_flows: flows, ac_count: acs },
    scores: { entities: entityScore, phases: phaseScore, integrations: intScore, acs: acScore, total: totalScore },
    decision,
    instruction
  };

  if (options.json) return result;

  const header = slug ? `Sizing — ${slug}` : `Sizing — ${path.relative(targetDir, prdPath)}`;
  logger.log('');
  logger.log(header);
  logger.log(BAR);
  logger.log(`Main entities:           ${entities}  → +${entityScore}${entities > 3 ? ' (above 3)' : ''}`);
  logger.log(`Delivery phases:         ${phases}  → +${phaseScore}${phases > 1 ? ' (above 1)' : ''}`);
  logger.log(`External integrations:   ${integrations}  → +${intScore}`);
  logger.log(`User flows:              ${flows}  → +0${flows > 3 ? ' (above 3 — informational)' : ''}`);
  logger.log(`AC count:                ${acs}  → +${acScore}${acs > 10 ? ' (above 10)' : ''}`);
  logger.log(BAR);
  logger.log(`Score: ${totalScore} → ${decision} (${instruction})`);
  logger.log('');

  return result;
}

module.exports = { runSizing };
