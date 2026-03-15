'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const Database = require('better-sqlite3');
const { ensureDir, exists } = require('./utils');
const {
  attachBindingsToExecutors,
  flattenGenomeBindings,
  mergeGenomeBindings
} = require('./genomes/bindings');

const RUNTIME_DIR = path.join('.aioson', 'runtime');
const DB_FILE = 'aios.sqlite';
const SESSIONS_DIR = '.sessions';
const VALID_STATUSES = new Set(['queued', 'running', 'completed', 'failed']);
const VALID_TASK_STATUSES = new Set(['queued', 'running', 'completed', 'failed']);

function slugify(value) {
  return String(value || 'run')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'run';
}

function nowIso() {
  return new Date().toISOString();
}

function resolveRuntimePaths(targetDir) {
  const runtimeDir = path.join(targetDir, RUNTIME_DIR);
  return {
    runtimeDir,
    dbPath: path.join(runtimeDir, DB_FILE)
  };
}

async function runtimeStoreExists(targetDir) {
  const { dbPath } = resolveRuntimePaths(targetDir);
  return exists(dbPath);
}

async function openRuntimeDb(targetDir, options = {}) {
  const { runtimeDir, dbPath } = resolveRuntimePaths(targetDir);
  const mustExist = Boolean(options.mustExist);

  if (mustExist && !(await exists(dbPath))) {
    return null;
  }

  await ensureDir(runtimeDir);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS squads (
      squad_slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'content',
      mission TEXT,
      goal TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      visibility TEXT NOT NULL DEFAULT 'private',
      manifest_json TEXT,
      context_json TEXT,
      package_dir TEXT,
      agents_dir TEXT,
      output_dir TEXT,
      logs_dir TEXT,
      media_dir TEXT,
      latest_session_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS squad_executors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_slug TEXT NOT NULL,
      executor_slug TEXT NOT NULL,
      title TEXT,
      role TEXT,
      file_path TEXT,
      skills_json TEXT,
      genomes_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (squad_slug, executor_slug),
      FOREIGN KEY (squad_slug) REFERENCES squads(squad_slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS squad_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_slug TEXT NOT NULL,
      skill_slug TEXT NOT NULL,
      title TEXT,
      description TEXT,
      UNIQUE (squad_slug, skill_slug),
      FOREIGN KEY (squad_slug) REFERENCES squads(squad_slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS squad_mcps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_slug TEXT NOT NULL,
      mcp_slug TEXT NOT NULL,
      required INTEGER NOT NULL DEFAULT 0,
      purpose TEXT,
      UNIQUE (squad_slug, mcp_slug),
      FOREIGN KEY (squad_slug) REFERENCES squads(squad_slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS squad_genomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_slug TEXT NOT NULL,
      genome_slug TEXT NOT NULL,
      scope_type TEXT NOT NULL DEFAULT 'squad',
      agent_slug TEXT,
      UNIQUE (squad_slug, genome_slug, scope_type, agent_slug),
      FOREIGN KEY (squad_slug) REFERENCES squads(squad_slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      task_key TEXT PRIMARY KEY,
      squad_slug TEXT,
      session_key TEXT,
      title TEXT NOT NULL,
      goal TEXT,
      status TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      run_key TEXT PRIMARY KEY,
      task_key TEXT,
      agent_name TEXT NOT NULL,
      agent_kind TEXT NOT NULL DEFAULT 'official',
      squad_slug TEXT,
      session_key TEXT,
      source TEXT NOT NULL DEFAULT 'direct',
      workflow_id TEXT,
      workflow_stage TEXT,
      parent_run_key TEXT,
      title TEXT,
      status TEXT NOT NULL,
      summary TEXT,
      used_skills_json TEXT,
      output_path TEXT,
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      finished_at TEXT,
      FOREIGN KEY (task_key) REFERENCES tasks(task_key) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS agent_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (run_key) REFERENCES agent_runs(run_key) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS execution_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_key TEXT,
      run_key TEXT,
      agent_name TEXT,
      agent_kind TEXT,
      squad_slug TEXT,
      session_key TEXT,
      source TEXT,
      workflow_id TEXT,
      workflow_stage TEXT,
      parent_run_key TEXT,
      event_type TEXT NOT NULL,
      phase TEXT,
      status TEXT,
      tool_name TEXT,
      message TEXT NOT NULL DEFAULT '',
      payload_json TEXT,
      sequence_no INTEGER NOT NULL DEFAULT 1,
      parent_event_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_key) REFERENCES tasks(task_key) ON DELETE SET NULL,
      FOREIGN KEY (run_key) REFERENCES agent_runs(run_key) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_key TEXT,
      run_key TEXT,
      squad_slug TEXT,
      agent_name TEXT,
      kind TEXT NOT NULL,
      title TEXT,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_key) REFERENCES tasks(task_key) ON DELETE SET NULL,
      FOREIGN KEY (run_key) REFERENCES agent_runs(run_key) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS content_items (
      content_key TEXT PRIMARY KEY,
      task_key TEXT,
      run_key TEXT,
      squad_slug TEXT NOT NULL,
      session_key TEXT,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL,
      layout_type TEXT NOT NULL DEFAULT 'document',
      status TEXT NOT NULL DEFAULT 'completed',
      summary TEXT,
      blueprint_slug TEXT,
      used_skills_json TEXT,
      payload_json TEXT,
      json_path TEXT,
      html_path TEXT,
      created_by_agent TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (task_key) REFERENCES tasks(task_key) ON DELETE SET NULL,
      FOREIGN KEY (run_key) REFERENCES agent_runs(run_key) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_squads_updated ON squads(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_squad_executors_squad ON squad_executors(squad_slug, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_squad_skills_squad ON squad_skills(squad_slug);
    CREATE INDEX IF NOT EXISTS idx_squad_mcps_squad ON squad_mcps(squad_slug);
    CREATE INDEX IF NOT EXISTS idx_squad_genomes_squad ON squad_genomes(squad_slug);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_squad ON tasks(squad_slug, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_task ON agent_runs(task_key, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_squad ON agent_runs(squad_slug, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_events_run ON agent_events(run_key, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_execution_events_run ON execution_events(run_key, sequence_no DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_execution_events_task ON execution_events(task_key, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_execution_events_created ON execution_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_artifacts_task ON artifacts(task_key, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_content_items_squad ON content_items(squad_slug, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_content_items_task ON content_items(task_key, updated_at DESC);

    CREATE TABLE IF NOT EXISTS squad_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_slug TEXT NOT NULL,
      coverage_json TEXT,
      suggestions_json TEXT,
      metrics_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (squad_slug) REFERENCES squads(squad_slug)
    );

    CREATE INDEX IF NOT EXISTS idx_squad_analyses_squad ON squad_analyses(squad_slug, created_at DESC);

    CREATE TABLE IF NOT EXISTS squad_ports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_slug TEXT NOT NULL,
      port_type TEXT NOT NULL CHECK(port_type IN ('input', 'output')),
      port_key TEXT NOT NULL,
      data_type TEXT DEFAULT 'any',
      description TEXT,
      required INTEGER DEFAULT 0,
      content_blueprint_slug TEXT,
      FOREIGN KEY (squad_slug) REFERENCES squads(squad_slug),
      UNIQUE(squad_slug, port_type, port_key)
    );

    CREATE TABLE IF NOT EXISTS squad_pipelines (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'paused', 'archived')),
      trigger_mode TEXT DEFAULT 'manual' CHECK(trigger_mode IN ('manual', 'on_output', 'scheduled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pipeline_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pipeline_slug TEXT NOT NULL,
      squad_slug TEXT NOT NULL,
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      config_json TEXT,
      FOREIGN KEY (pipeline_slug) REFERENCES squad_pipelines(slug),
      FOREIGN KEY (squad_slug) REFERENCES squads(squad_slug),
      UNIQUE(pipeline_slug, squad_slug)
    );

    CREATE TABLE IF NOT EXISTS pipeline_edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pipeline_slug TEXT NOT NULL,
      source_squad TEXT NOT NULL,
      source_port TEXT NOT NULL,
      target_squad TEXT NOT NULL,
      target_port TEXT NOT NULL,
      transform_json TEXT,
      FOREIGN KEY (pipeline_slug) REFERENCES squad_pipelines(slug)
    );

    CREATE TABLE IF NOT EXISTS squad_handoffs (
      id TEXT PRIMARY KEY,
      pipeline_slug TEXT,
      from_squad TEXT NOT NULL,
      from_port TEXT NOT NULL,
      to_squad TEXT NOT NULL,
      to_port TEXT NOT NULL,
      payload_json TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'consumed', 'failed', 'expired')),
      created_at TEXT NOT NULL,
      consumed_at TEXT,
      FOREIGN KEY (from_squad) REFERENCES squads(squad_slug),
      FOREIGN KEY (to_squad) REFERENCES squads(squad_slug)
    );

    CREATE INDEX IF NOT EXISTS idx_squad_pipelines_status ON squad_pipelines(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pipeline_nodes_pipeline ON pipeline_nodes(pipeline_slug);
    CREATE INDEX IF NOT EXISTS idx_pipeline_edges_pipeline ON pipeline_edges(pipeline_slug);
    CREATE INDEX IF NOT EXISTS idx_squad_handoffs_to ON squad_handoffs(to_squad, status, created_at DESC);

    CREATE TABLE IF NOT EXISTS artisan_squads (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'refining', 'ready', 'created', 'archived')),
      domain TEXT,
      goal TEXT,
      mode TEXT DEFAULT 'content',
      prd_markdown TEXT,
      summary TEXT,
      confidence REAL DEFAULT 0,
      tags_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artisan_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artisan_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (artisan_id) REFERENCES artisan_squads(id)
    );

    CREATE INDEX IF NOT EXISTS idx_artisan_squads_status ON artisan_squads(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_artisan_messages_artisan ON artisan_messages(artisan_id, created_at ASC);
  `);

  ensureLegacyColumns(db);

  return { db, dbPath, runtimeDir };
}

function createRunKey(agentName) {
  return `${slugify(agentName)}-${Date.now()}`;
}

function createTaskKey(title) {
  return `task-${slugify(title)}-${Date.now()}`;
}

function normalizeStatus(value, fallback) {
  const candidate = String(value || fallback || '')
    .trim()
    .toLowerCase();
  return VALID_STATUSES.has(candidate) ? candidate : fallback;
}

function normalizeTaskStatus(value, fallback) {
  const candidate = String(value || fallback || '')
    .trim()
    .toLowerCase();
  return VALID_TASK_STATUSES.has(candidate) ? candidate : fallback;
}

function ensureLegacyColumns(db) {
  const agentRunColumns = db.prepare('PRAGMA table_info(agent_runs)').all();
  const agentRunColumnNames = new Set(agentRunColumns.map((column) => column.name));

  if (!agentRunColumnNames.has('task_key')) {
    db.exec('ALTER TABLE agent_runs ADD COLUMN task_key TEXT');
  }

  if (!agentRunColumnNames.has('used_skills_json')) {
    db.exec('ALTER TABLE agent_runs ADD COLUMN used_skills_json TEXT');
  }

  if (!agentRunColumnNames.has('source')) {
    db.exec("ALTER TABLE agent_runs ADD COLUMN source TEXT NOT NULL DEFAULT 'direct'");
  }

  if (!agentRunColumnNames.has('workflow_id')) {
    db.exec('ALTER TABLE agent_runs ADD COLUMN workflow_id TEXT');
  }

  if (!agentRunColumnNames.has('workflow_stage')) {
    db.exec('ALTER TABLE agent_runs ADD COLUMN workflow_stage TEXT');
  }

  if (!agentRunColumnNames.has('parent_run_key')) {
    db.exec('ALTER TABLE agent_runs ADD COLUMN parent_run_key TEXT');
  }

  const squadColumns = db.prepare('PRAGMA table_info(squads)').all();
  const squadColumnNames = new Set(squadColumns.map((column) => column.name));

  if (!squadColumnNames.has('context_json')) {
    db.exec('ALTER TABLE squads ADD COLUMN context_json TEXT');
  }

  if (!squadColumnNames.has('mode')) {
    db.exec("ALTER TABLE squads ADD COLUMN mode TEXT NOT NULL DEFAULT 'content'");
  }

  if (!squadColumnNames.has('package_dir')) {
    db.exec('ALTER TABLE squads ADD COLUMN package_dir TEXT');
  }

  const contentItemColumns = db.prepare('PRAGMA table_info(content_items)').all();
  const contentItemColumnNames = new Set(contentItemColumns.map((column) => column.name));

  if (!contentItemColumnNames.has('blueprint_slug')) {
    db.exec('ALTER TABLE content_items ADD COLUMN blueprint_slug TEXT');
  }

  if (!contentItemColumnNames.has('used_skills_json')) {
    db.exec('ALTER TABLE content_items ADD COLUMN used_skills_json TEXT');
  }
}

function insertEvent(db, record) {
  db.prepare(`
    INSERT INTO agent_events (run_key, event_type, message, payload_json, created_at)
    VALUES (@run_key, @event_type, @message, @payload_json, @created_at)
  `).run(record);
}

function getRunContext(db, runKey) {
  return db
    .prepare(`
      SELECT
        run_key,
        task_key,
        agent_name,
        agent_kind,
        squad_slug,
        session_key,
        source,
        workflow_id,
        workflow_stage,
        parent_run_key,
        status,
        summary,
        title
      FROM agent_runs
      WHERE run_key = ?
    `)
    .get(runKey);
}

function nextExecutionSequence(db, runKey) {
  if (!runKey) return 1;
  const row = db
    .prepare('SELECT COALESCE(MAX(sequence_no), 0) AS max_sequence FROM execution_events WHERE run_key = ?')
    .get(runKey);
  return Number(row?.max_sequence || 0) + 1;
}

function insertExecutionEvent(db, record) {
  db.prepare(`
    INSERT INTO execution_events (
      task_key, run_key, agent_name, agent_kind, squad_slug, session_key,
      source, workflow_id, workflow_stage, parent_run_key,
      event_type, phase, status, tool_name, message, payload_json,
      sequence_no, parent_event_id, created_at
    ) VALUES (
      @task_key, @run_key, @agent_name, @agent_kind, @squad_slug, @session_key,
      @source, @workflow_id, @workflow_stage, @parent_run_key,
      @event_type, @phase, @status, @tool_name, @message, @payload_json,
      @sequence_no, @parent_event_id, @created_at
    )
  `).run(record);
}

function appendRunEvent(db, options) {
  const run = getRunContext(db, options.runKey);
  if (!run) {
    throw new Error(`Run not found: ${options.runKey}`);
  }

  const now = options.createdAt || nowIso();
  const payloadJson = options.payload ? JSON.stringify(options.payload) : null;

  insertEvent(db, {
    run_key: run.run_key,
    event_type: String(options.eventType || 'update'),
    message: String(options.message || ''),
    payload_json: payloadJson,
    created_at: now
  });

  insertExecutionEvent(db, {
    task_key: run.task_key,
    run_key: run.run_key,
    agent_name: run.agent_name,
    agent_kind: run.agent_kind,
    squad_slug: run.squad_slug,
    session_key: run.session_key,
    source: run.source,
    workflow_id: run.workflow_id,
    workflow_stage: run.workflow_stage,
    parent_run_key: run.parent_run_key,
    event_type: String(options.eventType || 'update'),
    phase: options.phase ? String(options.phase).trim() : null,
    status: options.status ? String(options.status).trim() : run.status || null,
    tool_name: options.toolName ? String(options.toolName).trim() : null,
    message: String(options.message || ''),
    payload_json: payloadJson,
    sequence_no: nextExecutionSequence(db, run.run_key),
    parent_event_id: options.parentEventId || null,
    created_at: now
  });
}

function startTask(db, options) {
  const now = nowIso();
  const taskKey = String(options.taskKey || createTaskKey(options.title));
  const status = normalizeTaskStatus(options.status, 'running');

  db.prepare(`
    INSERT INTO tasks (
      task_key, squad_slug, session_key, title, goal, status, created_by,
      created_at, updated_at, finished_at
    ) VALUES (
      @task_key, @squad_slug, @session_key, @title, @goal, @status, @created_by,
      @created_at, @updated_at, @finished_at
    )
  `).run({
    task_key: taskKey,
    squad_slug: options.squadSlug ? String(options.squadSlug).trim() : null,
    session_key: options.sessionKey ? String(options.sessionKey).trim() : null,
    title: String(options.title).trim(),
    goal: options.goal ? String(options.goal).trim() : null,
    status,
    created_by: options.createdBy ? String(options.createdBy).trim() : null,
    created_at: now,
    updated_at: now,
    finished_at: status === 'completed' || status === 'failed' ? now : null
  });

  return taskKey;
}

function updateTask(db, options) {
  const existing = db.prepare('SELECT task_key, status FROM tasks WHERE task_key = ?').get(options.taskKey);
  if (!existing) {
    throw new Error(`Task not found: ${options.taskKey}`);
  }

  const now = nowIso();
  const nextStatus = normalizeTaskStatus(options.status, existing.status || 'running');

  db.prepare(`
    UPDATE tasks
    SET
      status = @status,
      goal = COALESCE(@goal, goal),
      updated_at = @updated_at,
      finished_at = CASE
        WHEN @status IN ('completed', 'failed') THEN @updated_at
        ELSE finished_at
      END
    WHERE task_key = @task_key
  `).run({
    task_key: String(options.taskKey),
    status: nextStatus,
    goal: options.goal ? String(options.goal).trim() : null,
    updated_at: now
  });

  return nextStatus;
}

function attachArtifact(db, options) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO artifacts (
      task_key, run_key, squad_slug, agent_name, kind, title, file_path, created_at
    ) VALUES (
      @task_key, @run_key, @squad_slug, @agent_name, @kind, @title, @file_path, @created_at
    )
  `).run({
    task_key: options.taskKey ? String(options.taskKey) : null,
    run_key: options.runKey ? String(options.runKey) : null,
    squad_slug: options.squadSlug ? String(options.squadSlug) : null,
    agent_name: options.agentName ? String(options.agentName) : null,
    kind: String(options.kind || inferArtifactKind(options.filePath || '')).trim(),
    title: options.title ? String(options.title).trim() : null,
    file_path: String(options.filePath).trim(),
    created_at: now
  });
}

function upsertContentItem(db, options) {
  const now = nowIso();
  const contentKey = String(options.contentKey || createTaskKey(options.title || 'content')).trim();
  const usedSkillsJson = normalizeStringArray(options.usedSkills).length > 0 ? JSON.stringify(normalizeStringArray(options.usedSkills)) : null;

  db.prepare(`
    INSERT INTO content_items (
      content_key, task_key, run_key, squad_slug, session_key, title, content_type, layout_type,
      status, summary, blueprint_slug, used_skills_json, payload_json, json_path, html_path, created_by_agent, created_at, updated_at
    ) VALUES (
      @content_key, @task_key, @run_key, @squad_slug, @session_key, @title, @content_type, @layout_type,
      @status, @summary, @blueprint_slug, @used_skills_json, @payload_json, @json_path, @html_path, @created_by_agent, @created_at, @updated_at
    )
    ON CONFLICT(content_key) DO UPDATE SET
      task_key = excluded.task_key,
      run_key = excluded.run_key,
      squad_slug = excluded.squad_slug,
      session_key = excluded.session_key,
      title = excluded.title,
      content_type = excluded.content_type,
      layout_type = excluded.layout_type,
      status = excluded.status,
      summary = excluded.summary,
      blueprint_slug = excluded.blueprint_slug,
      used_skills_json = excluded.used_skills_json,
      payload_json = excluded.payload_json,
      json_path = excluded.json_path,
      html_path = excluded.html_path,
      created_by_agent = excluded.created_by_agent,
      updated_at = excluded.updated_at
  `).run({
    content_key: contentKey,
    task_key: options.taskKey ? String(options.taskKey).trim() : null,
    run_key: options.runKey ? String(options.runKey).trim() : null,
    squad_slug: String(options.squadSlug).trim(),
    session_key: options.sessionKey ? String(options.sessionKey).trim() : null,
    title: String(options.title || contentKey).trim(),
    content_type: String(options.contentType || 'content').trim(),
    layout_type: String(options.layoutType || 'document').trim(),
    status: String(options.status || 'completed').trim(),
    summary: options.summary ? String(options.summary).trim() : null,
    blueprint_slug: options.blueprintSlug ? String(options.blueprintSlug).trim() : null,
    used_skills_json: usedSkillsJson,
    payload_json:
      options.payload && typeof options.payload === 'object'
        ? JSON.stringify(options.payload)
        : options.payloadJson
          ? String(options.payloadJson)
          : null,
    json_path: options.jsonPath ? String(options.jsonPath).trim() : null,
    html_path: options.htmlPath ? String(options.htmlPath).trim() : null,
    created_by_agent: options.createdByAgent ? String(options.createdByAgent).trim() : null,
    created_at: now,
    updated_at: now
  });

  return contentKey;
}

function normalizeArray(value) {
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

function upsertSquadManifest(db, options) {
  const now = nowIso();
  const slug = String(options.slug).trim();
  const manifest = options.manifest && typeof options.manifest === 'object' ? options.manifest : {};
  const context =
    options.context && typeof options.context === 'object'
      ? options.context
      : manifest.context && typeof manifest.context === 'object'
        ? manifest.context
        : null;
  const skills = normalizeArray(manifest.skills);
  const mcps = normalizeArray(manifest.mcps);
  const executors = normalizeArray(manifest.executors);
  const genomeBindings = mergeGenomeBindings({
    blueprintBindings: manifest.genomeBindings,
    manifestBindings: manifest.genomeBindings || manifest.genomes,
    legacyExecutors: executors
  });
  const resolvedExecutors = attachBindingsToExecutors(executors, genomeBindings);
  const genomes = flattenGenomeBindings(genomeBindings);

  db.prepare(`
    INSERT INTO squads (
      squad_slug, name, mode, mission, goal, status, visibility, manifest_json,
      context_json,
      package_dir, agents_dir, output_dir, logs_dir, media_dir, latest_session_path,
      created_at, updated_at
    ) VALUES (
      @squad_slug, @name, @mode, @mission, @goal, @status, @visibility, @manifest_json,
      @context_json,
      @package_dir, @agents_dir, @output_dir, @logs_dir, @media_dir, @latest_session_path,
      @created_at, @updated_at
    )
    ON CONFLICT(squad_slug) DO UPDATE SET
      name = excluded.name,
      mode = excluded.mode,
      mission = excluded.mission,
      goal = excluded.goal,
      status = excluded.status,
      visibility = excluded.visibility,
      manifest_json = excluded.manifest_json,
      context_json = excluded.context_json,
      package_dir = excluded.package_dir,
      agents_dir = excluded.agents_dir,
      output_dir = excluded.output_dir,
      logs_dir = excluded.logs_dir,
      media_dir = excluded.media_dir,
      latest_session_path = excluded.latest_session_path,
      updated_at = excluded.updated_at
  `).run({
    squad_slug: slug,
    name: String(options.name || manifest.name || slug).trim(),
    mode: String(options.mode || manifest.mode || 'content').trim(),
    mission: options.mission ? String(options.mission).trim() : manifest.mission ? String(manifest.mission).trim() : null,
    goal: options.goal ? String(options.goal).trim() : manifest.goal ? String(manifest.goal).trim() : null,
    status: String(options.status || 'active').trim(),
    visibility: String(options.visibility || manifest.visibility || 'private').trim(),
    manifest_json: JSON.stringify(manifest),
    context_json: context ? JSON.stringify(context) : null,
    package_dir: options.packageDir ? String(options.packageDir).trim() : manifest?.package?.rootDir ? String(manifest.package.rootDir).trim() : null,
    agents_dir: options.agentsDir ? String(options.agentsDir).trim() : null,
    output_dir: options.outputDir ? String(options.outputDir).trim() : null,
    logs_dir: options.logsDir ? String(options.logsDir).trim() : null,
    media_dir: options.mediaDir ? String(options.mediaDir).trim() : null,
    latest_session_path: options.latestSessionPath ? String(options.latestSessionPath).trim() : null,
    created_at: now,
    updated_at: now
  });

  db.prepare('DELETE FROM squad_executors WHERE squad_slug = ?').run(slug);
  db.prepare('DELETE FROM squad_skills WHERE squad_slug = ?').run(slug);
  db.prepare('DELETE FROM squad_mcps WHERE squad_slug = ?').run(slug);
  db.prepare('DELETE FROM squad_genomes WHERE squad_slug = ?').run(slug);

  const insertExecutor = db.prepare(`
    INSERT INTO squad_executors (
      squad_slug, executor_slug, title, role, file_path, skills_json, genomes_json,
      created_at, updated_at
    ) VALUES (
      @squad_slug, @executor_slug, @title, @role, @file_path, @skills_json, @genomes_json,
      @created_at, @updated_at
    )
  `);

  for (const executor of resolvedExecutors) {
    insertExecutor.run({
      squad_slug: slug,
      executor_slug: String(executor.slug || '').trim(),
      title: executor.title ? String(executor.title).trim() : null,
      role: executor.role ? String(executor.role).trim() : null,
      file_path: executor.file ? String(executor.file).trim() : null,
      skills_json: JSON.stringify(normalizeArray(executor.skills)),
      genomes_json: JSON.stringify(normalizeArray(executor.genomes)),
      created_at: now,
      updated_at: now
    });
  }

  const insertSkill = db.prepare(`
    INSERT INTO squad_skills (squad_slug, skill_slug, title, description)
    VALUES (@squad_slug, @skill_slug, @title, @description)
  `);

  for (const skill of skills) {
    insertSkill.run({
      squad_slug: slug,
      skill_slug: String(skill.slug || '').trim(),
      title: skill.title ? String(skill.title).trim() : null,
      description: skill.description ? String(skill.description).trim() : null
    });
  }

  const insertMcp = db.prepare(`
    INSERT INTO squad_mcps (squad_slug, mcp_slug, required, purpose)
    VALUES (@squad_slug, @mcp_slug, @required, @purpose)
  `);

  for (const mcp of mcps) {
    insertMcp.run({
      squad_slug: slug,
      mcp_slug: String(mcp.slug || '').trim(),
      required: mcp.required ? 1 : 0,
      purpose: mcp.purpose ? String(mcp.purpose).trim() : null
    });
  }

  const insertGenome = db.prepare(`
    INSERT INTO squad_genomes (squad_slug, genome_slug, scope_type, agent_slug)
    VALUES (@squad_slug, @genome_slug, @scope_type, @agent_slug)
  `);

  for (const genome of genomes) {
    insertGenome.run({
      squad_slug: slug,
      genome_slug: String(genome.slug || '').trim(),
      scope_type: String(genome.scope || 'squad').trim(),
      agent_slug: genome.agentSlug ? String(genome.agentSlug).trim() : null
    });
  }

  return slug;
}

// ─── Pipeline CRUD ────────────────────────────────────────────────────────────

function upsertPipeline(db, options) {
  const now = nowIso();
  const slug = String(options.slug).trim();
  db.prepare(`
    INSERT INTO squad_pipelines (slug, name, description, status, trigger_mode, created_at, updated_at)
    VALUES (@slug, @name, @description, @status, @trigger_mode, @created_at, @updated_at)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      description = COALESCE(excluded.description, description),
      status = excluded.status,
      trigger_mode = excluded.trigger_mode,
      updated_at = excluded.updated_at
  `).run({
    slug,
    name: String(options.name || slug).trim(),
    description: options.description ? String(options.description).trim() : null,
    status: String(options.status || 'draft').trim(),
    trigger_mode: String(options.triggerMode || 'manual').trim(),
    created_at: now,
    updated_at: now
  });
  return slug;
}

function addPipelineNode(db, options) {
  db.prepare(`
    INSERT INTO pipeline_nodes (pipeline_slug, squad_slug, position_x, position_y, config_json)
    VALUES (@pipeline_slug, @squad_slug, @position_x, @position_y, @config_json)
    ON CONFLICT(pipeline_slug, squad_slug) DO UPDATE SET
      position_x = excluded.position_x,
      position_y = excluded.position_y,
      config_json = COALESCE(excluded.config_json, config_json)
  `).run({
    pipeline_slug: String(options.pipelineSlug).trim(),
    squad_slug: String(options.squadSlug).trim(),
    position_x: Number(options.positionX || 0),
    position_y: Number(options.positionY || 0),
    config_json: options.config ? JSON.stringify(options.config) : null
  });
}

function updateNodePosition(db, options) {
  db.prepare(`
    UPDATE pipeline_nodes SET position_x = @position_x, position_y = @position_y
    WHERE pipeline_slug = @pipeline_slug AND squad_slug = @squad_slug
  `).run({
    pipeline_slug: String(options.pipelineSlug).trim(),
    squad_slug: String(options.squadSlug).trim(),
    position_x: Number(options.positionX || 0),
    position_y: Number(options.positionY || 0)
  });
}

function addPipelineEdge(db, options) {
  db.prepare(`
    INSERT INTO pipeline_edges (pipeline_slug, source_squad, source_port, target_squad, target_port, transform_json)
    VALUES (@pipeline_slug, @source_squad, @source_port, @target_squad, @target_port, @transform_json)
  `).run({
    pipeline_slug: String(options.pipelineSlug).trim(),
    source_squad: String(options.sourceSquad).trim(),
    source_port: String(options.sourcePort).trim(),
    target_squad: String(options.targetSquad).trim(),
    target_port: String(options.targetPort).trim(),
    transform_json: options.transform ? JSON.stringify(options.transform) : null
  });
}

function removePipelineEdge(db, id) {
  db.prepare('DELETE FROM pipeline_edges WHERE id = ?').run(id);
}

function getPipelineDAG(db, pipelineSlug) {
  const pipeline = db.prepare('SELECT * FROM squad_pipelines WHERE slug = ?').get(pipelineSlug);
  if (!pipeline) return null;
  const nodes = db.prepare('SELECT * FROM pipeline_nodes WHERE pipeline_slug = ?').all(pipelineSlug);
  const edges = db.prepare('SELECT * FROM pipeline_edges WHERE pipeline_slug = ?').all(pipelineSlug);
  return { pipeline, nodes, edges };
}

function listPipelines(db) {
  return db.prepare('SELECT * FROM squad_pipelines ORDER BY updated_at DESC').all();
}

function upsertSquadPorts(db, squadSlug, ports) {
  db.prepare('DELETE FROM squad_ports WHERE squad_slug = ?').run(squadSlug);
  const insert = db.prepare(`
    INSERT INTO squad_ports (squad_slug, port_type, port_key, data_type, description, required, content_blueprint_slug)
    VALUES (@squad_slug, @port_type, @port_key, @data_type, @description, @required, @content_blueprint_slug)
  `);
  const all = [...(ports.inputs || []).map(p => ({ ...p, type: 'input' })), ...(ports.outputs || []).map(p => ({ ...p, type: 'output' }))];
  for (const port of all) {
    insert.run({
      squad_slug: String(squadSlug).trim(),
      port_type: port.type,
      port_key: String(port.key).trim(),
      data_type: String(port.dataType || 'any').trim(),
      description: port.description ? String(port.description).trim() : null,
      required: port.required ? 1 : 0,
      content_blueprint_slug: port.contentBlueprintSlug ? String(port.contentBlueprintSlug).trim() : null
    });
  }
}

function getTopologicalOrder(db, pipelineSlug) {
  const nodes = db.prepare('SELECT squad_slug FROM pipeline_nodes WHERE pipeline_slug = ?').all(pipelineSlug);
  const edges = db.prepare('SELECT source_squad, target_squad FROM pipeline_edges WHERE pipeline_slug = ?').all(pipelineSlug);

  const slugs = nodes.map(n => n.squad_slug);
  const inDegree = Object.fromEntries(slugs.map(s => [s, 0]));
  const adj = Object.fromEntries(slugs.map(s => [s, []]));

  for (const { source_squad, target_squad } of edges) {
    if (adj[source_squad] !== undefined && inDegree[target_squad] !== undefined) {
      adj[source_squad].push(target_squad);
      inDegree[target_squad]++;
    }
  }

  const queue = slugs.filter(s => inDegree[s] === 0);
  const order = [];

  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);
    for (const neighbor of (adj[node] || [])) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return order.length === slugs.length ? order : null; // null = cycle detected
}

// ─── Artisan CRUD ─────────────────────────────────────────────────────────────

function createArtisanSquad(db, options) {
  const now = nowIso();
  const id = options.id || `artisan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const slug = options.slug || id;
  db.prepare(`
    INSERT INTO artisan_squads (id, slug, title, status, domain, goal, mode, prd_markdown, summary, confidence, tags_json, created_at, updated_at)
    VALUES (@id, @slug, @title, @status, @domain, @goal, @mode, @prd_markdown, @summary, @confidence, @tags_json, @created_at, @updated_at)
  `).run({
    id, slug,
    title: options.title || 'Nova ideia',
    status: 'draft',
    domain: options.domain || null,
    goal: options.goal || null,
    mode: options.mode || 'content',
    prd_markdown: options.prdMarkdown || null,
    summary: options.summary || null,
    confidence: options.confidence || 0,
    tags_json: JSON.stringify(options.tags || []),
    created_at: now, updated_at: now
  });
  return id;
}

function updateArtisanSquad(db, id, updates) {
  const now = nowIso();
  const existing = db.prepare('SELECT id FROM artisan_squads WHERE id = ?').get(id);
  if (!existing) throw new Error(`Artisan squad not found: ${id}`);
  const fields = [];
  const values = { id, updated_at: now };
  const allowed = ['title', 'status', 'domain', 'goal', 'mode', 'prd_markdown', 'summary', 'confidence', 'tags_json'];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      fields.push(`${key} = @${key}`);
      values[key] = updates[key];
    }
  }
  if (fields.length === 0) return;
  db.prepare(`UPDATE artisan_squads SET ${fields.join(', ')}, updated_at = @updated_at WHERE id = @id`).run(values);
}

function getArtisanSquad(db, id) {
  return db.prepare('SELECT * FROM artisan_squads WHERE id = ?').get(id) || null;
}

function listArtisanSquads(db) {
  return db.prepare('SELECT * FROM artisan_squads ORDER BY updated_at DESC').all();
}

function deleteArtisanSquad(db, id) {
  db.prepare('DELETE FROM artisan_messages WHERE artisan_id = ?').run(id);
  db.prepare('DELETE FROM artisan_squads WHERE id = ?').run(id);
}

function addArtisanMessage(db, artisanId, role, content) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO artisan_messages (artisan_id, role, content, created_at)
    VALUES (@artisan_id, @role, @content, @created_at)
  `).run({ artisan_id: artisanId, role, content, created_at: now });
}

function getArtisanMessages(db, artisanId) {
  return db.prepare('SELECT * FROM artisan_messages WHERE artisan_id = ? ORDER BY created_at ASC').all(artisanId);
}

function insertSquadAnalysis(db, options) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO squad_analyses (squad_slug, coverage_json, suggestions_json, metrics_json, created_at)
    VALUES (@squad_slug, @coverage_json, @suggestions_json, @metrics_json, @created_at)
  `).run({
    squad_slug: String(options.slug).trim(),
    coverage_json: JSON.stringify(options.coverage || {}),
    suggestions_json: JSON.stringify(options.suggestions || []),
    metrics_json: JSON.stringify(options.metrics || {}),
    created_at: now
  });
}

function inferArtifactKind(filePath) {
  if (/\.html?$/i.test(filePath)) return 'html';
  if (/\.md$/i.test(filePath)) return 'markdown';
  return 'file';
}

function startRun(db, options) {
  const now = nowIso();
  const runKey = String(options.runKey || createRunKey(options.agentName));
  const status = normalizeStatus(options.status, 'running');
  const agentKind = String(options.agentKind || (options.squadSlug ? 'squad' : 'official')).trim();
  const taskKey = options.taskKey ? String(options.taskKey).trim() : null;
  const source = String(options.source || 'direct').trim() || 'direct';
  const usedSkillsJson = normalizeStringArray(options.usedSkills).length > 0 ? JSON.stringify(normalizeStringArray(options.usedSkills)) : null;

  if (taskKey) {
    const taskExists = db.prepare('SELECT task_key FROM tasks WHERE task_key = ?').get(taskKey);
    if (!taskExists) {
      throw new Error(`Task not found: ${taskKey}`);
    }
  }

  db.prepare(`
    INSERT INTO agent_runs (
      run_key, task_key, agent_name, agent_kind, squad_slug, session_key, source,
      workflow_id, workflow_stage, parent_run_key, title,
      status, summary, used_skills_json, output_path, started_at, updated_at, finished_at
    ) VALUES (
      @run_key, @task_key, @agent_name, @agent_kind, @squad_slug, @session_key, @source,
      @workflow_id, @workflow_stage, @parent_run_key, @title,
      @status, @summary, @used_skills_json, @output_path, @started_at, @updated_at, @finished_at
    )
  `).run({
    run_key: runKey,
    task_key: taskKey,
    agent_name: String(options.agentName).trim(),
    agent_kind: agentKind,
    squad_slug: options.squadSlug ? String(options.squadSlug).trim() : null,
    session_key: options.sessionKey ? String(options.sessionKey).trim() : null,
    source,
    workflow_id: options.workflowId ? String(options.workflowId).trim() : null,
    workflow_stage: options.workflowStage ? String(options.workflowStage).trim() : null,
    parent_run_key: options.parentRunKey ? String(options.parentRunKey).trim() : null,
    title: options.title ? String(options.title).trim() : null,
    status,
    summary: options.summary ? String(options.summary).trim() : null,
    used_skills_json: usedSkillsJson,
    output_path: options.outputPath ? String(options.outputPath).trim() : null,
    started_at: now,
    updated_at: now,
    finished_at: status === 'completed' || status === 'failed' ? now : null
  });

  appendRunEvent(db, {
    runKey,
    eventType: 'start',
    phase: options.phase || 'run',
    status,
    message: String(options.message || options.title || 'Agent started'),
    payload: options.payload,
    createdAt: now
  });

  return runKey;
}

function updateRun(db, options) {
  const now = nowIso();
  const existing = db
    .prepare('SELECT run_key, status, used_skills_json, source, workflow_id, workflow_stage, parent_run_key FROM agent_runs WHERE run_key = ?')
    .get(options.runKey);
  if (!existing) {
    throw new Error(`Run not found: ${options.runKey}`);
  }
  const taskKey = options.taskKey ? String(options.taskKey).trim() : null;

  if (taskKey) {
    const taskExists = db.prepare('SELECT task_key FROM tasks WHERE task_key = ?').get(taskKey);
    if (!taskExists) {
      throw new Error(`Task not found: ${taskKey}`);
    }
  }

  const nextStatus = normalizeStatus(options.status, existing.status || 'running');
  const existingUsedSkills = parseJsonArray(existing.used_skills_json);
  const nextUsedSkills = normalizeStringArray([...(existingUsedSkills || []), ...normalizeStringArray(options.usedSkills)]);
  db.prepare(`
    UPDATE agent_runs
    SET
      status = @status,
      summary = COALESCE(@summary, summary),
      used_skills_json = COALESCE(@used_skills_json, used_skills_json),
      output_path = COALESCE(@output_path, output_path),
      task_key = COALESCE(@task_key, task_key),
      source = COALESCE(@source, source),
      workflow_id = COALESCE(@workflow_id, workflow_id),
      workflow_stage = COALESCE(@workflow_stage, workflow_stage),
      parent_run_key = COALESCE(@parent_run_key, parent_run_key),
      updated_at = @updated_at,
      finished_at = CASE
        WHEN @status IN ('completed', 'failed') THEN @updated_at
        ELSE finished_at
      END
    WHERE run_key = @run_key
  `).run({
    run_key: String(options.runKey),
    status: nextStatus,
    summary: options.summary ? String(options.summary).trim() : null,
    used_skills_json: nextUsedSkills.length > 0 ? JSON.stringify(nextUsedSkills) : null,
    output_path: options.outputPath ? String(options.outputPath).trim() : null,
    task_key: taskKey,
    source: options.source ? String(options.source).trim() : null,
    workflow_id: options.workflowId ? String(options.workflowId).trim() : null,
    workflow_stage: options.workflowStage ? String(options.workflowStage).trim() : null,
    parent_run_key: options.parentRunKey ? String(options.parentRunKey).trim() : null,
    updated_at: now
  });

  appendRunEvent(db, {
    runKey: String(options.runKey),
    eventType: String(options.eventType || 'update'),
    phase: options.phase || 'run',
    status: nextStatus,
    toolName: options.toolName,
    message: String(options.message || options.summary || 'Run updated'),
    payload: options.payload,
    createdAt: now
  });

  return nextStatus;
}

function getStatusSnapshot(db) {
  const taskSummaryRows = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM tasks
    GROUP BY status
  `).all();

  const taskCounts = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0
  };

  for (const row of taskSummaryRows) {
    if (Object.prototype.hasOwnProperty.call(taskCounts, row.status)) {
      taskCounts[row.status] = Number(row.count || 0);
    }
  }

  const summaryRows = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM agent_runs
    GROUP BY status
  `).all();

  const counts = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0
  };

  for (const row of summaryRows) {
    if (Object.prototype.hasOwnProperty.call(counts, row.status)) {
      counts[row.status] = Number(row.count || 0);
    }
  }

  const activeRuns = db.prepare(`
    SELECT run_key, task_key, agent_name, agent_kind, squad_slug, session_key, source, workflow_id, workflow_stage, parent_run_key, title, status, summary, used_skills_json, output_path, started_at, updated_at
    FROM agent_runs
    WHERE status IN ('queued', 'running')
    ORDER BY updated_at DESC, started_at DESC
  `).all();

  const recentRuns = db.prepare(`
    SELECT run_key, task_key, agent_name, agent_kind, squad_slug, session_key, source, workflow_id, workflow_stage, parent_run_key, title, status, summary, used_skills_json, output_path, started_at, updated_at, finished_at
    FROM agent_runs
    ORDER BY updated_at DESC, started_at DESC
    LIMIT 20
  `).all();

  const activeTasks = db.prepare(`
    SELECT
      task_key, squad_slug, session_key, title, goal, status, created_by, created_at, updated_at,
      (
        SELECT COUNT(*)
        FROM agent_runs
        WHERE agent_runs.task_key = tasks.task_key
      ) AS agent_count,
      (
        SELECT COUNT(*)
        FROM artifacts
        WHERE artifacts.task_key = tasks.task_key
      ) AS artifact_count
    FROM tasks
    WHERE status IN ('queued', 'running')
    ORDER BY updated_at DESC, created_at DESC
  `).all();

  const recentTasks = db.prepare(`
    SELECT
      task_key, squad_slug, session_key, title, goal, status, created_by, created_at, updated_at, finished_at,
      (
        SELECT COUNT(*)
        FROM agent_runs
        WHERE agent_runs.task_key = tasks.task_key
      ) AS agent_count,
      (
        SELECT COUNT(*)
        FROM artifacts
        WHERE artifacts.task_key = tasks.task_key
      ) AS artifact_count
    FROM tasks
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 20
  `).all();

  const recentArtifacts = db.prepare(`
    SELECT id, task_key, run_key, squad_slug, agent_name, kind, title, file_path, created_at
    FROM artifacts
    ORDER BY created_at DESC
    LIMIT 20
  `).all();

  const recentContentItems = db.prepare(`
    SELECT
      content_key, task_key, run_key, squad_slug, session_key, title, content_type, layout_type,
      status, summary, blueprint_slug, used_skills_json, json_path, html_path, created_by_agent, created_at, updated_at
    FROM content_items
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 20
  `).all();

  const recentExecutionEvents = db.prepare(`
    SELECT
      id, task_key, run_key, agent_name, agent_kind, squad_slug, session_key, source,
      workflow_id, workflow_stage, parent_run_key, event_type, phase, status,
      tool_name, message, payload_json, sequence_no, parent_event_id, created_at
    FROM execution_events
    ORDER BY created_at DESC, id DESC
    LIMIT 40
  `).all();

  for (const row of activeRuns) {
    row.used_skills = parseJsonArray(row.used_skills_json);
  }

  for (const row of recentRuns) {
    row.used_skills = parseJsonArray(row.used_skills_json);
  }

  for (const row of recentContentItems) {
    row.used_skills = parseJsonArray(row.used_skills_json);
  }

  return {
    taskCounts,
    counts,
    activeTasks,
    recentTasks,
    activeRuns,
    recentRuns,
    recentArtifacts,
    recentContentItems,
    recentExecutionEvents
  };
}

// ─── Agent Log Session helpers ───────────────────────────────────────────────

function resolveSessionsDir(runtimeDir) {
  return path.join(runtimeDir, SESSIONS_DIR);
}

function resolveSessionFile(runtimeDir, agentName) {
  return path.join(resolveSessionsDir(runtimeDir), `${agentName}.json`);
}

async function readAgentSession(runtimeDir, agentName) {
  const filePath = resolveSessionFile(runtimeDir, agentName);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeAgentSession(runtimeDir, agentName, data) {
  const sessionsDir = resolveSessionsDir(runtimeDir);
  await ensureDir(sessionsDir);
  const filePath = resolveSessionFile(runtimeDir, agentName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function clearAgentSession(runtimeDir, agentName) {
  const filePath = resolveSessionFile(runtimeDir, agentName);
  try { await fs.unlink(filePath); } catch { /* noop */ }
}

/**
 * Core function for `aioson runtime-log`.
 *
 * Squad agents (--squad): state is stored in SQLite, not in session files.
 *   This avoids race conditions when the orquestrador calls runtime-log in
 *   parallel bash commands — SQLite serializes concurrent writes automatically.
 *   Logic: find the most-recent running task for the squad → find or create a
 *   run for this agent → add event. If no running task exists, create one.
 *
 * Official agents (no --squad): state is stored in .sessions/{agent}.json.
 *   Single-process by design, no race condition.
 */
async function logAgentEvent(db, runtimeDir, options) {
  const agentName = String(options.agentName || 'unknown').trim();
  const squadSlug = options.squadSlug ? String(options.squadSlug).trim() : null;
  const isFinish = Boolean(options.finish);
  const now = nowIso();

  let runKey = null;
  let taskKey = null;

  if (squadSlug) {
    // ── Squad agent: look up active task from SQLite ──────────────────────────
    const activeTask = db.prepare(
      `SELECT task_key FROM tasks WHERE squad_slug = ? AND status IN ('running', 'queued') ORDER BY created_at DESC LIMIT 1`
    ).get(squadSlug);

    if (activeTask) {
      taskKey = activeTask.task_key;
    } else {
      // No active task — create one (only the first concurrent call wins; the
      // second will find the task on its next read because SQLite is serialized)
      const taskTitle = options.taskTitle || `${squadSlug} — sessão`;
      taskKey = startTask(db, {
        title: taskTitle,
        squadSlug,
        status: 'running',
        createdBy: agentName
      });
    }

    // Find existing running run for this specific agent under the task
    const activeRun = db.prepare(
      `SELECT run_key FROM agent_runs WHERE task_key = ? AND agent_name = ? AND status = 'running' LIMIT 1`
    ).get(taskKey, agentName);

    if (activeRun) {
      runKey = activeRun.run_key;
      if (!isFinish) {
        appendRunEvent(db, {
          runKey,
          eventType: options.type || 'status',
          phase: options.type || 'run',
          status: 'running',
          message: String(options.message || ''),
          payload: options.meta,
          createdAt: now
        });
      }
    } else {
      // First call for this agent — create a run (and emit start event via startRun)
      // Use taskTitle from --title only if provided, otherwise use agent name
      const runTitle = options.taskTitle || `@${agentName}`;
      runKey = startRun(db, {
        taskKey,
        agentName,
        agentKind: 'squad',
        squadSlug,
        title: runTitle,
        message: options.message || 'Iniciando'
      });
    }
  } else {
    // ── Official agent: session-file based ───────────────────────────────────
    const session = await readAgentSession(runtimeDir, agentName);
    runKey = session && !session.finished ? session.runKey : null;
    taskKey = session && !session.finished ? session.taskKey : null;

    if (!runKey) {
      const taskTitle = options.taskTitle || `@${agentName}`;
      taskKey = startTask(db, {
        title: taskTitle,
        squadSlug: null,
        status: 'running',
        createdBy: agentName
      });
      runKey = startRun(db, {
        taskKey,
        agentName,
        agentKind: 'official',
        squadSlug: null,
        title: taskTitle,
        message: options.message || 'Iniciando'
      });
      await writeAgentSession(runtimeDir, agentName, { runKey, taskKey, startedAt: now, finished: false });
    } else {
      appendRunEvent(db, {
        runKey,
        eventType: options.type || 'status',
        phase: options.type || 'run',
        status: 'running',
        message: String(options.message || ''),
        payload: options.meta,
        createdAt: now
      });
    }
  }

  if (isFinish) {
    const finalStatus = normalizeStatus(options.status, 'completed');
    updateRun(db, {
      runKey,
      status: finalStatus,
      summary: options.summary,
      eventType: finalStatus === 'completed' ? 'finished' : 'failed',
      message: options.message || (finalStatus === 'completed' ? 'Concluído' : 'Falhou')
    });
    // For squad: only finish the task when orquestrador calls --finish
    const isOrquestrador = agentName === 'orquestrador';
    if (taskKey && (!squadSlug || isOrquestrador)) {
      updateTask(db, { taskKey, status: finalStatus });
      if (!squadSlug) await clearAgentSession(runtimeDir, agentName);
    }
  }

  return { runKey, taskKey };
}

module.exports = {
  resolveRuntimePaths,
  runtimeStoreExists,
  openRuntimeDb,
  upsertSquadManifest,
  insertSquadAnalysis,
  startTask,
  updateTask,
  startRun,
  updateRun,
  attachArtifact,
  upsertContentItem,
  getStatusSnapshot,
  createRunKey,
  createTaskKey,
  appendRunEvent,
  logAgentEvent,
  readAgentSession,
  clearAgentSession,
  // Pipeline CRUD
  upsertPipeline,
  addPipelineNode,
  updateNodePosition,
  addPipelineEdge,
  removePipelineEdge,
  getPipelineDAG,
  listPipelines,
  upsertSquadPorts,
  getTopologicalOrder,
  // Artisan CRUD
  createArtisanSquad,
  updateArtisanSquad,
  getArtisanSquad,
  listArtisanSquads,
  deleteArtisanSquad,
  addArtisanMessage,
  getArtisanMessages
};
