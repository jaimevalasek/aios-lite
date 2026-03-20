'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  resolveRuntimePaths,
  openRuntimeDb,
  runtimeStoreExists
} = require('../runtime-store');
const { createProvider, contentHash } = require('../backup-provider');

function resolveTargetDir(args) {
  return path.resolve(process.cwd(), args[0] || '.');
}

async function readBackupConfig(targetDir) {
  try {
    const raw = await fs.readFile(path.join(targetDir, '.aioson/install.json'), 'utf8');
    const meta = JSON.parse(raw);
    return meta.backup || null;
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

// ── Backup manifest helpers ──

function getManifestEntry(db, recordKey) {
  return db.prepare('SELECT * FROM backup_manifest WHERE record_key = ?').get(recordKey);
}

function upsertManifest(db, recordKey, recordType, hash, remoteKey) {
  db.prepare(`
    INSERT INTO backup_manifest (record_key, record_type, content_hash, backed_up_at, remote_key)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(record_key) DO UPDATE SET
      content_hash = excluded.content_hash,
      backed_up_at = excluded.backed_up_at,
      remote_key = excluded.remote_key
  `).run(recordKey, recordType, hash, nowIso(), remoteKey);
}

function needsBackup(db, recordKey, currentHash) {
  const existing = getManifestEntry(db, recordKey);
  if (!existing) return true;
  return existing.content_hash !== currentHash;
}

// ── Table exporters ──

function exportTasks(db) {
  return db.prepare('SELECT * FROM tasks ORDER BY created_at').all();
}

function exportRuns(db) {
  return db.prepare('SELECT * FROM agent_runs ORDER BY started_at').all();
}

function exportAgentEvents(db) {
  return db.prepare('SELECT * FROM agent_events ORDER BY created_at').all();
}

function exportExecutionEvents(db, since) {
  if (since) {
    return db.prepare('SELECT * FROM execution_events WHERE created_at >= ? ORDER BY created_at').all(since);
  }
  return db.prepare('SELECT * FROM execution_events ORDER BY created_at').all();
}

function exportArtifacts(db) {
  return db.prepare('SELECT * FROM artifacts ORDER BY created_at').all();
}

function exportContentItems(db) {
  return db.prepare('SELECT * FROM content_items ORDER BY created_at').all();
}

function exportDeliveryLog(db) {
  return db.prepare('SELECT * FROM delivery_log ORDER BY created_at').all();
}

// ── Tables filter ──

const ALL_BACKUP_TABLES = ['tasks', 'runs', 'agent_events', 'execution_events', 'artifacts', 'content_items', 'delivery_log', 'devlogs'];

function parseTables(option) {
  if (!option) return ALL_BACKUP_TABLES;
  const requested = String(option).split(',').map(s => s.trim()).filter(Boolean);
  return requested.length > 0 ? requested : ALL_BACKUP_TABLES;
}

// ── Main backup command ──

async function runRuntimeBackup({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const dryRun = Boolean(options['dry-run'] || options.dryRun);
  const force = Boolean(options.force);
  const tables = parseTables(options.tables);

  // Read backup config
  const config = await readBackupConfig(targetDir);
  if (!config) {
    logger.error('No backup config found in .aioson/install.json. Add a "backup" section with provider settings.');
    return { ok: false, error: 'missing_backup_config' };
  }

  // Verify runtime store exists
  if (!(await runtimeStoreExists(targetDir))) {
    const { dbPath } = resolveRuntimePaths(targetDir);
    logger.error(`Runtime store not found at ${dbPath}. Run 'aioson runtime:init' first.`);
    return { ok: false, error: 'store_missing' };
  }

  const provider = createProvider(config);
  const { db, dbPath } = await openRuntimeDb(targetDir);

  let uploaded = 0;
  let skipped = 0;
  const errors = [];

  try {
    // ── Tasks ──
    if (tables.includes('tasks')) {
      const tasks = exportTasks(db);
      for (const task of tasks) {
        const key = `tasks/${task.task_key}`;
        const hash = contentHash(task);
        if (!force && !needsBackup(db, `task:${task.task_key}`, hash)) {
          skipped++;
          continue;
        }
        if (!dryRun) {
          try {
            const remoteKey = `${key}.json`;
            await provider.upload(remoteKey, Buffer.from(JSON.stringify(task, null, 2)), 'application/json');
            upsertManifest(db, `task:${task.task_key}`, 'task', hash, remoteKey);
            uploaded++;
          } catch (err) {
            errors.push(`task:${task.task_key}: ${err.message}`);
          }
        } else {
          uploaded++;
        }
      }
      logger.log(`  tasks: ${tasks.length} found`);
    }

    // ── Agent runs ──
    if (tables.includes('runs')) {
      const runs = exportRuns(db);
      for (const run of runs) {
        const key = `runs/${run.run_key}`;
        const hash = contentHash(run);
        if (!force && !needsBackup(db, `run:${run.run_key}`, hash)) {
          skipped++;
          continue;
        }
        if (!dryRun) {
          try {
            const remoteKey = `${key}.json`;
            await provider.upload(remoteKey, Buffer.from(JSON.stringify(run, null, 2)), 'application/json');
            upsertManifest(db, `run:${run.run_key}`, 'run', hash, remoteKey);
            uploaded++;
          } catch (err) {
            errors.push(`run:${run.run_key}: ${err.message}`);
          }
        } else {
          uploaded++;
        }
      }
      logger.log(`  runs: ${runs.length} found`);
    }

    // ── Events (batched) ──
    if (tables.includes('agent_events')) {
      const events = exportAgentEvents(db);
      if (events.length > 0) {
        const batchKey = `events/agent-events-${Date.now()}`;
        const hash = contentHash(events);
        if (force || needsBackup(db, 'agent_events:batch', hash)) {
          if (!dryRun) {
            try {
              const remoteKey = `${batchKey}.json`;
              await provider.upload(remoteKey, Buffer.from(JSON.stringify(events, null, 2)), 'application/json');
              upsertManifest(db, 'agent_events:batch', 'agent_events', hash, remoteKey);
              uploaded++;
            } catch (err) {
              errors.push(`agent_events: ${err.message}`);
            }
          } else {
            uploaded++;
          }
        } else {
          skipped++;
        }
        logger.log(`  agent_events: ${events.length} found`);
      }
    }

    if (tables.includes('execution_events')) {
      // Get last backup time for incremental
      const lastEntry = getManifestEntry(db, 'execution_events:batch');
      const since = (!force && lastEntry) ? lastEntry.backed_up_at : null;
      const events = exportExecutionEvents(db, since);
      if (events.length > 0) {
        const batchKey = `events/execution-events-${Date.now()}`;
        const hash = contentHash(events);
        if (force || needsBackup(db, 'execution_events:batch', hash)) {
          if (!dryRun) {
            try {
              const remoteKey = `${batchKey}.json`;
              await provider.upload(remoteKey, Buffer.from(JSON.stringify(events, null, 2)), 'application/json');
              upsertManifest(db, 'execution_events:batch', 'execution_events', hash, remoteKey);
              uploaded++;
            } catch (err) {
              errors.push(`execution_events: ${err.message}`);
            }
          } else {
            uploaded++;
          }
        } else {
          skipped++;
        }
        logger.log(`  execution_events: ${events.length} found${since ? ' (incremental)' : ''}`);
      }
    }

    // ── Artifacts ──
    if (tables.includes('artifacts')) {
      const artifacts = exportArtifacts(db);
      for (const art of artifacts) {
        const key = `artifacts/${art.id}`;
        const hash = contentHash(art);
        if (!force && !needsBackup(db, `artifact:${art.id}`, hash)) {
          skipped++;
          continue;
        }
        if (!dryRun) {
          try {
            // Upload metadata
            const metaKey = `${key}.json`;
            await provider.upload(metaKey, Buffer.from(JSON.stringify(art, null, 2)), 'application/json');

            // Upload file if it exists and is under 10MB
            if (art.file_path) {
              const absPath = path.isAbsolute(art.file_path)
                ? art.file_path
                : path.join(targetDir, art.file_path);
              try {
                const stat = await fs.stat(absPath);
                if (stat.isFile() && stat.size < 10 * 1024 * 1024) {
                  const fileBuffer = await fs.readFile(absPath);
                  const ext = path.extname(art.file_path) || '';
                  await provider.upload(`${key}/file${ext}`, fileBuffer);
                }
              } catch {
                // File may not exist locally — skip
              }
            }

            upsertManifest(db, `artifact:${art.id}`, 'artifact', hash, metaKey);
            uploaded++;
          } catch (err) {
            errors.push(`artifact:${art.id}: ${err.message}`);
          }
        } else {
          uploaded++;
        }
      }
      logger.log(`  artifacts: ${artifacts.length} found`);
    }

    // ── Content items ──
    if (tables.includes('content_items')) {
      const items = exportContentItems(db);
      for (const item of items) {
        const key = `content/${item.content_key}`;
        const hash = contentHash(item);
        if (!force && !needsBackup(db, `content:${item.content_key}`, hash)) {
          skipped++;
          continue;
        }
        if (!dryRun) {
          try {
            const remoteKey = `${key}.json`;
            await provider.upload(remoteKey, Buffer.from(JSON.stringify(item, null, 2)), 'application/json');
            upsertManifest(db, `content:${item.content_key}`, 'content', hash, remoteKey);
            uploaded++;
          } catch (err) {
            errors.push(`content:${item.content_key}: ${err.message}`);
          }
        } else {
          uploaded++;
        }
      }
      logger.log(`  content_items: ${items.length} found`);
    }

    // ── Delivery log ──
    if (tables.includes('delivery_log')) {
      const logs = exportDeliveryLog(db);
      if (logs.length > 0) {
        const hash = contentHash(logs);
        if (force || needsBackup(db, 'delivery_log:batch', hash)) {
          if (!dryRun) {
            try {
              const remoteKey = `delivery/delivery-log-${Date.now()}.json`;
              await provider.upload(remoteKey, Buffer.from(JSON.stringify(logs, null, 2)), 'application/json');
              upsertManifest(db, 'delivery_log:batch', 'delivery_log', hash, remoteKey);
              uploaded++;
            } catch (err) {
              errors.push(`delivery_log: ${err.message}`);
            }
          } else {
            uploaded++;
          }
        } else {
          skipped++;
        }
        logger.log(`  delivery_log: ${logs.length} found`);
      }
    }

    // ── Devlogs (files from aioson-logs/) ──
    if (tables.includes('devlogs')) {
      const logsDir = path.join(targetDir, 'aioson-logs');
      try {
        const entries = await fs.readdir(logsDir);
        const devlogFiles = entries.filter(f => f.startsWith('devlog-') && f.endsWith('.md'));
        for (const file of devlogFiles) {
          const filePath = path.join(logsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const hash = contentHash(content);
          if (!force && !needsBackup(db, `devlog:${file}`, hash)) {
            skipped++;
            continue;
          }
          if (!dryRun) {
            try {
              const remoteKey = `devlogs/${file}`;
              await provider.upload(remoteKey, Buffer.from(content, 'utf8'), 'text/markdown');
              upsertManifest(db, `devlog:${file}`, 'devlog', hash, remoteKey);
              uploaded++;
            } catch (err) {
              errors.push(`devlog:${file}: ${err.message}`);
            }
          } else {
            uploaded++;
          }
        }
        logger.log(`  devlogs: ${devlogFiles.length} files found`);
      } catch {
        // No aioson-logs/ — skip
      }
    }

    // ── Upload backup index ──
    if (!dryRun && uploaded > 0) {
      const index = {
        schemaVersion: 1,
        provider: config.provider,
        lastBackupAt: nowIso(),
        uploaded,
        skipped,
        errors: errors.length,
        tables
      };
      try {
        await provider.upload('backup-index.json', Buffer.from(JSON.stringify(index, null, 2)), 'application/json');
      } catch {
        // Non-fatal
      }
    }

    const prefix = dryRun ? '[DRY RUN] ' : '';
    logger.log(`\n${prefix}Backup ${errors.length === 0 ? 'complete' : 'completed with errors'}:`);
    logger.log(`  Uploaded: ${uploaded}, Skipped (unchanged): ${skipped}`);
    if (errors.length > 0) {
      logger.log(`  Errors: ${errors.length}`);
      for (const e of errors.slice(0, 5)) {
        logger.log(`    - ${e}`);
      }
    }

    return {
      ok: errors.length === 0,
      dbPath,
      uploaded,
      skipped,
      errors,
      dryRun,
      timestamp: nowIso()
    };
  } finally {
    db.close();
  }
}

// ── Restore command ──

async function runRuntimeRestore({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const dryRun = Boolean(options['dry-run'] || options.dryRun);
  const tables = parseTables(options.tables);

  const config = await readBackupConfig(targetDir);
  if (!config) {
    logger.error('No backup config found in .aioson/install.json.');
    return { ok: false, error: 'missing_backup_config' };
  }

  const provider = createProvider(config);

  // Check backup index exists
  const indexBuffer = await provider.download('backup-index.json');
  if (!indexBuffer) {
    logger.error('No backup-index.json found at the remote. Has a backup been created?');
    return { ok: false, error: 'no_backup_index' };
  }

  const backupIndex = JSON.parse(indexBuffer.toString());
  logger.log(`Found backup from ${backupIndex.lastBackupAt} (schema v${backupIndex.schemaVersion})`);

  const { db, dbPath } = await openRuntimeDb(targetDir);
  let restored = 0;
  const errors = [];

  try {
    const restoreTable = async (prefix, tableName, insertFn) => {
      if (!tables.includes(tableName)) return;
      const items = await provider.list(`${prefix}/`);
      for (const item of items) {
        if (!item.key.endsWith('.json')) continue;
        try {
          const buffer = await provider.download(item.key);
          if (!buffer) continue;
          const data = JSON.parse(buffer.toString());
          if (!dryRun) {
            insertFn(data);
          }
          restored++;
        } catch (err) {
          errors.push(`${item.key}: ${err.message}`);
        }
      }
      logger.log(`  ${tableName}: ${items.length} items`);
    };

    // Restore tasks
    await restoreTable('tasks', 'tasks', (task) => {
      db.prepare(`
        INSERT OR REPLACE INTO tasks (task_key, squad_slug, session_key, title, goal, status, created_by, created_at, updated_at, finished_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(task.task_key, task.squad_slug, task.session_key, task.title, task.goal, task.status, task.created_by, task.created_at, task.updated_at, task.finished_at);
    });

    // Restore runs
    await restoreTable('runs', 'runs', (run) => {
      db.prepare(`
        INSERT OR REPLACE INTO agent_runs (run_key, task_key, agent_name, agent_kind, squad_slug, session_key, source, workflow_id, workflow_stage, parent_run_key, title, status, summary, used_skills_json, output_path, started_at, updated_at, finished_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(run.run_key, run.task_key, run.agent_name, run.agent_kind, run.squad_slug, run.session_key, run.source, run.workflow_id, run.workflow_stage, run.parent_run_key, run.title, run.status, run.summary, run.used_skills_json, run.output_path, run.started_at, run.updated_at, run.finished_at);
    });

    // Restore artifacts
    await restoreTable('artifacts', 'artifacts', (art) => {
      db.prepare(`
        INSERT OR REPLACE INTO artifacts (id, task_key, run_key, squad_slug, agent_name, kind, title, file_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(art.id, art.task_key, art.run_key, art.squad_slug, art.agent_name, art.kind, art.title, art.file_path, art.created_at);
    });

    // Restore content items
    await restoreTable('content', 'content_items', (item) => {
      db.prepare(`
        INSERT OR REPLACE INTO content_items (content_key, task_key, run_key, squad_slug, session_key, title, content_type, layout_type, status, summary, blueprint_slug, used_skills_json, payload_json, json_path, html_path, created_by_agent, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(item.content_key, item.task_key, item.run_key, item.squad_slug, item.session_key, item.title, item.content_type, item.layout_type, item.status, item.summary, item.blueprint_slug, item.used_skills_json, item.payload_json, item.json_path, item.html_path, item.created_by_agent, item.created_at, item.updated_at);
    });

    // Restore devlog files
    if (tables.includes('devlogs')) {
      const devlogItems = await provider.list('devlogs/');
      const logsDir = path.join(targetDir, 'aioson-logs');
      await fs.mkdir(logsDir, { recursive: true });
      for (const item of devlogItems) {
        if (!item.key.endsWith('.md')) continue;
        try {
          const buffer = await provider.download(item.key);
          if (!buffer) continue;
          const filename = path.basename(item.key);
          if (!dryRun) {
            await fs.writeFile(path.join(logsDir, filename), buffer);
          }
          restored++;
        } catch (err) {
          errors.push(`devlog:${item.key}: ${err.message}`);
        }
      }
      logger.log(`  devlogs: ${devlogItems.length} files`);
    }

    const prefix = dryRun ? '[DRY RUN] ' : '';
    logger.log(`\n${prefix}Restore ${errors.length === 0 ? 'complete' : 'completed with errors'}:`);
    logger.log(`  Restored: ${restored}`);
    if (errors.length > 0) {
      logger.log(`  Errors: ${errors.length}`);
      for (const e of errors.slice(0, 5)) {
        logger.log(`    - ${e}`);
      }
    }

    return {
      ok: errors.length === 0,
      dbPath,
      restored,
      errors,
      dryRun,
      backupIndex
    };
  } finally {
    db.close();
  }
}

module.exports = {
  runRuntimeBackup,
  runRuntimeRestore
};
