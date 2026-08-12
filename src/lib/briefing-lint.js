'use strict';

/**
 * Static briefing linter — the deterministic half of the Briefing contract.
 *
 * The briefing is where SRC-* and PROM-* lineage and the eight-section
 * skeleton are born, but until now their first mechanical check happened two agents
 * later, in Sheldon's preflight. Every bullet of the canonical-artifact
 * contract that is mechanically checkable is checked here so the handoff
 * never rests on the model having remembered to check it: frontmatter
 * identity, the eight mandatory sections, open-question classification,
 * placeholder discipline, and the config.md registry entry. Same trade as
 * prd-lint: pure RegExp over the text, issues are provable defects, warnings
 * are measurements a reviewer judges in context. What needs judgment (does
 * each promise faithfully represent its source? is uncertainty honestly
 * preserved?) deliberately stays with the agent.
 */

// The canonical placeholder sentence is legal briefing vocabulary ("Use
// `TBD — not discussed in this session.` when evidence is absent"), so the
// blanket \bTBD\b ban other artifacts use cannot apply here. A TBD followed
// by an em-dash continuation is deliberate; a bare TBD is a leftover.
const HARD_PLACEHOLDER = /\bTODO\b|\bFIXME\b|Lorem ipsum|\[Full Name\]|\[count\]|\[low\/medium\/high/;

const MANDATORY_SECTIONS = [
  'Context',
  'Problem',
  'Proposed solution',
  'Themes',
  'Risks',
  'Identified gaps',
  'Sources',
  'Open questions'
];

const QUESTION_CLASSES = ['research-able', 'testable', 'decision-required', 'out-of-scope'];
const REGISTRY_STATUSES = new Set(['draft', 'approved', 'implemented']);

function parseFrontmatter(text) {
  const match = String(text || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = {};
  if (!match) return out;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

/** Body of the first `## <heading>` section exactly matching `title`, or null. */
function sectionBody(text, title) {
  const lines = String(text || '').split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^##\s+(.+?)\s*$/);
    if (start === -1 && heading && heading[1] === title) {
      start = i + 1;
      continue;
    }
    if (start !== -1 && /^##\s+/.test(lines[i])) {
      return lines.slice(start, i).join('\n');
    }
  }
  return start === -1 ? null : lines.slice(start).join('\n');
}

/** The registry block for one slug inside config.md's YAML list, or null. */
function registryEntry(configText, slug) {
  const text = String(configText || '');
  const re = new RegExp(`-\\s+slug:\\s*["']?${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\s*$`, 'm');
  const match = text.match(re);
  if (!match) return null;
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const next = rest.search(/^\s*-\s+slug:/m);
  return next === -1 ? rest : rest.slice(0, next);
}

/**
 * @param {object} inputs
 * @param {string} inputs.briefing  text of .aioson/briefings/{slug}/briefings.md
 * @param {string} [inputs.config]  text of .aioson/briefings/config.md
 * @param {string} inputs.slug
 * @returns {{ issues: string[], warnings: string[], metrics: object }}
 */
function analyzeBriefing({ briefing, config = '', slug }) {
  const text = String(briefing || '');
  const issues = [];
  const warnings = [];

  // ── frontmatter identity ──
  const fm = parseFrontmatter(text);
  if (Object.keys(fm).length === 0) {
    issues.push('briefing has no YAML frontmatter (slug, dates, source_plans)');
  } else {
    const fmSlug = (fm.slug || '').replace(/^["']|["']$/g, '');
    if (!fmSlug) issues.push('frontmatter is missing `slug`');
    else if (slug && fmSlug !== slug) issues.push(`frontmatter slug "${fmSlug}" does not match the briefing directory "${slug}"`);
    if (!fm.created_at) warnings.push('frontmatter is missing `created_at`');
    if (!fm.updated_at) warnings.push('frontmatter is missing `updated_at`');
    if (!('source_plans' in fm)) warnings.push('frontmatter is missing `source_plans` (use [] for a conversational briefing)');
  }

  // ── the eight mandatory sections ──
  const present = [];
  const missing = [];
  for (const title of MANDATORY_SECTIONS) {
    if (sectionBody(text, title) === null) missing.push(title);
    else present.push(title);
  }
  for (const title of missing) issues.push(`mandatory section missing: ## ${title}`);

  // Out-of-order sections are provable but tolerable — the contract cares
  // that each section exists and is findable.
  if (missing.length === 0) {
    const order = [];
    for (const line of text.split(/\r?\n/)) {
      const heading = line.match(/^##\s+(.+?)\s*$/);
      if (heading && MANDATORY_SECTIONS.includes(heading[1])) order.push(heading[1]);
    }
    if (order.join('|') !== MANDATORY_SECTIONS.join('|')) {
      warnings.push('mandatory sections are present but not in the canonical order');
    }
  }

  // ── open-question classification ──
  const questionsBody = sectionBody(text, 'Open questions') || '';
  const numbered = questionsBody.split(/\r?\n/).filter((line) => /^\s*\d+\.\s+\S/.test(line));
  const classRe = new RegExp(`\\[(${QUESTION_CLASSES.join('|')})\\]`);
  const byClass = Object.fromEntries(QUESTION_CLASSES.map((c) => [c, 0]));
  let unclassified = 0;
  for (const line of numbered) {
    const match = line.match(classRe);
    if (match) byClass[match[1]] += 1;
    else {
      unclassified += 1;
      issues.push(`open question without a classification tag: "${line.trim().slice(0, 80)}"`);
    }
  }
  if (sectionBody(text, 'Open questions') !== null && numbered.length === 0) {
    warnings.push('no numbered open questions recorded — verify the feature genuinely has none');
  }

  // ── placeholder discipline ──
  if (HARD_PLACEHOLDER.test(text)) {
    issues.push('briefing contains an unfilled placeholder (TODO/FIXME/template token)');
  }
  const tbdAll = (text.match(/\bTBD\b/g) || []).length;
  const tbdCanonical = (text.match(/\bTBD\s*—/g) || []).length;
  if (tbdAll > tbdCanonical) {
    warnings.push(`bare TBD without the canonical "TBD — not discussed in this session." form (${tbdAll - tbdCanonical}x)`);
  }
  for (const title of ['Problem', 'Proposed solution']) {
    const body = (sectionBody(text, title) || '').trim();
    if (body && /^TBD\b/.test(body) && body.split(/\r?\n/).filter((l) => l.trim()).length === 1) {
      warnings.push(`## ${title} is still TBD — the briefing cannot hand off on an unstated ${title.toLowerCase()}`);
    }
  }

  // ── registry entry ──
  let registryStatus = null;
  if (String(config || '').trim()) {
    const entry = registryEntry(config, slug);
    if (!entry) {
      issues.push(`.aioson/briefings/config.md has no registry entry for slug "${slug}"`);
    } else {
      const statusMatch = entry.match(/^\s*status:\s*["']?([\w-]+)["']?\s*$/m);
      registryStatus = statusMatch ? statusMatch[1] : null;
      if (!registryStatus) issues.push(`registry entry for "${slug}" has no status`);
      else if (!REGISTRY_STATUSES.has(registryStatus)) issues.push(`registry entry for "${slug}" has invalid status "${registryStatus}" (draft|approved|implemented)`);
    }
  } else {
    warnings.push('.aioson/briefings/config.md is missing or empty — registry entry not verified');
  }

  // ── lineage surface presence (measured; bijections belong to the lineage analyzer) ──
  const sourcesBody = sectionBody(text, 'Sources') || '';
  const hasInventory = /###\s+Source Inventory/.test(sourcesBody);
  const hasPromiseMap = /###\s+Source Promise Map/.test(sourcesBody);

  return {
    issues,
    warnings,
    metrics: {
      sections_present: present.length,
      sections_missing: missing,
      open_questions_total: numbered.length,
      open_questions_by_class: byClass,
      open_questions_unclassified: unclassified,
      tbd_total: tbdAll,
      tbd_noncanonical: tbdAll - tbdCanonical,
      has_source_inventory: hasInventory,
      has_promise_map: hasPromiseMap,
      registry_status: registryStatus
    }
  };
}

module.exports = {
  analyzeBriefing,
  parseFrontmatter,
  MANDATORY_SECTIONS,
  QUESTION_CLASSES
};
