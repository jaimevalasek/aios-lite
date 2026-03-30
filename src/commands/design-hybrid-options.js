'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');
const { validateProjectContextFile } = require('../context');
const { resolveAgentLocale } = require('../locales');
const { ensureDir } = require('../utils');
const {
  getDesignVariationCatalog,
  getDesignVariationSources
} = require('../design-variation-catalog');

function resolveTargetDir(args) {
  return path.resolve(process.cwd(), args[0] || '.');
}

async function detectProjectLocale(targetDir) {
  const context = await validateProjectContextFile(targetDir);
  if (context.parsed && context.data && context.data.conversation_language) {
    return {
      locale: resolveAgentLocale(context.data.conversation_language),
      source: 'project-context'
    };
  }
  return {
    locale: 'en',
    source: 'default'
  };
}

function resolveLocale(optionsLocale, projectLocale) {
  return resolveAgentLocale(optionsLocale || projectLocale || 'en');
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate())
  ].join('') + '-' + [
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds())
  ].join('');
}

function getUiText(locale) {
  if (locale === 'pt-BR') {
    return {
      title: 'AIOSON — Opções do Design Hybrid',
      instructions: 'Use ↑/↓ para mover, espaço para marcar, enter para confirmar, q para cancelar.',
      launching: 'Abrindo seletor de variações de design...',
      saved: 'Preset de variação salvo.',
      path: 'Arquivo ativo',
      history: 'Histórico',
      promptReady: 'Bloco pronto para usar com @design-hybrid-forge:',
      presetHeading: '# Preset de Variação de Design',
      presetIntro: 'Use este arquivo como overlay de variação para `@design-hybrid-forge` ou `/design-hybrid-forge`. O arquivo ativo deve ser arquivado após a skill híbrida ser gerada; a cópia em histórico permanece como trilha de criação.',
      selectedVariations: '## Variações selecionadas',
      presetPolicy: '## Política do preset',
      presetPolicyLines: [
        '- Este preset é temporário e serve apenas para a próxima geração da skill híbrida.',
        '- Após a geração, mova ou apague `.aioson/context/design-variation-preset.md`.',
        '- O histórico em `.aioson/context/history/design-variation-presets/` deve ser preservado.',
        '- O layout padrão do projeto continua sendo definido pela `design_skill` ativa, não por este preset.'
      ],
      promptBlock: '## Bloco para prompt',
      sources: '## Fontes',
      none: 'nenhum',
      ttyError: 'Execute este comando em um terminal interativo, ou use --json para inspecionar o catálogo.'
    };
  }

  return {
    title: 'AIOSON — Design Hybrid Options',
    instructions: 'Use ↑/↓ to move, space to toggle, enter to confirm, q to cancel.',
    launching: 'Launching design variation picker...',
    saved: 'Design variation preset saved.',
    path: 'Active file',
    history: 'History',
    promptReady: 'Prompt block ready for @design-hybrid-forge:',
    presetHeading: '# Design Variation Preset',
    presetIntro: 'Use this file as a variation overlay for `@design-hybrid-forge` or `/design-hybrid-forge`. The active file should be archived after the hybrid skill is generated; the history copy remains as the creation trail.',
    selectedVariations: '## Selected variations',
    presetPolicy: '## Preset policy',
    presetPolicyLines: [
      '- This preset is temporary and should drive only the next hybrid skill generation.',
      '- After generation, move or delete `.aioson/context/design-variation-preset.md`.',
      '- Keep the history copy in `.aioson/context/history/design-variation-presets/`.',
      '- The project default layout still comes from the active `design_skill`, not from this preset.'
    ],
    promptBlock: '## Prompt block',
    sources: '## Sources',
    none: 'none',
    ttyError: 'Run this command in an interactive terminal, or use --json to inspect the catalog.'
  };
}

function clearScreen(stdout = process.stdout) {
  stdout.write('\x1Bc');
}

