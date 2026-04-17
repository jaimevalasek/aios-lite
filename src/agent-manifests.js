'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { exists } = require('./utils');

const MANIFESTS_RELATIVE_DIR = '.aioson/agents';

async function readAgentManifest(targetDir, agentId) {
  const safeAgentId = String(agentId || '').trim().toLowerCase();
  if (!safeAgentId) return null;

  const manifestPath = path.join(targetDir, MANIFESTS_RELATIVE_DIR, `${safeAgentId}.manifest.json`);
  if (!(await exists(manifestPath))) return null;

  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function resolveAgentCapabilities(targetDir, agentId) {
  const manifest = await readAgentManifest(targetDir, agentId);
  return Array.isArray(manifest && manifest.capabilities) ? manifest.capabilities : [];
}

function supportsTool(manifest, tool) {
  if (!manifest || !Array.isArray(manifest.supported_tools) || manifest.supported_tools.length === 0) {
    return true;
  }
  const safeTool = String(tool || 'codex').trim().toLowerCase();
  return manifest.supported_tools.map((item) => String(item).trim().toLowerCase()).includes(safeTool);
}

function canAgentPerform(manifest, capabilityId) {
  if (!manifest || !Array.isArray(manifest.capabilities)) return false;
  return manifest.capabilities.some((capability) => capability.id === capabilityId);
}

function buildAgentCapabilitySummary(manifest, tool) {
  if (!manifest || !Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
    return '';
  }

  const listed = manifest.capabilities
    .slice(0, 4)
    .map((capability) => `${capability.id} (${capability.category})`)
    .join(', ');

  const supportNote = supportsTool(manifest, tool)
    ? ''
    : ` Current tool "${String(tool || 'codex').toLowerCase()}" is not declared in the manifest.`;

  return `Declared capabilities: ${listed}.${supportNote}`;
}

module.exports = {
  MANIFESTS_RELATIVE_DIR,
  readAgentManifest,
  resolveAgentCapabilities,
  supportsTool,
  canAgentPerform,
  buildAgentCapabilitySummary
};
