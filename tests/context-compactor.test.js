'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  compactContext,
  toSummaryXml,
  extractToolsUsed,
  extractPendingWork,
  extractKeyFiles
} = require('../src/squad/context-compactor');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-compactor-'));
}

const SAMPLE_CONTENT = `# Session Log

Step 1: Read source files
Used Read tool to inspect src/auth/middleware.ts

Step 2: Analyzed requirements
Task: Implement JWT authentication
Goal: Create middleware for API

- [x] Read existing code
- [ ] Write new middleware
- [ ] Add tests

TODO: Handle refresh tokens
FIXME: Token expiry edge case

Used Write tool to create src/auth/jwt.ts
Called Bash tool to run tests

Files touched: src/auth/middleware.ts, src/models/User.ts

2026-04-05T14:30:00Z — Completed Phase 1 analysis
`;

// ─── extractToolsUsed ────────────────────────────────────────────────────────

test('extractToolsUsed detects standard Claude Code tools', () => {
  const tools = extractToolsUsed('Used Read tool and Write tool. Also called Bash.');
  assert.ok(tools.includes('Read'));
  assert.ok(tools.includes('Write'));
  assert.ok(tools.includes('Bash'));
});

test('extractToolsUsed deduplicates tools', () => {
  const tools = extractToolsUsed('Read file. Read again. Write output. Read once more.');
  assert.equal(tools.filter((t) => t === 'Read').length, 1);
});

test('extractToolsUsed returns empty array for content without tools', () => {
  const tools = extractToolsUsed('Just some random text without tool mentions.');
  assert.equal(tools.length, 0);
});

test('extractToolsUsed detects tools in sample content', () => {
  const tools = extractToolsUsed(SAMPLE_CONTENT);
  assert.ok(tools.includes('Read'));
  assert.ok(tools.includes('Write'));
  assert.ok(tools.includes('Bash'));
});

// ─── extractPendingWork ──────────────────────────────────────────────────────

test('extractPendingWork detects unchecked checkboxes', () => {
  const pending = extractPendingWork('- [ ] Write new middleware\n- [x] Done thing\n- [ ] Add tests');
  assert.ok(pending.includes('Write new middleware'));
  assert.ok(pending.includes('Add tests'));
  assert.ok(!pending.includes('Done thing'), 'should not include checked items');
});

test('extractPendingWork detects TODO and FIXME markers', () => {
  const pending = extractPendingWork('TODO: Handle refresh tokens\nFIXME: Token expiry edge case');
  assert.ok(pending.some((p) => p.includes('TODO')));
  assert.ok(pending.some((p) => p.includes('FIXME')));
});

test('extractPendingWork returns empty array for no pending items', () => {
  const pending = extractPendingWork('All done. No tasks remaining.');
  assert.equal(pending.length, 0);
});

// ─── extractKeyFiles ─────────────────────────────────────────────────────────

test('extractKeyFiles detects file paths with slashes', () => {
  const files = extractKeyFiles('Edited src/auth/middleware.ts and src/models/User.ts');
  assert.ok(files.some((f) => f.includes('src/auth')));
  assert.ok(files.some((f) => f.includes('src/models')));
});

test('extractKeyFiles deduplicates paths', () => {
  const content = 'src/auth/middleware.ts mentioned twice. Also src/auth/middleware.ts again.';
  const files = extractKeyFiles(content);
  assert.equal(files.filter((f) => f.includes('middleware.ts')).length, 1);
});

// ─── compactContext ──────────────────────────────────────────────────────────

