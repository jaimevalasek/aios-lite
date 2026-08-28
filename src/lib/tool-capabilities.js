'use strict';

// Single host registry for the AI CLIs AIOSON can spawn.
//
// One entry per CLI feeds three consumers, so there is exactly one list to
// keep in sync when a host is added or a flag changes:
//   - `aioson live:start` (interactive/PTY): `--resume[=last|<id>]` and
//     `--permission-mode=yolo` map to the right argv through this table.
//   - `aioson tool:capabilities`: exposes the map as JSON to UI clients
//     (e.g. AIOSON Play) so they never duplicate the lookup.
//   - `src/agent-execution/capabilities.js`: derives the per-host EXECUTION
//     capability matrix (non-interactive external processes dispatched by the
//     agent-execution manifest and probed by `aioson host:signature`) from the
//     `execution` block. A host without an `execution` block is known to the
//     interactive surface but is NOT dispatchable and cannot be signed until a
//     non-interactive adapter exists under src/agent-execution/adapters/.
//
// Each CLI persists conversation history in its own per-cwd location, so
// "continue last conversation" is achieved by passing the right resume flag at
// spawn time — AIOSON never has to track an internal session ID.
//
// Keep entries minimal and source-of-truth here. Adding a new CLI = one entry
// (+ one adapter when it should be dispatchable).
const TOOL_CAPS = {
  claude: {
    install_command: 'npm install -g @anthropic-ai/claude-code',
    binary: 'claude',
    supports_resume: true,
    resume_last: ['--continue'],
    supports_session_id: true,
    resume_session_id: ['--resume', '<id>'],
    supports_session_picker: true,
    session_picker: ['--resume'],
    supports_yolo: true,
    yolo_args: ['--dangerously-skip-permissions'],
    execution: {
      additional_workspaces: true,
      model_catalog: false,
      reasoning_effort: true,
    },
  },
  codex: {
    install_command: 'npm install -g @openai/codex',
    binary: 'codex',
    supports_resume: true,
    resume_last: ['resume', '--last'],
    supports_session_id: true,
    resume_session_id: ['resume', '<id>'],
    supports_session_picker: true,
    session_picker: ['resume'],
    supports_yolo: true,
    yolo_args: ['--dangerously-bypass-approvals-and-sandbox'],
    execution: {
      additional_workspaces: true,
      model_catalog: true,
      reasoning_effort: true,
    },
  },
  opencode: {
    install_command: 'npm install -g opencode-ai',
    binary: 'opencode',
    supports_resume: true,
    resume_last: ['--continue'],
    supports_session_id: true,
    resume_session_id: ['--session', '<id>'],
    supports_session_picker: false,
    session_picker: null,
    supports_yolo: false,
    yolo_args: null,
    execution: {
      additional_workspaces: false,
      model_catalog: false,
      reasoning_effort: false,
    },
  },
  kimi: {
    install_command: 'npm install -g @moonshot-ai/kimi-code',
    binary: 'kimi',
    supports_resume: false,
    resume_last: null,
    supports_session_id: false,
    resume_session_id: null,
    supports_session_picker: false,
    session_picker: null,
    // Kimi Code distinguishes `--yolo` (may still ask) from `--auto` (fully
    // unattended); unattended is what a permission-mode=yolo caller means.
    supports_yolo: true,
    yolo_args: ['--auto'],
    execution: {
      additional_workspaces: true,
      model_catalog: false,
      reasoning_effort: false,
    },
  },
  qwen: {
    install_command: 'npm install -g @qwen-code/qwen-code',
    binary: 'qwen',
    supports_resume: false,
    resume_last: null,
    supports_session_id: false,
    resume_session_id: null,
    supports_session_picker: false,
    session_picker: null,
    supports_yolo: true,
    yolo_args: ['--yolo'],
    execution: {
      additional_workspaces: false,
      model_catalog: false,
      reasoning_effort: false,
    },
  },
  grok: {
    install_command: 'npm install -g @xai-official/grok',
    binary: 'grok',
    supports_resume: false,
    resume_last: null,
    supports_session_id: false,
    resume_session_id: null,
    supports_session_picker: false,
    session_picker: null,
    supports_yolo: true,
    yolo_args: ['--yolo'],
    // No verified non-interactive contract yet: interactive only, not
    // dispatchable, not signable.
    execution: null,
  },
};

function getToolCapabilities(tool) {
  const key = String(tool || '').trim().toLowerCase();
  if (!key) return null;
  return TOOL_CAPS[key] || null;
}

function listSupportedTools() {
  return Object.keys(TOOL_CAPS).sort();
}

// Hosts that can run as non-interactive external processes (agent-execution
// dispatch + host:signature). Interactive-only entries are excluded.
function listExecutionHosts() {
  return Object.keys(TOOL_CAPS).filter((tool) => Boolean(TOOL_CAPS[tool].execution)).sort();
}

function getExecutionCapabilities(tool) {
  const caps = getToolCapabilities(tool);
  if (!caps || !caps.execution) return null;
  return { binary: caps.binary, install_command: caps.install_command, ...caps.execution };
}

// Resolve the argv prefix to add to the CLI spawn so it resumes a conversation.
// `resumeOpt` accepted shapes:
//   - true            → resume last
//   - 'last' / 'true' → resume last
//   - '' / undefined / null / false → no resume
//   - any other string → treat as session id
// Returns [] when the tool doesn't support resume or resumeOpt is falsy.
function resolveResumeArgs(tool, resumeOpt) {
  if (resumeOpt === undefined || resumeOpt === null || resumeOpt === '' || resumeOpt === false) {
    return [];
  }
  const caps = getToolCapabilities(tool);
  if (!caps || !caps.supports_resume) return [];

  const wantsLast =
    resumeOpt === true ||
    resumeOpt === 'last' ||
    String(resumeOpt).toLowerCase() === 'true';

  if (wantsLast) {
    return Array.isArray(caps.resume_last) ? [...caps.resume_last] : [];
  }

  if (caps.supports_session_id && Array.isArray(caps.resume_session_id)) {
    return caps.resume_session_id.map((part) => (part === '<id>' ? String(resumeOpt) : part));
  }

  return Array.isArray(caps.resume_last) ? [...caps.resume_last] : [];
}

function resolvePermissionModeArgs(tool, permissionMode) {
  const mode = String(permissionMode || '').trim().toLowerCase();
  if (!mode || mode === 'default') return [];
  if (mode !== 'yolo') {
    throw new Error(`permission_mode_unknown:${permissionMode}`);
  }

  const caps = getToolCapabilities(tool);
  if (!caps) {
    throw new Error(`tool_unknown:${tool}`);
  }
  if (!caps.supports_yolo || !Array.isArray(caps.yolo_args)) {
    throw new Error(`permission_mode_unsupported:${tool}:yolo`);
  }
  return [...caps.yolo_args];
}

module.exports = {
  TOOL_CAPS,
  getToolCapabilities,
  getExecutionCapabilities,
  listSupportedTools,
  listExecutionHosts,
  resolveResumeArgs,
  resolvePermissionModeArgs,
};
