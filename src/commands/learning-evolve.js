'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { openRuntimeDb, listSquadLearnings, listProjectLearnings, promoteSquadLearning, promoteProjectLearning } = require('../runtime-store');

const AGENTS_DIR = path.join('.aioson', 'agents');
const EVOLUTION_DIR = path.join('.aioson', 'evolution');
const CONTEXT_FILE = path.join('.aioson', 'context', 'project.context.md');
const MAX_FILE_LINES = 300;
const MIN_FREQUENCY = 2;

/**
 * Mapeia tipo de learning para seção e arquivo alvo.
 */
function resolveDeltaTarget(type, squadSlug) {
  const rulesDir = path.join('.aioson', 'rules');
  if (type === 'preference') {
    return { file: CONTEXT_FILE, section: '## Preferências dos Agentes' };
  }
  if (type === 'process') {
    const filename = squadSlug ? `${squadSlug}-process.md` : 'project-process.md';
    return { file: path.join(rulesDir, filename), section: null };
  }
  if (type === 'domain') {
    return { file: CONTEXT_FILE, section: '## Conhecimento de Domínio' };
  }
  if (type === 'quality') {
    return { file: CONTEXT_FILE, section: '## Padrões de Qualidade' };
  }
  return { file: CONTEXT_FILE, section: '## Observações' };
}

/**
 * Gate 1: arquivo não pode estar dentro de .aioson/agents/
 */
function passesConstitutionGate(filePath, projectDir) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(projectDir, filePath);
  const agentsAbsolute = path.resolve(projectDir, AGENTS_DIR);
  return !absolute.startsWith(agentsAbsolute + path.sep) && absolute !== agentsAbsolute;
}

/**
 * Gate 2: arquivo alvo não pode ultrapassar MAX_FILE_LINES após append.
 */
async function passesSizeGate(filePath, projectDir, newContent) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(projectDir, filePath);
  let existingLines = 0;
  try {
    const content = await fs.readFile(absolute, 'utf8');
    existingLines = content.split('\n').length;
  } catch {
    existingLines = 0;
  }
  const newLines = String(newContent || '').split('\n').length;
  return (existingLines + newLines) <= MAX_FILE_LINES;
}

/**
 * Gera o conteúdo textual de um delta a partir de um grupo de learnings.
 */
function buildDeltaContent(learnings, section) {
  const lines = [];
  if (section) {
    lines.push('');
  }
  for (const l of learnings) {
    const confidence = l.confidence === 'high' ? '(alta confiança)' : l.confidence === 'low' ? '(baixa confiança)' : '';
    lines.push(`- ${l.title} ${confidence}`.trim());
    if (l.evidence) {
      lines.push(`  > ${l.evidence}`);
    }
  }
  return lines.join('\n');
}

/**
 * Aplica um delta aprovado no sistema de arquivos.
 */
async function applyDelta(delta, projectDir) {
  const absolute = path.isAbsolute(delta.file) ? delta.file : path.resolve(projectDir, delta.file);

  await fs.mkdir(path.dirname(absolute), { recursive: true });

  let existing = '';
  try {
    existing = await fs.readFile(absolute, 'utf8');
  } catch {
    existing = '';
  }

  if (delta.section && existing) {
    if (existing.includes(delta.section)) {
      // Insere após o cabeçalho da seção
      const updated = existing.replace(delta.section, `${delta.section}\n${delta.content}`);
      await fs.writeFile(absolute, updated, 'utf8');
    } else {
      // Adiciona a seção no final
      await fs.writeFile(absolute, `${existing}\n${delta.section}\n${delta.content}\n`, 'utf8');
    }
  } else {
    // Append simples
    await fs.writeFile(absolute, `${existing}\n${delta.content}\n`, 'utf8');
  }
}

/**
 * Ponto de entrada principal.
 */
