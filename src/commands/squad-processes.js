'use strict';

const { getActiveProcesses, stopProcess, stopSquadProcesses } = require('../squad-dashboard/process-monitor');
const { resolveTargetDir } = require('../lib/project-root');

function formatElapsed(seconds) {
  if (seconds == null) return '-';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
}

async function runSquadProcesses({ args, options, logger }) {
  const projectDir = resolveTargetDir(args);
  const squadFilter = options.squad || null;

  // --stop <pid>
  if (options.stop && options.stop !== true) {
    const result = await stopProcess(projectDir, options.stop);
    if (result.ok) {
      logger.log(`Process ${options.stop} stopped.`);
    } else {
      logger.error(`Failed to stop ${options.stop}: ${result.error}`);
    }
    return result;
  }

  // --stop-squad <squad>
  if (options['stop-squad']) {
    const slug = options['stop-squad'];
    const results = await stopSquadProcesses(projectDir, slug);
    const stopped = results.filter(r => r.ok).length;
    logger.log(`Stopped ${stopped}/${results.length} processes for squad "${slug}".`);
    return { ok: true, results };
  }

  // List
  const processes = await getActiveProcesses(projectDir, squadFilter);
  if (processes.length === 0) {
    logger.log(squadFilter ? `No active processes for squad "${squadFilter}".` : 'No active processes.');
    return { ok: true, processes: [] };
  }

  logger.log(`Active processes (${processes.length}):`);
  for (const proc of processes) {
    const status = proc.alive ? '[*]' : '[ ]';
    const elapsed = formatElapsed(proc.elapsedSeconds);
    const ctx = proc.contextPct != null ? ` ctx:${proc.contextPct}%` : '';
    const url = proc.url ? `  ${proc.url}` : '';
    logger.log(`  ${status} [${proc.squadSlug}] ${proc.agentSlug}  pid:${proc.pid}  elapsed:${elapsed}${ctx}${url}`);
  }

  return { ok: true, processes };
}

module.exports = { runSquadProcesses };
