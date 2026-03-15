'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { installTemplate } = require('../src/installer');
const { runLocaleApply } = require('../src/commands/locale-apply');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-locale-apply-cmd-'));
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

test('locale:apply localizes copied file line formatting in pt-BR', async () => {
  const dir = await makeTempDir();
  await installTemplate(dir, { mode: 'install' });
  const { t } = createTranslator('pt-BR');
  const logger = createCollectLogger();

  const result = await runLocaleApply({
    args: [dir],
    options: { lang: 'pt-BR' },
    logger,
    t
  });

  assert.equal(result.locale, 'pt-BR');
  assert.equal(result.copied.length > 0, true);
  assert.equal(logger.lines.some((line) => line.includes('Arquivo: ')), true);
});
