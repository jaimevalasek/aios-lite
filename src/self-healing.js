'use strict';

/**
 * self-healing — auto-retry state and prompt building for failed agent stages.
 *
 * Keeps retry counters and error logs so `workflow:heal` can re-run a stage
 * with corrective context without human re-prompting.
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { ensureDir } = require('./utils');

const MAX_RETRIES = 3;
const RETRIES_DIR = '.aioson/context/pipeline-retries';
const ERRORS_PATH = '.aioson/context/workflow.errors.jsonl';

async function readJsonlLast(filePath, predicate) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      const obj = JSON.parse(lines[i]);
      if (!predicate || predicate(obj)) return obj;
    }
  } catch {
    // ignore read/parse errors
  }
  return null;
}

async function getRetryCount(targetDir, stage) {
  const retriesPath = path.join(targetDir, RETRIES_DIR, `${stage}.json`);
  try {
    const raw = await fs.readFile(retriesPath, 'utf8');
    const data = JSON.parse(raw);
    return Number(data.count || 0);
  } catch {
    return 0;
  }
}

async function incrementRetryCount(targetDir, stage, errorSummary) {
  const retriesPath = path.join(targetDir, RETRIES_DIR, `${stage}.json`);
  await ensureDir(path.dirname(retriesPath));
  const count = await getRetryCount(targetDir, stage);
  const payload = {
    stage,
    count: count + 1,
    lastError: errorSummary || '',
    updatedAt: new Date().toISOString()
  };
  await fs.writeFile(retriesPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload.count;
}

async function logError(targetDir, stage, errorMessage, gateType) {
  const errorsPath = path.join(targetDir, ERRORS_PATH);
  await ensureDir(path.dirname(errorsPath));
  const entry = {
    ts: new Date().toISOString(),
    stage,
    gateType: gateType || 'technical',
    error: errorMessage || ''
  };
  await fs.appendFile(errorsPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

async function getLastError(targetDir, stage) {
  const errorsPath = path.join(targetDir, ERRORS_PATH);
  return readJsonlLast(errorsPath, (obj) => obj.stage === stage);
}

function canRetry(targetDir, stage) {
  return getRetryCount(targetDir, stage).then((c) => c < MAX_RETRIES);
}

function buildHealingPrompt(basePrompt, stage, lastError, retryCount) {
  const remaining = MAX_RETRIES - retryCount;
  const healingBlock = [
    '',
    '## 🩹 Self-Healing Context (auto-injected by AIOSON motor)',
    '',
    `> This is retry attempt **${retryCount}** of **${MAX_RETRIES}** for stage @${stage}.`,
    `> **${remaining}** attempt(s) remain before escalation to the user.`,
    '',
    '### Error that caused the previous failure',
    '```',
    lastError.error || 'Unknown error',
    '```',
    '',
    '### Your task now',
    `1. Read the error above carefully.`,
    `2. Identify the root cause in the codebase (files, types, mocks, paths, etc.).`,
    `3. Apply the minimal fix needed to resolve the error.`,
    `4. Re-run the verification command (e.g., \`tsc --noEmit\`, \`cargo check\`, tests) to confirm the fix.`,
    `5. Only then finish the stage.`,
    '',
    '> Do NOT change unrelated code. Focus only on the error shown above.',
    ''
  ].join('\n');

  return basePrompt + healingBlock;
}

async function buildHealingActivation(targetDir, state, stage, locale, tool, activateStageFn) {
  const retryCount = await getRetryCount(targetDir, stage);
  const lastError = await getLastError(targetDir, stage);

  if (!lastError) {
    throw new Error(`No recorded error found for stage @${stage}. Run the stage normally first.`);
  }

  const baseActivation = await activateStageFn(targetDir, state, locale, tool, stage);
  const healingPrompt = buildHealingPrompt(
    baseActivation.prompt || '',
    stage,
    lastError,
    retryCount + 1
  );

  return {
    ...baseActivation,
    prompt: healingPrompt,
    healing: true,
    retryCount: retryCount + 1,
    maxRetries: MAX_RETRIES
  };
}

module.exports = {
  MAX_RETRIES,
  RETRIES_DIR,
  ERRORS_PATH,
  getRetryCount,
  incrementRetryCount,
  logError,
  getLastError,
  canRetry,
  buildHealingPrompt,
  buildHealingActivation
};
