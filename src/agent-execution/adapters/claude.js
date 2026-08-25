'use strict';
const { createAdapter } = require('./base');
const { TOOL_CAPS } = require('../../lib/tool-capabilities');
// sandbox_mode: 'read-only' → plan mode (no edits); 'workspace-write' → the
// registry's unattended flags (the same the desktop client uses for its yolo
// sessions) — a lane worker must edit files and run tests non-interactively.
module.exports=createAdapter('claude',i=>[
  '--print',
  ...(i.sandbox_mode==='read-only'?['--permission-mode','plan']:[]),
  ...(i.sandbox_mode==='workspace-write'?TOOL_CAPS.claude.yolo_args:[]),
  ...(i.model==='configured-default'?[]:['--model',i.model]),
  ...(i.writable_roots?.length?['--add-dir',...i.writable_roots]:[]),
  i.prompt_text
]);
