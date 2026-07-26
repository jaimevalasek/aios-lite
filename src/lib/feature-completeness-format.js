'use strict';

const REQ_ID_RE = /\bREQ(?:-[A-Za-z0-9]+)+\b/g;
const AC_ID_RE = /\bAC(?:-[A-Za-z0-9]+)+\b/g;
const CAP_ID_RE = /\bCAP(?:-[A-Za-z0-9]+)+\b/g;
const PROM_ID_RE = /\bPROM(?:-[A-Za-z0-9]+)+\b/g;
const CAP_ID_EXACT_RE = /^CAP(?:-[A-Za-z0-9]+)+$/i;
const AC_ID_EXACT_RE = /^AC(?:-[A-Za-z0-9]+)+$/i;
const PROM_ID_EXACT_RE = /^PROM(?:-[A-Za-z0-9]+)+$/i;
const SOURCE_ID_EXACT_RE = /^SRC(?:-[A-Za-z0-9]+)+$/i;

const CANONICAL_LENSES = Object.freeze([
  'primary-outcome',
  'user-interaction',
  'data-state-lifecycle',
  'validation-business-rules',
  'failure-recovery',
  'permissions-security',
  'integration-dependency',
  'side-effects-async',
  'notification',
  'import-export',
  'observability',
  'performance-scale',
  'compatibility-migration',
  'accessibility-localization',
  'operational-management'
]);

const OPERATIONAL_CONCERNS = Object.freeze([
  'create',
  'list',
  'detail',
  'update',
  'delete-or-archive',
  'restore',
  'management-surface',
  'input-validation',
  'search',
  'filter',
  'sort',
  'pagination',
  'empty-state',
  'loading-state',
  'error-state',
  'permissions'
]);

const SCOPE_DECISIONS = new Set(['required', 'not_applicable', 'deferred']);
const LEVERAGE_DECISIONS = new Set([
  'reuse',
  'framework_native',
  'new_dependency',
  'custom',
  'not_applicable'
]);

const DECISION_ALIASES = Object.freeze({
  required: 'required',
  must: 'required',
  core: 'required',
  obrigatorio: 'required',
  obrigatoria: 'required',
  necessario: 'required',
  necessaria: 'required',
  'not-applicable': 'not_applicable',
  'not_applicable': 'not_applicable',
  'not applicable': 'not_applicable',
  'nao-aplicavel': 'not_applicable',
  na: 'not_applicable',
  'n-a': 'not_applicable',
  deferred: 'deferred',
  defer: 'deferred',
  adiado: 'deferred',
  adiada: 'deferred',
  futuro: 'deferred',
  'out-of-scope': 'deferred',
  'fora-de-escopo': 'deferred'
});

const LEVERAGE_ALIASES = Object.freeze({
  reuse: 'reuse',
  reutilizar: 'reuse',
  reutilizacao: 'reuse',
  'framework-native': 'framework_native',
  framework_native: 'framework_native',
  native: 'framework_native',
  nativo: 'framework_native',
  'new-dependency': 'new_dependency',
  new_dependency: 'new_dependency',
  'nova-dependencia': 'new_dependency',
  custom: 'custom',
  personalizado: 'custom',
  personalizada: 'custom',
  'not-applicable': 'not_applicable',
  not_applicable: 'not_applicable',
  'nao-aplicavel': 'not_applicable',
  na: 'not_applicable',
  'n-a': 'not_applicable'
});

const LENS_ALIASES = Object.freeze({
  'resultado-principal': 'primary-outcome',
  'interacao-do-usuario': 'user-interaction',
  'ciclo-de-vida-de-dados-e-estados': 'data-state-lifecycle',
  'validacao-e-regras-de-negocio': 'validation-business-rules',
  'falha-e-recuperacao': 'failure-recovery',
  'permissoes-e-seguranca': 'permissions-security',
  'integracao-e-dependencia': 'integration-dependency',
  'efeitos-colaterais-e-assincronos': 'side-effects-async',
  notificacao: 'notification',
  'importacao-e-exportacao': 'import-export',
  observabilidade: 'observability',
  'desempenho-e-escala': 'performance-scale',
  'compatibilidade-e-migracao': 'compatibility-migration',
  'acessibilidade-e-localizacao': 'accessibility-localization',
  'gerenciamento-operacional': 'operational-management'
});

