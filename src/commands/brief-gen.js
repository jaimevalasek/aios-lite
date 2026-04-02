'use strict';

/**
 * aioson brief:gen — Generate a 100% self-contained worker brief
 *
 * Reads the current implementation plan phase (or a named phase), combines
 * it with the project architecture, spec, and any existing context files,
 * and writes a fully self-contained brief that a worker can execute with
 * zero additional lookups.
 *
 * Brief completeness checklist (from orchestrator.md):
 *   ✓ Phase name and goal
 *   ✓ Files to read before starting
 *   ✓ Files to create or modify
 *   ✓ Hard constraints (must not touch)
 *   ✓ Out-of-scope (what NOT to do)
 *   ✓ Done criteria (verifiable)
 *   ✓ Relevant excerpts from architecture / spec
 *
 * Usage:
 *   aioson brief:gen .
 *   aioson brief:gen . --phase=2               Target a specific plan phase
 *   aioson brief:gen . --plan=my-plan.md       Use a specific plan file
 *   aioson brief:gen . --out=briefs/phase-2.md Override output path
 *   aioson brief:gen . --squad=content-team    Target squad directory instead of .aioson/context
 *   aioson brief:gen . --executor=writer       Target executor inside squad
 *   aioson brief:gen . --json                  JSON output
 */

const fs = require('node:fs/promises');
const path = require('node:path');

// ─── File discovery helpers ───────────────────────────────────────────────────

async function tryRead(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function findFile(candidates) {
  for (const p of candidates) {
    const content = await tryRead(p);
    if (content !== null) return { path: p, content };
  }
  return null;
}

// ─── Plan parser ──────────────────────────────────────────────────────────────

/**
 * Parse phases from an implementation plan markdown.
 * Phases are identified by ## or ### headings containing "Phase" or "Sprint" or
 * "Step" followed by a number.
 */
function parsePlanPhases(content) {
  const lines = content.split(/\r?\n/);
  const phases = [];
  const phaseHeadingRe = /^#{1,4}\s+(?:Phase|Sprint|Step|Fase|Etapa)\s*(\d+)\b(.*)$/i;

  let current = null;
  let currentLines = [];

  function flush() {
    if (current !== null) {
      phases.push({
        number: current.number,
        title: current.title,
        content: currentLines.join('\n').trim()
      });
    }
  }

  for (const line of lines) {
    const match = line.match(phaseHeadingRe);
    if (match) {
      flush();
      current = {
        number: parseInt(match[1], 10),
        title: line.trim()
      };
      currentLines = [line];
    } else if (current !== null) {
      currentLines.push(line);
    }
  }
  flush();

  return phases;
}

/**
 * Extract a named section (## heading) from markdown content.
 * Returns the section body (without the heading line).
 */
function extractSection(content, sectionPattern) {
  const lines = content.split(/\r?\n/);
  const re = new RegExp(`^#{1,4}\\s+.*${sectionPattern}.*$`, 'i');
  let inSection = false;
  let sectionLevel = 0;
  const result = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+/);

    if (!inSection) {
      if (re.test(line)) {
        inSection = true;
        sectionLevel = headingMatch ? headingMatch[1].length : 2;
      }
      continue;
    }

    // Stop if we hit a heading of equal or higher level
    if (headingMatch && headingMatch[1].length <= sectionLevel) {
      break;
    }
    result.push(line);
  }

  return result.join('\n').trim();
}

// ─── Architecture excerpt extractor ──────────────────────────────────────────

const ARCH_SECTIONS = [
  'tech stack', 'stack', 'architecture', 'folder structure', 'directory',
  'conventions', 'database', 'api', 'services', 'modules', 'layers'
];

function extractArchitectureExcerpts(archContent, maxChars = 3000) {
  if (!archContent) return null;

  // Try to pull relevant sections
  const excerpts = [];
  for (const keyword of ARCH_SECTIONS) {
    const section = extractSection(archContent, keyword);
    if (section.length > 50) {
      excerpts.push(section);
    }
    if (excerpts.reduce((s, e) => s + e.length, 0) >= maxChars) break;
  }

  if (excerpts.length === 0) {
    // Fall back to the first maxChars characters
    return archContent.slice(0, maxChars) + (archContent.length > maxChars ? '\n\n[...truncated — read full file for details]' : '');
  }

  return excerpts.join('\n\n---\n\n');
}

