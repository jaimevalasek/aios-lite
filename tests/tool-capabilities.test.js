'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getToolCapabilities,
  resolvePermissionModeArgs,
} = require('../src/lib/tool-capabilities');

test('tool capabilities expose an unattended flag for every registered CLI — a harness the framework launches never asks for permission', () => {
  const { TOOL_CAPS } = require('../src/lib/tool-capabilities');
  assert.deepEqual(getToolCapabilities('claude').yolo_args, ['--dangerously-skip-permissions']);
  assert.deepEqual(getToolCapabilities('codex').yolo_args, ['--dangerously-bypass-approvals-and-sandbox']);
  assert.deepEqual(getToolCapabilities('opencode').yolo_args, ['--auto'], 'opencode run --auto: auto-approve permissions not explicitly denied');
  assert.deepEqual(getToolCapabilities('grok').yolo_args, ['--always-approve'], 'the installed Grok build has --always-approve, not --yolo');
  for (const [tool, caps] of Object.entries(TOOL_CAPS)) {
    assert.equal(caps.supports_yolo, true, `${tool} must register its unattended flag`);
    assert.ok(Array.isArray(caps.yolo_args) && caps.yolo_args.length > 0, `${tool}.yolo_args`);
  }
  assert.equal(getToolCapabilities('gemini'), null);
});

test('resolvePermissionModeArgs maps default and yolo modes', () => {
  assert.deepEqual(resolvePermissionModeArgs('claude', undefined), []);
  assert.deepEqual(resolvePermissionModeArgs('claude', 'default'), []);
  assert.deepEqual(resolvePermissionModeArgs('claude', 'yolo'), ['--dangerously-skip-permissions']);
  assert.deepEqual(resolvePermissionModeArgs('codex', 'yolo'), ['--dangerously-bypass-approvals-and-sandbox']);
});

test('resolvePermissionModeArgs rejects unknown modes and unknown tools; a session that names no mode defaults to the unattended flag', () => {
  const { resolveDefaultSessionPermission, DEFAULT_SESSION_PERMISSION_MODE } = require('../src/lib/tool-capabilities');
  assert.throws(() => resolvePermissionModeArgs('claude', 'turbo'), /permission_mode_unknown:turbo/);
  assert.throws(() => resolvePermissionModeArgs('gemini', 'yolo'), /tool_unknown:gemini/);
  assert.equal(DEFAULT_SESSION_PERMISSION_MODE, 'yolo');
  assert.deepEqual(resolveDefaultSessionPermission('opencode'), { mode: 'yolo', args: ['--auto'], warning: null });
  const unknown = resolveDefaultSessionPermission('gemini');
  assert.equal(unknown.mode, 'default');
  assert.deepEqual(unknown.args, []);
  assert.match(unknown.warning, /registers no unattended flag/);
});

test('the registry is the single host list: kimi, qwen, grok, muse and agy are known with unattended flags', () => {
  const { TOOL_CAPS, listSupportedTools, listExecutionHosts, getExecutionCapabilities } = require('../src/lib/tool-capabilities');
  assert.deepEqual(listSupportedTools(), ['agy', 'claude', 'codex', 'grok', 'kimi', 'muse', 'opencode', 'qwen']);
  assert.equal(TOOL_CAPS.kimi.install_command, 'npm install -g @moonshot-ai/kimi-code');
  assert.equal(TOOL_CAPS.qwen.install_command, 'npm install -g @qwen-code/qwen-code');
  assert.equal(TOOL_CAPS.grok.install_command, 'npm install -g @xai-official/grok');
  // Mirrors the unattended flags the live surface already uses per CLI.
  assert.deepEqual(resolvePermissionModeArgs('kimi', 'yolo'), ['--auto']);
  assert.deepEqual(resolvePermissionModeArgs('qwen', 'yolo'), ['--yolo']);
  assert.deepEqual(resolvePermissionModeArgs('grok', 'yolo'), ['--always-approve']);
  assert.deepEqual(resolvePermissionModeArgs('muse', 'yolo'), ['--yolo']);
  assert.deepEqual(resolvePermissionModeArgs('agy', 'yolo'), ['--dangerously-skip-permissions']);
  // No resume contract is claimed for hosts whose resume flags are unverified.
  for (const tool of ['kimi', 'qwen', 'muse']) assert.equal(getToolCapabilities(tool).supports_resume, false);
  // Interactive-only entries stay off the dispatch list until an adapter proves their contract.
  for (const tool of ['muse', 'agy']) assert.equal(getExecutionCapabilities(tool), null);
});

test('execution capabilities live in the registry and interactive-only hosts are not dispatchable', () => {
  const { listExecutionHosts, getExecutionCapabilities } = require('../src/lib/tool-capabilities');
  assert.deepEqual(listExecutionHosts(), ['claude', 'codex', 'grok', 'kimi', 'opencode', 'qwen']);
  assert.deepEqual(getExecutionCapabilities('codex'), {
    binary: 'codex',
    install_command: 'npm install -g @openai/codex',
    additional_workspaces: true,
    model_catalog: true,
    reasoning_effort: true,
  });
  assert.equal(getExecutionCapabilities('claude').reasoning_effort, true);
  assert.equal(getExecutionCapabilities('muse'), null);
  assert.deepEqual(getExecutionCapabilities('grok'), { binary: 'grok', install_command: 'npm install -g @xai-official/grok', additional_workspaces: false, model_catalog: false, reasoning_effort: true });
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
