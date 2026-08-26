'use strict';

/**
 * The routing contract of the shipped governance surfaces is measured, not
 * assumed: every rule and doc the template ships lints clean (description +
 * routing metadata), every SKILL.md entrypoint carries the frontmatter the
 * harness and the catalog read, and skill-audit names a skill that lost it.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runRulesLint } = require('../src/commands/rules-lint');
const { runSkillAudit } = require('../src/commands/skill-audit');
const { parseFrontmatter } = require('../src/preflight-engine');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'template');
const silent = { log() {}, error() {}, warn() {} };

async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

test('every shipped rule and doc lints clean: a description and routing metadata the selector can score', async () => {
  const report = await runRulesLint({ args: [TEMPLATE], options: { docs: true, json: true }, logger: silent });
  assert.equal(report.ok, true);
  assert.ok(report.rules.length >= 150, `${report.rules.length} rule/doc entries linted`);
  const warned = report.rules.filter((entry) => entry.warnings && entry.warnings.length > 0);
  assert.deepEqual(warned.map((entry) => `${entry.path}: ${entry.warnings.join(' | ')}`), []);
});

test('every shipped SKILL.md entrypoint declares name and description in its frontmatter', async () => {
  const files = (await walk(path.join(TEMPLATE, '.aioson', 'skills'))).filter((file) => path.basename(file) === 'SKILL.md');
  assert.ok(files.length >= 25, `${files.length} skill entrypoints`);
  const missing = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const frontmatter = /^---\r?\n/.test(content) ? parseFrontmatter(content) : {};
    if (!String(frontmatter.name || '').trim() || !String(frontmatter.description || '').trim()) {
      missing.push(path.relative(TEMPLATE, file).split(path.sep).join('/'));
    }
  }
  assert.deepEqual(missing, []);
});

test('skill-audit names a skill whose SKILL.md lost its frontmatter, even when the registry still routes it', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-skill-frontmatter-'));
  const write = async (rel, body) => {
    const file = path.join(dir, rel);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body, 'utf8');
  };
  try {
    await write('.aioson/skills/process/alpha/SKILL.md', '---\nname: alpha\ndescription: routes the alpha work\n---\n# Alpha\n');
    await write('.aioson/skills/process/bare/SKILL.md', '# Bare\n\nNo frontmatter at all.\n');
    await write('.aioson/skills/registry.json', JSON.stringify({
      version: 1,
      skills: [
        { id: 'alpha', path: '.aioson/skills/process/alpha/SKILL.md', owner_agents: ['dev'], triggers: ['alpha'], tests: [], load_tier: 'risk_triggered', status: 'active', replacement: null },
        { id: 'bare', path: '.aioson/skills/process/bare/SKILL.md', owner_agents: ['dev'], triggers: ['bare work'], tests: [], load_tier: 'risk_triggered', status: 'active', replacement: null }
      ]
    }));
    await write('.aioson/agents/dev.md', 'Load `.aioson/skills/process/alpha/SKILL.md` and `.aioson/skills/process/bare/SKILL.md`.');
    const result = await runSkillAudit({ args: [dir], options: { json: true, reachability: true }, logger: silent });
    const alpha = result.reachability.skills.find((skill) => skill.id === 'alpha');
    const bare = result.reachability.skills.find((skill) => skill.id === 'bare');
    assert.equal(alpha.frontmatter_missing, false);
    assert.deepEqual(alpha.frontmatter, { present: true, name: 'alpha', description: 'routes the alpha work' });
    assert.equal(bare.frontmatter_missing, true, 'registry routing does not make the file itself healthy');
    assert.equal(bare.reachability, 'direct_reference');
    assert.equal(result.reachability.totals.missing_frontmatter, 1);
    assert.deepEqual(result.reachability.missing_frontmatter, [{ id: 'bare', path: '.aioson/skills/process/bare/SKILL.md', reachability: 'direct_reference' }]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
