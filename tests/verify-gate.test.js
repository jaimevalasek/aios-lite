'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { runVerifyGate } = require('../src/commands/verify-gate');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

describe('verify-gate.js — runVerifyGate', () => {
  let tmpDir;
  const mockLogger = { log: () => {}, error: () => {}, warn: () => {} };

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'verify-gate-test-'));
    await ensureDir(path.join(tmpDir, '.aioson', 'context'));
    await ensureDir(path.join(tmpDir, 'src'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns BLOCKED when spec file not found', async () => {
    const result = await runVerifyGate({
      args: [tmpDir],
      options: { json: true, spec: 'missing.md' },
      logger: mockLogger
    });
    assert.equal(result.ok, false);
    assert.equal(result.verdict, 'BLOCKED');
  });

  it('returns BLOCKED when artifact not found', async () => {
    await fs.writeFile(path.join(tmpDir, 'spec.md'), '# Spec\n');
    const result = await runVerifyGate({
      args: [tmpDir],
      options: { json: true, spec: 'spec.md', artifact: 'nonexistent/' },
      logger: mockLogger
    });
    assert.equal(result.ok, false);
    assert.equal(result.verdict, 'BLOCKED');
  });

  it('returns PASS when spec has no verifiable requirements', async () => {
    await fs.writeFile(path.join(tmpDir, 'spec.md'), '# Spec\n\nJust a description.\n');
    await fs.writeFile(path.join(tmpDir, 'src', 'index.js'), 'console.log("hello");');
    const result = await runVerifyGate({
      args: [tmpDir],
      options: { json: true, spec: 'spec.md', artifact: 'src/' },
      logger: mockLogger
    });
    assert.equal(result.ok, true);
    assert.equal(result.verdict, 'PASS');
    assert.equal(result.files_scanned, 1);
  });

  it('detects missing required files', async () => {
    const spec = `# Spec

## Files to write
- \`src/auth.js\`
- \`src/user.ts\`

## Done criteria
- [x] Auth module works
- [ ] User module works
`;
    await fs.writeFile(path.join(tmpDir, 'spec.md'), spec);
    await fs.writeFile(path.join(tmpDir, 'src', 'auth.js'), '// auth');
    // src/user.ts is missing

    const result = await runVerifyGate({
      args: [tmpDir],
      options: { json: true, spec: 'spec.md', artifact: 'src/' },
      logger: mockLogger
    });
    assert.equal(result.ok, false);
    assert.equal(result.verdict, 'FAIL_WITH_ISSUES');
    assert.ok(result.issues.some((i) => i.includes('user.ts')));
    assert.ok(result.passes.some((p) => p.includes('auth.js')));
    assert.ok(result.issues.some((i) => i.includes('Unchecked criterion')));
  });

  it('detects forbidden patterns', async () => {
    const spec = `# Spec

## Must not
- \`eval(\`
- \`dangerouslySetInnerHTML\`
`;
    await fs.writeFile(path.join(tmpDir, 'spec.md'), spec);
    await fs.writeFile(path.join(tmpDir, 'src', 'bad.js'), 'eval("1+1");');
    await fs.writeFile(path.join(tmpDir, 'src', 'good.js'), 'console.log("safe");');

    const result = await runVerifyGate({
      args: [tmpDir],
      options: { json: true, spec: 'spec.md', artifact: 'src/' },
      logger: mockLogger
    });
    assert.equal(result.ok, false);
    assert.equal(result.verdict, 'FAIL_WITH_ISSUES');
    assert.ok(result.issues.some((i) => i.includes('eval(')));
    assert.ok(result.passes.some((p) => p.includes('dangerouslySetInnerHTML')));
  });

  it('detects required patterns', async () => {
    const spec = `# Spec

## Must contain
- use strict
- export default
`;
    await fs.writeFile(path.join(tmpDir, 'spec.md'), spec);
    await fs.writeFile(path.join(tmpDir, 'src', 'index.js'), "'use strict';\nexport default function() {}");

    const result = await runVerifyGate({
      args: [tmpDir],
      options: { json: true, spec: 'spec.md', artifact: 'src/' },
      logger: mockLogger
    });
    assert.equal(result.ok, true);
    assert.equal(result.verdict, 'PASS');
    assert.ok(result.passes.some((p) => p.includes('use strict')));
    assert.ok(result.passes.some((p) => p.includes('export default')));
  });

  it('writes report file', async () => {
    await fs.writeFile(path.join(tmpDir, 'spec.md'), '# Spec\n');
    await fs.writeFile(path.join(tmpDir, 'src', 'index.js'), 'console.log("hello");');

    const result = await runVerifyGate({
      args: [tmpDir],
      options: { json: true, spec: 'spec.md', artifact: 'src/' },
      logger: mockLogger
    });

    assert.ok(result.report_path);
    const reportContent = await fs.readFile(path.join(tmpDir, result.report_path), 'utf8');
    assert.ok(reportContent.includes('Verify Gate'));
    assert.ok(reportContent.includes('PASS'));
  });

  it('strict mode turns notes into failures', async () => {
    // Use a fresh artifact subdir to avoid files from previous tests
    const artifactDir = path.join(tmpDir, 'artifact-strict');
    await ensureDir(path.join(artifactDir, 'src'));
    const spec2 = `# Spec

## Files to write
- \`src/index.js\`
`;
    await fs.writeFile(path.join(tmpDir, 'spec2.md'), spec2);
    await fs.writeFile(path.join(artifactDir, 'src', 'index.js'), 'console.log("hello");');
    await fs.writeFile(path.join(artifactDir, 'src', 'empty.js'), ''); // empty file generates note

    const resultNormal = await runVerifyGate({
      args: [tmpDir],
      options: { json: true, spec: 'spec2.md', artifact: artifactDir },
      logger: mockLogger
    });
    assert.equal(resultNormal.verdict, 'PASS_WITH_NOTES');
    assert.equal(resultNormal.ok, true);
    assert.ok(resultNormal.notes.some((n) => n.includes('Empty file')));

    const resultStrict = await runVerifyGate({
      args: [tmpDir],
      options: { json: true, spec: 'spec2.md', artifact: artifactDir, strict: true },
      logger: mockLogger
    });
    assert.equal(resultStrict.verdict, 'FAIL_WITH_ISSUES');
    assert.equal(resultStrict.ok, false);
  });
});
