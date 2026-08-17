'use strict';

/**
 * aioson rules:check [path] [--changed] [--paths=a,b] [--rule=name]
 *   [--json] [--strict] — deterministic COMPLIANCE check of the project's rules.
 *
 * `rules:lint` answers "are the rules well-formed and routable?".
 * `rules:check` answers the question nobody could answer before: "is the code
 * actually obeying them?".
 *
 * Why this exists. A rule used to be prose handed to a model, so it competed
 * with everything else in the prompt and lost silently: a feature-scoped
 * acceptance criterion could contradict a project rule, the agent would record
 * the deviation in a dossier line, and every gate stayed green because nothing
 * measured the outcome. A rule that no machine can verify is a suggestion.
 *
 * How it works. A rule opts into enforcement by declaring `enforcement: <id>`
 * in its frontmatter; the id resolves to a deterministic checker in the
 * registry below. Rules without a checker are reported under `unenforced` —
 * honest visibility beats a green summary that only covers the measurable half.
 *
 * Design constraints, all deliberate:
 *   - pure Node, no deps, no build, no network → identical under Claude Code,
 *     Codex, or any other harness, and under any model;
 *   - the rule FILE is the on/off switch. Delete or edit the rule and its check
 *     goes with it. Nothing else can silence it — that is what it means for
 *     rules to outrank feature artifacts;
 *   - cheap enough to run repeatedly inside a session, which is the point:
 *     agents re-run it as they work instead of hoping they remembered.
 */

const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');

const { parseFrontmatter } = require('../preflight-engine');
const { gitChangedFiles } = require('../harness/detect-runtime-feature');
const { listSourceFiles, readText, CODE_EXTS } = require('./audit-code');
const { scanNamingLanguage } = require('../lib/naming-language');

const VERSION = '1.0.0';
const GENERATOR = `aioson rules:check@${VERSION}`;

const SEVERITY_RANK = Object.freeze({ HIGH: 3, MED: 2, LOW: 1 });

// Advisory surfaces never reach HIGH — HIGH is what blocks a stage.
function downgrade(severity) {
  return severity === 'HIGH' ? 'MED' : severity;
}

// Blank out strings and regex literals so a checker sees code, not content. A
// scanner that stores `/\balert\s*\(/` as its own pattern, or a test fixture
// holding UI source as a string, must never be reported as the violation it is
// looking for.
function stripInertText(line) {
  return String(line)
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/\/(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*/g, '//');
}

// ─── checker registry ─────────────────────────────────────────────────────────
//
// Each entry is one deterministic verifier. `id` is what a rule declares in its
// `enforcement:` frontmatter field. Adding a rule-enforcer here is how a new
// convention becomes machine-checkable instead of merely written down.

const ENFORCERS = Object.freeze({
  'source-code-language': {
    id: 'source-code-language',
    surface: 'code',
    summary: 'source identifiers, filenames, and directories use technical English',
    /**
     * @param {{ files: Array<{ rel: string, lines: string[] }> }} ctx
     * @returns {Array<object>} findings
     */
    run({ files }) {
      const findings = [];
      const push = (f) => findings.push(f);
      for (const file of files) scanNamingLanguage(file, push);
      return findings;
    }
  },

  'no-native-dialogs': {
    id: 'no-native-dialogs',
    surface: 'code',
    summary: 'confirmation and input use design-system components, not native browser dialogs',
    run({ files }) {
      const findings = [];
      const DIALOGS = ['alert', 'confirm', 'prompt'];
      for (const { rel, lines } of files) {
        if (!/\.(jsx?|mjs|cjs|tsx?|vue|svelte|html)$/i.test(rel)) continue;
        // A file that declares its own `confirm` is not calling the browser's.
        // Terminal pickers do this constantly, and flagging them would be the
        // fastest way to teach everyone to ignore this check.
        const body = lines.join('\n');
        const shadowed = new Set(DIALOGS.filter((name) =>
          new RegExp(`(?:function|const|let|var|async function)\\s+${name}\\b`).test(body)
        ));
        lines.forEach((raw, i) => {
          const line = raw.trim();
          if (!line || line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) return;
          const code = stripInertText(line);
          const match = code.match(/(?:^|[^\w.$])(?:window\s*\.\s*)?(alert|confirm|prompt)\s*\(/);
          if (!match || shadowed.has(match[1])) return;
          findings.push({
            category: 'NATIVE_DIALOG',
            severity: 'HIGH',
            message: `native \`${match[1]}()\` dialog — build it from the project's design system instead`,
            file: rel,
            line: i + 1,
            snippet: line.slice(0, 120)
          });
        });
      }
      return findings;
    }
  }
});

function listEnforcerIds() {
  return Object.keys(ENFORCERS);
}

// ─── rule discovery ───────────────────────────────────────────────────────────

// The three surfaces that carry instruction — and they do not carry the same
// weight, so the check must not pretend they do.
//
//   rules   hard law on how to implement and act. The client's override channel,
//           and the top of the authority chain. A violation BLOCKS.
//   docs    procedure. How the work is normally carried out.
//   skills  craft. Ability, technique, and quality guidance.
//
// Docs and process skills are competence, not law: breaking one is worth
// surfacing, not worth refusing the handoff over. So the same checker reports a
// blocking violation when a rule declares it and an advisory warning when only a
// doc or skill does — and when both declare it, the rule's authority wins.
const GOVERNANCE_SURFACES = [
  { surface: 'rules', authority: 'binding', dir: ['.aioson', 'rules'], rel: '.aioson/rules' },
  { surface: 'docs', authority: 'advisory', dir: ['.aioson', 'docs'], rel: '.aioson/docs' },
  { surface: 'skills', authority: 'advisory', dir: ['.aioson', 'skills', 'process'], rel: '.aioson/skills/process' }
];

async function collectGovernanceFiles(absDir, relDir) {
  let entries = [];
  try {
    entries = await fsp.readdir(absDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (entry.name.toLowerCase() === 'readme.md') continue;
    if (entry.name.startsWith('_')) continue; // _archived and friends
    const abs = path.join(absDir, entry.name);
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await collectGovernanceFiles(abs, rel));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) files.push({ abs, rel });
  }
  return files;
}

