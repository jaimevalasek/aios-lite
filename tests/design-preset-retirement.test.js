'use strict';

/**
 * Fixed design presets are retired (2026-08-28). The template ships exactly
 * one design skill — the `interface-design` engine — and every visual
 * producer resolves a blank `design_skill` to it. A preset hardcoded a
 * palette and a typeface, so every project that picked the same one looked
 * the same; the engine + identity.md route exists to kill that sameness, and
 * the catalog was the re-roll of the same fixed looks.
 *
 * What this pins:
 *   - the template ships only the engine (no preset dirs, no second engine,
 *     no orphan reference trees, and no template file names a retired id);
 *   - the installer never selects, lists, or asks for a preset again;
 *   - a consumer that still points at a retired preset hears it from the
 *     machine (`inspectRetiredDesignPresets`, `doctor`, i18n in 4 locales).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  DESIGN_ENGINE_ID,
  RETIRED_DESIGN_PRESETS,
  RETIRED_SKILL_TREES,
  isRetiredDesignPreset,
  normalizeDesignProfile,
  inspectRetiredDesignPresets
} = require('../src/lib/design-presets');
const { DESIGN_IDS, DEFAULT_PROFILE, shouldIncludeForProfile } = require('../src/install-profile');
const { MANAGED_FILES } = require('../src/constants');
const { installTemplate } = require('../src/installer');
const { runDoctor } = require('../src/doctor');
const { __test__: wizard } = require('../src/install-wizard');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'template');
const SKILLS = path.join(TEMPLATE, '.aioson', 'skills');
const DOCS = path.join(ROOT, 'docs');
const RETIRED_ID_RE = new RegExp(
  `(?<![\\w-])(${RETIRED_DESIGN_PRESETS.map((id) => id.replace(/[.]/g, '\\.')).join('|')})(?![\\w-])`
);
const SCANNED_EXTENSIONS = new Set(['.md', '.json', '.js', '.txt', '.html']);
// Banner-marked historical archives (docs/pt/_arquivo, template's own
// .../_archived scaffolding) are exempt — their content is frozen by design.
const ARCHIVE_DIR_NAMES = new Set(['_arquivo', '_archived']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ARCHIVE_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

async function makeProject() {
  return fsp.mkdtemp(path.join(os.tmpdir(), 'aioson-design-presets-'));
}

async function writeContext(dir, designSkill) {
  await fsp.mkdir(path.join(dir, '.aioson', 'context'), { recursive: true });
  await fsp.writeFile(
    path.join(dir, '.aioson', 'context', 'project.context.md'),
    `---\nproject_name: "demo"\nproject_type: "site"\ndesign_skill: "${designSkill}"\n---\n\n# Project Context\n`,
    'utf8'
  );
}

test('the template ships exactly one design skill — the engine — and none of the retired trees', () => {
  assert.deepEqual(fs.readdirSync(path.join(SKILLS, 'design')), [DESIGN_ENGINE_ID]);
  for (const rel of RETIRED_SKILL_TREES) {
    assert.equal(fs.existsSync(path.join(TEMPLATE, rel)), false, `${rel} must not ship`);
  }
  assert.equal(fs.existsSync(path.join(SKILLS, 'references')), false, 'the orphan references/ tree must not ship');
  for (const id of RETIRED_DESIGN_PRESETS) {
    assert.equal(fs.existsSync(path.join(SKILLS, 'design', id)), false, `${id} must not ship`);
  }
});

test('MANAGED_FILES names the engine (router + every reference) and no retired preset', () => {
  const designEntries = MANAGED_FILES.filter((rel) => rel.includes('/skills/design/'));
  assert.ok(designEntries.length >= 7, 'the engine router and its references are managed');
  for (const rel of designEntries) {
    assert.ok(rel.startsWith(`.aioson/skills/design/${DESIGN_ENGINE_ID}/`), `unexpected managed design file: ${rel}`);
    assert.ok(fs.existsSync(path.join(TEMPLATE, rel)), `managed file missing from template: ${rel}`);
  }
  assert.ok(designEntries.includes(`.aioson/skills/design/${DESIGN_ENGINE_ID}/references/aesthetic-registers.md`));
  const shipped = walk(path.join(SKILLS, 'design', DESIGN_ENGINE_ID))
    .map((file) => path.relative(TEMPLATE, file).split(path.sep).join('/'));
  assert.deepEqual(shipped.sort(), designEntries.slice().sort(), 'every shipped engine file is managed and vice versa');
  for (const rel of MANAGED_FILES) {
    assert.equal(RETIRED_ID_RE.test(rel), false, `retired preset still managed: ${rel}`);
  }
});

test('no shipped template file or published doc names a retired preset (the catalog cannot creep back through skills, brains, or docs)', () => {
  const offenders = [];
  for (const file of [...walk(TEMPLATE), ...walk(DOCS)]) {
    if (!SCANNED_EXTENSIONS.has(path.extname(file))) continue;
    const content = fs.readFileSync(file, 'utf8');
    const match = RETIRED_ID_RE.exec(content);
    if (match) offenders.push(`${path.relative(ROOT, file)} → ${match[1]}`);
  }
  assert.deepEqual(offenders, []);
});

test('the engine declares itself as the single engine, and the hybrid forge takes project-forged parents only', () => {
  const engine = fs.readFileSync(path.join(SKILLS, 'design', DESIGN_ENGINE_ID, 'SKILL.md'), 'utf8');
  assert.match(engine, /single design engine/);
  assert.match(engine, /A blank `design_skill` resolves to it/);
  assert.match(engine, /Never combined with another design skill/);

  const forge = fs.readFileSync(path.join(SKILLS, 'process', 'design-hybrid-forge', 'SKILL.md'), 'utf8');
  assert.match(forge, /project-forged design skills/);
  assert.match(forge, /never the `interface-design` engine/);
  const pairs = fs.readFileSync(path.join(SKILLS, 'process', 'design-hybrid-forge', 'references', 'pair-compatibility.md'), 'utf8');
  assert.match(pairs, /## Where parents come from/);
  assert.match(pairs, /ships no fixed preset catalog/);
  const agent = fs.readFileSync(path.join(TEMPLATE, '.aioson', 'agents', 'design-hybrid-forge.md'), 'utf8');
  assert.match(agent, /the `interface-design` engine is never a parent/);
});

test('install profile: the engine is the only packaged id, retired ids are normalized away, the engine ships regardless', () => {
  assert.deepEqual(DESIGN_IDS, [DESIGN_ENGINE_ID]);
  assert.equal(isRetiredDesignPreset('clean-saas-ui'), true);
  assert.equal(isRetiredDesignPreset(DESIGN_ENGINE_ID), false);
  assert.equal(isRetiredDesignPreset(''), false);

  assert.deepEqual(normalizeDesignProfile(undefined), { design: 'none', retired: [] });
  assert.deepEqual(normalizeDesignProfile('none'), { design: 'none', retired: [] });
  assert.deepEqual(normalizeDesignProfile('all'), { design: 'all', retired: [] });
  assert.deepEqual(normalizeDesignProfile('warm-craft-ui'), { design: 'none', retired: ['warm-craft-ui'] });
  assert.deepEqual(
    normalizeDesignProfile(['clean-saas-ui', 'interface-design', 'aurora-command-ui']),
    { design: 'interface-design', retired: ['clean-saas-ui', 'aurora-command-ui'] }
  );
  assert.deepEqual(
    normalizeDesignProfile(['forged-a-ui', 'forged-b-ui']),
    { design: ['forged-a-ui', 'forged-b-ui'], retired: [] }
  );

  const retiredProfile = { ...DEFAULT_PROFILE, design: 'clean-saas-ui' };
  assert.equal(shouldIncludeForProfile('.aioson/skills/design/clean-saas-ui/SKILL.md', retiredProfile), false);
  assert.equal(shouldIncludeForProfile(`.aioson/skills/design/${DESIGN_ENGINE_ID}/SKILL.md`, retiredProfile), true);
  assert.equal(shouldIncludeForProfile(`.aioson/skills/design/${DESIGN_ENGINE_ID}/references/aesthetic-registers.md`, DEFAULT_PROFILE), true);
});

test('the install wizard has no design screen and never lists a preset', () => {
  assert.equal(wizard.DESIGNS, undefined);
  assert.equal(wizard.promptDesignCheckbox, undefined);
  const stdout = { isTTY: true, columns: 120, output: '', write(chunk) { this.output += String(chunk); return true; } };
  wizard.renderScreen3(0, stdout);
  assert.ok(stdout.output.includes('3/3'));
  assert.ok(stdout.output.includes('English'));
  assert.equal(RETIRED_ID_RE.test(stdout.output), false);
  const confirm = { isTTY: true, columns: 120, output: '', write(chunk) { this.output += String(chunk); return true; } };
  wizard.renderConfirm(['claude'], ['development'], 'en', { tools: ['claude'], uses: ['development'], design: 'clean-saas-ui', locale: 'en' }, (key) => key, confirm);
  assert.ok(confirm.output.includes('Interface Design (engine'));
  assert.equal(confirm.output.includes('Clean SaaS'), false);
});

test('inspectRetiredDesignPresets names the preset design_skill points at, whether a local copy backs it, and what a saved profile still selects', async () => {
  const dir = await makeProject();
  try {
    await writeContext(dir, 'clean-saas-ui');
    let result = await inspectRetiredDesignPresets(dir);
    assert.equal(result.design_skill, 'clean-saas-ui');
    assert.equal(result.retired_design_skill, 'clean-saas-ui');
    assert.equal(result.local_path, null);
    assert.deepEqual(result.profile_retired, []);

    await fsp.mkdir(path.join(dir, '.aioson', 'skills', 'design', 'clean-saas-ui'), { recursive: true });
    await fsp.writeFile(path.join(dir, '.aioson', 'skills', 'design', 'clean-saas-ui', 'SKILL.md'), '# preset\n', 'utf8');
    result = await inspectRetiredDesignPresets(dir, { installProfile: { design: ['warm-craft-ui', DESIGN_ENGINE_ID] } });
    assert.equal(result.local_path, '.aioson/skills/design/clean-saas-ui/SKILL.md');
    assert.deepEqual(result.profile_retired, ['warm-craft-ui']);

    await writeContext(dir, DESIGN_ENGINE_ID);
    result = await inspectRetiredDesignPresets(dir, { installProfile: { design: 'none' } });
    assert.equal(result.retired_design_skill, null);
    assert.equal(result.local_path, null);
    assert.deepEqual(result.profile_retired, []);

    await writeContext(dir, 'my-forged-ui');
    result = await inspectRetiredDesignPresets(dir);
    assert.equal(result.retired_design_skill, null, 'a project-forged skill is not a retired preset');

    result = await inspectRetiredDesignPresets(path.join(dir, 'missing'));
    assert.equal(result.design_skill, '');
    assert.equal(result.retired_design_skill, null);
    assert.deepEqual(result.retired_trees, []);

    await fsp.mkdir(path.join(dir, '.aioson', 'skills', 'references', 'premium-command-center-ui'), { recursive: true });
    result = await inspectRetiredDesignPresets(dir);
    assert.deepEqual(result.retired_trees, ['.aioson/skills/references/premium-command-center-ui']);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('doctor: silent for the engine, warns (advisory) when design_skill or the saved profile names a retired preset', async () => {
  const dir = await makeProject();
  try {
    await installTemplate(dir, { mode: 'install' });
    await writeContext(dir, DESIGN_ENGINE_ID);
    const clean = await runDoctor(dir);
    assert.equal(clean.checks.some((check) => check.id === 'design:retired_preset'), false);
    assert.equal(clean.checks.some((check) => check.id === 'install:retired_preset_profile'), false);

    await writeContext(dir, 'aurora-command-ui');
    const missing = await runDoctor(dir);
    const missingCheck = missing.checks.find((check) => check.id === 'design:retired_preset');
    assert.ok(missingCheck, 'a retired design_skill is named');
    assert.equal(missingCheck.ok, false);
    assert.equal(missingCheck.severity, 'warning');
    assert.equal(missingCheck.hintKey, 'doctor.retired_design_preset_hint_missing');
    assert.equal(missingCheck.params.id, 'aurora-command-ui');

    await fsp.mkdir(path.join(dir, '.aioson', 'installed-skills', 'aurora-command-ui'), { recursive: true });
    await fsp.writeFile(path.join(dir, '.aioson', 'installed-skills', 'aurora-command-ui', 'SKILL.md'), '# preset\n', 'utf8');
    const meta = JSON.parse(await fsp.readFile(path.join(dir, '.aioson', 'install.json'), 'utf8'));
    meta.install_profile = { tools: ['claude'], uses: ['development'], design: ['aurora-command-ui', 'glassmorphism-ui'], locale: 'en' };
    await fsp.writeFile(path.join(dir, '.aioson', 'install.json'), JSON.stringify(meta, null, 2), 'utf8');
    const local = await runDoctor(dir);
    const localCheck = local.checks.find((check) => check.id === 'design:retired_preset');
    assert.equal(localCheck.hintKey, 'doctor.retired_design_preset_hint_local');
    assert.equal(localCheck.hintParams.path, '.aioson/installed-skills/aurora-command-ui/SKILL.md');
    const profileCheck = local.checks.find((check) => check.id === 'install:retired_preset_profile');
    assert.ok(profileCheck, 'a saved profile that still selects presets is named');
    assert.equal(profileCheck.severity, 'warning');
    assert.equal(profileCheck.params.ids, 'aurora-command-ui, glassmorphism-ui');
    assert.equal(local.livingMemory.retiredDesignPresets.retired_design_skill, 'aurora-command-ui');
    assert.equal(local.checks.some((check) => !check.ok && check.severity !== 'warning' && /retired_preset|retired_trees/.test(check.id)), false, 'advisory: never an error-tier check');
    assert.equal(local.checks.some((check) => check.id === 'skills:retired_trees'), false, 'a fresh install carries none of the retired trees');

    // Trees an older installer copied: named, counted, never deleted.
    await fsp.mkdir(path.join(dir, '.aioson', 'skills', 'design-system'), { recursive: true });
    await fsp.writeFile(path.join(dir, '.aioson', 'skills', 'design-system', 'SKILL.md'), '# second engine\n', 'utf8');
    await fsp.mkdir(path.join(dir, '.aioson', 'skills', 'premium-visual-design', 'components'), { recursive: true });
    const trees = await runDoctor(dir);
    const treesCheck = trees.checks.find((check) => check.id === 'skills:retired_trees');
    assert.ok(treesCheck, 'leftover retired trees are named');
    assert.equal(treesCheck.severity, 'warning');
    assert.equal(treesCheck.params.count, 2);
    assert.equal(treesCheck.hintParams.paths, '.aioson/skills/design-system, .aioson/skills/premium-visual-design');
    assert.ok(fs.existsSync(path.join(dir, '.aioson', 'skills', 'design-system', 'SKILL.md')), 'doctor never deletes them');
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('doctor i18n keys for the retired presets exist in en/pt-BR/es/fr and point at the engine route', () => {
  for (const lang of ['en', 'pt-BR', 'es', 'fr']) {
    const msgs = require(`../src/i18n/messages/${lang}.js`);
    for (const key of [
      'retired_design_preset',
      'retired_design_preset_hint_local',
      'retired_design_preset_hint_missing',
      'retired_design_preset_profile',
      'retired_skill_trees',
      'retired_skill_trees_hint'
    ]) {
      assert.ok(msgs.doctor && msgs.doctor[key], `${lang}: missing doctor.${key}`);
    }
    assert.ok(msgs.doctor.retired_skill_trees_hint.includes('{paths}'), `${lang}: the trees hint lists the paths`);
    assert.ok(msgs.doctor.retired_design_preset_hint_local.includes('interface-design'), `${lang}: the hint must name the engine`);
    assert.ok(msgs.doctor.retired_design_preset_hint_local.includes('identity.md'), `${lang}: the hint must name the identity route`);
    assert.ok(msgs.doctor.retired_design_preset_hint_missing.includes('{id}'), `${lang}: the missing hint names the id`);
    assert.ok(msgs.doctor.retired_design_preset_profile.includes('--reconfigure'), `${lang}: the profile hint names the remedy`);
  }
});
