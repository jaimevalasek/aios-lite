'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { readTextIfExists, ensureDir, exists } = require('../utils');
const { validateProjectContextFile } = require('../context');

const DEFAULT_PERSONAS = ['naive', 'hacker', 'power', 'mobile'];

const DEFAULT_SECURITY_PROBES = [
  'exposed_env_vars',
  'xss_inputs',
  'open_redirect',
  'sensitive_files',
  'idor_probe',
  'console_leaks',
  'debug_routes',
  'mixed_content',
  'sensitive_get_params'
];

const DEFAULT_PERFORMANCE_THRESHOLDS = {
  page_load_ms: 3000,
  ttfb_ms: 800,
  requests_max: 80,
  transfer_max_kb: 2048
};

function extractFrontmatterValue(markdown, key) {
  if (!markdown) return '';
  const regex = new RegExp(`^-\\s*${key}:\\s*(.*)$`, 'im');
  const match = String(markdown).match(regex);
  return match ? String(match[1] || '').trim() : '';
}

function extractYamlValue(markdown, key) {
  if (!markdown) return '';
  const regex = new RegExp(`^${key}:\\s*(.*)$`, 'im');
  const match = String(markdown).match(regex);
  return match ? String(match[1] || '').trim().replace(/^['"]|['"]$/g, '') : '';
}

function parseAcItems(prdContent) {
  if (!prdContent) return [];
  const items = [];
  // Match table rows: | AC-01 | description |
  const tableRows = [...String(prdContent).matchAll(/\|\s*(AC-\d+)\s*\|\s*([^|]+)\|/g)];
  for (const match of tableRows) {
    items.push({ id: match[1].trim(), description: match[2].trim() });
  }
  // Match must-have items in MVP section
  const mvpMatches = [...String(prdContent).matchAll(/🔴\s*([^\n]+)/g)];
  for (const match of mvpMatches) {
    if (items.length >= 20) break;
    items.push({ id: `AC-${String(items.length + 1).padStart(2, '0')}`, description: match[1].trim() });
  }
  return items.slice(0, 20);
}

function parseBusinessRules(discoveryContent) {
  if (!discoveryContent) return [];
  const rules = [];
  const matches = [...String(discoveryContent).matchAll(/[-*]\s*([A-Z][^\n]{10,80})/g)];
  for (const match of matches.slice(0, 15)) {
    rules.push(match[1].trim());
  }
  return rules;
}

async function runQaInit({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const dryRun = Boolean(options['dry-run']);
  const configPath = path.join(targetDir, 'aios-qa.config.json');

  const contextResult = await validateProjectContextFile(targetDir);
  const contextMarkdown = await readTextIfExists(path.join(targetDir, '.aioson/context/project.context.md'));
  const prdContent = await readTextIfExists(path.join(targetDir, '.aioson/context/prd.md'));
  const discoveryContent = await readTextIfExists(path.join(targetDir, '.aioson/context/discovery.md'));

  const contextData = contextResult.parsed && contextResult.data ? contextResult.data : {};

  // Resolve URL: CLI flag > context app_url > context framework hint > ask
  let url = String(options.url || '').trim();
  if (!url && contextMarkdown) {
    url = extractFrontmatterValue(contextMarkdown, 'app_url') ||
          extractFrontmatterValue(contextMarkdown, 'dev_url') || '';
  }
  if (!url) {
    url = 'http://localhost:3000';
  }

  const projectName = String(contextData.project_name || path.basename(targetDir) || 'Project');
  const language = String(contextData.conversation_language || 'en');

  // Parse prd.md for AC items
  const acItems = parseAcItems(prdContent);
  const businessRules = parseBusinessRules(discoveryContent);

  if (contextResult.exists) {
    logger.log(t('qa_init.context_found', { name: projectName, url }));
  }

  if (prdContent) {
    logger.log(t('qa_init.prd_found', { count: acItems.length }));
  } else {
    logger.log(t('qa_init.prd_missing'));
  }

  const config = {
    project_name: projectName,
    url,
    language,
    personas: DEFAULT_PERSONAS,
    security_probes: DEFAULT_SECURITY_PROBES,
    performance_thresholds: DEFAULT_PERFORMANCE_THRESHOLDS,
    accessibility: true,
    network_capture: true,
    screenshot_on_finding: true,
    scenarios: acItems,
    business_rules: businessRules,
    generated_at: new Date().toISOString(),
    aioson_version: require('../../package.json').version
  };

  if (!dryRun) {
    await ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  }

  const output = {
    ok: true,
    targetDir,
    configPath,
    dryRun,
    written: !dryRun,
    url,
    projectName,
    scenariosCount: acItems.length,
    personasCount: DEFAULT_PERSONAS.length,
    probesCount: DEFAULT_SECURITY_PROBES.length,
    config
  };

  if (options.json) return output;

  logger.log(
    dryRun
      ? t('qa_init.dry_run_generated', { path: configPath })
      : t('qa_init.generated', { path: configPath })
  );
  logger.log(t('qa_init.scenarios_count', { count: acItems.length }));
  logger.log(t('qa_init.personas_count', { count: DEFAULT_PERSONAS.length }));
  logger.log(t('qa_init.probes_count', { count: DEFAULT_SECURITY_PROBES.length }));
  logger.log(t('qa_init.next_steps'));
  logger.log(t('qa_init.step_doctor'));
  logger.log(t('qa_init.step_run'));

  return output;
}

module.exports = { runQaInit };
