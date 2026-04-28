'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fssync = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { runDossierInit, runDossierShow } = require('../../src/commands/dossier');

let root;
let prevCwd;

function silentLogger() {
  return { log: () => {}, error: () => {}, warn: () => {} };
}

beforeEach(async () => {
  prevCwd = process.cwd();
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-cmd-dossier-'));
  await fs.mkdir(path.join(root, '.aioson', 'context'), { recursive: true });
  process.chdir(root);
});

afterEach(async () => {
  process.chdir(prevCwd);
  await fs.rm(root, { recursive: true, force: true });
});

describe('runDossierInit', () => {
  it('AC1: creates dossier at .aioson/context/features/{slug}/dossier.md', async () => {
    const result = await runDossierInit({
      args: ['.'],
      options: { slug: 'feature-x', json: true, classification: 'MEDIUM' },
      logger: silentLogger()
    });
    assert.equal(result.ok, true);
    const expected = path.join(root, '.aioson', 'context', 'features', 'feature-x', 'dossier.md');
    assert.equal(result.path, expected);
    assert.equal(fssync.existsSync(expected), true);
  });

  it('AC2: fails with already_exists when dossier already exists', async () => {
    await runDossierInit({
      args: ['.'], options: { slug: 'feature-x', json: true }, logger: silentLogger()
    });
    const result = await runDossierInit({
      args: ['.'], options: { slug: 'feature-x', json: true }, logger: silentLogger()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'already_exists');
  });

  it('AC3: extracts Why/What from prd-{slug}.md when present', async () => {
    const prd = [
      '---', 'feature_slug: feature-x', '---',
      '',
      '## Problem', 'A real pain.', '',
      '## Escopo do MVP', 'Ship it.', ''
    ].join('\n');
    await fs.writeFile(
      path.join(root, '.aioson', 'context', 'prd-feature-x.md'),
      prd
    );
    await runDossierInit({
      args: ['.'], options: { slug: 'feature-x', json: true }, logger: silentLogger()
    });
    const dossier = await fs.readFile(
      path.join(root, '.aioson', 'context', 'features', 'feature-x', 'dossier.md'),
      'utf8'
    );
    assert.match(dossier, /A real pain\./);
    assert.match(dossier, /Ship it\./);
  });

  it('rejects missing slug', async () => {
    const result = await runDossierInit({
      args: ['.'], options: { json: true }, logger: silentLogger()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_slug');
  });

  it('rejects invalid slug', async () => {
    const result = await runDossierInit({
      args: ['.'], options: { slug: 'Bad_Slug', json: true }, logger: silentLogger()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid_slug');
  });

  it('rejects invalid classification', async () => {
    const result = await runDossierInit({
      args: ['.'], options: { slug: 'feature-x', classification: 'BIG', json: true }, logger: silentLogger()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid_classification');
  });

  it('reads classification from project.context.md when --classification is omitted', async () => {
    await fs.writeFile(
      path.join(root, '.aioson', 'context', 'project.context.md'),
      '---\nproject_name: x\nclassification: SMALL\n---\n# x\n'
    );
    const result = await runDossierInit({
      args: ['.'], options: { slug: 'feature-y', json: true }, logger: silentLogger()
    });
    assert.equal(result.ok, true);
    assert.equal(result.classification, 'SMALL');
  });

  it('accepts --feature as a synonym for --slug', async () => {
    const result = await runDossierInit({
      args: ['.'], options: { feature: 'feature-z', json: true }, logger: silentLogger()
    });
    assert.equal(result.ok, true);
    assert.equal(result.slug, 'feature-z');
  });
});

describe('runDossierShow', () => {
  it('AC4: renders dossier without error when code-map is empty', async () => {
    await runDossierInit({
      args: ['.'], options: { slug: 'feature-x', json: true }, logger: silentLogger()
    });
    const result = await runDossierShow({
      args: ['.'], options: { slug: 'feature-x', json: true }, logger: silentLogger()
    });
    assert.equal(result.ok, true);
    assert.ok(result.sections.includes('Code Map'));
    assert.equal(result.frontmatter.feature_slug, 'feature-x');
  });

  it('Edge: not_found when slug does not exist', async () => {
    const result = await runDossierShow({
      args: ['.'], options: { slug: 'never', json: true }, logger: silentLogger()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'not_found');
  });

  it('rejects missing slug', async () => {
    const result = await runDossierShow({
      args: ['.'], options: { json: true }, logger: silentLogger()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_slug');
  });
});