const OPERATIONAL_ALIASES = Object.freeze({
  create: 'create', add: 'create', criar: 'create', cadastrar: 'create', cadastro: 'create',
  list: 'list', index: 'list', listar: 'list', listagem: 'list',
  detail: 'detail', view: 'detail', read: 'detail', detalhe: 'detail', visualizar: 'detail',
  update: 'update', edit: 'update', editar: 'update', atualizar: 'update',
  delete: 'delete-or-archive', archive: 'delete-or-archive', excluir: 'delete-or-archive', arquivar: 'delete-or-archive',
  'delete-archive': 'delete-or-archive', 'delete-or-archive': 'delete-or-archive',
  restore: 'restore', restaurar: 'restore',
  management: 'management-surface', 'management-surface': 'management-surface',
  'superficie-de-gerenciamento': 'management-surface',
  validation: 'input-validation', 'input-validation': 'input-validation', validacao: 'input-validation',
  search: 'search', busca: 'search',
  filter: 'filter', filters: 'filter', filtro: 'filter', filtros: 'filter',
  sort: 'sort', sorting: 'sort', ordenacao: 'sort',
  pagination: 'pagination', paging: 'pagination', paginacao: 'pagination',
  'empty-state': 'empty-state', 'estado-vazio': 'empty-state',
  'loading-state': 'loading-state', 'estado-de-carregamento': 'loading-state',
  'error-state': 'error-state', 'estado-de-erro': 'error-state',
  permissions: 'permissions', permission: 'permissions', permissoes: 'permissions'
});

