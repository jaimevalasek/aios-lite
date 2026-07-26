'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
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

test('completed feature handoff requires positive gates and existing in-project evidence', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-handoff-validator-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const reportPath = path.join(root, '.aioson/context/qa-report-demo.md');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, '# QA\n', 'utf8');

  const valid = await validateHandoffProtocol(root, {
    workflow_mode: 'feature',
    from: { agent_id: 'qa' },
    to: { agent_id: null, capability_required: null },
    artifact_uris: [{ path: '.aioson/context/qa-report-demo.md', kind: 'qa_report' }],
    validation: {
      handoff_contract_ok: true,
      technical_gate_ok: true
    }
  });
  assert.equal(valid.ok, true, valid.errors.join('\n'));

  const unverified = await validateHandoffProtocol(root, {
    workflow_mode: 'feature',
    from: { agent_id: 'qa' },
    to: { agent_id: null, capability_required: null },
    artifact_uris: [],
    validation: {}
  });
  assert.equal(unverified.ok, false);
  assert.match(unverified.errors.join(' '), /positively verified/i);
  assert.match(unverified.errors.join(' '), /artifact or evidence URI/i);
});
