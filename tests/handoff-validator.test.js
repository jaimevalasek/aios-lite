'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { validateHandoffProtocol } = require('../src/handoff-validator');

const projectRoot = path.resolve(__dirname, '..');

test('handoff validator accepts protocol when target capability is declared', async () => {
  const result = await validateHandoffProtocol(projectRoot, {
    to: {
      agent_id: 'qa',
      capability_required: 'verify_feature'
    },
    validation: {
      handoff_contract_ok: true
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('handoff validator warns when target capability is not declared', async () => {
  const result = await validateHandoffProtocol(projectRoot, {
    to: {
      agent_id: 'qa',
      capability_required: 'implement_feature'
    },
    validation: {
      handoff_contract_ok: true
    }
  });

  assert.equal(result.ok, false);
  assert.match(result.errors[0], /does not declare capability/);
});

test('handoff validator flags missing to.agent_id when to object is present', async () => {
  const result = await validateHandoffProtocol(projectRoot, {
    to: {
      capability_required: 'verify_feature'
    },
    validation: {
      handoff_contract_ok: true
    }
  });

  assert.equal(result.ok, false);
  assert.match(result.errors[0], /Missing to\.agent_id/);
});

test('handoff validator flags handoff_contract_ok: false as error', async () => {
  const result = await validateHandoffProtocol(projectRoot, {
    to: {
      agent_id: 'qa',
      capability_required: 'verify_feature'
    },
    validation: {
      handoff_contract_ok: false
    }
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /contract validation failed/i);
});
