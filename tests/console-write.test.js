'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { writeThrough } = require('../src/lib/console-write');

// A Windows console decodes fd writes with its legacy codepage (cp850), so
// UTF-8 glyphs written through fs.writeSync render as mojibake (✓ → Ô£ô).
// TTY output must therefore go through the stream, which uses the console's
// Unicode API; only pipes/files keep the raw synchronous fd write.
test('writeThrough uses stream.write when the stream is a TTY', () => {
  const written = [];
  const fakeTty = { isTTY: true, write: (text) => written.push(text) };

  writeThrough(fakeTty, 99, 'hooks ✓ instalados — pt-BR\n');

  assert.deepEqual(written, ['hooks ✓ instalados — pt-BR\n']);
});

test('writeThrough writes synchronously to the fd when not a TTY', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-console-write-'));
  const file = path.join(dir, 'out.txt');
  const fd = fs.openSync(file, 'w');
  const pipeLike = {
    isTTY: undefined,
    write() {
      throw new Error('non-TTY output must not go through the stream');
    }
  };

  try {
    writeThrough(pipeLike, fd, 'json para automação → síncrono\n');
    // Read back through the same fd before any close/flush: the write must
    // already be on the file, which is the synchronous-delivery guarantee
    // automation consuming --json depends on.
    assert.equal(
      fs.readFileSync(file, 'utf8'),
      'json para automação → síncrono\n'
    );
  } finally {
    fs.closeSync(fd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
