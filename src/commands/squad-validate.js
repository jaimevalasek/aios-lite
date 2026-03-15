'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

async function pathExists(targetPath) {
  try { await fs.access(targetPath); return true; } catch { return false; }
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

function validateManifestFields(manifest) {
  const errors = [];
  const warnings = [];
  const required = ['schemaVersion', 'slug', 'name', 'mode', 'mission', 'goal'];

  for (const field of required) {
    if (!manifest[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (manifest.slug && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(manifest.slug)) {
    errors.push(`Invalid slug format: "${manifest.slug}" (must be kebab-case)`);
  }

  if (manifest.mode && !['content', 'software', 'research', 'mixed'].includes(manifest.mode)) {
    warnings.push(`Unknown mode: "${manifest.mode}"`);
  }

  return { errors, warnings };
}

async function validateStructure(projectDir, slug, manifest) {
  const errors = [];
  const warnings = [];
  const squadDir = path.join(projectDir, '.aioson', 'squads', slug);

  const requiredFiles = [
    { rel: 'squad.manifest.json', label: 'Manifest' },
    { rel: 'agents/agents.md', label: 'Agents manifesto' },
    { rel: 'agents/orquestrador.md', label: 'Orchestrator agent' },
  ];

  for (const { rel, label } of requiredFiles) {
    if (!(await pathExists(path.join(squadDir, rel)))) {
      errors.push(`Missing required file: ${rel} (${label})`);
    }
  }

  // Check executor files
  const executors = Array.isArray(manifest.executors) ? manifest.executors : [];
  for (const exec of executors) {
    if (exec.file) {
      const absPath = path.join(projectDir, exec.file);
      if (!(await pathExists(absPath))) {
        errors.push(`Executor "${exec.slug}" file not found: ${exec.file}`);
      }
    }
  }

  // Check output dir (warning only)
  const outputDir = path.join(projectDir, 'output', slug);
  if (!(await pathExists(outputDir))) {
    warnings.push(`Output directory not found: output/${slug}/`);
  }

  return { errors, warnings };
}

async function validateSemantics(manifest) {
  const errors = [];
  const warnings = [];
  const executors = Array.isArray(manifest.executors) ? manifest.executors : [];

  // Check for duplicate slugs
  const slugs = executors.map(e => e.slug);
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupes.length > 0) {
    errors.push(`Duplicate executor slugs: ${[...new Set(dupes)].join(', ')}`);
  }

  // Check executors without skills
  for (const exec of executors) {
    const skills = Array.isArray(exec.skills) ? exec.skills : [];
    if (skills.length === 0) {
      warnings.push(`Executor "${exec.slug}" has no skills declared`);
    }
  }

  return { errors, warnings };
}

async function validateSemanticDeep(projectDir, slug, manifest) {
  const errors = [];
  const warnings = [];

  // 1. Slug do manifesto bate com diretório
  if (manifest.slug && manifest.slug !== slug) {
    errors.push(`Slug mismatch: manifest says "${manifest.slug}" but directory is "${slug}"`);
  }

  // 2. Skills referenciadas pelos executores estão declaradas no manifesto
  const declaredSkills = Array.isArray(manifest.skills) ? manifest.skills.map(s => s.slug) : [];
  const executors = Array.isArray(manifest.executors) ? manifest.executors : [];
  for (const exec of executors) {
    const execSkills = Array.isArray(exec.skills) ? exec.skills : [];
    for (const skillSlug of execSkills) {
      if (!declaredSkills.includes(skillSlug)) {
        warnings.push(`Executor "${exec.slug}" references skill "${skillSlug}" not declared in manifest.skills`);
      }
    }
  }

  // 3. Content blueprints têm sections válidas
  const blueprints = Array.isArray(manifest.contentBlueprints) ? manifest.contentBlueprints : [];
  for (const bp of blueprints) {
    if (!bp.sections || bp.sections.length === 0) {
      warnings.push(`Content blueprint "${bp.slug}" has no sections defined`);
    }
  }

  // 4. CLAUDE.md e AGENTS.md mencionam o squad
  const claudeMd = path.join(projectDir, 'CLAUDE.md');
  const agentsMd = path.join(projectDir, 'AGENTS.md');
  try {
    const claudeContent = await fs.readFile(claudeMd, 'utf8');
    if (!claudeContent.includes(slug)) {
      warnings.push(`CLAUDE.md does not reference squad "${slug}"`);
    }
  } catch { warnings.push('CLAUDE.md not found'); }

  try {
    const agentsContent = await fs.readFile(agentsMd, 'utf8');
    if (!agentsContent.includes(slug)) {
      warnings.push(`AGENTS.md does not reference squad "${slug}"`);
    }
  } catch { warnings.push('AGENTS.md not found'); }

  // 5. Readiness não contradiz blockers
  if (manifest.readiness) {
    for (const [dim, val] of Object.entries(manifest.readiness)) {
      if (val && val.status === 'ready' && val.blocker) {
        warnings.push(`Readiness "${dim}" is "ready" but has blocker: "${val.blocker}"`);
      }
    }
  }

  return { errors, warnings };
}

async function runSquadValidate({ args = [], options = {}, logger = console } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = options.squad || args[1];

  if (!slug) {
    logger.error('Usage: aioson squad:validate [path] --squad=<slug>');
    return { valid: false, errors: ['No slug provided'], warnings: [] };
  }

  const manifestPath = path.join(projectDir, '.aioson', 'squads', slug, 'squad.manifest.json');
  const manifest = await readJsonIfExists(manifestPath);

  if (!manifest) {
    logger.error(`Squad "${slug}" not found or invalid manifest at ${manifestPath}`);
    return { valid: false, errors: ['Manifest not found or invalid JSON'], warnings: [] };
  }

  const allErrors = [];
  const allWarnings = [];

  // Layer 1: Schema
  const schema = validateManifestFields(manifest);
  allErrors.push(...schema.errors);
  allWarnings.push(...schema.warnings);

  // Layer 2: Structure
  const structure = await validateStructure(projectDir, slug, manifest);
  allErrors.push(...structure.errors);
  allWarnings.push(...structure.warnings);

  // Layer 3: Semantics (basic)
  const semantics = await validateSemantics(manifest);
  allErrors.push(...semantics.errors);
  allWarnings.push(...semantics.warnings);

  // Layer 4: Semantic deep
  const semanticDeep = await validateSemanticDeep(projectDir, slug, manifest);
  allErrors.push(...semanticDeep.errors);
  allWarnings.push(...semanticDeep.warnings);

  // Report
  const valid = allErrors.length === 0;
  const status = valid
    ? (allWarnings.length > 0 ? 'VALID (with warnings)' : 'VALID')
    : 'INVALID';

  logger.log('');
  logger.log(`\u2550\u2550 Squad Validation: ${slug} \u2550\u2550`);
  logger.log('');
  logger.log(`  Schema:         ${schema.errors.length === 0 ? '\u2705 PASS' : '\u274c FAIL'}`);
  logger.log(`  Structure:      ${structure.errors.length === 0 ? '\u2705 PASS' : '\u274c FAIL'}`);
  logger.log(`  Semantics:      ${semantics.errors.length === 0 ? (semantics.warnings.length > 0 ? '\u26a0\ufe0f  WARNINGS' : '\u2705 PASS') : '\u274c FAIL'}`);
  logger.log(`  Semantic deep:  ${semanticDeep.errors.length === 0 ? (semanticDeep.warnings.length > 0 ? '\u26a0\ufe0f  WARNINGS' : '\u2705 PASS') : '\u274c FAIL'}`);

  if (allErrors.length > 0) {
    logger.log('');
    logger.log('  Errors:');
    for (const err of allErrors) logger.log(`    \u274c ${err}`);
  }

  if (allWarnings.length > 0) {
    logger.log('');
    logger.log('  Warnings:');
    for (const warn of allWarnings) logger.log(`    \u26a0\ufe0f  ${warn}`);
  }

  logger.log('');
  logger.log(`  Result: ${status}`);
  logger.log('');

  return { valid, errors: allErrors, warnings: allWarnings, status };
}

module.exports = { runSquadValidate };
