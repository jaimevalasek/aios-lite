'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  saveAttachment,
  listAttachments,
  readAttachment,
  IMAGE_EXTS,
  MIME_MAP
} = require('../src/squad-dashboard/attachment-handler');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-attachments-'));
}

function attachDir(tmpDir, squadSlug) {
  return path.join(tmpDir, '.aioson', 'squads', squadSlug, 'attachments');
}

// --- saveAttachment ---

test('saveAttachment creates file in attachments directory', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await saveAttachment(tmpDir, 'alpha', 'image.png', Buffer.from('PNG_DATA'));
    assert.equal(result.ok, true);
    assert.equal(result.filename, 'image.png');
    assert.ok(result.filePath.includes('attachments'));
    const exists = await fs.access(result.filePath).then(() => true).catch(() => false);
    assert.equal(exists, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('saveAttachment creates directory automatically when missing', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await saveAttachment(tmpDir, 'newSquad', 'doc.md', Buffer.from('# hello'));
    assert.equal(result.ok, true);
    const dir = attachDir(tmpDir, 'newSquad');
    const stat = await fs.stat(dir);
    assert.ok(stat.isDirectory());
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('saveAttachment marks PNG as isImage=true', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await saveAttachment(tmpDir, 'alpha', 'photo.png', Buffer.from('x'));
    assert.equal(result.isImage, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('saveAttachment marks JPG as isImage=true', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await saveAttachment(tmpDir, 'alpha', 'photo.jpg', Buffer.from('x'));
    assert.equal(result.isImage, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('saveAttachment marks GIF as isImage=true', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await saveAttachment(tmpDir, 'alpha', 'anim.gif', Buffer.from('x'));
    assert.equal(result.isImage, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('saveAttachment marks WebP as isImage=true', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await saveAttachment(tmpDir, 'alpha', 'img.webp', Buffer.from('x'));
    assert.equal(result.isImage, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('saveAttachment marks markdown as isImage=false', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await saveAttachment(tmpDir, 'alpha', 'notes.md', Buffer.from('# doc'));
    assert.equal(result.isImage, false);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('saveAttachment marks JSON as isImage=false', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await saveAttachment(tmpDir, 'alpha', 'data.json', Buffer.from('{}'));
    assert.equal(result.isImage, false);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('saveAttachment sanitizes unsafe filename characters', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await saveAttachment(tmpDir, 'alpha', 'my file (1).png', Buffer.from('x'));
    assert.ok(!result.filename.includes(' '));
    assert.ok(!result.filename.includes('('));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- listAttachments ---

test('listAttachments returns array of saved files with metadata', async () => {
  const tmpDir = await makeTempDir();
  try {
    await saveAttachment(tmpDir, 'alpha', 'a.png', Buffer.from('PNG'));
    await saveAttachment(tmpDir, 'alpha', 'b.md', Buffer.from('# doc'));
    const list = await listAttachments(tmpDir, 'alpha');
    assert.equal(list.length, 2);
    const names = list.map(f => f.filename);
    assert.ok(names.includes('a.png'));
    assert.ok(names.includes('b.md'));
    assert.ok(list[0].size >= 0);
    assert.ok(list[0].mime);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('listAttachments returns empty array when directory does not exist', async () => {
  const tmpDir = await makeTempDir();
  try {
    const list = await listAttachments(tmpDir, 'ghost-squad');
    assert.deepEqual(list, []);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('listAttachments sets isImage correctly per file', async () => {
  const tmpDir = await makeTempDir();
  try {
    await saveAttachment(tmpDir, 'alpha', 'img.png', Buffer.from('x'));
    await saveAttachment(tmpDir, 'alpha', 'doc.txt', Buffer.from('text'));
    const list = await listAttachments(tmpDir, 'alpha');
    const img = list.find(f => f.filename === 'img.png');
    const doc = list.find(f => f.filename === 'doc.txt');
    assert.equal(img.isImage, true);
    assert.equal(doc.isImage, false);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- readAttachment ---

test('readAttachment returns buffer and mime for existing file', async () => {
  const tmpDir = await makeTempDir();
  try {
    await saveAttachment(tmpDir, 'alpha', 'data.json', Buffer.from('{"ok":true}'));
    const result = await readAttachment(tmpDir, 'alpha', 'data.json');
    assert.equal(result.ok, true);
    assert.ok(Buffer.isBuffer(result.buffer));
    assert.equal(result.mime, 'application/json');
    assert.equal(result.filename, 'data.json');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('readAttachment returns ok:false when file does not exist', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await readAttachment(tmpDir, 'alpha', 'missing.png');
    assert.equal(result.ok, false);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- IMAGE_EXTS and MIME_MAP ---

test('IMAGE_EXTS includes standard image extensions', () => {
  assert.ok(IMAGE_EXTS.has('.png'));
  assert.ok(IMAGE_EXTS.has('.jpg'));
  assert.ok(IMAGE_EXTS.has('.jpeg'));
  assert.ok(IMAGE_EXTS.has('.gif'));
  assert.ok(IMAGE_EXTS.has('.webp'));
});

test('MIME_MAP returns correct mime types', () => {
  assert.equal(MIME_MAP['.png'], 'image/png');
  assert.equal(MIME_MAP['.jpg'], 'image/jpeg');
  assert.equal(MIME_MAP['.md'], 'text/markdown');
  assert.equal(MIME_MAP['.json'], 'application/json');
});
