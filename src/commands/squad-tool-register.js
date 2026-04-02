'use strict';

/**
 * aioson squad:tool:register [projectDir] --squad=<slug> --name=<tool-name>
 *                            --description=<desc> --handler=<shell-command>
 *                            [--handler-type=shell|script] [--handler-path=<path>]
 *                            [--input-schema=<json>] [--registered-by=<executor-slug>]
 *
 * Register a dynamic tool for a squad at runtime.
 * Tools registered here are available to executors in subsequent squad:autorun sessions.
 *
 * Security: handler only receives AIOSON_TOOL_INPUT env var — no API keys, no PATH injection.
 *
 * Usage:
 *   aioson squad:tool:register . --squad=content-team --name=fetch-rss \
 *     --description="Fetch RSS feed and return items" \
 *     --handler='curl -s "$AIOSON_TOOL_INPUT" | python3 -c "import sys,xml.etree.ElementTree as ET; ..."'
 *
 *   aioson squad:tool:register . --squad=content-team --list
 *   aioson squad:tool:register . --squad=content-team --name=fetch-rss --delete
 */

const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');

function nowIso() { return new Date().toISOString(); }

async function handleList(db, squadSlug, logger) {
  const tools = db.prepare(
    'SELECT * FROM dynamic_squad_tools WHERE squad_slug = ? ORDER BY registered_at DESC'
  ).all(squadSlug);

  if (tools.length === 0) {
    logger.log(`No dynamic tools registered for squad "${squadSlug}"`);
    logger.log('Register one with: aioson squad:tool:register . --squad=' + squadSlug + ' --name=<name> --description=<desc> --handler=<cmd>');
    return { ok: true, tools: [] };
  }

  logger.log(`Dynamic tools for "${squadSlug}" (${tools.length}):`);
  for (const t of tools) {
    logger.log(`  • ${t.name} [${t.handler_type}]${t.registered_by ? ' by ' + t.registered_by : ''}`);
    logger.log(`    ${t.description}`);
    if (t.handler_code) logger.log(`    Handler: ${t.handler_code.slice(0, 80)}${t.handler_code.length > 80 ? '...' : ''}`);
    if (t.handler_path) logger.log(`    Script: ${t.handler_path}`);
  }

  return { ok: true, tools };
}

async function handleDelete(db, squadSlug, toolName, logger) {
  const existing = db.prepare(
    'SELECT name FROM dynamic_squad_tools WHERE name = ? AND squad_slug = ?'
  ).get(toolName, squadSlug);

  if (!existing) {
    logger.error(`Tool "${toolName}" not found for squad "${squadSlug}"`);
    return { ok: false, error: 'tool_not_found' };
  }

  db.prepare('DELETE FROM dynamic_squad_tools WHERE name = ? AND squad_slug = ?').run(toolName, squadSlug);
  logger.log(`Deleted tool "${toolName}" from squad "${squadSlug}"`);
  return { ok: true, deleted: toolName };
}

async function runSquadToolRegister({ args, options = {}, logger }) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const squadSlug = String(options.squad || '').trim();

  if (!squadSlug) {
    logger.error('Error: --squad is required');
    return { ok: false, error: 'missing_squad' };
  }

  const handle = await openRuntimeDb(projectDir);
  if (!handle) {
    logger.error('Runtime database unavailable. Run: aioson runtime:init .');
    return { ok: false, error: 'no_db' };
  }
  const { db } = handle;

  try {
    // List mode
    if (options.list) {
      return handleList(db, squadSlug, logger);
    }

    const toolName = String(options.name || '').trim();
    if (!toolName) {
      logger.error('Error: --name is required');
      return { ok: false, error: 'missing_name' };
    }

    // Delete mode
    if (options.delete) {
      return handleDelete(db, squadSlug, toolName, logger);
    }

    // Register mode
    const description = String(options.description || options.desc || '').trim();
    if (!description) {
      logger.error('Error: --description is required');
      return { ok: false, error: 'missing_description' };
    }

    const handlerType = String(options['handler-type'] || options.handlerType || 'shell').trim();
    const handlerCode = String(options.handler || options['handler-code'] || '').trim() || null;
    const handlerPath = String(options['handler-path'] || options.handlerPath || '').trim() || null;

    if (!handlerCode && !handlerPath) {
      logger.error('Error: --handler (shell command) or --handler-path (script path) is required');
      return { ok: false, error: 'missing_handler' };
    }

    let inputSchema = '{}';
    if (options['input-schema'] || options.inputSchema) {
      try {
        const raw = String(options['input-schema'] || options.inputSchema);
        JSON.parse(raw); // validate
        inputSchema = raw;
      } catch {
        logger.error('Error: --input-schema must be valid JSON');
        return { ok: false, error: 'invalid_input_schema' };
      }
    }

    const registeredBy = String(options['registered-by'] || options.registeredBy || '').trim() || null;

    db.prepare(`
      INSERT INTO dynamic_squad_tools
        (name, squad_slug, description, input_schema, handler_type, handler_code, handler_path, registered_at, registered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name, squad_slug) DO UPDATE SET
        description = excluded.description,
        input_schema = excluded.input_schema,
        handler_type = excluded.handler_type,
        handler_code = excluded.handler_code,
        handler_path = excluded.handler_path,
        registered_at = excluded.registered_at,
        registered_by = excluded.registered_by
    `).run(toolName, squadSlug, description, inputSchema, handlerType, handlerCode, handlerPath, nowIso(), registeredBy);

    logger.log(`✓ Tool "${toolName}" registered for squad "${squadSlug}"`);
    logger.log(`  Type: ${handlerType}`);
    logger.log(`  Description: ${description}`);
    if (handlerCode) logger.log(`  Handler: ${handlerCode.slice(0, 80)}${handlerCode.length > 80 ? '...' : ''}`);
    if (handlerPath) logger.log(`  Script: ${handlerPath}`);
    logger.log('');
    logger.log('Executors can request this tool via the bus (type: tool_request):');
    logger.log(`  { "type": "tool_request", "content": "run:${toolName}", "metadata": { "input": "..." } }`);

    return { ok: true, tool: { name: toolName, squad: squadSlug, handlerType, description } };
  } finally {
    db.close();
  }
}

module.exports = { runSquadToolRegister };
