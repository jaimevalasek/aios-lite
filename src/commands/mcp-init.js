'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { validateProjectContextFile } = require('../context');
const { ensureDir, readTextIfExists } = require('../utils');

const TOOL_PRESET_DEFINITIONS = [
  {
    id: 'claude',
    label: 'Claude Code',
    suggestedTargetFile: '.mcp.json'
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    suggestedTargetFile: '.codex/mcp.json'
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    suggestedTargetFile: '.gemini/mcp.json'
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    suggestedTargetFile: '.opencode/mcp.json'
  }
];

function normalizeList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function extractStackValue(markdown, fieldLabel) {
  const text = String(markdown || '');
  const regex = new RegExp(`^-\\s*${fieldLabel}:\\s*(.*)$`, 'im');
  const match = text.match(regex);
  if (!match) return '';
  return String(match[1] || '').trim();
}

function normalizeDatabaseEngine(input) {
  const value = String(input || '').trim().toLowerCase();
  if (!value) return '';
  if (value.includes('postgres') || value.includes('supabase')) return 'postgresql';
  if (value.includes('mysql') || value.includes('planetscale')) return 'mysql';
  if (value.includes('sqlite')) return 'sqlite';
  if (value.includes('mongo')) return 'mongodb';
  return value;
}

function inferWeb3Networks(contextData) {
  const frontmatterNetworks = normalizeList(contextData.web3_networks);
  if (frontmatterNetworks.length > 0) return frontmatterNetworks;

  const framework = String(contextData.framework || '').toLowerCase();
  if (['hardhat', 'foundry', 'truffle'].some((token) => framework.includes(token))) return ['ethereum'];
  if (framework.includes('anchor') || framework.includes('solana')) return ['solana'];
  if (framework.includes('cardano')) return ['cardano'];
  return ['ethereum'];
}

function buildDatabaseServer(databaseEngine) {
  if (!databaseEngine) {
    return {
      id: 'database',
      enabled: false,
      recommended: false,
      reason: 'No database stack detected yet.',
      engine: '',
      env: []
    };
  }

  const envByEngine = {
    postgresql: ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_SSL'],
    mysql: ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'],
    sqlite: ['DB_FILE'],
    mongodb: ['MONGODB_URI']
  };

  return {
    id: 'database',
    enabled: true,
    recommended: true,
    reason: 'Context indicates database-backed features.',
    engine: databaseEngine,
    env: envByEngine[databaseEngine] || []
  };
}

function buildChainRpcServer(web3Enabled, networks) {
  if (!web3Enabled) {
    return {
      id: 'chain-rpc',
      enabled: false,
      recommended: false,
      reason: 'Web3 is disabled for this project.',
      networks: [],
      env: []
    };
  }

  return {
    id: 'chain-rpc',
    enabled: true,
    recommended: true,
    reason: 'dApp context detected; chain RPC access is required.',
    networks,
    env: ['RPC_URL', 'CHAIN_ID', 'PRIVATE_KEY']
  };
}

function buildMcpPlan(targetDir, contextData, contextMarkdown) {
  const databaseValue = extractStackValue(contextMarkdown, 'Database');
  const databaseEngine = normalizeDatabaseEngine(databaseValue);
  const web3Enabled = Boolean(contextData.web3_enabled) || String(contextData.project_type) === 'dapp';
  const networks = web3Enabled ? inferWeb3Networks(contextData) : [];

  const servers = [
    {
      id: 'filesystem',
      enabled: true,
      recommended: true,
      reason: 'Mandatory local workspace access.',
      env: []
    },
    {
      id: 'context7',
      enabled: true,
      recommended: true,
      reason: 'Use up-to-date official documentation at implementation time.',
      env: []
    },
    buildDatabaseServer(databaseEngine),
    {
      id: 'web-search',
      enabled: true,
      recommended: true,
      reason: 'Useful for package vetting and release-note verification.',
      env: []
    },
    buildChainRpcServer(web3Enabled, networks),
    {
      id: 'makopy',
      enabled: false,
      recommended: false,
      reason: 'Optional content pipeline integration.',
      env: ['MAKOPY_API_KEY']
    }
  ];

  return {
    generated_at: new Date().toISOString(),
    project: {
      path: targetDir,
      framework: contextData.framework || '',
      project_type: contextData.project_type || '',
      conversation_language: contextData.conversation_language || 'en'
    },
    database_engine: databaseEngine,
    web3_enabled: web3Enabled,
    web3_networks: networks,
    servers
  };
}

function envTemplate(keys) {
  const output = {};
  for (const key of keys || []) {
    output[key] = `$${key}`;
  }
  return output;
}

