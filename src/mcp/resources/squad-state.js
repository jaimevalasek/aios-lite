'use strict';

/**
 * MCP Resources: Squad State — Plan 81, Phase 4.2
 *
 * Exposes squad execution state as MCP resources that can be consumed
 * by MCP Apps (dashboard) and MCP clients.
 *
 * Resources:
 *   aioson://squad/{slug}/state   → STATE.md parsed as JSON
 *   aioson://squad/{slug}/bus     → last 20 bus messages
 *   aioson://squad/{slug}/budget  → token budget status
 *   aioson://squad/{slug}/waves   → execution wave status
 */

const { readState } = require('../../squad/state-manager');
const {
  getDashboardData,
  readBusState,
  readBudgetState,
  readWavesState
} = require('../apps/squad-dashboard/app');

/**
 * MCP resource URI pattern.
 */
const RESOURCE_PATTERNS = [
  { pattern: /^aioson:\/\/squad\/([a-z0-9-]+)\/state$/, handler: 'state' },
  { pattern: /^aioson:\/\/squad\/([a-z0-9-]+)\/bus$/, handler: 'bus' },
  { pattern: /^aioson:\/\/squad\/([a-z0-9-]+)\/budget$/, handler: 'budget' },
  { pattern: /^aioson:\/\/squad\/([a-z0-9-]+)\/waves$/, handler: 'waves' },
  { pattern: /^aioson:\/\/squad\/([a-z0-9-]+)\/dashboard$/, handler: 'dashboard' }
];

/**
 * Resolve an MCP resource URI to its data.
 *
 * @param {string} uri  — MCP resource URI
 * @param {string} projectDir  — Project root
 * @returns {Promise<object|null>}  — Resource data or null if not found
 */
async function resolveResource(uri, projectDir) {
  for (const { pattern, handler } of RESOURCE_PATTERNS) {
    const match = uri.match(pattern);
    if (!match) continue;

    const squadSlug = match[1];

    switch (handler) {
      case 'state':
        return readState(projectDir, squadSlug);

      case 'bus':
        return readBusState(projectDir, squadSlug);

      case 'budget':
        return readBudgetState(projectDir, squadSlug);

      case 'waves':
        return readWavesState(projectDir, squadSlug);

      case 'dashboard':
        return getDashboardData(projectDir, squadSlug);
    }
  }

  return null;
}

/**
 * List available MCP resources for a project.
 *
 * @param {string} projectDir
 * @returns {Promise<object[]>}  — Array of { uri, name, description, mimeType }
 */
async function listResources(projectDir) {
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const squadsDir = path.join(projectDir, '.aioson', 'squads');
  const resources = [];

  try {
    const entries = await fs.readdir(squadsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const slug = entry.name;

      resources.push(
        {
          uri: `aioson://squad/${slug}/state`,
          name: `Squad ${slug} — State`,
          description: `Cross-session state for squad "${slug}"`,
          mimeType: 'application/json'
        },
        {
          uri: `aioson://squad/${slug}/bus`,
          name: `Squad ${slug} — Bus`,
          description: `Recent intra-squad bus messages for "${slug}"`,
          mimeType: 'application/json'
        },
        {
          uri: `aioson://squad/${slug}/budget`,
          name: `Squad ${slug} — Budget`,
          description: `Token budget status for "${slug}"`,
          mimeType: 'application/json'
        },
        {
          uri: `aioson://squad/${slug}/waves`,
          name: `Squad ${slug} — Waves`,
          description: `Execution wave status for "${slug}"`,
          mimeType: 'application/json'
        },
        {
          uri: `aioson://squad/${slug}/dashboard`,
          name: `Squad ${slug} — Dashboard`,
          description: `Complete dashboard data for "${slug}"`,
          mimeType: 'application/json'
        }
      );
    }
  } catch { /* no squads dir */ }

  return resources;
}

module.exports = {
  resolveResource,
  listResources,
  RESOURCE_PATTERNS
};
