'use strict';

/**
 * aioson verify:gate — Fresh-eyes verification pass on a deliverable
 *
 * Spawns a verification pass using only the spec and the artifact (file or
 * directory). No conversation history is carried in — this catches bugs the
 * generating agent cannot see due to context bias.
 *
 * Verdict outputs:
 *   PASS              — artifact satisfies all spec requirements
 *   PASS_WITH_NOTES   — passes but has minor issues worth flagging
 *   FAIL_WITH_ISSUES  — one or more requirements not met (list provided)
 *   BLOCKED           — cannot evaluate (missing spec, unreadable artifact, etc.)
 *
 * What it checks (deterministic, no LLM):
 *   - Required file existence (from spec "Files to write" or "Output files")
 *   - Forbidden patterns (patterns listed under "Constraints" or "Must not")
 *   - Required patterns (patterns listed under "Must contain" or "Done criteria")
 *   - File size sanity (files > 0 bytes, no obviously truncated outputs)
 *   - Acceptance criteria checkboxes presence (reports unchecked items)
 *
 * Usage:
 *   aioson verify:gate . --spec=.aioson/context/spec.md --artifact=src/
 *   aioson verify:gate . --spec=briefs/phase-2.md --artifact=src/api/
 *   aioson verify:gate . --spec=briefs/phase-2.md --artifact=src/api/ --out=verify-phase-2.md
 *   aioson verify:gate . --spec=briefs/phase-2.md --artifact=src/foo.ts --strict
 *   aioson verify:gate . --json
 */

const fs = require('node:fs/promises');
const path = require('node:path');

// ─── Spec parser ──────────────────────────────────────────────────────────────

/**
 * Extract structured verification requirements from a spec/brief markdown.
 * Looks for:
 *   - "Done criteria" / "Acceptance criteria" sections → required checkboxes
 *   - "Files to write" / "Output files" → required file paths
 *   - "Must contain" / "Required patterns" → regex patterns to match
 *   - "Hard constraints" / "Must not" → forbidden patterns
 */
function parseSpecRequirements(content) {
  const lines = content.split(/\r?\n/);
  const requirements = {
    required_files: [],
    required_patterns: [],
    forbidden_patterns: [],
    acceptance_criteria: [],
    raw_sections: {}
  };

  let currentSection = null;

  const SECTION_MAP = {
    'done criteria': 'done',
    'acceptance criteria': 'done',
    'files to write': 'output_files',
    'files to create': 'output_files',
    'output files': 'output_files',
    'must contain': 'required_patterns',
    'required patterns': 'required_patterns',
    'hard constraints': 'forbidden',
    'must not': 'forbidden',
    'constraints': 'forbidden',
    'out of scope': 'out_of_scope'
  };

  const headingRe = /^(#{1,4})\s+(.+)$/;
  let sectionLevel = 0;

  for (const line of lines) {
    const headingMatch = line.match(headingRe);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim().toLowerCase();

      // Check if this heading exits the current section
      if (currentSection && level <= sectionLevel) {
        currentSection = null;
      }

      // Check if this heading starts a tracked section
      for (const [keyword, sectionType] of Object.entries(SECTION_MAP)) {
        if (title.includes(keyword)) {
          currentSection = sectionType;
          sectionLevel = level;
          if (!requirements.raw_sections[sectionType]) {
            requirements.raw_sections[sectionType] = [];
          }
          break;
        }
      }
      continue;
    }

    if (!currentSection) continue;

    // Parse bullet items
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    const checkboxMatch = line.match(/^[-*]\s+\[([ x])\]\s+(.+)$/i);
    const item = checkboxMatch ? checkboxMatch[2].trim() : (bulletMatch ? bulletMatch[1].trim() : null);

    if (!item) continue;

    if (requirements.raw_sections[currentSection]) {
      requirements.raw_sections[currentSection].push(item);
    }

    switch (currentSection) {
      case 'done': {
        const checked = checkboxMatch ? checkboxMatch[1].trim().toLowerCase() === 'x' : false;
        requirements.acceptance_criteria.push({ text: item, checked });

        // Extract file paths from criteria (pattern: `path/to/file`)
        const fileMatch = item.match(/`([^`]+\.[a-z]{1,6})`/g);
        if (fileMatch) {
          for (const m of fileMatch) {
            const fp = m.replace(/`/g, '').trim();
            if (!fp.includes(' ') && fp.includes('/')) {
              requirements.required_files.push(fp);
            }
          }
        }
        break;
      }
      case 'output_files': {
        // Extract paths from items like "`src/foo.ts` — description"
        const fpMatch = item.match(/`([^`]+)`/);
        if (fpMatch) {
          requirements.required_files.push(fpMatch[1].trim());
        } else if (!item.includes(' ') || item.startsWith('src/') || item.startsWith('./')) {
          requirements.required_files.push(item.split(' ')[0].trim());
        }
        break;
      }
      case 'required_patterns': {
        requirements.required_patterns.push(item);
        break;
      }
      case 'forbidden': {
        // Only add as forbidden pattern if it looks like a code or file reference
        const fpMatch2 = item.match(/`([^`]+)`/);
        if (fpMatch2) {
          requirements.forbidden_patterns.push(fpMatch2[1].trim());
        }
        break;
      }
    }
  }

  // Deduplicate
  requirements.required_files = [...new Set(requirements.required_files)];
  requirements.required_patterns = [...new Set(requirements.required_patterns)];
  requirements.forbidden_patterns = [...new Set(requirements.forbidden_patterns)];

  return requirements;
}

