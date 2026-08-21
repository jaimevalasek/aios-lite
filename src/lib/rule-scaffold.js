'use strict';

/**
 * Scaffolds a project-authored rule under `.aioson/rules/`.
 *
 * Rules are the sanctioned extension point: `context:select`/`context:brief` score
 * them by `agents`, `paths`, `triggers`, `task_types`, `priority`, and `load_tier`,
 * so a well-formed rule reaches every agent that touches matching work without
 * adding an agent or a hop. Hand-authored frontmatter is where that routing usually
 * breaks, so this command owns the shape and the project owns the content.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const RULES_DIR = path.join('.aioson', 'rules');
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Framework rules occupy the 5–10 band. A project rule defaults above it: when a
// client encodes their own design system or convention, it should outrank the
// framework's generic guidance rather than tie with it.
const DEFAULT_PRIORITY = 50;
const DEFAULT_MODES = ['planning', 'executing'];
const DEFAULT_LOAD_TIER = 'trigger';
const LOAD_TIERS = new Set(['always', 'trigger']);

function splitList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

// Quote only what YAML actually needs quoted inside a flow list: a leading
// indicator character, or a structural character anywhere. `src/**` and
// `refiner` stay bare, matching the shipped rules.
function yamlList(values) {
  const needsQuote = (v) => /^[-?:,[\]{}#&*!|>'"%@`]/.test(v) || /[:,[\]{}#]/.test(v);
  return `[${values.map((v) => (needsQuote(v) ? `"${v}"` : v)).join(', ')}]`;
}

function titleize(slug) {
  return slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function ruleBody(name, { description, agents, triggers, paths: pathPatterns }) {
  return `# ${titleize(name)}

${description}

## Precedence

This is a project rule. It outranks framework defaults, design-skill guidance, and \`.aioson/brains/\` nodes for the work it matches. When this rule and a brain node disagree, follow this rule and say so; do not silently apply the generic pattern instead.

## Scope

Applies to ${agents.length ? agents.map((a) => `\`@${a}\``).join(', ') : 'every agent'}${pathPatterns.length ? ` on ${pathPatterns.map((p) => `\`${p}\``).join(', ')}` : ''}.

## Rules

- Replace this list with the concrete, checkable statements this rule enforces.
- Write each one so an agent can tell whether it was followed, not as a preference.
- State the exception explicitly when one exists; an unqualified rule gets applied where it should not.

## Out of scope

- Name what this rule deliberately does not govern, so it is not stretched into unrelated work.
`;
}

/**
 * @returns {Promise<{ok: boolean, reason?: string, path?: string, name?: string,
 *   frontmatter?: object, overwritten?: boolean}>}
 */
async function scaffoldRule(projectDir, options = {}) {
  const name = String(options.name || '').trim().toLowerCase();
  if (!name) return { ok: false, reason: 'name_required' };
  if (!KEBAB.test(name)) return { ok: false, reason: 'invalid_name', name };

  const rulesDir = path.join(projectDir, RULES_DIR);
  try {
    await fs.access(path.join(projectDir, '.aioson'));
  } catch {
    return { ok: false, reason: 'not_an_aioson_project' };
  }

  const relPath = path.posix.join('.aioson', 'rules', `${name}.md`);
  const filePath = path.join(rulesDir, `${name}.md`);

  let exists = false;
  try {
    await fs.access(filePath);
    exists = true;
  } catch {
    exists = false;
  }
  // A rule already on disk is project-authored content. Never clobber it silently.
  if (exists && !options.force) {
    return { ok: false, reason: 'already_exists', name, path: relPath };
  }

  const loadTier = String(options['load-tier'] || options.loadTier || DEFAULT_LOAD_TIER).trim();
  if (!LOAD_TIERS.has(loadTier)) {
    return { ok: false, reason: 'invalid_load_tier', name, load_tier: loadTier };
  }

  const priorityInput = options.priority === undefined ? DEFAULT_PRIORITY : Number(options.priority);
  if (!Number.isFinite(priorityInput) || priorityInput < 0 || priorityInput > 100) {
    return { ok: false, reason: 'invalid_priority', name, priority: options.priority };
  }
  const priority = Math.trunc(priorityInput);

  const description = String(options.description || '').trim()
    || `Project rule: ${titleize(name)}. Replace this description with what it enforces and why.`;
  const agents = splitList(options.agents);
  const triggers = splitList(options.triggers);
  const taskTypes = splitList(options['task-types'] || options.taskTypes);
  const pathPatterns = splitList(options.paths);
  const modes = splitList(options.modes).length ? splitList(options.modes) : DEFAULT_MODES;

  const frontmatterLines = [
    '---',
    `name: ${name}`,
    `description: ${description.includes(':') ? `"${description.replace(/"/g, '\\"')}"` : description}`,
    `priority: ${priority}`,
    'version: 1.0.0'
  ];
  if (agents.length) frontmatterLines.push(`agents: ${yamlList(agents)}`);
  frontmatterLines.push(`modes: ${yamlList(modes)}`);
  if (taskTypes.length) frontmatterLines.push(`task_types: ${yamlList(taskTypes)}`);
  frontmatterLines.push(`load_tier: ${loadTier}`);
  if (triggers.length) frontmatterLines.push(`triggers: ${yamlList(triggers)}`);
  if (pathPatterns.length) frontmatterLines.push(`paths: ${yamlList(pathPatterns)}`);
  frontmatterLines.push('---', '');

  const content = `${frontmatterLines.join('\n')}\n${ruleBody(name, {
    description,
    agents,
    triggers,
    paths: pathPatterns
  })}`;

  await fs.mkdir(rulesDir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');

  // Without at least one routing dimension the rule only loads on load_tier: always.
  const warnings = [];
  if (!agents.length && !triggers.length && !taskTypes.length && !pathPatterns.length && loadTier !== 'always') {
    warnings.push('no_routing_dimension');
  }

  return {
    ok: true,
    name,
    path: relPath,
    overwritten: exists,
    warnings,
    frontmatter: {
      name,
      description,
      priority,
      agents,
      modes,
      task_types: taskTypes,
      load_tier: loadTier,
      triggers,
      paths: pathPatterns
    }
  };
}

module.exports = {
  DEFAULT_PRIORITY,
  DEFAULT_LOAD_TIER,
  scaffoldRule
};
