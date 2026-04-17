'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { runDesignHybridOptions, __test__ } = require('../src/commands/design-hybrid-options');
const { getDesignVariationCatalog, getDesignVariationSources } = require('../src/design-variation-catalog');

function createMockStdin() {
  const stdin = new PassThrough();
  stdin.isTTY = true;
  stdin.isRaw = false;
  stdin._paused = true;
  stdin.setRawModeCalls = [];
  stdin.resumeCalls = 0;
  stdin.pauseCalls = 0;
  stdin.setRawMode = (value) => {
    stdin.isRaw = value;
    stdin.setRawModeCalls.push(value);
  };
  stdin.resume = () => {
    stdin.resumeCalls += 1;
    stdin._paused = false;
    return stdin;
  };
  stdin.pause = () => {
    stdin.pauseCalls += 1;
    stdin._paused = true;
    return stdin;
  };
  stdin.isPaused = () => stdin._paused;
  return stdin;
}

function createMockStdout() {
  return {
    isTTY: true,
    output: '',
    write(chunk) {
      this.output += String(chunk);
      return true;
    }
  };
}

test('design-hybrid prompt restores stdin state and clears readline listeners across groups', async () => {
  const stdin = createMockStdin();
  const stdout = createMockStdout();
  const ui = __test__.getUiText('en');
  const group = {
    title: 'Style modes',
    guidance: 'Choose 1-3 overall visual attitudes.',
    options: [
      {
        id: 'classic-editorial',
        label: 'Classic editorial',
        description: 'Measured hierarchy, serif authority, quieter luxury.'
      }
    ]
  };

  const firstPrompt = __test__.promptMultiSelectGroup(group, ui, { stdin, stdout });
  process.nextTick(() => {
    stdin.emit('data', Buffer.from('\r'));
  });
  const firstSelected = await firstPrompt;

  const secondPrompt = __test__.promptMultiSelectGroup(group, ui, { stdin, stdout });
  process.nextTick(() => {
    stdin.emit('data', Buffer.from('\r'));
  });
  const secondSelected = await secondPrompt;

  assert.deepEqual(firstSelected, []);
  assert.deepEqual(secondSelected, []);
  assert.deepEqual(stdin.setRawModeCalls, [true, false, true, false]);
  assert.equal(stdin.resumeCalls >= 2, true);
  assert.equal(stdin.pauseCalls >= 2, true);
  assert.equal(stdin.isPaused(), true);
  assert.equal(stdin.listenerCount('data'), 0);
  assert.equal(stdin.listenerCount('keypress'), 0);
  assert.match(stdout.output, /AIOSON — Design Hybrid Options/);
});

// ── buildPresetMarkdown ──────────────────────────────────────────────────────

function makeSelections(locale = 'en') {
  const groups = getDesignVariationCatalog(locale);
  const sources = getDesignVariationSources(locale);
  const selections = { __groups: groups, __sources: sources };
  for (const group of groups) selections[group.id] = [];
  return selections;
}

