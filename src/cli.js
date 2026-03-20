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
const { runContextPack } = require('./commands/context-pack');
const { runSetupContext } = require('./commands/setup-context');
const { runLocaleApply } = require('./commands/locale-apply');
const { runSmokeTest } = require('./commands/smoke');
const { runMcpInit } = require('./commands/mcp-init');
const { runMcpDoctor } = require('./commands/mcp-doctor');
const { runPackageTest } = require('./commands/package-e2e');
const { runWorkflowPlan } = require('./commands/workflow-plan');
const { runWorkflowNext } = require('./commands/workflow-next');
const { runParallelInit } = require('./commands/parallel-init');
const { runParallelDoctor } = require('./commands/parallel-doctor');
const { runParallelAssign } = require('./commands/parallel-assign');
const { runParallelStatus } = require('./commands/parallel-status');
const { runTestAgents } = require('./commands/test-agents');
const { runLocaleDiff } = require('./commands/locale-diff');
const { runQaDoctor } = require('./commands/qa-doctor');
const { runQaInit } = require('./commands/qa-init');
const { runQaRun } = require('./commands/qa-run');
const { runQaScan } = require('./commands/qa-scan');
const { runQaReport } = require('./commands/qa-report');
const { runScanProject } = require('./commands/scan-project');
const { runConfig } = require('./commands/config');
const { runGenomeDoctor } = require('./commands/genome-doctor');
const { runGenomeMigrate } = require('./commands/genome-migrate');
const { runSquadStatus } = require('./commands/squad-status');
const { runSquadDoctor } = require('./commands/squad-doctor');
const { runSquadRepairGenomes } = require('./commands/squad-repair-genomes');
const { runSquadValidate } = require('./commands/squad-validate');
const { runSquadExport } = require('./commands/squad-export');
const { runSquadPipeline } = require('./commands/squad-pipeline');
const {
  runRuntimeInit,
  runRuntimeIngest,
  runRuntimeTaskStart,
  runRuntimeStart,
  runRuntimeUpdate,
  runRuntimeTaskFinish,
  runRuntimeFinish,
  runRuntimeTaskFail,
  runRuntimeFail,
  runRuntimeStatus,
  runRuntimeLog,
  runDeliver,
  runOutputStrategyExport,
  runOutputStrategyImport,
  runDevlogSync,
  runRuntimePrune
} = require('./commands/runtime');
const {
  runCloudImportSquad,
  runCloudImportGenome,
  runCloudPublishGenome,
  runCloudPublishSquad
} = require('./commands/cloud');

const JSON_SUPPORTED_COMMANDS = new Set([
  'init',
  'install',
  'update',
  'i18n:add',
  'i18n-add',
  'agents',
  'agent:prompt',
  'agent-prompt',
  'setup:context',
  'setup-context',
  'locale:apply',
  'locale-apply',
  'info',
  'doctor',
  'context:validate',
  'context-validate',
  'context:pack',
  'context-pack',
  'test:smoke',
  'test-smoke',
  'test:agents',
  'test-agents',
  'locale:diff',
  'locale-diff',
  'test:package',
  'test-package',
  'workflow:plan',
  'workflow-plan',
  'workflow:next',
  'workflow-next',
  'agent:next',
  'agent-next',
  'parallel:init',
  'parallel-init',
  'parallel:doctor',
  'parallel-doctor',
  'parallel:assign',
  'parallel-assign',
  'parallel:status',
  'parallel-status',
  'orchestrator:init',
  'orchestrator-init',
  'orchestrator:doctor',
  'orchestrator-doctor',
  'orchestrator:assign',
  'orchestrator-assign',
  'orchestrator:status',
  'orchestrator-status',
  'mcp:init',
  'mcp-init',
  'mcp:doctor',
  'mcp-doctor',
  'qa:doctor',
  'qa-doctor',
  'qa:init',
  'qa-init',
  'qa:run',
  'qa-run',
  'qa:scan',
  'qa-scan',
  'qa:report',
  'qa-report',
  'scan:project',
  'scan-project',
  'config',
  'genome:doctor',
  'genome-doctor',
  'genome:migrate',
  'genome-migrate',
  'squad:status',
  'squad-status',
  'squad:doctor',
  'squad-doctor',
  'squad:repair-genomes',
  'squad-repair-genomes',
  'squad:validate',
  'squad-validate',
  'squad:export',
  'squad-export',
  'squad:pipeline',
  'squad-pipeline',
  'runtime:init',
  'runtime-init',
  'runtime:ingest',
  'runtime-ingest',
  'runtime:task:start',
  'runtime-task-start',
  'runtime:start',
  'runtime-start',
  'runtime:update',
  'runtime-update',
  'runtime:task:finish',
  'runtime-task-finish',
  'runtime:finish',
  'runtime-finish',
  'runtime:task:fail',
  'runtime-task-fail',
  'runtime:fail',
  'runtime-fail',
  'runtime:status',
  'runtime-status',
  'runtime:log',
  'runtime-log',
  'deliver',
  'output-strategy:export',
  'output-strategy:import',
  'cloud:import:squad',
  'cloud-import-squad',
  'cloud:import:genome',
  'cloud-import-genome',
  'cloud:publish:squad',
  'cloud-publish-squad',
  'cloud:publish:genome',
  'cloud-publish-genome',
  'version',
  '--version',
  '-v'
]);

