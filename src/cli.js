'use strict';

const fs = require('node:fs');
const { parseArgv } = require('./parser');
const { createTranslator, normalizeLocale } = require('./i18n');
const { runInit } = require('./commands/init');
const { runInstall } = require('./commands/install');
const { runUpdate } = require('./commands/update');
const { runInfo } = require('./commands/info');
const { runDoctorCommand } = require('./commands/doctor');
const { runI18nAdd } = require('./commands/i18n-add');
const { runAgentsList, runAgentPrompt } = require('./commands/agents');
const { runContextValidate } = require('./commands/context-validate');
const { runSetupContext } = require('./commands/setup-context');
const { runLocaleApply } = require('./commands/locale-apply');
const { runSmokeTest } = require('./commands/smoke');
const { runMcpInit } = require('./commands/mcp-init');

const JSON_SUPPORTED_COMMANDS = new Set([
  'info',
  'doctor',
  'context:validate',
  'context-validate',
  'test:smoke',
  'test-smoke',
  'mcp:init',
  'mcp-init',
  'version',
  '--version',
  '-v'
]);

function toText(value) {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : String(value);
}

function createLogger() {
  return {
    log(value = '') {
      fs.writeSync(1, `${toText(value)}\n`);
    },
    error(value = '') {
      fs.writeSync(2, `${toText(value)}\n`);
    }
  };
}

function printHelp(t, logger) {
  logger.log(`${t('cli.title')}\n`);
  logger.log(t('cli.usage'));
  logger.log(`  ${t('cli.help_init')}`);
  logger.log(`  ${t('cli.help_install')}`);
  logger.log(`  ${t('cli.help_update')}`);
  logger.log(`  ${t('cli.help_info')}`);
  logger.log(`  ${t('cli.help_doctor')}`);
  logger.log(`  ${t('cli.help_i18n_add')}`);
  logger.log(`  ${t('cli.help_agents')}`);
  logger.log(`  ${t('cli.help_agent_prompt')}`);
  logger.log(`  ${t('cli.help_context_validate')}`);
  logger.log(`  ${t('cli.help_setup_context')}`);
  logger.log(`  ${t('cli.help_locale_apply')}`);
  logger.log(`  ${t('cli.help_test_smoke')}`);
  logger.log(`  ${t('cli.help_mcp_init')}`);
}

function commandSupportsJson(command) {
  return JSON_SUPPORTED_COMMANDS.has(command);
}

function writeJson(payload) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  fs.writeSync(1, text);
}

async function main() {
  const { command, args, options } = parseArgv(process.argv);
  const locale = normalizeLocale(options.locale || process.env.AIOS_LITE_LOCALE || 'en');
  const jsonMode = Boolean(options.json);
  const { t } = createTranslator(locale);
  const logger = createLogger();

  if (command === 'help' || options.help || command === '--help' || command === '-h') {
    printHelp(t, logger);
    return;
  }

  if (command === '--version' || command === '-v' || command === 'version' || options.version) {
    const result = await runInfo({ args: ['.'], options, logger, t });
    if (jsonMode) {
      writeJson(result);
    }
    return;
  }

  try {
    let result = null;

    if (command === 'init') {
      result = await runInit({ args, options, logger, t });
    } else if (command === 'install') {
      result = await runInstall({ args, options, logger, t });
    } else if (command === 'update') {
      result = await runUpdate({ args, options, logger, t });
    } else if (command === 'info') {
      result = await runInfo({ args, options, logger, t });
    } else if (command === 'doctor') {
      result = await runDoctorCommand({ args, options, logger, t });
    } else if (command === 'i18n:add' || command === 'i18n-add') {
      result = await runI18nAdd({ args, options, logger, t });
    } else if (command === 'agents') {
      result = await runAgentsList({ args, options, logger, t });
    } else if (command === 'agent:prompt' || command === 'agent-prompt') {
      result = await runAgentPrompt({ args, options, logger, t });
    } else if (command === 'context:validate' || command === 'context-validate') {
      result = await runContextValidate({ args, options, logger, t });
    } else if (command === 'setup:context' || command === 'setup-context') {
      result = await runSetupContext({ args, options, logger, t });
    } else if (command === 'locale:apply' || command === 'locale-apply') {
      result = await runLocaleApply({ args, options, logger, t });
    } else if (command === 'test:smoke' || command === 'test-smoke') {
      result = await runSmokeTest({ args, options, logger, t });
    } else if (command === 'mcp:init' || command === 'mcp-init') {
      result = await runMcpInit({ args, options, logger, t });
    } else {
      const message = t('cli.unknown_command', { command });
      if (jsonMode) {
        writeJson({
          ok: false,
          error: {
            code: 'unknown_command',
            message,
            command
          }
        });
      } else {
        logger.error(`${message}\n`);
        printHelp(t, logger);
      }
      process.exitCode = 1;
      return;
    }

    if (jsonMode && commandSupportsJson(command)) {
      writeJson(result || { ok: true });
      if (result && Object.prototype.hasOwnProperty.call(result, 'ok') && !result.ok) {
        process.exitCode = 1;
      }
    }
  } catch (error) {
    if (jsonMode) {
      writeJson({
        ok: false,
        error: {
          code: 'command_error',
          message: error.message,
          command
        }
      });
    } else {
      logger.error(t('cli.error_prefix', { message: error.message }));
    }
    process.exitCode = 1;
  }
}

main();
