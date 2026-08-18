'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { WebhookServer } = require('../lib/webhook-server');
const { getCliVersionSync } = require('../version');
const { listWorkers, runWorker } = require('../worker-runner');
const {
  loadSession,
  appendTurn,
  buildContextualInput,
  cleanExpiredSessions
} = require('../squad/external-session');
const { resolveTargetDir } = require('../lib/project-root');

const SQUADS_DIR = path.join('.aioson', 'squads');

async function discoverSquads(projectDir) {
  const squadsDir = path.join(projectDir, SQUADS_DIR);
  let entries;
  try {
    entries = await fs.readdir(squadsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

async function executeSquad(projectDir, squadSlug, contextualInput) {
  const workers = await listWorkers(projectDir, squadSlug);
  if (workers.length === 0) {
    throw new Error(`No workers found in squad "${squadSlug}"`);
  }

  // Run the first eligible worker as the squad entry point
  for (const worker of workers) {
    const result = await runWorker(
      projectDir,
      squadSlug,
      worker.slug,
      { input: contextualInput },
      { triggerType: 'webhook' }
    );
    if (result.ok) {
      const out = result.output;
      return typeof out === 'string' ? out : JSON.stringify(out);
    }
  }

  throw new Error(`All workers in squad "${squadSlug}" failed`);
}

async function handleStart(projectDir, options, { logger }) {
  const port = parseInt(options.port || process.env.AIOSON_WEBHOOK_PORT || '3210', 10);
  const token = options.token || process.env.AIOSON_WEBHOOK_TOKEN || '';
  const ttlHours = parseInt(options.sessionTtl || process.env.AIOSON_SESSION_TTL_HOURS || '24', 10);
  const version = getCliVersionSync();

  if (!token) {
    logger.error('Warning: AIOSON_WEBHOOK_TOKEN not set — server running without authentication.');
  }

  // Clean up expired sessions on startup
  const cleaned = await cleanExpiredSessions(projectDir, ttlHours);
  if (cleaned > 0) logger.log(`Cleaned ${cleaned} expired session(s).`);

  const slugs = await discoverSquads(projectDir);
  const squads = slugs.map(name => ({ name, timeout_ms: 120000 }));

  const server = new WebhookServer({
    port,
    token,
    squads,
    version,
    onTrigger: async ({ squad, input, session_id, metadata }) => {
      // Load prior session context (if any)
      const session = session_id
        ? await loadSession(projectDir, session_id, ttlHours)
        : null;

      const contextualInput = buildContextualInput(session, input);

      // Save user turn before execution
      if (session_id) {
        await appendTurn(projectDir, session_id, 'user', input, metadata || {}, ttlHours);
      }

      const response = await executeSquad(projectDir, squad, contextualInput);

      // Save assistant turn after execution
      if (session_id) {
        await appendTurn(projectDir, session_id, 'assistant', response, {}, ttlHours);
      }

      return { response };
    },
    onQuery: async ({ squad, query, max_results }) => {
      const raw = await executeSquad(projectDir, squad, query);
      // Best-effort: if the output is JSON, parse and slice; otherwise wrap as single result
      let results;
      try {
        const parsed = JSON.parse(raw);
        results = Array.isArray(parsed) ? parsed.slice(0, max_results) : [parsed];
      } catch {
        results = [{ text: raw }];
      }
      return { results };
    }
  });

  await server.start();

  logger.log(`AIOSON squad webhook server started on port ${port}`);
  if (squads.length > 0) {
    logger.log(`Available squads: ${squads.map(s => s.name).join(', ')}`);
  } else {
    logger.log('No squads discovered in .aioson/squads/');
  }
  logger.log('Endpoints: POST /trigger  GET /status/:run_id  GET /health');
  logger.log('Press Ctrl+C to stop.');

  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  // Keep the process alive until signal
  await new Promise(() => {});
}

function handleConfig(options, { logger }) {
  const channel = options.channel || 'whatsapp';
  const squad = options.squad || 'atendimento';
  const port = options.port || '3210';

  logger.log(`OpenClaw configuration for squad "${squad}" via ${channel}:\n`);
  logger.log(`hooks:\n  ${channel}:\n    auto_reply:\n      - pattern: ".*"\n        action: webhook\n        url: "http://SEU_SERVIDOR:${port}/trigger"\n        headers:\n          Authorization: "Bearer \${AIOSON_WEBHOOK_TOKEN}"\n        body_template: |\n          {\n            "squad": "${squad}",\n            "input": "{{message.text}}",\n            "session_id": "${channel}:{{message.from}}",\n            "callback_url": "{{openclaw.callback_url}}",\n            "metadata": {\n              "channel": "${channel}",\n              "phone": "{{message.from}}",\n              "user_name": "{{message.contact_name}}"\n            }\n          }`);

  return { ok: true };
}

async function runSquadWebhook({ args, options, logger }) {
  const targetDir = resolveTargetDir(args);
  const sub = options.sub || 'start';

  switch (sub) {
    case 'start':
      return handleStart(targetDir, options, { logger });
    case 'config':
      return handleConfig(options, { logger });
    default:
      logger.error(`Unknown subcommand: "${sub}". Use: start, config`);
      return { ok: false };
  }
}

module.exports = { runSquadWebhook };