const LEGACY_DASHBOARD_COMMANDS = new Set([
  'dashboard:init',
  'dashboard-init',
  'dashboard:dev',
  'dashboard-dev',
  'dashboard:open',
  'dashboard-open'
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

function createSilentLogger() {
  return {
    log() {},
    error() {}
  };
}

function logHelpLine(t, logger, key) {
  logger.log(t('cli.help_item_line', { text: t(key) }));
}

function printHelp(t, logger) {
  logger.log(t('cli.title_line', { title: t('cli.title') }));
  logger.log(t('cli.usage'));
  logHelpLine(t, logger, 'cli.help_init');
  logHelpLine(t, logger, 'cli.help_install');
  logHelpLine(t, logger, 'cli.help_update');
  logHelpLine(t, logger, 'cli.help_info');
  logHelpLine(t, logger, 'cli.help_doctor');
  logHelpLine(t, logger, 'cli.help_i18n_add');
  logHelpLine(t, logger, 'cli.help_agents');
  logHelpLine(t, logger, 'cli.help_agent_prompt');
  logHelpLine(t, logger, 'cli.help_context_validate');
  logHelpLine(t, logger, 'cli.help_context_pack');
  logHelpLine(t, logger, 'cli.help_setup_context');
  logHelpLine(t, logger, 'cli.help_locale_apply');
  logHelpLine(t, logger, 'cli.help_locale_diff');
  logHelpLine(t, logger, 'cli.help_test_agents');
  logHelpLine(t, logger, 'cli.help_test_smoke');
  logHelpLine(t, logger, 'cli.help_test_package');
  logHelpLine(t, logger, 'cli.help_workflow_plan');
  logHelpLine(t, logger, 'cli.help_workflow_next');
  logHelpLine(t, logger, 'cli.help_parallel_init');
  logHelpLine(t, logger, 'cli.help_parallel_doctor');
  logHelpLine(t, logger, 'cli.help_parallel_assign');
  logHelpLine(t, logger, 'cli.help_parallel_status');
  logHelpLine(t, logger, 'cli.help_mcp_init');
  logHelpLine(t, logger, 'cli.help_mcp_doctor');
  logHelpLine(t, logger, 'cli.help_qa_doctor');
  logHelpLine(t, logger, 'cli.help_qa_init');
  logHelpLine(t, logger, 'cli.help_qa_run');
  logHelpLine(t, logger, 'cli.help_qa_scan');
  logHelpLine(t, logger, 'cli.help_qa_report');
  logHelpLine(t, logger, 'cli.help_scan_project');
  logHelpLine(t, logger, 'cli.help_config');
  logHelpLine(t, logger, 'cli.help_genome_doctor');
  logHelpLine(t, logger, 'cli.help_genome_migrate');
  logHelpLine(t, logger, 'cli.help_squad_status');
  logHelpLine(t, logger, 'cli.help_squad_doctor');
  logHelpLine(t, logger, 'cli.help_squad_repair_genomes');
  logHelpLine(t, logger, 'cli.help_squad_validate');
  logHelpLine(t, logger, 'cli.help_squad_export');
  logHelpLine(t, logger, 'cli.help_squad_pipeline');
  logHelpLine(t, logger, 'cli.help_runtime_init');
  logHelpLine(t, logger, 'cli.help_runtime_ingest');
  logHelpLine(t, logger, 'cli.help_runtime_task_start');
  logHelpLine(t, logger, 'cli.help_runtime_start');
  logHelpLine(t, logger, 'cli.help_runtime_update');
  logHelpLine(t, logger, 'cli.help_runtime_task_finish');
  logHelpLine(t, logger, 'cli.help_runtime_finish');
  logHelpLine(t, logger, 'cli.help_runtime_task_fail');
  logHelpLine(t, logger, 'cli.help_runtime_fail');
  logHelpLine(t, logger, 'cli.help_runtime_status');
  logHelpLine(t, logger, 'cli.help_cloud_import_squad');
  logHelpLine(t, logger, 'cli.help_cloud_import_genome');
  logHelpLine(t, logger, 'cli.help_cloud_publish_squad');
  logHelpLine(t, logger, 'cli.help_cloud_publish_genome');
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
  const silentLogger = createSilentLogger();

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

  if (LEGACY_DASHBOARD_COMMANDS.has(command)) {
    const message = t('cli.dashboard_moved', { command });
    if (jsonMode) {
      writeJson({
        ok: false,
        error: {
          code: 'dashboard_moved',
          message,
          command
        }
      });
    } else {
      logger.error(t('cli.dashboard_moved_line', { message }));
    }
    process.exitCode = 1;
    return;
  }

  try {
    let result = null;
    const commandLogger =
      jsonMode && commandSupportsJson(command) ? silentLogger : logger;

    if (command === 'init') {
      result = await runInit({ args, options, logger: commandLogger, t });
    } else if (command === 'install') {
      result = await runInstall({ args, options, logger: commandLogger, t });
    } else if (command === 'update') {
      result = await runUpdate({ args, options, logger: commandLogger, t });
    } else if (command === 'info') {
      result = await runInfo({ args, options, logger: commandLogger, t });
    } else if (command === 'doctor') {
      result = await runDoctorCommand({ args, options, logger: commandLogger, t });
    } else if (command === 'i18n:add' || command === 'i18n-add') {
      result = await runI18nAdd({ args, options, logger: commandLogger, t });
    } else if (command === 'agents') {
      result = await runAgentsList({ args, options, logger: commandLogger, t });
    } else if (command === 'agent:prompt' || command === 'agent-prompt') {
      result = await runAgentPrompt({ args, options, logger: commandLogger, t });
    } else if (command === 'context:validate' || command === 'context-validate') {
      result = await runContextValidate({ args, options, logger: commandLogger, t });
    } else if (command === 'context:pack' || command === 'context-pack') {
      result = await runContextPack({ args, options, logger: commandLogger, t });
    } else if (command === 'setup:context' || command === 'setup-context') {
      result = await runSetupContext({ args, options, logger: commandLogger, t });
    } else if (command === 'locale:apply' || command === 'locale-apply') {
      result = await runLocaleApply({ args, options, logger: commandLogger, t });
    } else if (command === 'locale:diff' || command === 'locale-diff') {
      result = await runLocaleDiff({ args, options, logger: commandLogger, t });
    } else if (command === 'test:agents' || command === 'test-agents') {
      result = await runTestAgents({ args, options, logger: commandLogger, t });
    } else if (command === 'test:smoke' || command === 'test-smoke') {
      result = await runSmokeTest({ args, options, logger: commandLogger, t });
    } else if (command === 'test:package' || command === 'test-package') {
      result = await runPackageTest({ args, options, logger: commandLogger, t });
    } else if (command === 'workflow:plan' || command === 'workflow-plan') {
      result = await runWorkflowPlan({ args, options, logger: commandLogger, t });
    } else if (
      command === 'workflow:next' ||
      command === 'workflow-next' ||
      command === 'agent:next' ||
      command === 'agent-next'
    ) {
      result = await runWorkflowNext({ args, options, logger: commandLogger, t });
    } else if (
      command === 'parallel:init' ||
      command === 'parallel-init' ||
      command === 'orchestrator:init' ||
      command === 'orchestrator-init'
    ) {
      result = await runParallelInit({ args, options, logger: commandLogger, t });
    } else if (
      command === 'parallel:doctor' ||
      command === 'parallel-doctor' ||
      command === 'orchestrator:doctor' ||
      command === 'orchestrator-doctor'
    ) {
      result = await runParallelDoctor({ args, options, logger: commandLogger, t });
    } else if (
      command === 'parallel:assign' ||
      command === 'parallel-assign' ||
      command === 'orchestrator:assign' ||
      command === 'orchestrator-assign'
    ) {
      result = await runParallelAssign({ args, options, logger: commandLogger, t });
    } else if (
      command === 'parallel:status' ||
      command === 'parallel-status' ||
      command === 'orchestrator:status' ||
      command === 'orchestrator-status'
    ) {
      result = await runParallelStatus({ args, options, logger: commandLogger, t });
    } else if (command === 'mcp:init' || command === 'mcp-init') {
      result = await runMcpInit({ args, options, logger: commandLogger, t });
    } else if (command === 'mcp:doctor' || command === 'mcp-doctor') {
      result = await runMcpDoctor({ args, options, logger: commandLogger, t });
    } else if (command === 'qa:doctor' || command === 'qa-doctor') {
      result = await runQaDoctor({ args, options, logger: commandLogger, t });
    } else if (command === 'qa:init' || command === 'qa-init') {
      result = await runQaInit({ args, options, logger: commandLogger, t });
    } else if (command === 'qa:run' || command === 'qa-run') {
      result = await runQaRun({ args, options, logger: commandLogger, t });
    } else if (command === 'qa:scan' || command === 'qa-scan') {
      result = await runQaScan({ args, options, logger: commandLogger, t });
    } else if (command === 'qa:report' || command === 'qa-report') {
      result = await runQaReport({ args, options, logger: commandLogger, t });
    } else if (command === 'scan:project' || command === 'scan-project') {
      result = await runScanProject({ args, options, logger: commandLogger, t });
    } else if (command === 'config') {
      result = await runConfig({ args, options, logger: commandLogger, t });
    } else if (command === 'genome:doctor' || command === 'genome-doctor') {
      result = await runGenomeDoctor({ args, options, logger: commandLogger, t });
    } else if (command === 'genome:migrate' || command === 'genome-migrate') {
      result = await runGenomeMigrate({ args, options, logger: commandLogger, t });
    } else if (command === 'squad:status' || command === 'squad-status') {
      result = await runSquadStatus({ args, options, logger: commandLogger, t });
    } else if (command === 'squad:doctor' || command === 'squad-doctor') {
      result = await runSquadDoctor({ args, options, logger: commandLogger, t });
    } else if (command === 'squad:repair-genomes' || command === 'squad-repair-genomes') {
      result = await runSquadRepairGenomes({ args, options, logger: commandLogger, t });
    } else if (command === 'squad:validate' || command === 'squad-validate') {
      result = await runSquadValidate({ args, options, logger: commandLogger, t });
    } else if (command === 'squad:export' || command === 'squad-export') {
      result = await runSquadExport({ args, options, logger: commandLogger, t });
    } else if (command === 'squad:pipeline' || command === 'squad-pipeline') {
      result = await runSquadPipeline({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:init' || command === 'runtime-init') {
      result = await runRuntimeInit({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:ingest' || command === 'runtime-ingest') {
      result = await runRuntimeIngest({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:task:start' || command === 'runtime-task-start') {
      result = await runRuntimeTaskStart({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:start' || command === 'runtime-start') {
      result = await runRuntimeStart({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:update' || command === 'runtime-update') {
      result = await runRuntimeUpdate({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:task:finish' || command === 'runtime-task-finish') {
      result = await runRuntimeTaskFinish({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:finish' || command === 'runtime-finish') {
      result = await runRuntimeFinish({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:task:fail' || command === 'runtime-task-fail') {
      result = await runRuntimeTaskFail({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:fail' || command === 'runtime-fail') {
      result = await runRuntimeFail({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:status' || command === 'runtime-status') {
      result = await runRuntimeStatus({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:log' || command === 'runtime-log') {
      result = await runRuntimeLog({ args, options, logger: commandLogger, t });
    } else if (command === 'deliver') {
      result = await runDeliver({ args, options, logger: commandLogger, t });
    } else if (command === 'output-strategy:export') {
      result = await runOutputStrategyExport({ args, options, logger: commandLogger, t });
    } else if (command === 'output-strategy:import') {
      result = await runOutputStrategyImport({ args, options, logger: commandLogger, t });
    } else if (command === 'devlog:sync' || command === 'devlog-sync') {
      result = await runDevlogSync({ args, options, logger: commandLogger, t });
    } else if (command === 'runtime:prune' || command === 'runtime-prune') {
      result = await runRuntimePrune({ args, options, logger: commandLogger, t });
    } else if (command === 'cloud:import:squad' || command === 'cloud-import-squad') {
      result = await runCloudImportSquad({ args, options, logger: commandLogger, t });
    } else if (command === 'cloud:import:genome' || command === 'cloud-import-genome') {
      result = await runCloudImportGenome({ args, options, logger: commandLogger, t });
    } else if (command === 'cloud:publish:squad' || command === 'cloud-publish-squad') {
      result = await runCloudPublishSquad({ args, options, logger: commandLogger, t });
    } else if (command === 'cloud:publish:genome' || command === 'cloud-publish-genome') {
      result = await runCloudPublishGenome({ args, options, logger: commandLogger, t });
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
        logger.error(t('cli.unknown_command_line', { message }));
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
