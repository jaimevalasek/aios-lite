'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEMPLATE = path.resolve(__dirname, '..', 'template');

function walkMarkdown(root, predicate = () => true) {
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.md') && predicate(file)) files.push(file);
    }
  };
  visit(root);
  return files;
}

test('active agents, docs, and skill routers have no dangling literal skill references', () => {
  const agents = walkMarkdown(path.join(TEMPLATE, '.aioson', 'agents'));
  const docs = walkMarkdown(
    path.join(TEMPLATE, '.aioson', 'docs'),
    (file) => !/legacy/i.test(path.basename(file))
  );
  const routers = walkMarkdown(
    path.join(TEMPLATE, '.aioson', 'skills'),
    (file) => path.basename(file) === 'SKILL.md'
  );
  const referencePattern = /\.aioson\/skills\/[A-Za-z0-9_./{}-]+\.(?:md|yaml|json)/g;
  const missing = [];

  for (const source of [...agents, ...docs, ...routers]) {
    const content = fs.readFileSync(source, 'utf8');
    for (const match of content.matchAll(referencePattern)) {
      const target = match[0];
      if (/[{}*]/.test(target)) continue;
      const absolute = path.join(TEMPLATE, ...target.split('/'));
      if (!fs.existsSync(absolute)) {
        missing.push({
          source: path.relative(TEMPLATE, source).replaceAll('\\', '/'),
          target
        });
      }
    }
  }

  assert.deepEqual(missing, [], `dangling skill references:\n${JSON.stringify(missing, null, 2)}`);
});
