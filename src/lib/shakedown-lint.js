'use strict';

/**
 * Static shakedown-report linter — the deterministic half of the Shakedown
 * contract.
 *
 * The shakedown's value is the spec-blind walkthrough; until now its output
 * contract (frontmatter enums, the Coverage table, punch-list row discipline,
 * and the "Not visited empty ⇔ complete run" invariant) was self-policed by
 * the agent, and the `agent:done --file=…` it already threads was a no-op
 * because no `kind=shakedown` existed. Same trade as test-report-lint: pure
 * RegExp over the text, issues are provable defects, warnings are measurements
 * a reviewer judges in context. Whether an absence is a real gap — and the
 * walkthrough itself — stay with the agent.
 */

const HARD_PLACEHOLDER = /\bTODO\b|\bFIXME\b|Lorem ipsum|\{slug\}|\{target\}|\{visited\}|\{inventoried\}|\{n\}\b/;

const MANDATORY_SECTIONS = ['Coverage', 'Punch list', 'Quick wins', 'Not visited'];
const MODES = ['post-qa', 'archived', 'simple-plan', 'direct'];
const RUN_KINDS = ['runtime', 'static'];
const FINDING_CLASSES = ['bug', 'incomplete', 'polish'];
const LANES = ['simple-plan', 'feature', 'briefing'];

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

/** First markdown table in `body` as { header: string[], rows: string[][] }, or null. */
function parseFirstTable(body) {
  const lines = String(body || '').split(/\r?\n/).filter((line) => /^\s*\|/.test(line));
  if (lines.length < 2) return null;
  const cells = (line) => line.split('|').slice(1, -1).map((cell) => cell.trim());
  const header = cells(lines[0]);
  const rows = lines
    .slice(1)
    .filter((line) => !/^\s*\|[\s:|-]+\|?\s*$/.test(line))
    .map(cells);
  return { header, rows };
}

