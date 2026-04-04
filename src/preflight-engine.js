'use strict';

/**
 * preflight-engine — shared deterministic utilities for preflight, gate:check, artifact:validate.
 * No LLM calls. Pure file parsing + logic.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

// ─── Frontmatter parser ───────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fileStat(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

// ─── Framework detection ──────────────────────────────────────────────────────

const FRAMEWORK_INDICATORS = [
  { file: 'composer.json', key: 'laravel/framework', name: 'Laravel' },
  { file: 'composer.json', key: 'symfony/framework-bundle', name: 'Symfony' },
  { file: 'package.json', key: '"next"', name: 'Next.js' },
  { file: 'package.json', key: '"nuxt"', name: 'Nuxt.js' },
  { file: 'package.json', key: '"react"', name: 'React' },
  { file: 'package.json', key: '"vue"', name: 'Vue' },
  { file: 'package.json', key: '"svelte"', name: 'Svelte' },
  { file: 'package.json', key: '"express"', name: 'Express' },
  { file: 'Gemfile', key: 'rails', name: 'Rails' },
  { file: 'requirements.txt', key: 'django', name: 'Django' },
  { file: 'requirements.txt', key: 'fastapi', name: 'FastAPI' },
  { file: 'requirements.txt', key: 'flask', name: 'Flask' },
  { file: 'go.mod', key: 'gin-gonic', name: 'Gin' },
  { file: 'go.mod', key: 'echo', name: 'Echo' },
  { file: 'Cargo.toml', key: 'actix-web', name: 'Actix' },
  { file: 'foundry.toml', key: null, name: 'Foundry (Solidity)' }
];

async function detectFramework(targetDir) {
  for (const { file, key, name } of FRAMEWORK_INDICATORS) {
    const filePath = path.join(targetDir, file);
    const content = await readFileSafe(filePath);
    if (!content) continue;
    if (!key || content.toLowerCase().includes(key.toLowerCase())) {
      return name;
    }
  }
  return null;
}

// ─── Test runner detection ────────────────────────────────────────────────────

const TEST_RUNNER_INDICATORS = [
  { file: 'phpunit.xml', name: 'Pest/PHPUnit', command: 'php artisan test' },
  { file: 'phpunit.xml.dist', name: 'PHPUnit', command: './vendor/bin/phpunit' },
  { file: 'jest.config.js', name: 'Jest', command: 'npx jest' },
  { file: 'jest.config.ts', name: 'Jest', command: 'npx jest' },
  { file: 'jest.config.mjs', name: 'Jest', command: 'npx jest' },
  { file: 'vitest.config.js', name: 'Vitest', command: 'npx vitest' },
  { file: 'vitest.config.ts', name: 'Vitest', command: 'npx vitest' },
  { file: 'vitest.config.mjs', name: 'Vitest', command: 'npx vitest' },
  { file: 'pytest.ini', name: 'Pytest', command: 'pytest' },
  { file: 'setup.cfg', name: 'Pytest', command: 'pytest', key: '[tool:pytest]' },
  { file: 'pyproject.toml', name: 'Pytest', command: 'pytest', key: '[tool.pytest' },
  { file: '.rspec', name: 'RSpec', command: 'bundle exec rspec' },
  { file: 'foundry.toml', name: 'Forge', command: 'forge test' },
  { file: 'Makefile', name: 'Make', command: 'make test', key: 'test:' }
];

async function detectTestRunner(targetDir) {
  for (const { file, name, command, key } of TEST_RUNNER_INDICATORS) {
    const filePath = path.join(targetDir, file);
    const content = await readFileSafe(filePath);
    if (!content) continue;
    if (key && !content.includes(key)) continue;
    return { name, command, configFile: file };
  }

  // Check package.json scripts
  const pkgContent = await readFileSafe(path.join(targetDir, 'package.json'));
  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent);
      if (pkg.scripts && pkg.scripts.test) {
        const testScript = pkg.scripts.test;
        if (testScript.includes('jest')) return { name: 'Jest', command: 'npm test', configFile: 'package.json' };
        if (testScript.includes('vitest')) return { name: 'Vitest', command: 'npm test', configFile: 'package.json' };
        if (testScript.includes('mocha')) return { name: 'Mocha', command: 'npm test', configFile: 'package.json' };
        return { name: 'npm test', command: 'npm test', configFile: 'package.json' };
      }
    } catch { /* ignore */ }
  }

  return null;
}

// ─── Context file paths ───────────────────────────────────────────────────────

function contextDir(targetDir) {
  return path.join(targetDir, '.aioson', 'context');
}

