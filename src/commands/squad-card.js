'use strict';

/**
 * aioson squad:card — Generate A2A Agent Card from squad manifest
 *
 * Creates a Google A2A v1.0 compatible Agent Card that describes a squad's
 * capabilities, enabling discovery by external A2A-compatible agents.
 *
 * Usage:
 *   aioson squad:card . --squad=content-team
 *   aioson squad:card . --squad=content-team --output=.well-known/agent.json
 *   aioson squad:card . --squad=content-team --port=3847 --json
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const SQUADS_DIR = path.join('.aioson', 'squads');

/**
 * Read squad manifest.
 */
async function readManifest(projectDir, squadSlug) {
  const manifestPath = path.join(projectDir, SQUADS_DIR, squadSlug, 'squad.manifest.json');
  return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
}

/**
 * Generate an A2A Agent Card from a squad manifest.
 *
 * A2A Agent Card spec (v1.0):
 *   - name, description, url, version
 *   - capabilities: streaming, pushNotifications
 *   - skills[]: id, name, description
 *   - defaultInputModes, defaultOutputModes
 */
function generateAgentCard(manifest, options = {}) {
  const { port = 3847, host = 'localhost' } = options;
  const baseUrl = `http://${host}:${port}/a2a/${manifest.slug}`;

  // Map executors to A2A skills
  const skills = (manifest.executors || []).map((executor) => ({
    id: executor.slug,
    name: executor.title || executor.slug,
    description: executor.role || `Executor: ${executor.slug}`
  }));

  // Add workflow-level skills
  if (manifest.workflows) {
    for (const wf of manifest.workflows) {
      skills.push({
        id: `workflow-${wf.slug}`,
        name: wf.title || wf.slug,
        description: `Workflow: ${wf.title || wf.slug}`
      });
    }
  }

  const card = {
    name: manifest.name || manifest.slug,
    description: manifest.mission || manifest.goal || `AIOSON Squad: ${manifest.slug}`,
    url: baseUrl,
    version: manifest.schemaVersion || '1.0.0',
    provider: {
      organization: 'AIOSON',
      url: 'https://aiosforge.dev'
    },
    capabilities: {
      streaming: true,
      pushNotifications: true,
      stateTransitionHistory: true
    },
    authentication: {
      schemes: ['none']
    },
    skills,
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json']
  };

  // Add port information
  if (manifest.ports) {
    if (manifest.ports.inputs) {
      card.inputPorts = manifest.ports.inputs.map((p) => ({
        key: p.key,
        dataType: p.dataType || 'any',
        description: p.description,
        required: p.required || false
      }));
    }
    if (manifest.ports.outputs) {
      card.outputPorts = manifest.ports.outputs.map((p) => ({
        key: p.key,
        dataType: p.dataType || 'any',
        description: p.description
      }));
    }
  }

  return card;
}

/**
 * CLI handler.
 */
async function runSquadCard({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const squadSlug = String(options.squad || options.s || '').trim();

  if (!squadSlug) {
    logger.error('Error: --squad is required');
    return { ok: false, error: 'missing_squad' };
  }

  let manifest;
  try {
    manifest = await readManifest(targetDir, squadSlug);
  } catch (err) {
    logger.error(`Error reading manifest: ${err.message}`);
    return { ok: false, error: 'manifest_not_found' };
  }

  const port = Number(options.port || 3847);
  const host = options.host || 'localhost';
  const card = generateAgentCard(manifest, { port, host });

  // Write to output path
  const outputPath = options.output
    ? path.resolve(targetDir, options.output)
    : path.join(targetDir, '.well-known', `agent-${squadSlug}.json`);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(card, null, 2), 'utf8');

  if (options.json) return card;

  logger.log(`A2A Agent Card for "${manifest.name || squadSlug}":`);
  logger.log(`  URL:    ${card.url}`);
  logger.log(`  Skills: ${card.skills.length}`);
  for (const s of card.skills) {
    logger.log(`    - ${s.id}: ${s.description}`);
  }
  logger.log('');
  logger.log(`Output: ${path.relative(targetDir, outputPath)}`);

  return { ok: true, card, outputPath: path.relative(targetDir, outputPath) };
}

module.exports = { runSquadCard, generateAgentCard };
