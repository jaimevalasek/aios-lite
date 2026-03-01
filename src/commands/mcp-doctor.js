'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { validateProjectContextFile } = require('../context');
const { exists, readTextIfExists } = require('../utils');
const { extractStackValue, normalizeDatabaseEngine } = require('./mcp-init');

const REQUIRED_CORE_SERVERS = ['filesystem', 'context7'];
const TOOL_PRESETS = ['claude', 'codex', 'gemini', 'opencode'];

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function makeCheck(id, ok, severity, message, hint = '') {
  return {
    id,
    ok: Boolean(ok),
    severity,
    message: String(message || ''),
    hint: String(hint || '')
  };
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).filter(Boolean).map((value) => String(value))));
}

async function readJsonFileIfExists(filePath) {
  if (!(await exists(filePath))) {
    return {
      exists: false,
      parsed: false,
      data: null,
      error: ''
    };
  }

  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return {
      exists: true,
      parsed: true,
      data: JSON.parse(raw),
      error: ''
    };
  } catch (error) {
    return {
      exists: true,
      parsed: false,
      data: null,
      error: error.message
    };
  }
}

function summarizeChecks(checks) {
  const passed = checks.filter((item) => item.ok).length;
  const failed = checks.filter((item) => !item.ok && item.severity === 'error').length;
  const warnings = checks.filter((item) => !item.ok && item.severity === 'warn').length;
  return {
    total: checks.length,
    passed,
    failed,
    warnings
  };
}

function buildServerMap(plan) {
  const servers = Array.isArray(plan && plan.servers) ? plan.servers : [];
  const map = new Map();
  for (const server of servers) {
    const id = String(server && server.id ? server.id : '').trim();
    if (!id) continue;
    map.set(id, server);
  }
  return map;
}

function isWeb3Context(contextData) {
  if (!contextData || typeof contextData !== 'object') return false;
  return Boolean(contextData.web3_enabled) || String(contextData.project_type) === 'dapp';
}

function formatCheckPrefix(check) {
  if (check.ok) return 'OK';
  if (check.severity === 'warn') return 'WARN';
  return 'FAIL';
}