// ─── Brief builder ────────────────────────────────────────────────────────────

function buildBrief({
  phase,
  planPath,
  architectureExcerpt,
  specExcerpt,
  contextNote,
  squadSlug,
  executorSlug,
  projectDir
}) {
  const now = new Date().toISOString();
  const relPlan = path.relative(projectDir, planPath);
  const squadLine = squadSlug ? `Squad        : ${squadSlug}` : null;
  const executorLine = executorSlug ? `Executor     : ${executorSlug}` : null;

  const lines = [
    '---',
    `generated_at : ${now}`,
    `plan_file    : ${relPlan}`,
    `phase        : ${phase.number}`,
    ...(squadLine ? [squadLine] : []),
    ...(executorLine ? [executorLine] : []),
    '---',
    '',
    `# Worker Brief — ${phase.title}`,
    '',
    '> This brief is 100% self-contained. Do not look up additional context.',
    '> Read only the files listed in "Files to read". Write only the files listed in "Files to write".',
    ''
  ];

  // Phase task block
  lines.push('## Phase goal and tasks');
  lines.push('');
  lines.push(phase.content);
  lines.push('');

  // Architecture
  if (architectureExcerpt) {
    lines.push('## Architecture reference (excerpts)');
    lines.push('');
    lines.push(architectureExcerpt);
    lines.push('');
  }

  // Spec
  if (specExcerpt) {
    lines.push('## Spec reference (excerpts)');
    lines.push('');
    lines.push(specExcerpt);
    lines.push('');
  }

  // Context note
  if (contextNote) {
    lines.push('## Project context');
    lines.push('');
    lines.push(contextNote);
    lines.push('');
  }

  // Done criteria placeholder (agent should fill in based on phase content)
  lines.push('## Done criteria');
  lines.push('');
  lines.push('> Fill in the specific, verifiable done criteria for this phase before handing off.');
  lines.push('> Example format:');
  lines.push('> - [ ] `path/to/file.ts` exists and exports `FunctionName`');
  lines.push('> - [ ] All existing tests pass (`npm test`)');
  lines.push('> - [ ] No TypeScript errors (`tsc --noEmit`)');
  lines.push('');

  // Hard constraints placeholder
  lines.push('## Hard constraints');
  lines.push('');
  lines.push('> Fill in what the worker MUST NOT touch or change.');
  lines.push('> Example:');
  lines.push('> - Do NOT modify `src/db/schema.ts` (owned by another phase)');
  lines.push('> - Do NOT add new npm dependencies without coordinator approval');
  lines.push('');

  // Out of scope
  lines.push('## Out of scope');
  lines.push('');
  lines.push('> Fill in what explicitly falls outside this phase.');
  lines.push('> Example:');
  lines.push('> - UI styling (handled in Phase 3)');
  lines.push('> - Authentication (handled in Phase 4)');
  lines.push('');

  return lines.join('\n');
}

// ─── Main command ─────────────────────────────────────────────────────────────

