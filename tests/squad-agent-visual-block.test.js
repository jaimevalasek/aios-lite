'use strict';

/**
 * A squad-generated executor has no name the framework routes, so the
 * anti-slop stack (one design engine, visual-quality brain, design:seed, the
 * measured kind=visual gate) must ride in its prompt whenever the role ships
 * something people see — and stay out of a copywriter's.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runSquadAgentCreate, isVisualRole, visualQualityBlock } = require('../src/commands/squad-agent-create');
const { queryBrains } = require('../src/brain-query');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

async function makeProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-squad-visual-'));
  await fs.mkdir(path.join(dir, '.aioson', 'context'), { recursive: true });
  return dir;
}

test('visual roles are detected from slug, domain, mission or focus — not from a marketing role', () => {
  assert.equal(isVisualRole({ slug: 'landing-designer' }), true);
  assert.equal(isVisualRole({ slug: 'ui-specialist' }), true);
  assert.equal(isVisualRole({ slug: 'analista', focus: ['Monta dashboards de KPI'] }), true);
  assert.equal(isVisualRole({ slug: 'dev', domain: 'front-end' }), true);
  assert.equal(isVisualRole({ slug: 'copywriter', mission: 'Writes headlines and CTAs' }), false);
  assert.equal(isVisualRole({ slug: 'gestor-trafego', mission: 'Runs paid traffic on Meta and Google' }), false);
});

test('the visual block is CLI-backed: engine, brain, seed, replaceability, and the kind=visual done gate', () => {
  const block = visualQualityBlock().join('\n');
  assert.match(block, /interface-design\/SKILL\.md/);
  assert.match(block, /aioson brain:query \. --tags=visual-quality,layout/);
  assert.match(block, /aioson design:seed \. --register=<register>/);
  assert.match(block, /[Rr]eplaceability test/);
  assert.match(block, /aioson verify:artifact \. --kind=visual --dir=<deliverable dir> --advisory/);
  assert.match(block, /visual-implementation\.md/);
  assert.match(block, /visual-effects\.md/);
});

test('squad:agent:create emits the visual block for a designer and not for a copywriter', async () => {
  const dir = await makeProject();
  const designer = await runSquadAgentCreate({
    args: [dir],
    options: { name: 'landing-designer', mission: 'Designs landing pages for clients' },
    logger: makeLogger()
  });
  assert.equal(designer.ok, true, JSON.stringify(designer));
  const designerPrompt = await fs.readFile(path.join(dir, '.aioson', 'my-agents', 'landing-designer.md'), 'utf8');
  assert.match(designerPrompt, /## Visual quality intelligence/);
  assert.match(designerPrompt, /--kind=visual/);

  const copy = await runSquadAgentCreate({
    args: [dir],
    options: { name: 'copywriter', mission: 'Writes headlines, body text and CTAs' },
    logger: makeLogger()
  });
  assert.equal(copy.ok, true, JSON.stringify(copy));
  const copyPrompt = await fs.readFile(path.join(dir, '.aioson', 'my-agents', 'copywriter.md'), 'utf8');
  assert.doesNotMatch(copyPrompt, /## Visual quality intelligence/);
});

test('the visual-quality brain routes to the squad UI specialist and to @ux-ui by name', async () => {
  const projectRoot = path.resolve(__dirname, '..');
  for (const agent of ['ui-specialist', 'ux-ui']) {
    const result = await queryBrains({ targetDir: projectRoot, agent, tags: ['visual-quality'], minQuality: 4 });
    assert.ok(result.nodes.length >= 20, `${agent}: expected the visual brain's nodes, got ${result.nodes.length}`);
  }
});
