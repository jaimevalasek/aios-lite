'use strict';

/**
 * aioson feature:summary — the owner-facing logic summary of a feature, and
 * aioson feature:acknowledge — the human's recorded confirmation that they
 * read it and it matches what they wanted.
 *
 * Every artifact in the chain was machine-verified or agent-approved; no
 * stage ever asked the HUMAN to confirm they understood what was specified and
 * what was built. The decision-presentation skill named the artifact
 * (`executive summary` for the team profile) and nothing wrote it. This
 * renders it deterministically — no model, no prose invented — from the
 * structures the engine already derives: promises, capabilities, acceptance
 * criteria, planned files, pending decisions, code-vs-plan drift, visual
 * evidence, gaps. In the project's interaction language, with framework
 * jargon translated through the same map the skill uses.
 *
 * The acknowledgment is tied to a hash of what was summarized: a summary the
 * artifacts moved past is stale and must be regenerated before anyone can
 * acknowledge it. feature:close reports the state — advisory, never a gate.
 *
 *   aioson feature:summary . --feature=checkout [--write] [--json]
 *   aioson feature:acknowledge . --feature=checkout --by="Jaime" [--note="…"]
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { resolveTargetDir } = require('../lib/project-root');
const { parseFrontmatter } = require('../preflight-engine');
const { analyzeFeatureCompleteness } = require('../lib/feature-completeness');
const { visualEvidenceBlock } = require('../lib/visual-evidence');
const { readDecisionCheckpoint } = require('../lib/decision-checkpoint');

const LABELS = {
  en: {
    title: 'Executive summary',
    intro: 'What this feature promises, what it delivers, how we will know it works — in plain terms, from the recorded artifacts.',
    promises: 'What was asked for',
    promises_empty: 'No source promises were recorded for this feature.',
    covered: 'covered',
    not_covered: 'NOT covered',
    capabilities: 'What it delivers',
    capabilities_empty: 'No capabilities were declared.',
    required: 'required',
    optional: 'optional',
    verified_by: 'Verified by',
    files: 'Planned files',
    acceptance: 'How we will know it works',
    acceptance_empty: 'No acceptance criteria were declared.',
    evidence: 'Evidence',
    decisions: 'Decisions',
    decisions_pending: 'Waiting for a human decision',
    decisions_resolved: 'Decided',
    decisions_empty: 'No decisions were escalated.',
    drift: 'Code vs. plan',
    drift_outside: 'Delivered outside the plan',
    drift_untouched: 'Planned but not touched',
    drift_clean: 'The delivered files match the plan.',
    visual: 'Visual quality',
    architecture: 'Architecture decisions',
    gaps: 'Gaps the tools found',
    gaps_empty: 'No gaps.',
    ack_title: 'Confirmation',
    ack_pending: 'Not yet acknowledged. When this summary matches what you wanted, record it:',
    ack_done: 'Acknowledged by',
    generated: 'Generated',
    recommendation: 'recommendation',
    consequence: 'if left undecided'
  },
  'pt-BR': {
    title: 'Resumo executivo',
    intro: 'O que esta feature promete, o que ela entrega e como saberemos que funciona — em linguagem simples, a partir dos artefatos registrados.',
    promises: 'O que foi pedido',
    promises_empty: 'Nenhuma promessa de origem foi registrada para esta feature.',
    covered: 'coberta',
    not_covered: 'NÃO coberta',
    capabilities: 'O que ela entrega',
    capabilities_empty: 'Nenhuma capacidade foi declarada.',
    required: 'obrigatória',
    optional: 'opcional',
    verified_by: 'Verificada por',
    files: 'Arquivos planejados',
    acceptance: 'Como saberemos que funciona',
    acceptance_empty: 'Nenhum critério de aceite foi declarado.',
    evidence: 'Evidência',
    decisions: 'Decisões',
    decisions_pending: 'Aguardando uma decisão humana',
    decisions_resolved: 'Decididas',
    decisions_empty: 'Nenhuma decisão foi escalada.',
    drift: 'Código vs. plano',
    drift_outside: 'Entregue fora do plano',
    drift_untouched: 'Planejado e não tocado',
    drift_clean: 'Os arquivos entregues batem com o plano.',
    visual: 'Qualidade visual',
    architecture: 'Decisões de arquitetura',
    gaps: 'Lacunas que as ferramentas encontraram',
    gaps_empty: 'Sem lacunas.',
    ack_title: 'Confirmação',
    ack_pending: 'Ainda não confirmado. Quando este resumo corresponder ao que você queria, registre:',
    ack_done: 'Confirmado por',
    generated: 'Gerado em',
    recommendation: 'recomendação',
    consequence: 'se ficar sem decisão'
  }
};

function summaryPath(targetDir, slug) {
  return path.join(targetDir, '.aioson', 'context', `executive-summary-${slug}.md`);
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function projectLanguage(targetDir) {
  const context = readText(path.join(targetDir, '.aioson', 'context', 'project.context.md')) || '';
  const fm = parseFrontmatter(context);
  const lang = String(fm.interaction_language || fm.conversation_language || 'en').replace(/^["']|["']$/g, '').trim();
  return LABELS[lang] ? lang : 'en';
}

/**
 * The jargon map of the decision-presentation skill (terms → translation),
 * read without a YAML library: `  Term:` / `  "Term with spaces":` blocks with
 * a `translation:` line. Empty when the skill is not installed.
 */
