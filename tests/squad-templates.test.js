'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'template', '.aioson', 'templates', 'squads');

async function listTemplateDirs() {
  const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

test('all template.json files are valid JSON', async () => {
  const dirs = await listTemplateDirs();
  assert.ok(dirs.length > 0, 'Should have at least one template');
  for (const dir of dirs) {
    const filePath = path.join(TEMPLATES_DIR, dir, 'template.json');
    const raw = await fs.readFile(filePath, 'utf8').catch(() => null);
    assert.ok(raw !== null, `template.json missing for ${dir}`);
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { assert.fail(`Invalid JSON in ${dir}/template.json: ${e.message}`); }
    assert.ok(parsed, `Parsed template should be truthy for ${dir}`);
  }
});

test('all templates have required fields', async () => {
  const dirs = await listTemplateDirs();
  const required = ['slug', 'name', 'mode', 'suggestedExecutors'];
  for (const dir of dirs) {
    const filePath = path.join(TEMPLATES_DIR, dir, 'template.json');
    const raw = await fs.readFile(filePath, 'utf8');
    const tpl = JSON.parse(raw);
    for (const field of required) {
      assert.ok(tpl[field], `Template "${dir}" missing required field: ${field}`);
    }
    assert.ok(Array.isArray(tpl.suggestedExecutors) && tpl.suggestedExecutors.length > 0,
      `Template "${dir}" must have at least one suggestedExecutor`);
  }
});

test('all templates have valid mode', async () => {
  const dirs = await listTemplateDirs();
  const validModes = ['content', 'software', 'research', 'mixed'];
  for (const dir of dirs) {
    const filePath = path.join(TEMPLATES_DIR, dir, 'template.json');
    const raw = await fs.readFile(filePath, 'utf8');
    const tpl = JSON.parse(raw);
    assert.ok(validModes.includes(tpl.mode), `Template "${dir}" has invalid mode: ${tpl.mode}`);
  }
});

test('expected templates exist', async () => {
  const dirs = await listTemplateDirs();
  const expected = ['content-basic', 'research-analysis', 'software-delivery', 'media-channel'];
  for (const slug of expected) {
    assert.ok(dirs.includes(slug), `Expected template "${slug}" not found`);
  }
});
