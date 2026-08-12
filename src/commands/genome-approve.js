'use strict';

// genome:approve — the USER's freeze of a genome specimen. The counterpart of
// squad:pilot-approve for the genome contract: it refuses to freeze while the
// binding is not compiled or the specimen is missing, then stamps the binding's
// `approval` block with the specimen path, the binding's current sourceHash and
// compilationId, and approvedAt. Any later enrich/recompile drifts the identity
// and makes the approval stale until re-approved. Agents never run this; the
// fidelity-to-taste verdict is exclusively human.

const fs = require('node:fs/promises');
const path = require('node:path');
const { isValidSlug } = require('../dossier/schema');
const { normalizeBinding } = require('../genomes/bindings');
const { specimenDirRel, specimenPathIssue, hasAnyFile } = require('../lib/genome-approval-lint');

async function writeAtomic(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, content, 'utf8');
  await fs.rename(temporary, filePath);
}

/**
 * Collect every RAW object binding entry from the manifest, keeping the live
 * reference so the approval can be written in place without restructuring the
 * manifest (structured `genomeBindings` and legacy `genomes` both stay in
 * their own format). Plain-string entries are skipped: they normalize to
 * status "pending" and can never pass the compiled gate anyway.
 */
function collectBindingEntries(manifest) {
  const out = [];
  const structured = manifest.genomeBindings;
  if (structured && typeof structured === 'object' && !Array.isArray(structured)) {
    for (const entry of Array.isArray(structured.squad) ? structured.squad : []) {
      if (entry && typeof entry === 'object') out.push({ entry, scope: 'squad', executor: null });
    }
    const executors = structured.executors && typeof structured.executors === 'object' ? structured.executors : {};
    for (const [executorSlug, list] of Object.entries(executors)) {
      for (const entry of Array.isArray(list) ? list : []) {
        if (entry && typeof entry === 'object') out.push({ entry, scope: 'executor', executor: executorSlug });
      }
    }
    return out;
  }
  if (Array.isArray(manifest.genomes)) {
    for (const entry of manifest.genomes) {
      if (!entry || typeof entry !== 'object') continue;
      const scope = String(entry.scope || entry.scopeType || entry.level || 'squad').toLowerCase();
      const executorRaw = entry.agentSlug || entry.executorSlug || entry.agent || entry.executor || null;
      const executor = executorRaw ? String(executorRaw).replace(/^@/, '') : null;
      if (scope === 'executor' || scope === 'agent' || executor) {
        if (executor) out.push({ entry, scope: 'executor', executor });
      } else {
        out.push({ entry, scope: 'squad', executor: null });
      }
    }
  }
  return out;
}

async function runGenomeApprove({ args = [], options = {}, logger = console } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const squadSlug = options.squad || null;
  const genomeSlug = options.genome || null;
  if (!squadSlug || !genomeSlug) {
    logger.error('genome:approve requires --squad=<slug> and --genome=<slug>');
    return { ok: false, error: 'missing_slug', exitCode: 1 };
  }
  if (!isValidSlug(squadSlug) || !isValidSlug(genomeSlug)) {
    logger.error(`Invalid slug: ${!isValidSlug(squadSlug) ? squadSlug : genomeSlug}`);
    return { ok: false, error: 'invalid_slug', exitCode: 1 };
  }

  const manifestPath = path.join(projectDir, '.aioson', 'squads', squadSlug, 'squad.manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    logger.error(`Squad manifest not found or unparseable: ${squadSlug}`);
    return { ok: false, error: 'manifest_missing', squad: squadSlug, exitCode: 1 };
  }

  const wantedExecutor = options.executor ? String(options.executor).replace(/^@/, '') : null;
  const candidates = collectBindingEntries(manifest)
    .map((candidate) => ({ ...candidate, normalized: normalizeBinding(candidate.entry) }))
    .filter((candidate) => candidate.normalized && candidate.normalized.slug === genomeSlug)
    .filter((candidate) => (wantedExecutor ? candidate.scope === 'executor' && candidate.executor === wantedExecutor : true));

  if (candidates.length === 0) {
    logger.error(`No binding of genome "${genomeSlug}" found in squad "${squadSlug}"${wantedExecutor ? ` for executor "${wantedExecutor}"` : ''}.`);
    return { ok: false, error: 'binding_missing', squad: squadSlug, genome: genomeSlug, exitCode: 1 };
  }
  if (candidates.length > 1) {
    const places = candidates.map((candidate) => (candidate.scope === 'executor' ? `executor "${candidate.executor}"` : 'squad-wide')).join(', ');
    logger.error(`Genome "${genomeSlug}" is bound in more than one place (${places}); pass --executor=<slug> to pick one.`);
    return { ok: false, error: 'binding_ambiguous', squad: squadSlug, genome: genomeSlug, exitCode: 1 };
  }

  const { entry, scope, executor, normalized } = candidates[0];
  if (normalized.status !== 'compiled') {
    logger.error(`Binding status is "${normalized.status}" — only a compiled binding can be approved; approval freezes proven behavior, not intent.`);
    return { ok: false, error: 'binding_not_compiled', squad: squadSlug, genome: genomeSlug, status: normalized.status, exitCode: 1 };
  }
  if (!normalized.sourceHash && !normalized.compilationId) {
    logger.error('Binding has no sourceHash or compilationId — recompile through the binding service so the approval has an identity to freeze.');
    return { ok: false, error: 'binding_identity_missing', squad: squadSlug, genome: genomeSlug, exitCode: 1 };
  }

  const specimenRel = String(options.specimen || specimenDirRel(squadSlug, genomeSlug)).replace(/\\/g, '/');
  const pathIssue = specimenPathIssue(specimenRel);
  if (pathIssue) {
    logger.error(`Specimen path ${pathIssue} — got "${specimenRel}"`);
    return { ok: false, error: 'specimen_invalid', squad: squadSlug, genome: genomeSlug, specimen: specimenRel, exitCode: 1 };
  }
  if (!hasAnyFile(path.resolve(projectDir, specimenRel))) {
    logger.error(`Specimen is missing or empty: ${specimenRel}`);
    logger.error(`Have the squad's own executor produce a held-out specimen there (default: ${specimenDirRel(squadSlug, genomeSlug)}/), inspect it, then approve.`);
    return { ok: false, error: 'specimen_missing', squad: squadSlug, genome: genomeSlug, specimen: specimenRel, exitCode: 1 };
  }

  entry.approval = {
    specimen: specimenRel,
    sourceHash: normalized.sourceHash,
    compilationId: normalized.compilationId,
    approvedAt: new Date().toISOString()
  };
  await writeAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const payload = {
    ok: true,
    squad: squadSlug,
    genome: genomeSlug,
    scope,
    executor,
    specimen: specimenRel,
    sourceHash: entry.approval.sourceHash,
    compilationId: entry.approval.compilationId,
    approvedAt: entry.approval.approvedAt,
    exitCode: 0
  };
  if (options.json) {
    logger.log(JSON.stringify(payload, null, 2));
  } else {
    logger.log(`Genome approval frozen: "${genomeSlug}" in squad "${squadSlug}" (${scope === 'executor' ? `executor "${executor}"` : 'squad-wide'}).`);
    logger.log(`  specimen:      ${specimenRel}`);
    logger.log(`  sourceHash:    ${payload.sourceHash || '(none)'}`);
    logger.log(`  compilationId: ${payload.compilationId || '(none)'}`);
    logger.log('Enriching or recompiling the genome makes this approval stale until you re-approve.');
  }
  return payload;
}

module.exports = { runGenomeApprove };
