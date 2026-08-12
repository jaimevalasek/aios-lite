'use strict';

/**
 * Static test-report linter — the deterministic half of the Tester contract.
 *
 * The tester's value is adversarial depth, but until now the only machine-checked
 * part of its output was the bounded-correction packet (review-cycle:advance).
 * This lint makes the coverage side measurable: the hypothesis matrix proves the
 * tester *enumerated* boundary/failure/property cases per tested path, and the
 * residual-risk section makes stopping short of full coverage a named decision
 * instead of a silent default. Same trade as prd-lint and briefing-lint: pure
 * RegExp over the text, issues are provable defects, warnings are measurements a
 * reviewer judges in context. Whether each hypothesis actually bites — and
 * whether the delivered behavior passes — stays with the agent and with QA.
 */

const HARD_PLACEHOLDER = /\bTODO\b|\bFIXME\b|Lorem ipsum|\[count\]|\[low\/medium\/high/;

const MANDATORY_SECTIONS = [
  'Scope',
  'Hypothesis matrix',
  'Tests added or changed',
  'Commands and results',
  'Residual risk'
];

const HYPOTHESIS_CLASSES = ['boundary', 'invariant', 'state-transition', 'failure', 'regression', 'property'];

// A result marker, not a success marker: a tester report that reproduces a
// defect legitimately records FAIL and routes it to Dev.
const COMMAND_RUNNER = /\b(?:npm|node|npx|pnpm|yarn|bun|cargo|pytest|python|go|dotnet|make|php|composer|mvn|gradle|forge)\b/i;
const COMMAND_RESULT = /\b(?:PASS(?:ED)?|FAIL(?:ED)?|exit(?: code)?\s*[:=]?\s*\d+|success|error)\b/i;

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

function normalizeClass(cell) {
  return String(cell || '')
    .replace(/[`[\]]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * @param {object} inputs
 * @param {string} inputs.report  text of .aioson/context/test-report-{slug}.md
 * @param {string} inputs.slug
 * @returns {{ issues: string[], warnings: string[], metrics: object }}
 */
function analyzeTestReport({ report, slug }) {
  const text = String(report || '');
  const issues = [];
  const warnings = [];

  // ── frontmatter identity ──
  const fm = parseFrontmatter(text);
  if (Object.keys(fm).length === 0) {
    issues.push('test report has no YAML frontmatter (`feature: {slug}`)');
  } else {
    const feature = (fm.feature || '').replace(/^["']|["']$/g, '');
    if (!feature) issues.push('frontmatter is missing `feature`');
    else if (slug && feature !== slug) issues.push(`frontmatter feature "${feature}" does not match the report slug "${slug}"`);
  }

  // ── mandatory sections ──
  const present = [];
  const missing = [];
  for (const title of MANDATORY_SECTIONS) {
    if (sectionBody(text, title) === null) missing.push(title);
    else present.push(title);
  }
  for (const title of missing) issues.push(`mandatory section missing: ## ${title}`);

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

  // ── hypothesis matrix ──
  const matrixBody = sectionBody(text, 'Hypothesis matrix');
  const byClass = Object.fromEntries(HYPOTHESIS_CLASSES.map((c) => [c, 0]));
  let rowsTotal = 0;
  let invalidClassRows = 0;
  if (matrixBody !== null) {
    const table = parseFirstTable(matrixBody);
    if (!table) {
      issues.push('## Hypothesis matrix must contain a Markdown table (`| Path | Class | Test | Result |`)');
    } else {
      const headerLower = table.header.map((cell) => cell.toLowerCase());
      const missingColumns = ['path', 'class', 'test', 'result'].filter((col) => !headerLower.includes(col));
      if (missingColumns.length > 0) {
        issues.push(`hypothesis matrix missing column(s): ${missingColumns.join(', ')}`);
      } else {
        const classIndex = headerLower.indexOf('class');
        rowsTotal = table.rows.length;
        for (const row of table.rows) {
          const cls = normalizeClass(row[classIndex]);
          if (HYPOTHESIS_CLASSES.includes(cls)) byClass[cls] += 1;
          else {
            invalidClassRows += 1;
            issues.push(`hypothesis row with invalid class "${row[classIndex] || ''}" (${HYPOTHESIS_CLASSES.join('|')})`);
          }
        }
        if (rowsTotal === 0) {
          warnings.push('hypothesis matrix has no rows — verify the tested scope genuinely produced no hypotheses');
        } else if (byClass.boundary === 0 && byClass.failure === 0) {
          warnings.push('hypothesis matrix has no boundary or failure class — adversarial depth is the default on critical paths');
        }
      }
    }
  }

  // ── executed-command evidence ──
  const commandsBody = sectionBody(text, 'Commands and results');
  const hasCommandEvidence = commandsBody !== null
    && COMMAND_RUNNER.test(commandsBody)
    && COMMAND_RESULT.test(commandsBody);
  if (commandsBody !== null && !hasCommandEvidence) {
    issues.push('## Commands and results must record at least one exact executed command with its observed result');
  }

  // ── residual risk ──
  const residualBody = sectionBody(text, 'Residual risk');
  const residualEntries = residualBody === null
    ? 0
    : residualBody.split(/\r?\n/).filter((line) => /^\s*(?:[-*]|\d+\.)\s+\S/.test(line)).length;
  if (residualBody !== null && residualEntries === 0) {
    warnings.push('empty residual risk claims the tested scope is fully proven — verify that is intended');
  }

  // ── placeholder discipline ──
  if (HARD_PLACEHOLDER.test(text)) {
    issues.push('test report contains an unfilled placeholder (TODO/FIXME/template token)');
  }
  if (/\bTBD\b/.test(text)) {
    warnings.push('test report contains TBD — a test report records what ran, not what is pending');
  }

  // ── correction packet (optional, but complete when present) ──
  const packetBody = sectionBody(text, 'Correction packet');
  if (packetBody !== null && !/allowed_fix_paths/.test(packetBody)) {
    issues.push('## Correction packet is missing `allowed_fix_paths` — review-cycle:advance will reject it');
  }

  return {
    issues,
    warnings,
    metrics: {
      sections_present: present.length,
      sections_missing: missing,
      hypotheses_total: rowsTotal,
      hypotheses_by_class: byClass,
      hypotheses_invalid_class: invalidClassRows,
      has_command_evidence: hasCommandEvidence,
      residual_risk_entries: residualEntries,
      has_correction_packet: packetBody !== null
    }
  };
}

module.exports = {
  analyzeTestReport,
  MANDATORY_SECTIONS,
  HYPOTHESIS_CLASSES
};
