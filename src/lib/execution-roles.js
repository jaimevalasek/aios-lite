'use strict';

/**
 * `.aioson/config/execution-roles.json` — the unlock file of the orchestrated
 * execution path (compiled lanes running as parallel external processes with a
 * host/model per role).
 *
 * It is written by the supervising desktop client after it validated each
 * host/model pair with `aioson host:signature`; the framework never writes it
 * and never ships it in `template/`. Absent, disabled or invalid → the
 * orchestrated option does not exist and the single-DEV route is untouched.
 *
 * Roles are snake_case keys: `{lane}_dev` (required per lane), `{lane}_qa`
 * (optional override of the shared `qa` reviewer), `qa` (lane-level reviewer,
 * required) and `integration_dev` (optional model for the integration pass).
 *
 * The optional `execution` block is the client seam: `spawner` names the
 * command the engine hands each unit envelope to (the node becomes a process
 * — a terminal — the supervising client owns; the engine keeps waiting for the
 * bound report), `unit_timeout_ms` the per-unit budget when humans watch.
 * The environment variable `AIOSON_EXECUTION_SPAWNER` wins over the file: it
 * is the hint of the client that owns the session's PTY.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { REASONING_EFFORTS, MAX_MODEL_NAME_LENGTH, MAX_DEVELOPMENT_LANES } = require('../agent-execution/schema');
const { listExecutionHosts, getExecutionCapabilities } = require('./tool-capabilities');
const { readSignatures, findSignature, signatureState } = require('./host-signature');

const EXECUTION_ROLES_RELATIVE_PATH = '.aioson/config/execution-roles.json';
const EXECUTION_ROLES_VERSION = 1;
const ROLE_KEY = /^[a-z][a-z0-9_]*$/;
const ROOT_KEYS = ['version', 'source', 'enabled', 'roles', 'parallel', 'on_unavailable', 'execution'];
const EXECUTION_KEYS = ['spawner', 'unit_timeout_ms', 'require_independent_qa'];
const SPAWNER_KEYS = ['command', 'args'];
const MAX_SPAWNER_ARGS = 16;
const MAX_SPAWNER_TOKEN_LENGTH = 200;
const MIN_UNIT_TIMEOUT_MS = 60000;
const MAX_UNIT_TIMEOUT_MS = 4 * 60 * 60 * 1000;
const DEFAULT_SPAWNER_UNIT_TIMEOUT_MS = 30 * 60 * 1000;
const SPAWNER_ENV = 'AIOSON_EXECUTION_SPAWNER';
const ROLE_KEYS = ['host', 'model', 'reasoning_effort'];
const ON_UNAVAILABLE = ['ask', 'fallback', 'pause'];
const DEFAULT_ON_UNAVAILABLE = 'ask';
const DEFAULT_MAX_CONCURRENT_LANES = 2;
const SECRET_KEY = /token|secret|password|authorization|api[_-]?key/i;

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function executionRolesPath(projectDir) {
  return path.join(projectDir, ...EXECUTION_ROLES_RELATIVE_PATH.split('/'));
}

/** `backend` → `backend_dev`, `mobile-app` → `mobile_app_qa`. */
function laneRoleKey(lane, kind) {
  return `${String(lane || '').toLowerCase().replace(/-/g, '_')}_${kind}`;
}

