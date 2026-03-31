'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { openRuntimeDb, listSquadLearnings, listProjectLearnings, listDynamicTools } = require('../runtime-store');

const MIN_FREQUENCY = 2;
const INACTIVITY_DAYS = 14;
const EVOLUTION_DIR = path.join('.aioson', 'evolution');

/**
 * Verifica se há tools com handlers inválidos.
 */
async function checkBrokenTools(tools, projectDir) {
  const broken = [];
  for (const tool of tools) {
    if (tool.handler_type === 'script' && tool.handler_path) {
      const absPath = path.isAbsolute(tool.handler_path)
        ? tool.handler_path
        : path.resolve(projectDir, tool.handler_path);
      try {
        await fs.access(absPath);
      } catch {
        broken.push(tool.name);
      }
    }
  }
  return broken;
}

/**
 * Conta learnings prontos para evoluir.
 */
function countEvolvablelearnings(db) {
  const squadLearnings = listSquadLearnings(db, null, 'active').filter(
    (l) => Number(l.frequency || 1) >= MIN_FREQUENCY
  );
  const projectLearnings = listProjectLearnings(db, 'active').filter(
    (l) => Number(l.frequency || 1) >= MIN_FREQUENCY
  );
  return squadLearnings.length + projectLearnings.length;
}

/**
 * Verifica squads inativos (sem sessão recente).
 */
function getInactiveSquads(db) {
  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rows = db.prepare(`
    SELECT squad_slug, updated_at FROM squads
    WHERE status = 'active' AND (updated_at IS NULL OR updated_at < ?)
    ORDER BY updated_at ASC
    LIMIT 5
  `).all(cutoff);
  return rows;
}

/**
 * Conta arquivos pendentes de evolução.
 */
async function countPendingEvolutions(projectDir) {
  const evolutionDir = path.resolve(projectDir, EVOLUTION_DIR);
  try {
    const files = await fs.readdir(evolutionDir);
    return files.filter((f) => f.startsWith('pending-') && f.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

/**
 * Comando principal: aioson health [project-dir]
 */
async function runHealth({ args = [], options = {}, logger = console } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const quiet = Boolean(options.quiet);
  const json = Boolean(options.json);

  const handle = await openRuntimeDb(projectDir, { mustExist: true });

  const report = {
    ok: true,
    projectDir,
    items: [],
    evolvableLearnings: 0,
    brokenTools: [],
    inactiveSquads: [],
    pendingEvolutions: 0,
    hasRuntimeStore: Boolean(handle)
  };

  if (!handle) {
    if (!json && !quiet) {
      logger.log('AIOSON Health — nenhum runtime store encontrado neste projeto.');
      logger.log('Execute: aioson runtime:init .');
    }
    return report;
  }

  const { db } = handle;

  try {
    // 1. Learnings evoluíveis
    report.evolvableLearnings = countEvolvablelearnings(db);
    if (report.evolvableLearnings > 0) {
      report.items.push({
        type: 'learnings',
        level: 'info',
        message: `${report.evolvableLearnings} learning(s) prontos para evoluir`,
        action: 'aioson learning:evolve .'
      });
    }

    // 2. Squads inativos
    const inactiveSquads = getInactiveSquads(db);
    report.inactiveSquads = inactiveSquads.map((s) => s.squad_slug);
    if (inactiveSquads.length > 0) {
      for (const squad of inactiveSquads) {
        const days = squad.updated_at
          ? Math.floor((Date.now() - new Date(squad.updated_at).getTime()) / (1000 * 60 * 60 * 24))
          : '?';
        report.items.push({
          type: 'squad_inactive',
          level: 'warn',
          message: `Squad "${squad.squad_slug}" inativo há ${days} dia(s)`,
          action: null
        });
      }
    }

    // 3. Dynamic tools com handlers quebrados
    const tools = listDynamicTools(db, null);
    const broken = await checkBrokenTools(tools, projectDir);
    report.brokenTools = broken;
    if (broken.length > 0) {
      report.items.push({
        type: 'broken_tools',
        level: 'error',
        message: `${broken.length} tool(s) com handler inválido: ${broken.join(', ')}`,
        action: 'aioson tool:unregister . --name=<nome>'
      });
    }

    // 4. Evoluções pendentes
    report.pendingEvolutions = await countPendingEvolutions(projectDir);
    if (report.pendingEvolutions > 0) {
      report.items.push({
        type: 'pending_evolutions',
        level: 'info',
        message: `${report.pendingEvolutions} proposta(s) de evolução aguardando revisão`,
        action: `aioson learning:apply . --file=.aioson/evolution/pending-XXX.json`
      });
    }
  } finally {
    db.close();
  }

  if (json) return report;

  // Output formatado
  if (report.items.length === 0) {
    if (!quiet) logger.log('AIOSON Health — tudo em ordem. Nenhum item pendente.');
    return report;
  }

  logger.log('');
  logger.log('AIOSON Health — itens que precisam de atenção:');
  logger.log('');

  const icons = { info: '●', warn: '○', error: '✗' };
  for (const item of report.items) {
    const icon = icons[item.level] || '●';
    logger.log(`  ${icon} ${item.message}`);
    if (item.action) logger.log(`    → ${item.action}`);
  }
  logger.log('');

  return report;
}

/**
 * Versão compacta para injeção silenciosa no live:start e live:close.
 * Retorna string de aviso ou null se tudo ok.
 */
async function getHealthDigest(projectDir) {
  try {
    const handle = await openRuntimeDb(projectDir, { mustExist: true });
    if (!handle) return null;

    const { db } = handle;
    const items = [];

    try {
      const count = countEvolvablelearnings(db);
      if (count > 0) items.push(`${count} learning(s) prontos para evoluir`);

      const tools = listDynamicTools(db, null);
      const broken = await checkBrokenTools(tools, projectDir);
      if (broken.length > 0) items.push(`${broken.length} tool(s) com handler quebrado`);

      const pending = await countPendingEvolutions(projectDir);
      if (pending > 0) items.push(`${pending} evolução(ões) pendente(s)`);
    } finally {
      db.close();
    }

    if (items.length === 0) return null;
    return items;
  } catch {
    return null;
  }
}

module.exports = { runHealth, getHealthDigest };
