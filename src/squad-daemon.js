'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { openRuntimeDb, insertWorkerRun } = require('./runtime-store');
const { listWorkers, runWorker, loadWorkerConfig } = require('./worker-runner');

const SQUADS_DIR = path.join('.aioson', 'squads');

// --- Simple Cron Parser (zero dependencies) ---

const CRON_PRESETS = {
  '@yearly': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@hourly': '0 * * * *',
  '@every5m': '*/5 * * * *',
  '@every10m': '*/10 * * * *',
  '@every15m': '*/15 * * * *',
  '@every30m': '*/30 * * * *'
};

function parseCronField(field, min, max) {
  if (field === '*') return null; // matches all
  const values = new Set();
  for (const part of field.split(',')) {
    const stepMatch = part.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[2], 10);
      let start = min;
      let end = max;
      if (stepMatch[1] !== '*') {
        const range = stepMatch[1].split('-');
        start = parseInt(range[0], 10);
        if (range[1]) end = parseInt(range[1], 10);
      }
      for (let i = start; i <= end; i += step) values.add(i);
    } else if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      for (let i = a; i <= b; i++) values.add(i);
    } else {
      values.add(parseInt(part, 10));
    }
  }
  return values;
}

function parseCronExpression(expr) {
  const resolved = CRON_PRESETS[expr] || expr;
  const parts = resolved.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  return {
    minute: parseCronField(parts[0], 0, 59),
    hour: parseCronField(parts[1], 0, 23),
    dayOfMonth: parseCronField(parts[2], 1, 31),
    month: parseCronField(parts[3], 1, 12),
    dayOfWeek: parseCronField(parts[4], 0, 6)
  };
}

function cronMatches(parsed, date) {
  if (!parsed) return false;
  const checks = [
    [parsed.minute, date.getMinutes()],
    [parsed.hour, date.getHours()],
    [parsed.dayOfMonth, date.getDate()],
    [parsed.month, date.getMonth() + 1],
    [parsed.dayOfWeek, date.getDay()]
  ];
  return checks.every(([field, val]) => field === null || field.has(val));
}

// --- Squad Daemon ---

class SquadDaemon {
  constructor(projectDir, squadSlug, options = {}) {
    this.projectDir = projectDir;
    this.squadSlug = squadSlug;
    this.webhookPort = options.port || 0;
    this.pollInterval = options.poll || 10000;
    this.running = false;
    this.db = null;
    this.httpServer = null;
    this.cronTimer = null;
    this.pollTimer = null;
    this.cronJobs = [];
    this.lastCronCheck = null;
    this.eventLog = [];
    this.startedAt = null;
  }

