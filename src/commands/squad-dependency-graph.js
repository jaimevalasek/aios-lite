'use strict';

/**
 * aioson squad:dependency-graph [projectDir]
 *
 * Reads squad manifests and renders a dependency graph showing which squads
 * depend on outputs from other squads via `depends_on[]` in their manifest.
 *
 * Usage:
 *   aioson squad:dependency-graph .
 *   aioson squad:dependency-graph . --format=mermaid
 *   aioson squad:dependency-graph . --json
 *
 * Flags:
 *   --format  Output format: ascii (default) | mermaid
 *   --json    Return JSON with squads and edges
 */

const fs = require('node:fs/promises');
const path = require('node:path');

async function loadSquadManifests(projectDir) {
  const squadsDir = path.join(projectDir, '.aioson', 'squads');
  let entries;
  try {
    entries = await fs.readdir(squadsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(squadsDir, entry.name, 'squad.manifest.json');
    try {
      const raw = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      manifests.push(raw);
    } catch { /* skip invalid or missing manifests */ }
  }
  return manifests;
}

function buildEdges(manifests) {
  const edges = [];
  for (const manifest of manifests) {
    for (const dep of manifest.depends_on || []) {
      edges.push({
        from: dep.squad,
        to: manifest.slug,
        event: dep.event || '*',
        inputMapping: dep.input_mapping || null
      });
    }
  }
  return edges;
}

function renderAscii(manifests, edges) {
  const lines = [];
  lines.push('Inter-Squad Dependency Graph');
  lines.push('─'.repeat(44));

  if (edges.length === 0) {
    lines.push('(No inter-squad dependencies declared)');
    lines.push('');
    lines.push('Declare dependencies in your squad manifest:');
    lines.push('  "depends_on": [');
    lines.push('    { "squad": "content-team", "event": "episode.created",');
    lines.push('      "input_mapping": { "file": "tasks[0].context.episode_file" } }');
    lines.push('  ]');
  } else {
    for (const edge of edges) {
      const mapping = edge.inputMapping
        ? `  [maps: ${JSON.stringify(edge.inputMapping)}]`
        : '';
      lines.push(`  [${edge.from}] ──(${edge.event})──▶ [${edge.to}]${mapping}`);
    }
  }

  const involvedSlugs = new Set([
    ...edges.map((e) => e.from),
    ...edges.map((e) => e.to)
  ]);
  const isolated = manifests.filter((m) => !involvedSlugs.has(m.slug));
  if (isolated.length > 0) {
    lines.push('');
    lines.push('Isolated squads (no declared dependencies):');
    for (const m of isolated) {
      lines.push(`  [${m.slug}]  ${m.mission ? '— ' + m.mission : ''}`);
    }
  }

  return lines.join('\n');
}

function renderMermaid(manifests, edges) {
  const lines = ['graph LR'];
  const slugs = new Set(manifests.map((m) => m.slug));

  // Add squad nodes with labels
  for (const m of manifests) {
    lines.push(`  ${m.slug}["${m.name || m.slug}"]`);
  }

  // Add dependency nodes that might not have manifests in this project
  for (const edge of edges) {
    if (!slugs.has(edge.from)) {
      lines.push(`  ${edge.from}["${edge.from} (external)"]`);
    }
  }

  lines.push('');

  // Add edges
  for (const edge of edges) {
    lines.push(`  ${edge.from} -->|"${edge.event}"| ${edge.to}`);
  }

  return lines.join('\n');
}

async function runSquadDependencyGraph({ args, options = {}, logger }) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const format = String(options.format || 'ascii').trim().toLowerCase();

  const manifests = await loadSquadManifests(projectDir);

  if (manifests.length === 0) {
    logger.log('No squad manifests found in .aioson/squads/');
    logger.log('Create a squad first: aioson squad:create .');
    return { ok: true, squads: 0, edges: [] };
  }

  const edges = buildEdges(manifests);

  if (options.json) {
    return {
      ok: true,
      squads: manifests.map((m) => ({ slug: m.slug, name: m.name, dependsOn: m.depends_on || [] })),
      edges
    };
  }

  logger.log('');

  if (format === 'mermaid') {
    logger.log(renderMermaid(manifests, edges));
  } else {
    logger.log(renderAscii(manifests, edges));
  }

  logger.log('');
  logger.log(`${manifests.length} squad(s) · ${edges.length} dependency edge(s)`);
  logger.log('');
  if (edges.length > 0) {
    logger.log('Tips:');
    logger.log('  • Squads publish events via: aioson inter-squad:publish . --from=<squad> --event=<name> --payload=\'{"key":"val"}\'');
    logger.log('  • Squads consume events automatically at the start of squad:autorun');
  }

  return { ok: true, squads: manifests.length, edges };
}

module.exports = { runSquadDependencyGraph };
