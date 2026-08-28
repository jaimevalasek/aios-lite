'use strict';
const { createAdapter } = require('./base');
// sandbox_mode: 'read-only' → the provider's read-only sandbox;
// 'workspace-write' → the provider's sandboxed workspace-write (never the
// approvals/sandbox bypass): a lane worker edits inside the project and runs
// its tests, and the sandbox is what keeps that bounded.
//
// --skip-git-repo-check: Codex refuses to run outside a Git repository, and the
// caller decides where it runs — a lane worker runs in the project (a repo),
// but `host:signature` probes in an empty temporary directory on purpose. The
// sandbox is what bounds the writes here; the repo check only bounds where.
module.exports=createAdapter('codex',i=>({args:[
  'exec',
  '--skip-git-repo-check',
  ...(i.sandbox_mode==='read-only'?['--sandbox','read-only']:[]),
  ...(i.sandbox_mode==='workspace-write'?['--sandbox','workspace-write']:[]),
  ...(i.model==='configured-default'?[]:['--model',i.model]),
  ...(i.reasoning_effort?['-c',`model_reasoning_effort="${i.reasoning_effort}"`]:[]),
  ...(i.writable_roots||[]).flatMap(root=>['--add-dir',root]),
  '-'
],stdin:true}));
