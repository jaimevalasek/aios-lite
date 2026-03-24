'use strict';

const http = require('node:http');
const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');
const { loadSquadList, detectPanels, loadSquadData } = require('./api');
const { renderHomePage, renderSquadPage } = require('./renderer');

function parseUrl(reqUrl) {
  const [pathPart, queryPart] = (reqUrl || '/').split('?');
  const segments = pathPart.replace(/\/+$/, '').split('/').filter(Boolean);
  const query = {};
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const [k, v] = pair.split('=');
      if (k) query[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
    }
  }
  return { path: pathPart, segments, query };
}

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

function sendHTML(res, statusCode, html) {
  const body = Buffer.from(html, 'utf8');
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

function createDashboardServer(projectDir, options = {}) {
  const port = options.port || 4180;
  const filterSquad = options.squad || null;

  async function getDb() {
    const handle = await openRuntimeDb(projectDir, { mustExist: true });
    return handle ? handle.db : null;
  }

  const server = http.createServer(async (req, res) => {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { error: 'Method not allowed' });
      return;
    }

    const { segments } = parseUrl(req.url);

    try {
      // GET / — Home page (list all squads)
      if (segments.length === 0) {
        const squads = await loadSquadList(projectDir);
        if (filterSquad) {
          const match = squads.find(s => s.slug === filterSquad);
          if (match) {
            res.writeHead(302, { Location: `/squad/${filterSquad}` });
            res.end();
            return;
          }
        }
        sendHTML(res, 200, renderHomePage(squads));
        return;
      }

      // GET /api/squad/:slug/data.json — JSON API for auto-refresh
      if (segments[0] === 'api' && segments[1] === 'squad' && segments[2] && segments[3] === 'data.json') {
        const slug = segments[2];
        const db = await getDb();
        if (!db) {
          sendJSON(res, 503, { error: 'Runtime database not available' });
          return;
        }
        try {
          const data = loadSquadData(db, slug);
          sendJSON(res, 200, data);
        } finally {
          db.close();
        }
        return;
      }

      // GET /api/squads — JSON list of squads
      if (segments[0] === 'api' && segments[1] === 'squads') {
        const squads = await loadSquadList(projectDir);
        sendJSON(res, 200, { squads });
        return;
      }

      // GET /squad/:slug — Squad detail page
      // GET /squad/:slug/:panel — Squad panel (rendered as tab)
      if (segments[0] === 'squad' && segments[1]) {
        const slug = segments[1];
        const allSquads = await loadSquadList(projectDir);
        const squad = allSquads.find(s => s.slug === slug);
        if (!squad) {
          sendHTML(res, 404, renderHomePage(allSquads));
          return;
        }

        const db = await getDb();
        if (!db) {
          sendHTML(res, 503, '<h1>Runtime database not available</h1><p>Run <code>aioson runtime:init</code> first.</p>');
          return;
        }

        try {
          const panels = detectPanels(squad.manifest);
          const data = loadSquadData(db, slug);
          sendHTML(res, 200, renderSquadPage(squad, panels, data, allSquads));
        } finally {
          db.close();
        }
        return;
      }

      // 404
      sendHTML(res, 404, '<h1>Not found</h1>');
    } catch (err) {
      sendJSON(res, 500, { error: err.message });
    }
  });

  return {
    start() {
      return new Promise((resolve, reject) => {
        server.on('error', reject);
        server.listen(port, '127.0.0.1', () => {
          resolve({ port, url: `http://127.0.0.1:${port}` });
        });
      });
    },
    stop() {
      return new Promise((resolve) => {
        server.close(resolve);
      });
    },
    server
  };
}

module.exports = { createDashboardServer };
