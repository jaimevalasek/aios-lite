'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  resolveRuntimePaths,
  openRuntimeDb,
  runtimeStoreExists,
  startTask,
  updateTask,
  startRun,
  updateRun,
  attachArtifact,
  upsertContentItem,
  getStatusSnapshot,
  logAgentEvent
} = require('../runtime-store');

const ALLOWED_LAYOUTS = new Set(['document', 'tabs', 'accordion', 'stack', 'mixed']);
const DEFAULT_TEXT_FIELDS = ['content', 'text', 'body', 'lyrics', 'markdown'];

function resolveTargetDir(args) {
  return path.resolve(process.cwd(), args[0] || '.');
}

function requireOption(options, key, t) {
  const value = options[key];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(t('runtime.option_required', { option: `--${key}` }));
  }
  return String(value).trim();
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function maybeResolveContentPaths(targetDir, outputPath) {
  if (!outputPath) return null;

  const relative = String(outputPath).replace(/\\/g, '/').trim();
  if (!/\/index\.html?$/i.test(relative)) return null;

  const absoluteHtmlPath = path.isAbsolute(relative) ? relative : path.join(targetDir, relative);
  const absoluteJsonPath = path.join(path.dirname(absoluteHtmlPath), 'content.json');

  return {
    relativeHtmlPath: path.isAbsolute(relative) ? path.relative(targetDir, absoluteHtmlPath).replace(/\\/g, '/') : relative,
    relativeJsonPath: path.relative(targetDir, absoluteJsonPath).replace(/\\/g, '/'),
    absoluteJsonPath
  };
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStringArray(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return Array.from(
    new Set(
      values
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    )
  );
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    return normalizeStringArray(JSON.parse(value));
  } catch {
    return [];
  }
}

