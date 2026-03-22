'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { exists, ensureDir } = require('./utils');

const HANDOFF_RELATIVE_PATH = '.aioson/context/last-handoff.json';

async function writeHandoff(targetDir, payload) {
  const handoffPath = path.join(targetDir, HANDOFF_RELATIVE_PATH);
  await ensureDir(path.dirname(handoffPath));
  const handoff = {
    version: 1,
    session_ended_at: new Date().toISOString(),
    last_agent: payload.lastAgent || null,
    last_stage: payload.lastStage || null,
    what_was_done: payload.whatWasDone || null,
    what_comes_next: payload.whatComesNext || null,
    next_agent: payload.nextAgent || null,
    open_decisions: Array.isArray(payload.openDecisions) ? payload.openDecisions : [],
    context_files_updated: Array.isArray(payload.contextFilesUpdated) ? payload.contextFilesUpdated : [],
    workflow_mode: payload.workflowMode || null,
    classification: payload.classification || null,
    feature_slug: payload.featureSlug || null
  };
  await fs.writeFile(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  return { handoffPath: HANDOFF_RELATIVE_PATH, handoff };
}

async function readHandoff(targetDir) {
  const handoffPath = path.join(targetDir, HANDOFF_RELATIVE_PATH);
  if (!(await exists(handoffPath))) return null;
  try {
    const content = await fs.readFile(handoffPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function buildWorkflowHandoff(state, completedStage, nextAgent) {
  const agentLabel = completedStage ? `@${completedStage}` : null;
  const nextLabel = nextAgent ? `@${nextAgent}` : null;

  return {
    lastAgent: agentLabel,
    lastStage: completedStage || null,
    whatWasDone: completedStage
      ? `Stage ${agentLabel} completed.`
      : 'Workflow state updated.',
    whatComesNext: nextLabel
      ? `Next stage: ${nextLabel}`
      : 'Workflow is complete. No pending stages.',
    nextAgent: nextLabel,
    workflowMode: state.mode || null,
    classification: state.classification || null,
    featureSlug: state.featureSlug || null
  };
}

function buildRuntimeLogHandoff(agentName, message, summary) {
  return {
    lastAgent: agentName ? `@${agentName.replace(/^@/, '')}` : null,
    lastStage: null,
    whatWasDone: summary || message || 'Agent session completed.',
    whatComesNext: null,
    nextAgent: null
  };
}

module.exports = {
  HANDOFF_RELATIVE_PATH,
  writeHandoff,
  readHandoff,
  buildWorkflowHandoff,
  buildRuntimeLogHandoff
};