function rulesDir(targetDir) {
  return path.join(targetDir, '.aioson', 'rules');
}

function artifactPath(targetDir, name, slug) {
  const dir = contextDir(targetDir);
  if (slug) return path.join(dir, `${name}-${slug}.md`);
  return path.join(dir, `${name}.md`);
}

// ─── Project context reader ───────────────────────────────────────────────────

async function loadProjectContext(targetDir) {
  const filePath = path.join(contextDir(targetDir), 'project.context.md');
  const content = await readFileSafe(filePath);
  if (!content) return { exists: false, data: {} };
  const data = parseFrontmatter(content);
  return { exists: true, data, content };
}

// ─── Artifact scanner ─────────────────────────────────────────────────────────

async function scanArtifacts(targetDir, slug) {
  const dir = contextDir(targetDir);

  async function check(name, filePath) {
    const stat = await fileStat(filePath);
    if (!stat) return { exists: false };

    const content = await readFileSafe(filePath);
    const fm = content ? parseFrontmatter(content) : {};

    return {
      exists: true,
      path: path.relative(targetDir, filePath),
      size: stat.size,
      frontmatter: fm,
      content
    };
  }

  const results = {
    project_context: await check('project.context', path.join(dir, 'project.context.md')),
    prd: slug ? await check('prd', path.join(dir, `prd-${slug}.md`)) : { exists: false },
    sheldon_enrichment: slug ? await check('sheldon', path.join(dir, `sheldon-enrichment-${slug}.md`)) : { exists: false },
    requirements: slug ? await check('requirements', path.join(dir, `requirements-${slug}.md`)) : { exists: false },
    spec: slug ? await check('spec', path.join(dir, `spec-${slug}.md`)) : await check('spec', path.join(dir, 'spec.md')),
    architecture: await check('architecture', path.join(dir, 'architecture.md')),
    implementation_plan: slug ? await check('impl-plan', path.join(dir, `implementation-plan-${slug}.md`)) : { exists: false },
    conformance: slug ? await check('conformance', path.join(dir, `conformance-${slug}.yaml`)) : { exists: false },
    dev_state: await check('dev-state', path.join(dir, 'dev-state.md')),
    features: await check('features', path.join(dir, 'features.md'))
  };

  return results;
}

// ─── Gate reader ─────────────────────────────────────────────────────────────

const GATE_NAMES = {
  A: 'requirements',
  B: 'design',
  C: 'plan',
  D: 'execution'
};

const GATE_ALIASES = {
  requirements: 'A',
  design: 'B',
  plan: 'C',
  execution: 'D'
};

