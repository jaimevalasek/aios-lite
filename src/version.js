'use strict';

const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');

const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const DEFAULT_VERSION = '0.0.0';

let cachedVersion = null;

function parseVersionFromPackageJson(text) {
  try {
    const pkg = JSON.parse(String(text || '{}'));
    const version = String(pkg.version || '').trim();
    return version || DEFAULT_VERSION;
  } catch {
    return DEFAULT_VERSION;
  }
}

function getCliVersionSync() {
  if (cachedVersion) return cachedVersion;

  try {
    const text = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
    cachedVersion = parseVersionFromPackageJson(text);
    return cachedVersion;
  } catch {
    return DEFAULT_VERSION;
  }
}

async function getCliVersion() {
  if (cachedVersion) return cachedVersion;

  try {
    const text = await fsPromises.readFile(PACKAGE_JSON_PATH, 'utf8');
    cachedVersion = parseVersionFromPackageJson(text);
    return cachedVersion;
  } catch {
    return DEFAULT_VERSION;
  }
}

module.exports = {
  getCliVersion,
  getCliVersionSync,
  parseVersionFromPackageJson
};
