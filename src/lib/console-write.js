'use strict';

const fs = require('fs');

// Why two paths. fs.writeSync on a Windows console handle goes through
// WriteFile, so the console decodes our UTF-8 bytes with its legacy codepage
// (cp850/cp437) and renders mojibake: ✓ becomes Ô£ô, — becomes ÔÇö, and every
// pt-BR accent breaks. TTY streams write through the console's Unicode API
// instead, which renders correctly under any codepage — and the CLI never
// calls process.exit(), so pending TTY writes always flush before the process
// ends. Pipes and files keep fs.writeSync: bytes pass through untouched and
// delivery is guaranteed synchronous even where stream writes are not (POSIX
// pipes), which automation consuming --json output relies on.
function writeThrough(stream, fd, text) {
  if (stream.isTTY) stream.write(text);
  else fs.writeSync(fd, text);
}

module.exports = { writeThrough };
