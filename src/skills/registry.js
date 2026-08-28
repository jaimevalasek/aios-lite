'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const REGISTRY_RELATIVE_PATH = '.aioson/skills/registry.json';
const SKILL_ROOTS = [
  { relative: '.aioson/skills', source: 'builtin' },
  { relative: '.aioson/installed-skills', source: 'installed' }
];
const STANDALONE_CATEGORIES = new Set(['static', 'dynamic']);

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function normalizeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFrontmatter(content) {
  const match = String(content || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

async function walkFiles(root) {
  const files = [];
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function inferLoadTier(category, source) {
  if (source === 'installed') return 'manual';
  if (category === 'process') return 'explicit';
  if (category === 'static') return 'framework_match';
  if (category === 'dynamic') return 'task_match';
  if (category === 'design') {
    return 'design_match';
  }
  if (category === 'squad') return 'agent_owned';
  return 'explicit';
}

function inferExclusiveGroup(category) {
  return category === 'design'
    ? 'design-language'
    : null;
}

async function discoverSkillCatalog(projectDir) {
  const catalog = [];
  for (const root of SKILL_ROOTS) {
    const absoluteRoot = path.join(projectDir, ...root.relative.split('/'));
    const files = await walkFiles(absoluteRoot);
    for (const absolutePath of files) {
      const relativeWithinRoot = normalizePath(path.relative(absoluteRoot, absolutePath));
      const segments = relativeWithinRoot.split('/');
      const base = path.basename(absolutePath);
      const directoryRouter = base === 'SKILL.md';
      const standalone = base.endsWith('.md')
        && segments.length === 2
        && STANDALONE_CATEGORIES.has(segments[0])
        && base.toLowerCase() !== 'readme.md';
      if (!directoryRouter && !standalone) continue;

      const content = await fs.readFile(absolutePath, 'utf8').catch(() => '');
      const frontmatter = parseFrontmatter(content);
      const category = root.source === 'installed'
        ? 'installed'
        : directoryRouter
        ? (segments.length > 1 ? segments[0] : 'root')
        : segments[0];
      const fallbackId = directoryRouter
        ? path.basename(path.dirname(absolutePath))
        : path.basename(absolutePath, path.extname(absolutePath));
      const id = normalizeId(frontmatter.name || fallbackId);
      if (!id) continue;
      catalog.push({
        id,
        path: normalizePath(path.relative(projectDir, absolutePath)),
        source: root.source,
        category,
        description: frontmatter.description || '',
        owner_agents: [],
        triggers: [],
        load_tier: inferLoadTier(category, root.source),
        mutually_exclusive_group: inferExclusiveGroup(category),
        tests: [],
        status: 'active',
        replacement: null,
        last_used_version: null,
        registry_declared: false
      });
    }
  }
  return catalog.sort((left, right) => left.id.localeCompare(right.id) || left.path.localeCompare(right.path));
}

function validateRegistry(registry) {
  const issues = [];
  if (!registry || registry.version !== 1 || !Array.isArray(registry.skills)) {
    return [{ reason: 'invalid_registry_shape', path: REGISTRY_RELATIVE_PATH }];
  }
  const seenIds = new Set();
  const seenPaths = new Set();
  for (const [index, entry] of registry.skills.entries()) {
    const pointer = `skills[${index}]`;
    const id = normalizeId(entry?.id);
    const skillPath = normalizePath(entry?.path);
    if (!id) issues.push({ reason: 'missing_id', entry: pointer });
    if (!skillPath) issues.push({ reason: 'missing_path', entry: pointer });
    if (id && seenIds.has(id)) issues.push({ reason: 'duplicate_id', entry: pointer, id });
    if (skillPath && seenPaths.has(skillPath)) issues.push({ reason: 'duplicate_path', entry: pointer, path: skillPath });
    if (id) seenIds.add(id);
    if (skillPath) seenPaths.add(skillPath);
    for (const field of ['owner_agents', 'triggers', 'tests']) {
      if (entry?.[field] !== undefined && !Array.isArray(entry[field])) {
        issues.push({ reason: 'must_be_array', entry: pointer, field });
      }
    }
    if (entry?.status === 'deprecated' && !entry.replacement) {
      issues.push({ reason: 'deprecated_without_replacement', entry: pointer, id });
    }
  }
  return issues;
}

async function loadSkillRegistry(projectDir) {
  const registryPath = path.join(projectDir, REGISTRY_RELATIVE_PATH);
  try {
    const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
    return {
      exists: true,
      path: REGISTRY_RELATIVE_PATH,
      registry,
      issues: validateRegistry(registry)
    };
  } catch (error) {
    return {
      exists: false,
      path: REGISTRY_RELATIVE_PATH,
      registry: { version: 1, skills: [] },
      issues: error && error.code === 'ENOENT'
        ? [{ reason: 'registry_missing', path: REGISTRY_RELATIVE_PATH }]
        : [{ reason: 'registry_invalid_json', path: REGISTRY_RELATIVE_PATH }]
    };
  }
}

async function resolveSkillCatalog(projectDir) {
  const [discovered, loaded] = await Promise.all([
    discoverSkillCatalog(projectDir),
    loadSkillRegistry(projectDir)
  ]);
  const byPath = new Map(loaded.registry.skills.map((entry) => [normalizePath(entry.path), entry]));
  const catalog = discovered.map((skill) => {
    const override = byPath.get(skill.path);
    if (!override) return skill;
    return {
      ...skill,
      ...override,
      id: normalizeId(override.id || skill.id),
      path: skill.path,
      owner_agents: Array.isArray(override.owner_agents) ? override.owner_agents : [],
      triggers: Array.isArray(override.triggers) ? override.triggers : [],
      tests: Array.isArray(override.tests) ? override.tests : [],
      registry_declared: true
    };
  });
  const discoveredPaths = new Set(discovered.map((skill) => skill.path));
  for (const entry of loaded.registry.skills) {
    const skillPath = normalizePath(entry.path);
    if (!discoveredPaths.has(skillPath)) {
      loaded.issues.push({ reason: 'registered_path_missing', id: normalizeId(entry.id), path: skillPath });
    }
  }
  return { catalog, registry: loaded };
}

module.exports = {
  REGISTRY_RELATIVE_PATH,
  normalizeId,
  parseFrontmatter,
  validateRegistry,
  discoverSkillCatalog,
  loadSkillRegistry,
  resolveSkillCatalog
};
