'use strict';

const path = require('node:path');
const {
  openRuntimeDb,
  upsertSquadMetric,
  listSquadMetrics,
  upsertROIConfig,
  getROIConfig
} = require('../runtime-store');

async function runSquadRoi({ args, options, logger, t }) {
  const projectDir = path.resolve(args[0] || options.path || '.');
  const squadSlug = options.squad;
  const sub = options.sub || 'report';

  if (!squadSlug) {
    logger.log(t('squad_roi.squad_required'));
    return { ok: false, error: 'squad_required' };
  }

  if (sub === 'config') {
    return handleConfig({ projectDir, squadSlug, options, logger, t });
  }
  if (sub === 'metric') {
    return handleMetric({ projectDir, squadSlug, options, logger, t });
  }
  if (sub === 'report') {
    return handleReport({ projectDir, squadSlug, options, logger, t });
  }
  if (sub === 'export') {
    return handleExport({ projectDir, squadSlug, options, logger, t });
  }

  logger.log(t('squad_roi.unknown_sub', { sub }));
  return { ok: false, error: 'unknown_sub' };
}

async function handleConfig({ projectDir, squadSlug, options, logger, t }) {
  const handle = await openRuntimeDb(projectDir);

  upsertROIConfig(handle.db, {
    squadSlug,
    pricingModel: options.pricing || options.pricing_model,
    setupFee: options.setup ? parseFloat(options.setup) : undefined,
    monthlyFee: options.monthly ? parseFloat(options.monthly) : undefined,
    percentageFee: options.percentage ? parseFloat(options.percentage) : undefined,
    percentageBase: options.base,
    currency: options.currency,
    contractMonths: options.months ? parseInt(options.months, 10) : undefined
  });

  const config = getROIConfig(handle.db, squadSlug);
  handle.db.close();

  logger.log(t('squad_roi.config_saved', { squad: squadSlug }));
  logger.log(`  ${t('squad_roi.pricing_model')}: ${config.pricing_model}`);
  if (config.setup_fee) logger.log(`  ${t('squad_roi.setup_fee')}: ${config.currency} ${config.setup_fee}`);
  if (config.monthly_fee) logger.log(`  ${t('squad_roi.monthly_fee')}: ${config.currency} ${config.monthly_fee}`);
  if (config.percentage_fee) logger.log(`  ${t('squad_roi.percentage')}: ${config.percentage_fee}% (${config.percentage_base || 'n/a'})`);
  logger.log(`  ${t('squad_roi.contract')}: ${config.contract_months} months`);

  return { ok: true, config };
}

async function handleMetric({ projectDir, squadSlug, options, logger, t }) {
  const key = options.key;
  const value = options.value;
  const period = options.period;

  if (!key || value === undefined) {
    logger.log(t('squad_roi.metric_required'));
    return { ok: false, error: 'metric_required' };
  }

  const handle = await openRuntimeDb(projectDir);
  upsertSquadMetric(handle.db, {
    squadSlug,
    metricKey: key,
    value: parseFloat(value),
    unit: options.unit || null,
    period: period || null,
    baseline: options.baseline ? parseFloat(options.baseline) : null,
    target: options.target ? parseFloat(options.target) : null,
    source: options.source || 'manual',
    notes: options.notes || null
  });
  handle.db.close();

  logger.log(t('squad_roi.metric_saved', { key, value, squad: squadSlug }));
  return { ok: true, key, value: parseFloat(value), period };
}

function calculateROI(metrics, config) {
  if (!config) return null;

  const improvements = [];
  for (const m of metrics) {
    if (m.baseline === null || m.baseline === undefined) continue;
    const improvement = m.baseline - m.metric_value;
    improvements.push({
      key: m.metric_key,
      baseline: m.baseline,
      actual: m.metric_value,
      target: m.target,
      improvement,
      unit: m.metric_unit,
      period: m.period
    });
  }

  const monthlyCost = (config.monthly_fee || 0) + ((config.setup_fee || 0) / (config.contract_months || 12));

  return {
    improvements,
    monthly_cost: monthlyCost,
    pricing: {
      model: config.pricing_model,
      setup_fee: config.setup_fee,
      monthly_fee: config.monthly_fee,
      percentage_fee: config.percentage_fee,
      currency: config.currency
    }
  };
}

async function handleReport({ projectDir, squadSlug, options, logger, t }) {
  const handle = await openRuntimeDb(projectDir);
  const config = getROIConfig(handle.db, squadSlug);
  const metrics = listSquadMetrics(handle.db, squadSlug);
  handle.db.close();

  if (metrics.length === 0) {
    logger.log(t('squad_roi.no_metrics', { squad: squadSlug }));
    return { ok: true, metrics: [], roi: null };
  }

  const period = options.period || null;
  const filtered = period ? metrics.filter(m => m.period === period) : metrics;

  logger.log(t('squad_roi.report_title', { squad: squadSlug }));
  logger.log('');

  // Group by metric_key
  const byKey = {};
  for (const m of filtered) {
    if (!byKey[m.metric_key]) byKey[m.metric_key] = [];
    byKey[m.metric_key].push(m);
  }

  for (const [key, entries] of Object.entries(byKey)) {
    const latest = entries[entries.length - 1];
    logger.log(`  ${key}`);
    if (latest.baseline !== null) {
      logger.log(`    ${t('squad_roi.baseline')}: ${latest.baseline}${latest.metric_unit || ''}`);
    }
    logger.log(`    ${t('squad_roi.actual')}: ${latest.metric_value}${latest.metric_unit || ''}`);
    if (latest.target !== null) {
      logger.log(`    ${t('squad_roi.target')}: ${latest.target}${latest.metric_unit || ''}`);
      // Progress bar
      if (latest.baseline !== null && latest.baseline !== latest.target) {
        const totalGap = Math.abs(latest.baseline - latest.target);
        const achieved = Math.abs(latest.baseline - latest.metric_value);
        const pct = Math.min(100, Math.round((achieved / totalGap) * 100));
        const filled = Math.round(pct / 5);
        const bar = '#'.repeat(filled) + '.'.repeat(20 - filled);
        logger.log(`    [${bar}] ${pct}%`);
      }
    }
    if (latest.period) {
      logger.log(`    ${t('squad_roi.period')}: ${latest.period}`);
    }
    logger.log('');
  }

  const roi = calculateROI(filtered, config);
  if (roi && config) {
    logger.log(t('squad_roi.cost_section'));
    logger.log(`  ${t('squad_roi.monthly_cost')}: ${config.currency} ${roi.monthly_cost.toFixed(2)}`);
  }

  return { ok: true, metrics: filtered, roi };
}