// ─── Artifact scanner ─────────────────────────────────────────────────────────

async function collectFiles(artifactPath, maxFiles = 200) {
  const collected = [];

  async function walk(p) {
    if (collected.length >= maxFiles) return;
    let stat;
    try {
      stat = await fs.stat(p);
    } catch {
      return;
    }

    if (stat.isFile()) {
      collected.push(p);
    } else if (stat.isDirectory()) {
      let entries;
      try {
        entries = await fs.readdir(p, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue; // skip dot files
        await walk(path.join(p, entry.name));
      }
    }
  }

  await walk(artifactPath);
  return collected;
}

async function readFileSafe(filePath, maxBytes = 50000) {
  try {
    const buf = Buffer.alloc(maxBytes);
    const fh = await fs.open(filePath, 'r');
    const { bytesRead } = await fh.read(buf, 0, maxBytes, 0);
    await fh.close();
    return buf.slice(0, bytesRead).toString('utf8');
  } catch {
    return null;
  }
}

// ─── Checks ───────────────────────────────────────────────────────────────────

async function checkRequiredFiles(requirements, artifactBase, allFiles, targetDir) {
  const issues = [];
  const passes = [];

  for (const requiredPath of requirements.required_files) {
    // Try relative to artifact base first, then targetDir
    const candidates = [
      path.resolve(artifactBase, requiredPath),
      path.resolve(targetDir, requiredPath)
    ];

    let found = false;
    for (const c of candidates) {
      if (allFiles.includes(c)) {
        found = true;
        break;
      }
      // Also try if the file appears anywhere in allFiles by basename
      const basename = path.basename(requiredPath);
      if (allFiles.some((f) => path.basename(f) === basename && f.includes(path.dirname(requiredPath)))) {
        found = true;
        break;
      }
    }

    if (found) {
      passes.push(`Required file exists: \`${requiredPath}\``);
    } else {
      issues.push(`Missing required file: \`${requiredPath}\``);
    }
  }

  return { issues, passes };
}

async function checkFileContents(requirements, allFiles, targetDir) {
  const issues = [];
  const passes = [];
  const notes = [];

  // Check for empty files
  for (const filePath of allFiles) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.size === 0) {
        notes.push(`Empty file: \`${path.relative(targetDir, filePath)}\``);
      }
    } catch { /* ignore */ }
  }

  // Check required patterns across all artifact files
  if (requirements.required_patterns.length > 0) {
    const allContent = [];
    for (const filePath of allFiles.slice(0, 30)) { // limit to first 30 files
      const content = await readFileSafe(filePath);
      if (content) allContent.push({ path: filePath, content });
    }

    for (const pattern of requirements.required_patterns) {
      const found = allContent.some(({ content }) => content.includes(pattern));
      if (found) {
        passes.push(`Required pattern found: \`${pattern}\``);
      } else {
        issues.push(`Required pattern not found in artifact: \`${pattern}\``);
      }
    }
  }

  // Check forbidden patterns
  if (requirements.forbidden_patterns.length > 0) {
    const allContent = [];
    for (const filePath of allFiles.slice(0, 30)) {
      const content = await readFileSafe(filePath);
      if (content) allContent.push({ path: path.relative(targetDir, filePath), content });
    }

    for (const pattern of requirements.forbidden_patterns) {
      const found = allContent.find(({ content }) => content.includes(pattern));
      if (found) {
        issues.push(`Forbidden pattern found in \`${found.path}\`: \`${pattern}\``);
      } else {
        passes.push(`Forbidden pattern absent: \`${pattern}\``);
      }
    }
  }

  return { issues, passes, notes };
}

