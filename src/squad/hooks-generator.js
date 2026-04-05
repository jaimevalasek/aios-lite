'use strict';

/**
 * Hooks Generator — Plan 81, Phase 1.2
 *
 * Generates Claude Code .claude/settings.json hooks for squad execution.
 * Uses hook types: command, agent.
 *
 * Generated hooks:
 *   - Stop hook: quality gate agent that blocks incomplete work
 *   - TaskCompleted hook: learning extraction after each task
 *   - PostToolUse hook: mailbox-to-bus bridge (SendMessage interception)
 *
 * The hooks are session-scoped: written before squad:autorun starts,
 * cleaned up after the session ends (or left for the next session).
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const CLAUDE_DIR = '.claude';
const SETTINGS_FILE = 'settings.json';
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');

// ─── Quality Gate Agent Template ─────────────────────────────────────────────

function qualityGateAgentTemplate(squadSlug) {
  return `# Squad Quality Gate — ${squadSlug}

You are a verification agent for the "${squadSlug}" squad. Before allowing a worker to finish:

1. Read the worker's output files listed in the task brief
2. Check must_haves from the task specification:
   - **Tier 1 (Exists):** All required files exist on disk
   - **Tier 2 (Substantive):** Files have meaningful content (no stubs, TODOs, or placeholders)
   - **Tier 3 (Wired):** Files are referenced/imported where they should be
3. If any tier fails: respond with BLOCK and specific feedback on what is missing
4. If all pass: respond with ALLOW

## Output Format

\`\`\`json
{
  "decision": "allow|block",
  "tier_results": {
    "exists": true,
    "substantive": true,
    "wired": true
  },
  "reason": "All tiers passed — output meets acceptance criteria",
  "issues": []
}
\`\`\`

## Important

- You have NO context from the generating agent's conversation
- Judge ONLY the artifacts on disk vs the spec requirements
- Be strict on Tier 1 (exists) and Tier 2 (substantive)
- Be lenient on Tier 3 (wired) — warn but don't block for minor wiring issues
`;
}

// ─── Settings Generator ──────────────────────────────────────────────────────

/**
 * Generate Claude Code hooks configuration for a squad session.
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {object} [options]  — { enableQualityGate, enableLearning, enableBusBridge }
 * @returns {object}  — hooks configuration object
 */
function generateHooksConfig(squadSlug, options = {}) {
  const {
    enableQualityGate = true,
    enableLearning = true,
    enableBusBridge = false
  } = options;

  const hooks = {};

  // Stop hook: quality gate (blocks workers from finishing with incomplete work)
  if (enableQualityGate) {
    hooks.Stop = [{
      type: 'agent',
      agent: `.claude/agents/squad-quality-gate-${squadSlug}.md`,
      matcher: `agent:squad-worker-*`
    }];
  }

  // TaskCompleted hook: automatic learning extraction
  if (enableLearning) {
    if (!hooks.TaskCompleted) hooks.TaskCompleted = [];
    hooks.TaskCompleted.push({
      type: 'command',
      command: `node -e "require('./src/squad/learning-extractor').extractLearnings(process.cwd(), '${squadSlug}', process.env.SESSION_ID || 'unknown', { busMessages: [], taskResults: [], reflectionReports: [] }).catch(() => {})"`
    });
  }

  // PostToolUse hook: mailbox-to-bus bridge (intercepts SendMessage)
  if (enableBusBridge) {
    if (!hooks.PostToolUse) hooks.PostToolUse = [];
    hooks.PostToolUse.push({
      type: 'command',
      matcher: 'SendMessage',
      command: `node -e "require('./src/squad/bus-bridge').bridgeMailboxToBus(process.cwd(), '${squadSlug}', process.env.SESSION_ID || 'unknown', process.env.TOOL_INPUT || '{}').catch(() => {})"`
    });
  }

  return hooks;
}

/**
 * Write hooks to .claude/settings.json (merge with existing).
 *
 * @param {string} projectDir
 * @param {string} squadSlug
 * @param {object} [options]
 * @returns {Promise<object>}  — { settingsPath, agentPath, hooks }
 */
async function writeSquadHooks(projectDir, squadSlug, options = {}) {
  const settingsDir = path.join(projectDir, CLAUDE_DIR);
  const settingsPath = path.join(settingsDir, SETTINGS_FILE);
  const agentsDir = path.join(projectDir, AGENTS_DIR);

  // Ensure directories
  await fs.mkdir(settingsDir, { recursive: true });
  await fs.mkdir(agentsDir, { recursive: true });

  // Read existing settings
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
  } catch { /* no existing settings */ }

  // Generate hooks
  const hooks = generateHooksConfig(squadSlug, options);

  // Merge hooks (squad hooks go into a namespaced section)
  const merged = {
    ...existing,
    hooks: {
      ...(existing.hooks || {}),
      ...hooks
    },
    _squadHooksFor: squadSlug,
    _squadHooksAt: new Date().toISOString()
  };

  await fs.writeFile(settingsPath, JSON.stringify(merged, null, 2), 'utf8');

  // Write quality gate agent template
  let agentPath = null;
  if (options.enableQualityGate !== false) {
    agentPath = path.join(agentsDir, `squad-quality-gate-${squadSlug}.md`);
    await fs.writeFile(agentPath, qualityGateAgentTemplate(squadSlug), 'utf8');
  }

  return {
    settingsPath,
    agentPath,
    hooks,
    merged: Object.keys(hooks).length
  };
}

/**
 * Remove squad-specific hooks from .claude/settings.json.
 */
async function cleanupSquadHooks(projectDir, squadSlug) {
  const settingsPath = path.join(projectDir, CLAUDE_DIR, SETTINGS_FILE);

  try {
    const existing = JSON.parse(await fs.readFile(settingsPath, 'utf8'));

    if (existing._squadHooksFor === squadSlug) {
      // Remove squad-specific hooks
      delete existing.hooks;
      delete existing._squadHooksFor;
      delete existing._squadHooksAt;
      await fs.writeFile(settingsPath, JSON.stringify(existing, null, 2), 'utf8');
    }

    // Remove quality gate agent
    const agentPath = path.join(projectDir, AGENTS_DIR, `squad-quality-gate-${squadSlug}.md`);
    await fs.unlink(agentPath).catch(() => {});
  } catch { /* no settings to clean */ }
}

module.exports = {
  generateHooksConfig,
  writeSquadHooks,
  cleanupSquadHooks,
  qualityGateAgentTemplate
};
