'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runContextValidate, localizeParseReason } = require('../src/commands/context-validate');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-context-validate-cmd-'));
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

test('localizeParseReason maps known parser reasons for pt-BR', () => {
  const { t } = createTranslator('pt-BR');
  assert.equal(
    localizeParseReason('missing_frontmatter', t),
    'delimitador inicial do frontmatter ausente'
  );
  assert.equal(
    localizeParseReason('unclosed_frontmatter', t),
    'bloco de frontmatter nao fechado'
  );
  assert.equal(
    localizeParseReason('invalid_frontmatter_line', t),
    'sintaxe invalida em linha do frontmatter'
  );
  assert.equal(localizeParseReason('', t), 'desconhecido');
});

test('context:validate prints localized parse reason details in pt-BR', async () => {
  const dir = await makeTempDir();
  const filePath = path.join(dir, '.aios-lite/context/project.context.md');
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  await fs.writeFile(
    filePath,
    `---\nproject_name: \"demo\"\nframework_installed: true\n`,
    'utf8'
  );

  const { t } = createTranslator('pt-BR');
  const logger = createCollectLogger();
  const result = await runContextValidate({
    args: [dir],
    options: {},
    logger,
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid_frontmatter');
  assert.equal(
    logger.lines.some((line) => line.includes('Motivo do parse: bloco de frontmatter nao fechado')),
    true
  );
});
