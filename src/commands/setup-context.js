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
const { applyAgentLocale } = require('../locales');

const WEB3_FRAMEWORK_TO_NETWORK = {
  Hardhat: 'ethereum',
  Foundry: 'ethereum',
  Truffle: 'ethereum',
  Anchor: 'solana',
  'Solana Web3': 'solana',
  Cardano: 'cardano'
};

function resolveOption(options, name, fallback = '') {
  return options[name] !== undefined ? String(options[name]) : fallback;
}

function isWeb3Framework(framework) {
  return Object.prototype.hasOwnProperty.call(WEB3_FRAMEWORK_TO_NETWORK, String(framework || ''));
}

function inferProjectTypeFromFramework(framework) {
  return isWeb3Framework(framework) ? 'dapp' : 'web_app';
}

function inferWeb3Network(framework) {
  return WEB3_FRAMEWORK_TO_NETWORK[String(framework || '')] || 'ethereum';
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
  const inferredProjectType = inferProjectTypeFromFramework(detectedFramework);
  const inferredWeb3Enabled = inferredProjectType === 'dapp';

  const baseName = path.basename(targetDir) || 'my-project';

  let data = {
    projectName: resolveOption(options, 'project-name', baseName),
    projectType: resolveOption(options, 'project-type', inferredProjectType),
    profile: resolveOption(options, 'profile', 'developer'),
    framework: resolveOption(options, 'framework', detectedFramework),
    frameworkInstalled:
      options['framework-installed'] !== undefined
        ? normalizeBoolean(options['framework-installed'], detectedInstalled)
        : detectedInstalled,
    conversationLanguage: resolveOption(options, 'language', 'en'),
    web3Enabled:
      options['web3-enabled'] !== undefined
        ? normalizeBoolean(options['web3-enabled'], inferredWeb3Enabled)
        : inferredWeb3Enabled,
    web3Networks: resolveOption(
      options,
      'web3-networks',
      inferredWeb3Enabled ? inferWeb3Network(detectedFramework) : ''
    ),
    contractFramework: resolveOption(
      options,
      'contract-framework',
      inferredWeb3Enabled ? detectedFramework : ''
    ),
    walletProvider: resolveOption(options, 'wallet-provider', ''),
    indexer: resolveOption(options, 'indexer', ''),
    rpcProvider: resolveOption(options, 'rpc-provider', ''),
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
    aiosLiteVersion: resolveOption(options, 'aios-lite-version', '0.1.7')
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
      data.web3Enabled = normalizeBoolean(
        await ask(rl, t('setup_context.q_web3_enabled'), String(data.web3Enabled)),
        data.web3Enabled
      );
      if (data.web3Enabled) {
        data.web3Networks = await ask(rl, t('setup_context.q_web3_networks'), data.web3Networks);
        data.contractFramework = await ask(
          rl,
          t('setup_context.q_contract_framework'),
          data.contractFramework
        );
        data.walletProvider = await ask(rl, t('setup_context.q_wallet_provider'), data.walletProvider);
        data.indexer = await ask(rl, t('setup_context.q_indexer'), data.indexer);
        data.rpcProvider = await ask(rl, t('setup_context.q_rpc_provider'), data.rpcProvider);
      } else {
        data.web3Networks = '';
        data.contractFramework = '';
        data.walletProvider = '';
        data.indexer = '';
        data.rpcProvider = '';
      }

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
  if (data.projectType === 'dapp') {
    data.web3Enabled = true;
  }
  if (data.web3Enabled && !data.web3Networks) {
    data.web3Networks = inferWeb3Network(data.framework);
  }
  if (data.web3Enabled && !data.contractFramework && isWeb3Framework(data.framework)) {
    data.contractFramework = data.framework;
  }
  if (!data.web3Enabled) {
    data.web3Networks = '';
    data.contractFramework = '';
    data.walletProvider = '';
    data.indexer = '';
    data.rpcProvider = '';
  }

  const content = renderProjectContext(data);
  const filePath = await writeProjectContext(targetDir, content);
  const localeApplyResult = await applyAgentLocale(targetDir, data.conversationLanguage, {
    dryRun: false
  });

  logger.log(t('setup_context.written', { path: filePath }));
  logger.log(
    t('setup_context.classification_result', {
      classification: data.classification,
      score: classificationResult.score
    })
  );
  logger.log(
    t('setup_context.locale_applied', {
      locale: localeApplyResult.locale,
      count: localeApplyResult.copied.length
    })
  );

  return {
    filePath,
    data,
    classificationScore: classificationResult.score,
    localeApplyResult
  };
}

module.exports = {
  runSetupContext
};