function titleize(value) {
  return String(value || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function makeContentKey(value) {
  return String(value || 'content')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `content-${Date.now()}`;
}

function truncateText(value, max = 12000) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}\n\n[...]`;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstNonEmptyText(record, keys) {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return '';
}

function normalizeSimpleContentBlocks(content) {
  const text = firstNonEmptyText(content, DEFAULT_TEXT_FIELDS);
  if (text) {
    return [
      {
        type: 'rich-text',
        content: truncateText(text)
      }
    ];
  }

  const html = asString(content.html);
  if (html) {
    const preview = stripHtml(html);
    return [
      {
        type: 'callout',
        title: 'Conteudo HTML indexado automaticamente',
        content:
          'Este item foi convertido para o indice de conteudos a partir de um arquivo HTML gerado pelo squad.'
      },
      {
        type: 'rich-text',
        content: truncateText(preview || 'Nao foi possivel extrair preview textual do HTML.')
      }
    ];
  }

  return [];
}

function isValidBlock(value) {
  const block = asObject(value);
  if (!block) return false;

  const type = asString(block.type);
  if (!type) return false;

  if (type === 'tabs') {
    const items = asArray(block.items);
    return items.every((item) => {
      const tab = asObject(item);
      if (!tab || !asString(tab.label)) return false;
      return asArray(tab.blocks).every(isValidBlock);
    });
  }

  if (type === 'accordion') {
    const items = asArray(block.items);
    return items.every((item) => {
      const entry = asObject(item);
      if (!entry || !asString(entry.title)) return false;
      const content = asString(entry.content);
      const nestedBlocks = asArray(entry.blocks);
      if (!content && nestedBlocks.length === 0) return false;
      return nestedBlocks.every(isValidBlock);
    });
  }

  if (type === 'section') {
    return asArray(block.blocks).every(isValidBlock);
  }

  return true;
}

function validateContentPayload(payload) {
  const content = asObject(payload);
  if (!content) {
    return { ok: false, reason: 'content.json must be an object' };
  }

  const contentKey = asString(content.contentKey || content.content_key);
  if (!contentKey) {
    return { ok: false, reason: 'content.json is missing contentKey' };
  }

  const title = asString(content.title);
  if (!title) {
    return { ok: false, reason: 'content.json is missing title' };
  }

  const contentType = asString(content.contentType || content.content_type);
  if (!contentType) {
    return { ok: false, reason: 'content.json is missing contentType' };
  }

  const layoutType = asString(content.layoutType || content.layout_type || 'document');
  if (!ALLOWED_LAYOUTS.has(layoutType)) {
    return { ok: false, reason: `content.json has unsupported layoutType: ${layoutType}` };
  }

  const blocks = asArray(content.blocks);
  const normalizedBlocks = blocks.length > 0 ? blocks : normalizeSimpleContentBlocks(content);

  if (normalizedBlocks.length === 0) {
    return { ok: false, reason: 'content.json must include blocks or a simple text field' };
  }

  if (!normalizedBlocks.every(isValidBlock)) {
    return { ok: false, reason: 'content.json contains invalid blocks' };
  }

  return {
    ok: true,
    normalized: {
      ...content,
      contentKey,
      title,
      contentType,
      layoutType,
      blocks: normalizedBlocks,
      blueprint: asString(content.blueprint || content.blueprintSlug || content.blueprint_slug),
      usedSkills: normalizeStringArray(
        content.usedSkills ||
          content.used_skills ||
          content.meta?.usedSkills ||
          content.meta?.used_skills ||
          []
      )
    }
  };
}

async function listFilesRecursive(rootDir) {
  const result = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.shift();
    const entries = await fs.readdir(currentDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }
      if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }

  return result;
}

function inferSquadSlugFromOutputPath(targetDir, absolutePath) {
  const outputRoot = path.join(targetDir, 'output');
  const relativePath = path.relative(outputRoot, absolutePath).replace(/\\/g, '/');
  const [slug] = relativePath.split('/');
  return slug || '';
}

function relativeContentKeyFromOutput(targetDir, absolutePath, squadSlug) {
  const squadRoot = path.join(targetDir, 'output', squadSlug);
  const relativeToSquad = path.relative(squadRoot, absolutePath).replace(/\\/g, '/');
  return makeContentKey(relativeToSquad.replace(/\.[^.]+$/, ''));
}

function synthesizeContentPayload({ targetDir, absolutePath, squadSlug, rawContent }) {
  const ext = path.extname(absolutePath).toLowerCase();
  const relativePath = path.relative(targetDir, absolutePath).replace(/\\/g, '/');
  const title = titleize(path.basename(absolutePath));
  const contentKey = relativeContentKeyFromOutput(targetDir, absolutePath, squadSlug);

  if (ext === '.md') {
    return {
      contentKey,
      title,
      contentType: 'text-content',
      layoutType: 'document',
      summary: `Conteudo indexado automaticamente de ${relativePath}.`,
      blocks: [
        {
          type: 'rich-text',
          content: truncateText(rawContent)
        }
      ],
      meta: {
        autoIndexed: true,
        sourceFormat: 'markdown',
        sourcePath: relativePath
      }
    };
  }

  if (ext === '.html' || ext === '.htm') {
    const preview = stripHtml(rawContent);
    return {
      contentKey,
      title,
      contentType: 'html-content',
      layoutType: 'document',
      summary: `Conteudo HTML indexado automaticamente de ${relativePath}.`,
      blocks: [
        {
          type: 'callout',
          title: 'Preview indexado automaticamente',
          content: 'O arquivo HTML original continua no output do squad. Este viewer mostra uma versao textual para indexacao e sync.'
        },
        {
          type: 'rich-text',
          content: truncateText(preview || 'Nao foi possivel gerar preview textual deste HTML.')
        }
      ],
      meta: {
        autoIndexed: true,
        sourceFormat: 'html',
        sourcePath: relativePath
      }
    };
  }

  return null;
}

async function resolveIngestCandidates(targetDir, options = {}) {
  const outputRoot = path.join(targetDir, 'output');
  const scopedRoot = options.squad ? path.join(outputRoot, String(options.squad).trim()) : outputRoot;
  const rootExists = await fs.stat(scopedRoot).then((stat) => stat.isDirectory()).catch(() => false);

  if (!rootExists) {
    return [];
  }

  const allFiles = await listFilesRecursive(scopedRoot);
  const contentJsonDirs = new Set(
    allFiles
      .filter((filePath) => path.basename(filePath).toLowerCase() === 'content.json')
      .map((filePath) => path.dirname(filePath))
  );

  return allFiles.filter((filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath).toLowerCase();

    if (base === 'content.json') return true;
    if (ext !== '.md' && ext !== '.html' && ext !== '.htm') return false;
    if (contentJsonDirs.has(path.dirname(filePath))) return false;

    return true;
  });
}

async function ingestContentCandidate(db, targetDir, absolutePath, options = {}) {
  const baseName = path.basename(absolutePath).toLowerCase();
  const relativePath = path.relative(targetDir, absolutePath).replace(/\\/g, '/');
  const squadSlug = options.squad ? String(options.squad).trim() : inferSquadSlugFromOutputPath(targetDir, absolutePath);

  if (!squadSlug) {
    return { indexed: false, reason: 'missing_squad' };
  }

  if (baseName === 'content.json') {
    const payload = await readJsonIfExists(absolutePath);
    const validation = validateContentPayload(payload);
    if (!validation.ok) {
      return { indexed: false, reason: validation.reason };
    }

    const content = validation.normalized;
    const siblingIndex = path.join(path.dirname(absolutePath), 'index.html');
    const siblingHtmlExists = await fs.stat(siblingIndex).then((stat) => stat.isFile()).catch(() => false);

    upsertContentItem(db, {
      contentKey: content.contentKey,
      taskKey: options.task || content.taskKey || content.task_key || null,
      runKey: options.run || content.runKey || content.run_key || null,
      squadSlug,
      sessionKey: options.session || content.sessionKey || content.session_key || null,
      title: content.title,
      contentType: content.contentType,
      layoutType: content.layoutType,
      status: content.status || 'completed',
      summary: content.summary || `Conteudo indexado automaticamente de ${relativePath}.`,
      blueprintSlug: content.blueprint || null,
      usedSkills: normalizeStringArray(options.usedSkills || content.usedSkills),
      payload: content,
      jsonPath: relativePath,
      htmlPath: siblingHtmlExists
        ? path.relative(targetDir, siblingIndex).replace(/\\/g, '/')
        : null,
      createdByAgent: options.agent || content.createdByAgent || content.created_by_agent || null
    });

    return { indexed: true, kind: 'content-json', contentKey: content.contentKey };
  }

  const rawContent = await fs.readFile(absolutePath, 'utf8').catch(() => '');
  if (!rawContent.trim()) {
    return { indexed: false, reason: 'empty_file' };
  }

  const payload = synthesizeContentPayload({
    targetDir,
    absolutePath,
    squadSlug,
    rawContent
  });

  if (!payload) {
    return { indexed: false, reason: 'unsupported_file' };
  }

  upsertContentItem(db, {
    contentKey: payload.contentKey,
    taskKey: options.task || null,
    runKey: options.run || null,
    squadSlug,
    sessionKey: options.session || null,
    title: payload.title,
    contentType: payload.contentType,
    layoutType: payload.layoutType,
    status: 'completed',
    summary: payload.summary,
    blueprintSlug: payload.blueprint || null,
    usedSkills: normalizeStringArray(options.usedSkills),
    payload,
    jsonPath: null,
    htmlPath: path.extname(absolutePath).toLowerCase().startsWith('.ht')
      ? relativePath
      : null,
    createdByAgent: options.agent || null
  });

  return { indexed: true, kind: path.extname(absolutePath).toLowerCase(), contentKey: payload.contentKey };
}

async function withRuntimeDb(targetDir, t) {
  const handle = await openRuntimeDb(targetDir, { mustExist: true });
  if (!handle) {
    throw new Error(t('runtime.store_missing', { path: resolveRuntimePaths(targetDir).dbPath }));
  }
  return handle;
}

async function runRuntimeInit({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { db, dbPath, runtimeDir } = await openRuntimeDb(targetDir);
  db.close();

  if (!options.json) {
    logger.log(t('runtime.init_ok', { path: dbPath }));
  }

  return { ok: true, targetDir, runtimeDir, dbPath };
}

async function runRuntimeIngest({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { db, dbPath } = await withRuntimeDb(targetDir, t);
  const ingestOptions = {
    ...options,
    usedSkills: normalizeStringArray(options['used-skills'] || options.usedSkills)
  };

  try {
    const candidates = await resolveIngestCandidates(targetDir, ingestOptions);
    let indexed = 0;
    let skipped = 0;
    const reasons = [];

    for (const candidate of candidates) {
      const result = await ingestContentCandidate(db, targetDir, candidate, ingestOptions);
      if (result.indexed) {
        indexed += 1;
        continue;
      }
      skipped += 1;
      if (result.reason) {
        reasons.push(`${path.relative(targetDir, candidate).replace(/\\/g, '/')}: ${result.reason}`);
      }
    }

    if (!options.json) {
      logger.log(
        t('runtime.ingest_ok', {
          indexed,
          skipped,
          path: dbPath
        })
      );
      if (reasons.length > 0) {
        for (const reason of reasons.slice(0, 10)) {
          logger.log(`- ${reason}`);
        }
      }
    }

    return {
      ok: true,
      targetDir,
      dbPath,
      indexed,
      skipped,
      reasons
    };
  } finally {
    db.close();
  }
}

async function runRuntimeTaskStart({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { db, dbPath } = await withRuntimeDb(targetDir, t);

  try {
    const taskKey = startTask(db, {
      taskKey: options.task,
      squadSlug: options.squad,
      sessionKey: options.session,
      title: requireOption(options, 'title', t),
      goal: options.goal,
      createdBy: options.by
    });

    if (!options.json) {
      logger.log(t('runtime.task_start_ok', { task: taskKey, path: dbPath }));
    }

    return {
      ok: true,
      targetDir,
      dbPath,
      taskKey,
      status: 'running'
    };
  } finally {
    db.close();
  }
}

async function runRuntimeStart({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { db, dbPath } = await withRuntimeDb(targetDir, t);

  try {
    const runKey = startRun(db, {
      runKey: options.run,
      taskKey: options.task,
      agentName: requireOption(options, 'agent', t),
      agentKind: options.kind,
      squadSlug: options.squad,
      sessionKey: options.session,
      title: options.title,
      message: options.message,
      summary: options.summary,
      usedSkills: normalizeStringArray(options['used-skills'] || options.usedSkills),
      outputPath: options.output
    });

    const snapshot = getStatusSnapshot(db);
    if (!options.json) {
      logger.log(t('runtime.start_ok', { run: runKey, path: dbPath }));
    }

    return {
      ok: true,
      targetDir,
      dbPath,
      runKey,
      status: 'running',
      activeCount: snapshot.activeRuns.length
    };
  } finally {
    db.close();
  }
}

async function runRuntimeUpdate({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { db, dbPath } = await withRuntimeDb(targetDir, t);

  try {
    const runKey = requireOption(options, 'run', t);
    const status = updateRun(db, {
      runKey,
      status: 'running',
      taskKey: options.task,
      eventType: 'progress',
      message: options.message,
      summary: options.summary,
      usedSkills: normalizeStringArray(options['used-skills'] || options.usedSkills),
      outputPath: options.output
    });

    if (!options.json) {
      logger.log(t('runtime.update_ok', { run: runKey, path: dbPath }));
    }

    return {
      ok: true,
      targetDir,
      dbPath,
      runKey,
      status
    };
  } finally {
    db.close();
  }
}

async function runRuntimeFinish({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { db, dbPath } = await withRuntimeDb(targetDir, t);

  try {
    const runKey = requireOption(options, 'run', t);
    const status = updateRun(db, {
      runKey,
      status: 'completed',
      taskKey: options.task,
      eventType: 'finish',
      message: options.message || options.summary || 'Run completed',
      summary: options.summary,
      usedSkills: normalizeStringArray(options['used-skills'] || options.usedSkills),
      outputPath: options.output
    });

    const finishedRun = db
      .prepare('SELECT run_key, task_key, squad_slug, session_key, agent_name, output_path, used_skills_json FROM agent_runs WHERE run_key = ?')
      .get(runKey);
    if (finishedRun && finishedRun.output_path) {
      attachArtifact(db, {
        taskKey: finishedRun.task_key,
        runKey: finishedRun.run_key,
        squadSlug: finishedRun.squad_slug,
        agentName: finishedRun.agent_name,
        filePath: finishedRun.output_path,
        title: options.title || options.summary || 'Artifact generated'
      });

      const absoluteOutputPath = path.isAbsolute(finishedRun.output_path)
        ? finishedRun.output_path
        : path.join(targetDir, finishedRun.output_path);
      const contentPaths = maybeResolveContentPaths(targetDir, finishedRun.output_path);
      const preferredCandidate = contentPaths
        ? (await fs
            .stat(contentPaths.absoluteJsonPath)
            .then((stat) => (stat.isFile() ? contentPaths.absoluteJsonPath : null))
            .catch(() => null))
        : absoluteOutputPath;

      if (preferredCandidate) {
        const ingestion = await ingestContentCandidate(db, targetDir, preferredCandidate, {
          task: finishedRun.task_key,
          run: finishedRun.run_key,
          squad: finishedRun.squad_slug,
          session: options.session || finishedRun.session_key,
          agent: finishedRun.agent_name,
          usedSkills: parseJsonArray(finishedRun.used_skills_json)
        });
        if (!ingestion.indexed && !options.json && logger?.log) {
          logger.log(`[runtime] skipped content indexing for ${finishedRun.run_key}: ${ingestion.reason}`);
        }
      }
    }

    if (!options.json) {
      logger.log(t('runtime.finish_ok', { run: runKey, path: dbPath }));
    }

    return {
      ok: true,
      targetDir,
      dbPath,
      runKey,
      status
    };
  } finally {
    db.close();
  }
}

async function runRuntimeTaskFinish({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { db, dbPath } = await withRuntimeDb(targetDir, t);

  try {
    const taskKey = requireOption(options, 'task', t);
    const taskStatus = updateTask(db, {
      taskKey,
      status: 'completed',
      goal: options.goal
    });

    if (!options.json) {
      logger.log(t('runtime.task_finish_ok', { task: taskKey, path: dbPath }));
    }

    return {
      ok: true,
      targetDir,
      dbPath,
      taskKey,
      status: taskStatus
    };
  } finally {
    db.close();
  }
}

async function runRuntimeFail({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { db, dbPath } = await withRuntimeDb(targetDir, t);

  try {
    const runKey = requireOption(options, 'run', t);
    const status = updateRun(db, {
      runKey,
      taskKey: options.task,
      status: 'failed',
      eventType: 'fail',
      message: options.message || options.summary || 'Run failed',
      summary: options.summary,
      outputPath: options.output
    });

    if (!options.json) {
      logger.log(t('runtime.fail_ok', { run: runKey, path: dbPath }));
    }

    return {
      ok: true,
      targetDir,
      dbPath,
      runKey,
      status
    };
  } finally {
    db.close();
  }
}

async function runRuntimeTaskFail({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { db, dbPath } = await withRuntimeDb(targetDir, t);

  try {
    const taskKey = requireOption(options, 'task', t);
    const status = updateTask(db, {
      taskKey,
      status: 'failed',
      goal: options.goal
    });

    if (!options.json) {
      logger.log(t('runtime.task_fail_ok', { task: taskKey, path: dbPath }));
    }

    return {
      ok: true,
      targetDir,
      dbPath,
      taskKey,
      status
    };
  } finally {
    db.close();
  }
}

async function runRuntimeStatus({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { dbPath } = resolveRuntimePaths(targetDir);

  if (!(await runtimeStoreExists(targetDir))) {
    if (options.json) {
      return { ok: false, error: 'store_missing', dbPath };
    }
    throw new Error(t('runtime.store_missing', { path: dbPath }));
  }

  const { db } = await openRuntimeDb(targetDir, { mustExist: true });

  try {
    const snapshot = getStatusSnapshot(db);
    const payload = {
      ok: true,
      targetDir,
      dbPath,
      taskCounts: snapshot.taskCounts,
      counts: snapshot.counts,
      activeTasks: snapshot.activeTasks,
      recentTasks: snapshot.recentTasks,
      activeRuns: snapshot.activeRuns,
      recentRuns: snapshot.recentRuns,
      recentArtifacts: snapshot.recentArtifacts,
      recentContentItems: snapshot.recentContentItems
    };

    if (!options.json) {
      logger.log(t('runtime.status_title', { path: targetDir }));
      logger.log(t('runtime.status_db', { path: dbPath }));
      logger.log(
        t('runtime.status_task_counts', {
          queued: payload.taskCounts.queued,
          running: payload.taskCounts.running,
          completed: payload.taskCounts.completed,
          failed: payload.taskCounts.failed
        })
      );
      logger.log(
        t('runtime.status_counts', {
          queued: payload.counts.queued,
          running: payload.counts.running,
          completed: payload.counts.completed,
          failed: payload.counts.failed
        })
      );
      if (snapshot.activeTasks.length === 0) {
        logger.log(t('runtime.status_no_active_tasks'));
      } else {
        logger.log(t('runtime.status_active_tasks_title'));
        for (const task of snapshot.activeTasks) {
          logger.log(
            t('runtime.status_active_task_line', {
              task: task.task_key,
              squad: task.squad_slug || '—',
              status: task.status,
              title: task.title
            })
          );
        }
      }
      if (snapshot.activeRuns.length === 0) {
        logger.log(t('runtime.status_no_active'));
      } else {
        logger.log(t('runtime.status_active_title'));
        for (const run of snapshot.activeRuns) {
          logger.log(
            t('runtime.status_active_line', {
              agent: run.agent_name,
              squad: run.squad_slug || '—',
              status: run.status,
              title: run.title || run.summary || '—'
            })
          );
        }
      }
    }

    return payload;
  } finally {
    db.close();
  }
}

/**
 * aios-lite runtime-log --agent=<name> --message=<text> [--type=<event>] [--finish] [--status=completed|failed] [--summary=<text>] [--title=<task-title>]
 *
 * Stateful single-command logger for official AIOS Lite agents.
 * First call creates task + run in SQLite; subsequent calls add events.
 * --finish closes the run and clears the session.
 */
async function runRuntimeLog({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const { db, dbPath, runtimeDir } = await openRuntimeDb(targetDir);

  try {
    const agentName = options.agent;
    if (!agentName) {
      throw new Error(t('runtime.log_agent_required'));
    }

    const { runKey, taskKey } = await logAgentEvent(db, runtimeDir, {
      agentName,
      squadSlug: options.squad || null,
      message: options.message || '',
      type: options.type || 'status',
      taskTitle: options.title,
      finish: Boolean(options.finish),
      status: options.status,
      summary: options.summary,
      meta: options.meta ? (() => { try { return JSON.parse(options.meta); } catch { return { raw: options.meta }; } })() : undefined
    });

    if (!options.json) {
      const isFinish = Boolean(options.finish);
      logger.log(isFinish
        ? t('runtime.log_finish_ok', { agent: agentName, run: runKey, path: dbPath })
        : t('runtime.log_ok', { agent: agentName, run: runKey, path: dbPath })
      );
    }

    return {
      ok: true,
      targetDir,
      dbPath,
      runKey,
      taskKey,
      agent: agentName,
      finished: Boolean(options.finish)
    };
  } finally {
    db.close();
  }
}

module.exports = {
  runRuntimeInit,
  runRuntimeIngest,
  runRuntimeTaskStart,
  runRuntimeStart,
  runRuntimeUpdate,
  runRuntimeTaskFinish,
  runRuntimeFinish,
  runRuntimeTaskFail,
  runRuntimeFail,
  runRuntimeStatus,
  runRuntimeLog
};
