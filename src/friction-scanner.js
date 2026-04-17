'use strict';

/**
 * friction-scanner — analyzes workflow error logs to detect recurring friction patterns.
 *
 * Reads .aioson/context/workflow.errors.jsonl and produces structured
 * recommendations for codebase hardening.
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { readFileSafe, fileExists } = require('./preflight-engine');

const ERRORS_PATH = '.aioson/context/workflow.errors.jsonl';

const PATTERNS = [
  {
    id: 'typescript_compile',
    name: 'TypeScript compilation errors',
    test: (err) => /tsc|typescript|type mismatch|cannot find module|unused import/i.test(err)
  },
  {
    id: 'rust_compile',
    name: 'Rust compilation errors',
    test: (err) => /cargo check|rustc|sqlx|actix|tokio/i.test(err)
  },
  {
    id: 'jsx_structure',
    name: 'JSX / React structure errors',
    test: (err) => /jsx|react|component|element type is invalid|nested|display-property/i.test(err)
  },
  {
    id: 'test_mock_order',
    name: 'Mock ordering / test helper issues',
    test: (err) => /vi\.mock|vi\.fn|jest\.mock|mock ordering|hoisted|getByText/i.test(err)
  },
  {
    id: 'ui_text_mismatch',
    name: 'UI text mismatch in tests',
    test: (err) => /confirmar|vincular|button label|tab name|ui text|assertion/i.test(err)
  },
  {
    id: 'git_staging',
    name: 'Git staging accidents',
    test: (err) => /node_modules|build artifact|dev\.db|\.next|unwanted files staged/i.test(err)
  },
  {
    id: 'path_misunderstanding',
    name: 'Path / directory misinterpretation',
    test: (err) => /wrong directory|path misunderstanding|bootstrap|\.aioson\/docs/i.test(err)
  },
  {
    id: 'handoff_contract',
    name: 'Handoff contract violations',
    test: (err) => /handoff contract|missing artifact|gate .* not approved/i.test(err)
  }
];

async function loadErrors(targetDir) {
  const errorsPath = path.join(targetDir, ERRORS_PATH);
  if (!(await fileExists(errorsPath))) return [];
  const content = await readFileSafe(errorsPath);
  if (!content) return [];
  const lines = content.trim().split('\n').filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // ignore malformed lines
    }
  }
  return entries;
}

function classifyError(entry) {
  const text = `${entry.error || ''} ${entry.gateType || ''}`;
  for (const pattern of PATTERNS) {
    if (pattern.test(text)) {
      return pattern.id;
    }
  }
  return 'unknown';
}

async function scanFriction(targetDir) {
  const entries = await loadErrors(targetDir);
  const counts = {};
  const byPattern = {};
  const recent = entries.slice(-20);

  for (const entry of entries) {
    const pid = classifyError(entry);
    counts[pid] = (counts[pid] || 0) + 1;
    if (!byPattern[pid]) byPattern[pid] = [];
    byPattern[pid].push(entry);
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([pid, count]) => {
      const pattern = PATTERNS.find((p) => p.id === pid);
      return {
        id: pid,
        name: pattern ? pattern.name : pid,
        count,
        examples: (byPattern[pid] || []).slice(-3).map((e) => e.error?.substring(0, 200) || '')
      };
    });

  return {
    total: entries.length,
    recentCount: recent.length,
    patterns: sorted
  };
}

function buildRecommendations(analysis) {
  const recs = [];
  for (const p of analysis.patterns) {
    switch (p.id) {
      case 'typescript_compile':
        recs.push({
          pattern: p.name,
          action: 'Enable strict type-checking hooks or add "tsc --noEmit" to pre-commit checks.',
          autoFixable: false,
          priority: p.count >= 3 ? 'high' : 'medium'
        });
        break;
      case 'rust_compile':
        recs.push({
          pattern: p.name,
          action: 'Add "cargo check" as a mandatory step in the dev agent prompt or CI pipeline.',
          autoFixable: false,
          priority: p.count >= 3 ? 'high' : 'medium'
        });
        break;
      case 'jsx_structure':
        recs.push({
          pattern: p.name,
          action: 'Add an ESLint plugin for JSX nesting rules (e.g., eslint-plugin-react).',
          autoFixable: false,
          priority: 'medium'
        });
        break;
      case 'test_mock_order':
        recs.push({
          pattern: p.name,
          action: 'Create a shared mock factory in tests/helpers/mocks.ts and update test conventions.',
          autoFixable: true,
          priority: p.count >= 2 ? 'high' : 'medium'
        });
        break;
      case 'ui_text_mismatch':
        recs.push({
          pattern: p.name,
          action: 'Enforce the test-briefing injection (already active) and add a rule to prefer getByRole.',
          autoFixable: false,
          priority: 'medium'
        });
        break;
      case 'git_staging':
        recs.push({
          pattern: p.name,
          action: 'Ensure .gitignore covers node_modules, dist, .next, *.db and install the pre-commit hook.',
          autoFixable: true,
          priority: 'high'
        });
        break;
      case 'path_misunderstanding':
        recs.push({
          pattern: p.name,
          action: 'Verify project-map.md exists and is loaded by implementation agents (already active).',
          autoFixable: false,
          priority: 'medium'
        });
        break;
      case 'handoff_contract':
        recs.push({
          pattern: p.name,
          action: 'Review agent prompts to ensure they set the correct gates and produce required artifacts.',
          autoFixable: false,
          priority: 'high'
        });
        break;
      default:
        recs.push({
          pattern: p.name,
          action: 'Investigate root cause manually and add a preventive rule.',
          autoFixable: false,
          priority: 'low'
        });
    }
  }
  return recs;
}

module.exports = {
  scanFriction,
  buildRecommendations,
  PATTERNS
};
