'use strict';

// squad:pilot-approve — the USER's freeze of a squad pilot. The counterpart of
// briefing:approve for the squad contract: it refuses to freeze while the
// deterministic pilot gate still reports issues, then stamps the manifest's
// pilot block with status=approved, the recomputed deliverable fingerprint, and
// approved_at. Agents never run this; the taste verdict is exclusively human.

const fs = require('node:fs/promises');
const path = require('node:path');
const { isValidSlug } = require('../dossier/schema');
const { analyzeSquadPilot, computePilotFingerprint } = require('../lib/squad-pilot-lint');
const { flattenGenomeBindings } = require('../genomes/bindings');
const { resolveTargetDir } = require('../lib/project-root');

async function writeAtomic(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, content, 'utf8');
  await fs.rename(temporary, filePath);
}

async function runSquadPilotApprove({ args = [], options = {}, logger = console } = {}) {
  const projectDir = resolveTargetDir(args);
  const slug = options.squad || args[1];
  if (!slug) {
    logger.error('squad:pilot-approve requires --squad=<slug>');
    return { ok: false, error: 'missing_slug', exitCode: 1 };
  }
  if (!isValidSlug(slug)) {
    logger.error(`Invalid squad slug: ${slug}`);
    return { ok: false, error: 'invalid_slug', slug, exitCode: 1 };
  }

  const manifestPath = path.join(projectDir, '.aioson', 'squads', slug, 'squad.manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    logger.error(`Squad manifest not found or unparseable: ${slug}`);
    return { ok: false, error: 'manifest_missing', slug, exitCode: 1 };
  }

  const pilot = manifest.pilot;
  if (!pilot || typeof pilot !== 'object' || Array.isArray(pilot)) {
    logger.error(`Squad "${slug}" has no pilot block; run @squad pilot ${slug} first.`);
    return { ok: false, error: 'no_pilot_block', slug, exitCode: 1 };
  }
  if (pilot.status !== 'draft' && pilot.status !== 'approved') {
    logger.error(`Pilot status "${pilot.status}" is not approvable; only a built pilot (draft, or approved for a re-freeze) can be frozen.`);
    return { ok: false, error: 'pilot_not_approvable', slug, status: pilot.status || null, exitCode: 1 };
  }

  const analysis = analyzeSquadPilot({ targetDir: projectDir, slug, forApproval: true });
  if (analysis.issues.length > 0) {
    logger.error(`Pilot gate failed for "${slug}" — fix every issue before approving:`);
    for (const issue of analysis.issues) logger.error(`  - ${issue}`);
    return { ok: false, error: 'pilot_gate_failed', slug, issues: analysis.issues, exitCode: 1 };
  }

  const computed = computePilotFingerprint(projectDir, slug);
  if (!computed) {
    logger.error(`Pilot deliverable is empty: output/${slug}/pilot/`);
    return { ok: false, error: 'pilot_empty', slug, exitCode: 1 };
  }

  pilot.status = 'approved';
  pilot.fingerprint = computed.fingerprint;
  pilot.approved_at = new Date().toISOString();
  // Freeze WHO built the pilot, not just what was built: the compiled genome
  // binding identities at approval time. Later genome drift makes the pilot's
  // builder record stale (surfaced by the lint), even when the deliverable
  // fingerprint still matches.
  pilot.builders = flattenGenomeBindings(manifest.genomeBindings || manifest.genomes)
    .filter((binding) => binding.status === 'compiled')
    .map((binding) => ({
      genome: binding.slug,
      scope: binding.scope,
      executor: binding.agentSlug,
      sourceHash: binding.sourceHash,
      compilationId: binding.compilationId
    }));
  delete pilot.deferReason;
  await writeAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const payload = {
    ok: true,
    squad: slug,
    status: 'approved',
    entrypoint: pilot.entrypoint || null,
    fingerprint: pilot.fingerprint,
    approved_at: pilot.approved_at,
    builders: pilot.builders.length,
    deliverable_files: computed.files,
    warnings: analysis.warnings,
    exitCode: 0
  };
  if (options.json) {
    logger.log(JSON.stringify(payload, null, 2));
  } else {
    logger.log(`Pilot approved for squad "${slug}".`);
    logger.log(`  entrypoint:  ${payload.entrypoint || '(none)'}`);
    logger.log(`  fingerprint: ${payload.fingerprint}`);
    logger.log('The approved pilot is now the squad\'s binding quality bar; changing the deliverable makes it stale until re-approved.');
  }
  return payload;
}

module.exports = { runSquadPilotApprove };
