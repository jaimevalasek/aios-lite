'use strict';

const path = require('node:path');
const { executeInSandbox } = require('../sandbox');

async function runSandboxExec({ args, options, logger }) {
  const command = args[0] || options.command || '';
  const cwd = path.resolve(process.cwd(), options.cwd || '.');
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