function serverTemplate(server) {
  if (server.id === 'filesystem') {
    return {
      transport: 'stdio',
      command: '<filesystem-mcp-command>',
      args: ['<project-root>'],
      env: {}
    };
  }

  if (server.id === 'database') {
    return {
      transport: 'stdio',
      command: '<database-mcp-command>',
      args: [server.engine || '<engine>'],
      env: envTemplate(server.env)
    };
  }

  if (server.id === 'chain-rpc') {
    return {
      transport: 'stdio',
      command: '<chain-rpc-mcp-command>',
      args: server.networks || [],
      env: envTemplate(server.env)
    };
  }

  return {
    transport: 'stdio',
    command: `<${server.id}-mcp-command>`,
    args: [],
    env: envTemplate(server.env)
  };
}

function normalizeTool(tool) {
  const value = String(tool || '').trim().toLowerCase();
  if (!value) return '';
  return value;
}

function resolveToolDefinitions(tool) {
  const normalized = normalizeTool(tool);
  if (!normalized) return TOOL_PRESET_DEFINITIONS;

  const found = TOOL_PRESET_DEFINITIONS.find((item) => item.id === normalized);
  if (!found) {
    const expected = TOOL_PRESET_DEFINITIONS.map((item) => item.id).join(', ');
    throw new Error(`Invalid --tool value: ${tool}. Use one of: ${expected}.`);
  }
  return [found];
}

function buildToolPresets(plan, options = {}) {
  const selectedTools = resolveToolDefinitions(options.tool);
  const enabledServers = plan.servers.filter((server) => server.enabled);

  return selectedTools.map((tool) => {
    const mcpServers = {};
    for (const server of enabledServers) {
      mcpServers[server.id] = serverTemplate(server);
    }

    const envRequired = Array.from(
      new Set(
        enabledServers.flatMap((server) => server.env || [])
      )
    );

    return {
      tool: tool.id,
      tool_label: tool.label,
      generated_at: new Date().toISOString(),
      source_plan: '.aios-lite/mcp/servers.local.json',
      suggested_target_file: tool.suggestedTargetFile,
      notes: [
        'This is a workspace-local preset generated by AIOS Lite.',
        'Replace placeholder commands with the MCP servers you actually use.',
        'Keep secrets in environment variables, never inline tokens.'
      ],
      env_required: envRequired,
      mcpServers
    };
  });
}

async function runMcpInit({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const dryRun = Boolean(options['dry-run']);
  const jsonMode = Boolean(options.json);
  const requestedTool = normalizeTool(options.tool);
  const contextResult = await validateProjectContextFile(targetDir);
  const contextMarkdown = await readTextIfExists(
    path.join(targetDir, '.aios-lite/context/project.context.md')
  );
  const contextData = contextResult.parsed && contextResult.data ? contextResult.data : {};

  const plan = buildMcpPlan(targetDir, contextData, contextMarkdown || '');
  const filePath = path.join(targetDir, '.aios-lite/mcp/servers.local.json');
  const presets = buildToolPresets(plan, { tool: requestedTool });
  const presetDir = path.join(targetDir, '.aios-lite/mcp/presets');
  const presetFiles = presets.map((preset) => ({
    tool: preset.tool,
    path: path.join(presetDir, `${preset.tool}.json`)
  }));

  if (!dryRun) {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

    await ensureDir(presetDir);
    for (const presetFile of presetFiles) {
      const preset = presets.find((item) => item.tool === presetFile.tool);
      await fs.writeFile(presetFile.path, `${JSON.stringify(preset, null, 2)}\n`, 'utf8');
    }
  }

  const output = {
    ok: true,
    targetDir,
    filePath,
    dryRun,
    written: !dryRun,
    contextExists: contextResult.exists,
    contextParsed: contextResult.parsed,
    serverCount: plan.servers.length,
    presetCount: presets.length,
    presetFiles: presetFiles.map((item) => ({
      tool: item.tool,
      path: item.path
    })),
    plan,
    presets
  };

  if (jsonMode) {
    return output;
  }

  if (!contextResult.exists) {
    logger.log(t('mcp_init.context_missing'));
  }
  logger.log(
    dryRun
      ? t('mcp_init.dry_run_generated', { path: filePath })
      : t('mcp_init.generated', { path: filePath })
  );
  logger.log(t('mcp_init.server_count', { count: plan.servers.length }));
  logger.log(t('mcp_init.preset_count', { count: presets.length }));
  for (const presetFile of output.presetFiles) {
    logger.log(
      dryRun
        ? t('mcp_init.preset_dry_run', { tool: presetFile.tool, path: presetFile.path })
        : t('mcp_init.preset_written', { tool: presetFile.tool, path: presetFile.path })
    );
  }

  return output;
}

module.exports = {
  runMcpInit,
  normalizeDatabaseEngine,
  extractStackValue,
  buildMcpPlan,
  buildToolPresets,
  resolveToolDefinitions
};