async function runBriefGen({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const phaseNumber = options.phase != null ? Number(options.phase) : null;
  const squadSlug = String(options.squad || '').trim() || null;
  const executorSlug = String(options.executor || '').trim() || null;

  const contextDir = squadSlug
    ? path.join(targetDir, '.aioson', 'squads', squadSlug)
    : path.join(targetDir, '.aioson', 'context');

  // ── Locate plan file ─────────────────────────────────────────────────────
  let planFile;
  if (options.plan) {
    const explicit = path.resolve(targetDir, options.plan);
    const content = await tryRead(explicit);
    if (!content) {
      logger.error(`Plan file not found: ${options.plan}`);
      return { ok: false, error: 'plan_not_found' };
    }
    planFile = { path: explicit, content };
  } else {
    planFile = await findFile([
      path.join(contextDir, 'implementation-plan.md'),
      path.join(targetDir, '.aioson', 'context', 'implementation-plan.md'),
      path.join(targetDir, 'plans', 'implementation-plan.md'),
      path.join(targetDir, 'implementation-plan.md')
    ]);
  }

  if (!planFile) {
    logger.error('No implementation plan found. Run `aioson plan:show` or provide --plan=<path>.');
    return { ok: false, error: 'no_plan' };
  }

  // ── Parse phases ─────────────────────────────────────────────────────────
  const phases = parsePlanPhases(planFile.content);

  if (phases.length === 0) {
    logger.error(`No phases found in plan: ${path.relative(targetDir, planFile.path)}`);
    logger.error('Phases must use headings like "## Phase 1 — description" or "## Sprint 2".');
    return { ok: false, error: 'no_phases' };
  }

  // Pick target phase
  let phase;
  if (phaseNumber != null) {
    phase = phases.find((p) => p.number === phaseNumber);
    if (!phase) {
      logger.error(`Phase ${phaseNumber} not found. Available: ${phases.map((p) => p.number).join(', ')}`);
      return { ok: false, error: 'phase_not_found' };
    }
  } else {
    // Default: first incomplete phase (or first phase)
    phase = phases[0];
  }

  // ── Locate supporting files ───────────────────────────────────────────────
  const [archFile, specFile, ctxFile] = await Promise.all([
    findFile([
      path.join(contextDir, 'architecture.md'),
      path.join(targetDir, '.aioson', 'context', 'architecture.md'),
      path.join(targetDir, 'docs', 'architecture.md'),
      path.join(targetDir, 'ARCHITECTURE.md')
    ]),
    findFile([
      path.join(contextDir, 'spec.md'),
      path.join(targetDir, '.aioson', 'context', 'spec.md'),
      path.join(targetDir, 'docs', 'spec.md'),
      path.join(targetDir, 'SPEC.md')
    ]),
    findFile([
      path.join(contextDir, 'project.context.md'),
      path.join(targetDir, '.aioson', 'context', 'project.context.md')
    ])
  ]);

  const architectureExcerpt = archFile
    ? extractArchitectureExcerpts(archFile.content)
    : null;

  const specExcerpt = specFile
    ? (specFile.content.length > 4000
        ? specFile.content.slice(0, 4000) + '\n\n[...truncated — read full file for details]'
        : specFile.content)
    : null;

  // Context: pull a short summary from project.context.md
  const contextNote = ctxFile
    ? extractSection(ctxFile.content, 'summary|overview|objetivo|goal') ||
      ctxFile.content.slice(0, 800)
    : null;

  // ── Build brief ───────────────────────────────────────────────────────────
  const briefContent = buildBrief({
    phase,
    planPath: planFile.path,
    architectureExcerpt,
    specExcerpt,
    contextNote,
    squadSlug,
    executorSlug,
    projectDir: targetDir
  });

  // ── Determine output path ─────────────────────────────────────────────────
  let outPath;
  if (options.out) {
    outPath = path.resolve(targetDir, options.out);
  } else {
    const outDir = squadSlug
      ? path.join(targetDir, '.aioson', 'squads', squadSlug, 'briefs')
      : path.join(targetDir, '.aioson', 'context', 'briefs');
    const executorSuffix = executorSlug ? `-${executorSlug}` : '';
    outPath = path.join(outDir, `phase-${phase.number}${executorSuffix}.md`);
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, briefContent, 'utf8');

  const relOut = path.relative(targetDir, outPath);

  if (options.json) {
    return {
      ok: true,
      brief_path: relOut,
      phase: phase.number,
      phase_title: phase.title,
      plan_file: path.relative(targetDir, planFile.path),
      has_architecture: Boolean(architectureExcerpt),
      has_spec: Boolean(specExcerpt),
      has_context: Boolean(contextNote),
      chars: briefContent.length,
      tokens: Math.ceil(briefContent.length / 4)
    };
  }

  logger.log('Brief generated');
  logger.log('─'.repeat(60));
  logger.log(`Phase        : ${phase.number} — ${phase.title}`);
  logger.log(`Plan         : ${path.relative(targetDir, planFile.path)}`);
  logger.log(`Architecture : ${archFile ? path.relative(targetDir, archFile.path) : '(not found)'}`);
  logger.log(`Spec         : ${specFile ? path.relative(targetDir, specFile.path) : '(not found)'}`);
  logger.log(`Output       : ${relOut}`);
  logger.log(`Size         : ${briefContent.length} chars (~${Math.ceil(briefContent.length / 4)} tokens)`);
  logger.log('');
  logger.log('Review the "Done criteria", "Hard constraints", and "Out of scope" sections');
  logger.log('before handing the brief to a worker. These are left as placeholders intentionally.');

  return {
    ok: true,
    brief_path: relOut,
    phase: phase.number
  };
}

module.exports = { runBriefGen };