  log(level, message, data) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      squad: this.squadSlug,
      message,
      ...(data || {})
    };
    this.eventLog.push(entry);
    if (this.eventLog.length > 500) this.eventLog.shift();
    return entry;
  }

  async start() {
    // 1. Open runtime DB
    const handle = await openRuntimeDb(this.projectDir, { mustExist: false });
    if (!handle) {
      throw new Error('Could not open runtime database');
    }
    this.db = handle.db;

    // 2. Load workers and register cron jobs
    const workers = await listWorkers(this.projectDir, this.squadSlug);
    this.cronJobs = [];
    for (const worker of workers) {
      if (worker.type === 'scheduled' && worker.trigger && worker.trigger.cron) {
        const parsed = parseCronExpression(worker.trigger.cron);
        if (parsed) {
          this.cronJobs.push({ workerSlug: worker.slug, cron: worker.trigger.cron, parsed });
        }
      }
    }

    // 3. Start webhook HTTP server
    this.httpServer = await this._startWebhookServer();

    // 4. Start cron check loop (every 60s, checks at minute boundaries)
    this.lastCronCheck = new Date();
    this.cronTimer = setInterval(() => this._checkCron(), 60000);

    // 5. Start event poll loop
    this.pollTimer = setInterval(() => this._pollEvents(), this.pollInterval);

    // 6. Register daemon in SQLite
    this._upsertDaemonRecord('running');

    this.running = true;
    this.startedAt = new Date().toISOString();
    this.log('info', 'Daemon started', {
      port: this.webhookPort,
      cronJobs: this.cronJobs.length,
      workers: workers.length
    });

    return {
      port: this.webhookPort,
      cronJobs: this.cronJobs.length,
      workers: workers.length
    };
  }

  async stop() {
    this.running = false;

    if (this.cronTimer) {
      clearInterval(this.cronTimer);
      this.cronTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.httpServer) {
      await new Promise((resolve) => this.httpServer.close(resolve));
      this.httpServer = null;
    }

    this._upsertDaemonRecord('stopped');

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.log('info', 'Daemon stopped');
  }

  getStatus() {
    return {
      squad: this.squadSlug,
      running: this.running,
      port: this.webhookPort,
      startedAt: this.startedAt,
      cronJobs: this.cronJobs.map(j => ({ worker: j.workerSlug, cron: j.cron })),
      recentLogs: this.eventLog.slice(-20)
    };
  }

  // --- Private methods ---

  _startWebhookServer() {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        await this._handleWebhook(req, res);
      });
      server.on('error', reject);
      server.listen(this.webhookPort, '127.0.0.1', () => {
        this.webhookPort = server.address().port;
        resolve(server);
      });
    });
  }

  async _handleWebhook(req, res) {
    // POST /webhook/:workerSlug
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const segments = (req.url || '').replace(/\/+$/, '').split('/').filter(Boolean);

    // GET /status (special endpoint)
    if (req.method === 'GET' || (segments[0] === 'status' && segments.length === 1)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.getStatus()));
      return;
    }

    if (segments[0] !== 'webhook' || !segments[1]) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found. Use POST /webhook/<worker-slug>' }));
      return;
    }

    const workerSlug = segments[1];

    // Read body
    let body = '';
    for await (const chunk of req) body += chunk;

    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    this.log('info', `Webhook received for ${workerSlug}`, { payload });

    // Execute worker
    const result = await this._executeWorker(workerSlug, payload, 'webhook');

    const statusCode = result.ok ? 200 : 500;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  }

  async _checkCron() {
    if (!this.running || this.cronJobs.length === 0) return;

    const now = new Date();
    for (const job of this.cronJobs) {
      if (cronMatches(job.parsed, now)) {
        this.log('info', `Cron triggered: ${job.workerSlug}`, { cron: job.cron });
        this._executeWorker(job.workerSlug, {}, 'scheduled').catch(err => {
          this.log('error', `Cron execution failed: ${job.workerSlug}`, { error: err.message });
        });
      }
    }
    this.lastCronCheck = now;

    // Update heartbeat
    this._updateHeartbeat();
  }

  async _pollEvents() {
    if (!this.running || !this.db) return;

    // Poll for pending handoffs targeted at this squad
    try {
      const pending = this.db.prepare(
        "SELECT * FROM squad_handoffs WHERE to_squad = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 5"
      ).all(this.squadSlug);

      for (const handoff of pending) {
        const payload = handoff.payload_json ? JSON.parse(handoff.payload_json) : {};
        this.log('info', `Handoff received from ${handoff.from_squad}`, { handoffId: handoff.id });

        // Find event-triggered workers
        const workers = await listWorkers(this.projectDir, this.squadSlug);
        for (const w of workers) {
          if (w.type === 'event' && w.trigger && w.trigger.source === 'handoff') {
            await this._executeWorker(w.slug, payload, 'event');
          }
        }

        // Mark handoff consumed
        this.db.prepare(
          "UPDATE squad_handoffs SET status = 'consumed', consumed_at = datetime('now') WHERE id = ?"
        ).run(handoff.id);
      }
    } catch (err) {
      this.log('error', 'Poll error', { error: err.message });
    }

    this._updateHeartbeat();
  }

  async _executeWorker(workerSlug, inputPayload, triggerType) {
    const result = await runWorker(this.projectDir, this.squadSlug, workerSlug, inputPayload, {
      triggerType,
      noRetry: false
    });

    // Log to runtime store
    if (this.db) {
      try {
        insertWorkerRun(this.db, {
          squadSlug: this.squadSlug,
          workerSlug,
          triggerType,
          inputJson: JSON.stringify(inputPayload),
          outputJson: result.ok ? JSON.stringify(result.output) : null,
          status: result.ok ? 'completed' : 'failed',
          errorMessage: result.ok ? null : result.error,
          durationMs: result.durationMs || 0,
          attempt: result.attempt || 1
        });
      } catch (err) {
        this.log('error', 'Failed to log worker run', { error: err.message });
      }
    }

    this.log(result.ok ? 'info' : 'error', `Worker ${workerSlug}: ${result.ok ? 'completed' : 'failed'}`, {
      triggerType,
      durationMs: result.durationMs
    });

    return result;
  }

  _upsertDaemonRecord(status) {
    if (!this.db) return;
    try {
      this.db.prepare(`
        INSERT INTO squad_daemons (squad_slug, status, pid, port, started_at, last_heartbeat, config_json)
        VALUES (@squad_slug, @status, @pid, @port, @started_at, @last_heartbeat, @config_json)
        ON CONFLICT(squad_slug) DO UPDATE SET
          status = excluded.status,
          pid = excluded.pid,
          port = excluded.port,
          started_at = CASE WHEN excluded.status = 'running' THEN excluded.started_at ELSE squad_daemons.started_at END,
          last_heartbeat = excluded.last_heartbeat,
          config_json = excluded.config_json,
          error_message = NULL
      `).run({
        squad_slug: this.squadSlug,
        status,
        pid: process.pid,
        port: this.webhookPort || null,
        started_at: this.startedAt || new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        config_json: JSON.stringify({
          cronJobs: this.cronJobs.map(j => ({ worker: j.workerSlug, cron: j.cron }))
        })
      });
    } catch {
      // Ignore — daemon record is nice-to-have
    }
  }

  _updateHeartbeat() {
    if (!this.db) return;
    try {
      this.db.prepare(
        "UPDATE squad_daemons SET last_heartbeat = datetime('now') WHERE squad_slug = ?"
      ).run(this.squadSlug);
    } catch {
      // Ignore
    }
  }
}

module.exports = {
  SquadDaemon,
  parseCronExpression,
  cronMatches,
  parseCronField
};
