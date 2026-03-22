'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { exists } = require('../utils');
const { validateProjectContextFile } = require('../context');
const { readHandoff } = require('../session-handoff');
const { runtimeStoreExists, openRuntimeDb, listPipelines } = require('../runtime-store');

const STATE_RELATIVE_PATH = '.aioson/context/workflow.state.json';

const ARTIFACT_MAP = {
  setup: { file: '.aioson/context/project.context.md', label: 'project.context.md' },
  product: { file: '.aioson/context/prd.md', label: 'prd.md' },
  analyst: { file: '.aioson/context/discovery.md', label: 'discovery.md' },
  architect: { file: '.aioson/context/architecture.md', label: 'architecture.md' },
  'ux-ui': { file: '.aioson/context/ui-spec.md', label: 'ui-spec.md' }
};

async function scanSquads(targetDir) {
  const squadsDir = path.join(targetDir, '.aioson/squads');
  if (!(await exists(squadsDir))) return [];

  try {
    const entries = await fs.readdir(squadsDir, { withFileTypes: true });
    const squads = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(squadsDir, entry.name, 'squad.manifest.json');
      const agentsDir = path.join(squadsDir, entry.name, 'agents');
      let agentCount = 0;
      try {
        const agents = await fs.readdir(agentsDir);
        agentCount = agents.filter(f => f.endsWith('.md')).length;
      } catch { /* no agents dir */ }

      let status = 'active';
      try {
        const raw = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(raw);
        status = manifest.status || 'active';
      } catch { /* no manifest */ }

      squads.push({ slug: entry.name, agentCount, status });
    }
    return squads;
  } catch {
    return [];
  }
}

async function scanGenomes(targetDir) {
  const genomesDir = path.join(targetDir, '.aioson/genomes');
  if (!(await exists(genomesDir))) return 0;
  try {
    const entries = await fs.readdir(genomesDir);
    return entries.filter(f => f.endsWith('.md') || f.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

async function getPipelineCount(targetDir) {
  const hasDb = await runtimeStoreExists(targetDir);
  if (!hasDb) return { total: 0, active: 0 };
  const handle = await openRuntimeDb(targetDir, { mustExist: true });
  if (!handle) return { total: 0, active: 0 };
  try {
    const pipelines = listPipelines(handle.db);
    const active = pipelines.filter(p => p.status === 'active').length;
    return { total: pipelines.length, active };
  } finally {
    handle.db.close();
  }
}

async function runWorkflowStatus({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');

  // Read workflow state
  const statePath = path.join(targetDir, STATE_RELATIVE_PATH);
  let state = null;
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    state = JSON.parse(raw);
  } catch {
    // no state file
  }

  // Read project context
  const context = await validateProjectContextFile(targetDir);
  const projectName = (context.data && context.data.project_name) || path.basename(targetDir);
  const classification = (state && state.classification)
    || (context.data && context.data.classification)
    || 'unknown';

  // Read last handoff
  const handoff = await readHandoff(targetDir);

  // Check artifacts
  const artifacts = {};
  for (const [stage, info] of Object.entries(ARTIFACT_MAP)) {
    const featureSlug = state && state.featureSlug;
    let filePath = path.join(targetDir, info.file);

    // Feature-scoped artifacts
    if (featureSlug && stage === 'product') {
      const featurePath = path.join(targetDir, `.aioson/context/prd-${featureSlug}.md`);
      if (await exists(featurePath)) {
        artifacts[stage] = { exists: true, label: `prd-${featureSlug}.md` };
        continue;
      }
    }
    if (featureSlug && stage === 'analyst') {
      const reqPath = path.join(targetDir, `.aioson/context/requirements-${featureSlug}.md`);
      if (await exists(reqPath)) {
        artifacts[stage] = { exists: true, label: `requirements-${featureSlug}.md` };
        continue;
      }
    }

    artifacts[stage] = { exists: await exists(filePath), label: info.label };
  }

  // Scan squads, genomes, pipelines
  const squads = await scanSquads(targetDir);
  const genomeCount = await scanGenomes(targetDir);
  const pipelines = await getPipelineCount(targetDir);

  // Build status output
  const mode = (state && state.mode) || 'project';
  const featureSlug = (state && state.featureSlug) || null;

  logger.log('');
  logger.log(`Project: ${projectName} (${classification})`);
  logger.log(`Mode: ${mode}${featureSlug ? ` — feature: ${featureSlug}` : ''}`);
  logger.log('');

  // Workflow sequence
  if (state && state.sequence) {
    const completed = new Set(state.completed || []);
    const skipped = new Set(state.skipped || []);
    const current = state.current || state.next;

    logger.log('Workflow:');
    for (const stage of state.sequence) {
      let marker;
      if (completed.has(stage)) marker = 'done';
      else if (skipped.has(stage)) marker = 'skip';
      else if (stage === current) marker = 'now';
      else marker = '    ';

      const icon = marker === 'done' ? '[v]'
        : marker === 'skip' ? '[-]'
        : marker === 'now' ? '[>]'
        : '[ ]';
      logger.log(`  ${icon} @${stage}`);
    }

    if (state.detour && state.detour.active) {
      logger.log(`  Detour: @${state.detour.agent} (returns to @${state.detour.returnTo})`);
    }
    logger.log('');
  }

  // Artifacts
  logger.log('Artifacts:');
  for (const [stage, info] of Object.entries(artifacts)) {
    const icon = info.exists ? '[v]' : '[ ]';
    logger.log(`  ${icon} ${info.label}`);
  }
  logger.log('');

  // Squads
  if (squads.length > 0) {
    logger.log(`Squads (${squads.length}):`);
    for (const s of squads) {
      logger.log(`  ${s.slug} — ${s.agentCount} agents [${s.status}]`);
    }
    logger.log('');
  }

  // Genomes
  if (genomeCount > 0) {
    logger.log(`Genomes: ${genomeCount}`);
    logger.log('');
  }

  // Pipelines
  if (pipelines.total > 0) {
    logger.log(`Pipelines: ${pipelines.total} (${pipelines.active} active)`);
    logger.log('');
  }

  // Last handoff
  if (handoff) {
    logger.log('Last handoff:');
    if (handoff.last_agent) logger.log(`  Agent: ${handoff.last_agent}`);
    if (handoff.what_was_done) logger.log(`  Done: ${handoff.what_was_done}`);
    if (handoff.what_comes_next) logger.log(`  Next: ${handoff.what_comes_next}`);
    if (handoff.session_ended_at) {
      const elapsed = timeSince(handoff.session_ended_at);
      logger.log(`  When: ${elapsed} ago`);
    }
    logger.log('');
  }

  // Suggestion
  if (state && state.sequence) {
    const current = state.current || state.next;
    if (current) {
      logger.log(`Suggestion: activate @${current}`);
      logger.log(`  aioson workflow:next . --tool=claude`);
    } else {
      logger.log('Workflow is complete.');
    }
  } else if (!context.valid) {
    logger.log('Suggestion: run @setup to initialize the project');
    logger.log('  aioson workflow:next . --tool=claude');
  }

  return {
    ok: true,
    projectName,
    classification,
    mode,
    featureSlug,
    state,
    artifacts,
    squads,
    genomeCount,
    pipelines,
    handoff
  };
}

function timeSince(isoString) {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

module.exports = { runWorkflowStatus };