function loadJargonMap(targetDir, lang) {
  const file = path.join(targetDir, '.aioson', 'skills', 'process', 'decision-presentation', 'references', `jargon-map.${lang}.yaml`);
  const text = readText(file);
  if (!text) return [];
  const terms = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const term = line.match(/^ {2}(?:"([^"]+)"|([^\s:#][^:]*?)):\s*$/);
    if (term) { current = term[1] || term[2]; continue; }
    const translation = line.match(/^ {4}translation:\s*"?([^"]*?)"?\s*$/);
    if (translation && current) { terms.push({ term: current, translation: translation[1] }); current = null; }
  }
  return terms.filter((entry) => entry.term && entry.translation);
}

function translateJargon(text, terms) {
  let out = text;
  for (const { term, translation } of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, 'g'), `${translation} (${term})`);
  }
  return out;
}

function prdTitle(targetDir, slug) {
  const prd = readText(path.join(targetDir, '.aioson', 'context', `prd-${slug}.md`)) || '';
  const heading = prd.replace(/^---[\s\S]*?---\s*/, '').match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : slug;
}

function readDriftReport(targetDir, slug) {
  const text = readText(path.join(targetDir, '.aioson', 'context', `spec-analyze-${slug}.json`));
  if (!text) return null;
  try { return JSON.parse(text).delivery_drift || null; } catch { return null; }
}

