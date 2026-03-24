'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  getSquadOverview,
  getRecentContent,
  getLearnings,
  getRecentDeliveries,
  getRecentEvents,
  getSquadMetrics
} = require('./metrics');

const SQUADS_DIR = path.join('.aioson', 'squads');

async function loadSquadList(projectDir) {
  const squadsDir = path.join(projectDir, SQUADS_DIR);
  let entries;
  try {
    entries = await fs.readdir(squadsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const squads = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(squadsDir, entry.name, 'squad.manifest.json');
    try {
      const raw = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);
      squads.push({
        slug: entry.name,
        name: manifest.name || entry.name,
        mode: manifest.mode || 'mixed',
        goal: manifest.goal || '',
        status: manifest.status || 'active',
        executorCount: (manifest.executors || []).length,
        manifest
      });
    } catch {
      squads.push({
        slug: entry.name,
        name: entry.name,
        mode: 'unknown',
        goal: '',
        status: 'unknown',
        executorCount: 0,
        manifest: null
      });
    }
  }
  return squads;
}

function detectPanels(manifest) {
  const panels = ['overview', 'content', 'learnings', 'logs'];

  if (manifest) {
    if (manifest.mode === 'content') panels.push('content-preview');
    if (manifest.mode === 'software') panels.push('tasks');

    const hasWebhooks = manifest.outputStrategy &&
      manifest.outputStrategy.delivery &&
      Array.isArray(manifest.outputStrategy.delivery.webhooks) &&
      manifest.outputStrategy.delivery.webhooks.length > 0;
    const hasMcps = Array.isArray(manifest.mcps) && manifest.mcps.length > 0;
    if (hasWebhooks || hasMcps) panels.push('integrations');

    const channelMcps = (manifest.mcps || []).filter(function (m) {
      return ['whatsapp', 'telegram', 'sms', 'voice'].some(function (ch) {
        return (m.slug || '').includes(ch);
      });
    });
    if (channelMcps.length > 0) panels.push('channels');
  }

  panels.push('metrics');
  return panels;
}

function loadSquadData(db, squadSlug) {
  const overview = getSquadOverview(db, squadSlug);
  const content = getRecentContent(db, squadSlug);
  const learnings = getLearnings(db, squadSlug);
  const deliveries = getRecentDeliveries(db, squadSlug);
  const events = getRecentEvents(db, squadSlug);
  const customMetrics = getSquadMetrics(db, squadSlug);

  return {
    overview,
    content,
    learnings,
    deliveries,
    events,
    customMetrics,
    pipelineInfo: overview.pipelineInfo,
    metrics: {
      content_items: overview.contentItems,
      sessions: overview.sessions,
      learnings: overview.learnings,
      delivery_rate: overview.deliveryRate
    }
  };
}

module.exports = {
  loadSquadList,
  detectPanels,
  loadSquadData
};
