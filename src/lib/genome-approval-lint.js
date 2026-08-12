'use strict';

/**
 * genome-approval-lint — the deterministic half of the genome approval contract.
 *
 * `genome:doctor` proves structure and the held-out A/B proves scores; neither
 * proves that the compiled behavior carries the source's identity to human
 * judgment. That verdict is frozen by the USER via `aioson genome:approve`,
 * which stamps an `approval` block onto a COMPILED binding in the squad
 * manifest: the specimen the user inspected (under `output/`), plus the
 * binding's `sourceHash` and `compilationId` at freeze time. This lint checks
 * everything checkable without judgment: specimen containment and existence,
 * approval coherence, and staleness — any later enrichment or recompilation
 * changes the binding's identity and invalidates the freeze until the user
 * re-approves. Whether the specimen actually sounds like the source stays with
 * the user — approval is never automated and this lint never issues one.
 */

const fs = require('node:fs');
const path = require('node:path');
const { flattenGenomeBindings } = require('../genomes/bindings');

function specimenDirRel(squadSlug, genomeSlug) {
  return `output/${squadSlug}/specimen/${genomeSlug}`;
}

function describeBindingScope(binding) {
  return binding.scope === 'executor' && binding.agentSlug
    ? `executor "${binding.agentSlug}"`
    : 'squad-wide';
}

/** File → true; directory → true when it contains at least one file anywhere. */
function hasAnyFile(absPath) {
  let stat;
  try {
    stat = fs.statSync(absPath);
  } catch {
    return false;
  }
  if (stat.isFile()) return true;
  if (!stat.isDirectory()) return false;
  const stack = [absPath];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isFile()) return true;
      if (entry.isDirectory()) stack.push(path.join(dir, entry.name));
    }
  }
  return false;
}

/** Containment: specimens are user-visible outputs, never framework internals. */
function specimenPathIssue(specimen) {
  const posix = String(specimen).replace(/\\/g, '/');
  if (posix.includes('..')) return 'must not contain ".."';
  if (!posix.startsWith('output/')) return 'must live under output/';
  return null;
}

function bindingIsStale(binding) {
  const approval = binding.approval;
  if (!approval) return false;
  return (
    (Boolean(approval.sourceHash) && binding.sourceHash !== approval.sourceHash)
    || (Boolean(approval.compilationId) && binding.compilationId !== approval.compilationId)
  );
}

/**
 * Analyze every user approval in one squad manifest. Approvals are optional —
 * a binding without one is simply not checked here — but an approval that IS
 * present must be coherent: existing specimen under output/, a compiled
 * binding, and a compilation identity that still matches the freeze.
 */
function analyzeGenomeApprovals({ targetDir, squadSlug }) {
  const issues = [];
  const warnings = [];
  const metrics = { squad: squadSlug, approvals: 0, stale: 0 };

  const manifestRel = `.aioson/squads/${squadSlug}/squad.manifest.json`;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.resolve(targetDir, manifestRel), 'utf8'));
  } catch {
    issues.push(`squad manifest not found or unparseable: ${manifestRel}`);
    return { issues, warnings, metrics };
  }

  for (const binding of flattenGenomeBindings(manifest.genomeBindings || manifest.genomes)) {
    if (!binding.approval) continue;
    metrics.approvals += 1;
    const label = `genome "${binding.slug}" (${describeBindingScope(binding)})`;
    const approval = binding.approval;

    if (!approval.specimen) {
      issues.push(`${label}: approval has no specimen path — re-freeze with genome:approve`);
    } else {
      const pathIssue = specimenPathIssue(approval.specimen);
      if (pathIssue) {
        issues.push(`${label}: approval specimen path ${pathIssue} — got "${approval.specimen}"`);
      } else if (!hasAnyFile(path.resolve(targetDir, approval.specimen))) {
        issues.push(`${label}: approval specimen is missing or empty on disk: ${approval.specimen}`);
      }
    }

    if (!approval.approvedAt) {
      issues.push(`${label}: approval is missing approvedAt`);
    }
    if (!approval.sourceHash && !approval.compilationId) {
      issues.push(`${label}: approval records no compilation identity — re-freeze with genome:approve`);
    }

    if (binding.status !== 'compiled') {
      metrics.stale += 1;
      issues.push(`${label}: approval rides on a binding whose status is "${binding.status}" — recompile the binding, then re-approve with genome:approve`);
    } else if (bindingIsStale(binding)) {
      metrics.stale += 1;
      issues.push(`${label}: approval is stale — the genome or its compilation changed after the user froze the specimen; re-approve with genome:approve`);
    }
  }

  return { issues, warnings, metrics };
}

function listSquadSlugs(targetDir) {
  const squadsDir = path.resolve(targetDir, '.aioson', 'squads');
  let entries;
  try {
    entries = fs.readdirSync(squadsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));
}

/**
 * Project-wide advisory for `verify:artifact --kind=genome`: after an enrich or
 * recompile, name every squad whose USER approval of this genome no longer
 * matches the binding's compilation identity. Warnings only — the genome itself
 * may be perfectly valid; what drifted is the human freeze.
 */
function findGenomeApprovalDrift({ targetDir, genomeSlug }) {
  const warnings = [];
  for (const squadSlug of listSquadSlugs(targetDir)) {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(
        path.resolve(targetDir, `.aioson/squads/${squadSlug}/squad.manifest.json`), 'utf8'
      ));
    } catch {
      continue;
    }
    for (const binding of flattenGenomeBindings(manifest.genomeBindings || manifest.genomes)) {
      if (binding.slug !== genomeSlug || !binding.approval) continue;
      if (binding.status !== 'compiled') {
        warnings.push(`squad "${squadSlug}": user-approved binding (${describeBindingScope(binding)}) is "${binding.status}" — the frozen specimen no longer reflects a compiled genome; recompile, then re-approve with genome:approve`);
      } else if (bindingIsStale(binding)) {
        warnings.push(`squad "${squadSlug}": user approval (${describeBindingScope(binding)}) is stale — the compilation identity changed since the freeze; re-approve with genome:approve`);
      }
    }
  }
  return warnings;
}

module.exports = {
  analyzeGenomeApprovals,
  findGenomeApprovalDrift,
  specimenDirRel,
  specimenPathIssue,
  hasAnyFile
};
