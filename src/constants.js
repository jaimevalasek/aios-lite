'use strict';

const MANAGED_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'OPENCODE.md',
  '.gemini/GEMINI.md',
  '.gemini/commands/aios-setup.toml',
  '.gemini/commands/aios-analyst.toml',
  '.gemini/commands/aios-architect.toml',
  '.gemini/commands/aios-pm.toml',
  '.gemini/commands/aios-dev.toml',
  '.gemini/commands/aios-qa.toml',
  '.gemini/commands/aios-orchestrator.toml',
  '.aios-lite/config.md',
  '.aios-lite/agents/setup.md',
  '.aios-lite/agents/analyst.md',
  '.aios-lite/agents/architect.md',
  '.aios-lite/agents/pm.md',
  '.aios-lite/agents/dev.md',
  '.aios-lite/agents/qa.md',
  '.aios-lite/agents/orchestrator.md',
  '.aios-lite/skills/static/laravel-conventions.md',
  '.aios-lite/skills/static/tall-stack-patterns.md',
  '.aios-lite/skills/static/jetstream-setup.md',
  '.aios-lite/skills/static/rails-conventions.md',
  '.aios-lite/skills/static/node-express-patterns.md',
  '.aios-lite/skills/static/nextjs-patterns.md',
  '.aios-lite/skills/static/ui-ux-modern.md',
  '.aios-lite/skills/static/git-conventions.md',
  '.aios-lite/skills/dynamic/laravel-docs.md',
  '.aios-lite/skills/dynamic/flux-ui-docs.md',
  '.aios-lite/skills/dynamic/npm-packages.md',
  '.aios-lite/mcp/servers.md'
];

const REQUIRED_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  '.aios-lite/config.md',
  '.aios-lite/agents/setup.md',
  '.aios-lite/agents/analyst.md',
  '.aios-lite/agents/dev.md',
  '.aios-lite/context/.gitkeep'
];

const CONTEXT_REQUIRED_FIELDS = [
  'project_name',
  'project_type',
  'profile',
  'framework',
  'framework_installed',
  'classification',
  'conversation_language',
  'aios_lite_version'
];

const CONTEXT_ALLOWED_CLASSIFICATIONS = ['MICRO', 'SMALL', 'MEDIUM'];
const CONTEXT_ALLOWED_PROJECT_TYPES = ['web_app', 'api', 'site', 'script'];
const CONTEXT_ALLOWED_PROFILES = ['developer', 'beginner', 'team'];

const AGENT_DEFINITIONS = [
  {
    id: 'setup',
    command: '@setup',
    path: '.aios-lite/agents/setup.md',
    dependsOn: [],
    output: '.aios-lite/context/project.context.md'
  },
  {
    id: 'analyst',
    command: '@analyst',
    path: '.aios-lite/agents/analyst.md',
    dependsOn: ['.aios-lite/context/project.context.md'],
    output: '.aios-lite/context/discovery.md'
  },
  {
    id: 'architect',
    command: '@architect',
    path: '.aios-lite/agents/architect.md',
    dependsOn: [
      '.aios-lite/context/project.context.md',
      '.aios-lite/context/discovery.md'
    ],
    output: '.aios-lite/context/architecture.md'
  },
  {
    id: 'pm',
    command: '@pm',
    path: '.aios-lite/agents/pm.md',
    dependsOn: [
      '.aios-lite/context/project.context.md',
      '.aios-lite/context/discovery.md',
      '.aios-lite/context/architecture.md'
    ],
    output: '.aios-lite/context/prd.md'
  },
  {
    id: 'dev',
    command: '@dev',
    path: '.aios-lite/agents/dev.md',
    dependsOn: [
      '.aios-lite/context/project.context.md',
      '.aios-lite/context/discovery.md',
      '.aios-lite/context/architecture.md'
    ],
    output: 'code changes'
  },
  {
    id: 'qa',
    command: '@qa',
    path: '.aios-lite/agents/qa.md',
    dependsOn: ['.aios-lite/context/discovery.md'],
    output: 'QA report'
  },
  {
    id: 'orchestrator',
    command: '@orchestrator',
    path: '.aios-lite/agents/orchestrator.md',
    dependsOn: [
      '.aios-lite/context/discovery.md',
      '.aios-lite/context/architecture.md',
      '.aios-lite/context/prd.md'
    ],
    output: '.aios-lite/context/parallel/*.status.md'
  }
];

module.exports = {
  MANAGED_FILES,
  REQUIRED_FILES,
  CONTEXT_REQUIRED_FIELDS,
  CONTEXT_ALLOWED_CLASSIFICATIONS,
  CONTEXT_ALLOWED_PROJECT_TYPES,
  CONTEXT_ALLOWED_PROFILES,
  AGENT_DEFINITIONS
};
