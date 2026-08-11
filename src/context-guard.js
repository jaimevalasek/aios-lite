'use strict';

const path = require('node:path');
const { buildContextBrief, extractDocConstraints } = require('./context-brief');
const { parseFrontmatter, readFileSafe } = require('./preflight-engine');
const { parseListValue, pathMatchesPattern } = require('./context-selector');

// Harness-agnostic core for `context:guard`.
//
// Operational retrieval loop: a harness extension point (e.g. a Claude Code
// PreToolUse hook) feeds the pending tool event in, and the guard derives a
// query from the artifact itself — never from a model-emitted keyword list —
// runs the proven context:brief engine, and returns an injection payload when a
// project rule is genuinely salient to the change about to be written.

// File-mutating tools whose payload is worth checking against project rules.
const MUTATING_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// A rule only counts when context:brief routed it through a hard signal, never
// through a foundation always-load or a pure semantic guess.
const HARD_SIGNAL = /(?:triggers|paths|entities|aliases|task_types):/;

// Salience gate: a rule opts into guard injection by declaring `entities` or
// `aliases`, or by explicitly setting `guard: true` in frontmatter. The explicit
// opt-in is for project contracts that are path/task-bound but not domain-entity
// rules (e.g. agent prompt structure). Generic baseline rules remain silent.
const DOMAIN_SIGNAL = /(?:entities|aliases):/;

// A rule that declares `paths` is a contract over those files. It may still
// surface in the brief via fuzzy trigger/description keyword overlap when an
// UNRELATED file is edited — so the guard verifies the scope itself against
// the edited path (the brief's reason string does not reliably carry a
// `paths:` marker even for in-scope files).
function guardPathCandidates(targetDir, filePath) {
  const raw = String(filePath || '');
  if (!raw) return [];
  const candidates = [raw];
  try {
    const rel = path.relative(targetDir, path.resolve(targetDir, raw));
    if (rel && !rel.startsWith('..')) candidates.push(rel);
  } catch { /* keep the raw candidate */ }
  return candidates;
}

function ruleInPathScope(frontmatter, pathCandidates) {
  const patterns = parseListValue(frontmatter.paths || frontmatter.globs);
  if (patterns.length === 0) return true;
  return pathCandidates.some((candidate) =>
    patterns.some((pattern) => pathMatchesPattern(candidate, pattern)));
}

// `guard_surfaces:` lets a rule bind its injection to a kind of artifact.
// Today the only kind is `ui`: markup/style files, product docs, and scripts
// that visibly touch the DOM. A universal interaction rule (forms, kanban,
// confirmation modals) is noise inside CLI sources, JSON data, or a Node
// harness even when their content mentions its keywords — files ABOUT forms
// are not forms.
const UI_FILE_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.jsx', '.tsx', '.vue', '.svelte', '.astro'
]);
const DOC_FILE_EXTENSIONS = new Set(['.md', '.mdx']);
const SCRIPT_FILE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts']);
const DOM_MARKERS = /document\s*\.\s*(?:getElementById|querySelector|querySelectorAll|createElement|addEventListener|body)|classList\s*\.|innerHTML|<\/?[a-z][a-z0-9-]*(?:\s[^>]*)?>|className\s*=|useState\s*\(|createRoot\s*\(/i;

function detectSurfaceKinds(filePath, content) {
  const kinds = new Set();
  const ext = path.extname(String(filePath || '')).toLowerCase();
  if (UI_FILE_EXTENSIONS.has(ext)) kinds.add('ui');
  // Product/spec docs carry interaction contracts (briefings, manifests, PRDs).
  else if (DOC_FILE_EXTENSIONS.has(ext)) kinds.add('ui');
  else if (SCRIPT_FILE_EXTENSIONS.has(ext) && DOM_MARKERS.test(String(content || ''))) kinds.add('ui');
  return kinds;
}

// Tunable relevance gate.
const GUARD_GATE = {
  minConfidence: 'medium', // 'low' briefs never inject
  maxConstraints: 10,
  maxForbidden: 6,
  maxContentChars: 4000
};

const CONFIDENCE_RANK = { low: 0, medium: 1, high: 2 };

function emptyResponse() {
  return {};
}

function extractEditedContent(toolInput = {}) {
  const parts = [];
  if (typeof toolInput.content === 'string') parts.push(toolInput.content);
  if (typeof toolInput.new_string === 'string') parts.push(toolInput.new_string);
  if (typeof toolInput.old_string === 'string') parts.push(toolInput.old_string);
  if (typeof toolInput.new_source === 'string') parts.push(toolInput.new_source);
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (edit && typeof edit.new_string === 'string') parts.push(edit.new_string);
    }
  }
  return parts.join('\n');
}

function deriveQuery(filePath, content, limit = GUARD_GATE.maxContentChars) {
  const base = filePath
    ? path.basename(String(filePath)).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
    : '';
  const body = String(content || '').slice(0, limit);
  return `${base} ${body}`.trim();
}

function matchedRules(brief) {
  return (brief.must_load || []).filter((item) => (
    item.surface === 'rules' && HARD_SIGNAL.test(item.reason || '')
  ));
}