function renderReportHtml(squadSlug, metrics, config) {
  const roi = calculateROI(metrics, config);
  const currency = (config && config.currency) || 'BRL';

  const byKey = {};
  for (const m of metrics) {
    if (!byKey[m.metric_key]) byKey[m.metric_key] = [];
    byKey[m.metric_key].push(m);
  }

  const metricsHtml = Object.entries(byKey).map(([key, entries]) => {
    const latest = entries[entries.length - 1];
    let progressBar = '';
    if (latest.baseline !== null && latest.target !== null && latest.baseline !== latest.target) {
      const totalGap = Math.abs(latest.baseline - latest.target);
      const achieved = Math.abs(latest.baseline - latest.metric_value);
      const pct = Math.min(100, Math.round((achieved / totalGap) * 100));
      progressBar = `<div style="background:#333;border-radius:4px;overflow:hidden;height:8px;margin-top:4px">
        <div style="background:#4ade80;height:100%;width:${pct}%"></div>
      </div><small>${pct}% of target</small>`;
    }
    return `<div style="background:#1e1e2e;padding:16px;border-radius:8px;margin-bottom:12px">
      <h3 style="margin:0 0 8px">${esc(key)}</h3>
      ${latest.baseline !== null ? `<p>Baseline: <strong>${latest.baseline}${latest.metric_unit || ''}</strong></p>` : ''}
      <p>Current: <strong>${latest.metric_value}${latest.metric_unit || ''}</strong></p>
      ${latest.target !== null ? `<p>Target: <strong>${latest.target}${latest.metric_unit || ''}</strong></p>` : ''}
      ${progressBar}
      ${latest.period ? `<small>Period: ${esc(latest.period)}</small>` : ''}
    </div>`;
  }).join('\n');

  const costHtml = roi && config ? `
    <div style="background:#1e1e2e;padding:16px;border-radius:8px;margin-top:16px">
      <h3>Cost Summary</h3>
      <p>Pricing: ${esc(config.pricing_model)}</p>
      ${config.setup_fee ? `<p>Setup: ${currency} ${config.setup_fee}</p>` : ''}
      ${config.monthly_fee ? `<p>Monthly: ${currency} ${config.monthly_fee}</p>` : ''}
      <p>Monthly effective cost: <strong>${currency} ${roi.monthly_cost.toFixed(2)}</strong></p>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ROI Report — ${esc(squadSlug)}</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;margin:0;padding:24px}
  .container{max-width:720px;margin:0 auto}
  h1{border-bottom:1px solid #30363d;padding-bottom:12px}
  h3{color:#58a6ff}
  p{margin:4px 0}
  small{color:#8b949e}
</style>
</head>
<body>
<div class="container">
  <h1>ROI Report — ${esc(squadSlug)}</h1>
  <p style="color:#8b949e">Generated: ${new Date().toISOString().slice(0, 10)}</p>
  <h2>Metrics</h2>
  ${metricsHtml}
  ${costHtml}
  <footer style="margin-top:32px;color:#8b949e;font-size:12px">
    Generated by aioson squad:roi:export
  </footer>
</div>
</body>
</html>`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function handleExport({ projectDir, squadSlug, options, logger, t }) {
  const format = options.format || 'html';
  const handle = await openRuntimeDb(projectDir);
  const config = getROIConfig(handle.db, squadSlug);
  const metrics = listSquadMetrics(handle.db, squadSlug);
  handle.db.close();

  if (metrics.length === 0) {
    logger.log(t('squad_roi.no_metrics', { squad: squadSlug }));
    return { ok: true, exported: false };
  }

  const period = options.period || null;
  const filtered = period ? metrics.filter(m => m.period === period) : metrics;

  if (format === 'json') {
    const roi = calculateROI(filtered, config);
    const output = JSON.stringify({ squad: squadSlug, metrics: filtered, roi, config }, null, 2);
    logger.log(output);
    return { ok: true, exported: true, format: 'json' };
  }

  // HTML
  const html = renderReportHtml(squadSlug, filtered, config);
  const fs = require('node:fs/promises');
  const outFile = options.output || `roi-report-${squadSlug}.html`;
  await fs.writeFile(outFile, html);
  logger.log(t('squad_roi.exported', { file: outFile, format: 'html' }));
  return { ok: true, exported: true, format: 'html', file: outFile };
}

module.exports = { runSquadRoi, calculateROI, renderReportHtml, esc };
