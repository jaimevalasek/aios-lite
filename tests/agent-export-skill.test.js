'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runAgentExportSkill, generateSkillMd } = require('../src/commands/agent-export-skill');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-export-skill-'));
}

const SAMPLE_AGENT_CONTENT = `---
name: Dev Agent
description: Feature implementation agent for any stack
---

# Dev Agent

## Mission
Implement features for any stack using Read, Write, Edit, Bash, Glob, Grep tools.

## Process
1. Read the existing code
2. Write new implementation
3. Use Bash to run tests

## AIOSON Runtime boundary
This section should be stripped for portability.

## Working memory
Use TaskCreate and TaskUpdate to track progress.
`;

async function writeAgent(tmpDir, agentName, content) {
  const dir = path.join(tmpDir, '.aioson', 'agents');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${agentName}.md`), content, 'utf8');
}

// ─── generateSkillMd ─────────────────────────────────────────────────────────

test('generateSkillMd produces SKILL.md with valid frontmatter', () => {
  const skillContent = generateSkillMd('dev', SAMPLE_AGENT_CONTENT);
  assert.ok(skillContent.startsWith('---\n'), 'should start with YAML frontmatter');
  assert.ok(skillContent.includes('name:'), 'should have name field');
  assert.ok(skillContent.includes('description:'), 'should have description field');
  assert.ok(skillContent.includes('version:'), 'should have version field');
  assert.ok(skillContent.includes('tools:'), 'should have tools field');
  assert.ok(skillContent.includes('context: fork'), 'should set context: fork');
});

test('generateSkillMd extracts tools from agent body', () => {
  const skillContent = generateSkillMd('dev', SAMPLE_AGENT_CONTENT);
  assert.ok(skillContent.includes('Read'));
  assert.ok(skillContent.includes('Write'));
  assert.ok(skillContent.includes('Bash'));
});

test('generateSkillMd adds activation patterns', () => {
  const skillContent = generateSkillMd('dev', SAMPLE_AGENT_CONTENT);
  assert.ok(skillContent.includes('activation:'));
  assert.ok(skillContent.includes('.aioson/**'));
});

test('generateSkillMd adds keyword activations for known agent types', () => {
  const devSkill = generateSkillMd('dev', 'Use Read tool.');
  assert.ok(devSkill.includes('implement') || devSkill.includes('code') || devSkill.includes('build'));
});

test('generateSkillMd strips AIOSON Runtime boundary sections', () => {
  const skillContent = generateSkillMd('dev', SAMPLE_AGENT_CONTENT);
  assert.ok(!skillContent.includes('AIOSON Runtime boundary'), 'should strip runtime boundary section');
});

test('generateSkillMd preserves core agent content', () => {
  const skillContent = generateSkillMd('dev', SAMPLE_AGENT_CONTENT);
  assert.ok(skillContent.includes('## Mission'), 'should preserve Mission section');
  assert.ok(skillContent.includes('## Process'), 'should preserve Process section');
});

test('generateSkillMd uses custom version when provided', () => {
  const skillContent = generateSkillMd('dev', SAMPLE_AGENT_CONTENT, { version: '2.5.0' });
  assert.ok(skillContent.includes('version: 2.5.0'));
});

test('generateSkillMd capitalizes agent name in skill name', () => {
  const skillContent = generateSkillMd('qa', 'Use Read tool.');
  assert.ok(skillContent.includes('name: AIOSON Qa Agent') || skillContent.includes('name: AIOSON QA'));
});

test('generateSkillMd handles agent content without frontmatter', () => {
  const content = '# Simple Agent\n\nDo something with Read tool.';
  const skillContent = generateSkillMd('simple', content);
  assert.ok(skillContent.startsWith('---\n'));
  assert.ok(skillContent.includes('context: fork'));
});

// ─── runAgentExportSkill ─────────────────────────────────────────────────────

test('runAgentExportSkill creates SKILL.md in output directory', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeAgent(tmpDir, 'dev', SAMPLE_AGENT_CONTENT);
    const logger = { log: () => {}, error: () => {} };

    const result = await runAgentExportSkill({
      args: [tmpDir],
      options: { agent: 'dev' },
      logger
    });

    assert.equal(result.ok, true);
    const skillPath = path.join(tmpDir, result.outputDir, 'SKILL.md');
    const exists = await fs.access(skillPath).then(() => true).catch(() => false);
    assert.ok(exists, 'SKILL.md should exist in output dir');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runAgentExportSkill creates scripts/ directory', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeAgent(tmpDir, 'dev', SAMPLE_AGENT_CONTENT);
    const logger = { log: () => {}, error: () => {} };

    const result = await runAgentExportSkill({
      args: [tmpDir],
      options: { agent: 'dev' },
      logger
    });

    const scriptsPath = path.join(tmpDir, result.outputDir, 'scripts');
    const exists = await fs.access(scriptsPath).then(() => true).catch(() => false);
    assert.ok(exists, 'scripts/ directory should be created');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runAgentExportSkill defaults output to .claude/skills/aioson-{agent}/', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeAgent(tmpDir, 'qa', SAMPLE_AGENT_CONTENT);
    const logger = { log: () => {}, error: () => {} };

    const result = await runAgentExportSkill({
      args: [tmpDir],
      options: { agent: 'qa' },
      logger
    });

    assert.ok(result.outputDir.includes('.claude/skills/aioson-qa') ||
              result.outputDir.includes('.claude\\skills\\aioson-qa'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runAgentExportSkill uses custom output directory', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeAgent(tmpDir, 'dev', SAMPLE_AGENT_CONTENT);
    const logger = { log: () => {}, error: () => {} };

    const customOutput = 'my-skills/dev-skill';
    const result = await runAgentExportSkill({
      args: [tmpDir],
      options: { agent: 'dev', output: customOutput },
      logger
    });

    assert.ok(result.ok);
    assert.ok(result.outputDir.includes('my-skills'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runAgentExportSkill returns error when --agent is missing', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logger = { log: () => {}, error: () => {} };
    const result = await runAgentExportSkill({ args: [tmpDir], options: {}, logger });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('agent'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runAgentExportSkill returns error for non-existent agent', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logger = { log: () => {}, error: () => {} };
    const result = await runAgentExportSkill({
      args: [tmpDir],
      options: { agent: 'nonexistent-agent' },
      logger
    });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('not_found'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runAgentExportSkill json option returns result object', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeAgent(tmpDir, 'dev', SAMPLE_AGENT_CONTENT);
    const logger = { log: () => {}, error: () => {} };

    const result = await runAgentExportSkill({
      args: [tmpDir],
      options: { agent: 'dev', json: true },
      logger
    });

    assert.equal(result.ok, true);
    assert.equal(result.agent, 'dev');
    assert.ok(Array.isArray(result.files));
    assert.ok(result.files.includes('SKILL.md'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runAgentExportSkill SKILL.md has valid frontmatter', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeAgent(tmpDir, 'dev', SAMPLE_AGENT_CONTENT);
    const logger = { log: () => {}, error: () => {} };

    const result = await runAgentExportSkill({
      args: [tmpDir],
      options: { agent: 'dev' },
      logger
    });

    const skillContent = await fs.readFile(path.join(tmpDir, result.outputDir, 'SKILL.md'), 'utf8');
    assert.ok(skillContent.startsWith('---\n'));
    assert.ok(skillContent.includes('context: fork'));
    assert.ok(skillContent.includes('activation:'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});
