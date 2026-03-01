'use strict';

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

function printHelp(t) {
  console.log(`${t('cli.title')}\n`);
  console.log(t('cli.usage'));
  console.log(`  ${t('cli.help_init')}`);
  console.log(`  ${t('cli.help_install')}`);
  console.log(`  ${t('cli.help_update')}`);
  console.log(`  ${t('cli.help_info')}`);
  console.log(`  ${t('cli.help_doctor')}`);
  console.log(`  ${t('cli.help_i18n_add')}`);
  console.log(`  ${t('cli.help_agents')}`);
  console.log(`  ${t('cli.help_agent_prompt')}`);
  console.log(`  ${t('cli.help_context_validate')}`);
  console.log(`  ${t('cli.help_setup_context')}`);
}

async function main() {
  const { command, args, options } = parseArgv(process.argv);
  const locale = normalizeLocale(options.locale || process.env.AIOS_LITE_LOCALE || 'en');
  const { t } = createTranslator(locale);
  const logger = console;

  if (command === 'help' || options.help || command === '--help' || command === '-h') {
    printHelp(t);
    return;
  }

  if (command === '--version' || command === '-v' || command === 'version' || options.version) {
    await runInfo({ args: ['.'], options: {}, logger, t });
    return;
  }

  try {
    if (command === 'init') {
      await runInit({ args, options, logger, t });
      return;
    }
    if (command === 'install') {
      await runInstall({ args, options, logger, t });
      return;
    }
    if (command === 'update') {
      await runUpdate({ args, options, logger, t });
      return;
    }
    if (command === 'info') {
      await runInfo({ args, options, logger, t });
      return;
    }
    if (command === 'doctor') {
      await runDoctorCommand({ args, options, logger, t });
      return;
    }
    if (command === 'i18n:add' || command === 'i18n-add') {
      await runI18nAdd({ args, options, logger, t });
      return;
    }
    if (command === 'agents') {
      await runAgentsList({ args, options, logger, t });
      return;
    }
    if (command === 'agent:prompt' || command === 'agent-prompt') {
      await runAgentPrompt({ args, options, logger, t });
      return;
    }
    if (command === 'context:validate' || command === 'context-validate') {
      await runContextValidate({ args, options, logger, t });
      return;
    }
    if (command === 'setup:context' || command === 'setup-context') {
      await runSetupContext({ args, options, logger, t });
      return;
    }

    logger.error(`${t('cli.unknown_command', { command })}\n`);
    printHelp(t);
    process.exitCode = 1;
  } catch (error) {
    logger.error(t('cli.error_prefix', { message: error.message }));
    process.exitCode = 1;
  }
}

main();
