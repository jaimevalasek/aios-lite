import { useMemo, useState } from "react";

const inventory = [
  {
    id: 1,
    sku: "MON-003",
    name: "Monitor ultrawide",
    category: "Displays",
    stock: 0,
    min: 2,
    price: 3299,
    supplier: "Dell Corp",
    status: "zero",
    note: "Reposicao bloqueada nas ultimas 24h.",
  },
  {
    id: 2,
    sku: "HDS-002",
    name: "Headset studio",
    category: "Audio",
    stock: 3,
    min: 6,
    price: 1299,
    supplier: "Sony Brasil",
    status: "low",
    note: "Consumo acima da media semanal.",
  },
  {
    id: 3,
    sku: "TEC-001",
    name: "Teclado mecanico",
    category: "Perifericos",
    stock: 10,
    min: 5,
    price: 699,
    supplier: "Logitech BR",
    status: "stable",
    note: "Estoque normalizado para 7 dias.",
  },
];

const movements = [
  { id: 1, type: "Saida", qty: 4, item: "Teclado mecanico", stamp: "15/03/2026, 22:26", tone: "warn" },
  { id: 2, type: "Saida", qty: 1, item: "Headset studio", stamp: "15/03/2026, 22:26", tone: "warn" },
  { id: 3, type: "Entrada", qty: 6, item: "Teclado mecanico", stamp: "15/03/2026, 07:30", tone: "ok" },
  { id: 4, type: "Saida", qty: 2, item: "Headset studio", stamp: "15/03/2026, 08:10", tone: "warn" },
  { id: 5, type: "Saida", qty: 1, item: "Monitor ultrawide", stamp: "15/03/2026, 09:00", tone: "warn" },
];

