'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'learning';
}

function buildNodeContent(learning) {
  const id = slugify(`${learning.type}-${learning.title}`);
  const now = new Date().toISOString().slice(0, 10);
  return {
    id,
    content: `---
id: ${id}
type: ${learning.type}
title: ${learning.title}
frequency: ${learning.frequency || 1}
last_reinforced: ${learning.last_reinforced ? learning.last_reinforced.slice(0, 10) : now}
source_feature: ${learning.feature_slug || 'project'}
promoted_to: null
created_at: ${learning.created_at ? learning.created_at.slice(0, 10) : now}
---

# ${learning.title}

**Evidence:** ${learning.evidence || `Detected in ${learning.frequency || 1} session(s).`}

## Applications
- Review and apply this learning in future sessions of type: ${learning.type}

## Links
<!-- Add cross-references here -->
`
  };
}

async function runLearningExport({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const minFrequency = Number(options['min-frequency'] || options.minFrequency || 1);
  const brainsDir = path.join(targetDir, '.aioson', 'brains');

  const { db, dbPath } = await openRuntimeDb(targetDir, { mustExist: true });

  if (!db) {
    if (!options.json) logger.log('No runtime database found.');
    return { ok: false, reason: 'no_db' };
  }

  try {
    const learnings = db.prepare(`
      SELECT learning_id, feature_slug, type, title, frequency, last_reinforced,
             evidence, source_session, created_at
      FROM project_learnings
      WHERE status = 'active' AND frequency >= ?
      ORDER BY frequency DESC, updated_at DESC
    `).all(minFrequency);

    if (learnings.length === 0) {
      if (!options.json) logger.log(`No learnings with frequency >= ${minFrequency}.`);
      return { ok: true, exported: 0, dbPath };
    }

    await fs.mkdir(brainsDir, { recursive: true });

    const exported = [];
    for (const learning of learnings) {
      const { id, content } = buildNodeContent(learning);
      const filePath = path.join(brainsDir, `${id}.md`);
      await fs.writeFile(filePath, content, 'utf8');
      exported.push({ id, filePath, frequency: learning.frequency });
    }

    const promotable = learnings.filter((l) => l.frequency >= 5).length;

    if (options.json) {
      return { ok: true, exported: exported.length, nodes: exported, promotable, dbPath };
    }

    logger.log(`Learning Export — min-frequency: ${minFrequency}`);
    logger.log('─'.repeat(50));
    for (const { id, frequency } of exported) {
      logger.log(`  ${id}.md ✓ (frequency: ${frequency})`);
    }
    logger.log('─'.repeat(50));
    logger.log(`${exported.length} nodes written to .aioson/brains/`);
    if (promotable > 0) {
      logger.log(`${promotable} learning(s) with frequency ≥ 5 — run: aioson learning:evolve to promote to genome`);
    }

    return { ok: true, exported: exported.length, nodes: exported, promotable, dbPath };
  } finally {
    db.close();
  }
}

module.exports = { runLearningExport };