function renderGroup(group, cursor, selected, ui, stdout = process.stdout) {
  clearScreen(stdout);
  stdout.write(`${ui.title}\n\n`);
  stdout.write(`${group.title}\n`);
  stdout.write(`${group.guidance}\n`);
  stdout.write(`${ui.instructions}\n\n`);

  for (let i = 0; i < group.options.length; i++) {
    const option = group.options[i];
    const isActive = i === cursor;
    const isSelected = selected.has(option.id);
    const marker = isSelected ? '[x]' : '[ ]';
    const pointer = isActive ? '>' : ' ';
    stdout.write(`${pointer} ${marker} ${option.label}\n`);
    stdout.write(`    ${option.description}\n`);
  }
}

async function promptMultiSelectGroup(group, ui, io = {}) {
  const stdin = io.stdin || process.stdin;
  const stdout = io.stdout || process.stdout;

  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('Interactive design-hybrid:options requires a TTY terminal.');
  }

  readline.emitKeypressEvents(stdin);
  const wasRaw = Boolean(stdin.isRaw);
  const wasPaused = typeof stdin.isPaused === 'function' ? stdin.isPaused() : true;
  if (typeof stdin.setRawMode === 'function') stdin.setRawMode(true);
  if (typeof stdin.resume === 'function') stdin.resume();

  let cursor = 0;
  const selected = new Set();

  return new Promise((resolve, reject) => {
    let cleanedUp = false;

    function cleanup() {
      if (cleanedUp) return;
      cleanedUp = true;
      stdin.removeListener('keypress', onKeypress);
      if (stdin.listenerCount('keypress') === 0 && stdin.listenerCount('data') > 0) {
        stdin.emit('data', Buffer.alloc(0));
      }
      if (typeof stdin.setRawMode === 'function') stdin.setRawMode(wasRaw);
      if (wasPaused && typeof stdin.pause === 'function') stdin.pause();
      stdout.write('\n');
    }

    function onKeypress(_str, key) {
      if (key && key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Interrupted'));
        return;
      }

      if (key && key.name === 'q') {
        cleanup();
        reject(new Error('Cancelled'));
        return;
      }

      if (key && key.name === 'up') {
        cursor = cursor === 0 ? group.options.length - 1 : cursor - 1;
        renderGroup(group, cursor, selected, ui, stdout);
        return;
      }

      if (key && key.name === 'down') {
        cursor = cursor === group.options.length - 1 ? 0 : cursor + 1;
        renderGroup(group, cursor, selected, ui, stdout);
        return;
      }

      if (key && key.name === 'space') {
        const id = group.options[cursor].id;
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        renderGroup(group, cursor, selected, ui, stdout);
        return;
      }

      if (key && key.name === 'return') {
        cleanup();
        resolve(group.options.filter((option) => selected.has(option.id)));
      }
    }

    stdin.on('keypress', onKeypress);
    renderGroup(group, cursor, selected, ui, stdout);
  });
}

function buildPromptBlock(selections) {
  const lines = ['variation_overlay:'];
  for (const group of selections.__groups) {
    const chosen = selections[group.id] || [];
    lines.push(`  ${group.id}:`);
    if (chosen.length === 0) {
      lines.push('    - none');
      continue;
    }
    for (const option of chosen) {
      lines.push(`    - ${option.id}`);
    }
  }
  return lines.join('\n');
}

function buildPresetMarkdown(selections, locale, options = {}) {
  const generatedAt = new Date().toISOString();
  const oneShot = options.oneShot !== false;
  const modifierPolicy = options.advanced ? 'up_to_3_modifiers' : 'up_to_2_modifiers';
  const ui = getUiText(locale);
  const lines = [
    '---',
    'preset_type: design-variation',
    `locale: "${locale}"`,
    `consumption_mode: "${oneShot ? 'archive_after_generation' : 'persistent'}"`,
    `modifier_policy: "${modifierPolicy}"`,
    `generated_at: "${generatedAt}"`,
    '---',
    '',
    ui.presetHeading,
    '',
    ui.presetIntro,
    '',
    ui.selectedVariations
  ];

  for (const group of selections.__groups) {
    lines.push('');
    lines.push(`### ${group.title}`);
    const chosen = selections[group.id] || [];
    if (chosen.length === 0) {
      lines.push(`- ${ui.none}`);
      continue;
    }
    for (const option of chosen) {
      lines.push(`- ${option.label} — ${option.description}`);
    }
  }

  lines.push('');
  lines.push(ui.presetPolicy);
  lines.push('');
  for (const line of ui.presetPolicyLines) {
    lines.push(line);
  }
  lines.push('');
  lines.push(ui.promptBlock);
  lines.push('');
  lines.push('```yaml');
  lines.push(buildPromptBlock(selections));
  lines.push('```');
  lines.push('');
  lines.push(ui.sources);
  for (const source of selections.__sources) {
    lines.push(`- ${source.label}: ${source.url}`);
  }

  return `${lines.join('\n')}\n`;
}