async function discoverGovernance(targetDir) {
  const documents = [];
  for (const source of GOVERNANCE_SURFACES) {
    const files = await collectGovernanceFiles(path.join(targetDir, ...source.dir), source.rel);
    for (const file of files) {
      let content;
      try {
        content = await fsp.readFile(file.abs, 'utf8');
      } catch {
        continue;
      }
      const frontmatter = parseFrontmatter(content);
      const name = String(frontmatter.name || path.basename(file.rel, '.md')).trim();
      const declared = String(frontmatter.enforcement || '').trim();
      documents.push({
        name,
        surface: source.surface,
        authority: source.authority,
        path: file.rel,
        enforcement: declared && ENFORCERS[declared] ? declared : null,
        declared_enforcement: declared || null
      });
    }
  }
  return documents.sort((a, b) => a.surface.localeCompare(b.surface) || a.name.localeCompare(b.name));
}

// ─── file scoping ─────────────────────────────────────────────────────────────

function resolveFileList(targetDir, options) {
  if (options.paths) {
    return String(options.paths)
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => path.resolve(targetDir, p));
  }
  if (options.changed) {
    return gitChangedFiles(targetDir).map((rel) => path.resolve(targetDir, rel));
  }
  return listSourceFiles(targetDir);
}

function loadFiles(targetDir, absPaths) {
  const loaded = [];
  for (const abs of absPaths) {
    if (!CODE_EXTS.has(path.extname(abs).toLowerCase())) continue;
    const content = readText(abs);
    if (content === null) continue;
    loaded.push({
      rel: path.relative(targetDir, abs).split(path.sep).join('/'),
      lines: content.split('\n')
    });
  }
  return loaded;
}

// ─── run ──────────────────────────────────────────────────────────────────────

