'use strict';

const path = require('node:path');
const {
  getContextUsage,
  computeWarningLevel,
  THRESHOLDS
} = require('../squad-dashboard/context-monitor');

const BAR_WIDTH = 20;
const LEVEL_ICONS = { normal: ' ', warning: '⚠', critical: '!', overflow: 'X', unknown: '?' };

function renderBar(ratio, width) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}] ${Math.round(clamped * 100)}%`;
}

function formatTokens(n) {
  if (typeof n !== 'number') return '?';
  return n.toLocaleString();
}

function renderAgent(slug, agent) {
  const used = agent.totalUsed || 0;
  const win = agent.windowSize || 0;
  const ratio = win > 0 ? used / win : 0;
  const level = agent.warningLevel || computeWarningLevel(used, win);
  const icon = LEVEL_ICONS[level] || '?';
  const bar = renderBar(ratio, BAR_WIDTH);
  const line = `  ${icon} ${slug.padEnd(16)} ${bar}  ${formatTokens(used)}/${formatTokens(win)}`;
  if (level === 'warning' || level === 'critical' || level === 'overflow') {
    return `${line}  [${level.toUpperCase()}]`;
  }
  return line;
}

async function runContextMonitor({ args, options, logger }) {
  const cwd = path.resolve(process.cwd(), args[0] || '.');
  const squadSlug = options.squad || null;
  const agentSlug = options.agent || null;

  if (!squadSlug) {
    logger.log('\n  Context Monitor\n');
    logger.log('  No squad specified. Use --squad=<slug> to monitor a squad.');
    logger.log('  Example: aioson context:monitor . --squad=my-squad');
    logger.log('');
    return { ok: true, squads: [] };
  }

  const data = await getContextUsage(cwd, squadSlug, agentSlug || null);

  if (!data) {
    logger.log(`\n  No context data found for squad: ${squadSlug}`);
    logger.log('  The squad may not have started yet or context-monitor.json is missing.');
    logger.log('');
    return { ok: true, squadSlug, agents: {} };
  }

  if (options.json) {
    return { ok: true, ...data };
  }

  logger.log(`\n  Context Monitor — ${squadSlug}\n`);

  if (agentSlug) {
    // Single agent
    const agent = data;
    logger.log(renderAgent(agentSlug, agent));
  } else {
    const agents = data.agents || {};
    if (Object.keys(agents).length === 0) {
      logger.log('  No agents tracked yet.');
    } else {
      for (const [slug, agent] of Object.entries(agents)) {
        logger.log(renderAgent(slug, agent));
      }
    }
  }

  logger.log('');
  logger.log(`  Thresholds: warning=${Math.round(THRESHOLDS.warning * 100)}%  critical=${Math.round(THRESHOLDS.critical * 100)}%`);
  if (data.updatedAt) {
    logger.log(`  Updated: ${data.updatedAt}`);
  }
  logger.log('');

  return { ok: true, ...data };
}

module.exports = { runContextMonitor };
