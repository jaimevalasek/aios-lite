'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { detectFramework, isMonorepoDetection } = require('../src/detector');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-detector-'));
}

test('detects Laravel by artisan file', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'artisan'), '', 'utf8');

  const out = await detectFramework(dir);
  assert.equal(out.framework, 'Laravel');
  assert.equal(out.installed, true);
});

test('detects Laravel by composer dependency', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'composer.json'), JSON.stringify({ dependencies: {}, require: { 'laravel/framework': '^11.0' } }), 'utf8');

  const out = await detectFramework(dir);
  assert.equal(out.framework, 'Laravel');
});

test('detects Next.js by package dependency', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0' } }), 'utf8');

  const out = await detectFramework(dir);
  assert.equal(out.framework, 'Next.js');
});

test('detects Hardhat by config file', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'dapp' }), 'utf8');
  await fs.writeFile(path.join(dir, 'hardhat.config.ts'), 'export default {};', 'utf8');

  const out = await detectFramework(dir);
  assert.equal(out.framework, 'Hardhat');
  assert.equal(out.evidence, 'hardhat.config.*');
});

test('detects Anchor by Anchor.toml', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'Anchor.toml'), '[provider]\ncluster="devnet"\n', 'utf8');

  const out = await detectFramework(dir);
  assert.equal(out.framework, 'Anchor');
});

test('detects Cardano by aiken.toml', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'aiken.toml'), 'name = "demo"\nversion = "0.1.0"\n', 'utf8');

  const out = await detectFramework(dir);
  assert.equal(out.framework, 'Cardano');
});

test('detects CodeIgniter 3 by legacy core file', async () => {
  const dir = await makeTempDir();
  await fs.mkdir(path.join(dir, 'system/core'), { recursive: true });
  await fs.writeFile(path.join(dir, 'system/core/CodeIgniter.php'), '<?php', 'utf8');

  const out = await detectFramework(dir);
  assert.equal(out.framework, 'CodeIgniter 3');
  assert.equal(out.evidence, 'system/core/CodeIgniter.php');
});

test('detects CodeIgniter 4 by spark file', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'spark'), '#!/usr/bin/env php', 'utf8');

  const out = await detectFramework(dir);
  assert.equal(out.framework, 'CodeIgniter 4');
  assert.equal(out.evidence, 'spark');
});

test('falls back to Node with generic package.json', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'x' }), 'utf8');

  const out = await detectFramework(dir);
  assert.equal(out.framework, 'Node');
  assert.equal(out.confidence, 'low');
});

test('returns not installed for empty directory', async () => {
  const dir = await makeTempDir();
  const out = await detectFramework(dir);
  assert.equal(out.installed, false);
  assert.equal(out.framework, null);
});

test('isMonorepoDetection returns false for single framework', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'artisan'), '', 'utf8');
  const out = await detectFramework(dir);
  assert.equal(isMonorepoDetection(out), false);
});

test('isMonorepoDetection returns true when Web3 and backend coexist', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'artisan'), '', 'utf8');
  await fs.writeFile(path.join(dir, 'hardhat.config.js'), 'module.exports = {};', 'utf8');
  const out = await detectFramework(dir);
  assert.equal(isMonorepoDetection(out), true);
});

test('isMonorepoDetection returns true when Web3 and frontend coexist', async () => {
  const dir = await makeTempDir();
  await fs.writeFile(path.join(dir, 'next.config.js'), 'module.exports = {};', 'utf8');
  await fs.writeFile(path.join(dir, 'hardhat.config.js'), 'module.exports = {};', 'utf8');
  const out = await detectFramework(dir);
  assert.equal(isMonorepoDetection(out), true);
});

test('isMonorepoDetection returns false for null or missing detection', () => {
  assert.equal(isMonorepoDetection(null), false);
  assert.equal(isMonorepoDetection({}), false);
  assert.equal(isMonorepoDetection({ matches: [] }), false);
});
