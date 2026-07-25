'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { runSkillAudit } = require('../src/commands/skill-audit');

const mockLogger = { log: () => {}, error: () => {}, warn: () => {} };

async function writeFileEnsured(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

describe('skill-audit.js — runSkillAudit', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-audit-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns no_files when no skill markdown exists', async () => {
    const result = await runSkillAudit({
      args: [tmpDir],
      options: { json: true, scope: 'all' },
      logger: mockLogger
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'no_files');
  });

  it('reports builtin, installed, and template skill costs', async () => {
    await writeFileEnsured(path.join(tmpDir, '.aioson', 'skills', 'process', 'alpha', 'SKILL.md'), '# Alpha\n');
    await writeFileEnsured(path.join(tmpDir, '.aioson', 'skills', 'process', 'alpha', 'references', 'deep.md'), 'A'.repeat(80));
    await writeFileEnsured(path.join(tmpDir, '.aioson', 'installed-skills', 'beta', 'SKILL.md'), '# Beta\n');
    await writeFileEnsured(path.join(tmpDir, 'template', '.aioson', 'skills', 'static', 'gamma.md'), '# Gamma\n');

    const result = await runSkillAudit({
      args: [tmpDir],
      options: { json: true, scope: 'all' },
      logger: mockLogger
    });

    assert.equal(result.ok, true);
    assert.equal(result.totals.files, 4);
    assert.equal(result.totals.routers, 2);
    assert.equal(result.totals.references, 1);
    assert.equal(result.totals.support, 1);
    assert.ok(result.totals.tokens > 0);
    assert.ok(result.files.some((file) => file.category === 'builtin_skill' && file.kind === 'router'));
    assert.ok(result.files.some((file) => file.category === 'installed_skill'));
    assert.ok(result.files.some((file) => file.category === 'template_skill'));
    assert.ok(result.files.some((file) => file.file.endsWith('references/deep.md') && file.kind === 'reference'));
  });

  it('defaults to runtime scope so template mirrors are not double counted', async () => {
    await writeFileEnsured(path.join(tmpDir, '.aioson', 'skills', 'process', 'alpha', 'SKILL.md'), '# Alpha\n');
    await writeFileEnsured(path.join(tmpDir, 'template', '.aioson', 'skills', 'process', 'alpha', 'SKILL.md'), '# Alpha mirror\n');

    const result = await runSkillAudit({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger
    });

    assert.equal(result.scope, 'runtime');
    assert.equal(result.totals.files, 1);
    assert.equal(result.files[0].category, 'builtin_skill');
  });

  it('reports deterministic process-skill reachability and deprecated skills', async () => {
    const skillPath = path.join(tmpDir, '.aioson', 'skills', 'process', 'alpha', 'SKILL.md');
    await writeFileEnsured(skillPath, '---\nname: alpha\n---\n# Alpha\n');
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'skills', 'process', 'legacy', 'SKILL.md'),
      '---\nname: legacy\n---\n# Legacy\n'
    );
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'skills', 'registry.json'),
      JSON.stringify({
        version: 1,
        skills: [
          {
            id: 'alpha',
            path: '.aioson/skills/process/alpha/SKILL.md',
            owner_agents: ['dev'],
            triggers: ['task'],
            tests: ['tests/alpha.test.js'],
            load_tier: 'risk_triggered',
            status: 'active',
            replacement: null
          },
          {
            id: 'legacy',
            path: '.aioson/skills/process/legacy/SKILL.md',
            owner_agents: [],
            triggers: [],
            tests: [],
            load_tier: 'manual_legacy',
            status: 'deprecated',
            replacement: 'alpha'
          }
        ]
      })
    );
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'agents', 'dev.md'),
      'Load `.aioson/skills/process/alpha/SKILL.md` for risky work.'
    );

    const result = await runSkillAudit({
      args: [tmpDir],
      options: { json: true, reachability: true, usage: true },
      logger: mockLogger
    });

    assert.equal(result.reachability.totals.directly_referenced, 1);
    assert.equal(result.reachability.totals.deprecated, 1);
    assert.equal(result.reachability.totals.orphans, 0);
    assert.equal(result.reachability.unregistered.length, 0);
    assert.equal(result.usage.available, false);
  });

  it('does not mistake inventory constants or legacy docs for executable skill routes', async () => {
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'skills', 'process', 'alpha', 'SKILL.md'),
      '---\nname: alpha\n---\n# Alpha\n'
    );
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'skills', 'registry.json'),
      JSON.stringify({
        version: 1,
        skills: [{
          id: 'alpha',
          path: '.aioson/skills/process/alpha/SKILL.md',
          owner_agents: [],
          triggers: ['explicit request'],
          tests: [],
          load_tier: 'risk_triggered',
          status: 'active',
          replacement: null
        }]
      })
    );
    await writeFileEnsured(
      path.join(tmpDir, 'src', 'constants.js'),
      "module.exports = ['.aioson/skills/process/alpha/SKILL.md'];\n"
    );
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'docs', 'gateway', 'legacy-agents-entrypoint.md'),
      'Legacy clients loaded `.aioson/skills/process/alpha/SKILL.md`.\n'
    );

    let result = await runSkillAudit({
      args: [tmpDir],
      options: { json: true, reachability: true },
      logger: mockLogger
    });
    let alpha = result.reachability.skills.find((skill) => skill.id === 'alpha');
    assert.equal(result.reachability.totals.directly_referenced, 0);
    assert.equal(alpha.reachability, 'contextual_reference');
    assert.deepEqual(alpha.direct_references, []);
    assert.deepEqual(
      alpha.contextual_references.map((reference) => reference.kind).sort(),
      ['inventory_reference', 'legacy_reference']
    );
    assert.equal(result.reachability.weak_process_skills.some((skill) => skill.id === 'alpha'), true);

    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'agents', 'dev.md'),
      'Load `.aioson/skills/process/alpha/SKILL.md` for the matching task.\n'
    );
    result = await runSkillAudit({
      args: [tmpDir],
      options: { json: true, reachability: true },
      logger: mockLogger
    });
    alpha = result.reachability.skills.find((skill) => skill.id === 'alpha');
    assert.equal(alpha.reachability, 'direct_reference');
    assert.deepEqual(alpha.direct_references, ['.aioson/agents/dev.md']);
  });

  it('follows an explicitly routed on-demand module but not an unrelated context doc', async () => {
    for (const id of ['alpha', 'beta']) {
      await writeFileEnsured(
        path.join(tmpDir, '.aioson', 'skills', 'process', id, 'SKILL.md'),
        `---\nname: ${id}\n---\n# ${id}\n`
      );
    }
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'skills', 'registry.json'),
      JSON.stringify({
        version: 1,
        skills: ['alpha', 'beta'].map((id) => ({
          id,
          path: `.aioson/skills/process/${id}/SKILL.md`,
          owner_agents: [],
          triggers: ['fixture'],
          tests: [],
          load_tier: 'risk_triggered',
          status: 'active',
          replacement: null
        }))
      })
    );
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'agents', 'dev.md'),
      [
        'For the matching state, load `.aioson/docs/dev/runtime-module.md`.',
        'Do not load `.aioson/docs/dev/forbidden-module.md`.'
      ].join('\n')
    );
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'docs', 'dev', 'runtime-module.md'),
      'Load `.aioson/skills/process/alpha/SKILL.md` for the matching task.\n'
    );
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'docs', 'notes.md'),
      'You can load `.aioson/skills/process/beta/SKILL.md` in historical experiments.\n'
    );
    await writeFileEnsured(
      path.join(tmpDir, '.aioson', 'docs', 'dev', 'forbidden-module.md'),
      'Load `.aioson/skills/process/beta/SKILL.md` for the matching task.\n'
    );

    const result = await runSkillAudit({
      args: [tmpDir],
      options: { json: true, reachability: true },
      logger: mockLogger
    });
    const alpha = result.reachability.skills.find((skill) => skill.id === 'alpha');
    const beta = result.reachability.skills.find((skill) => skill.id === 'beta');

    assert.equal(alpha.reachability, 'direct_reference');
    assert.deepEqual(alpha.direct_references, ['.aioson/docs/dev/runtime-module.md']);
    assert.deepEqual(alpha.direct_routes, [{
      path: '.aioson/docs/dev/runtime-module.md',
      routed_via: '.aioson/agents/dev.md'
    }]);
    assert.equal(beta.reachability, 'contextual_reference');
    assert.deepEqual(beta.direct_references, []);
  });
});