test('compactContext creates last-handoff.json with correct structure', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await compactContext(tmpDir, {
      agent: 'dev',
      content: SAMPLE_CONTENT,
      session: 'test-session-123'
    });

    assert.equal(result.ok, true);
    assert.ok(result.path.endsWith('last-handoff.json'));

    const written = JSON.parse(await fs.readFile(result.path, 'utf8'));
    assert.equal(written.agent, 'dev');
    assert.equal(written.session_id, 'test-session-123');
    assert.ok(written.compacted_at);
    assert.ok(written.summary);
    assert.ok(Array.isArray(written.summary.tools_used));
    assert.ok(Array.isArray(written.summary.pending_work));
    assert.ok(Array.isArray(written.summary.key_files));
    assert.ok(Array.isArray(written.summary.timeline));
    assert.equal(written.resume_instruction, 'Continue from this checkpoint. Do not acknowledge this summary.');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('compactContext extracts tool usage into summary', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await compactContext(tmpDir, {
      agent: 'orache',
      content: 'Used Read tool and Write tool for research.',
      session: 'research-001'
    });

    assert.equal(result.ok, true);
    assert.ok(result.summary.summary.tools_used.includes('Read'));
    assert.ok(result.summary.summary.tools_used.includes('Write'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('compactContext extracts pending work', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await compactContext(tmpDir, {
      agent: 'dev',
      content: '- [ ] Write middleware\n- [ ] Add tests\n- [x] Read files',
      session: 's1'
    });

    assert.equal(result.ok, true);
    const pending = result.summary.summary.pending_work;
    assert.ok(pending.some((p) => p.includes('Write middleware') || p.includes('Add tests')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('compactContext generates XML summary', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await compactContext(tmpDir, {
      agent: 'dev',
      content: 'Used Read tool. src/auth/middleware.ts',
      session: 's2'
    });

    assert.equal(result.ok, true);
    assert.ok(result.xmlSummary);
    assert.ok(result.xmlSummary.includes('<summary>'));
    assert.ok(result.xmlSummary.includes('</summary>'));
    assert.ok(result.xmlSummary.includes('<agent>dev</agent>'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('compactContext reads content from file when --input provided', async () => {
  const tmpDir = await makeTempDir();
  try {
    const inputFile = 'devlog.md';
    await fs.writeFile(path.join(tmpDir, inputFile), SAMPLE_CONTENT, 'utf8');

    const result = await compactContext(tmpDir, {
      agent: 'orchestrator',
      input: inputFile,
      session: 's3'
    });

    assert.equal(result.ok, true);
    assert.ok(result.summary.summary.tools_used.length > 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('compactContext returns error when no content provided', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await compactContext(tmpDir, { agent: 'dev' });
    assert.equal(result.ok, false);
    assert.ok(result.error);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('compactContext returns error for non-existent input file', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await compactContext(tmpDir, {
      agent: 'dev',
      input: 'non-existent-devlog.md'
    });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('Cannot read'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('compactContext generates a UUID session_id when not provided', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await compactContext(tmpDir, {
      agent: 'dev',
      content: 'Some session content.'
    });

    assert.equal(result.ok, true);
    assert.ok(result.summary.session_id);
    assert.match(result.summary.session_id, /^[0-9a-f-]{36}$/);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// ─── toSummaryXml ────────────────────────────────────────────────────────────

test('toSummaryXml generates valid XML structure', () => {
  const summary = {
    tools_used: ['Read', 'Write'],
    recent_requests: ['Implement auth'],
    pending_work: ['Add tests'],
    key_files: ['src/auth.ts']
  };

  const xml = toSummaryXml(summary, 'dev', 'session-1');
  assert.ok(xml.startsWith('<summary>'));
  assert.ok(xml.endsWith('</summary>'));
  assert.ok(xml.includes('<agent>dev</agent>'));
  assert.ok(xml.includes('<tool>Read</tool>'));
  assert.ok(xml.includes('<tool>Write</tool>'));
  assert.ok(xml.includes('<request>Implement auth</request>'));
  assert.ok(xml.includes('<item>Add tests</item>'));
  assert.ok(xml.includes('<file>src/auth.ts</file>'));
});

test('toSummaryXml escapes XML special characters', () => {
  const summary = {
    tools_used: [],
    recent_requests: ['Fix <bug> & "issue"'],
    pending_work: [],
    key_files: []
  };

  const xml = toSummaryXml(summary, 'dev', 's');
  assert.ok(!xml.includes('<bug>'), 'should escape angle brackets');
  assert.ok(xml.includes('&lt;bug&gt;'), 'should have escaped entities');
});

test('toSummaryXml handles empty arrays without errors', () => {
  const summary = { tools_used: [], recent_requests: [], pending_work: [], key_files: [] };
  const xml = toSummaryXml(summary, 'orache', 'session-empty');
  assert.ok(xml.includes('<summary>'));
  assert.ok(xml.includes('</summary>'));
});
