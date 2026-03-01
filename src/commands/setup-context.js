'use strict';

const path = require('node:path');
const readline = require('node:readline/promises');
const { detectFramework } = require('../detector');
const {
  calculateClassification,
  normalizeBoolean,
  renderProjectContext,
  writeProjectContext
} = require('../context-writer');

function resolveOption(options, name, fallback = '') {
  return options[name] !== undefined ? String(options[name]) : fallback;
}

async function ask(rl, question, fallback = '') {
  const suffix = fallback ? ` (${fallback})` : '';
  const value = await rl.question(`${question}${suffix}: `);
  const cleaned = String(value || '').trim();
  if (!cleaned) return fallback;
  return cleaned;
}

async function runSetupContext({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const defaultsMode = Boolean(options.defaults);

  const detection = await detectFramework(targetDir);
  const detectedFramework = detection.framework || 'Node';
  const detectedInstalled = detection.installed;

  const baseName = path.basename(targetDir) || 'my-project';

  let data = {
    projectName: resolveOption(options, 'project-name', baseName),
    projectType: resolveOption(options, 'project-type', 'web_app'),
    profile: resolveOption(options, 'profile', 'developer'),
    framework: resolveOption(options, 'framework', detectedFramework),
    frameworkInstalled:
      options['framework-installed'] !== undefined
        ? normalizeBoolean(options['framework-installed'], detectedInstalled)
        : detectedInstalled,
    conversationLanguage: resolveOption(options, 'language', 'en'),
    backend: resolveOption(options, 'backend', ''),
    frontend: resolveOption(options, 'frontend', ''),
    database: resolveOption(options, 'database', ''),
    auth: resolveOption(options, 'auth', ''),
    uiux: resolveOption(options, 'uiux', ''),
    queues: resolveOption(options, 'queues', ''),
    storage: resolveOption(options, 'storage', ''),
    email: resolveOption(options, 'email', ''),
    payments: resolveOption(options, 'payments', ''),
    installCommands: resolveOption(options, 'install-commands', ''),
    aiosLiteVersion: resolveOption(options, 'aios-lite-version', '0.1.2')
  };

  let userTypesCount = Number(options['user-types'] || 1);
  let integrationsCount = Number(options.integrations || 0);
  let rulesComplexity = resolveOption(options, 'rules-complexity', 'none');

  if (!defaultsMode) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      logger.log(t('setup_context.detected', { framework: detectedFramework, installed: String(detectedInstalled) }));

      data.projectName = await ask(rl, t('setup_context.q_project_name'), data.projectName);
      data.projectType = await ask(rl, t('setup_context.q_project_type'), data.projectType);
      data.profile = await ask(rl, t('setup_context.q_profile'), data.profile);
      data.framework = await ask(rl, t('setup_context.q_framework'), data.framework);
      data.frameworkInstalled = normalizeBoolean(
        await ask(rl, t('setup_context.q_framework_installed'), String(data.frameworkInstalled)),
        data.frameworkInstalled
      );
      data.conversationLanguage = await ask(
        rl,
        t('setup_context.q_language'),
        data.conversationLanguage
      );

      userTypesCount = Number(await ask(rl, t('setup_context.q_user_types'), String(userTypesCount)));
      integrationsCount = Number(
        await ask(rl, t('setup_context.q_integrations'), String(integrationsCount))
      );
      rulesComplexity = await ask(rl, t('setup_context.q_rules_complexity'), rulesComplexity);
    } finally {
      rl.close();
    }
  }

  const classificationResult = calculateClassification({
    userTypesCount,
    integrationsCount,
    rulesComplexity
  });

  data = {
    ...data,
    classification: options.classification || classificationResult.classification
  };

  const content = renderProjectContext(data);
  const filePath = await writeProjectContext(targetDir, content);

  logger.log(t('setup_context.written', { path: filePath }));
  logger.log(
    t('setup_context.classification_result', {
      classification: data.classification,
      score: classificationResult.score
    })
  );

  return {
    filePath,
    data,
    classificationScore: classificationResult.score
  };
}

module.exports = {
  runSetupContext
};

