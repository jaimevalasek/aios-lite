'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runSquadStatus } = require('../src/commands/squad-status');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-squad-status-'));
}

function createCollectLogger() {
  const lines = [];
  return {
    lines,
    log(line) {
      lines.push(String(line));
    },
    error(line) {
      lines.push(String(line));
    }
  };
}

test('squad:status reads metadata, sessions, latest html and logs', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  const logger = createCollectLogger();

  await fs.mkdir(path.join(dir, '.aios-lite', 'squads'), { recursive: true });
  await fs.mkdir(path.join(dir, 'agents', 'youtube-viral'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', 'youtube-viral'), { recursive: true });
  await fs.mkdir(path.join(dir, 'aios-logs', 'youtube-viral'), { recursive: true });

  await fs.writeFile(
    path.join(dir, '.aios-lite', 'squads', 'youtube-viral.md'),
    [
      'Squad: YouTube Viral',
      'Mode: Squad',
      'Goal: Criar roteiros e titulos',
      'Agents: agents/youtube-viral/',
      'Output: output/youtube-viral/',
      'Logs: aios-logs/youtube-viral/',
      'LatestSession: output/youtube-viral/latest.html',
      'Genomes:',
      '- .aios-lite/genomas/storytelling-retencao.md',
      '',
      'AgentGenomes:',
      '- roteirista-viral: .aios-lite/genomas/copy-youtube.md',
      ''
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(path.join(dir, 'agents', 'youtube-viral', 'roteirista.md'), '# agente\n', 'utf8');
  await fs.writeFile(path.join(dir, 'agents', 'youtube-viral', 'copywriter.md'), '# agente\n', 'utf8');
  await fs.writeFile(path.join(dir, 'agents', 'youtube-viral', 'orquestrador.md'), '# agente\n', 'utf8');
  await fs.writeFile(
    path.join(dir, 'output', 'youtube-viral', '2026-03-06-153000-main.html'),
    '<html></html>',
    'utf8'
  );
  await fs.writeFile(path.join(dir, 'output', 'youtube-viral', 'latest.html'), '<html></html>', 'utf8');
  await fs.writeFile(path.join(dir, 'aios-logs', 'youtube-viral', 'run-1.md'), 'log\n', 'utf8');

  const result = await runSquadStatus({
    args: [dir],
    options: {},
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.count, 1);
  assert.equal(result.squads[0].agentCount, 3);
  assert.equal(result.squads[0].specialistCount, 2);
  assert.equal(result.squads[0].sessionCount, 1);
  assert.equal(result.squads[0].logCount, 1);
  assert.equal(result.squads[0].latestHtml, 'output/youtube-viral/latest.html');
  assert.equal(result.squads[0].genomes.length, 1);
  assert.equal(result.squads[0].agentGenomes.length, 1);

  assert.equal(logger.lines.some((line) => line.includes('Squad       : YouTube Viral')), true);
  assert.equal(logger.lines.some((line) => line.includes('Agentes     : 2 especialistas / 3 total')), true);
  assert.equal(logger.lines.some((line) => line.includes('Sessoes     : 1 (output/youtube-viral)')), true);
  assert.equal(logger.lines.some((line) => line.includes('Latest HTML : output/youtube-viral/latest.html')), true);
  assert.equal(logger.lines.some((line) => line.includes('Logs        : 1 (aios-logs/youtube-viral)')), true);
  assert.equal(logger.lines.some((line) => line.includes('Genomas     : 1 no squad / 1 vinculos por agente')), true);
});

test('squad:status falls back to agents directory when metadata is missing', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  const logger = createCollectLogger();

  await fs.mkdir(path.join(dir, 'agents', 'fallback-squad'), { recursive: true });
  await fs.mkdir(path.join(dir, 'output', 'fallback-squad'), { recursive: true });

  await fs.writeFile(path.join(dir, 'agents', 'fallback-squad', 'researcher.md'), '# agent\n', 'utf8');
  await fs.writeFile(path.join(dir, 'agents', 'fallback-squad', 'orquestrador.md'), '# agent\n', 'utf8');
  await fs.writeFile(
    path.join(dir, 'output', 'fallback-squad', '2026-03-06-160000-topic.html'),
    '<html></html>',
    'utf8'
  );

  const result = await runSquadStatus({
    args: [dir],
    options: {},
    logger,
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.count, 1);
  assert.equal(result.squads[0].slug, 'fallback-squad');
  assert.equal(result.squads[0].sessionCount, 1);
  assert.equal(
    result.squads[0].latestHtml,
    'output/fallback-squad/2026-03-06-160000-topic.html'
  );
  assert.equal(logger.lines.some((line) => line.includes('Agents      : 1 specialists / 2 total')), true);
});
