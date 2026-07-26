'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { readAgentManifest, canAgentPerform } = require('./agent-manifests');

const CANONICAL_COMPLETION_AGENTS = new Set(['product', 'sheldon', 'planner', 'dev', 'qa']);

async function artifactExists(targetDir, relativePath) {
  const absolute = path.resolve(targetDir, String(relativePath || ''));
  const relative = path.relative(targetDir, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return false;
  try {
    const stat = await fs.stat(absolute);
    return stat.isFile() || stat.isDirectory();
  } catch {
    return false;
  }
}

async function validateHandoffProtocol(targetDir, protocol) {
  const errors = [];
  if (!protocol || typeof protocol !== 'object') {
    return { ok: false, errors: ['Missing handoff protocol payload'] };
  }

  const toAgentId = protocol.to && protocol.to.agent_id ? String(protocol.to.agent_id).trim() : '';
  const requiredCapability = protocol.to && protocol.to.capability_required
    ? String(protocol.to.capability_required).trim()
    : '';

  if (protocol.to && typeof protocol.to === 'object' && !toAgentId && requiredCapability) {
    errors.push('Missing to.agent_id in handoff protocol');
  }

  if (toAgentId) {
    const toManifest = await readAgentManifest(targetDir, toAgentId);
    if (!toManifest) {
      errors.push(`Agent ${toAgentId} has no capability manifest`);
    } else if (requiredCapability && !canAgentPerform(toManifest, requiredCapability)) {
      errors.push(`Agent ${toAgentId} does not declare capability ${requiredCapability}`);
    }
  }

  const validation = protocol.validation && typeof protocol.validation === 'object'
    ? protocol.validation
    : {};

  const fromAgentId = protocol.from && protocol.from.agent_id
    ? String(protocol.from.agent_id).trim().replace(/^@/, '').toLowerCase()
    : '';
  const completedCanonicalFeatureStage = protocol.workflow_mode === 'feature'
    && CANONICAL_COMPLETION_AGENTS.has(fromAgentId);

  if (completedCanonicalFeatureStage && validation.handoff_contract_ok !== true) {
    errors.push('Handoff contract validation was not positively verified');
  } else if (validation.handoff_contract_ok === false) {
    errors.push('Handoff contract validation failed');
  }

  if (completedCanonicalFeatureStage && validation.technical_gate_ok !== true) {
    errors.push('Technical gate was not positively verified');
  } else if (validation.technical_gate_ok === false) {
    errors.push('Technical gate validation failed');
  }

  if (completedCanonicalFeatureStage) {
    const artifacts = Array.isArray(protocol.artifact_uris) ? protocol.artifact_uris : [];
    if (artifacts.length === 0) {
      errors.push('Completed feature handoff must include at least one artifact or evidence URI');
    } else {
      for (const item of artifacts) {
        const artifactPath = item && typeof item === 'object' ? item.path : item;
        if (!(await artifactExists(targetDir, artifactPath))) {
          errors.push(`Handoff artifact does not exist inside the project: ${artifactPath || '(missing path)'}`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

module.exports = {
  validateHandoffProtocol
};
