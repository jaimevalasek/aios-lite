'use strict';

const MANAGED_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'OPENCODE.md',
  '.gemini/GEMINI.md',
  '.gemini/commands/aios-setup.toml',
  '.gemini/commands/aios-discovery-design-doc.toml',
  '.gemini/commands/aios-analyst.toml',
  '.gemini/commands/aios-architect.toml',
  '.gemini/commands/aios-ux-ui.toml',
  '.gemini/commands/aios-pm.toml',
  '.gemini/commands/aios-dev.toml',
  '.gemini/commands/aios-qa.toml',
  '.gemini/commands/aios-orchestrator.toml',
  '.aios-lite/config.md',
  '.aios-lite/agents/setup.md',
  '.aios-lite/agents/discovery-design-doc.md',
  '.aios-lite/agents/analyst.md',
  '.aios-lite/agents/architect.md',
  '.aios-lite/agents/ux-ui.md',
  '.aios-lite/agents/product.md',
  '.aios-lite/agents/pm.md',
  '.aios-lite/agents/dev.md',
  '.aios-lite/agents/qa.md',
  '.aios-lite/agents/orchestrator.md',
  '.aios-lite/agents/squad.md',
  '.aios-lite/agents/genoma.md',
  '.aios-lite/locales/en/agents/setup.md',
  '.aios-lite/locales/en/agents/discovery-design-doc.md',
  '.aios-lite/locales/en/agents/analyst.md',
  '.aios-lite/locales/en/agents/architect.md',
  '.aios-lite/locales/en/agents/ux-ui.md',
  '.aios-lite/locales/en/agents/product.md',
  '.aios-lite/locales/en/agents/pm.md',
  '.aios-lite/locales/en/agents/dev.md',
  '.aios-lite/locales/en/agents/qa.md',
  '.aios-lite/locales/en/agents/orchestrator.md',
  '.aios-lite/locales/en/agents/squad.md',
  '.aios-lite/locales/en/agents/genoma.md',
  '.aios-lite/locales/pt-BR/agents/setup.md',
  '.aios-lite/locales/pt-BR/agents/discovery-design-doc.md',
  '.aios-lite/locales/pt-BR/agents/analyst.md',
  '.aios-lite/locales/pt-BR/agents/architect.md',
  '.aios-lite/locales/pt-BR/agents/ux-ui.md',
  '.aios-lite/locales/pt-BR/agents/product.md',
  '.aios-lite/locales/pt-BR/agents/pm.md',
  '.aios-lite/locales/pt-BR/agents/dev.md',
  '.aios-lite/locales/pt-BR/agents/qa.md',
  '.aios-lite/locales/pt-BR/agents/orchestrator.md',
  '.aios-lite/locales/pt-BR/agents/squad.md',
  '.aios-lite/locales/pt-BR/agents/genoma.md',
  '.aios-lite/locales/es/agents/setup.md',
  '.aios-lite/locales/es/agents/discovery-design-doc.md',
  '.aios-lite/locales/es/agents/analyst.md',
  '.aios-lite/locales/es/agents/architect.md',
  '.aios-lite/locales/es/agents/ux-ui.md',
  '.aios-lite/locales/es/agents/product.md',
  '.aios-lite/locales/es/agents/pm.md',
  '.aios-lite/locales/es/agents/dev.md',
  '.aios-lite/locales/es/agents/qa.md',
  '.aios-lite/locales/es/agents/orchestrator.md',
  '.aios-lite/locales/es/agents/squad.md',
  '.aios-lite/locales/es/agents/genoma.md',
  '.aios-lite/locales/fr/agents/setup.md',
  '.aios-lite/locales/fr/agents/discovery-design-doc.md',
  '.aios-lite/locales/fr/agents/analyst.md',
  '.aios-lite/locales/fr/agents/architect.md',
  '.aios-lite/locales/fr/agents/ux-ui.md',
  '.aios-lite/locales/fr/agents/product.md',
  '.aios-lite/locales/fr/agents/pm.md',
  '.aios-lite/locales/fr/agents/dev.md',
  '.aios-lite/locales/fr/agents/qa.md',
  '.aios-lite/locales/fr/agents/orchestrator.md',
  '.aios-lite/locales/fr/agents/squad.md',
  '.aios-lite/locales/fr/agents/genoma.md',
  '.aios-lite/skills/static/laravel-conventions.md',
  '.aios-lite/skills/static/tall-stack-patterns.md',
  '.aios-lite/skills/static/jetstream-setup.md',
  '.aios-lite/skills/static/rails-conventions.md',
  '.aios-lite/skills/static/node-express-patterns.md',
  '.aios-lite/skills/static/node-typescript-patterns.md',
  '.aios-lite/skills/static/nextjs-patterns.md',
  '.aios-lite/skills/static/ui-ux-modern.md',
  '.aios-lite/skills/static/web3-ethereum-patterns.md',
  '.aios-lite/skills/static/web3-solana-patterns.md',
  '.aios-lite/skills/static/web3-cardano-patterns.md',
  '.aios-lite/skills/static/web3-security-checklist.md',
  '.aios-lite/skills/static/git-conventions.md',
  '.aios-lite/skills/static/premium-command-center-ui.md',
  '.aios-lite/skills/references/premium-command-center-ui/visual-system-and-component-patterns.md',
  '.aios-lite/skills/references/premium-command-center-ui/operational-ux-playbook.md',
  '.aios-lite/skills/references/premium-command-center-ui/master-application-prompt.md',
  '.aios-lite/skills/references/premium-command-center-ui/quality-validation-checklist.md',
  '.aios-lite/skills/dynamic/laravel-docs.md',
  '.aios-lite/skills/dynamic/flux-ui-docs.md',
  '.aios-lite/skills/dynamic/npm-packages.md',
  '.aios-lite/skills/dynamic/ethereum-docs.md',
  '.aios-lite/skills/dynamic/solana-docs.md',
  '.aios-lite/skills/dynamic/cardano-docs.md',
  '.aios-lite/mcp/servers.md',
  '.aios-lite/schemas/genome.schema.json',
  '.aios-lite/schemas/genome-meta.schema.json',
  '.aios-lite/schemas/squad-manifest.schema.json',
  '.aios-lite/schemas/squad-blueprint.schema.json',
  '.aios-lite/schemas/readiness.schema.json',
  '.aios-lite/schemas/content-blueprint.schema.json',
  '.aios-lite/schemas/genome.schema.json',
  '.aios-lite/schemas/genome-meta.schema.json',
  '.aios-lite/tasks/squad-design.md',
  '.aios-lite/tasks/squad-create.md',
  '.aios-lite/tasks/squad-validate.md',
  '.aios-lite/tasks/squad-analyze.md',
  '.aios-lite/tasks/squad-extend.md',
  '.aios-lite/tasks/squad-export.md',
  '.aios-lite/tasks/squad-repair.md',
  '.aios-lite/tasks/squad-pipeline.md'
];

