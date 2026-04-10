'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createCircuitBreaker } = require('../harness/circuit-breaker');

/**
 * aioson harness:init — Inicializa o contrato e progresso da feature.
 */
async function runHarnessInit({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = String(options.slug || '').trim();
  const mode = String(options.mode || 'BALANCED').toUpperCase();

  if (!slug) {
    logger.error(t('errors.missing_slug') || 'Error: --slug is required');
    return { ok: false, error: 'missing_slug' };
  }

  const planDir = path.join(targetDir, '.aioson', 'plans', slug);
  const contractPath = path.join(planDir, 'harness-contract.json');
  const progressPath = path.join(planDir, 'progress.json');

  if (fs.existsSync(contractPath) || fs.existsSync(progressPath)) {
    logger.log(t('harness.init_exists', { path: path.relative(targetDir, planDir) }) || `Harness already initialized in ${path.relative(targetDir, planDir)}`);
    return { ok: true, skipped: true };
  }

  if (!fs.existsSync(planDir)) {
    fs.mkdirSync(planDir, { recursive: true });
  }

  const contract = {
    feature: slug,
    contract_mode: mode,
    governor: {
      max_steps: 50,
      error_streak_limit: 5,
      cost_ceiling_tokens: null
    },
    criteria: [
      {
        id: "C1",
        description: "Estrutura de arquivos e sintaxe básica",
        assertion: "all files exist and parse",
        binary: true
      }
    ]
  };

  const cb = createCircuitBreaker(contractPath, progressPath);
  // cb.load() vai criar o progress inicial se não existir
  fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2), 'utf8');
  await cb.load();
  await cb._save(); // Garante a criação do progress.json inicial

  logger.log(t('harness.init_success', { slug }) || `Harness initialized for feature: ${slug}`);
  return { ok: true, slug, path: planDir };
}

/**
 * aioson harness:validate — Executa validação manual e atualiza progresso.
 */
async function runHarnessValidate({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = String(options.slug || '').trim();
  const artifact = options.artifact ? String(options.artifact).trim() : null;

  if (!slug) {
    logger.error(t('errors.missing_slug') || 'Error: --slug is required');
    return { ok: false, error: 'missing_slug' };
  }

  const contractPath = path.join(targetDir, '.aioson', 'plans', slug, 'harness-contract.json');
  const progressPath = path.join(targetDir, '.aioson', 'plans', slug, 'progress.json');

  if (!fs.existsSync(contractPath)) {
    logger.error(t('harness.contract_not_found') || `Contract not found for slug: ${slug}`);
    return { ok: false, error: 'contract_not_found' };
  }

  const cb = createCircuitBreaker(contractPath, progressPath);
  await cb.load();

  const { allowed, reason } = cb.check();
  if (!allowed) {
    logger.log(t('harness.blocked', { reason }) || `Execution paused: ${reason}`);
    return { ok: false, reason };
  }

  logger.log(t('harness.validating', { slug }) || `Validating harness for ${slug}...`);

  // NOTA: No Slice 2 faremos o upgrade do verify-gate para suportar --contract.
  // Por enquanto, chamamos o verify:gate via shell (subprocesso) como planejado na arquitetura.
  const { execSync } = require('node:child_process');
  
  try {
    const specPath = path.join(targetDir, '.aioson', 'context', `spec-${slug}.md`);
    const cmd = `aioson verify:gate . --spec="${specPath}" ${artifact ? `--artifact="${artifact}"` : ''} --json`;
    
    const output = execSync(cmd, { cwd: targetDir, encoding: 'utf8' });
    const result = JSON.parse(output);

    if (result.verdict === 'PASS' || result.verdict === 'PASS_WITH_NOTES') {
      await cb.recordSuccess();
      logger.log(`  ✓ PASS — ${slug}`);
      return { ok: true, verdict: result.verdict };
    } else {
      const firstIssue = result.issues?.[0]?.message || result.verdict;
      await cb.recordError(firstIssue);
      logger.log(`  ✗ ${result.verdict} — ${firstIssue}`);
      return { ok: false, verdict: result.verdict, error: firstIssue };
    }
  } catch (err) {
    await cb.recordError(err.message.slice(0, 100));
    logger.error(`  ✗ Error during validation: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

module.exports = { runHarnessInit, runHarnessValidate };