async function runLearningEvolve({ args = [], options = {}, logger = console, t = (k) => k } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const squadSlug = options.squad || null;
  const dryRun = Boolean(options['dry-run'] || options.dry);
  const autoApply = Boolean(options['auto-apply'] || options.auto);
  const quiet = Boolean(options.quiet);

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) {
    logger.error('Runtime store não encontrado. Execute aioson runtime:init primeiro.');
    return { ok: false, error: 'no_runtime' };
  }
  const { db } = handle;

  let learnings;
  try {
    if (squadSlug) {
      learnings = listSquadLearnings(db, squadSlug, 'active');
    } else {
      const squad = listSquadLearnings(db, null, 'active');
      const project = listProjectLearnings(db, 'active');
      learnings = [...squad, ...project];
    }
  } finally {
    db.close();
  }

  // Filtra por frequência mínima
  const eligible = learnings.filter((l) => Number(l.frequency || 1) >= MIN_FREQUENCY);

  if (eligible.length === 0) {
    if (!quiet) logger.log('Nenhum learning com frequência suficiente para evoluir (mínimo: 2 ocorrências).');
    return { ok: true, evolved: 0, skipped: 0, proposed: [] };
  }

  if (!quiet) logger.log(`Analisando ${eligible.length} learnings elegíveis...`);

  // Agrupa por tipo
  const grouped = {};
  for (const l of eligible) {
    const key = l.type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(l);
  }

  // Gera deltas
  const proposed = [];
  const rejected = [];

  for (const [type, group] of Object.entries(grouped)) {
    const { file, section } = resolveDeltaTarget(type, group[0].squad_slug || null);
    const content = buildDeltaContent(group, section);

    // Gate 1: Constitution
    if (!passesConstitutionGate(file, projectDir)) {
      rejected.push({ type, reason: 'constitution_gate', file, count: group.length });
      continue;
    }

    // Gate 2: Size
    const sizeOk = await passesSizeGate(file, projectDir, content);
    if (!sizeOk) {
      rejected.push({ type, reason: 'size_gate', file, count: group.length });
      continue;
    }

    proposed.push({
      type,
      file,
      section,
      content,
      sourceIds: group.map((l) => l.learning_id),
      count: group.length
    });
  }

  // Exibe resultados
  if (!quiet) {
    logger.log('');
    logger.log(`Deltas propostos: ${proposed.length} aprovados, ${rejected.length} rejeitados`);
    logger.log('');

    for (let i = 0; i < proposed.length; i++) {
      const d = proposed[i];
      logger.log(`  [${i + 1}] APPEND → ${d.file}`);
      if (d.section) logger.log(`      Seção: ${d.section}`);
      logger.log(`      Learnings: ${d.count} (${d.type})`);
      logger.log(d.content.split('\n').map((l) => `      ${l}`).join('\n'));
      logger.log('');
    }

    for (const r of rejected) {
      const reason = r.reason === 'constitution_gate' ? 'gate constitucional (arquivo imutável)' : `gate de tamanho (>${MAX_FILE_LINES} linhas)`;
      logger.log(`  ✗ Rejeitado [${r.type}] → ${r.file}: ${reason}`);
    }
  }

  if (proposed.length === 0) {
    return { ok: true, evolved: 0, skipped: rejected.length, proposed: [] };
  }

  // Dry-run: só exibe, não aplica
  if (dryRun) {
    logger.log('Modo dry-run: nenhuma alteração foi feita.');
    return { ok: true, evolved: 0, skipped: rejected.length, proposed };
  }

  // Auto-apply: aplica diretamente
  if (autoApply) {
    return applyProposed(proposed, projectDir, db, logger, quiet, squadSlug);
  }

  // Modo padrão: salva arquivo pendente
  const evolutionDir = path.resolve(projectDir, EVOLUTION_DIR);
  await fs.mkdir(evolutionDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const pendingFile = path.join(evolutionDir, `pending-${timestamp}.json`);
  await fs.writeFile(pendingFile, JSON.stringify({ createdAt: new Date().toISOString(), projectDir, proposed, rejected }, null, 2), 'utf8');

  if (!quiet) {
    logger.log(`Proposta salva em: ${pendingFile}`);
    logger.log('Para aplicar: aioson learning:apply . --file=' + path.relative(projectDir, pendingFile));
    logger.log('Para aplicar automaticamente: aioson learning:evolve . --auto-apply');
  }

  return { ok: true, evolved: 0, skipped: rejected.length, proposed, pendingFile };
}