async function runRulesCheck({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args?.[0] || '.');
  const suppressExitCode = Boolean(options.suppressExitCode);
  const strict = Boolean(options.strict);

  const allRules = await discoverGovernance(targetDir);
  const onlyRule = options.rule ? String(options.rule).trim() : null;
  const enforceable = allRules.filter((rule) =>
    rule.enforcement && (!onlyRule || rule.name === onlyRule)
  );

  const scope = options.paths ? 'paths' : (options.changed ? 'changed' : 'full');
  const files = enforceable.length ? loadFiles(targetDir, resolveFileList(targetDir, options)) : [];

  // Several documents may bind the same checker — a rule and the process skill
  // that restates it, for instance. Run each checker once and attribute its
  // result to every document that declared it, so the same violation is not
  // reported twice for saying the same thing in two places.
  const byChecker = new Map();
  for (const rule of enforceable) {
    if (!byChecker.has(rule.enforcement)) byChecker.set(rule.enforcement, []);
    byChecker.get(rule.enforcement).push(rule);
  }

  const findings = [];
  const enforced = [];
  for (const [checkerId, documents] of byChecker) {
    const enforcer = ENFORCERS[checkerId];
    let checkerFindings = [];
    try {
      checkerFindings = enforcer.run({ targetDir, files, documents }) || [];
    } catch {
      checkerFindings = []; // a broken checker must never block the session
    }
    const declaredBy = documents.map((doc) => doc.name);
    // A rule anywhere in the declaring set makes the whole check binding; docs
    // and skills alone keep it advisory, so a HIGH from a craft document is
    // reported as a warning rather than refusing the stage.
    const authority = documents.some((doc) => doc.authority === 'binding') ? 'binding' : 'advisory';
    for (const finding of checkerFindings) {
      findings.push({
        ...finding,
        severity: authority === 'binding' ? finding.severity : downgrade(finding.severity),
        authority,
        rule: declaredBy[0],
        declared_by: declaredBy
      });
    }
    for (const doc of documents) {
      enforced.push({
        name: doc.name,
        path: doc.path,
        governance_surface: doc.surface,
        authority,
        enforcement: checkerId,
        surface: enforcer.surface,
        summary: enforcer.summary,
        violations: checkerFindings.length,
        ok: checkerFindings.length === 0
      });
    }
  }

  findings.sort((a, b) =>
    (SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]) ||
    a.rule.localeCompare(b.rule) ||
    a.file.localeCompare(b.file) ||
    (a.line - b.line)
  );

  const bySeverity = { HIGH: 0, MED: 0, LOW: 0 };
  for (const finding of findings) bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;

  const blocking = bySeverity.HIGH > 0 || (strict && bySeverity.MED > 0);
  const unenforcedDocs = allRules.filter((rule) => !rule.enforcement);
  const unenforced = unenforcedDocs.map((rule) => rule.name);
  // Coverage is reported per surface on purpose. A green summary that silently
  // covers only the measurable governance would read as "all rules obeyed" when
  // most of them were never checked at all.
  const coverage = {};
  for (const source of GOVERNANCE_SURFACES) {
    const total = allRules.filter((rule) => rule.surface === source.surface).length;
    const checked = enforced.filter((rule) => rule.governance_surface === source.surface).length;
    coverage[source.surface] = { total, enforced: checked };
  }

  const report = {
    generator: GENERATOR,
    root: targetDir,
    scope,
    scanned_files: files.length,
    rules_total: allRules.length,
    coverage,
    rules_enforced: enforced,
    unenforced,
    total: findings.length,
    by_severity: bySeverity,
    ok: !blocking,
    findings: findings.slice(0, 200)
  };
  if (blocking && !suppressExitCode) report.exitCode = 1;

  try {
    const ctxDir = path.join(targetDir, '.aioson', 'context');
    fs.mkdirSync(ctxDir, { recursive: true });
    fs.writeFileSync(path.join(ctxDir, 'rules-check.json'), JSON.stringify(report, null, 2), 'utf8');
  } catch {
    // best-effort persistence — never fail the check
  }

  if (options.json) return report;

  const coverageLine = GOVERNANCE_SURFACES
    .map((source) => `${source.surface} ${coverage[source.surface].enforced}/${coverage[source.surface].total}`)
    .join(', ');

  if (allRules.length === 0) {
    logger.log('No rules, docs, or process skills found under .aioson — nothing to check.');
    return report;
  }
  if (enforced.length === 0) {
    logger.log(`Rules check — 0 of ${allRules.length} governance document(s) declare a deterministic checker (${coverageLine}).`);
    logger.log(`  Available checkers: ${listEnforcerIds().join(', ')}`);
    logger.log('  Add `enforcement: <checker>` to the frontmatter of a rule, doc, or process skill to make it machine-verified.');
    return report;
  }

  logger.log(`Rules check — ${enforced.length}/${allRules.length} enforced (${coverageLine}) over ${files.length} file(s) (${scope}) — ${findings.length} violation(s)`);
  for (const rule of enforced) {
    const verdict = rule.ok ? 'OK  ' : (rule.authority === 'binding' ? 'FAIL' : 'WARN');
    logger.log(`  ${verdict} [${rule.governance_surface}] ${rule.name} — ${rule.summary}${rule.ok ? '' : ` (${rule.violations})`}`);
  }
  for (const finding of findings.slice(0, 40)) {
    logger.log(`  [${finding.severity}] ${finding.file}:${finding.line} — ${finding.message}`);
  }
  if (findings.length > 40) {
    logger.log(`  … and ${findings.length - 40} more (see .aioson/context/rules-check.json)`);
  }
  if (unenforced.length) {
    logger.log(`  Prose only, not machine-checked (${unenforced.length}): ${unenforced.slice(0, 8).join(', ')}${unenforced.length > 8 ? ', …' : ''}`);
  }
  if (blocking) {
    logger.log('  RULES=FAIL (a project rule is being violated)');
  } else if (bySeverity.MED > 0) {
    logger.log('  RULES=OK (no rule broken; advisory findings from docs/skills are worth a look)');
  } else {
    logger.log('  RULES=OK');
  }

  return report;
}

module.exports = {
  runRulesCheck,
  discoverGovernance,
  GOVERNANCE_SURFACES,
  ENFORCERS,
  listEnforcerIds
};