function validateExecutionRoles(value, { hosts = listExecutionHosts() } = {}) {
  const errors = [];
  const add = (errorPath, message) => errors.push({ path: errorPath, message });
  if (!isPlainObject(value)) return { ok: false, errors: [{ path: '$', message: 'must be an object' }] };

  for (const key of Object.keys(value)) {
    if (!ROOT_KEYS.includes(key)) {
      add(`$.${key}`, SECRET_KEY.test(key) ? 'secret fields are forbidden; use environment configuration' : 'unknown field');
    }
  }
  if (value.version !== EXECUTION_ROLES_VERSION) add('$.version', `must equal ${EXECUTION_ROLES_VERSION}`);
  if (value.source !== undefined && (typeof value.source !== 'string' || !value.source.trim())) {
    add('$.source', 'must be a non-empty string');
  }
  if (typeof value.enabled !== 'boolean') add('$.enabled', 'must be boolean');

  if (!isPlainObject(value.roles)) {
    add('$.roles', 'must be an object');
  } else {
    if (Object.keys(value.roles).length === 0) add('$.roles', 'must declare at least one role');
    for (const [key, role] of Object.entries(value.roles)) {
      const base = `$.roles.${key}`;
      if (!ROLE_KEY.test(key)) add(base, 'role key must be snake_case');
      if (!isPlainObject(role)) {
        add(base, 'must be {host, model, reasoning_effort?}');
        continue;
      }
      for (const field of Object.keys(role)) {
        if (!ROLE_KEYS.includes(field)) {
          add(`${base}.${field}`, SECRET_KEY.test(field) ? 'secret fields are forbidden; use environment configuration' : 'unknown field');
        }
      }
      const caps = hosts.includes(role.host) ? getExecutionCapabilities(role.host) : null;
      if (!caps) add(`${base}.host`, `must be one of ${hosts.join(', ')}`);
      if (typeof role.model !== 'string' || !role.model.trim()) {
        add(`${base}.model`, 'must be a non-empty model id');
      } else if (role.model.length > MAX_MODEL_NAME_LENGTH) {
        add(`${base}.model`, `must be at most ${MAX_MODEL_NAME_LENGTH} characters`);
      }
      if (role.reasoning_effort !== undefined && role.reasoning_effort !== null) {
        if (!REASONING_EFFORTS.includes(role.reasoning_effort)) {
          add(`${base}.reasoning_effort`, `must be one of ${REASONING_EFFORTS.join(', ')} or null`);
        } else if (caps && !caps.reasoning_effort) {
          add(`${base}.reasoning_effort`, `effort_unsupported_by_host: ${role.host} does not accept a reasoning effort`);
        }
      }
    }
  }

  if (value.execution !== undefined) {
    if (!isPlainObject(value.execution)) {
      add('$.execution', 'must be an object');
    } else {
      for (const key of Object.keys(value.execution)) {
        if (!EXECUTION_KEYS.includes(key)) add(`$.execution.${key}`, SECRET_KEY.test(key) ? 'secret fields are forbidden; use environment configuration' : 'unknown field');
      }
      const spawner = value.execution.spawner;
      if (spawner !== undefined && spawner !== null) {
        if (!isPlainObject(spawner)) {
          add('$.execution.spawner', 'must be {command, args?}');
        } else {
          for (const key of Object.keys(spawner)) {
            if (!SPAWNER_KEYS.includes(key)) add(`$.execution.spawner.${key}`, SECRET_KEY.test(key) ? 'secret fields are forbidden; use environment configuration' : 'unknown field');
          }
          if (typeof spawner.command !== 'string' || !spawner.command.trim() || spawner.command.length > MAX_SPAWNER_TOKEN_LENGTH) {
            add('$.execution.spawner.command', `must be a non-empty command of at most ${MAX_SPAWNER_TOKEN_LENGTH} characters`);
          }
          if (spawner.args !== undefined && (!Array.isArray(spawner.args) || spawner.args.length > MAX_SPAWNER_ARGS || spawner.args.some((arg) => typeof arg !== 'string' || arg.length > MAX_SPAWNER_TOKEN_LENGTH))) {
            add('$.execution.spawner.args', `must be an array of at most ${MAX_SPAWNER_ARGS} strings`);
          }
        }
      }
      const unitTimeout = value.execution.unit_timeout_ms;
      if (unitTimeout !== undefined && unitTimeout !== null && (!Number.isInteger(unitTimeout) || unitTimeout < MIN_UNIT_TIMEOUT_MS || unitTimeout > MAX_UNIT_TIMEOUT_MS)) {
        add('$.execution.unit_timeout_ms', `must be an integer between ${MIN_UNIT_TIMEOUT_MS} and ${MAX_UNIT_TIMEOUT_MS}`);
      }
      const independent = value.execution.require_independent_qa;
      if (independent !== undefined && independent !== null && typeof independent !== 'boolean') {
        add('$.execution.require_independent_qa', 'must be a boolean');
      }
    }
  }
  if (value.parallel !== undefined) {
    if (!isPlainObject(value.parallel)) {
      add('$.parallel', 'must be an object');
    } else {
      for (const key of Object.keys(value.parallel)) {
        if (key !== 'max_concurrent_lanes') add(`$.parallel.${key}`, 'unknown field');
      }
      const max = value.parallel.max_concurrent_lanes;
      if (max !== undefined && (!Number.isInteger(max) || max < 1 || max > MAX_DEVELOPMENT_LANES)) {
        add('$.parallel.max_concurrent_lanes', `must be an integer between 1 and ${MAX_DEVELOPMENT_LANES}`);
      }
    }
  }
  if (value.on_unavailable !== undefined && !ON_UNAVAILABLE.includes(value.on_unavailable)) {
    add('$.on_unavailable', `must be one of ${ON_UNAVAILABLE.join(', ')}`);
  }
  return { ok: errors.length === 0, errors };
}

