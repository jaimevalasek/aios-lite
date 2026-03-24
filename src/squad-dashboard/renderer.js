'use strict';

const { getInlineCSS, getInlineJS } = require('./styles');

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function modeBadge(mode) {
  const cls = ({ content: 'badge-content', software: 'badge-software', research: 'badge-research' })[mode] || 'badge-mixed';
  return `<span class="badge ${cls}">${esc(mode)}</span>`;
}

function statusDot(status) {
  const cls = ({
    active: 'status-active', completed: 'status-active',
    stale: 'status-stale', running: 'status-stale',
    error: 'status-error', failed: 'status-error'
  })[status] || 'status-inactive';
  return `<span class="status-dot ${cls}"></span>`;
}

function progressBar(current, total) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
  <div class="sub">${current}/${total} (${pct}%)</div>`;
}

// --- Page layouts ---

function renderLayout(title, sidebarHTML, mainHTML, squadSlug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} - Squad Dashboard</title>
  <style>${getInlineCSS()}</style>
</head>
<body data-squad="${esc(squadSlug || '')}">
  <div class="layout">
    <nav class="sidebar">
      <h1>Squad Dashboard</h1>
      ${sidebarHTML}
    </nav>
    <div class="main">
      ${mainHTML}
    </div>
  </div>
  <script>${getInlineJS()}</script>
</body>
</html>`;
}

function renderSquadSidebar(squads, activeSlug) {
  if (!squads || squads.length === 0) {
    return '<div style="padding:20px;color:var(--text-muted)">No squads found</div>';
  }
  return squads.map(s => {
    const active = s.slug === activeSlug ? ' active' : '';
    const mode = s.mode ? `<span class="squad-mode">${esc(s.mode)}</span>` : '';
    return `<a href="/squad/${esc(s.slug)}" class="${active}">${esc(s.name || s.slug)}${mode}</a>`;
  }).join('\n');
}

// --- Home page (list of squads) ---

