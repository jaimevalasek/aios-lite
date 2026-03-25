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

// ---------------------------------------------------------------------------
// HTTP execution helpers
// ---------------------------------------------------------------------------

function buildHeaders(connectorSlug, cfg) {
  if (connectorSlug === 'whatsapp-business') {
    return { 'Authorization': `Bearer ${cfg.api_token}` };
  }
  return {};
}

const EXECUTORS = {
  'whatsapp-business': {
    async send_message({ to, body }, cfg) {
      const res = await fetch(`https://graph.facebook.com/v18.0/${cfg.phone_id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cfg.api_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
        signal: AbortSignal.timeout(10000)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);
      return { message_id: json.messages?.[0]?.id };
    },
    async send_template({ to, template_name, params = [] }, cfg) {
      const components = params.length
        ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: String(p) })) }]
        : [];
      const res = await fetch(`https://graph.facebook.com/v18.0/${cfg.phone_id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cfg.api_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to, type: 'template',
          template: { name: template_name, language: { code: 'pt_BR' }, components }
        }),
        signal: AbortSignal.timeout(10000)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);
      return { message_id: json.messages?.[0]?.id };
    }
  },

  'telegram-bot': {
    async send_message({ chat_id, text }, cfg) {
      const id = chat_id || cfg.chat_id;
      const res = await fetch(`https://api.telegram.org/bot${cfg.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, text }),
        signal: AbortSignal.timeout(10000)
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.description || `HTTP ${res.status}`);
      return { message_id: json.result?.message_id };
    },
    async get_updates(_input, cfg) {
      const res = await fetch(`https://api.telegram.org/bot${cfg.bot_token}/getUpdates`, {
        signal: AbortSignal.timeout(10000)
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.description || `HTTP ${res.status}`);
      return { updates: json.result };
    }
  },

  'webhook-generic': {
    async send({ url, payload, method = 'POST', headers: extraHeaders = {} }, cfg) {
      const target = url || cfg.webhook_url;
      const res = await fetch(target, {
        method,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
      return { status: res.status, ok: res.ok };
    }
  }
};

/**
 * Execute a health check for a connector.
 * Returns { ok: boolean, statusCode?, error?, skipped?, url? }
 */
async function runHealthCheck(connectorSlug, resolvedConfig) {
  const def = BUILT_IN_CONNECTORS[connectorSlug];
  if (!def || !def.baseUrl || !def.healthPath) {
    return { ok: true, skipped: true, reason: 'no_health_path' };
  }

  let url = def.baseUrl + def.healthPath;
  for (const [key, val] of Object.entries(resolvedConfig)) {
    url = url.replace(`{${key}}`, encodeURIComponent(val));
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(connectorSlug, resolvedConfig),
      signal: AbortSignal.timeout(8000)
    });
    return { ok: res.ok, statusCode: res.status, url };
  } catch (err) {
    return { ok: false, error: err.message, url };
  }
}

/**
 * Execute a connector action.
 * Returns { ok: boolean, result?, error? }
 */
async function runAction(connectorSlug, actionSlug, input, resolvedConfig) {
  const def = BUILT_IN_CONNECTORS[connectorSlug];
  if (!def) return { ok: false, error: `Unknown connector: ${connectorSlug}` };
  if (!def.actions[actionSlug]) return { ok: false, error: `Unknown action: ${actionSlug}` };

  try {
    const executor = EXECUTORS[connectorSlug]?.[actionSlug];
    if (!executor) return { ok: false, error: 'No executor registered for this connector/action' };
    const result = await executor(input, resolvedConfig);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
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
  integrationsDir,
  runHealthCheck,
  runAction
};
