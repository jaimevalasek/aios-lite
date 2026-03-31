'use strict';

const path = require('node:path');
const {
  openRuntimeDb,
  registerDynamicTool,
  unregisterDynamicTool,
  getDynamicTool,
  listDynamicTools
} = require('../runtime-store');
const { executeTool } = require('../tool-executor');

const TOOL_NAME_RE = /^[a-z][a-z0-9_]*$/;

async function runToolRegistry({ args = [], options = {}, logger = console, t = (k) => k } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const sub = options.sub || 'list';

  if (sub === 'register') return handleRegister(projectDir, options, logger);
  if (sub === 'list') return handleList(projectDir, options, logger);
  if (sub === 'call') return handleCall(projectDir, options, logger);
  if (sub === 'unregister') return handleUnregister(projectDir, options, logger);
  if (sub === 'show') return handleShow(projectDir, options, logger);

  logger.error(`Subcomando desconhecido: ${sub}. Disponíveis: register, list, call, unregister, show`);
  return { ok: false, error: 'unknown_sub' };
}

async function handleRegister(projectDir, options, logger) {
  const name = String(options.name || '').trim();
  const description = String(options.description || options.desc || '').trim();
  const handlerType = String(options.type || 'shell').trim();
  const handlerCode = options.cmd ? String(options.cmd) : null;
  const handlerPath = options.path ? String(options.path) : null;
  const squadSlug = options.squad ? String(options.squad) : null;
  const registeredBy = options.by ? String(options.by) : null;

  if (!name) {
    logger.error('--name é obrigatório');
    return { ok: false, error: 'name_required' };
  }
  if (!TOOL_NAME_RE.test(name) || name.length > 64) {
    logger.error(`Nome inválido: "${name}". Use apenas letras minúsculas, números e _ (máx 64 chars, começando com letra)`);
    return { ok: false, error: 'invalid_name' };
  }
  if (!description) {
    logger.error('--description é obrigatório');
    return { ok: false, error: 'description_required' };
  }
  if (!['shell', 'script'].includes(handlerType)) {
    logger.error('--type deve ser "shell" ou "script"');
    return { ok: false, error: 'invalid_type' };
  }
  if (handlerType === 'shell' && !handlerCode) {
    logger.error('--cmd é obrigatório para tools do tipo shell');
    return { ok: false, error: 'cmd_required' };
  }
  if (handlerType === 'script' && !handlerPath) {
    logger.error('--path é obrigatório para tools do tipo script');
    return { ok: false, error: 'path_required' };
  }

  const handle = await openRuntimeDb(projectDir);
  if (!handle) {
    logger.error('Runtime store não encontrado. Execute aioson runtime:init primeiro.');
    return { ok: false, error: 'no_runtime' };
  }
  const { db } = handle;

  try {
    registerDynamicTool(db, {
      name,
      description,
      handlerType,
      handlerCode,
      handlerPath,
      squadSlug,
      registeredBy
    });
    logger.log(`Tool registrada: ${name} (${handlerType})`);
    return { ok: true, name, handlerType };
  } finally {
    db.close();
  }
}

async function handleList(projectDir, options, logger) {
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.log('Nenhum runtime store encontrado.');
    return { ok: true, tools: [] };
  }
  const { db } = handle;

  try {
    const tools = listDynamicTools(db, options.squad || null);
    if (tools.length === 0) {
      logger.log('Nenhuma tool registrada neste projeto.');
      return { ok: true, tools: [] };
    }

    logger.log(`Tools registradas (${tools.length}):`);
    logger.log('');
    for (const tool of tools) {
      const scope = tool.squad_slug ? ` [squad:${tool.squad_slug}]` : '';
      logger.log(`  ${tool.name}${scope}`);
      logger.log(`    ${tool.description}`);
      logger.log(`    tipo: ${tool.handler_type} | registrada: ${tool.registered_at.slice(0, 10)}`);
      logger.log('');
    }
    return { ok: true, tools };
  } finally {
    db.close();
  }
}

async function handleCall(projectDir, options, logger) {
  const name = String(options.name || '').trim();
  if (!name) {
    logger.error('--name é obrigatório');
    return { ok: false, error: 'name_required' };
  }

  let input = {};
  if (options.input) {
    try {
      input = JSON.parse(String(options.input));
    } catch {
      logger.error('--input deve ser JSON válido');
      return { ok: false, error: 'invalid_input' };
    }
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error('Runtime store não encontrado.');
    return { ok: false, error: 'no_runtime' };
  }
  const { db } = handle;

  let tool;
  try {
    tool = getDynamicTool(db, name);
  } finally {
    db.close();
  }

  if (!tool) {
    logger.error(`Tool não encontrada: ${name}`);
    return { ok: false, error: 'tool_not_found' };
  }

  const timeoutMs = options.timeout ? Number(options.timeout) * 1000 : undefined;
  const result = executeTool(tool, input, { projectDir, timeoutMs });

  if (result.stdout) logger.log(result.stdout);
  if (result.stderr) logger.error(result.stderr);

  if (!result.ok) {
    logger.error(`Tool falhou (exit ${result.exitCode})${result.error ? `: ${result.error}` : ''}`);
    return { ok: false, exitCode: result.exitCode, error: result.error };
  }

  return { ok: true, exitCode: result.exitCode, stdout: result.stdout };
}

async function handleUnregister(projectDir, options, logger) {
  const name = String(options.name || '').trim();
  if (!name) {
    logger.error('--name é obrigatório');
    return { ok: false, error: 'name_required' };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error('Runtime store não encontrado.');
    return { ok: false, error: 'no_runtime' };
  }
  const { db } = handle;

  try {
    const tool = getDynamicTool(db, name);
    if (!tool) {
      logger.error(`Tool não encontrada: ${name}`);
      return { ok: false, error: 'tool_not_found' };
    }

    unregisterDynamicTool(db, name);
    logger.log(`Tool removida: ${name}`);
    return { ok: true, name };
  } finally {
    db.close();
  }
}

async function handleShow(projectDir, options, logger) {
  const name = String(options.name || '').trim();
  if (!name) {
    logger.error('--name é obrigatório');
    return { ok: false, error: 'name_required' };
  }

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error('Runtime store não encontrado.');
    return { ok: false, error: 'no_runtime' };
  }
  const { db } = handle;

  try {
    const tool = getDynamicTool(db, name);
    if (!tool) {
      logger.error(`Tool não encontrada: ${name}`);
      return { ok: false, error: 'tool_not_found' };
    }

    logger.log(`Tool: ${tool.name}`);
    logger.log(`Descrição: ${tool.description}`);
    logger.log(`Tipo: ${tool.handler_type}`);
    if (tool.handler_code) logger.log(`Comando: ${tool.handler_code}`);
    if (tool.handler_path) logger.log(`Script: ${tool.handler_path}`);
    if (tool.squad_slug) logger.log(`Squad: ${tool.squad_slug}`);
    if (tool.registered_by) logger.log(`Registrada por: ${tool.registered_by}`);
    logger.log(`Registrada em: ${tool.registered_at}`);

    return { ok: true, tool };
  } finally {
    db.close();
  }
}

module.exports = { runToolRegistry };