const themeStyles = `
* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; }
body {
  background: #050810;
  color: var(--text-primary);
  font-family: var(--font-body);
}
[data-theme="dark"] {
  --bg-void: #050810;
  --bg-base: #0a1017;
  --bg-surface: #121927;
  --bg-elevated: #172131;
  --bg-overlay: #233246;

  --text-heading: #f6f8fb;
  --text-primary: #d7e0ea;
  --text-secondary: #95a4b7;
  --text-muted: #6b7a8d;
  --text-accent: #3bd8ff;
  --text-inverse: #061018;

  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-medium: rgba(255, 255, 255, 0.10);
  --border-strong: rgba(255, 255, 255, 0.16);
  --border-accent: rgba(59, 216, 255, 0.24);

  --accent: #27d5ff;
  --accent-soft: rgba(39, 213, 255, 0.14);
  --accent-glow: rgba(39, 213, 255, 0.10);

  --ok: #18c58c;
  --ok-soft: rgba(24, 197, 140, 0.18);
  --warn: #f3aa22;
  --warn-soft: rgba(243, 170, 34, 0.18);
  --danger: #ff5f6d;
  --danger-soft: rgba(255, 95, 109, 0.18);

  --shadow-panel: 0 10px 40px rgba(0, 0, 0, 0.22);
}
[data-theme="light"] {
  --bg-void: #eef3f8;
  --bg-base: #f5f8fc;
  --bg-surface: #ffffff;
  --bg-elevated: #ebf1f7;
  --bg-overlay: #dfe8f1;

  --text-heading: #0e1728;
  --text-primary: #304155;
  --text-secondary: #61758a;
  --text-muted: #8a9aab;
  --text-accent: #0e8cc8;
  --text-inverse: #f8fbff;

  --border-subtle: rgba(16, 24, 40, 0.07);
  --border-medium: rgba(16, 24, 40, 0.12);
  --border-strong: rgba(16, 24, 40, 0.18);
  --border-accent: rgba(14, 140, 200, 0.22);

  --accent: #0ea5e9;
  --accent-soft: rgba(14, 165, 233, 0.10);
  --accent-glow: rgba(14, 165, 233, 0.08);

  --ok: #059669;
  --ok-soft: rgba(5, 150, 105, 0.10);
  --warn: #d97706;
  --warn-soft: rgba(217, 119, 6, 0.10);
  --danger: #dc2626;
  --danger-soft: rgba(220, 38, 38, 0.10);

  --shadow-panel: 0 16px 36px rgba(15, 23, 42, 0.08);
}
[data-theme="dark"],
[data-theme="light"] {
  --font-display: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-pill: 999px;

  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  --transition: background 220ms ease, color 220ms ease, border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease;
}
button, input, textarea, select { font: inherit; }
button { cursor: pointer; }
::selection { background: var(--accent-soft); }
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg-base); }
::-webkit-scrollbar-thumb { background: var(--bg-overlay); border-radius: 999px; }

.demo-root {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, var(--accent-glow), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 30%),
    var(--bg-base);
  color: var(--text-primary);
}
.shell {
  min-height: 100vh;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 76px 76px;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 14px 22px;
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(5, 8, 16, 0.92);
  backdrop-filter: blur(14px);
  position: sticky;
  top: 0;
  z-index: 20;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--border-accent);
  background: linear-gradient(180deg, var(--accent-soft), transparent);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02), 0 0 24px var(--accent-glow);
  position: relative;
}
.brand-mark::after {
  content: "";
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--accent);
  position: absolute;
  inset: 0;
  margin: auto;
}
.brand-copy strong {
  display: block;
  font-family: var(--font-display);
  font-size: 1.18rem;
  line-height: 1.1;
  color: var(--text-heading);
}
.brand-copy span {
  display: block;
  margin-top: 3px;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.chip, .ghost-chip, .account-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary);
  transition: var(--transition);
}
.chip {
  border-color: var(--border-accent);
  background: linear-gradient(180deg, var(--accent-soft), rgba(255, 255, 255, 0.02));
  color: var(--text-accent);
  box-shadow: 0 0 0 1px rgba(59, 216, 255, 0.04), 0 0 24px var(--accent-glow);
}
.chip small,
.ghost-chip small,
.account-pill small {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.ghost-chip:hover,
.account-pill:hover,
.theme-toggle:hover {
  border-color: var(--border-medium);
  color: var(--text-heading);
}
.theme-toggle {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-secondary);
  transition: var(--transition);
}
.page {
  padding: 20px 16px 32px;
  max-width: 1560px;
  margin: 0 auto;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.panel {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 26%), var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
  transition: var(--transition);
}
.metric-card {
  padding: 18px 18px 16px;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.metric-value {
  margin-top: 14px;
  font-family: var(--font-display);
  font-size: 3.1rem;
  line-height: 0.95;
  font-weight: 750;
  color: var(--text-heading);
  font-variant-numeric: tabular-nums;
}
.metric-value.warn { color: var(--warn); }
.metric-value.danger { color: var(--danger); }
.metric-value.accent { color: var(--text-accent); }
.metric-sub {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 0.95rem;
}
.subnav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 22px;
  padding: 8px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.02);
}
.subnav button {
  min-height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  transition: var(--transition);
}
.subnav button.active {
  color: var(--text-accent);
  border-color: var(--border-accent);
  background: var(--accent-soft);
}
.dashboard-grid {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 430px;
  gap: 16px;
  margin-top: 20px;
}
.stack {
  display: grid;
  gap: 12px;
}
.mini-card,
.mode-card,
.feed-card,
.radar-panel,
.radar-item,
.modal-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 24%), var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  transition: var(--transition);
}
.mini-card {
  padding: 16px;
}
.mini-card strong,
.mode-card strong,
.feed-card strong,
.radar-panel strong {
  display: block;
  margin-top: 10px;
  font-family: var(--font-display);
  font-size: 1.65rem;
  line-height: 1.06;
  color: var(--text-heading);
}
.mini-card p,
.mode-card p,
.feed-card p,
.radar-panel p,
.radar-item p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 0.94rem;
  line-height: 1.55;
}
.mode-card {
  padding: 18px;
}
.mode-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  border: 1px solid var(--border-accent);
  background: linear-gradient(180deg, var(--accent-soft), transparent);
  box-shadow: 0 0 18px var(--accent-glow);
}
.radar-panel {
  padding: 18px 18px 20px;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}
.section-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: 1.02;
  color: var(--text-heading);
}
.section-head p {
  margin: 8px 0 0;
}
.radar-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.radar-item {
  padding: 16px;
  cursor: pointer;
  width: 100%;
  text-align: left;
}
.radar-item:hover {
  border-color: var(--border-medium);
  transform: translateY(-1px);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.02), 0 20px 30px rgba(0, 0, 0, 0.18);
}
.radar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.tone-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid transparent;
}
.tone-pill.category {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.03);
  border-color: var(--border-subtle);
}
.tone-pill.zero {
  color: var(--danger);
  background: var(--danger-soft);
  border-color: rgba(255, 95, 109, 0.28);
}
.tone-pill.low {
  color: var(--warn);
  background: var(--warn-soft);
  border-color: rgba(243, 170, 34, 0.28);
}
.tone-pill.stable {
  color: var(--ok);
  background: var(--ok-soft);
  border-color: rgba(24, 197, 140, 0.28);
}
.radar-item h3 {
  margin: 18px 0 6px;
  font-family: var(--font-display);
  font-size: 1.35rem;
  line-height: 1.08;
  color: var(--text-heading);
}
.meta-row,
.stock-row,
.feed-line,
.modal-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.meta-row span:first-child,
.stock-row span:first-child,
.modal-row span:first-child {
  color: var(--text-secondary);
}
.stock-big {
  margin-top: 18px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.stock-big strong {
  margin: 0;
  font-family: var(--font-display);
  font-size: 2.7rem;
  line-height: 0.95;
}
.progress {
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  margin-top: 14px;
}
.progress > span {
  display: block;
  height: 100%;
  border-radius: inherit;
}
.progress.zero > span { background: var(--danger); }
.progress.low > span { background: var(--warn); }
.progress.stable > span { background: var(--ok); }
.feed-card {
  padding: 18px;
}
.feed-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}
.feed-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 14px 14px 12px;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.015);
}
.feed-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.feed-dot.ok { background: var(--ok); box-shadow: 0 0 16px rgba(24, 197, 140, 0.32); }
.feed-dot.warn { background: var(--warn); box-shadow: 0 0 16px rgba(243, 170, 34, 0.28); }
.feed-item strong {
  display: block;
  font-family: var(--font-display);
  font-size: 1.05rem;
  line-height: 1.1;
  color: var(--text-heading);
}
.feed-item span,
.feed-item small {
  color: var(--text-secondary);
}
.feed-meta {
  min-width: 110px;
  text-align: right;
  font-size: 0.9rem;
}
.modal-layer {
  position: fixed;
  inset: 0;
  background: rgba(3, 8, 14, 0.72);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 50;
}
.modal-card {
  width: min(720px, 100%);
  padding: 22px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.34);
}
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.modal-header h3 {
  margin: 10px 0 0;
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: 1.02;
  color: var(--text-heading);
}
.modal-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}
.modal-stat {
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--border-subtle);
}
.modal-stat strong {
  margin-top: 10px;
  font-size: 1.7rem;
}
.modal-copy {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--border-subtle);
}
.close-button {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
  color: var(--text-secondary);
}
@media (max-width: 1280px) {
  .dashboard-grid {
    grid-template-columns: 220px minmax(0, 1fr);
  }
  .feed-card {
    grid-column: span 2;
  }
}
@media (max-width: 980px) {
  .metrics,
  .dashboard-grid,
  .radar-grid,
  .modal-grid {
    grid-template-columns: 1fr;
  }
  .topbar {
    flex-wrap: wrap;
  }
  .top-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .feed-card {
    grid-column: auto;
  }
}
`;

