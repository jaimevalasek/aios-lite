'use strict';

function getInlineCSS() {
  return `
:root {
  --bg: #0f1117;
  --bg-card: #1a1d27;
  --bg-hover: #222632;
  --border: #2a2e3a;
  --text: #e1e4eb;
  --text-muted: #8b8fa3;
  --accent: #6c8aff;
  --accent-dim: rgba(108,138,255,0.15);
  --success: #4ade80;
  --success-dim: rgba(74,222,128,0.15);
  --warning: #fbbf24;
  --warning-dim: rgba(251,191,36,0.15);
  --danger: #f87171;
  --danger-dim: rgba(248,113,113,0.15);
  --radius: 8px;
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Layout */
.layout { display: flex; min-height: 100vh; }
.sidebar {
  width: 240px;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  padding: 20px 0;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  overflow-y: auto;
}
.main { margin-left: 240px; padding: 24px; flex: 1; width: calc(100% - 240px); }

.sidebar h1 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 20px 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}
.sidebar a {
  display: block;
  padding: 8px 20px;
  color: var(--text);
  font-size: 14px;
  transition: background 0.15s;
}
.sidebar a:hover { background: var(--bg-hover); text-decoration: none; }
.sidebar a.active { background: var(--accent-dim); color: var(--accent); border-right: 2px solid var(--accent); }
.sidebar .squad-mode {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--accent-dim);
  color: var(--accent);
  margin-left: 6px;
  vertical-align: middle;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.page-header h2 { font-size: 20px; font-weight: 600; }
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.badge-content { background: var(--accent-dim); color: var(--accent); }
.badge-software { background: var(--success-dim); color: var(--success); }
.badge-research { background: var(--warning-dim); color: var(--warning); }
.badge-mixed { background: var(--bg-hover); color: var(--text-muted); }

/* Cards */
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.grid-3 { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.grid-4 { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}
.card h3 {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}
.card .value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
}
.card .sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

/* Tabs */
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}
.tab {
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  font-family: var(--font);
}
.tab:hover { color: var(--text); }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-content { display: none; }
.tab-content.active { display: block; }

/* Table */
table { width: 100%; border-collapse: collapse; }
th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  letter-spacing: 0.3px;
}
td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
tr:hover td { background: var(--bg-hover); }

/* Status dots */
.status-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
.status-active { background: var(--success); }
.status-stale { background: var(--warning); }
.status-error { background: var(--danger); }
.status-inactive { background: var(--text-muted); }

/* Timeline */
.timeline { border-left: 2px solid var(--border); margin-left: 12px; padding-left: 20px; }
.timeline-item { position: relative; padding-bottom: 16px; }
.timeline-item::before {
  content: '';
  position: absolute;
  left: -25px; top: 6px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg);
}
.timeline-item .time { font-size: 11px; color: var(--text-muted); }
.timeline-item .event { font-size: 13px; }

/* Empty state */
.empty {
  text-align: center;
  padding: 48px 20px;
  color: var(--text-muted);
}
.empty h3 { font-size: 16px; margin-bottom: 8px; color: var(--text); }

/* Progress bar */
.progress-bar {
  height: 6px;
  background: var(--bg-hover);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.3s;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .main { margin-left: 0; width: 100%; }
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
}
`;
}

function getInlineJS() {
  return `
(function() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      var group = this.closest('.tab-group');
      group.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      group.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
      this.classList.add('active');
      var target = document.getElementById(this.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Auto-refresh
  var slug = document.body.dataset.squad;
  if (slug) {
    setInterval(function() {
      fetch('/api/squad/' + slug + '/data.json')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.metrics) {
            Object.keys(data.metrics).forEach(function(key) {
              var el = document.getElementById('metric-' + key);
              if (el) el.textContent = data.metrics[key];
            });
          }
        })
        .catch(function() {});
    }, 10000);
  }
})();
`;
}

module.exports = { getInlineCSS, getInlineJS };