function buildSummary(selections) {
  const parts = [];
  for (const group of selections.__groups) {
    const chosen = selections[group.id] || [];
    if (chosen.length === 0) continue;
    parts.push(`${group.title}: ${chosen.map((item) => item.label).join(', ')}`);
  }
  return parts;
}

async function runDesignHybridOptions({ args, options = {}, logger, io = {} }) {
  const targetDir = resolveTargetDir(args);
  const presetPath = path.join(targetDir, '.aioson/context/design-variation-preset.md');
  const historyDir = path.join(targetDir, '.aioson/context/history/design-variation-presets');
  const stdin = io.stdin || process.stdin;
  const stdout = io.stdout || process.stdout;
  const projectLocaleResult = await detectProjectLocale(targetDir);
  const projectLocale = projectLocaleResult.locale;
  const localeOption = options.locale || options.language || options.lang;
  const locale = resolveLocale(localeOption, projectLocale);
  const ui = getUiText(locale);
  const groups = getDesignVariationCatalog(locale);
  const sources = getDesignVariationSources(locale);
  const advanced = Boolean(options.advanced);
  const modifierPolicy = advanced ? 'up_to_3_modifiers' : 'up_to_2_modifiers';
  const localeSource = localeOption ? 'option' : projectLocaleResult.source;

  if (options.json) {
    return {
      ok: true,
      targetDir,
      locale,
      localeSource,
      projectLocale,
      advanced,
      modifierPolicy,
      presetPath: path.relative(targetDir, presetPath),
      historyDir: path.relative(targetDir, historyDir),
      groups,
      sources
    };
  }

  if (!stdin.isTTY || !stdout.isTTY) {
    logger.log(ui.ttyError);
    return {
      ok: false,
      error: 'TTY required',
      message: ui.ttyError
    };
  }

  logger.log(ui.launching);
  const selections = {
    __groups: groups,
    __sources: sources
  };

  for (const group of groups) {
    const chosen = await promptMultiSelectGroup(group, ui, { stdin, stdout });
    selections[group.id] = chosen;
  }

  const content = buildPresetMarkdown(selections, locale, {
    oneShot: options['persistent'] !== true,
    advanced
  });
  const historyPath = path.join(historyDir, `${formatTimestamp()}.md`);
  await ensureDir(path.dirname(presetPath));
  await ensureDir(historyDir);
  await fs.writeFile(presetPath, content, 'utf8');
  await fs.writeFile(historyPath, content, 'utf8');

  const summary = buildSummary(selections);
  logger.log(`${ui.saved}\n`);
  logger.log(`${ui.path}: ${path.relative(targetDir, presetPath)}\n`);
  logger.log(`${ui.history}: ${path.relative(targetDir, historyPath)}\n`);
  if (summary.length > 0) {
    for (const line of summary) logger.log(`- ${line}`);
    logger.log('');
  }
  logger.log(ui.promptReady);
  logger.log('');
  logger.log(buildPromptBlock(selections));

  return {
    ok: true,
    targetDir,
    locale,
    localeSource,
    projectLocale,
    advanced,
    modifierPolicy,
    presetPath: path.relative(targetDir, presetPath),
    historyPath: path.relative(targetDir, historyPath),
    selections: Object.fromEntries(
      Object.entries(selections)
        .filter(([key]) => !key.startsWith('__'))
        .map(([key, value]) => [
          key,
          Array.isArray(value) ? value.map((item) => item.id) : value
        ])
    )
  };
}

module.exports = {
  runDesignHybridOptions,
  __test__: {
    getUiText,
    promptMultiSelectGroup,
    buildPresetMarkdown,
    buildPromptBlock,
    buildSummary
  }
};
