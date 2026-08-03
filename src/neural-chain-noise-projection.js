'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  NOISE_DIR_REL,
  parseFrontmatter,
  readNoiseFileAndRecompute
} = require('./neural-chain-noise-file');
const {
  ACTIONABLE_STATUSES,
  listActionableFeatureSlugs,
  listWorkItems,
  normalizeFeatureSlug,
  releaseExpiredClaims,
  resolveWorkItem,
  upsertLegacyWorkItem
} = require('./neural-chain-work-items');

const PROJECTION_SCHEMA = 'neural-chain-impact-queue/v2';

function projectionPath(targetDir, featureSlug) {
  return path.join(targetDir, NOISE_DIR_REL, `${normalizeFeatureSlug(featureSlug)}.md`);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function readProjectionMetadata(text) {
  const parsed = parseFrontmatter(String(text || ''));
  if (!parsed.ok || !parsed.data || parsed.data.schema !== PROJECTION_SCHEMA) return null;
  return parsed.data;
}

function cleanInline(value) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildProjectionContent(featureSlug, items, now = new Date(), autonomyMode = null) {
  const slug = normalizeFeatureSlug(featureSlug);
  const sourceFiles = Array.from(new Set(items.map((item) => item.source_path))).sort();
  const claimed = items.filter((item) => ['claimed', 'in_progress'].includes(item.status)).length;
  const blocked = items.filter((item) => item.status === 'blocked').length;
  const inferredMode = autonomyMode
    || (items.find((item) => item.evidence && item.evidence.autonomy_mode) || {}).evidence?.autonomy_mode
    || 'guarded';
  const frontmatter = [
    '---',
    `schema: ${PROJECTION_SCHEMA}`,
    `slug: ${slug}`,
    `generated_at: ${(now instanceof Date ? now : new Date(now)).toISOString()}`,
    `autonomy_mode: ${inferredMode}`,
    `source_files: ${JSON.stringify(sourceFiles)}`,
    `total_items: ${items.length}`,
    'resolved_items: 0',
    `claimed_items: ${claimed}`,
    `blocked_items: ${blocked}`,
    '---'
  ].join('\n');
  const lines = items.map((item) => {
    const marker = item.marker ? ` [${item.marker}]` : '';
    const reason = cleanInline(item.reason);
    const source = cleanInline(item.source_path);
    const claim = item.claimed_by ? `; claimed_by: ${cleanInline(item.claimed_by)}` : '';
    return `- [ ]${marker} ${item.target_path} — ${item.edge_type} ${Number(item.confidence).toFixed(2)} (source: ${source}); id: ${item.work_item_id}; kind: ${item.kind}; owner: ${item.owner_agent}; status: ${item.status}${claim}; reason: ${reason}`;
  });

  return [
    frontmatter,
    '',
    '# Neural Chain — Impact Queue',
    '',
    'This file is a human-readable projection of the SQLite work queue. Claim an item before editing, then resolve it with evidence. Manually checking an item remains supported and records `verified_no_change` on the next reconciliation.',
    '',
    ...lines,
    ''
  ].join('\n');
}

function writeProjection(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, content, 'utf8');
    fs.renameSync(temporary, filePath);
  } finally {
    try {
      fs.unlinkSync(temporary);
    } catch (error) {
      if (!error || error.code !== 'ENOENT') throw error;
    }
  }
}

function syncNoiseProjection({ db, targetDir, featureSlug, autonomyMode = null, now = new Date() }) {
  const slug = normalizeFeatureSlug(featureSlug);
  const filePath = projectionPath(targetDir, slug);
  const items = listWorkItems(db, {
    featureSlug: slug,
    statuses: ACTIONABLE_STATUSES,
    limit: 200
  });

  if (items.length === 0) {
    try {
      fs.unlinkSync(filePath);
      return { feature_slug: slug, path: filePath, deleted: true, item_count: 0 };
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return { feature_slug: slug, path: filePath, deleted: false, item_count: 0 };
      }
      throw error;
    }
  }

  writeProjection(filePath, buildProjectionContent(slug, items, now, autonomyMode));
  return { feature_slug: slug, path: filePath, deleted: false, item_count: items.length };
}

