'use strict';

/**
 * Skills as a selector surface — the reachability gap the governance audit
 * left open: 15 shipped SKILL.md routers were invisible to context:select,
 * reachable only through kernel prose and advisory recall. Now a skill router
 * that declares routing frontmatter surfaces in a dedicated advisory `skills`
 * section of the brief. Contract:
 *   - only SKILL.md routers are candidates (reference trees stay recall-only);
 *   - hard signals only (no semantic scoring) — an unrouted SKILL.md is
 *     invisible, so pre-frontmatter consumers see zero behavior change;
 *   - never must_load/should_load law, never guard injection.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { selectContext } = require('../src/context-selector');
const { buildContextBrief } = require('../src/context-brief');
const { buildGuardResponse } = require('../src/context-guard');

async function writeFile(dir, relPath, content) {
  const absPath = path.join(dir, relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, 'utf8');
}

async function skillsProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-skills-surface-'));
  await writeFile(dir, '.aioson/context/project.context.md', [
    '---', 'framework: Node.js', 'project_type: web-app', 'load_tier: always', '---', '# Project'
  ].join('\n'));
  await writeFile(dir, '.aioson/skills/process/secure-demo/SKILL.md', [
    '---',
    'name: secure-demo',
    'description: adversarial testing for sensitive surfaces',
    'agents: [dev, deyvin]',
    'triggers: [authentication, login, pagamento]',
    'paths: ["**/auth/**"]',
    '---',
    '# Secure demo'
  ].join('\n'));
  await writeFile(dir, '.aioson/skills/process/secure-demo/references/stack.md', [
    '---', 'description: reference material mentioning authentication and login', '---', 'body'
  ].join('\n'));
  await writeFile(dir, '.aioson/skills/static/unrouted/SKILL.md', [
    '---',
    'name: unrouted',
    'description: a skill router with description only, like every pre-frontmatter consumer',
    '---',
    '# Unrouted'
  ].join('\n'));
  await writeFile(dir, '.aioson/installed-skills/acquired/SKILL.md', [
    '---',
    'name: acquired',
    'description: an installed store skill',
    'triggers: [holographic dashboard]',
    '---',
    '# Acquired'
  ].join('\n'));
  return dir;
}

test('a routed SKILL.md surfaces on hard signals; references and unrouted routers stay invisible', async () => {
  const dir = await skillsProject();
  try {
    const selection = await selectContext(dir, {
      agent: 'dev', mode: 'executing',
      task: 'implement login with authentication middleware',
      paths: 'src/auth/session.ts'
    });
    const skillPaths = selection.selected.filter((item) => item.surface === 'skills').map((item) => item.path);
    assert.deepEqual(skillPaths, ['.aioson/skills/process/secure-demo/SKILL.md'], skillPaths.join(', '));

    // Task words appear verbatim inside the unrouted description and the
    // reference file — neither may ride in on semantic overlap.
    const recallOnly = await selectContext(dir, {
      agent: 'dev', mode: 'executing',
      task: 'description only, like every pre-frontmatter consumer'
    });
    const recallSkills = recallOnly.selected.filter((item) => item.surface === 'skills');
    assert.deepEqual(recallSkills, [], JSON.stringify(recallSkills));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('installed-skills routers are the same surface', async () => {
  const dir = await skillsProject();
  try {
    const selection = await selectContext(dir, {
      agent: 'dev', mode: 'executing',
      task: 'wire the holographic dashboard widget grid'
    });
    const skillPaths = selection.selected.filter((item) => item.surface === 'skills').map((item) => item.path);
    assert.ok(skillPaths.includes('.aioson/installed-skills/acquired/SKILL.md'), skillPaths.join(', '));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('the agents filter gates the skills surface', async () => {
  const dir = await skillsProject();
  try {
    const selection = await selectContext(dir, {
      agent: 'product', mode: 'planning',
      task: 'define the login and authentication requirements for the PRD'
    });
    const skillPaths = selection.selected.filter((item) => item.surface === 'skills').map((item) => item.path);
    assert.deepEqual(skillPaths, [], skillPaths.join(', '));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('the brief carries skills in their own advisory section, never as law', async () => {
  const dir = await skillsProject();
  try {
    const brief = await buildContextBrief(dir, {
      agent: 'dev', mode: 'executing',
      task: 'implement login with authentication middleware',
      paths: 'src/auth/session.ts'
    });
    const skillPaths = (brief.skills || []).map((item) => item.path);
    assert.deepEqual(skillPaths, ['.aioson/skills/process/secure-demo/SKILL.md'], skillPaths.join(', '));
    const law = [...brief.must_load, ...brief.should_load].map((item) => item.path);
    assert.equal(law.some((p) => p.includes('/SKILL.md')), false, law.join(', '));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('the guard never injects a skill router', async () => {
  const dir = await skillsProject();
  try {
    const response = await buildGuardResponse({
      tool_name: 'Write',
      tool_input: {
        file_path: 'src/auth/login.ts',
        content: 'export async function login(user, password) { return authenticate(user, password); }'
      }
    }, dir, { tool: 'claude', agent: 'dev' });
    const injected = (response._guard && response._guard.rules) || [];
    assert.equal(injected.some((p) => p.includes('/SKILL.md')), false, injected.join(', '));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('select --explain names the exclusion cause for a skills path', async () => {
  const dir = await skillsProject();
  try {
    const selection = await selectContext(dir, {
      agent: 'product', mode: 'planning',
      task: 'define the login requirements',
      explain: '.aioson/skills/process/secure-demo/SKILL.md,.aioson/skills/nowhere/SKILL.md'
    });
    const byPath = new Map(selection.explain.map((entry) => [entry.path, entry]));
    assert.equal(byPath.get('.aioson/skills/process/secure-demo/SKILL.md').cause, 'agent_filter');
    assert.equal(byPath.get('.aioson/skills/nowhere/SKILL.md').cause, 'not_a_candidate');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
