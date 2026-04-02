'use strict';

/**
 * Squad 4-tier verification gate
 *
 * Verifies task deliverables beyond pass/fail:
 *
 *   Tier 1 — Exists:       File/path exists on disk
 *   Tier 2 — Substantive:  Not a stub/placeholder (min lines + anti-pattern scan)
 *   Tier 3 — Wired:        Referenced/imported in expected target location
 *   Tier 4 — Functional:   Smoke command returns expected output (opt-in, expensive)
 *
 * Used by reflection.js when a task has a `must_haves` contract.
 */

const fs = require('node:fs/promises');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

// Patterns that indicate a file is a stub, not real implementation
const ANTI_PATTERNS = [
  { pattern: /\bTODO\b/,                              label: 'TODO marker'           },
  { pattern: /\bFIXME\b/,                             label: 'FIXME marker'          },
  { pattern: /\bplaceholder\b/i,                      label: 'placeholder text'      },
  { pattern: /not\s+implemented/i,                    label: '"not implemented"'     },
  { pattern: /return\s+null;\s*\n?\s*\}/m,            label: 'empty return null'     },
  { pattern: /throw\s+new\s+Error\s*\(['"]not\s+impl/i, label: 'NotImplemented throw' },
  { pattern: /^\s*pass\s*$/m,                         label: 'Python stub (pass)'    },
  { pattern: /^\s*\.\.\.\s*$/m,                       label: 'ellipsis stub'         }
];

// ─── Artifact string parser ───────────────────────────────────────────────────

/**
 * Parse an artifact descriptor string into structured fields.
 *
 * Examples:
 *   "src/routes/auth.ts"
 *   "src/routes/auth.ts (>50 lines)"
 *   "src/routes/auth.ts (>50 lines, exports router)"
 *
 * Returns: { filePath, minLines, wiredPattern }
 */
function parseArtifact(str, projectDir) {
  const s = String(str).trim();

  // Extract optional annotations in parentheses
  const parenMatch = s.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
  const rawPath = parenMatch ? parenMatch[1].trim() : s;
  const annotations = parenMatch ? parenMatch[2] : '';

  // Build absolute path (relative to projectDir if given)
  const filePath = projectDir
    ? require('node:path').resolve(projectDir, rawPath)
    : rawPath;

  // Parse min lines: ">50 lines" or "50 lines"
  const linesMatch = annotations.match(/>?\s*(\d+)\s+lines?/i);
  const minLines = linesMatch ? parseInt(linesMatch[1], 10) : 5;

  // Parse wired pattern: any text after "exports" or "imports" or "registers"
  const wiredMatch = annotations.match(/(?:exports?|imports?|registers?)\s+(.+)/i);
  const wiredPattern = wiredMatch ? wiredMatch[1].trim() : null;

  return { filePath, rawPath, minLines, wiredPattern };
}

/**
 * Parse a key_link descriptor string.
 *
 * Example: "auth router registered in src/app.ts"
 * Returns: { pattern, inFile }
 *
 * Pattern is extracted heuristically from the string.
 */
function parseKeyLink(str, projectDir) {
  const path = require('node:path');
  const s = String(str).trim();

  // Pattern: "<thing> in <filepath>" or "<thing> registered/imported/used in <filepath>"
  const inMatch = s.match(/^(.+?)\s+(?:in|from|inside)\s+(\S+\.(?:ts|js|tsx|jsx|py|rb|go|java|php|vue|svelte))\s*$/i);
  if (inMatch) {
    const rawFile = inMatch[2].trim();
    const inFile = projectDir ? path.resolve(projectDir, rawFile) : rawFile;

    // Extract meaningful keywords from the pattern part (first 3 significant words)
    const patternWords = inMatch[1]
      .replace(/\b(?:registered|imported|used|exported|referenced|wired|connected|added)\b/gi, '')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 3);

    return { pattern: patternWords.join('|'), inFile, rawFile };
  }

  return null;
}

// ─── Tier implementations ─────────────────────────────────────────────────────

/** Tier 1: file exists on disk */
async function verifyExists(filePath) {
  try {
    await fs.access(filePath);
    return { passed: true, tier: 1, file: filePath };
  } catch {
    return { passed: false, tier: 1, file: filePath, reason: 'file does not exist' };
  }
}

/** Tier 2: file is substantive (not a stub) */
async function verifySubstantive(filePath, minLines = 5) {
  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    return { passed: false, tier: 2, file: filePath, reason: 'cannot read file' };
  }

  const nonEmptyLines = content.split('\n').filter((l) => l.trim().length > 0).length;
  if (nonEmptyLines < minLines) {
    return {
      passed: false, tier: 2, file: filePath,
      reason: `only ${nonEmptyLines} non-empty lines (min: ${minLines})`
    };
  }

  for (const { pattern, label } of ANTI_PATTERNS) {
    if (pattern.test(content)) {
      return { passed: false, tier: 2, file: filePath, reason: `contains ${label}` };
    }
  }

  return { passed: true, tier: 2, file: filePath, lines: nonEmptyLines };
}

