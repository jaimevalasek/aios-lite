'use strict';

/**
 * test-briefing — auto-generate test context for @qa and @tester agents.
 *
 * Reduces friction from:
 *   - wrong UI text assertions (mock strings, button labels)
 *   - mock ordering bugs
 *   - incorrect test patterns
 *
 * Scans the project for:
 *   - existing test helpers / mock factories
 *   - recent test files to use as templates
 *   - UI text strings from components referenced in the spec
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { readFileSafe, fileExists } = require('./preflight-engine');

const MAX_MOCK_FILES = 5;
const MAX_COMPONENT_FILES = 8;
const MAX_TEST_FILES = 4;

async function findFiles(targetDir, patterns, maxDepth = 4) {
  const found = [];
  async function walk(dir, depth) {
    if (depth > maxDepth || found.length >= patterns.max) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name === '.aioson') continue;
        await walk(full, depth + 1);
      } else if (patterns.test(entry.name)) {
        found.push(full);
        if (found.length >= patterns.max) return;
      }
    }
  }
  await walk(targetDir, 0);
  return found;
}

async function findMockHelpers(targetDir) {
  // Look for common mock/helper patterns
  const candidates = [
    path.join(targetDir, 'tests', 'helpers', 'mocks.ts'),
    path.join(targetDir, 'tests', 'helpers', 'mocks.js'),
    path.join(targetDir, 'test', 'helpers', 'mocks.ts'),
    path.join(targetDir, 'test', 'helpers', 'mocks.js'),
    path.join(targetDir, 'src', '__mocks__', 'index.ts'),
    path.join(targetDir, 'src', '__mocks__', 'index.js'),
    path.join(targetDir, '__mocks__', 'index.ts'),
    path.join(targetDir, '__mocks__', 'index.js'),
  ];
  const found = [];
  for (const p of candidates) {
    if (await fileExists(p)) found.push(p);
  }
  return found;
}

async function findRecentTestFiles(targetDir) {
  const files = await findFiles(targetDir, {
    test: (name) => /\.(test|spec)\.(js|jsx|ts|tsx)$/.test(name),
    max: 20
  });
  // Sort by mtime descending, keep top N
  const withStat = [];
  for (const f of files) {
    try {
      const stat = await fs.stat(f);
      withStat.push({ path: f, mtime: stat.mtime });
    } catch { /* ignore */ }
  }
  withStat.sort((a, b) => b.mtime - a.mtime);
  return withStat.slice(0, MAX_TEST_FILES).map((x) => x.path);
}

async function findComponentFiles(targetDir) {
  // Heuristic: look in src/ for .tsx/.jsx files that are not tests
  const files = await findFiles(path.join(targetDir, 'src'), {
    test: (name) => /\.(tsx|jsx)$/.test(name) && !/(test|spec)\./.test(name),
    max: 30
  });
  // Prefer files modified recently (likely part of the current feature)
  const withStat = [];
  for (const f of files) {
    try {
      const stat = await fs.stat(f);
      withStat.push({ path: f, mtime: stat.mtime });
    } catch { /* ignore */ }
  }
  withStat.sort((a, b) => b.mtime - a.mtime);
  return withStat.slice(0, MAX_COMPONENT_FILES).map((x) => x.path);
}

function extractUiStrings(content) {
  // Extract text inside JSX/TSX that looks user-facing
  // Pattern 1: string literals inside tags > "text" or {'text'}
  const strings = [];
  const tagTextRe = />([^<>{}]{2,80})</g;
  let m;
  while ((m = tagTextRe.exec(content)) !== null) {
    const text = m[1].trim();
    if (text && !text.startsWith('{') && !text.endsWith('}')) {
      strings.push(text);
    }
  }
  // Pattern 2: placeholder="..." label="..." title="..." aria-label="..."
  const attrRe = /(?:placeholder|label|title|aria-label|aria-labelledby|alt|helperText|errorText)\s*=\s*["']([^"']{1,80})["']/g;
  while ((m = attrRe.exec(content)) !== null) {
    strings.push(m[1].trim());
  }
  // Deduplicate and limit
  return [...new Set(strings)].slice(0, 40);
}

function extractMockPatterns(content) {
  const patterns = [];
  // Look for vi.mock / vi.fn / jest.mock / jest.fn patterns
  const mockRe = /^(?:\s*)(vi|jest)\.(mock|fn)\s*\(/gm;
  let m;
  while ((m = mockRe.exec(content)) !== null) {
    const lineStart = content.lastIndexOf('\n', m.index) + 1;
    const lineEnd = content.indexOf('\n', m.index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
    patterns.push(line);
  }
  return patterns.slice(0, 20);
}

async function buildTestBriefing(targetDir) {
  const lines = [];
  lines.push('## Auto-generated Test Context (motor do AIOSON)');
  lines.push('');

  // 1. Mock helpers
  const mockHelpers = await findMockHelpers(targetDir);
  if (mockHelpers.length > 0) {
    lines.push('### Shared mock helpers found');
    for (const p of mockHelpers) {
      const rel = path.relative(targetDir, p);
      lines.push(`- ${rel}`);
    }
    lines.push('> Use these helpers instead of writing ad-hoc mocks. This prevents ordering bugs.');
    lines.push('');
  }

  // 2. Recent test templates
  const recentTests = await findRecentTestFiles(targetDir);
  if (recentTests.length > 0) {
    lines.push('### Recent test files (use as templates for patterns)');
    for (const p of recentTests) {
      const rel = path.relative(targetDir, p);
      lines.push(`- ${rel}`);
    }
    lines.push('> Reference these files for mock ordering, assertion style, and helpers before writing new tests.');
    lines.push('');
  }

  // 3. Mock patterns from recent tests
  if (recentTests.length > 0) {
    const mockPatterns = [];
    for (const p of recentTests.slice(0, 2)) {
      const content = await readFileSafe(p);
      if (content) {
        mockPatterns.push(...extractMockPatterns(content));
      }
    }
    if (mockPatterns.length > 0) {
      lines.push('### Common mock patterns in this project');
      for (const pat of [...new Set(mockPatterns)].slice(0, 10)) {
        lines.push(`- \`${pat}\``);
      }
      lines.push('');
    }
  }

  // 4. UI text strings from recent components
  const components = await findComponentFiles(targetDir);
  if (components.length > 0) {
    const allStrings = [];
    for (const p of components) {
      const content = await readFileSafe(p);
      if (content) {
        const strings = extractUiStrings(content);
        if (strings.length > 0) {
          allStrings.push({ file: path.relative(targetDir, p), strings });
        }
      }
    }
    if (allStrings.length > 0) {
      lines.push('### UI text strings from recent components');
      lines.push('> Verify exact strings before using them in assertions. Prefer `getByRole` over `getByText` when possible.');
      for (const item of allStrings.slice(0, MAX_COMPONENT_FILES)) {
        lines.push(`\n**${item.file}:**`);
        for (const s of item.strings.slice(0, 12)) {
          lines.push(`- "${s}"`);
        }
      }
      lines.push('');
    }
  }

  // 5. Testing conventions reminder
  lines.push('### Testing conventions');
  lines.push('- Verify exact UI text strings against component source before using them in assertions.');
  lines.push('- Use `getByRole` over `getByText` when possible.');
  lines.push('- If using `vi.mock`, ensure deterministic ordering (mock factories > mock implementations).');
  lines.push('- Reference existing test files as templates for assertion style and helper usage.');
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  buildTestBriefing
};