function normalizeEnum(cell) {
  return String(cell || '').replace(/[`[\]]/g, '').trim().toLowerCase();
}

function isEmptyCell(cell) {
  const v = String(cell || '').trim();
  return v === '' || v === '-' || v === '—' || v === '...' || v === '…';
}

/** List items / table data rows in a section body — the "entries" of Not visited. */
function countEntries(body) {
  if (body === null) return 0;
  let count = 0;
  for (const line of String(body).split(/\r?\n/)) {
    if (/^\s*(?:[-*]|\d+\.)\s+\S/.test(line)) count += 1;
    else if (/^\s*\|/.test(line) && !/^\s*\|[\s:|-]+\|?\s*$/.test(line)) count += 1;
  }
  // A table's header row is not an entry.
  const tableLines = String(body).split(/\r?\n/).filter((l) => /^\s*\|/.test(l));
  if (tableLines.length >= 2) count -= 1;
  return Math.max(0, count);
}

/**
 * @param {object} inputs
 * @param {string} inputs.report  text of .aioson/context/shakedown-{slug}.md
 * @param {string|null} [inputs.slug]
 * @returns {{ issues: string[], warnings: string[], metrics: object }}
 */
function analyzeShakedown({ report, slug = null }) {
  const text = String(report || '');
  const issues = [];
  const warnings = [];

  // ── frontmatter identity and enums ──
  const fm = parseFrontmatter(text);
  let visited = null;
  let inventoried = null;
  if (Object.keys(fm).length === 0) {
    issues.push('shakedown report has no YAML frontmatter (`target/mode/run/coverage`)');
  } else {
    if (!fm.target) issues.push('frontmatter is missing `target`');
    else if (slug && fm.target !== slug) warnings.push(`frontmatter target "${fm.target}" differs from the report slug "${slug}"`);

    const mode = normalizeEnum(fm.mode);
    if (!fm.mode) issues.push('frontmatter is missing `mode`');
    else if (!MODES.includes(mode)) issues.push(`frontmatter mode "${fm.mode}" is not one of ${MODES.join('|')}`);

    const run = normalizeEnum(fm.run);
    if (!fm.run) issues.push('frontmatter is missing `run`');
    else if (!RUN_KINDS.includes(run)) issues.push(`frontmatter run "${fm.run}" is not one of ${RUN_KINDS.join('|')}`);

    const coverage = String(fm.coverage || '').match(/^(\d+)\s*\/\s*(\d+)(?:\s+surfaces)?$/);
    if (!fm.coverage) issues.push('frontmatter is missing `coverage` (`{visited}/{inventoried} surfaces`)');
    else if (!coverage) issues.push(`frontmatter coverage "${fm.coverage}" must match \`{visited}/{inventoried} surfaces\``);
    else {
      visited = Number(coverage[1]);
      inventoried = Number(coverage[2]);
      if (visited > inventoried) issues.push(`coverage ${visited}/${inventoried} — visited cannot exceed inventoried`);
      if (inventoried === 0) issues.push('coverage declares zero inventoried surfaces — the surface inventory is the coverage contract');
    }
  }

  // ── mandatory sections ──
  for (const title of MANDATORY_SECTIONS) {
    if (sectionBody(text, title) === null) issues.push(`mandatory section missing: ## ${title}`);
  }

  // ── coverage table arithmetic ──
  const coverageBody = sectionBody(text, 'Coverage');
  let coverageRows = 0;
  let visitedRows = 0;
  if (coverageBody !== null) {
    const table = parseFirstTable(coverageBody);
    if (!table) {
      issues.push('## Coverage must contain a Markdown table (`| Surface | Visited | Verdict |`)');
    } else {
      const headerLower = table.header.map((cell) => cell.toLowerCase());
      const missingColumns = ['surface', 'visited', 'verdict'].filter((col) => !headerLower.includes(col));
      if (missingColumns.length > 0) {
        issues.push(`coverage table missing column(s): ${missingColumns.join(', ')}`);
      } else {
        const visitedIndex = headerLower.indexOf('visited');
        coverageRows = table.rows.length;
        visitedRows = table.rows.filter((row) => /^(yes|y|✓|x|true|sim)$/i.test(normalizeEnum(row[visitedIndex]))).length;
        if (coverageRows === 0) {
          issues.push('coverage table has no rows — every inventoried surface must appear');
        } else if (inventoried !== null && coverageRows !== inventoried) {
          issues.push(`coverage table has ${coverageRows} row(s) but frontmatter declares ${inventoried} inventoried surface(s)`);
        }
        if (visited !== null && coverageRows > 0 && visitedRows !== visited) {
          issues.push(`coverage table marks ${visitedRows} surface(s) visited but frontmatter declares ${visited}`);
        }
      }
    }
  }

  // ── punch-list row discipline ──
  const punchBody = sectionBody(text, 'Punch list');
  const byClass = Object.fromEntries(FINDING_CLASSES.map((c) => [c, 0]));
  let punchTotal = 0;
  if (punchBody !== null) {
    const table = parseFirstTable(punchBody);
    if (!table) {
      issues.push('## Punch list must contain a Markdown table (`| ID | Class | Surface | Finding | Evidence | Suggested lane |`)');
    } else {
      const headerLower = table.header.map((cell) => cell.toLowerCase());
      const missingColumns = ['id', 'class', 'surface', 'finding', 'evidence'].filter((col) => !headerLower.includes(col));
      const laneIndex = headerLower.findIndex((cell) => cell.includes('lane'));
      if (missingColumns.length > 0 || laneIndex === -1) {
        const missing = [...missingColumns, ...(laneIndex === -1 ? ['suggested lane'] : [])];
        issues.push(`punch list missing column(s): ${missing.join(', ')}`);
      } else {
        const idIndex = headerLower.indexOf('id');
        const classIndex = headerLower.indexOf('class');
        const evidenceIndex = headerLower.indexOf('evidence');
        punchTotal = table.rows.length;
        for (const row of table.rows) {
          const id = String(row[idIndex] || '').trim();
          const cls = normalizeEnum(row[classIndex]);
          const lane = normalizeEnum(row[laneIndex]);
          if (!/^SHK-\d+$/.test(id)) issues.push(`punch-list row with invalid ID "${id}" (expected SHK-<n>)`);
          if (!FINDING_CLASSES.includes(cls)) {
            issues.push(`punch-list row ${id || '(no id)'} with invalid class "${row[classIndex] || ''}" (${FINDING_CLASSES.join('|')})`);
          } else {
            byClass[cls] += 1;
            if (cls === 'bug' && isEmptyCell(row[evidenceIndex])) {
              issues.push(`punch-list bug ${id || '(no id)'} has no reproduction evidence — \`bug\` requires exact repro steps`);
            }
            if (cls === 'incomplete' && isEmptyCell(row[evidenceIndex])) {
              issues.push(`punch-list finding ${id || '(no id)'} has no evidence — \`incomplete\` requires the convention evidence`);
            }
          }
          if (!LANES.includes(lane)) {
            issues.push(`punch-list row ${id || '(no id)'} with invalid suggested lane "${row[laneIndex] || ''}" (${LANES.join('|')})`);
          }
        }
        if (punchTotal === 0) {
          warnings.push('punch list is empty — verify the walkthrough genuinely found nothing');
        }
      }
    }
  }

  // ── "Not visited empty ⇔ complete run" invariant ──
  const notVisitedBody = sectionBody(text, 'Not visited');
  const notVisitedEntries = countEntries(notVisitedBody);
  if (notVisitedBody !== null && visited !== null && inventoried !== null) {
    if (visited === inventoried && notVisitedEntries > 0) {
      issues.push(`run declared complete (${visited}/${inventoried}) but ## Not visited lists ${notVisitedEntries} surface(s)`);
    }
    if (visited < inventoried && notVisitedEntries === 0) {
      issues.push(`coverage is ${visited}/${inventoried} but ## Not visited is empty — each unvisited surface needs its reason`);
    }
    if (visited < inventoried && notVisitedEntries > 0 && notVisitedEntries !== inventoried - visited) {
      warnings.push(`## Not visited lists ${notVisitedEntries} surface(s) but coverage implies ${inventoried - visited}`);
    }
  }

  // ── placeholder discipline ──
  if (HARD_PLACEHOLDER.test(text)) {
    issues.push('shakedown report contains an unfilled placeholder (TODO/FIXME/template token)');
  }

  return {
    issues,
    warnings,
    metrics: {
      target: fm.target || null,
      mode: normalizeEnum(fm.mode) || null,
      run: normalizeEnum(fm.run) || null,
      surfaces_inventoried: inventoried,
      surfaces_visited: visited,
      coverage_rows: coverageRows,
      coverage_visited_rows: visitedRows,
      punch_total: punchTotal,
      punch_by_class: byClass,
      not_visited_entries: notVisitedEntries
    }
  };
}

module.exports = {
  analyzeShakedown,
  MANDATORY_SECTIONS,
  FINDING_CLASSES,
  LANES
};