/** Tier 3: pattern found in a target file (wired/imported/registered) */
async function verifyWired(pattern, inFile) {
  if (!pattern || !inFile) {
    return { passed: true, tier: 3, skipped: true, reason: 'no wired constraint to check' };
  }

  let content;
  try {
    content = await fs.readFile(inFile, 'utf8');
  } catch {
    return { passed: false, tier: 3, file: inFile, reason: `cannot read target file: ${inFile}` };
  }

  const regex = typeof pattern === 'string'
    ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    : pattern;

  if (regex.test(content)) {
    return { passed: true, tier: 3, pattern, inFile };
  }

  return {
    passed: false, tier: 3, pattern, inFile,
    reason: `pattern "${pattern}" not found in ${inFile}`
  };
}

/** Tier 4: smoke command returns expected output (optional, expensive) */
async function verifyFunctional(command, args = [], expectedPattern = null, timeoutMs = 10_000) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: timeoutMs,
      shell: false
    });
    const output = stdout + stderr;

    if (expectedPattern) {
      const regex = typeof expectedPattern === 'string'
        ? new RegExp(expectedPattern, 'i')
        : expectedPattern;
      if (!regex.test(output)) {
        return {
          passed: false, tier: 4, command,
          reason: `expected pattern "${expectedPattern}" not found in command output`
        };
      }
    }

    return { passed: true, tier: 4, command, output: output.slice(0, 300) };
  } catch (err) {
    return { passed: false, tier: 4, command, reason: err.message.slice(0, 200) };
  }
}

// ─── must_haves checker ───────────────────────────────────────────────────────

/**
 * Run must_haves verification against a task's contract.
 *
 * @param {object} mustHaves   — { truths?, artifacts?, key_links? }
 * @param {string} output      — Task output text (used for truths checks)
 * @param {string} projectDir
 * @returns {Promise<MustHavesResult>}
 *
 * MustHavesResult:
 *   {
 *     passed: boolean,
 *     failures: string[],
 *     warnings: string[],
 *     details: object[]
 *   }
 */
async function checkMustHaves(mustHaves, output, projectDir) {
  if (!mustHaves) return { passed: true, failures: [], warnings: [], details: [] };

  const failures = [];
  const warnings = [];
  const details = [];
  const outputText = String(output || '').toLowerCase();

  // ── Truths: heuristic — check if output mentions the expected state ──────
  for (const truth of (mustHaves.truths || [])) {
    // Extract key nouns/verbs from truth statement and check they appear in output
    const keywords = String(truth)
      .replace(/\b(?:the|a|an|is|are|can|will|should|must|to|of|in|and|or|that)\b/gi, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 4);

    const found = keywords.some((kw) => outputText.includes(kw.toLowerCase()));
    const result = { type: 'truth', statement: truth, passed: found };
    details.push(result);

    if (!found) {
      warnings.push(`Truth not evident in output: "${truth.slice(0, 80)}"`);
    }
  }

  // ── Artifacts: Tier 1 + Tier 2 checks ────────────────────────────────────
  for (const artifactStr of (mustHaves.artifacts || [])) {
    const { filePath, rawPath, minLines, wiredPattern } = parseArtifact(artifactStr, projectDir);

    const t1 = await verifyExists(filePath);
    details.push({ type: 'artifact', descriptor: artifactStr, ...t1 });

    if (!t1.passed) {
      failures.push(`Artifact missing: ${rawPath}`);
      continue;
    }

    const t2 = await verifySubstantive(filePath, minLines);
    details.push({ type: 'artifact_substantive', descriptor: artifactStr, ...t2 });

    if (!t2.passed) {
      failures.push(`Artifact is a stub: ${rawPath} — ${t2.reason}`);
      continue;
    }

    // If wired pattern specified, verify it exists in the same file
    if (wiredPattern) {
      const t3 = await verifyWired(wiredPattern, filePath);
      details.push({ type: 'artifact_wired', descriptor: artifactStr, ...t3 });
      if (!t3.passed) {
        warnings.push(`Artifact wiring issue: ${rawPath} — ${t3.reason}`);
      }
    }
  }

  // ── Key links: Tier 3 checks ──────────────────────────────────────────────
  for (const keyLink of (mustHaves.key_links || [])) {
    const parsed = parseKeyLink(keyLink, projectDir);

    if (!parsed) {
      // Cannot parse — skip silently (heuristic limitation)
      details.push({ type: 'key_link', descriptor: keyLink, passed: true, skipped: true });
      continue;
    }

    const t3 = await verifyWired(parsed.pattern, parsed.inFile);
    details.push({ type: 'key_link', descriptor: keyLink, ...t3 });

    if (!t3.passed) {
      warnings.push(`Key link not wired: "${keyLink.slice(0, 80)}" — ${t3.reason}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
    details
  };
}

module.exports = {
  verifyExists,
  verifySubstantive,
  verifyWired,
  verifyFunctional,
  checkMustHaves,
  parseArtifact,
  parseKeyLink,
  ANTI_PATTERNS
};
