'use strict';

/**
 * Movimentação resiliente de arquivos/diretórios para os fluxos de archive.
 *
 * No Windows, `fs.rename` de diretório devolve EPERM sempre que QUALQUER
 * processo mantém um handle aberto na árvore (watcher, editor, indexador,
 * antivírus) — o cenário normal de quem está com o projeto aberto. EXDEV
 * aparece quando origem e destino ficam em devices diferentes. Nos dois casos
 * a cópia funciona; só o rename falha.
 *
 * Estratégia por unidade (arquivo ou diretório), mantendo a invariante
 * "destino existe ⇒ conteúdo completo":
 *   1. rename com retries curtos;
 *   2. fallback copy → remove-source; se a CÓPIA falhar no meio, o destino
 *      parcial é removido (rollback) e a origem fica intacta;
 *   3. se apenas o remove-source falhar, o archive está completo — devolve
 *      `sourceResidue` para o chamador reportar a sobra manualmente removível.
 */

const fs = require('node:fs/promises');
const { constants: fsConstants } = require('node:fs');

const FALLBACK_CODES = new Set(['EPERM', 'EACCES', 'EXDEV', 'EBUSY', 'ENOTEMPTY']);
const RENAME_RETRIES = 3;
const RETRY_DELAY_MS = 40;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function removeBestEffort(target, { recursive }) {
  try {
    await fs.rm(target, { recursive, force: true, maxRetries: 3, retryDelay: 80 });
    return null;
  } catch (err) {
    return err;
  }
}

async function moveResilient(from, to, { isDir }) {
  if (await pathExists(to)) {
    const err = new Error(`destination already exists: ${to}`);
    err.code = 'EDESTEXISTS';
    throw err;
  }

  let renameError = null;
  for (let attempt = 0; attempt < RENAME_RETRIES; attempt += 1) {
    try {
      await fs.rename(from, to);
      return { method: 'rename', sourceResidue: false };
    } catch (err) {
      renameError = err;
      if (!FALLBACK_CODES.has(err && err.code)) throw err;
      if (attempt < RENAME_RETRIES - 1) await delay(RETRY_DELAY_MS);
    }
  }

  try {
    if (isDir) {
      await fs.cp(from, to, { recursive: true, force: false, errorOnExist: true });
    } else {
      await fs.copyFile(from, to, fsConstants.COPYFILE_EXCL);
    }
  } catch (copyErr) {
    // Rollback do destino parcial — a origem permanece a única fonte válida.
    await removeBestEffort(to, { recursive: isDir });
    copyErr.message = `copy fallback failed after rename ${renameError && renameError.code}: ${copyErr.message}`;
    throw copyErr;
  }

  const rmError = await removeBestEffort(from, { recursive: isDir });
  if (rmError) {
    return {
      method: 'copy',
      sourceResidue: true,
      residueError: rmError.message || String(rmError)
    };
  }
  return { method: 'copy', sourceResidue: false };
}

async function moveFileResilient(from, to) {
  return moveResilient(from, to, { isDir: false });
}

async function moveDirResilient(from, to) {
  return moveResilient(from, to, { isDir: true });
}

module.exports = { moveFileResilient, moveDirResilient };
