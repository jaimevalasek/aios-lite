'use strict';

/**
 * A2A Client — Plan 81, Phase 3.2
 *
 * HTTP client for sending tasks/events to A2A-compatible agents
 * (including other AIOSON squads in different projects).
 *
 * Implements Google A2A v1.0 JSON-RPC 2.0 protocol.
 */

const http = require('node:http');
const https = require('node:https');
const { randomUUID } = require('node:crypto');

const DEFAULT_TIMEOUT = 30000;

/**
 * Send a JSON-RPC 2.0 request to an A2A endpoint.
 *
 * @param {string} url  — A2A endpoint URL
 * @param {string} method  — JSON-RPC method
 * @param {object} params  — Method parameters
 * @param {object} [options]  — { timeout }
 * @returns {Promise<object>}  — JSON-RPC response
 */
function rpcRequest(url, method, params, options = {}) {
  const { timeout = DEFAULT_TIMEOUT } = options;
  const requestId = randomUUID();

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: requestId,
    method,
    params
  });

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const req = transport.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ error: { code: -32700, message: 'Parse error', data } });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ error: { code: -32000, message: err.message } });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ error: { code: -32000, message: `Request timed out after ${timeout}ms` } });
    });

    req.write(body);
    req.end();
  });
}

/**
 * Discover an A2A agent by fetching its Agent Card.
 *
 * @param {string} baseUrl  — Agent's base URL
 * @returns {Promise<object|null>}  — Agent Card or null
 */
async function discoverAgent(baseUrl) {
  const cardUrl = `${baseUrl.replace(/\/$/, '')}/.well-known/agent.json`;

  return new Promise((resolve) => {
    const parsedUrl = new URL(cardUrl);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const req = transport.get(cardUrl, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Send a task to an A2A agent.
 *
 * @param {string} agentUrl  — Agent's A2A endpoint URL
 * @param {object} task  — { id, title, description, input }
 * @returns {Promise<object>}  — { ok, taskId, result, error }
 */
async function sendTask(agentUrl, task) {
  const taskId = task.id || randomUUID();

  const response = await rpcRequest(agentUrl, 'tasks/send', {
    id: taskId,
    message: {
      role: 'user',
      parts: [
        { type: 'text', text: task.description || task.title }
      ]
    },
    metadata: {
      title: task.title,
      input: task.input || null
    }
  });

  if (response.error) {
    return { ok: false, taskId, error: response.error.message };
  }

  return { ok: true, taskId, result: response.result };
}

/**
 * Publish an event to an A2A peer.
 *
 * @param {string} peerUrl  — Peer's A2A endpoint URL
 * @param {object} event  — { fromSquad, event, payload }
 * @returns {Promise<object>}
 */
async function publishEvent(peerUrl, event) {
  const response = await rpcRequest(peerUrl, 'events/publish', {
    source: event.fromSquad,
    type: event.event,
    data: event.payload || {}
  });

  if (response.error) {
    return { ok: false, error: response.error.message };
  }

  return { ok: true, id: response.result?.id };
}

module.exports = {
  rpcRequest,
  discoverAgent,
  sendTask,
  publishEvent
};