function normalizeExecutionRoles(value) {
  const roles = {};
  for (const [key, role] of Object.entries(value.roles)) {
    roles[key] = {
      host: role.host,
      model: role.model.trim(),
      reasoning_effort: role.reasoning_effort || null
    };
  }
  return {
    version: value.version,
    source: value.source || null,
    enabled: value.enabled,
    roles,
    parallel: {
      max_concurrent_lanes: value.parallel?.max_concurrent_lanes || DEFAULT_MAX_CONCURRENT_LANES
    },
    on_unavailable: value.on_unavailable || DEFAULT_ON_UNAVAILABLE,
    execution: normalizeExecutionBlock(value.execution)
  };
}

// `require_independent_qa`: the lane reviewer must not be the implementer's
// host/model — the judge differs from the producer. Off by default: the
// compile warns (`self_review_same_model`); on, the same condition refuses the
// plan. A client that proves two hosts on the machine turns it on.
function normalizeExecutionBlock(value) {
  if (!isPlainObject(value)) return { spawner: null, unit_timeout_ms: null, require_independent_qa: false };
  const spawner = isPlainObject(value.spawner) && typeof value.spawner.command === 'string' && value.spawner.command.trim()
    ? { command: value.spawner.command.trim(), args: Array.isArray(value.spawner.args) ? value.spawner.args.map(String) : [] }
    : null;
  return {
    spawner,
    unit_timeout_ms: Number.isInteger(value.unit_timeout_ms) ? value.unit_timeout_ms : null,
    require_independent_qa: value.require_independent_qa === true
  };
}

/** `"C:\\Program Files\\cockpit\\cockpitctl.exe" unit spawn` → {command, args}; double quotes group a token. */
function parseSpawnerCommand(text) {
  const tokens = [];
  let current = '';
  let quoted = false;
  let started = false;
  for (const char of String(text || '')) {
    if (char === '"') {
      quoted = !quoted;
      started = true;
      continue;
    }
    if (!quoted && /\s/.test(char)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
      continue;
    }
    current += char;
    started = true;
  }
  if (started) tokens.push(current);
  if (tokens.length === 0 || !tokens[0]) return null;
  return { command: tokens[0], args: tokens.slice(1) };
}

/**
 * The spawner in force: the environment (the client that owns the session's
 * PTY) wins over the roles file (the project default). `null` = the engine
 * spawns the host processes itself.
 */
function resolveSpawner({ roles = null, env = process.env } = {}) {
  const fromEnv = parseSpawnerCommand(env[SPAWNER_ENV]);
  if (fromEnv) return { ...fromEnv, source: 'env' };
  const fromRoles = roles?.execution?.spawner || null;
  if (fromRoles) return { command: fromRoles.command, args: [...(fromRoles.args || [])], source: 'roles' };
  return null;
}

/**
 * Read + validate the unlock file. Never throws.
 * `reason`: roles_file_missing | roles_unreadable | roles_invalid | roles_disabled | null
 */