async function runMcpDoctor({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const strictEnv = normalizeBoolean(options['strict-env'], false);
  const planPath = path.join(targetDir, '.aios-lite/mcp/servers.local.json');
  const presetsDir = path.join(targetDir, '.aios-lite/mcp/presets');
  const contextPath = path.join(targetDir, '.aios-lite/context/project.context.md');

  const checks = [];

  const contextResult = await validateProjectContextFile(targetDir);
  const contextMarkdown = (await readTextIfExists(contextPath)) || '';
  const contextData = contextResult.parsed && contextResult.data ? contextResult.data : {};

  if (!contextResult.exists) {
    checks.push(
      makeCheck(
        'context.exists',
        false,
        'warn',
        'project.context.md was not found.',
        'Run setup first for context-aware MCP validation.'
      )
    );
  } else if (!contextResult.parsed) {
    checks.push(
      makeCheck(
        'context.parsed',
        false,
        'warn',
        `project.context.md could not be parsed (${contextResult.parseError || 'invalid_frontmatter'}).`,
        'Fix context formatting to enable stack-aware MCP validation.'
      )
    );
  } else {
    checks.push(
      makeCheck(
        'context.parsed',
        true,
        'info',
        'project.context.md is available and parseable.'
      )
    );
  }

  const planFile = await readJsonFileIfExists(planPath);
  if (!planFile.exists) {
    checks.push(
      makeCheck(
        'plan.exists',
        false,
        'error',
        'MCP plan file was not found (.aios-lite/mcp/servers.local.json).',
        'Run: aios-lite mcp:init'
      )
    );
  } else if (!planFile.parsed) {
    checks.push(
      makeCheck(
        'plan.parsed',
        false,
        'error',
        `MCP plan JSON is invalid: ${planFile.error}`,
        'Regenerate the plan with: aios-lite mcp:init'
      )
    );
  } else {
    checks.push(
      makeCheck(
        'plan.parsed',
        true,
        'info',
        'MCP plan file is present and valid JSON.'
      )
    );
  }

  const plan = planFile.parsed && planFile.data ? planFile.data : {};
  const serverMap = buildServerMap(plan);
  const enabledServers = Array.from(serverMap.values()).filter((server) => server.enabled);

  if (planFile.parsed) {
    checks.push(
      makeCheck(
        'plan.servers',
        serverMap.size > 0,
        'error',
        serverMap.size > 0
          ? `MCP plan declares ${serverMap.size} server definition(s).`
          : 'MCP plan has no server definitions.',
        serverMap.size > 0 ? '' : 'Regenerate with: aios-lite mcp:init'
      )
    );

    for (const serverId of REQUIRED_CORE_SERVERS) {
      const server = serverMap.get(serverId);
      const ok = Boolean(server && server.enabled === true);
      checks.push(
        makeCheck(
          `plan.core.${serverId}`,
          ok,
          'error',
          ok
            ? `Core MCP server "${serverId}" is enabled.`
            : `Core MCP server "${serverId}" is missing or disabled.`,
          ok ? '' : 'Regenerate and keep baseline core servers enabled.'
        )
      );
    }
  }

  const presetChecks = [];
  for (const tool of TOOL_PRESETS) {
    const presetPath = path.join(presetsDir, `${tool}.json`);
    const present = await exists(presetPath);
    presetChecks.push({
      tool,
      path: presetPath,
      exists: present
    });
  }

  const existingPresetCount = presetChecks.filter((item) => item.exists).length;
  checks.push(
    makeCheck(
      'presets.any',
      existingPresetCount > 0,
      'error',
      existingPresetCount > 0
        ? `${existingPresetCount} MCP preset file(s) found.`
        : 'No MCP preset files were found.',
      existingPresetCount > 0 ? '' : 'Run: aios-lite mcp:init'
    )
  );

  if (existingPresetCount > 0 && existingPresetCount < TOOL_PRESETS.length) {
    checks.push(
      makeCheck(
        'presets.coverage',
        false,
        'warn',
        `Only ${existingPresetCount}/${TOOL_PRESETS.length} tool presets are present.`,
        'Run: aios-lite mcp:init (without --tool) to generate all presets.'
      )
    );
  } else if (existingPresetCount === TOOL_PRESETS.length) {
    checks.push(
      makeCheck(
        'presets.coverage',
        true,
        'info',
        'All tool presets are present (claude, codex, gemini, opencode).'
      )
    );
  }

  const requiredEnv = uniqueStrings(enabledServers.flatMap((server) => server.env || []));
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  const envSeverity = strictEnv ? 'error' : 'warn';
  if (requiredEnv.length === 0) {
    checks.push(
      makeCheck(
        'env.required',
        true,
        'info',
        'No required environment variables in enabled MCP servers.'
      )
    );
  } else if (missingEnv.length > 0) {
    checks.push(
      makeCheck(
        'env.required',
        false,
        envSeverity,
        `${missingEnv.length}/${requiredEnv.length} required env var(s) are missing: ${missingEnv.join(', ')}`,
        strictEnv
          ? 'Set the missing variables before execution.'
          : 'Set variables for full runtime readiness. Use --strict-env to fail on this check.'
      )
    );
  } else {
    checks.push(
      makeCheck(
        'env.required',
        true,
        'info',
        `All required env vars are available (${requiredEnv.length}).`
      )
    );
  }

  if (contextResult.parsed && planFile.parsed) {
    const stackDatabase = normalizeDatabaseEngine(extractStackValue(contextMarkdown, 'Database'));
    if (stackDatabase) {
      const databaseServer = serverMap.get('database');
      const actualEngine = String(databaseServer && databaseServer.engine ? databaseServer.engine : '');
      const matches = Boolean(databaseServer && databaseServer.enabled && actualEngine === stackDatabase);
      checks.push(
        makeCheck(
          'compat.database',
          matches,
          matches ? 'info' : 'warn',
          matches
            ? `Database MCP matches context stack engine (${stackDatabase}).`
            : `Database MCP does not fully match context stack (${stackDatabase}).`,
          matches
            ? ''
            : 'Regenerate with: aios-lite mcp:init, or adjust database server manually.'
        )
      );
    }

    const web3Enabled = isWeb3Context(contextData);
    const chainRpcServer = serverMap.get('chain-rpc');
    if (web3Enabled) {
      const chainOk = Boolean(chainRpcServer && chainRpcServer.enabled);
      checks.push(
        makeCheck(
          'compat.web3',
          chainOk,
          'error',
          chainOk
            ? 'chain-rpc MCP is enabled for Web3 context.'
            : 'Web3 context detected, but chain-rpc MCP is missing or disabled.',
          chainOk ? '' : 'Regenerate with: aios-lite mcp:init'
        )
      );
    } else if (chainRpcServer && chainRpcServer.enabled) {
      checks.push(
        makeCheck(
          'compat.web3',
          false,
          'warn',
          'chain-rpc MCP is enabled, but context is not Web3.',
          'Disable chain-rpc if not needed.'
        )
      );
    }
  }

  const summary = summarizeChecks(checks);
  const output = {
    ok: summary.failed === 0,
    targetDir,
    strictEnv,
    context: {
      exists: contextResult.exists,
      parsed: contextResult.parsed,
      filePath: contextPath,
      projectType: String(contextData.project_type || ''),
      framework: String(contextData.framework || ''),
      conversationLanguage: String(contextData.conversation_language || '')
    },
    plan: {
      filePath: planPath,
      exists: planFile.exists,
      parsed: planFile.parsed,
      serverCount: serverMap.size,
      enabledServers: enabledServers.map((server) => String(server.id || ''))
    },
    env: {
      required: requiredEnv,
      missing: missingEnv
    },
    presets: presetChecks,
    checks,
    summary
  };

  if (options.json) {
    return output;
  }

  logger.log(`MCP doctor report: ${targetDir}`);
  for (const check of checks) {
    logger.log(`[${formatCheckPrefix(check)}] ${check.id} - ${check.message}`);
    if (check.hint) {
      logger.log(`  -> ${check.hint}`);
    }
  }
  logger.log(
    `Summary: ${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warnings.`
  );

  return output;
}

module.exports = {
  runMcpDoctor,
  summarizeChecks
};
