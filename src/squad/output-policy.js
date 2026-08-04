'use strict';

const LEGACY_OUTPUT_MODES = new Set(['sqlite', 'hybrid']);
const LEGACY_STORAGE_PRIMARIES = new Set(['sqlite', 'files']);

function normalizeOutputDir(value, fallback = 'output/') {
  const raw = String(value || fallback).trim().replace(/\\/g, '/');
  return raw.endsWith('/') ? raw : `${raw}/`;
}

function normalizeStoragePolicy(policy, options = {}) {
  const source = policy && typeof policy === 'object' ? policy : {};
  const legacyArtifactModes = new Set(['sqlite-json', 'files+sqlite']);
  const sourceArtifacts = String(source.artifacts || '').trim().toLowerCase();
  const outputDir = normalizeOutputDir(
    options.outputDir || (!legacyArtifactModes.has(sourceArtifacts) ? source.artifacts : null) || 'output/'
  );

  return {
    ...source,
    primary: 'file',
    artifacts: outputDir,
    exports: {
      html: true,
      markdown: true,
      json: true,
      ...(source.exports && typeof source.exports === 'object' ? source.exports : {})
    }
  };
}

function normalizeOutputStrategy(strategy, options = {}) {
  const source = strategy && typeof strategy === 'object' ? strategy : {};
  const { dataOutput: _legacyDataOutput, ...rest } = source;
  const fileOutput = source.fileOutput && typeof source.fileOutput === 'object'
    ? source.fileOutput
    : {};
  const outputDir = normalizeOutputDir(options.outputDir || fileOutput.dir || 'output/');

  return {
    ...rest,
    mode: 'files',
    fileOutput: {
      ...fileOutput,
      enabled: true,
      dir: outputDir,
      formats: Array.isArray(fileOutput.formats) && fileOutput.formats.length > 0
        ? fileOutput.formats
        : ['html', 'md', 'json']
    }
  };
}

function inspectOutputPolicy(manifest = {}) {
  const warnings = [];
  const storagePrimary = String(manifest.storagePolicy?.primary || '').trim().toLowerCase();
  const strategy = manifest.outputStrategy && typeof manifest.outputStrategy === 'object'
    ? manifest.outputStrategy
    : null;
  const outputMode = String(strategy?.mode || '').trim().toLowerCase();

  if (LEGACY_STORAGE_PRIMARIES.has(storagePrimary)) {
    warnings.push(
      `storagePolicy.primary "${storagePrimary}" is legacy; use "file" because SQLite is a local, rebuildable runtime index.`
    );
  }
  if (LEGACY_OUTPUT_MODES.has(outputMode)) {
    warnings.push(
      `outputStrategy.mode "${outputMode}" is legacy; outputs must be written to files and SQLite is local-only metadata.`
    );
  }
  if (strategy?.fileOutput?.enabled === false) {
    warnings.push('outputStrategy.fileOutput.enabled=false is legacy; every squad output needs a canonical file.');
  }
  if (strategy && Object.prototype.hasOwnProperty.call(strategy, 'dataOutput')) {
    warnings.push('outputStrategy.dataOutput is deprecated; runtime indexing is local framework behavior, not an output destination.');
  }

  return {
    canonicalStorage: 'file',
    canonicalOutputMode: 'files',
    legacy: warnings.length > 0,
    warnings
  };
}

module.exports = {
  LEGACY_OUTPUT_MODES,
  LEGACY_STORAGE_PRIMARIES,
  normalizeOutputDir,
  normalizeStoragePolicy,
  normalizeOutputStrategy,
  inspectOutputPolicy
};