function parseGatesFromSpec(content) {
  if (!content) return {};
  const fm = parseFrontmatter(content);
  const gates = {};

  // Try explicit gate fields: gate_requirements, gate_design, gate_plan, gate_execution
  for (const [letter, name] of Object.entries(GATE_NAMES)) {
    const val = fm[`gate_${name}`] || fm[`gate${letter}`] || fm[`gate_${letter}`];
    if (val) gates[name] = val.toLowerCase();
  }

  // Try phase_gates JSON field
  if (fm.phase_gates) {
    try {
      const parsed = JSON.parse(fm.phase_gates.replace(/'/g, '"'));
      Object.assign(gates, parsed);
    } catch { /* ignore */ }
  }

  // Try scanning content for gate approval lines
  const gateLineRe = /gate\s+([A-D])[^:]*:\s*(approved|pending|rejected)/gi;
  let m;
  while ((m = gateLineRe.exec(content)) !== null) {
    const letter = m[1].toUpperCase();
    const name = GATE_NAMES[letter];
    if (name && !gates[name]) gates[name] = m[2].toLowerCase();
  }

  return gates;
}

async function readPhaseGates(targetDir, slug) {
  const specFile = slug
    ? path.join(contextDir(targetDir), `spec-${slug}.md`)
    : path.join(contextDir(targetDir), 'spec.md');

  const content = await readFileSafe(specFile);
  if (!content) return {};
  return parseGatesFromSpec(content);
}

// ─── Dev state reader ─────────────────────────────────────────────────────────

async function readDevState(targetDir) {
  const filePath = path.join(contextDir(targetDir), 'dev-state.md');
  const content = await readFileSafe(filePath);
  if (!content) return { exists: false };
  const fm = parseFrontmatter(content);
  return { exists: true, ...fm, content };
}

// ─── Project pulse reader ────────────────────────────────────────────────────

async function readProjectPulse(targetDir) {
  const filePath = path.join(contextDir(targetDir), 'project-pulse.md');
  const content = await readFileSafe(filePath);
  if (!content) return { exists: false };
  const fm = parseFrontmatter(content);
  return { exists: true, ...fm, content };
}

// ─── Classification reader ────────────────────────────────────────────────────

async function detectClassification(targetDir, slug) {
  // 1. Try project context
  const ctx = await loadProjectContext(targetDir);
  if (ctx.data.classification) return ctx.data.classification.toUpperCase();

  // 2. Try spec frontmatter
  if (slug) {
    const specContent = await readFileSafe(path.join(contextDir(targetDir), `spec-${slug}.md`));
    if (specContent) {
      const fm = parseFrontmatter(specContent);
      if (fm.classification) return fm.classification.toUpperCase();
    }

    // 3. Try PRD frontmatter
    const prdContent = await readFileSafe(path.join(contextDir(targetDir), `prd-${slug}.md`));
    if (prdContent) {
      const fm = parseFrontmatter(prdContent);
      if (fm.classification) return fm.classification.toUpperCase();
    }
  }

  return null;
}

// ─── Rules discovery ──────────────────────────────────────────────────────────

async function discoverRules(targetDir, agent) {
  const dir = rulesDir(targetDir);
  const rules = [];

  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return rules;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const content = await readFileSafe(path.join(dir, entry));
    if (!content) continue;

    // Check applicability: universal rules or agent-specific
    const fm = parseFrontmatter(content);
    const applies = !fm.agents || fm.agents.includes('all') || fm.agents.includes(agent);
    if (applies) rules.push(entry);
  }

  return rules;
}

// ─── Context package builder ──────────────────────────────────────────────────

function buildContextPackage(agent, slug, classification, artifacts, devState) {
  const pkg = [];

  if (artifacts.project_context.exists) pkg.push(artifacts.project_context.path);

  if (slug) {
    // Feature-specific context
    if (artifacts.spec.exists) pkg.push(artifacts.spec.path);
    if (artifacts.implementation_plan.exists) pkg.push(artifacts.implementation_plan.path);
    if (artifacts.requirements.exists && ['analyst', 'architect', 'dev'].includes(agent)) {
      pkg.push(artifacts.requirements.path);
    }
  }

  // Agent-specific additions
  if (agent === 'dev' && artifacts.dev_state.exists) pkg.push('dev-state.md (check for active state)');
  if (agent === 'qa' && artifacts.spec.exists) pkg.push(artifacts.spec.path);
  if (agent === 'architect' && artifacts.architecture.exists) pkg.push(artifacts.architecture.path);

  return [...new Set(pkg)];
}

// ─── Readiness evaluator ─────────────────────────────────────────────────────

function evaluateReadiness(artifacts, phaseGates, classification, agent) {
  const blockers = [];

  if (!artifacts.project_context.exists) blockers.push('project.context.md missing');

  if (agent === 'dev') {
    if (!artifacts.spec.exists) blockers.push('spec file missing');
    if (phaseGates.plan && phaseGates.plan !== 'approved') {
      blockers.push(`Gate C (plan) not approved: ${phaseGates.plan || 'pending'}`);
    }
  }

  if (agent === 'qa') {
    if (!artifacts.spec.exists) blockers.push('spec file missing');
  }

  if (agent === 'analyst') {
    if (!artifacts.prd.exists) blockers.push('prd file missing');
  }

  if (agent === 'architect') {
    if (!artifacts.requirements.exists) blockers.push('requirements file missing');
  }

  return blockers.length === 0
    ? { status: 'READY', blockers: [] }
    : { status: 'BLOCKED', blockers };
}

// ─── Spec version extractor ───────────────────────────────────────────────────

function extractSpecVersion(artifact) {
  if (!artifact.exists) return null;
  return artifact.frontmatter.version || null;
}

function extractLastCheckpoint(artifact) {
  if (!artifact.exists) return null;
  const fm = artifact.frontmatter;
  if (fm.last_checkpoint) return fm.last_checkpoint;

  // Scan content for checkpoint patterns
  if (artifact.content) {
    const m = artifact.content.match(/last_checkpoint:\s*(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  parseFrontmatter,
  readFileSafe,
  fileExists,
  fileStat,
  detectFramework,
  detectTestRunner,
  contextDir,
  rulesDir,
  artifactPath,
  loadProjectContext,
  scanArtifacts,
  parseGatesFromSpec,
  readPhaseGates,
  readDevState,
  readProjectPulse,
  detectClassification,
  discoverRules,
  buildContextPackage,
  evaluateReadiness,
  extractSpecVersion,
  extractLastCheckpoint,
  GATE_NAMES,
  GATE_ALIASES
};
