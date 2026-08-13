'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { moveFileResilient, moveDirResilient } = require('../src/lib/fs-move');

async function makeTmpDir() {
  return fsp.mkdtemp(path.join(os.tmpdir(), 'aioson-fs-move-'));
}

async function exists(p) {
  return fsp.access(p).then(() => true).catch(() => false);
}

// Patch pontual de fsp.rename: falha com `code` para um prefixo de origem.
// node:fs/promises é o MESMO objeto que src/lib/fs-move consome (cache de core
// modules do CJS), então o patch alcança o módulo sob teste.
function failRenameFor(prefix, code) {
  const original = fsp.rename;
  fsp.rename = async (from, to) => {
    if (String(from).startsWith(prefix)) {
      const err = new Error(`${code}: simulated lock, rename '${from}' -> '${to}'`);
      err.code = code;
      throw err;
    }
    return original.call(fsp, from, to);
  };
  return () => { fsp.rename = original; };
}

test('fs-move: rename feliz para arquivo e diretório', async () => {
  const tmp = await makeTmpDir();
  await fsp.writeFile(path.join(tmp, 'a.txt'), 'x', 'utf8');
  const fileResult = await moveFileResilient(path.join(tmp, 'a.txt'), path.join(tmp, 'b.txt'));
  assert.equal(fileResult.method, 'rename');
  assert.equal(await exists(path.join(tmp, 'b.txt')), true);

  await fsp.mkdir(path.join(tmp, 'src', 'nested'), { recursive: true });
  await fsp.writeFile(path.join(tmp, 'src', 'nested', 'f.txt'), 'y', 'utf8');
  const dirResult = await moveDirResilient(path.join(tmp, 'src'), path.join(tmp, 'dst'));
  assert.equal(dirResult.method, 'rename');
  assert.equal(await exists(path.join(tmp, 'dst', 'nested', 'f.txt')), true);
  assert.equal(await exists(path.join(tmp, 'src')), false);
});

test('fs-move: EPERM no rename de diretório cai para copy+remove (classe A3)', async () => {
  const tmp = await makeTmpDir();
  const src = path.join(tmp, 'locked-dir');
  await fsp.mkdir(path.join(src, 'sub'), { recursive: true });
  await fsp.writeFile(path.join(src, 'sub', 'deep.txt'), 'conteudo', 'utf8');
  await fsp.writeFile(path.join(src, 'root.txt'), 'raiz', 'utf8');

  const restore = failRenameFor(src, 'EPERM');
  try {
    const result = await moveDirResilient(src, path.join(tmp, 'archived'));
    assert.equal(result.method, 'copy');
    assert.equal(result.sourceResidue, false);
  } finally {
    restore();
  }

  assert.equal(await exists(path.join(tmp, 'archived', 'sub', 'deep.txt')), true);
  assert.equal(await exists(path.join(tmp, 'archived', 'root.txt')), true);
  assert.equal(await exists(src), false, 'origem deve ser removida após a cópia');
});

test('fs-move: falha na cópia faz rollback do destino parcial e preserva a origem', async () => {
  const tmp = await makeTmpDir();
  const src = path.join(tmp, 'src-dir');
  await fsp.mkdir(src, { recursive: true });
  await fsp.writeFile(path.join(src, 'f.txt'), 'z', 'utf8');

  const restoreRename = failRenameFor(src, 'EPERM');
  const originalCp = fsp.cp;
  fsp.cp = async () => {
    const err = new Error('EBUSY: simulated copy failure');
    err.code = 'EBUSY';
    throw err;
  };
  try {
    await assert.rejects(
      () => moveDirResilient(src, path.join(tmp, 'dst-dir')),
      /copy fallback failed/
    );
  } finally {
    fsp.cp = originalCp;
    restoreRename();
  }

  assert.equal(await exists(src), true, 'origem intacta após rollback');
  assert.equal(await exists(path.join(tmp, 'dst-dir')), false, 'destino parcial removido');
});

test('fs-move: destino existente é recusado antes de qualquer mutação', async () => {
  const tmp = await makeTmpDir();
  await fsp.writeFile(path.join(tmp, 'a.txt'), '1', 'utf8');
  await fsp.writeFile(path.join(tmp, 'b.txt'), '2', 'utf8');
  await assert.rejects(
    () => moveFileResilient(path.join(tmp, 'a.txt'), path.join(tmp, 'b.txt')),
    (err) => err.code === 'EDESTEXISTS'
  );
  assert.equal(await fsp.readFile(path.join(tmp, 'b.txt'), 'utf8'), '2');
});

test('fs-move: EPERM em arquivo cai para copyFile+unlink', async () => {
  const tmp = await makeTmpDir();
  const src = path.join(tmp, 'locked.txt');
  await fsp.writeFile(src, 'file-content', 'utf8');

  const restore = failRenameFor(src, 'EPERM');
  try {
    const result = await moveFileResilient(src, path.join(tmp, 'moved.txt'));
    assert.equal(result.method, 'copy');
  } finally {
    restore();
  }
  assert.equal(await fsp.readFile(path.join(tmp, 'moved.txt'), 'utf8'), 'file-content');
  assert.equal(await exists(src), false);
});