function parseLegacySource(item, frontmatter) {
  const reason = String(item && item.motivo || '');
  const sourceMatch = reason.match(/\(source:\s*([^\)]+)\)/i)
    || reason.match(/(?:^|;)\s*source:\s*([^;]+)/i);
  if (sourceMatch) return cleanInline(sourceMatch[1]);
  const sources = frontmatter && Array.isArray(frontmatter.source_files)
    ? frontmatter.source_files
    : [];
  return cleanInline(sources[0] || 'legacy-noise');
}

function parseLegacyConfidence(reason) {
  const match = String(reason || '').match(/(?:^|\s)(0(?:\.\d+)?|1(?:\.0+)?)(?:\s|$|\))/);
  return match ? Number(match[1]) : 0;
}

function parseLegacyEdgeType(reason) {
  const match = String(reason || '').match(/\b(agent_event|git_co_edit)\b/);
  return match ? match[1] : 'legacy_noise';
}

function applyCheckedProjectionItems({ db, filePath, now = new Date() }) {
  const parsed = readNoiseFileAndRecompute({ path: filePath });
  let resolved = 0;
  for (const item of parsed.items.filter((entry) => entry.checked)) {
    const match = String(item.motivo || '').match(/\bid:\s*(NC-\d+)/i);
    if (!match) continue;
    const result = resolveWorkItem(db, {
      itemId: match[1],
      outcome: 'verified_no_change',
      evidence: `Manually checked in ${path.basename(filePath)}`,
      force: true,
      now
    });
    if (result.ok) resolved += 1;
  }
  return resolved;
}

function importLegacyNoiseFile({ db, filePath, now = new Date() }) {
  const parsed = readNoiseFileAndRecompute({ path: filePath });
  if (!parsed.exists) return { imported: 0, deleted: false, feature_slug: null };
  const frontmatter = parsed.frontmatter || {};
  const filename = path.basename(filePath, '.md');
  const inferred = filename.replace(/-\d{8}-\d{4}$/i, '');
  const slug = normalizeFeatureSlug(frontmatter.slug || inferred);

  let imported = 0;
  for (const item of parsed.items.filter((entry) => !entry.checked)) {
    const sourcePath = parseLegacySource(item, frontmatter);
    const workItem = upsertLegacyWorkItem({
      db,
      featureSlug: slug,
      sourcePath,
      targetPath: item.target_path,
      impact: {
        marker: item.marker,
        confidence: parseLegacyConfidence(item.motivo),
        edge_type: parseLegacyEdgeType(item.motivo),
        reason: `Imported legacy impact: ${cleanInline(item.motivo)}`
      },
      origin: `${filename}:${frontmatter.edit_at || 'unknown'}`,
      now
    });
    if (workItem) imported += 1;
  }

  fs.unlinkSync(filePath);
  return { imported, deleted: true, feature_slug: slug };
}

function reconcileNoiseState({ db, targetDir, now = new Date() }) {
  const noisesDir = path.join(targetDir, NOISE_DIR_REL);
  const entries = fs.existsSync(noisesDir)
    ? fs.readdirSync(noisesDir, { withFileTypes: true })
    : [];
  const projectionSlugs = new Set();
  let imported = 0;
  let manuallyResolved = 0;
  let legacyDeleted = 0;

  const expiredClaims = releaseExpiredClaims(db, now);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const filePath = path.join(noisesDir, entry.name);
    const text = readText(filePath);
    const metadata = readProjectionMetadata(text);
    if (metadata) {
      const slug = normalizeFeatureSlug(metadata.slug || path.basename(entry.name, '.md'));
      projectionSlugs.add(slug);
      manuallyResolved += applyCheckedProjectionItems({ db, filePath, now });
      continue;
    }

    const legacy = importLegacyNoiseFile({ db, filePath, now });
    imported += legacy.imported;
    if (legacy.deleted) legacyDeleted += 1;
    if (legacy.feature_slug) projectionSlugs.add(legacy.feature_slug);
  }

  for (const slug of listActionableFeatureSlugs(db)) projectionSlugs.add(slug);
  const projections = Array.from(projectionSlugs)
    .sort()
    .map((slug) => syncNoiseProjection({ db, targetDir, featureSlug: slug, now }));

  return {
    ok: true,
    imported,
    manually_resolved: manuallyResolved,
    legacy_deleted: legacyDeleted,
    expired_claims: expiredClaims,
    projections
  };
}

module.exports = {
  PROJECTION_SCHEMA,
  applyCheckedProjectionItems,
  buildProjectionContent,
  importLegacyNoiseFile,
  projectionPath,
  readProjectionMetadata,
  reconcileNoiseState,
  syncNoiseProjection
};