async function readExecutionRoles(projectDir, { hosts } = {}) {
  const file = executionRolesPath(projectDir);
  const relative = EXECUTION_ROLES_RELATIVE_PATH;
  let raw;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { present: false, ok: false, enabled: false, path: relative, reason: 'roles_file_missing', errors: [], roles: null, digest: null };
    }
    return { present: true, ok: false, enabled: false, path: relative, reason: 'roles_unreadable', errors: [{ path: '$', message: error.message }], roles: null, digest: null };
  }
  const digest = sha256(raw);
  let value;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    return { present: true, ok: false, enabled: false, path: relative, reason: 'roles_invalid', errors: [{ path: '$', message: `invalid JSON: ${error.message}` }], roles: null, digest };
  }
  const validation = validateExecutionRoles(value, { hosts });
  if (!validation.ok) {
    return { present: true, ok: false, enabled: false, path: relative, reason: 'roles_invalid', errors: validation.errors, roles: null, digest };
  }
  const roles = normalizeExecutionRoles(value);
  if (!roles.enabled) {
    return { present: true, ok: true, enabled: false, path: relative, reason: 'roles_disabled', errors: [], roles, digest };
  }
  return { present: true, ok: true, enabled: true, path: relative, reason: null, errors: [], roles, digest };
}

/** `{lane}_dev` is required per lane; `{lane}_qa` overrides the shared `qa`. */
function resolveLaneRoles(roles, lane) {
  const devKey = laneRoleKey(lane, 'dev');
  const qaKey = laneRoleKey(lane, 'qa');
  const dev = roles.roles[devKey] ? { role: devKey, ...roles.roles[devKey] } : null;
  const qa = roles.roles[qaKey]
    ? { role: qaKey, inherited: false, ...roles.roles[qaKey] }
    : (roles.roles.qa ? { role: 'qa', inherited: true, ...roles.roles.qa } : null);
  return { dev, qa };
}

function signatureHint(role) {
  return `aioson host:signature . --host=${role.host} --model=${role.model}${role.reasoning_effort ? ` --effort=${role.reasoning_effort}` : ''}`;
}

/** Signature state of every declared role on this machine. */
async function checkRoleSignatures(roles, { env = process.env, now = Date.now() } = {}) {
  const store = await readSignatures({ env });
  const report = {};
  const missing = [];
  for (const [key, role] of Object.entries(roles.roles)) {
    const entry = findSignature(store, { host: role.host, model: role.model, reasoning_effort: role.reasoning_effort });
    const state = signatureState(entry, now);
    report[key] = {
      host: role.host,
      model: role.model,
      reasoning_effort: role.reasoning_effort,
      state,
      checked_at: entry?.checked_at || null,
      expires_at: entry?.expires_at || null,
      reason: entry?.reason || null,
      hint: state === 'valid' ? null : signatureHint(role)
    };
    if (state !== 'valid') missing.push({ role: key, ...report[key] });
  }
  return { path: store.path, roles: report, missing, ok: missing.length === 0 };
}

/**
 * The offer: is the orchestrated path available in this project on this
 * machine right now? Requires the unlock file (present, valid, enabled) and a
 * valid, unexpired signature for every declared role.
 */
async function offerExecution(projectDir, { env = process.env, now = Date.now(), hosts } = {}) {
  const roles = await readExecutionRoles(projectDir, { hosts });
  const base = {
    available: false,
    roles_path: roles.path,
    roles_digest: roles.digest,
    inside_play: Boolean(env.AIOSON_PLAY),
    roles: roles.roles,
    errors: roles.errors
  };
  if (!roles.present || !roles.ok) return { ...base, reason: roles.reason };
  if (!roles.enabled) return { ...base, reason: 'roles_disabled' };
  const signatures = await checkRoleSignatures(roles.roles, { env, now });
  if (!signatures.ok) {
    return { ...base, reason: `signature_${signatures.missing[0].state}`, signatures, missing: signatures.missing };
  }
  return { ...base, available: true, reason: 'ok', signatures, missing: [] };
}

module.exports = {
  DEFAULT_MAX_CONCURRENT_LANES,
  DEFAULT_ON_UNAVAILABLE,
  DEFAULT_SPAWNER_UNIT_TIMEOUT_MS,
  SPAWNER_ENV,
  parseSpawnerCommand,
  resolveSpawner,
  EXECUTION_ROLES_RELATIVE_PATH,
  EXECUTION_ROLES_VERSION,
  ON_UNAVAILABLE,
  checkRoleSignatures,
  executionRolesPath,
  laneRoleKey,
  offerExecution,
  readExecutionRoles,
  resolveLaneRoles,
  signatureHint,
  validateExecutionRoles
};