function sourceHash(payload) {
  return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

/** Build the summary's data and text. Pure given the target dir. */
async function buildSummary(targetDir, slug) {
  const lang = projectLanguage(targetDir);
  const L = LABELS[lang];
  const analysis = await analyzeFeatureCompleteness(targetDir, slug, {});
  const lineage = analysis.source_lineage || {};
  const coverage = new Map((lineage.coverage || []).map((row) => [String(row.promise).toUpperCase(), row]));
  const promises = (lineage.promises || []).map((row) => ({ prom: row.promise, intent: row.intent || row.state || '', covered: coverage.has(String(row.promise).toUpperCase()), caps: (coverage.get(String(row.promise).toUpperCase()) || {}).caps || [] }));
  const capRows = (analysis.product_map && analysis.product_map.rows) || [];
  const requiredCaps = new Set(((analysis.product_map && analysis.product_map.requiredCaps) || []).map((c) => c.toUpperCase()));
  const capToAcs = (analysis.acceptance_criteria && analysis.acceptance_criteria.capToAcs) || {};
  const acRows = (analysis.acceptance_criteria && analysis.acceptance_criteria.rows) || [];
  const deliveryRows = (analysis.delivery_plan && analysis.delivery_plan.rows) || [];
  const caps = capRows.map((row) => ({
    cap: row.cap,
    outcome: row.outcome || '',
    required: requiredCaps.has(String(row.cap).toUpperCase()),
    acs: capToAcs[row.cap] || capToAcs[String(row.cap).toLowerCase()] || capToAcs[String(row.cap).toUpperCase()] || [],
    files: deliveryRows.filter((d) => String(d.cap).toUpperCase() === String(row.cap).toUpperCase()).map((d) => d.files).filter(Boolean)
  }));
  const acs = acRows.map((row) => ({ ac: row.ac, caps: row.caps || [], behavior: row.behavior || '', evidence: row.evidence || '' }));
  const gaps = (analysis.findings || []).map((f) => `${f.stage}/${f.check}: ${f.message}`);
  const adrs = ((analysis.architecture_decisions && analysis.architecture_decisions.rows) || []).map((row) => ({ id: row.id, decision: row.decision, alternatives: row.alternatives, consequence: row.consequence }));
  const checkpoint = await readDecisionCheckpoint(targetDir, slug);
  const decisions = checkpoint.checkpoint ? checkpoint.checkpoint.items : [];
  const drift = readDriftReport(targetDir, slug);
  const visual = visualEvidenceBlock(targetDir, slug);
  const data = { slug, lang, promises, caps, acs, gaps, decisions, drift, visual, adrs };
  const hash = sourceHash({ promises, caps, acs, gaps, adrs, decisions: decisions.map((d) => [d.id, d.status, d.resolution && d.resolution.choice]), drift, visual: visual && { summary: visual.summary, implementation: visual.implementation && visual.implementation.summary } });

  const lines = [];
  lines.push(`# ${L.title} — ${prdTitle(targetDir, slug)}`, '', `> ${L.intro}`, '');
  lines.push(`## ${L.promises}`, '');
  if (promises.length === 0) lines.push(`_${L.promises_empty}_`);
  for (const p of promises) lines.push(`- **${p.prom}** — ${p.intent || '—'} · ${p.covered ? L.covered : L.not_covered}${p.caps.length ? ` (${p.caps.join(', ')})` : ''}`);
  lines.push('', `## ${L.capabilities}`, '');
  if (caps.length === 0) lines.push(`_${L.capabilities_empty}_`);
  for (const c of caps) {
    lines.push(`- **${c.cap}** (${c.required ? L.required : L.optional}) — ${c.outcome || '—'}`);
    if (c.acs.length) lines.push(`  - ${L.verified_by}: ${c.acs.join(', ')}`);
    if (c.files.length) lines.push(`  - ${L.files}: ${c.files.join('; ')}`);
  }
  lines.push('', `## ${L.acceptance}`, '');
  if (acs.length === 0) lines.push(`_${L.acceptance_empty}_`);
  for (const a of acs) lines.push(`- **${a.ac}** — ${a.behavior || '—'}${a.evidence ? ` · ${L.evidence}: ${a.evidence}` : ''}`);
  lines.push('', `## ${L.decisions}`, '');
  if (decisions.length === 0) lines.push(`_${L.decisions_empty}_`);
  const pending = decisions.filter((d) => d.status === 'pending');
  const resolved = decisions.filter((d) => d.status !== 'pending');
  if (pending.length) {
    lines.push(`**${L.decisions_pending}:**`);
    for (const d of pending) {
      lines.push(`- ${d.id} — ${d.question || ''}`);
      lines.push(`  - ${L.evidence}: ${d.evidence}`);
      lines.push(`  - ${L.consequence}: ${d.omission_consequence}`);
      lines.push(`  - ${L.recommendation}: ${d.recommendation}${(d.options || []).length ? ` (${d.options.join(' | ')})` : ''}`);
    }
  }
  if (resolved.length) {
    lines.push(`**${L.decisions_resolved}:**`);
    for (const d of resolved) lines.push(`- ${d.id} — ${d.question || ''} → ${d.resolution ? `${d.resolution.choice} (${d.resolution.by})` : d.status}`);
  }
  if (adrs.length > 0) {
    lines.push('', `## ${L.architecture}`, '');
    for (const a of adrs) lines.push(`- **${a.id}** — ${a.decision} · ${a.alternatives} · ${a.consequence}`);
  }
  if (drift) {
    lines.push('', `## ${L.drift}`, '');
    if ((drift.outside || []).length === 0 && (drift.untouched || []).length === 0) lines.push(L.drift_clean);
    if ((drift.outside || []).length) lines.push(`- ${L.drift_outside}: ${drift.outside.join(', ')}`);
    if ((drift.untouched || []).length) lines.push(`- ${L.drift_untouched}: ${drift.untouched.join(', ')}`);
  }
  if (visual) {
    lines.push('', `## ${L.visual}`, '');
    lines.push(`- ${visual.measured ? visual.summary : visual.reason}${visual.stale ? ' (stale)' : ''}`);
    if (visual.implementation) lines.push(`- ${visual.implementation.summary}${visual.implementation.regressed.length ? ` — REGRESSED: ${visual.implementation.regressed.join(', ')}` : ''}`);
  }
  lines.push('', `## ${L.gaps}`, '');
  if (gaps.length === 0) lines.push(L.gaps_empty);
  for (const g of gaps.slice(0, 20)) lines.push(`- ${g}`);
  if (gaps.length > 20) lines.push(`- … +${gaps.length - 20}`);

  const jargon = lang === 'en' ? [] : loadJargonMap(targetDir, lang);
  const body = translateJargon(lines.join('\n'), jargon);
  return { data, hash, lang, body, labels: L };
}

function renderFile({ slug, hash, body, labels, generatedAt, acknowledgedBy = '', acknowledgedAt = '', note = '' }) {
  const ack = acknowledgedBy
    ? `${labels.ack_done}: **${acknowledgedBy}** — ${acknowledgedAt}${note ? ` — ${note}` : ''}`
    : `${labels.ack_pending}\n\n\`\`\`bash\naioson feature:acknowledge . --feature=${slug} --by="<your name>"\n\`\`\``;
  return [
    '---',
    `feature: ${slug}`,
    `generated_at: ${generatedAt}`,
    `source_hash: ${hash}`,
    `acknowledged_by: "${acknowledgedBy}"`,
    `acknowledged_at: "${acknowledgedAt}"`,
    '---',
    '',
    body,
    '',
    `## ${labels.ack_title}`,
    '',
    ack,
    '',
    `_${labels.generated}: ${generatedAt}_`,
    ''
  ].join('\n');
}

/** Current state of the owner summary for a feature: missing | stale | current, plus acknowledgment. */
async function summaryState(targetDir, slug) {
  const file = summaryPath(targetDir, slug);
  const existing = readText(file);
  const built = await buildSummary(targetDir, slug);
  if (!existing) return { state: 'missing', path: file, hash: built.hash, acknowledged: false, built };
  const fm = parseFrontmatter(existing);
  const recordedHash = String(fm.source_hash || '').trim();
  const acknowledgedBy = String(fm.acknowledged_by || '').replace(/^["']|["']$/g, '').trim();
  const stale = recordedHash !== built.hash;
  return {
    state: stale ? 'stale' : 'current',
    path: file,
    hash: built.hash,
    recorded_hash: recordedHash,
    acknowledged: Boolean(acknowledgedBy) && !stale,
    acknowledged_by: acknowledgedBy || null,
    acknowledged_at: String(fm.acknowledged_at || '').replace(/^["']|["']$/g, '').trim() || null,
    built
  };
}

async function runFeatureSummary({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const slug = options.feature ? String(options.feature).trim() : null;
  if (!slug) {
    const failure = { ok: false, reason: 'missing_feature' };
    if (options.json) return { ...failure, exitCode: 1 };
    logger.error('Usage: aioson feature:summary [path] --feature=<slug> [--write] [--json]');
    return { ...failure, exitCode: 1 };
  }
  let state;
  try {
    state = await summaryState(targetDir, slug);
  } catch (error) {
    const failure = { ok: false, reason: 'analysis_failed', error: error.message };
    if (options.json) return { ...failure, exitCode: 1 };
    logger.error(`feature:summary failed: ${error.message}`);
    return { ...failure, exitCode: 1 };
  }
  const generatedAt = new Date().toISOString();
  const rel = path.relative(targetDir, state.path).split(path.sep).join('/');
  const write = Boolean(options.write);
  if (write) {
    // Regenerating keeps an acknowledgment only while the hash is unchanged —
    // a summary the artifacts moved past starts unacknowledged again.
    const keepAck = state.state === 'current' && state.acknowledged;
    fs.mkdirSync(path.dirname(state.path), { recursive: true });
    fs.writeFileSync(state.path, renderFile({
      slug, hash: state.hash, body: state.built.body, labels: state.built.labels, generatedAt,
      acknowledgedBy: keepAck ? state.acknowledged_by : '',
      acknowledgedAt: keepAck ? state.acknowledged_at : ''
    }), 'utf8');
  }
  const result = {
    ok: true,
    feature: slug,
    language: state.built.lang,
    path: rel,
    written: write,
    state: write ? 'current' : state.state,
    source_hash: state.hash,
    acknowledged: write ? (state.state === 'current' && state.acknowledged) : state.acknowledged,
    acknowledged_by: state.acknowledged_by || null,
    summary: state.built.data
  };
  if (options.json) return result;
  if (write) logger.log(`feature:summary — ${slug}: written to ${rel} (${state.built.lang}, hash ${state.hash})${result.acknowledged ? ` — acknowledged by ${state.acknowledged_by}` : ' — not yet acknowledged'}`);
  else {
    logger.log(state.built.body);
    logger.log('');
    logger.log(`(${state.state === 'missing' ? `not written yet — add --write to create ${rel}` : `${rel} is ${state.state}${state.acknowledged ? `, acknowledged by ${state.acknowledged_by}` : ''}`})`);
  }
  return result;
}

async function runFeatureAcknowledge({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const slug = options.feature ? String(options.feature).trim() : null;
  const by = options.by ? String(options.by).trim() : '';
  if (!slug || !by) {
    const failure = { ok: false, reason: !slug ? 'missing_feature' : 'missing_by' };
    if (options.json) return { ...failure, exitCode: 1 };
    logger.error('Usage: aioson feature:acknowledge [path] --feature=<slug> --by="<name>" [--note="…"]');
    return { ...failure, exitCode: 1 };
  }
  let state;
  try {
    state = await summaryState(targetDir, slug);
  } catch (error) {
    const failure = { ok: false, reason: 'analysis_failed', error: error.message };
    if (options.json) return { ...failure, exitCode: 1 };
    logger.error(`feature:acknowledge failed: ${error.message}`);
    return { ...failure, exitCode: 1 };
  }
  const rel = path.relative(targetDir, state.path).split(path.sep).join('/');
  if (state.state !== 'current') {
    // Acknowledging a summary that no longer describes the artifacts would
    // record a confirmation of something the owner never saw.
    const failure = { ok: false, feature: slug, reason: state.state === 'missing' ? 'summary_missing' : 'summary_stale', path: rel, hint: `aioson feature:summary . --feature=${slug} --write` };
    if (options.json) return { ...failure, exitCode: 1 };
    logger.error(`feature:acknowledge refused: ${rel} is ${state.state} — regenerate it first (aioson feature:summary . --feature=${slug} --write), read it, then acknowledge.`);
    return { ...failure, exitCode: 1 };
  }
  const acknowledgedAt = new Date().toISOString();
  const note = options.note ? String(options.note).trim() : '';
  fs.writeFileSync(state.path, renderFile({
    slug, hash: state.hash, body: state.built.body, labels: state.built.labels,
    generatedAt: acknowledgedAt, acknowledgedBy: by, acknowledgedAt, note
  }), 'utf8');
  const result = { ok: true, feature: slug, path: rel, acknowledged_by: by, acknowledged_at: acknowledgedAt, source_hash: state.hash };
  if (options.json) return result;
  logger.log(`feature:acknowledge — ${slug}: acknowledged by ${by} at ${acknowledgedAt} (${rel}, hash ${state.hash})`);
  return result;
}

module.exports = { runFeatureSummary, runFeatureAcknowledge, summaryState, summaryPath, buildSummary, loadJargonMap, translateJargon };