function checkAcceptanceCriteria(requirements) {
  const unchecked = requirements.acceptance_criteria.filter((c) => !c.checked);
  const checked = requirements.acceptance_criteria.filter((c) => c.checked);

  const issues = [];
  const passes = [];
  const notes = [];

  for (const c of checked) {
    passes.push(`Criterion checked: ${c.text}`);
  }
  for (const c of unchecked) {
    // Only warn if criteria look like real requirements (not placeholder text)
    if (c.text.includes('Fill in') || c.text.includes('Example')) {
      notes.push(`Placeholder criterion (not checked): ${c.text}`);
    } else {
      issues.push(`Unchecked criterion: ${c.text}`);
    }
  }

  return { issues, passes, notes };
}

// ─── Report builder ───────────────────────────────────────────────────────────

function buildReport({ verdict, specPath, artifactPath, projectDir, issues, passes, notes, fileCount, requirements }) {
  const relSpec = path.relative(projectDir, specPath);
  const relArtifact = path.relative(projectDir, artifactPath);
  const now = new Date().toISOString();

  const lines = [
    '---',
    `generated_at : ${now}`,
    `spec         : ${relSpec}`,
    `artifact     : ${relArtifact}`,
    `verdict      : ${verdict}`,
    `files_scanned: ${fileCount}`,
    '---',
    '',
    `# Verify Gate — ${verdict}`,
    '',
    `**Spec:** \`${relSpec}\``,
    `**Artifact:** \`${relArtifact}\``,
    `**Files scanned:** ${fileCount}`,
    ''
  ];

  if (issues.length > 0) {
    lines.push('## Issues');
    for (const issue of issues) lines.push(`- ❌ ${issue}`);
    lines.push('');
  }

  if (notes.length > 0) {
    lines.push('## Notes');
    for (const note of notes) lines.push(`- ⚠ ${note}`);
    lines.push('');
  }

  if (passes.length > 0) {
    lines.push('## Passed checks');
    for (const p of passes) lines.push(`- ✓ ${p}`);
    lines.push('');
  }

  if (requirements.required_files.length === 0 &&
      requirements.acceptance_criteria.length === 0 &&
      requirements.required_patterns.length === 0) {
    lines.push('## Coverage warning');
    lines.push('');
    lines.push('No verifiable requirements were extracted from the spec.');
    lines.push('The spec may not contain "Done criteria", "Files to write", or "Must contain" sections.');
    lines.push('Add structured sections to the spec to enable meaningful verification.');
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Verdict logic ────────────────────────────────────────────────────────────

function determineVerdict(issues, notes, strict) {
  if (issues.length > 0) return 'FAIL_WITH_ISSUES';
  if (notes.length > 0 && strict) return 'FAIL_WITH_ISSUES';
  if (notes.length > 0) return 'PASS_WITH_NOTES';
  return 'PASS';
}

// ─── Main command ─────────────────────────────────────────────────────────────

async function runVerifyGate({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const strict = Boolean(options.strict);

  // ── Locate spec ──────────────────────────────────────────────────────────
  let specPath;
  if (options.spec) {
    specPath = path.resolve(targetDir, options.spec);
  } else {
    // Auto-discover: prefer brief files, then spec.md
    const candidates = [
      path.join(targetDir, '.aioson', 'context', 'spec.md'),
      path.join(targetDir, 'docs', 'spec.md'),
      path.join(targetDir, 'SPEC.md')
    ];
    for (const c of candidates) {
      try {
        await fs.access(c);
        specPath = c;
        break;
      } catch { /* continue */ }
    }
  }

  if (!specPath) {
    const msg = 'No spec file found. Use --spec=<path> to specify one.';
    if (options.json) return { ok: false, verdict: 'BLOCKED', error: msg };
    logger.error(msg);
    return { ok: false, verdict: 'BLOCKED' };
  }

  const specContent = await (async () => {
    try { return await fs.readFile(specPath, 'utf8'); } catch { return null; }
  })();

  if (!specContent) {
    const msg = `Cannot read spec file: ${path.relative(targetDir, specPath)}`;
    if (options.json) return { ok: false, verdict: 'BLOCKED', error: msg };
    logger.error(msg);
    return { ok: false, verdict: 'BLOCKED' };
  }

  // ── Locate artifact ──────────────────────────────────────────────────────
  let artifactPath;
  if (options.artifact) {
    artifactPath = path.resolve(targetDir, options.artifact);
  } else {
    // Default to src/ if it exists
    const srcDir = path.join(targetDir, 'src');
    try {
      await fs.access(srcDir);
      artifactPath = srcDir;
    } catch {
      artifactPath = targetDir;
    }
  }

  try {
    await fs.access(artifactPath);
  } catch {
    const msg = `Artifact path not found: ${path.relative(targetDir, artifactPath)}`;
    if (options.json) return { ok: false, verdict: 'BLOCKED', error: msg };
    logger.error(msg);
    return { ok: false, verdict: 'BLOCKED' };
  }

  // ── Parse spec requirements ───────────────────────────────────────────────
  const requirements = parseSpecRequirements(specContent);

  // ── Collect artifact files ────────────────────────────────────────────────
  const allFiles = await collectFiles(artifactPath);

  // ── Run checks ────────────────────────────────────────────────────────────
  const [fileCheck, contentCheck] = await Promise.all([
    checkRequiredFiles(requirements, artifactPath, allFiles, targetDir),
    checkFileContents(requirements, allFiles, targetDir)
  ]);
  const criteriaCheck = checkAcceptanceCriteria(requirements);

  const allIssues = [...fileCheck.issues, ...contentCheck.issues, ...criteriaCheck.issues];
  const allPasses = [...fileCheck.passes, ...contentCheck.passes, ...criteriaCheck.passes];
  const allNotes = [...contentCheck.notes, ...criteriaCheck.notes];

  const verdict = determineVerdict(allIssues, allNotes, strict);

  // ── Build report ─────────────────────────────────────────────────────────
  const report = buildReport({
    verdict,
    specPath,
    artifactPath,
    projectDir: targetDir,
    issues: allIssues,
    passes: allPasses,
    notes: allNotes,
    fileCount: allFiles.length,
    requirements
  });

  // ── Write output ──────────────────────────────────────────────────────────
  let outPath;
  if (options.out) {
    outPath = path.resolve(targetDir, options.out);
  } else {
    const slug = path.basename(specPath, '.md').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const outDir = path.join(targetDir, '.aioson', 'context');
    outPath = path.join(outDir, `verify-gate-${slug}.md`);
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, report, 'utf8');

  const relOut = path.relative(targetDir, outPath);

  if (options.json) {
    return {
      ok: verdict === 'PASS' || verdict === 'PASS_WITH_NOTES',
      verdict,
      spec: path.relative(targetDir, specPath),
      artifact: path.relative(targetDir, artifactPath),
      report_path: relOut,
      files_scanned: allFiles.length,
      issues: allIssues,
      notes: allNotes,
      passes: allPasses,
      requirements: {
        required_files: requirements.required_files.length,
        acceptance_criteria: requirements.acceptance_criteria.length,
        required_patterns: requirements.required_patterns.length,
        forbidden_patterns: requirements.forbidden_patterns.length
      }
    };
  }

  // Console output
  const VERDICT_ICON = {
    PASS: '✓',
    PASS_WITH_NOTES: '⚠',
    FAIL_WITH_ISSUES: '✗',
    BLOCKED: '?'
  };

  logger.log('Verify Gate');
  logger.log('─'.repeat(60));
  logger.log(`Spec     : ${path.relative(targetDir, specPath)}`);
  logger.log(`Artifact : ${path.relative(targetDir, artifactPath)}`);
  logger.log(`Files    : ${allFiles.length}`);
  logger.log('');

  logger.log(`Verdict  : ${VERDICT_ICON[verdict]} ${verdict}`);
  logger.log('');

  if (allIssues.length > 0) {
    logger.log('Issues:');
    for (const issue of allIssues) logger.log(`  ✗ ${issue}`);
    logger.log('');
  }

  if (allNotes.length > 0) {
    logger.log('Notes:');
    for (const note of allNotes) logger.log(`  ⚠ ${note}`);
    logger.log('');
  }

  if (allPasses.length > 0) {
    logger.log(`Passed: ${allPasses.length} check${allPasses.length !== 1 ? 's' : ''}`);
    logger.log('');
  }

  if (requirements.required_files.length === 0 &&
      requirements.acceptance_criteria.length === 0 &&
      requirements.required_patterns.length === 0) {
    logger.log('⚠ No verifiable requirements extracted from spec.');
    logger.log('  Add "Done criteria", "Files to write", or "Must contain" sections to enable checks.');
    logger.log('');
  }

  logger.log(`Report   : ${relOut}`);

  return {
    ok: verdict === 'PASS' || verdict === 'PASS_WITH_NOTES',
    verdict
  };
}

module.exports = { runVerifyGate };