function truthyFrontmatter(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function ruleDeclaresPaths(frontmatter) {
  return Boolean(frontmatter && (frontmatter.paths || frontmatter.globs));
}

function ruleAllowsGuard(rule, frontmatter, surfaceKinds = null, pathCandidates = null) {
  const reason = rule.reason || '';
  // Path scope is a contract for EVERY guard injection, domain signal or not:
  // a rule that declares `paths` must never inject on fuzzy keyword spill from
  // a file outside them.
  if (ruleDeclaresPaths(frontmatter) && pathCandidates && !ruleInPathScope(frontmatter, pathCandidates)) {
    return false;
  }
  // Surface scope: a rule that declares `guard_surfaces` only injects when the
  // edited artifact is one of those kinds.
  if (surfaceKinds) {
    const surfaces = parseListValue(frontmatter.guard_surfaces)
      .map((kind) => String(kind).trim().toLowerCase());
    if (surfaces.length > 0 && !surfaces.some((kind) => surfaceKinds.has(kind))) return false;
  }
  if (DOMAIN_SIGNAL.test(reason)) return true;
  if (!truthyFrontmatter(frontmatter.guard) || !HARD_SIGNAL.test(reason)) return false;
  return true;
}

function confidenceAllows(confidence, gate) {
  const have = CONFIDENCE_RANK[confidence] ?? 0;
  const need = CONFIDENCE_RANK[gate.minConfidence] ?? 1;
  return have >= need;
}

function dedupeStrings(items) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const text = String(item || '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function normalizeRuleLine(value) {
  return String(value || '').trim().toLowerCase();
}

// Read each salient rule file and extract ITS OWN constraints — so the
// injection is attributed per rule and never carries the generic concern-based
// constraints the brief aggregates from the whole selection.
async function buildRuleBlocks(targetDir, salient, gate, surfaceKinds = null, pathCandidates = null) {
  const blocks = [];
  for (const rule of salient) {
    const content = await readFileSafe(path.join(targetDir, rule.path));
    if (!content) continue;
    const frontmatter = parseFrontmatter(content);
    if (!ruleAllowsGuard(rule, frontmatter, surfaceKinds, pathCandidates)) continue;
    const extracted = extractDocConstraints(content);
    const constraints = dedupeStrings(extracted.constraints).slice(0, gate.maxConstraints);
    const constraintSet = new Set(constraints.map(normalizeRuleLine));
    const forbidden = dedupeStrings(extracted.forbidden_patterns)
      .filter((item) => !constraintSet.has(normalizeRuleLine(item)))
      .slice(0, gate.maxForbidden);
    if (constraints.length === 0 && forbidden.length === 0) continue;
    blocks.push({ path: rule.path, constraints, forbidden });
  }
  return blocks;
}

function formatInjectionText(filePath, ruleBlocks) {
  const target = filePath ? path.basename(String(filePath)) : 'this change';
  const lines = [`[AIOSON context:guard] Project rules apply to ${target}:`];
  for (const block of ruleBlocks) {
    lines.push(`Rule ${block.path}:`);
    for (const constraint of block.constraints) lines.push(`- ${constraint}`);
    for (const pattern of block.forbidden) lines.push(`- (forbidden) ${pattern}`);
  }
  return lines.join('\n');
}

function formatForTool(tool, additionalContext) {
  // Only the Claude Code adapter exists today; other harnesses default to it
  // until their own extension point is wired.
  switch (tool) {
    case 'claude':
    default:
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext
        }
      };
  }
}

async function buildGuardResponse(event, targetDir, options = {}) {
  const gate = { ...GUARD_GATE, ...(options.gate || {}) };
  const toolName = event && event.tool_name;
  const toolInput = (event && event.tool_input) || {};
  if (!MUTATING_TOOLS.has(toolName)) return emptyResponse();

  const filePath = toolInput.file_path || toolInput.notebook_path || '';
  const content = extractEditedContent(toolInput);
  if (!filePath && !content) return emptyResponse();

  const query = deriveQuery(filePath, content, gate.maxContentChars);
  if (!query) return emptyResponse();

  const brief = await buildContextBrief(targetDir, {
    agent: options.agent || 'dev',
    mode: 'executing',
    task: query,
    paths: filePath
  });

  const ruled = matchedRules(brief);
  if (ruled.length === 0) return emptyResponse();
  if (!confidenceAllows(brief.confidence, gate)) return emptyResponse();

  const surfaceKinds = detectSurfaceKinds(filePath, content);
  const pathCandidates = guardPathCandidates(targetDir, filePath);
  const ruleBlocks = await buildRuleBlocks(targetDir, ruled, gate, surfaceKinds, pathCandidates);
  if (ruleBlocks.length === 0) return emptyResponse();

  const additionalContext = formatInjectionText(filePath, ruleBlocks);
  const response = formatForTool(options.tool || 'claude', additionalContext);
  response._guard = {
    injected: true,
    rules: ruleBlocks.map((block) => block.path),
    confidence: brief.confidence
  };
  return response;
}

module.exports = {
  buildGuardResponse,
  deriveQuery,
  detectSurfaceKinds,
  extractEditedContent,
  matchedRules,
  ruleAllowsGuard,
  MUTATING_TOOLS,
  GUARD_GATE
};
