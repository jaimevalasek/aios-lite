'use strict';

const { readConfig, writeConfig, CONFIG_DIR } = require('./config');

const DEFAULT_BASE_URL = 'https://aioson.com';

function resolveBaseUrl(config, options = {}) {
  return String(options['base-url'] || config.aiosonBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function fetchAuthMe(baseUrl, token) {
  try {
    const response = await fetch(`${baseUrl}/api/me`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (response.ok) {
      const data = await response.json();
      // /api/me returns { ok, user: { username, email, ... } }
      return data.user || data;
    }
  } catch {
    // API unreachable
  }
  return null;
}

async function runAuthLogin({ args, options, logger, t }) {
  const token = String(options.token || '').trim();
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(config, options);

  if (!token) {
    logger.log(t('auth.login_no_token', { url: `${baseUrl}/settings/tokens` }));
    logger.log(t('auth.login_hint'));
    return { ok: false, error: { code: 'token_required' } };
  }

  logger.log(t('auth.login_verifying'));
  const user = await fetchAuthMe(baseUrl, token);

  config.aiosonToken = token;
  if (user?.username) config.aiosonUsername = user.username;
  await writeConfig(config);

  if (user?.username) {
    logger.log(t('auth.login_ok', { username: user.username, path: CONFIG_DIR }));
  } else {
    logger.log(t('auth.login_saved', { path: CONFIG_DIR }));
  }

  return { ok: true, username: user?.username || null };
}

async function runAuthLogout({ args, options, logger, t }) {
  const config = await readConfig();
  delete config.aiosonToken;
  delete config.aiosonUsername;
  await writeConfig(config);
  logger.log(t('auth.logout_ok'));
  return { ok: true };
}

async function runAuthStatus({ args, options, logger, t }) {
  const config = await readConfig();
  const token = config.aiosonToken;

  if (!token) {
    logger.log(t('auth.status_not_authenticated'));
    logger.log(t('auth.login_hint'));
    return { ok: true, authenticated: false };
  }

  const baseUrl = resolveBaseUrl(config, options);
  logger.log(t('auth.status_checking'));
  const user = await fetchAuthMe(baseUrl, token);

  if (user?.username) {
    logger.log(t('auth.status_ok', { username: user.username }));
    return { ok: true, authenticated: true, username: user.username, apiReachable: true };
  }

  const savedUsername = config.aiosonUsername || '?';
  logger.log(t('auth.status_token_offline', { username: savedUsername }));
  return { ok: true, authenticated: true, username: savedUsername, apiReachable: false };
}

module.exports = { runAuthLogin, runAuthLogout, runAuthStatus };
