'use strict';

const { createDashboardServer } = require('../squad-dashboard/server');
const { resolveTargetDir } = require('../lib/project-root');

async function runSquadDashboard({ args, options, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const port = Number(options.port) || 4180;
  const filterSquad = options.squad || null;

  const dashboard = createDashboardServer(targetDir, { port, squad: filterSquad });

  try {
    const info = await dashboard.start();
    logger.log(t('squad_dashboard.started', { url: info.url, port: info.port }));
    if (filterSquad) {
      logger.log(t('squad_dashboard.filtered', { squad: filterSquad }));
    }
    logger.log(t('squad_dashboard.stop_hint'));

    // Keep the process alive until SIGINT/SIGTERM
    await new Promise((resolve) => {
      process.on('SIGINT', resolve);
      process.on('SIGTERM', resolve);
    });

    logger.log(t('squad_dashboard.stopping'));
    await dashboard.stop();
    return { ok: true, port: info.port, url: info.url };
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      logger.error(t('squad_dashboard.port_in_use', { port }));
      return { ok: false, error: `Port ${port} already in use` };
    }
    throw err;
  }
}

module.exports = { runSquadDashboard };
