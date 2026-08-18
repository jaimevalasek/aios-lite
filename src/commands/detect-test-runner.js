'use strict';

/**
 * aioson detect:test-runner — detect test runner from project files.
 *
 * Checks for phpunit.xml, jest.config.*, vitest.config.*, pytest.ini, .rspec,
 * foundry.toml and package.json scripts. Returns runner name and run command.
 *
 * Usage:
 *   aioson detect:test-runner .
 *   aioson detect:test-runner . --json
 */

const { detectTestRunner } = require('../preflight-engine');
const { resolveTargetDir } = require('../lib/project-root');

const BAR = '━'.repeat(25);

async function runDetectTestRunner({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);

  const runner = await detectTestRunner(targetDir);

  if (!runner) {
    const result = { ok: true, detected: false, runner: null, command: null };
    if (options.json) return result;
    logger.log('');
    logger.log('Test Runner Detection');
    logger.log(BAR);
    logger.log('No test runner detected.');
    logger.log('');
    return result;
  }

  const result = {
    ok: true,
    detected: true,
    runner: runner.name,
    command: runner.command,
    config_file: runner.configFile
  };

  if (options.json) return result;

  logger.log('');
  logger.log('Test Runner Detection');
  logger.log(BAR);
  logger.log(`Found: ${runner.configFile} → ${runner.name}`);
  logger.log(`Command: ${runner.command}`);
  logger.log('');

  return result;
}

module.exports = { runDetectTestRunner };
