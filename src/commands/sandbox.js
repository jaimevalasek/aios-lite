'use strict';

const { executeInSandbox } = require('../sandbox');
const { resolveTargetDir } = require('../lib/project-root');

async function runSandboxExec({ args, options, logger }) {
  const command = args[0] || options.command || '';
  const cwd = resolveTargetDir(options.cwd);
  const timeout = Number(options.timeout) || 30_000;
  const intent = options.intent || undefined;

  if (!command) {
    logger.error('Usage: aioson sandbox:exec "<command>" [--timeout=30000] [--cwd=.]');
    return { ok: false, error: 'missing_command' };
  }

  const result = await executeInSandbox(command, { cwd, timeout, intent });

  if (options.json) {
    return { ok: result.ok, ...result };
  }

  if (result.stdout) {
    logger.log(result.stdout);
  }
  if (result.stderr) {
    logger.error(result.stderr);
  }

  if (result.timedOut) {
    logger.error(`Command timed out after ${timeout}ms`);
  }

  return { ok: result.ok, ...result };
}

module.exports = { runSandboxExec };
