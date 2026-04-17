'use strict';

const { readAgentManifest, canAgentPerform } = require('./agent-manifests');

async function validateHandoffProtocol(targetDir, protocol) {
  const errors = [];
  if (!protocol || typeof protocol !== 'object') {
    return { ok: false, errors: ['Missing handoff protocol payload'] };
  }

  const toAgentId = protocol.to && protocol.to.agent_id ? String(protocol.to.agent_id).trim() : '';
  const requiredCapability = protocol.to && protocol.to.capability_required
    ? String(protocol.to.capability_required).trim()
    : '';

  if (protocol.to && typeof protocol.to === 'object' && !toAgentId) {
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

  if (validation.handoff_contract_ok === false) {
    errors.push('Handoff contract validation failed');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

module.exports = {
  validateHandoffProtocol
};
