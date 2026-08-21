'use strict';

/**
 * design:seed — deterministic palette/pairing/composition draw for cold-start
 * origination, diversified against the operator's recent measured projects.
 *
 * The engine consumes this at origination time when no identity exists: the
 * draw decides where in the design space the work STARTS (hue family, ground
 * pole, scheme, typeface pairing, hero posture), which is exactly the decision
 * a model prior otherwise makes the same way in every project. Advisory raw
 * material — the model picks ONE candidate and refines it with judgment; an
 * extracted identity always outranks the draw.
 */

const path = require('node:path');
const { resolveTargetDir } = require('../lib/project-root');
const {
  generateSeedCandidates,
  projectFingerprintId,
  readRegistry,
  registryPath,
  REGISTERS
} = require('../lib/design-seed');

const VERSION = '1.0.0';
const GENERATOR = `aioson design:seed@${VERSION}`;

async function runDesignSeed({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const project = path.basename(path.resolve(targetDir));
  const projectId = projectFingerprintId(targetDir);
  const slug = options.slug ? String(options.slug).trim() : null;
  const register = options.register ? String(options.register).trim().toLowerCase() : null;

  if (register && !REGISTERS.includes(register)) {
    const msg = `design:seed: unknown register "${register}". Registers: ${REGISTERS.join(', ')}`;
    if (options.json) { process.exitCode = 1; return { ok: false, error: 'unknown_register', registers: REGISTERS }; }
    logger.error(msg);
    process.exitCode = 1;
    return { ok: false };
  }

  const count = Math.max(1, Math.min(6, Number(options.count) || 3));
  const seed = Number.isFinite(Number(options.seed)) ? Number(options.seed) : 0;

  const registry = readRegistry();
  const avoid = registry.entries.filter((entry) => entry && (entry.project_id ? entry.project_id !== projectId : entry.project !== project));
  const result = generateSeedCandidates({ project: projectId, slug: slug || project, register, count, seed, avoid });

  const payload = {
    generator: GENERATOR,
    ok: true,
    project,
    project_id: projectId,
    slug,
    register: result.register,
    seed,
    basis: result.basis,
    registry: { path: registryPath(), entries: registry.entries.length, avoided: avoid.length },
    candidates: result.candidates
  };

  if (options.json) return payload;

  logger.log(`design:seed — ${result.candidates.length} contrast-solved candidate(s) for ${slug || project}${result.register ? ` (${result.register} register)` : ''}`);
  logger.log(avoid.length > 0
    ? `  diversified against ${avoid.length} recent project fingerprint(s) from ${registryPath()}`
    : '  fingerprint registry is empty — first project draws free');
  logger.log('');
  for (const c of result.candidates) {
    logger.log(`► ${c.label} · ${c.register} · ${c.pole} ground · ${c.scheme}`);
    const r = c.roles;
    logger.log(`  ground ${r.ground.hex} · surface ${r.surface.hex} · ink ${r.ink.hex} · muted ${r.muted.hex}`);
    logger.log(`  accent ${r.accent.hex} (${c.accent_hue}°) · on-accent ${r.accent_ink.hex} · wash ${r.wash.hex}${r.accent_2 ? ` · accent-2 ${r.accent_2.hex}` : ''}`);
    if (c.blocks) logger.log(`  blocks ${c.blocks.map((b) => `${b.hex}/${b.ink}`).join(' · ')}`);
    logger.log(`  contrast: ink ${c.contrast.ink_on_ground} · muted ${c.contrast.muted_on_ground} · accent ${c.contrast.accent_on_ground} · accent-ink ${c.contrast.accent_ink_on_accent}`);
    logger.log(`  type: ${c.pairing.display} / ${c.pairing.ui} (${c.pairing.host}) — ${c.pairing.vibe}`);
    logger.log(`  composition: ${c.composition.hero} — ${c.composition.note}`);
    logger.log(`  rhythm ${c.composition.rhythm} · material: ${c.composition.material}`);
    logger.log(`  finishing floor: ${c.composition.finishing}`);
    logger.log('');
  }
  logger.log('Build FROM one candidate: hue family, pole, and pairing are the starting material; refine roles, scales, and');
  logger.log('composition with judgment. An extracted identity.md outranks any draw. Re-roll with --seed=N; same inputs, same draw.');

  return payload;
}

module.exports = { runDesignSeed, GENERATOR };
