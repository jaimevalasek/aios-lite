'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SAFE_ENV_KEYS = new Set(['PATH', 'HOME', 'LANG', 'TERM', 'USER', 'SHELL', 'TMPDIR', 'TMP', 'TEMP']);
const DEFAULT_TIMEOUT_MS = 30_000;

function buildSafeEnv(inputJson) {
  const safe = {};
  for (const key of SAFE_ENV_KEYS) {
    if (process.env[key] !== undefined) {
      safe[key] = process.env[key];
    }
  }
  safe.TOOL_INPUT = typeof inputJson === 'string' ? inputJson : JSON.stringify(inputJson ?? {});
  return safe;
}

/**
 * Executa uma dynamic tool de forma segura via subprocess.
 * @param {object} toolDef - Registro da tool (da tabela dynamic_tools)
 * @param {object|string} inputJson - Input para a tool
 * @param {object} opts
 * @param {string} [opts.projectDir] - Diretório do projeto (para resolver caminhos relativos)
 * @param {number} [opts.timeoutMs] - Timeout em ms (default: 30s)
 * @returns {{ ok: boolean, stdout: string, stderr: string, exitCode: number, error?: string }}
 */
function executeTool(toolDef, inputJson, opts = {}) {
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  const projectDir = opts.projectDir || process.cwd();
  const safeEnv = buildSafeEnv(inputJson);

  let result;

  if (toolDef.handler_type === 'shell') {
    if (!toolDef.handler_code) {
      return { ok: false, stdout: '', stderr: '', exitCode: 1, error: 'handler_code is required for shell tools' };
    }
    result = spawnSync('bash', ['-c', toolDef.handler_code], {
      env: safeEnv,
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024
    });
  } else if (toolDef.handler_type === 'script') {
    if (!toolDef.handler_path) {
      return { ok: false, stdout: '', stderr: '', exitCode: 1, error: 'handler_path is required for script tools' };
    }
    const scriptPath = path.isAbsolute(toolDef.handler_path)
      ? toolDef.handler_path
      : path.resolve(projectDir, toolDef.handler_path);

    result = spawnSync('node', ['--env-file=', scriptPath], {
      env: safeEnv,
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      input: safeEnv.TOOL_INPUT
    });

    // Fallback: node sem --env-file= (versões antigas do Node não suportam)
    if (result.error && result.error.code === 'ERR_INVALID_ARG_VALUE') {
      result = spawnSync('node', [scriptPath], {
        env: safeEnv,
        encoding: 'utf8',
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        input: safeEnv.TOOL_INPUT
      });
    }
  } else {
    return { ok: false, stdout: '', stderr: '', exitCode: 1, error: `Unknown handler_type: ${toolDef.handler_type}` };
  }

  const stdout = String(result.stdout || '').trim();
  const stderr = String(result.stderr || '').trim();
  const exitCode = result.status ?? 1;

  if (result.error) {
    const isTimeout = result.error.code === 'ETIMEDOUT' || result.error.killed;
    return {
      ok: false,
      stdout,
      stderr,
      exitCode,
      error: isTimeout ? `Tool timed out after ${timeoutMs}ms` : result.error.message
    };
  }

  return { ok: exitCode === 0, stdout, stderr, exitCode };
}

module.exports = { executeTool, buildSafeEnv };
