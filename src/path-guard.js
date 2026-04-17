'use strict';

/**
 * path-guard — canonical path resolution helpers for agent prompts.
 *
 * Prevents agents from misplacing files by injecting the project map
 * into implementation agent prompts.
 */

const path = require('node:path');
const { readFileSafe, fileExists } = require('./preflight-engine');

const PROJECT_MAP_PATH = '.aioson/context/project-map.md';

const FALLBACK_RULES = `
## Path Conventions (fallback)

- When the user says \`/docs/\`, they mean the project root \`docs/\` folder, not \`.aioson/docs/\`.
- When the user specifies a target directory, confirm the exact path before creating files.
- Never replace or remove existing content (log entries, list items, config entries) unless explicitly asked. Only append or modify the targeted item.
- Framework artifacts (specs, state, handoffs) belong in \`.aioson/context/\`.
`.trim();

async function loadProjectMap(targetDir) {
  const mapPath = path.join(targetDir, PROJECT_MAP_PATH);
  if (await fileExists(mapPath)) {
    const content = await readFileSafe(mapPath);
    if (content) return content.trim();
  }
  return FALLBACK_RULES;
}

async function buildPathGuardBlock(targetDir) {
  const map = await loadProjectMap(targetDir);
  return [
    '## Canonical Path Rules',
    '> Resolve all file paths using the map below. Confirm ambiguous paths with the user before creating files.',
    '',
    map
  ].join('\n');
}

module.exports = {
  buildPathGuardBlock,
  loadProjectMap,
  PROJECT_MAP_PATH
};