function foldDiacritics(content) {
  return String(content || '').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function normalizeLabel(value) {
  return foldDiacritics(value)
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanCell(value) {
  return String(value || '')
    .trim()
    .replace(/^`|`$/g, '')
    .replace(/^\*\*|\*\*$/g, '')
    .trim();
}

function isPlaceholder(value) {
  const normalized = normalizeLabel(cleanCell(value));
  return !normalized
    || ['-', 'tbd', 'todo', 'pending', 'pendente', 'placeholder', 'not-discussed', 'nao-discutido'].includes(normalized)
    || /^x+$/.test(normalized);
}

function extractIds(content, regex) {
  return [...new Set(String(content || '').match(regex) || [])];
}

function normalizeDecision(value) {
  const raw = cleanCell(value).toLowerCase();
  return DECISION_ALIASES[raw] || DECISION_ALIASES[normalizeLabel(raw)] || normalizeLabel(raw);
}

function normalizeLeverageDecision(value) {
  const raw = cleanCell(value).toLowerCase();
  return LEVERAGE_ALIASES[raw] || LEVERAGE_ALIASES[normalizeLabel(raw)] || normalizeLabel(raw);
}

function normalizeLens(value) {
  const token = normalizeLabel(value);
  return LENS_ALIASES[token] || token;
}

function normalizeOperationalConcern(value) {
  const token = normalizeLabel(value);
  return OPERATIONAL_ALIASES[token] || token;
}

function parseSurfacesOverride(content, key = 'operational_surfaces') {
  const fm = String(content || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return [];
  const items = [];
  const inline = fm[1].match(new RegExp(`^${key}:[ \\t]*(.+)$`, 'm'));
  if (inline) {
    inline[1].trim().replace(/^\[|\]$/g, '').split(',').forEach((part) => {
      const value = part.trim().replace(/^["']|["']$/g, '');
      if (value) items.push(value);
    });
  }
  const block = fm[1].match(new RegExp(`^${key}:[ \\t]*\\r?\\n((?:[ \\t]*-[ \\t]*.+\\r?\\n?)+)`, 'm'));
  if (block) {
    block[1].split(/\r?\n/).forEach((line) => {
      const match = line.match(/^[ \t]*-[ \t]*(.+)$/);
      if (!match) return;
      const value = match[1].trim().replace(/^["']|["']$/g, '');
      if (value) items.push(value);
    });
  }
  return items;
}

function detectRichSurfaces(content) {
  const c = foldDiacritics(content);
  const found = [];
  if (/\b(kanban|trello|scrum board|task board|quadro kanban|quadro de tarefas)\b/i.test(c)) found.push('kanban');
  if ((/\bboards?\b/i.test(c) && /\bcards?\b/i.test(c))
    || (/\bquadros?\b/i.test(c) && /\bcart(ao|oes)\b/i.test(c))
    || (/\btableros?\b/i.test(c) && /\btarjetas?\b/i.test(c))
    || (/\btableaux?\b/i.test(c) && /\bcartes?\b/i.test(c))) found.push('board_cards');
  if (/\b(crm|sales pipeline|deals? pipeline|leads? pipeline|funil de vendas|pipeline de (vendas|negocios|leads)|embudo de ventas|pipeline commercial)\b/i.test(c)) found.push('crm_pipeline');
  if (/\bworkspaces?\b/i.test(c)
    && /\b(members?|invites?|switcher|settings|teams?|membros?|convites?|equipes?|configuracoes|miembros?|invitaciones?|equipos?)\b/i.test(c)) found.push('workspace');
  if (/\bcrud\b/i.test(c)
    || /\badmin (panel|dashboard|area|console)\b/i.test(c)
    || /\bmanagement (screen|page|panel|dashboard|interface|surface)\b/i.test(c)
    || /\barea administrativa\b/i.test(c)
    || /\bpainel (de )?admin(istracao)?\b/i.test(c)
    || /\b(painel|tela|pagina|area|console) de (administracao|gestao|gerenciamento)\b/i.test(c)
    || /\b(panel|pagina|area|consola) de administracion\b/i.test(c)
    || /\b(panneau|page|espace|console) d'administration\b/i.test(c)) {
    found.push('crud_admin');
  }
  return [...new Set(found)];
}

function extractSection(content, headingAliases) {
  const lines = String(content || '').split(/\r?\n/);
  const aliases = headingAliases.map(normalizeLabel);
  let start = -1;
  let level = null;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match) continue;
    const heading = normalizeLabel(match[2]);
    if (aliases.some((alias) => heading === alias || heading.startsWith(`${alias}-`))) {
      start = i + 1;
      level = match[1].length;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

function splitTableRow(line) {
  let text = String(line || '').trim();
  if (!text.includes('|')) return [];
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1);
  return text.split(/(?<!\\)\|/).map((cell) => cleanCell(cell.replace(/\\\|/g, '|')));
}

function isDelimiterRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
}

function parseFirstMarkdownTable(section) {
  const lines = String(section || '').split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i += 1) {
    const headers = splitTableRow(lines[i]);
    const delimiter = splitTableRow(lines[i + 1]);
    if (headers.length < 2 || delimiter.length !== headers.length || !isDelimiterRow(delimiter)) continue;
    const rows = [];
    const malformed = [];
    let dataRow = 0;
    for (let j = i + 2; j < lines.length; j += 1) {
      const cells = splitTableRow(lines[j]);
      if (cells.length === 0) break;
      dataRow += 1;
      if (cells.length === headers.length) rows.push(cells);
      else malformed.push({ row: dataRow, cells: cells.length });
    }
    return { headers, normalizedHeaders: headers.map(normalizeLabel), rows, malformed };
  }
  return null;
}

function findColumn(table, aliases) {
  const normalized = aliases.map(normalizeLabel);
  return table.normalizedHeaders.findIndex((header) => normalized.includes(header));
}

function mapColumns(table, definitions) {
  const indexes = {};
  const missing = [];
  for (const [name, aliases] of Object.entries(definitions)) {
    indexes[name] = findColumn(table, aliases);
    if (indexes[name] === -1) missing.push(name);
  }
  return { indexes, missing };
}

function finding(stage, check, message, artifact) {
  return {
    severity: 'error',
    stage,
    check,
    message,
    artifacts: artifact ? [artifact] : []
  };
}

function missingSection(stage, check, heading, artifact) {
  return finding(stage, check, `feature completeness requires ## ${heading}`, artifact);
}

module.exports = {
  REQ_ID_RE,
  AC_ID_RE,
  CAP_ID_RE,
  PROM_ID_RE,
  CAP_ID_EXACT_RE,
  AC_ID_EXACT_RE,
  PROM_ID_EXACT_RE,
  SOURCE_ID_EXACT_RE,
  CANONICAL_LENSES,
  OPERATIONAL_CONCERNS,
  SCOPE_DECISIONS,
  LEVERAGE_DECISIONS,
  foldDiacritics,
  normalizeLabel,
  cleanCell,
  isPlaceholder,
  extractIds,
  normalizeDecision,
  normalizeLeverageDecision,
  normalizeLens,
  normalizeOperationalConcern,
  parseSurfacesOverride,
  detectRichSurfaces,
  extractSection,
  parseFirstMarkdownTable,
  mapColumns,
  finding,
  missingSection
};
