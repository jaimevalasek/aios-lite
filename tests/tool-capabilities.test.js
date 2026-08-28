'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getToolCapabilities,
  resolvePermissionModeArgs,
} = require('../src/lib/tool-capabilities');

test('tool capabilities expose yolo support only for mapped CLIs', () => {
  assert.deepEqual(getToolCapabilities('claude').yolo_args, ['--dangerously-skip-permissions']);
  assert.deepEqual(getToolCapabilities('codex').yolo_args, ['--dangerously-bypass-approvals-and-sandbox']);
  assert.equal(getToolCapabilities('opencode').supports_yolo, false);
  assert.equal(getToolCapabilities('gemini'), null);
});

test('resolvePermissionModeArgs maps default and yolo modes', () => {
  assert.deepEqual(resolvePermissionModeArgs('claude', undefined), []);
  assert.deepEqual(resolvePermissionModeArgs('claude', 'default'), []);
  assert.deepEqual(resolvePermissionModeArgs('claude', 'yolo'), ['--dangerously-skip-permissions']);
  assert.deepEqual(resolvePermissionModeArgs('codex', 'yolo'), ['--dangerously-bypass-approvals-and-sandbox']);
});

test('resolvePermissionModeArgs rejects unknown and unsupported modes', () => {
  assert.throws(() => resolvePermissionModeArgs('claude', 'turbo'), /permission_mode_unknown:turbo/);
  assert.throws(() => resolvePermissionModeArgs('opencode', 'yolo'), /permission_mode_unsupported:opencode:yolo/);
});

test('the registry is the single host list: kimi, qwen and grok are known with install commands and unattended flags', () => {
  const { TOOL_CAPS, listSupportedTools, listExecutionHosts, getExecutionCapabilities } = require('../src/lib/tool-capabilities');
  assert.deepEqual(listSupportedTools(), ['claude', 'codex', 'grok', 'kimi', 'opencode', 'qwen']);
  assert.equal(TOOL_CAPS.kimi.install_command, 'npm install -g @moonshot-ai/kimi-code');
  assert.equal(TOOL_CAPS.qwen.install_command, 'npm install -g @qwen-code/qwen-code');
  assert.equal(TOOL_CAPS.grok.install_command, 'npm install -g @xai-official/grok');
  // Mirrors the unattended flags the live surface already uses per CLI.
  assert.deepEqual(resolvePermissionModeArgs('kimi', 'yolo'), ['--auto']);
  assert.deepEqual(resolvePermissionModeArgs('qwen', 'yolo'), ['--yolo']);
  assert.deepEqual(resolvePermissionModeArgs('grok', 'yolo'), ['--yolo']);
  // No resume contract is claimed for hosts whose resume flags are unverified.
  for (const tool of ['kimi', 'qwen', 'grok']) assert.equal(getToolCapabilities(tool).supports_resume, false);
});

test('execution capabilities live in the registry and interactive-only hosts are not dispatchable', () => {
  const { listExecutionHosts, getExecutionCapabilities } = require('../src/lib/tool-capabilities');
  assert.deepEqual(listExecutionHosts(), ['claude', 'codex', 'kimi', 'opencode', 'qwen']);
  assert.deepEqual(getExecutionCapabilities('codex'), {
    binary: 'codex',
    install_command: 'npm install -g @openai/codex',
    additional_workspaces: true,
    model_catalog: true,
    reasoning_effort: true,
  });
  assert.equal(getExecutionCapabilities('claude').reasoning_effort, true);
  assert.equal(getExecutionCapabilities('grok'), null);
  assert.equal(getExecutionCapabilities('gemini'), null);
});

test('every existing tool:capabilities field survives for the Play contract', () => {
  const { TOOL_CAPS } = require('../src/lib/tool-capabilities');
  const required = ['install_command', 'binary', 'supports_resume', 'resume_last', 'supports_session_id',
    'resume_session_id', 'supports_session_picker', 'session_picker', 'supports_yolo', 'yolo_args'];
  for (const [tool, caps] of Object.entries(TOOL_CAPS)) {
    for (const key of required) assert.ok(Object.hasOwn(caps, key), `${tool}.${key}`);
  }
});
