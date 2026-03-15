'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const CONFIG_DIR = path.join(os.homedir(), '.aioson');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function readConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeConfig(data) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function runConfig({ args, options, logger, t }) {
  const subcommand = args[0];

  if (subcommand === 'set') {
    const pair = args[1];
    if (!pair || !pair.includes('=')) {
      logger.error(t('config.usage_error'));
      return { ok: false, error: { code: 'usage_error' } };
    }
    const eqIdx = pair.indexOf('=');
    const key = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (!key) {
      logger.error(t('config.usage_error'));
      return { ok: false, error: { code: 'usage_error' } };
    }
    const config = await readConfig();
    config[key] = value;
    await writeConfig(config);
    logger.log(t('config.set_ok', { key, path: CONFIG_FILE }));
    return { ok: true, key, path: CONFIG_FILE };
  }

  if (subcommand === 'get') {
    const key = args[1];
    if (!key) {
      logger.error(t('config.usage_error'));
      return { ok: false, error: { code: 'usage_error' } };
    }
    const config = await readConfig();
    if (!Object.prototype.hasOwnProperty.call(config, key)) {
      logger.log(t('config.key_not_found', { key }));
      return { ok: true, key, value: null };
    }
    logger.log(t('config.get_line', { key, value: config[key] }));
    return { ok: true, key, value: config[key] };
  }

  if (!subcommand || subcommand === 'show') {
    const config = await readConfig();
    const keys = Object.keys(config);
    logger.log(t('config.show_header', { path: CONFIG_FILE }));
    if (keys.length === 0) {
      logger.log(t('config.show_empty'));
    } else {
      for (const key of keys) {
        const raw = String(config[key]);
        const masked = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
          ? `${raw.slice(0, 6)}${'*'.repeat(Math.max(0, raw.length - 6))}`
          : raw;
        logger.log(t('config.show_line', { key, value: masked }));
      }
    }
    return { ok: true, config };
  }

  logger.error(t('config.usage_error'));
  return { ok: false, error: { code: 'usage_error' } };
}

module.exports = {
  runConfig,
  readConfig,
  writeConfig,
  CONFIG_DIR,
  CONFIG_FILE
};
