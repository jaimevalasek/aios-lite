'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const SQUADS_DIR = path.join('.aioson', 'squads');
const INTEGRATIONS_DIR = 'integrations';

/**
 * Built-in connector definitions.
 * Each connector declares its config schema, available actions, and optional health-check URL pattern.
 */
const BUILT_IN_CONNECTORS = {
  'whatsapp-business': {
    name: 'WhatsApp Business API',
    configSchema: {
      phone_id: { type: 'string', env: 'WHATSAPP_PHONE_ID', secret: false, required: true },
      api_token: { type: 'string', env: 'WHATSAPP_API_TOKEN', secret: true, required: true }
    },
    actions: {
      send_message: { input: ['to', 'body'], output: ['message_id'] },
      send_template: { input: ['to', 'template_name', 'params'], output: ['message_id'] }
    },
    baseUrl: 'https://graph.facebook.com/v18.0',
    healthPath: '/{phone_id}'
  },

  'telegram-bot': {
    name: 'Telegram Bot API',
    configSchema: {
      bot_token: { type: 'string', env: 'TELEGRAM_BOT_TOKEN', secret: true, required: true },
      chat_id: { type: 'string', env: 'TELEGRAM_CHAT_ID', secret: false, required: false }
    },
    actions: {
      send_message: { input: ['chat_id', 'text'], output: ['message_id'] },
      get_updates: { input: [], output: ['updates'] }
    },
    baseUrl: 'https://api.telegram.org',
    healthPath: '/bot{bot_token}/getMe'
  },

  'smtp-email': {
    name: 'SMTP Email',
    configSchema: {
      smtp_host: { type: 'string', env: 'SMTP_HOST', secret: false, required: true },
      smtp_port: { type: 'number', env: 'SMTP_PORT', secret: false, required: false },
      smtp_user: { type: 'string', env: 'SMTP_USER', secret: false, required: true },
      smtp_pass: { type: 'string', env: 'SMTP_PASS', secret: true, required: true },
      from_email: { type: 'string', env: 'SMTP_FROM', secret: false, required: true }
    },
    actions: {
      send_email: { input: ['to', 'subject', 'body'], output: ['message_id'] }
    },
    baseUrl: null,
    healthPath: null
  },

  'webhook-generic': {
    name: 'Generic Webhook',
    configSchema: {
      webhook_url: { type: 'string', env: 'WEBHOOK_URL', secret: false, required: true },
      auth_header: { type: 'string', env: 'WEBHOOK_AUTH', secret: true, required: false },
      method: { type: 'string', env: null, secret: false, required: false }
    },
    actions: {
      send: { input: ['payload'], output: ['response'] }
    },
    baseUrl: null,
    healthPath: null
  },

  'google-calendar': {
    name: 'Google Calendar API',
    configSchema: {
      client_id: { type: 'string', env: 'GCAL_CLIENT_ID', secret: false, required: true },
      client_secret: { type: 'string', env: 'GCAL_CLIENT_SECRET', secret: true, required: true },
      refresh_token: { type: 'string', env: 'GCAL_REFRESH_TOKEN', secret: true, required: true },
      calendar_id: { type: 'string', env: 'GCAL_CALENDAR_ID', secret: false, required: false }
    },
    actions: {
      list_events: { input: ['date_from', 'date_to'], output: ['events'] },
      create_event: { input: ['summary', 'start', 'end'], output: ['event_id'] }
    },
    baseUrl: 'https://www.googleapis.com/calendar/v3',
    healthPath: '/users/me/calendarList'
  }
};

function getBuiltInConnector(connectorId) {
  return BUILT_IN_CONNECTORS[connectorId] || null;
}

function listBuiltInConnectors() {
  return Object.entries(BUILT_IN_CONNECTORS).map(([id, def]) => ({
    id,
    name: def.name,
    actions: Object.keys(def.actions),
    requiredConfig: Object.entries(def.configSchema)
      .filter(([, spec]) => spec.required)
      .map(([key]) => key)
  }));
}

function integrationsDir(projectDir, squadSlug) {
  return path.join(projectDir, SQUADS_DIR, squadSlug, INTEGRATIONS_DIR);
}

async function loadIntegrationConfig(projectDir, squadSlug, mcpSlug) {
  const filePath = path.join(integrationsDir(projectDir, squadSlug), `${mcpSlug}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveIntegrationConfig(projectDir, squadSlug, mcpSlug, config) {
  const dir = integrationsDir(projectDir, squadSlug);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${mcpSlug}.json`);
  await fs.writeFile(filePath, JSON.stringify(config, null, 2));
}

async function listIntegrations(projectDir, squadSlug) {
  const dir = integrationsDir(projectDir, squadSlug);
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const results = [];
  for (const file of entries) {
    if (!file.endsWith('.json')) continue;
    const slug = file.replace(/\.json$/, '');
    const config = await loadIntegrationConfig(projectDir, squadSlug, slug);
    if (config) {
      results.push({ slug, ...config });
    }
  }
  return results;
}

function resolveConfigValues(configSchema, savedConfig) {
  const resolved = {};
  const missing = [];
  for (const [key, spec] of Object.entries(configSchema)) {
    // Priority: saved config → env var → undefined
    if (savedConfig && savedConfig[key] !== undefined) {
      resolved[key] = savedConfig[key];
    } else if (spec.env && process.env[spec.env]) {
      resolved[key] = process.env[spec.env];
    } else if (spec.required) {
      missing.push(key);
    }
  }
  return { resolved, missing };
}

function resolveConnectorEnv(connectorDef, savedConfig) {
  const { resolved, missing } = resolveConfigValues(connectorDef.configSchema, savedConfig);
  const status = missing.length === 0 ? 'configured' : 'unconfigured';
  return { resolved, missing, status };
}

function buildWorkerMcpEnv(projectDir, squadSlug, mcpSlugs, integrationConfigs) {
  const env = {};
  for (const mcpSlug of (mcpSlugs || [])) {
    const integration = integrationConfigs.find(i => i.slug === mcpSlug);
    if (!integration) continue;
    const connectorDef = getBuiltInConnector(integration.connector);
    if (!connectorDef) continue;
    const { resolved } = resolveConnectorEnv(connectorDef, integration.config);
    // Expose as MCP_<SLUG> env var for the worker process
    const envKey = `MCP_${mcpSlug.toUpperCase().replace(/-/g, '_')}`;
    env[envKey] = JSON.stringify({
      ...resolved,
      connector: integration.connector,
      base_url: connectorDef.baseUrl || null,
      actions: Object.keys(connectorDef.actions)
    });
  }
  return env;
}

async function loadCustomConnector(projectDir, squadSlug, connectorSlug) {
  const filePath = path.join(projectDir, SQUADS_DIR, squadSlug, 'connectors', `${connectorSlug}.js`);
  try {
    await fs.access(filePath);
    return require(filePath);
  } catch {
    return null;
  }
}

module.exports = {
  BUILT_IN_CONNECTORS,
  getBuiltInConnector,
  listBuiltInConnectors,
  loadIntegrationConfig,
  saveIntegrationConfig,
  listIntegrations,
  resolveConfigValues,
  resolveConnectorEnv,
  buildWorkerMcpEnv,
  loadCustomConnector,
  integrationsDir
};