const REQUIRED_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'OPENCODE.md',
  '.gemini/GEMINI.md',
  '.gemini/commands/aios-setup.toml',
  '.gemini/commands/aios-discovery-design-doc.toml',
  '.gemini/commands/aios-analyst.toml',
  '.gemini/commands/aios-architect.toml',
  '.gemini/commands/aios-ux-ui.toml',
  '.gemini/commands/aios-pm.toml',
  '.gemini/commands/aios-dev.toml',
  '.gemini/commands/aios-qa.toml',
  '.gemini/commands/aios-orchestrator.toml',
  '.aios-lite/config.md',
  '.aios-lite/agents/setup.md',
  '.aios-lite/agents/discovery-design-doc.md',
  '.aios-lite/agents/analyst.md',
  '.aios-lite/agents/ux-ui.md',
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
const CONTEXT_ALLOWED_PROJECT_TYPES = ['web_app', 'api', 'site', 'script', 'dapp'];
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
    id: 'discovery-design-doc',
    command: '@discovery-design-doc',
    path: '.aios-lite/agents/discovery-design-doc.md',
    dependsOn: ['.aios-lite/context/project.context.md'],
    output: '.aios-lite/context/design-doc.md + .aios-lite/context/readiness.md'
  },
  {
    id: 'product',
    command: '@product',
    path: '.aios-lite/agents/product.md',
    dependsOn: ['.aios-lite/context/project.context.md'],
    output: '.aios-lite/context/prd.md or .aios-lite/context/prd-{slug}.md (PRD base)'
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
    id: 'ux-ui',
    command: '@ux-ui',
    path: '.aios-lite/agents/ux-ui.md',
    dependsOn: [
      '.aios-lite/context/project.context.md',
      '.aios-lite/context/prd.md or .aios-lite/context/prd-{slug}.md',
      '.aios-lite/context/discovery.md',
      '.aios-lite/context/architecture.md'
    ],
    output: '.aios-lite/context/ui-spec.md + Visual identity enrichment in prd.md or prd-{slug}.md'
  },
  {
    id: 'pm',
    command: '@pm',
    path: '.aios-lite/agents/pm.md',
    dependsOn: [
      '.aios-lite/context/project.context.md',
      '.aios-lite/context/prd.md or .aios-lite/context/prd-{slug}.md',
      '.aios-lite/context/discovery.md',
      '.aios-lite/context/architecture.md'
    ],
    output: '.aios-lite/context/prd.md or prd-{slug}.md (enriched with delivery plan and acceptance criteria)'
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
  },
  {
    id: 'squad',
    command: '@squad',
    path: '.aios-lite/agents/squad.md',
    dependsOn: [],
    output:
      '.aios-lite/squads/{slug}/squad.manifest.json + .aios-lite/squads/{slug}/squad.md + .aios-lite/squads/{slug}/agents/ + .aios-lite/squads/{slug}/skills/ + .aios-lite/squads/{slug}/templates/ + .aios-lite/squads/{slug}/docs/ + output/{slug}/{session-id}.html + output/{slug}/{content-key}/content.json + output/{slug}/{content-key}/index.html + output/{slug}/latest.html + aios-logs/{slug}/ + media/{slug}/'
  },
  {
    id: 'genoma',
    command: '@genoma',
    path: '.aios-lite/agents/genoma.md',
    dependsOn: [],
    output: '.aios-lite/genomas/[slug].md + .aios-lite/genomas/[slug].meta.json + optional binding in .aios-lite/squads/{slug}/squad.md or .aios-lite/squads/{slug}/squad.manifest.json'
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
