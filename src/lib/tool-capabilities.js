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
//
// POLICY — every harness the framework launches for implementation or
// orchestration runs unattended: `live:start` defaults to `--permission-mode
// yolo`, every lane worker and direct dispatch runs `workspace-write` as the
// host's unattended flag, the runner appends it. A permission prompt inside
// an orchestrated run is the run not happening (the owner's rule after one
// lane spent a night asking). So every registered host declares its
// unattended flag (`yolo_args`); a host with none can still be used
// interactively but never dispatched. Adding a harness = one entry here with
// that flag (+ one adapter when it should be dispatchable).
//
// Sandbox translation lives here too — `read_only_args` for a read-only
// researcher, `yolo_args` for a lane worker — and the adapters consume it
// through `resolveSandboxArgs` (adapters/base.js) instead of carrying their
// own conditionals: one adapter that translated `workspace-write` on its own
// (`--sandbox workspace-write`, the provider's sandboxed write) left a lane
// worker asking for permission all night while the registry already declared
// the unattended flag. A lane worker runs unattended, always: the provider
// sandbox was measured and never ran unattended here (Codex's Windows sandbox
// setup fails to load; under `--sandbox workspace-write` the model answered
// DONE after 96 s without writing the file — under the unattended flag it
// wrote in 14 s). A host with `null` for a mode cannot honor it and is
// refused at build, never silently run with more (or less) power than the
// contract says.
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
    read_only_args: ['--permission-mode', 'plan'],
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
    // Never `--sandbox workspace-write` for a lane worker: measured on the
    // operator's machine, the Windows sandbox setup fails to load and the
    // model reports DONE without writing (see the header note).
    read_only_args: ['--sandbox', 'read-only'],
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
    // `opencode run --auto`: "auto-approve permissions that are not explicitly
    // denied" — the unattended contract a lane worker needs (verified from
    // the installed CLI's own help). No read-only flag: a read-only request is
    // refused at build (sandbox_mode_unsupported), never ignored.
    supports_yolo: true,
    yolo_args: ['--auto'],
    read_only_args: null,
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
    read_only_args: ['--plan'],
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
    read_only_args: ['--approval-mode', 'plan', '--sandbox', '--safe-mode'],
    execution: {
      additional_workspaces: false,
      model_catalog: false,
      reasoning_effort: false,
    },
  },
  grok: {
    install_command: 'npm install -g @xai-official/grok',
    binary: 'grok',
    supports_resume: true,
    resume_last: ['--continue'],
    supports_session_id: false,
    resume_session_id: null,
    supports_session_picker: false,
    session_picker: null,
    // `--always-approve`: "Auto-approve all tool executions" (the installed
    // CLI's help; the older `--yolo` is not a flag of this build). Headless
    // is `-p/--single <prompt>` with `-m` and `--reasoning-effort`
    // (adapters/grok.js); proven dispatchable by a real signature probe.
    supports_yolo: true,
    yolo_args: ['--always-approve'],
    read_only_args: ['--permission-mode', 'plan'],
    execution: {
      additional_workspaces: false,
      model_catalog: false,
      reasoning_effort: true,
    },
  },
  // Declared by the desktop client for its sessions; flags as the client maps
  // them, non-interactive contract unverified — interactive only.
  muse: {
    install_command: null,
    binary: 'muse',
    supports_resume: false,
    resume_last: null,
    supports_session_id: false,
    resume_session_id: null,
    supports_session_picker: false,
    session_picker: null,
    // `--yolo` = `--disable-approval --disable-sandbox --trust-workspace`.
    supports_yolo: true,
    yolo_args: ['--yolo'],
    read_only_args: null,
    execution: null,
  },
  agy: {
    install_command: null,
    binary: 'agy',
    supports_resume: true,
    resume_last: ['--continue'],
    supports_session_id: false,
    resume_session_id: null,
    supports_session_picker: false,
    session_picker: null,
    // Antigravity denies a tool that would need approval silently unless
    // pre-approved or released by this flag.
    supports_yolo: true,
    yolo_args: ['--dangerously-skip-permissions'],
    read_only_args: null,
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

// The permission mode a launched session gets when the caller names none:
// unattended. A caller that wants prompts says `--permission-mode=default`.
const DEFAULT_SESSION_PERMISSION_MODE = 'yolo';

/**
 * `yolo` args for a session that named no mode: the host's unattended flag
 * when it registers one; `[]` (the host's own default, which prompts) with
 * `warning` when it does not — an interactive session with a human at the
 * terminal can still run there, a lane worker cannot (see resolveSandboxArgs).
 */
function resolveDefaultSessionPermission(tool) {
  const caps = getToolCapabilities(tool);
  if (caps && caps.supports_yolo && Array.isArray(caps.yolo_args)) {
    return { mode: DEFAULT_SESSION_PERMISSION_MODE, args: [...caps.yolo_args], warning: null };
  }
  return { mode: 'default', args: [], warning: `${String(tool || '').trim().toLowerCase() || 'this host'} registers no unattended flag — the session will ask for permissions; declare its flag in the host registry (yolo_args) to run it unattended` };
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

// The sandbox modes an execution caller may ask for. `read-only` is the
// researcher's (`read_only_args`); `workspace-write` is the lane worker's and
// always means unattended (`yolo_args`) — the provider sandboxes were
// measured and never ran unattended (see the header note).
const SANDBOX_MODES = ['read-only', 'workspace-write'];
const LANE_WORKER_MODE = 'yolo';

/**
 * The argv a host needs for a sandbox mode — the ONE translation every adapter
 * consumes (adapters/base.js), so no adapter can diverge from the registry.
 * Never throws: `{ok: true, args}` or `{ok: false, reason, ...}` with
 * `sandbox_mode_unknown | sandbox_mode_unsupported | permission_mode_unsupported`
 * — the caller refuses the dispatch instead of running the host with a
 * different power than the contract says.
 */
function resolveSandboxArgs(tool, sandboxMode) {
  const host = String(tool || '').trim().toLowerCase();
  const sandbox = sandboxMode === undefined || sandboxMode === null || sandboxMode === '' ? null : String(sandboxMode).trim().toLowerCase();
  if (sandbox === null) return { ok: true, args: [], sandbox_mode: null };
  if (!SANDBOX_MODES.includes(sandbox)) return { ok: false, reason: 'sandbox_mode_unknown', sandbox_mode: sandbox, host };
  const caps = getToolCapabilities(host);
  if (sandbox === 'read-only') {
    if (!caps || !Array.isArray(caps.read_only_args)) {
      return { ok: false, reason: 'sandbox_mode_unsupported', sandbox_mode: sandbox, host, message: `${host || 'this host'} has no read-only mode registered` };
    }
    return { ok: true, args: [...caps.read_only_args], sandbox_mode: sandbox };
  }
  if (!caps || !caps.supports_yolo || !Array.isArray(caps.yolo_args)) {
    return { ok: false, reason: 'permission_mode_unsupported', sandbox_mode: sandbox, permission_mode: LANE_WORKER_MODE, host, message: `${host || 'this host'} has no unattended write flag registered` };
  }
  return { ok: true, args: [...caps.yolo_args], sandbox_mode: sandbox, permission_mode: LANE_WORKER_MODE };
}

module.exports = {
  TOOL_CAPS,
  SANDBOX_MODES,
  LANE_WORKER_MODE,
  DEFAULT_SESSION_PERMISSION_MODE,
  resolveDefaultSessionPermission,
  getToolCapabilities,
  getExecutionCapabilities,
  listSupportedTools,
  listExecutionHosts,
  resolveResumeArgs,
  resolvePermissionModeArgs,
  resolveSandboxArgs,
};