function renderHomePage(squads) {
  const sidebar = renderSquadSidebar(squads, null);
  let main;
  if (!squads || squads.length === 0) {
    main = `<div class="empty"><h3>No squads found</h3><p>Create a squad with <code>@squad design &lt;slug&gt;</code></p></div>`;
  } else {
    const rows = squads.map(s => `
      <tr>
        <td><a href="/squad/${esc(s.slug)}">${esc(s.name || s.slug)}</a></td>
        <td>${modeBadge(s.mode)}</td>
        <td>${esc(s.goal || '-')}</td>
        <td>${s.executorCount || 0}</td>
        <td>${esc(s.status || 'active')}</td>
      </tr>
    `).join('');
    main = `
      <div class="page-header"><h2>All Squads</h2><span class="badge badge-mixed">${squads.length} squads</span></div>
      <div class="card">
        <table>
          <thead><tr><th>Squad</th><th>Mode</th><th>Goal</th><th>Executors</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }
  return renderLayout('All Squads', sidebar, main, '');
}

// --- Squad detail page ---

function renderSquadPage(squad, panels, data, allSquads) {
  const sidebar = renderSquadSidebar(allSquads, squad.slug);

  const tabButtons = panels.map((p, i) =>
    `<button class="tab${i === 0 ? ' active' : ''}" data-tab="panel-${p}">${panelLabel(p)}</button>`
  ).join('');

  const tabContents = panels.map((p, i) =>
    `<div id="panel-${p}" class="tab-content${i === 0 ? ' active' : ''}">${renderPanel(p, data, squad)}</div>`
  ).join('');

  const main = `
    <div class="page-header">
      <h2>${esc(squad.name || squad.slug)} ${modeBadge(squad.mode)}</h2>
    </div>
    <div class="tab-group">
      <div class="tabs">${tabButtons}</div>
      ${tabContents}
    </div>`;

  return renderLayout(squad.name || squad.slug, sidebar, main, squad.slug);
}

function panelLabel(panel) {
  const labels = {
    overview: 'Overview',
    content: 'Content',
    learnings: 'Learnings',
    logs: 'Events',
    'content-preview': 'Preview',
    tasks: 'Tasks',
    'code-output': 'Code',
    integrations: 'Integrations',
    channels: 'Channels',
    pipeline: 'Pipeline',
    metrics: 'Metrics'
  };
  return labels[panel] || panel;
}

function renderPanel(panel, data, squad) {
  switch (panel) {
    case 'overview': return renderOverview(data);
    case 'content': return renderContentPanel(data);
    case 'learnings': return renderLearningsPanel(data);
    case 'logs': return renderEventsPanel(data);
    case 'pipeline': return renderPipelinePanel(data);
    case 'integrations': return renderIntegrationsPanel(squad, data);
    case 'metrics': return renderMetricsPanel(data);
    default: return `<div class="empty"><h3>${esc(panelLabel(panel))}</h3><p>Coming soon</p></div>`;
  }
}

// --- Overview panel ---

function renderOverview(data) {
  const ov = data.overview || {};
  const cards = [
    { label: 'Content Items', value: ov.contentItems || 0 },
    { label: 'Sessions', value: ov.sessions || 0 },
    { label: 'Learnings', value: ov.learnings || 0 },
    { label: 'Delivery Rate', value: ov.deliveryRate != null ? `${ov.deliveryRate}%` : 'N/A' }
  ];

  let html = `<div class="grid grid-4">${cards.map(c => `
    <div class="card">
      <h3>${esc(c.label)}</h3>
      <div class="value" id="metric-${c.label.toLowerCase().replace(/\s+/g, '_')}">${esc(String(c.value))}</div>
    </div>`).join('')}</div>`;

  // Execution plan progress
  const plan = ov.executionPlan;
  if (plan) {
    html += `<div class="card" style="margin-top:16px">
      <h3>Execution Plan</h3>
      <div style="font-size:14px">${statusDot(plan.status)} ${esc(plan.plan_slug)} (${esc(plan.status)})</div>
      ${progressBar(plan.rounds_completed, plan.rounds_total)}
    </div>`;
  }

  // Learning stats
  const ls = ov.learningStats;
  if (ls && (ls.active + ls.stale + ls.archived + ls.promoted) > 0) {
    html += `<div class="card" style="margin-top:16px">
      <h3>Learning Stats</h3>
      <div class="grid grid-4" style="margin-top:8px">
        <div>${statusDot('active')} Active: ${ls.active}</div>
        <div>${statusDot('stale')} Stale: ${ls.stale}</div>
        <div>${statusDot('inactive')} Archived: ${ls.archived}</div>
        <div>${statusDot('completed')} Promoted: ${ls.promoted}</div>
      </div>
    </div>`;
  }

  return html;
}

// --- Content panel ---

function renderContentPanel(data) {
  const items = data.content || [];
  if (items.length === 0) {
    return '<div class="empty"><h3>No content items</h3><p>Content will appear here after squad execution</p></div>';
  }
  const rows = items.map(item => `
    <tr>
      <td>${esc(item.content_key)}</td>
      <td>${esc(item.title || '-')}</td>
      <td>${esc(item.content_type)}</td>
      <td>${esc(item.layout_type || '-')}</td>
      <td>${statusDot(item.status)} ${esc(item.status)}</td>
      <td>${esc(item.updated_at || item.created_at)}</td>
    </tr>
  `).join('');
  return `<div class="card"><table>
    <thead><tr><th>Key</th><th>Title</th><th>Type</th><th>Layout</th><th>Status</th><th>Updated</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// --- Learnings panel ---

function renderLearningsPanel(data) {
  const items = data.learnings || [];
  if (items.length === 0) {
    return '<div class="empty"><h3>No learnings yet</h3><p>Learnings are captured during squad execution</p></div>';
  }
  const rows = items.map(item => `
    <tr>
      <td>${statusDot(item.status)} ${esc(item.status)}</td>
      <td>${esc(item.type)}</td>
      <td>${esc(item.title)}</td>
      <td>${esc(item.confidence || '-')}</td>
      <td>${item.frequency || 1}</td>
      <td>${esc(item.updated_at)}</td>
    </tr>
  `).join('');
  return `<div class="card"><table>
    <thead><tr><th>Status</th><th>Type</th><th>Title</th><th>Confidence</th><th>Freq</th><th>Updated</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// --- Events/Logs panel ---

function renderEventsPanel(data) {
  const events = data.events || [];
  if (events.length === 0) {
    return '<div class="empty"><h3>No events</h3><p>Events are recorded during execution</p></div>';
  }
  const items = events.map(ev => `
    <div class="timeline-item">
      <div class="time">${esc(ev.created_at)}</div>
      <div class="event">${statusDot(ev.status)} <strong>${esc(ev.phase || ev.event_type || 'event')}</strong> ${esc(ev.message || '')}</div>
    </div>
  `).join('');
  return `<div class="card"><div class="timeline">${items}</div></div>`;
}

// --- Pipeline panel ---

function renderPipelinePanel(data) {
  const info = data.pipelineInfo;
  if (!info || !info.pipeline) {
    return '<div class="empty"><h3>Not in a pipeline</h3><p>This squad is not part of any pipeline</p></div>';
  }
  let html = `<div class="card">
    <h3>Pipeline: ${esc(info.pipeline.pipeline_slug)}</h3>
    <div class="sub">${esc(info.pipeline.description || '')}</div>
  </div>`;

  if (info.handoffs && info.handoffs.length > 0) {
    const rows = info.handoffs.map(h => `
      <tr>
        <td>${esc(h.from_squad)}:${esc(h.from_port)}</td>
        <td>${esc(h.to_squad)}:${esc(h.to_port)}</td>
        <td>${statusDot(h.status)} ${esc(h.status)}</td>
        <td>${esc(h.created_at)}</td>
      </tr>
    `).join('');
    html += `<div class="card" style="margin-top:16px"><h3>Handoffs</h3><table>
      <thead><tr><th>From</th><th>To</th><th>Status</th><th>Created</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }
  return html;
}

// --- Integrations panel ---

function renderIntegrationsPanel(squad, data) {
  const mcps = (squad.manifest && squad.manifest.mcps) || [];
  const webhooks = (squad.manifest && squad.manifest.outputStrategy &&
    squad.manifest.outputStrategy.delivery && squad.manifest.outputStrategy.delivery.webhooks) || [];

  if (mcps.length === 0 && webhooks.length === 0) {
    return '<div class="empty"><h3>No integrations configured</h3><p>Add MCPs or webhooks to the squad manifest</p></div>';
  }

  let html = '';
  if (mcps.length > 0) {
    html += `<div class="card"><h3>MCPs</h3><table>
      <thead><tr><th>Slug</th><th>Title</th><th>Description</th></tr></thead>
      <tbody>${mcps.map(m => `<tr><td>${esc(m.slug)}</td><td>${esc(m.title || '-')}</td><td>${esc(m.description || '-')}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  if (webhooks.length > 0) {
    html += `<div class="card" style="margin-top:16px"><h3>Webhooks</h3><table>
      <thead><tr><th>Slug</th><th>URL</th><th>Trigger</th></tr></thead>
      <tbody>${webhooks.map(w => `<tr><td>${esc(w.slug)}</td><td>${esc(w.url)}</td><td>${esc(w.trigger)}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  // Recent deliveries
  const deliveries = data.deliveries || [];
  if (deliveries.length > 0) {
    const rows = deliveries.map(d => `
      <tr>
        <td>${esc(d.webhook_slug || '-')}</td>
        <td>${esc(d.content_key || '-')}</td>
        <td>${d.status_code || '-'}</td>
        <td>${d.attempt}</td>
        <td>${esc(d.created_at)}</td>
      </tr>
    `).join('');
    html += `<div class="card" style="margin-top:16px"><h3>Recent Deliveries</h3><table>
      <thead><tr><th>Webhook</th><th>Content</th><th>Status</th><th>Attempt</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  return html;
}

// --- Metrics panel ---

function renderMetricsPanel(data) {
  const metrics = data.customMetrics || [];
  if (metrics.length === 0) {
    return '<div class="empty"><h3>No metrics tracked</h3><p>Use <code>aioson squad:metric</code> to track squad metrics</p></div>';
  }

  const cards = metrics.map(m => {
    const improvement = m.baseline != null ? Math.round(((m.baseline - m.metric_value) / m.baseline) * 100) : null;
    return `<div class="card">
      <h3>${esc(m.metric_key)}</h3>
      <div class="value">${m.metric_value}${esc(m.metric_unit || '')}</div>
      ${m.baseline != null ? `<div class="sub">Baseline: ${m.baseline}${esc(m.metric_unit || '')}${improvement != null ? ` (${improvement > 0 ? '+' : ''}${improvement}% change)` : ''}</div>` : ''}
      ${m.target != null ? `<div class="sub">Target: ${m.target}${esc(m.metric_unit || '')}</div>` : ''}
      <div class="sub">${esc(m.period || '')} via ${esc(m.source || 'manual')}</div>
    </div>`;
  }).join('');

  return `<div class="grid grid-3">${cards}</div>`;
}

module.exports = {
  renderHomePage,
  renderSquadPage,
  renderLayout,
  renderSquadSidebar,
  esc
};
