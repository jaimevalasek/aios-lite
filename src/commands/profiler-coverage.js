'use strict';

/**
 * aioson profiler:coverage — the numeric sufficiency floor of the research
 * report, counted instead of eyeballed.
 *
 * The @profiler-researcher contract pins an explicit floor (≥2 high-value
 * sources spanning ≥3 categories, including ≥1 DECISION and ≥1 WORK-SAMPLE
 * item) and the @profiler-enricher intake re-counts the same tables to build
 * its source-ID inventory. The `kind=research-report` gate only matches
 * headings; this command counts — tier rows, categories with extracted items,
 * the tag histogram, orphan `Source: S<#>` references, and the declared-vs-
 * measured frontmatter delta. A report whose structure cannot be parsed
 * returns `parsed: false` explicitly — never a silent `floor_pass: false`.
 * Grading evidence quality stays with the agents.
 */

const fs = require('node:fs');
const path = require('node:path');

const TIERS = [
  ['high', 'High-Value Sources'],
  ['medium', 'Medium-Value Sources'],
  ['low', 'Low-Value Sources']
];

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

/** Body between a heading (any level) and the next heading of the same or higher level. */
function sectionBody(text, heading, level) {
  const lines = String(text || '').split(/\r?\n/);
  const marker = '#'.repeat(level);
  const re = new RegExp(`^${marker}\\s+(.+?)\\s*$`);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (start === -1) {
      if (match && match[1] === marker && match[2] === heading) start = i + 1;
      continue;
    }
    if (match && match[1].length <= level) return lines.slice(start, i).join('\n');
  }
  return start === -1 ? null : lines.slice(start).join('\n');
}

function tableRows(body) {
  const lines = String(body || '').split(/\r?\n/).filter((line) => /^\s*\|/.test(line));
  if (lines.length < 2) return [];
  const cells = (line) => line.split('|').slice(1, -1).map((cell) => cell.trim());
  return lines
    .slice(1)
    .filter((line) => !/^\s*\|[\s:|-]+\|?\s*$/.test(line))
    .map(cells);
}

async function runProfilerCoverage({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = options.slug ? String(options.slug).trim() : null;
  const rel = options.file
    ? String(options.file).trim()
    : (slug ? `.aioson/profiler-reports/${slug}/research-report.md` : null);
  if (!rel) {
    const failure = { ok: false, reason: 'missing_slug' };
    if (options.json) return failure;
    logger.error('Usage: aioson profiler:coverage [path] --slug=<slug> [--file=<path>] [--json]');
    return { ...failure, exitCode: 1 };
  }

  let text;
  try {
    text = fs.readFileSync(path.resolve(targetDir, rel), 'utf8');
  } catch {
    const failure = { ok: false, reason: 'report_not_found', file: rel };
    if (options.json) return failure;
    logger.error(`profiler:coverage — research report not found: ${rel}`);
    return { ...failure, exitCode: 1 };
  }

  const inventoryBody = sectionBody(text, 'Source Inventory', 2);
  const extractedBody = sectionBody(text, 'Extracted Material by Category', 2);
  if (inventoryBody === null || extractedBody === null) {
    const result = {
      ok: true,
      parsed: false,
      file: rel,
      reason: 'canonical sections not found — load the report and audit it manually (kind=research-report still gates headings)'
    };
    if (options.json) return result;
    logger.log(`profiler:coverage — ${rel}: parsed=false (${result.reason})`);
    return result;
  }

  // ── tier counts + tag histogram + inventory IDs ──
  const sources = { high: 0, medium: 0, low: 0 };
  const tags = {};
  const inventoryIds = new Set();
  for (const [key, heading] of TIERS) {
    const rows = tableRows(sectionBody(inventoryBody, heading, 3));
    sources[key] = rows.length;
    for (const row of rows) {
      const id = String(row[0] || '').trim().replace(/^S/i, '');
      if (/^\d+$/.test(id)) inventoryIds.add(`S${id}`);
      for (const tag of String(row[4] || '').split(/[,;]/).map((value) => value.trim().toUpperCase()).filter(Boolean)) {
        tags[tag] = (tags[tag] || 0) + 1;
      }
    }
  }

  // ── categories with at least one extracted item ──
  const categories = {};
  for (const match of extractedBody.matchAll(/^###\s+(.+?)\s*$/gm)) {
    const name = match[1].toUpperCase();
    const body = sectionBody(extractedBody, match[1], 3) || '';
    const items = (body.match(/^####\s+/gm) || []).length;
    categories[name] = items;
  }
  const categoriesCovered = Object.entries(categories).filter(([, count]) => count > 0).map(([name]) => name);

  // ── orphan Source refs ──
  const orphanRefs = [];
  for (const match of extractedBody.matchAll(/^\s*-\s*Source:\s*(.+)$/gm)) {
    for (const ref of String(match[1]).match(/S\d+/gi) || []) {
      const canonical = ref.toUpperCase();
      if (!inventoryIds.has(canonical) && !orphanRefs.includes(canonical)) orphanRefs.push(canonical);
    }
  }

  // ── the contract's numeric floor ──
  const decisions = categories.DECISIONS || 0;
  const workSamples = (tags['WORK-SAMPLE'] || 0) + (tags.WORKSAMPLE || 0);
  const floor = {
    high_value_min_2: sources.high >= 2,
    categories_min_3: categoriesCovered.length >= 3,
    decision_min_1: decisions >= 1,
    work_sample_min_1: workSamples >= 1
  };
  const floorPass = Object.values(floor).every(Boolean);

  // ── declared vs measured ──
  const fm = parseFrontmatter(text);
  const declaredSources = Number(fm.sources_found);
  const declaredHigh = Number(fm.high_value_sources);
  const measuredTotal = sources.high + sources.medium + sources.low;
  const frontmatterDelta = {};
  if (Number.isFinite(declaredSources) && declaredSources !== measuredTotal) {
    frontmatterDelta.sources_found = { declared: declaredSources, measured: measuredTotal };
  }
  if (Number.isFinite(declaredHigh) && declaredHigh !== sources.high) {
    frontmatterDelta.high_value_sources = { declared: declaredHigh, measured: sources.high };
  }

  const result = {
    ok: true,
    parsed: true,
    file: rel,
    sources,
    sources_total: measuredTotal,
    categories,
    categories_covered: categoriesCovered,
    tags,
    orphan_source_refs: orphanRefs,
    inventory_ids: inventoryIds.size,
    floor,
    floor_pass: floorPass,
    frontmatter_delta: frontmatterDelta
  };
  if (options.json) return result;

  logger.log(`profiler:coverage — ${rel}: floor ${floorPass ? 'PASS' : 'BELOW'} (${sources.high} high / ${sources.medium} medium / ${sources.low} low; ${categoriesCovered.length} categorie(s) with items)`);
  for (const [check, pass] of Object.entries(floor)) {
    logger.log(`  ${pass ? 'ok  ' : 'MISS'} ${check}`);
  }
  if (orphanRefs.length) logger.log(`  orphan Source refs: ${orphanRefs.join(', ')}`);
  for (const [field, delta] of Object.entries(frontmatterDelta)) {
    logger.log(`  frontmatter ${field}: declared ${delta.declared}, measured ${delta.measured}`);
  }
  return result;
}

module.exports = { runProfilerCoverage };