function StatCard({ label, value, sub, tone }) {
  return (
    <section className="panel metric-card">
      <span className="eyebrow">{label}</span>
      <div className={`metric-value${tone ? ` ${tone}` : ""}`}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </section>
  );
}

function RadarCard({ item, onOpen }) {
  const percent = Math.min(100, Math.round((item.stock / Math.max(item.min, 1)) * 100));
  const toneLabel = item.status === "zero" ? "Zerado" : item.status === "low" ? "Baixo estoque" : "Estavel";

  return (
    <button type="button" className="radar-item" onClick={() => onOpen(item)}>
      <div className="radar-top">
        <span className="tone-pill category">{item.category}</span>
        <span className={`tone-pill ${item.status}`}>{toneLabel}</span>
      </div>
      <h3>{item.name}</h3>
      <div className="meta-row">
        <span>{item.sku}</span>
        <span>{item.supplier}</span>
      </div>
      <div className="stock-big">
        <strong>{item.stock}</strong>
        <span>unidades</span>
      </div>
      <div className={`progress ${item.status}`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="meta-row" style={{ marginTop: 10 }}>
        <span>limite: {item.min}</span>
        <span>{item.note}</span>
      </div>
    </button>
  );
}

function MovementItem({ movement }) {
  return (
    <div className="feed-item">
      <span className={`feed-dot ${movement.tone}`} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <strong>{movement.type} de {movement.qty}</strong>
        <span>{movement.item}</span>
      </div>
      <div className="feed-meta">
        <small>{movement.stamp}</small>
      </div>
    </div>
  );
}

function DetailModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="modal-layer" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">sku {item.sku}</span>
            <h3>{item.name}</h3>
            <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: "1rem" }}>
              Item monitorado no radar operacional de estoque.
            </p>
          </div>
          <button type="button" className="close-button" onClick={onClose}>X</button>
        </div>

        <div className="modal-grid">
          <div className="modal-stat">
            <span className="eyebrow">estoque atual</span>
            <strong>{item.stock}</strong>
          </div>
          <div className="modal-stat">
            <span className="eyebrow">limite minimo</span>
            <strong>{item.min}</strong>
          </div>
          <div className="modal-stat">
            <span className="eyebrow">preco unitario</span>
            <strong>R$ {item.price.toLocaleString("pt-BR")}</strong>
          </div>
        </div>

        <div className="modal-copy">
          <div className="modal-row">
            <span>Fornecedor</span>
            <strong style={{ color: "var(--text-heading)" }}>{item.supplier}</strong>
          </div>
          <div className="modal-row" style={{ marginTop: 12 }}>
            <span>Status</span>
            <span className={`tone-pill ${item.status}`}>{item.status === "stable" ? "Estavel" : item.status === "low" ? "Baixo estoque" : "Zerado"}</span>
          </div>
          <p style={{ marginTop: 18, color: "var(--text-secondary)", lineHeight: 1.65 }}>
            {item.note} O objetivo deste bloco e mostrar como o sistema visual prioriza leitura, alinhamento e uma unica historia operacional acima da dobra.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [active, setActive] = useState("Dashboard");
  const [selected, setSelected] = useState(null);

  const summary = useMemo(() => {
    const totalProducts = inventory.length;
    const lowStock = inventory.filter((item) => item.status === "low").length;
    const zeroStock = inventory.filter((item) => item.status === "zero").length;
    const health = Math.round((inventory.filter((item) => item.status === "stable").length / inventory.length) * 100);

    return { totalProducts, lowStock, zeroStock, health };
  }, []);

  return (
    <div data-theme={theme} className="demo-root">
      <style>{themeStyles}</style>
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" />
            <div className="brand-copy">
              <strong>Controle de estoque</strong>
              <span>Cognitive command center</span>
            </div>
          </div>

          <div className="top-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "L" : "D"}
            </button>
            <div className="chip"><small>Sistema operacional</small></div>
            <div className="account-pill"><small>jaime.valasek@gmail.com</small></div>
            <div className="ghost-chip"><small>Sair</small></div>
          </div>
        </header>

        <div className="page">
          <section className="metrics">
            <StatCard label="Produtos" value={summary.totalProducts} sub="itens cadastrados" />
            <StatCard label="Baixo estoque" value={summary.lowStock} sub="pedem reposicao" tone="warn" />
            <StatCard label="Zerados" value={summary.zeroStock} sub="sem unidades" tone="danger" />
            <StatCard label="Saude do estoque" value={`${summary.health}%`} sub="13 unidades ativas" tone="accent" />
          </section>

          <nav className="subnav" aria-label="Primary sections">
            {[
              "Dashboard",
              "Produtos",
              "Movimentacoes",
            ].map((tab) => (
              <button
                key={tab}
                type="button"
                className={active === tab ? "active" : ""}
                onClick={() => setActive(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>

          <section className="dashboard-grid">
            <aside className="stack">
              <article className="mini-card">
                <span className="eyebrow">Monitoramento</span>
                <strong>Valor estimado</strong>
                <p>R$ 6.396,00</p>
              </article>
              <article className="mini-card">
                <span className="eyebrow">Movimentacoes</span>
                <strong>5</strong>
                <p>registros recentes consolidados</p>
              </article>
              <article className="mini-card">
                <span className="eyebrow">Credencial ativa</span>
                <strong>local auth</strong>
                <p>sincronizacao operacional preservada</p>
              </article>
              <article className="mode-card">
                <div className="chip" style={{ minHeight: 32, width: "fit-content", paddingInline: 12 }}><small>Modo ativo</small></div>
                <div className="mode-icon" style={{ marginTop: 16 }} />
                <strong>Visao rapida do estoque</strong>
                <p>Bloco lateral para contexto, sem competir com o radar principal.</p>
              </article>
            </aside>

            <main>
              <article className="radar-panel">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Monitoramento</span>
                    <h2>Radar de estoque</h2>
                    <p>Itens com maior urgencia operacional para revisar primeiro.</p>
                  </div>
                </div>
                <div className="radar-grid">
                  {inventory.map((item) => (
                    <RadarCard key={item.id} item={item} onOpen={setSelected} />
                  ))}
                </div>
              </article>
            </main>

            <aside>
              <article className="feed-card">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Consolidado</span>
                    <h2>Movimentacao recente</h2>
                    <p>Ultimos registros consolidados.</p>
                  </div>
                </div>
                <div className="feed-list">
                  {movements.map((movement) => (
                    <MovementItem key={movement.id} movement={movement} />
                  ))}
                </div>
              </article>
            </aside>
          </section>
        </div>
      </div>

      <DetailModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
