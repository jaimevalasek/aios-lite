'use strict';

/**
 * A2A Server — Plan 81, Phase 3.2
 *
 * Micro HTTP server that exposes squad capabilities via A2A protocol.
 * Receives tasks from external A2A agents and routes them to local squads.
 *
 * Endpoints:
 *   POST /a2a/{squad-slug}         — JSON-RPC 2.0 task handler
 *   GET  /.well-known/agent.json   — Agent Card discovery
 *   GET  /a2a/{squad-slug}/status  — Squad status
 */

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const SQUADS_DIR = path.join('.aioson', 'squads');

/**
 * Create an A2A server for a project.
 *
 * @param {string} projectDir
 * @param {object} [options]  — { port, host }
 * @returns {{ server, start, stop }}
 */
function createA2AServer(projectDir, options = {}) {
  const { port = 3847, host = '127.0.0.1' } = options;
  const pendingTasks = new Map();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Agent Card discovery
    if (req.method === 'GET' && url.pathname === '/.well-known/agent.json') {
      return handleAgentCardDiscovery(projectDir, res);
    }

    // Squad status
    const statusMatch = url.pathname.match(/^\/a2a\/([a-z0-9-]+)\/status$/);
    if (req.method === 'GET' && statusMatch) {
      return handleSquadStatus(projectDir, statusMatch[1], res);
    }

    // A2A JSON-RPC endpoint
    const a2aMatch = url.pathname.match(/^\/a2a\/([a-z0-9-]+)$/);
    if (req.method === 'POST' && a2aMatch) {
      return handleJsonRpc(projectDir, a2aMatch[1], req, res, pendingTasks);
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  return {
    server,
    start() {
      return new Promise((resolve) => {
        server.listen(port, host, () => resolve({ port, host }));
      });
    },
    stop() {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
    pendingTasks
  };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleAgentCardDiscovery(projectDir, res) {
  // Return a composite card for all squads
  const squadsDir = path.join(projectDir, SQUADS_DIR);
  const cards = [];

  try {
    const entries = await fs.readdir(squadsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(squadsDir, entry.name, 'squad.manifest.json');
      try {
        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
        cards.push({
          slug: entry.name,
          name: manifest.name || entry.name,
          description: manifest.mission || manifest.goal || ''
        });
      } catch { /* no valid manifest */ }
    }
  } catch { /* no squads dir */ }

  const compositeCard = {
    name: 'AIOSON Project',
    description: `AIOSON project with ${cards.length} squad(s)`,
    version: '1.0.0',
    squads: cards,
    capabilities: {
      streaming: false,
      pushNotifications: false
    }
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(compositeCard, null, 2));
}

async function handleSquadStatus(projectDir, squadSlug, res) {
  const statePath = path.join(projectDir, SQUADS_DIR, squadSlug, 'STATE.md');

  try {
    const content = await fs.readFile(statePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/markdown' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Squad "${squadSlug}" not found` }));
  }
}

async function handleJsonRpc(projectDir, squadSlug, req, res, pendingTasks) {
  let body = '';
  for await (const chunk of req) body += chunk;

  let rpc;
  try {
    rpc = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error' },
      id: null
    }));
    return;
  }

  const { method, params, id } = rpc;

  if (method === 'tasks/send') {
    const taskId = params?.id || randomUUID();
    pendingTasks.set(taskId, {
      id: taskId,
      squadSlug,
      params,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        id: taskId,
        status: { state: 'submitted' },
        message: `Task queued for squad "${squadSlug}"`
      },
      id
    }));
    return;
  }

  if (method === 'tasks/get') {
    const task = pendingTasks.get(params?.id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      result: task || { error: 'Task not found' },
      id
    }));
    return;
  }

  if (method === 'events/publish') {
    // Route to local inter-squad-events
    try {
      const { publish } = require('../squad/inter-squad-events');
      const eventId = await publish(projectDir, {
        fromSquad: params?.source || 'a2a-external',
        event: params?.type || 'a2a.event',
        payload: params?.data
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        result: { id: eventId, status: 'published' },
        id
      }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: err.message },
        id
      }));
    }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    jsonrpc: '2.0',
    error: { code: -32601, message: `Method not found: ${method}` },
    id
  }));
}

module.exports = { createA2AServer };
