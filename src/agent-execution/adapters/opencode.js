'use strict';
const { createAdapter } = require('./base');
// OpenCode has no verified read-only or unattended flag in the registry
// (src/lib/tool-capabilities.js): a caller that asks for a sandbox_mode is
// refused by createAdapter (`sandbox_mode_unsupported` /
// `permission_mode_unsupported`) instead of getting a process that runs with
// the CLI's default permissions — more power than a read-only researcher's
// contract, less certainty than a lane worker's.
module.exports=createAdapter('opencode',i=>['run',...(i.sandbox_args||[]),...(i.model==='configured-default'?[]:['--model',i.model]),i.prompt_text]);