test('buildPresetMarkdown includes required frontmatter fields', () => {
  const selections = makeSelections();
  const content = __test__.buildPresetMarkdown(selections, 'en');
  assert.match(content, /^---\n/);
  assert.match(content, /preset_type: design-variation/);
  assert.match(content, /locale: "en"/);
  assert.match(content, /consumption_mode: "archive_after_generation"/);
  assert.match(content, /modifier_policy: "up_to_2_modifiers"/);
  assert.match(content, /generated_at: "/);
  assert.match(content, /---\n/);
});

test('buildPresetMarkdown with --advanced sets up_to_3_modifiers', () => {
  const selections = makeSelections();
  const content = __test__.buildPresetMarkdown(selections, 'en', { advanced: true });
  assert.match(content, /modifier_policy: "up_to_3_modifiers"/);
});

test('buildPresetMarkdown with persistent option sets persistent consumption_mode', () => {
  const selections = makeSelections();
  const content = __test__.buildPresetMarkdown(selections, 'en', { oneShot: false });
  assert.match(content, /consumption_mode: "persistent"/);
});

test('buildPresetMarkdown pt-BR uses portuguese headings', () => {
  const selections = makeSelections('pt-BR');
  const content = __test__.buildPresetMarkdown(selections, 'pt-BR');
  assert.match(content, /# Preset de Variação de Design/);
  assert.match(content, /## Variações selecionadas/);
  assert.match(content, /## Política do preset/);
  assert.match(content, /## Bloco para prompt/);
});

test('buildPresetMarkdown en uses english headings', () => {
  const selections = makeSelections('en');
  const content = __test__.buildPresetMarkdown(selections, 'en');
  assert.match(content, /# Design Variation Preset/);
  assert.match(content, /## Selected variations/);
  assert.match(content, /## Preset policy/);
  assert.match(content, /## Prompt block/);
});

// ── buildPromptBlock ─────────────────────────────────────────────────────────

test('buildPromptBlock produces yaml block with variation_overlay key', () => {
  const selections = makeSelections();
  const block = __test__.buildPromptBlock(selections);
  assert.match(block, /^variation_overlay:/);
});

test('buildPromptBlock lists all group ids', () => {
  const selections = makeSelections();
  const block = __test__.buildPromptBlock(selections);
  const groups = getDesignVariationCatalog('en');
  for (const group of groups) {
    assert.match(block, new RegExp(`  ${group.id}:`));
  }
});

test('buildPromptBlock includes selected option ids', () => {
  const groups = getDesignVariationCatalog('en');
  const sources = getDesignVariationSources('en');
  const selections = { __groups: groups, __sources: sources };
  for (const group of groups) selections[group.id] = [];
  // pick one option from the first group
  selections[groups[0].id] = [groups[0].options[0]];
  const block = __test__.buildPromptBlock(selections);
  assert.match(block, new RegExp(`    - ${groups[0].options[0].id}`));
});

// ── buildSummary ─────────────────────────────────────────────────────────────

test('buildSummary returns empty array when nothing selected', () => {
  const selections = makeSelections();
  const summary = __test__.buildSummary(selections);
  assert.deepEqual(summary, []);
});

test('buildSummary includes group title and option labels for selected items', () => {
  const groups = getDesignVariationCatalog('en');
  const sources = getDesignVariationSources('en');
  const selections = { __groups: groups, __sources: sources };
  for (const group of groups) selections[group.id] = [];
  selections[groups[0].id] = [groups[0].options[0]];
  const summary = __test__.buildSummary(selections);
  assert.equal(summary.length, 1);
  assert.match(summary[0], new RegExp(groups[0].title));
  assert.match(summary[0], new RegExp(groups[0].options[0].label));
});

// ── runDesignHybridOptions --json ────────────────────────────────────────────

test('runDesignHybridOptions --json returns catalog and metadata without TTY', async () => {
  const result = await runDesignHybridOptions({
    args: ['.'],
    options: { json: true },
    logger: { log() {} },
    io: {}
  });
  assert.equal(result.ok, true);
  assert.equal(typeof result.targetDir, 'string');
  assert.equal(typeof result.locale, 'string');
  assert.ok(result.locale.length > 0);
  assert.equal(result.advanced, false);
  assert.equal(result.modifierPolicy, 'up_to_2_modifiers');
  assert.ok(Array.isArray(result.groups));
  assert.ok(result.groups.length > 0);
  assert.ok(Array.isArray(result.sources));
});

test('runDesignHybridOptions --json --advanced returns up_to_3_modifiers', async () => {
  const result = await runDesignHybridOptions({
    args: ['.'],
    options: { json: true, advanced: true },
    logger: { log() {} },
    io: {}
  });
  assert.equal(result.ok, true);
  assert.equal(result.advanced, true);
  assert.equal(result.modifierPolicy, 'up_to_3_modifiers');
});

test('runDesignHybridOptions --json --locale=pt-BR returns pt-BR locale', async () => {
  const result = await runDesignHybridOptions({
    args: ['.'],
    options: { json: true, locale: 'pt-BR' },
    logger: { log() {} },
    io: {}
  });
  assert.equal(result.ok, true);
  assert.equal(result.locale, 'pt-BR');
  assert.equal(result.localeSource, 'option');
  // first group title should be in Portuguese
  assert.match(result.groups[0].title, /Modos de estilo/);
});

// ── TTY error path ───────────────────────────────────────────────────────────

test('runDesignHybridOptions logs ttyError and returns ok: false when no TTY', async () => {
  const logged = [];
  const nonTtyStream = { isTTY: false };
  const result = await runDesignHybridOptions({
    args: ['.'],
    options: {},
    logger: { log(msg) { logged.push(msg); } },
    io: { stdin: nonTtyStream, stdout: nonTtyStream }
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'TTY required');
  assert.equal(logged.length > 0, true);
  assert.match(logged[0], /terminal/i);
});
