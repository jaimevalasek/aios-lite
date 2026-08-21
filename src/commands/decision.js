'use strict';

/**
 * aioson decision:add | decision:resolve | decision:list — the durable record
 * of a decision only a human can make.
 *
 * `workflow:next` already refused to advance a feature whose decision
 * checkpoint held a pending blocking decision, and the kernels were forbidden
 * to hand-write that file — but nothing ever produced it. "Autopilot pauses for
 * a genuine decision" was therefore a sentence, not a mechanism. These commands
 * are the mechanism: an agent that meets a decision it cannot make records it
 * (`decision:add`), the workflow blocks until a human records the choice
 * (`decision:resolve`), and the trail — question, evidence, what omission
 * costs, the recommendation, who decided what and when — lives with the
 * feature in `.aioson/context/features/{slug}/decision-checkpoint.json`.
 *
 *   aioson decision:add . --feature=checkout --id=DEC-01 \
 *     --question="Charge at order or at shipment?" \
 *     --evidence="PRD CAP-02 says 'charge the customer'; the plan's payment step fires at shipment" \
 *     --consequence="Refund flow and ledger semantics differ; picking silently makes the AC untestable" \
 *     --recommendation="Charge at shipment — matches the current ledger" \
 *     --options="at order|at shipment" [--class=blocking-decision] [--by=@sheldon]
 *   aioson decision:resolve . --feature=checkout --id=DEC-01 --choice="at shipment" [--status=included] [--by=jaime]
 *   aioson decision:list . --feature=checkout [--json]
 */

const { resolveTargetDir } = require('../lib/project-root');
const { addDecision, resolveDecision, readDecisionCheckpoint } = require('../lib/decision-checkpoint');

function featureOf(options) {
  const slug = options.feature || options.slug;
  return slug ? String(slug).trim() : null;
}

function splitOptions(value) {
  return String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
}

async function runDecisionAdd({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const slug = featureOf(options);
  try {
    const result = await addDecision(targetDir, slug, {
      id: options.id ? String(options.id).trim() : null,
      question: options.question,
      classification: options.class || options.classification || 'blocking-decision',
      evidence: options.evidence,
      omissionConsequence: options.consequence || options['omission-consequence'],
      recommendation: options.recommendation,
      options: splitOptions(options.options),
      owner: options.owner ? String(options.owner).trim() : 'human',
      raisedBy: options.by ? String(options.by).trim() : null
    });
    const payload = { ok: true, feature: slug, item: result.item, checkpoint_status: result.status, path: result.path };
    if (options.json) return payload;
    logger.log(`decision:add — ${slug} ${result.item.id} recorded (${result.item.classification}, ${result.item.status}); checkpoint ${result.status}`);
    if (result.status === 'pending') logger.log('  workflow:next will not advance this feature until a human runs decision:resolve (or passes --force).');
    return payload;
  } catch (error) {
    const failure = { ok: false, feature: slug, error: error.message };
    if (options.json) return { ...failure, exitCode: 1 };
    logger.error(`decision:add failed: ${error.message}`);
    return { ...failure, exitCode: 1 };
  }
}

async function runDecisionResolve({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const slug = featureOf(options);
  try {
    const result = await resolveDecision(targetDir, slug, {
      id: options.id ? String(options.id).trim() : null,
      choice: options.choice,
      status: options.status ? String(options.status).trim() : 'included',
      by: options.by ? String(options.by).trim() : null
    });
    const payload = { ok: true, feature: slug, item: result.item, checkpoint_status: result.status, path: result.path };
    if (options.json) return payload;
    logger.log(`decision:resolve — ${slug} ${result.item.id} → ${result.item.status} (${result.item.resolution.choice}) by ${result.item.resolution.by}; checkpoint ${result.status}`);
    return payload;
  } catch (error) {
    const failure = { ok: false, feature: slug, error: error.message };
    if (options.json) return { ...failure, exitCode: 1 };
    logger.error(`decision:resolve failed: ${error.message}`);
    return { ...failure, exitCode: 1 };
  }
}

async function runDecisionList({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const slug = featureOf(options);
  if (!slug) {
    const failure = { ok: false, error: 'missing_feature' };
    if (options.json) return { ...failure, exitCode: 1 };
    logger.error('Usage: aioson decision:list [path] --feature=<slug> [--json]');
    return { ...failure, exitCode: 1 };
  }
  const current = await readDecisionCheckpoint(targetDir, slug);
  const items = current.checkpoint ? current.checkpoint.items : [];
  const payload = {
    ok: true,
    feature: slug,
    exists: current.exists,
    valid: current.ok,
    errors: current.errors || [],
    status: current.checkpoint ? current.checkpoint.status : 'clear',
    pending: current.pending.map((item) => item.id),
    items
  };
  if (options.json) return payload;
  if (!current.exists) {
    logger.log(`decision:list — ${slug}: no decision checkpoint (nothing pending)`);
    return payload;
  }
  logger.log(`decision:list — ${slug}: ${payload.status}${payload.pending.length ? ` (${payload.pending.length} pending)` : ''}${current.ok ? '' : ` — INVALID: ${current.errors.join('; ')}`}`);
  for (const item of items) {
    const resolution = item.resolution ? ` → ${item.resolution.choice} (${item.resolution.by}, ${item.resolution.at})` : '';
    logger.log(`  ${item.status === 'pending' ? '◻' : '◼'} ${item.id} [${item.classification}/${item.status}] ${item.question || ''}${resolution}`);
    if (item.status === 'pending') logger.log(`      recommendation: ${item.recommendation}`);
  }
  return payload;
}

module.exports = { runDecisionAdd, runDecisionResolve, runDecisionList };