async function applyProposed(proposed, projectDir, db, logger, quiet, squadSlug) {
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) return { ok: false, error: 'no_runtime' };
  const applyDb = handle.db;

  let evolved = 0;
  try {
    for (const delta of proposed) {
      await applyDelta(delta, projectDir);

      // Promove learnings no DB
      for (const id of delta.sourceIds) {
        try {
          if (id.startsWith('sl-') || id.startsWith('pl-')) {
            if (id.startsWith('sl-')) {
              promoteSquadLearning(applyDb, id, delta.file);
            } else {
              promoteProjectLearning(applyDb, id, delta.file);
            }
          } else {
            promoteSquadLearning(applyDb, id, delta.file);
          }
        } catch { /* learning pode já ter sido promovido */ }
      }

      evolved++;
      if (!quiet) logger.log(`  ✓ Aplicado: ${delta.file} (+${delta.count} learnings)`);
    }

    // Registra no evolution-log.jsonl (5.5: per-delta entries with UUIDs for rollback)
    const evolutionDir = path.resolve(projectDir, EVOLUTION_DIR);
    await fs.mkdir(evolutionDir, { recursive: true });
    const perDeltaLogFile = path.join(evolutionDir, 'evolution-log.jsonl');
    const ts = new Date().toISOString();
    for (const delta of proposed.slice(0, evolved)) {
      const logEntry = JSON.stringify({
        id: randomUUID(),
        ts,
        type: 'append',
        file: delta.file,
        section: delta.section || null,
        content: delta.content,
        learning_ids: delta.sourceIds || [],
        squad: squadSlug || null,
        status: 'applied'
      });
      await fs.appendFile(perDeltaLogFile, `${logEntry}\n`, 'utf8');
    }

    if (!quiet) logger.log(`\n${evolved} delta(s) aplicado(s) com sucesso.`);
  } finally {
    applyDb.close();
  }

  return { ok: true, evolved, skipped: 0, proposed };
}

/**
 * Subcomando: apply — aplica um arquivo de deltas pendentes.
 */
async function runLearningApply({ args = [], options = {}, logger = console } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const filePath = options.file ? String(options.file) : null;

  if (!filePath) {
    logger.error('--file é obrigatório. Exemplo: aioson learning:apply . --file=.aioson/evolution/pending-XXX.json');
    return { ok: false, error: 'file_required' };
  }

  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(projectDir, filePath);

  let pendingData;
  try {
    pendingData = JSON.parse(await fs.readFile(absolute, 'utf8'));
  } catch (err) {
    logger.error(`Não foi possível ler o arquivo: ${absolute}\n${err.message}`);
    return { ok: false, error: 'file_not_readable' };
  }

  const { proposed = [], rejected = [] } = pendingData;

  if (proposed.length === 0) {
    logger.log('Nenhum delta para aplicar neste arquivo.');
    return { ok: true, evolved: 0 };
  }

  logger.log(`Aplicando ${proposed.length} delta(s)...`);

  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  const db = handle ? handle.db : null;

  let evolved = 0;
  for (const delta of proposed) {
    try {
      await applyDelta(delta, projectDir);
      if (db) {
        for (const id of (delta.sourceIds || [])) {
          try {
            if (id.startsWith('pl-')) {
              promoteProjectLearning(db, id, delta.file);
            } else {
              promoteSquadLearning(db, id, delta.file);
            }
          } catch { /* ok */ }
        }
      }
      evolved++;
      logger.log(`  ✓ ${delta.file}`);
    } catch (err) {
      logger.error(`  ✗ Falha em ${delta.file}: ${err.message}`);
    }
  }

  if (db) db.close();

  // Remove o arquivo pendente após aplicar
  try { await fs.unlink(absolute); } catch { /* ok */ }

  logger.log(`\n${evolved}/${proposed.length} delta(s) aplicado(s).`);
  if (rejected.length > 0) logger.log(`${rejected.length} rejeitado(s) previamente pelos gates.`);

  return { ok: true, evolved };
}

module.exports = { runLearningEvolve, runLearningApply };
