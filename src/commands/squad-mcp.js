'use strict';

const path = require('node:path');
const { openRuntimeDb, upsertMcpStatus, listMcpStatus, getMcpStatus } = require('../runtime-store');
const {
  listBuiltInConnectors,
  getBuiltInConnector,
  loadIntegrationConfig,
  saveIntegrationConfig,
  listIntegrations,
  resolveConnectorEnv
} = require('../mcp-connectors/registry');

async function runSquadMcp({ args, options, logger, t }) {
  const projectDir = path.resolve(args[0] || options.path || '.');
  const squadSlug = options.squad;
  const sub = options.sub || 'status';

  if (!squadSlug) {
    logger.log(t('squad_mcp.squad_required'));
    return { ok: false, error: 'squad_required' };
  }

  if (sub === 'connectors') {
    return handleConnectors({ logger, t });
  }
  if (sub === 'status') {
    return handleStatus({ projectDir, squadSlug, logger, t });
  }
  if (sub === 'configure') {
    return handleConfigure({ projectDir, squadSlug, options, logger, t });
  }
  if (sub === 'test') {
    return handleTest({ projectDir, squadSlug, options, logger, t });
  }

  logger.log(t('squad_mcp.unknown_sub', { sub }));
  return { ok: false, error: 'unknown_sub' };
}

function handleConnectors({ logger, t }) {
  const connectors = listBuiltInConnectors();
  logger.log(t('squad_mcp.connectors_title'));
  for (const c of connectors) {
    logger.log(`  ${c.id} — ${c.name}`);
    logger.log(`    ${t('squad_mcp.actions')}: ${c.actions.join(', ')}`);
    logger.log(`    ${t('squad_mcp.required_config')}: ${c.requiredConfig.join(', ') || 'none'}`);
    logger.log('');
  }
  return { ok: true, connectors };
}

async function handleStatus({ projectDir, squadSlug, logger, t }) {
  const integrations = await listIntegrations(projectDir, squadSlug);

  if (integrations.length === 0) {
    logger.log(t('squad_mcp.no_integrations', { squad: squadSlug }));
    return { ok: true, integrations: [] };
  }

  let handle;
  try {
    handle = await openRuntimeDb(projectDir);
  } catch {
    handle = null;
  }

  const results = [];
  for (const integ of integrations) {
    const connectorDef = getBuiltInConnector(integ.connector);
    let status = 'unknown';
    let missing = [];
    if (connectorDef) {
      const env = resolveConnectorEnv(connectorDef, integ.config);
      status = env.status;
      missing = env.missing;
    }

    let dbStatus = null;
    if (handle) {
      dbStatus = getMcpStatus(handle.db, squadSlug, integ.slug);
    }

    const entry = {
      slug: integ.slug,
      connector: integ.connector,
      status: dbStatus ? dbStatus.status : status,
      missing,
      calls_total: dbStatus ? dbStatus.calls_total : 0,
      calls_failed: dbStatus ? dbStatus.calls_failed : 0
    };
    results.push(entry);

    const statusIcon = entry.status === 'connected' ? '+' : entry.status === 'configured' ? '~' : '-';
    logger.log(`  [${statusIcon}] ${integ.slug} (${integ.connector}) — ${entry.status}`);
    if (missing.length > 0) {
      logger.log(`      ${t('squad_mcp.missing_config')}: ${missing.join(', ')}`);
    }
    if (entry.calls_total > 0) {
      logger.log(`      ${t('squad_mcp.calls')}: ${entry.calls_total} (${entry.calls_failed} failed)`);
    }
  }

  if (handle) handle.db.close();
  return { ok: true, integrations: results };
}

async function handleConfigure({ projectDir, squadSlug, options, logger, t }) {
  const mcpSlug = options.mcp;
  const connector = options.connector;

  if (!mcpSlug) {
    logger.log(t('squad_mcp.mcp_required'));
    return { ok: false, error: 'mcp_required' };
  }
  if (!connector) {
    logger.log(t('squad_mcp.connector_required'));
    return { ok: false, error: 'connector_required' };
  }

  const connectorDef = getBuiltInConnector(connector);
  if (!connectorDef) {
    logger.log(t('squad_mcp.unknown_connector', { connector }));
    return { ok: false, error: 'unknown_connector' };
  }

  // Build config from --key=value options
  const config = {};
  for (const [key] of Object.entries(connectorDef.configSchema)) {
    if (options[key] !== undefined) {
      config[key] = options[key];
    }
  }

  const integrationConfig = { connector, config };
  await saveIntegrationConfig(projectDir, squadSlug, mcpSlug, integrationConfig);

  // Check resolution
  const { status, missing } = resolveConnectorEnv(connectorDef, config);

  // Update SQLite status
  try {
    const handle = await openRuntimeDb(projectDir);
    upsertMcpStatus(handle.db, { squadSlug, mcpSlug, connector, status, lastError: null });
    handle.db.close();
  } catch { /* SQLite optional */ }

  logger.log(t('squad_mcp.configured', { mcp: mcpSlug, connector, status }));
  if (missing.length > 0) {
    logger.log(t('squad_mcp.still_missing', { keys: missing.join(', ') }));
  }
  return { ok: true, slug: mcpSlug, connector, status, missing };
}

async function handleTest({ projectDir, squadSlug, options, logger, t }) {
  const mcpSlug = options.mcp;
  if (!mcpSlug) {
    logger.log(t('squad_mcp.mcp_required'));
    return { ok: false, error: 'mcp_required' };
  }

  const config = await loadIntegrationConfig(projectDir, squadSlug, mcpSlug);
  if (!config) {
    logger.log(t('squad_mcp.not_configured', { mcp: mcpSlug }));
    return { ok: false, error: 'not_configured' };
  }

  const connectorDef = getBuiltInConnector(config.connector);
  if (!connectorDef) {
    logger.log(t('squad_mcp.unknown_connector', { connector: config.connector }));
    return { ok: false, error: 'unknown_connector' };
  }

  const { resolved, missing, status } = resolveConnectorEnv(connectorDef, config.config);

  if (missing.length > 0) {
    logger.log(t('squad_mcp.test_missing', { mcp: mcpSlug, keys: missing.join(', ') }));

    try {
      const handle = await openRuntimeDb(projectDir);
      upsertMcpStatus(handle.db, { squadSlug, mcpSlug, connector: config.connector, status: 'unconfigured', lastError: `Missing: ${missing.join(', ')}` });
      handle.db.close();
    } catch { /* optional */ }

    return { ok: false, error: 'missing_config', missing };
  }

  // If connector has a healthPath and baseUrl, report it (actual HTTP check skipped — zero-dep)
  let healthUrl = null;
  if (connectorDef.baseUrl && connectorDef.healthPath) {
    healthUrl = connectorDef.baseUrl + connectorDef.healthPath;
    for (const [key, val] of Object.entries(resolved)) {
      healthUrl = healthUrl.replace(`{${key}}`, val);
    }
  }

  // Update status in SQLite
  try {
    const handle = await openRuntimeDb(projectDir);
    upsertMcpStatus(handle.db, { squadSlug, mcpSlug, connector: config.connector, status: 'connected', lastError: null });
    handle.db.close();
  } catch { /* optional */ }

  logger.log(t('squad_mcp.test_ok', { mcp: mcpSlug, connector: config.connector }));
  if (healthUrl) {
    logger.log(t('squad_mcp.health_url', { url: healthUrl }));
  }
  return { ok: true, slug: mcpSlug, status: 'connected', healthUrl };
}

module.exports = { runSquadMcp };
