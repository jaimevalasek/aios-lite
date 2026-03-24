'use strict';

module.exports = {
  cli: {
    title: 'AIOSON CLI',
    title_line: '{title}\n',
    usage: 'Usage:',
    help_item_line: '  {text}',
    help_init:
      'aioson init <project-name> [--force] [--dry-run] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode] [--locale=en]',
    help_install:
      'aioson install [path] [--force] [--dry-run] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode] [--locale=en]',
    help_update: 'aioson update [path] [--dry-run] [--lang=en|pt-BR|es|fr] [--locale=en]',
    help_info: 'aioson info [path] [--json] [--locale=en]',
    help_doctor: 'aioson doctor [path] [--fix] [--dry-run] [--json] [--locale=en]',
    help_i18n_add: 'aioson i18n:add <locale> [--force] [--dry-run] [--locale=en]',
    help_agents: 'aioson agents [path] [--lang=en|pt-BR|es|fr] [--locale=en]',
    help_agent_prompt:
      'aioson agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=en]',
    help_context_validate: 'aioson context:validate [path] [--json] [--locale=en]',
    help_context_pack:
      'aioson context:pack [path] [--agent=<agent>] [--goal=<text>] [--module=<module-or-folder>] [--max-files=8] [--json] [--locale=en]',
    help_setup_context:
      'aioson setup:context [path] [--defaults] [--project-type=web_app|api|site|script|dapp] [--framework=<name>] [--backend=<name>] [--frontend=<name>] [--database=<name>] [--auth=<name>] [--uiux=<name>] [--language=en] [--web3-enabled=true|false] [--locale=en]',
    help_locale_apply: 'aioson locale:apply [path] [--lang=en|pt-BR|es|fr] [--dry-run] [--locale=en]',
    help_locale_diff: 'aioson locale:diff [agent] [--lang=en|pt-BR|es|fr] [--json] [--locale=en]',
    help_test_agents: 'aioson test:agents [--json] [--locale=en]',
    help_test_smoke:
      'aioson test:smoke [workspace-path] [--lang=en|pt-BR|es|fr] [--web3=ethereum|solana|cardano] [--profile=standard|mixed|parallel] [--keep] [--json] [--locale=en]',
    help_test_package:
      'aioson test:package [source-path] [--keep] [--dry-run] [--json] [--locale=en]',
    help_workflow_plan:
      'aioson workflow:plan [path] [--classification=MICRO|SMALL|MEDIUM] [--json] [--locale=en]',
    help_workflow_next:
      'aioson workflow:next [path] [--complete[=<agent>]] [--agent=<agent>] [--skip=<agent>] [--status] [--tool=codex|claude|gemini|opencode] [--json] [--locale=en]',
    help_workflow_status:
      'aioson workflow:status [path] [--json] [--locale=en]',
    help_parallel_init:
      'aioson parallel:init [path] [--workers=2..6] [--force] [--dry-run] [--json] [--locale=en]',
    help_parallel_doctor:
      'aioson parallel:doctor [path] [--workers=2..6] [--fix] [--force] [--dry-run] [--json] [--locale=en]',
    help_parallel_assign:
      'aioson parallel:assign [path] [--source=auto|prd|architecture|discovery|<file>] [--workers=2..6] [--force] [--dry-run] [--json] [--locale=en]',
    help_parallel_status:
      'aioson parallel:status [path] [--json] [--locale=en]',
    help_mcp_init:
      'aioson mcp:init [path] [--tool=claude|codex|gemini|opencode] [--dry-run] [--json] [--locale=en]',
    help_mcp_doctor:
      'aioson mcp:doctor [path] [--strict-env] [--json] [--locale=en]',
    help_qa_doctor:
      'aioson qa:doctor [path] [--json] [--locale=en]',
    help_qa_init:
      'aioson qa:init [path] [--url=<app-url>] [--dry-run] [--json] [--locale=en]',
    help_qa_run:
      'aioson qa:run [path] [--url=<app-url>] [--persona=naive|hacker|power|mobile] [--headed] [--html] [--json] [--locale=en]',
    help_qa_scan:
      'aioson qa:scan [path] [--url=<app-url>] [--depth=3] [--max-pages=50] [--headed] [--html] [--json] [--locale=en]',
    help_qa_report:
      'aioson qa:report [path] [--html] [--json] [--locale=en]',
    help_scan_project:
      'aioson scan:project [path] --folder=<path[,path2]> [--summary-mode=titles|summaries|raw] [--context-mode=merge|rewrite] [--with-llm] [--provider=<name>] [--llm-model=<name>] [--dry-run] [--json] [--locale=en]',
    help_config:
      'aioson config <set KEY=value|show|get KEY> [--json] [--locale=en]',
    help_genome_doctor:
      'aioson genome:doctor <file> [--json] [--locale=en]',
    help_genome_migrate:
      'aioson genome:migrate <file-or-dir> [--write] [--no-backup] [--json] [--locale=en]',
    help_squad_status:
      'aioson squad:status [path] [--json] [--locale=en]',
    help_squad_doctor:
      'aioson squad:doctor [path] [--squad=<slug>] [--stale-minutes=5] [--json] [--locale=en]',
    help_squad_repair_genomes:
      'aioson squad:repair-genomes <manifest.json> [--write] [--no-backup] [--json] [--locale=en]',
    help_squad_validate:
      'aioson squad:validate [path] --squad=<slug> [--locale=en]',
    help_squad_export:
      'aioson squad:export [path] --squad=<slug> [--locale=en]',
    help_squad_pipeline:
      'aioson squad:pipeline [path] [--sub=list|show|status] [--pipeline=<slug>] [--locale=en]',
    help_squad_agent_create:
      'aioson squad:agent-create [path] --name=<name> [--scope=my-agents|squad] [--squad=<slug>] [--type=agent|assistant|clone|worker] [--tier=0|1|2|3] [--disc=<profile>] [--mission=<text>] [--domain=<text>] [--specialist=<name>] [--with-infra] [--locale=en]',
    help_squad_investigate:
      'aioson squad:investigate [path] [--sub=list|show|score|link|register] [--investigation=<slug>] [--squad=<slug>] [--locale=en]',
    help_plan:
      'aioson plan [path] [--sub=show|status|checkpoint|stale|register] [--feature=<slug>] [--phase=<N>] [--locale=en]',
    help_squad_plan:
      'aioson squad:plan [path] [--sub=show|status|checkpoint|stale|register] [--squad=<slug>] [--round=<N>] [--locale=en]',
    help_squad_learning:
      'aioson squad:learning [path] [--sub=list|stats|archive|promote|export] [--squad=<slug>] [--status=<status>] [--locale=en]',
    help_learning:
      'aioson learning [path] [--sub=list|stats|promote] [--status=<status>] [--id=<learning-id>] [--locale=en]',
    help_runtime_init:
      'aioson runtime:init [path] [--json] [--locale=en]',
    help_runtime_ingest:
      'aioson runtime:ingest [path] [--squad=<slug>] [--agent=<name>] [--session=<key>] [--task=<key>] [--json] [--locale=en]',
    help_runtime_task_start:
      'aioson runtime:task:start [path] --title=<text> [--squad=<slug>] [--session=<key>] [--goal=<text>] [--by=<agent>] [--task=<key>] [--json] [--locale=en]',
    help_runtime_start:
      'aioson runtime:start [path] --agent=<name> [--squad=<slug>] [--session=<key>] [--title=<text>] [--run=<key>] [--json] [--locale=en]',
    help_runtime_update:
      'aioson runtime:update [path] --run=<key> [--message=<text>] [--summary=<text>] [--output=<path>] [--json] [--locale=en]',
    help_runtime_task_finish:
      'aioson runtime:task:finish [path] --task=<key> [--goal=<text>] [--json] [--locale=en]',
    help_runtime_finish:
      'aioson runtime:finish [path] --run=<key> [--summary=<text>] [--output=<path>] [--json] [--locale=en]',
    help_runtime_task_fail:
      'aioson runtime:task:fail [path] --task=<key> [--goal=<text>] [--json] [--locale=en]',
    help_runtime_fail:
      'aioson runtime:fail [path] --run=<key> [--message=<text>] [--summary=<text>] [--output=<path>] [--json] [--locale=en]',
    help_runtime_status:
      'aioson runtime:status [path] [--json] [--locale=en]',
    help_runtime_log:
      'aioson runtime:log [path] --agent=<name> --message=<text> [--type=<event>] [--finish] [--status=completed|failed] [--summary=<text>] [--title=<task-title>] [--json] [--locale=en]',
    help_runtime_session_start:
      'aioson runtime:session:start [path] --agent=<name> [--title=<text>] [--message=<text>] [--session=<key>] [--json] [--locale=en]',
    help_runtime_session_log:
      'aioson runtime:session:log [path] --agent=<name> --message=<text> [--type=<event>] [--title=<text>] [--json] [--locale=en]',
    help_runtime_session_finish:
      'aioson runtime:session:finish [path] --agent=<name> [--message=<text>] [--summary=<text>] [--status=completed|failed] [--json] [--locale=en]',
    help_runtime_session_status:
      'aioson runtime:session:status [path] --agent=<name> [--limit=8] [--watch=2] [--json] [--locale=en]',
    help_runtime_emit:
      'aioson runtime:emit [path] --agent=<name> [--type=<event>] [--summary=<text>] [--title=<text>] [--refs=<file[,file2]>] [--plan-step=<id>] [--meta=<json>] [--json] [--locale=en]',
    help_live_start:
      'aioson live:start [path] --tool=codex|claude|gemini|opencode --agent=<name> [--tool-bin=<binary>] [--tool-args=<args>] [--title=<text>] [--goal=<text>] [--plan=<file>] [--session=<key>] [--message=<text>] [--attach] [--no-launch] [--json] [--locale=en]',
    help_live_status:
      'aioson live:status [path] [--agent=<name>] [--limit=8] [--watch=2] [--json] [--locale=en]',
    help_live_handoff:
      'aioson live:handoff [path] --agent=<name> --to=<name> [--reason=<text>] [--summary=<text>] [--message=<text>] [--json] [--locale=en]',
    help_live_close:
      'aioson live:close [path] [--agent=<name>] [--summary=<text>] [--message=<text>] [--status=completed|failed] [--json] [--locale=en]',
    help_live_list:
      'aioson live:list [path] [--json] [--locale=en]',
    help_runtime_backup:
      'aioson runtime:backup [path] [--tables=tasks,runs,...] [--force] [--dry-run] [--json] [--locale=en]',
    help_runtime_restore:
      'aioson runtime:restore [path] [--tables=tasks,runs,...] [--dry-run] [--json] [--locale=en]',
    help_skill_install:
      'aioson skill:install [path] --slug=<name> [--from=npm|cloud|./path] [--force] [--json] [--locale=en]',
    help_skill_list:
      'aioson skill:list [path] [--json] [--locale=en]',
    help_skill_remove:
      'aioson skill:remove [path] --slug=<name> [--json] [--locale=en]',
    help_cloud_import_squad:
      'aioson cloud:import:squad [path] --url=<snapshot-url> [--force] [--snapshots-only] [--dry-run] [--json] [--locale=en]',
    help_cloud_import_genome:
      'aioson cloud:import:genome [path] --url=<snapshot-url> [--force] [--snapshots-only] [--dry-run] [--json] [--locale=en]',
    help_cloud_publish_squad:
      'aioson cloud:publish:squad [path] --slug=<slug> --resource-version=<version> [--url=<publish-url>|--base-url=<site>] [--title=<text>] [--summary=<text>] [--compatibility-min=<version>] [--compatibility-max=<version>] [--linked-genome-version=<version>] [--dry-run] [--json] [--locale=en]',
    help_cloud_publish_genome:
      'aioson cloud:publish:genome [path] --slug=<slug> --resource-version=<version> [--url=<publish-url>|--base-url=<site>] [--title=<text>] [--summary=<text>] [--source-kind=LOCAL|AIOSLITE|IMPORTED|REMOTE_PROVIDER] [--dry-run] [--json] [--locale=en]',
    dashboard_moved:
      'The `{command}` CLI flow was removed. The AIOSON dashboard is now installed separately. Open the dashboard app on your computer, create or add a project, and select the folder that already contains `.aioson/`.',
    dashboard_moved_line: '{message}\n',
    unknown_command: 'Unknown command: {command}',
    unknown_command_line: '{message}\n',
    error_prefix: 'Error: {message}'
  },
  cloud: {
    project_missing: 'Project directory not found: {path}',
    url_required: 'Provide --url with the squad snapshot JSON endpoint.',
    import_squad_dry_run: 'Dry run: squad {slug}@{version} ready for cloud import.',
    import_squad_done: 'Imported squad snapshot {slug}@{version}.',
    import_genome_dry_run: 'Dry run: genome {slug}@{version} ready for cloud import.',
    import_genome_done: 'Imported genome snapshot {slug}@{version}.',
    publish_squad_dry_run: 'Dry run: squad {slug}@{version} ready for cloud publish.',
    publish_squad_done: 'Published squad {slug}@{version} to the cloud.',
    publish_genome_dry_run: 'Dry run: genome {slug}@{version} ready for cloud publish.',
    publish_genome_done: 'Published genome {slug}@{version} to the cloud.'
  },
  init: {
    usage_error:
      'Usage: aioson init <project-name> [--force] [--dry-run] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode] [--locale=en]',
    non_empty_dir: 'Directory is not empty: {targetDir}. Use --force to continue.',
    created_at: 'Project created at: {targetDir}',
    files_copied: 'Files copied: {count}',
    files_skipped: 'Files skipped: {count}',
    next_steps: 'Next steps:',
    step_cd: '1. cd {projectName}',
    step_setup: '2. Open in your AI CLI and run @setup',
    step_agents: '3. If no visual picker appears, run: aioson agents',
    step_agent_prompt: '4. Generate setup prompt for your tool: aioson agent:prompt setup --tool={tool}'
  },
  install: {
    framework_detected: 'Framework detected: {framework} ({evidence})',
    framework_not_detected: 'No framework detected. Installing in generic mode.',
    done_at: 'Installation completed at: {targetDir}',
    files_copied: 'Files copied: {count}',
    files_skipped: 'Files skipped: {count}',
    next_steps: 'Next steps:',
    step_setup_context: '1. Generate/refresh project context: aioson setup:context --defaults',
    step_agents: '2. If no visual picker appears, run: aioson agents',
    step_agent_prompt: '3. Generate setup prompt for your tool: aioson agent:prompt setup --tool={tool}',
    existing_project_detected: '⚠ Existing project detected ({count} files). Run the scanner before starting:',
    existing_project_scan_hint:
      '  aioson scan:project . --folder=src --with-llm --provider=<provider>   (generates discovery.md + skeleton-system.md; omit --with-llm for local maps only)'
  },
  update: {
    not_installed: 'No AIOSON installation found in {targetDir}.',
    done_at: 'Update completed at: {targetDir}',
    files_updated: 'Files updated: {count}',
    backups_created: 'Backups created: {count}'
  },
  info: {
    cli_version: 'AIOSON CLI: v{version}',
    directory: 'Directory: {targetDir}',
    installed_here: 'Installed in this directory: {value}',
    framework_detected: 'Framework detected: {framework}',
    evidence: 'Evidence: {evidence}',
    yes: 'yes',
    no: 'no',
    none: 'none'
  },
  doctor: {
    ok: 'OK',
    fail: 'FAIL',
    diagnosis_ok: 'Diagnosis: healthy installation.',
    diagnosis_fail: 'Diagnosis: {count} issue(s) found.',
    hint_prefix: '-> {hint}',
    check_line: '[{icon}] {message}',
    hint_line: '  Hint: {hint}',
    fix_action_line: '- Action: {action}',
    detail_line: '  Detail: {text}',
    required_file: 'Required file: {rel}',
    context_generated: 'Main context generated',
    context_hint: 'Run @setup to generate .aioson/context/project.context.md',
    context_frontmatter_valid: 'Project context frontmatter is valid',
    context_frontmatter_valid_hint: 'Ensure project.context.md starts with YAML frontmatter delimited by ---',
    context_frontmatter_invalid: 'Project context frontmatter is invalid ({reason})',
    context_frontmatter_invalid_hint: 'Rewrite project.context.md using the @setup output format.',
    context_required_field: 'Missing required context field: {field}',
    context_required_field_hint: 'Re-run @setup and confirm all required fields are present.',
    context_framework_installed_type: '`framework_installed` must be boolean (true/false)',
    context_framework_installed_type_hint: 'Set framework_installed as true or false without quotes.',
    context_classification_value: '`classification` must be one of {expected}',
    context_classification_value_hint: 'Use MICRO, SMALL, or MEDIUM exactly.',
    context_project_type_value: '`project_type` must be one of {expected}',
    context_project_type_value_hint: 'Use web_app, api, site, script, or dapp exactly.',
    context_profile_value: '`profile` must be one of {expected}',
    context_profile_value_hint: 'Use developer, beginner, or team exactly.',
    context_conversation_language_format: '`conversation_language` is not a valid BCP-47 tag',
    context_conversation_language_format_hint: 'Use values like en, en-US, pt-BR.',
    node_version: 'Node.js >= 18 (current: {version})',
    gateway_claude_pointer: 'CLAUDE gateway references shared AIOSON files',
    gateway_claude_pointer_hint:
      'Ensure CLAUDE.md references .aioson/config.md and .aioson/agents/setup.md.',
    gateway_codex_pointer: 'Codex gateway references shared AIOSON files',
    gateway_codex_pointer_hint:
      'Ensure AGENTS.md references .aioson/config.md and .aioson/agents/.',
    gateway_gemini_pointer: 'Gemini gateway references shared command and agent paths',
    gateway_gemini_pointer_hint:
      'Ensure .gemini/GEMINI.md references .gemini/commands/ and .aioson/agents/.',
    gateway_gemini_command_pointer: 'Gemini command file maps to shared agent: {file}',
    gateway_gemini_command_pointer_hint:
      'Ensure {file} includes instruction_file = ".aioson/agents/{agent}.md".',
    gateway_opencode_pointer: 'OpenCode gateway references shared AIOSON files',
    gateway_opencode_pointer_hint:
      'Ensure OPENCODE.md references .aioson/config.md and .aioson/agents/.',
    fix_start: 'Safe fix mode enabled.',
    fix_start_dry_run: 'Safe fix mode enabled (dry-run).',
    fix_action_required_files: 'Restore missing managed files from template',
    fix_action_gateway_contracts: 'Restore broken gateway contract files from template',
    fix_action_locale_sync: 'Synchronize active agent prompts with context language',
    fix_not_applicable: 'Not applicable for current state.',
    fix_target_count: 'Targets identified: {count}',
    fix_applied_count: 'Changes applied: {count}',
    fix_planned_count: 'Changes planned: {count}',
    fix_locale: 'Resolved locale: {locale}',
    fix_summary: 'Safe fix changes applied: {count}',
    fix_summary_dry_run: '[dry-run] Safe fix changes planned: {count}'
  },
  i18n_add: {
    usage_error: 'Usage: aioson i18n:add <locale> [--force] [--dry-run] [--locale=en]',
    invalid_locale: 'Invalid locale code: {locale}. Expected formats like en, fr, pt-br.',
    base_locale: 'Locale "en" is the base dictionary and cannot be scaffolded.',
    locale_exists: 'Locale file already exists: {path}. Use --force to overwrite.',
    dry_run_created: '[dry-run] Locale scaffold would be created: {locale}',
    dry_run_overwritten: '[dry-run] Locale scaffold would be overwritten: {locale}',
    created: 'Locale scaffold created: {locale}',
    overwritten: 'Locale scaffold overwritten: {locale}',
    file_path: 'Locale file: {path}',
    next_steps: 'Next steps:',
    step_translate: '1. Replace English strings with translated text in that file.',
    step_try: '2. Run the CLI with --locale={locale} to validate the new dictionary.'
  },
  agents: {
    list_title: 'Available agents (resolved locale: {locale}):',
    path: 'Path',
    active_path: 'Active path',
    depends: 'Depends on',
    output: 'Output',
    agent_line: '- Agent: {label} - {command} ({id})',
    path_line: '  Path: {path}',
    active_path_line: '  Active path: {path}',
    depends_line: '  Depends on: {value}',
    output_line: '  Output: {value}',
    none: 'none',
    prompt_usage_error:
      'Usage: aioson agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=en]',
    prompt_unknown_agent: 'Unknown agent: {agent}',
    prompt_title: 'Prompt for agent "{agent}" on tool "{tool}" (locale: {locale}):'
  },
  context_validate: {
    missing_file: 'Context file not found: {path}',
    hint_setup: 'Run @setup to generate the file first.',
    invalid_frontmatter: 'Context file has invalid YAML frontmatter.',
    file_path: 'Context file: {path}',
    parse_reason_unknown: 'unknown',
    parse_reason_missing_frontmatter: 'missing opening frontmatter delimiter',
    parse_reason_unclosed_frontmatter: 'unclosed frontmatter block',
    parse_reason_invalid_frontmatter_line: 'invalid frontmatter line syntax',
    parse_reason: 'Parse reason: {reason}',
    hint_fix_frontmatter: 'Use @setup to regenerate a valid context file.',
    invalid_fields: 'Context file is parsed but has validation issues:',
    issue_line: '- {issue}',
    valid: 'Context file is valid.'
  },
  context_pack: {
    generated: 'Context pack written to: {path}',
    no_matches: 'No relevant context files were selected yet. Run setup/context/scan before packing.',
    selected_title: 'Files included in the pack:',
    selected_line: '  {index}. {path} — {reason}',
    hint_use: 'Use {path} as the minimum starting context in your AI session.'
  },
  setup_context: {
    detected: 'Detected framework: {framework} (installed={installed})',
    q_project_name: 'Project name',
    q_project_type: 'Project type (web_app|api|site|script|dapp)',
    q_profile: 'Profile: [1] developer [2] beginner [3] team',
    q_use_detected_framework: 'Use detected framework? (true/false)',
    q_framework: 'Framework',
    q_framework_installed: 'Framework installed? (true/false)',
    q_language: 'Conversation language (for example en or pt-BR)',
    q_backend_menu:
      'Backend: [1] Laravel [2] Rails [3] Django [4] Node/Express [5] Next.js [6] Nuxt [7] Hardhat [8] Foundry [9] Truffle [10] Anchor [11] Solana Web3 [12] Cardano [13] Other',
    q_backend_text: 'Backend (free text)',
    q_laravel_version: 'Laravel version (for example 11, 10)',
    q_frontend_menu:
      'Frontend: [1] TALL Stack [2] VILT Stack [3] Blade [4] Next.js [5] Nuxt [6] React [7] Vue [8] Other',
    q_frontend_text: 'Frontend (free text)',
    q_auth_menu:
      'Auth (Laravel): [1] Breeze [2] Jetstream + Livewire [3] Filament Shield [4] Custom',
    q_web3_enabled: 'Web3 enabled? (true/false)',
    q_web3_networks: 'Web3 networks (for example ethereum, solana, cardano)',
    q_contract_framework: 'Contract framework (for example Hardhat, Foundry, Anchor, Aiken)',
    q_wallet_provider: 'Wallet provider (for example wagmi, RainbowKit, Phantom, Lace)',
    q_indexer: 'Indexer (for example The Graph, Helius, Blockfrost)',
    q_rpc_provider: 'RPC provider (for example Alchemy, Infura, QuickNode)',
    q_jetstream_teams: 'Jetstream teams enabled? (true/false)',
    q_jetstream_existing_action:
      'Existing Laravel project without Jetstream detected. Action: [1] continue without Jetstream [2] recreate with Jetstream (recommended) [3] manual install (risk)',
    q_auth_text: 'Authentication approach (free text)',
    q_uiux_menu: 'UI/UX: [1] Tailwind [2] Flux UI [3] shadcn/ui [4] Filament',
    q_uiux_text: 'UI/UX approach (free text)',
    q_database_menu:
      'Database: [1] MySQL [2] PostgreSQL [3] SQLite [4] MongoDB [5] Supabase [6] PlanetScale',
    q_database_text: 'Database (free text)',
    q_services_list:
      'Additional services (comma list): queues, storage, websockets, payments, email, cache, search',
    q_rails_options:
      'Rails options used (comma list, e.g. --database=postgresql,--css=tailwind,--api)',
    q_next_options:
      'Next.js create-next-app options (comma list, e.g. TypeScript,ESLint,Tailwind CSS,App Router,src/ directory)',
    q_beginner_summary: 'Describe your project in one sentence',
    q_beginner_users:
      'Expected users: [1] personal/small up to 10 [2] small team up to 100 [3] external customers',
    q_beginner_mobile: 'Mobile requirement: [1] mobile app [2] responsive web [3] desktop only',
    q_beginner_hosting: 'Hosting preference: [1] simple managed [2] VPS [3] cloud provider',
    q_beginner_accept_recommendation: 'Accept starter recommendation? (true/false)',
    beginner_recommendation:
      'Starter recommendation -> framework: {framework}, frontend: {frontend}, database: {database}, auth: {auth}',
    q_user_types: 'How many user types?',
    q_integrations: 'How many external integrations?',
    q_rules_complexity: 'Rules complexity (none|some|complex)',
    note_status_enabled: 'enabled',
    note_status_disabled: 'disabled',
    note_jetstream_teams: 'Jetstream teams: {status}',
    note_selected_services: 'Selected services: {services}',
    note_rails_setup_flags: 'Rails setup flags: {flags}',
    note_next_setup_flags: 'Next.js setup flags: {flags}',
    note_next_create_flags: 'Next.js create flags: {flags}',
    note_jetstream_existing_action: 'Jetstream existing-project action: {action}',
    note_mobile_first:
      'Mobile-first requirement detected; consider React Native/Expo as follow-up.',
    note_vps_preference:
      'VPS preference detected; keep deployment scripts simple and reproducible.',
    note_cloud_profile:
      'Cloud profile detected; use managed DB and object storage from day one.',
    note_web3_terms: 'Web3 terms detected; dApp starter recommendation applied.',
    note_starter_profile:
      'This recommendation is a starter profile; adjust once requirements are clearer.',
    note_team_profile:
      'Team profile selected; preserve explicit team conventions and CI rules.',
    note_beginner_declined:
      'Starter recommendation declined; using custom stack from onboarding.',
    note_monorepo:
      'Monorepo detected: Web3 and application framework coexist. Confirm primary framework with user and document structure in Notes.',
    written: 'Context file written: {path}',
    classification_result: 'Classification: {classification} (score={score}/6)',
    locale_applied: 'Localized agent pack applied: {locale} ({count} files)'
  },
  locale_apply: {
    applied: 'Locale pack applied: {locale}',
    dry_run_applied: '[dry-run] Locale pack would be applied: {locale}',
    copied_count: 'Files copied: {count}',
    missing_count: 'Missing locale files: {count}',
    copy_line: '  File: {source} -> {target}'
  },
  smoke: {
    start: 'Running smoke test in: {projectDir}',
    using_web3_profile: 'Using Web3 smoke profile: {target}',
    using_mixed_profile: 'Using mixed Web2+Web3 monorepo smoke profile.',
    using_parallel_profile: 'Using parallel orchestration smoke profile.',
    seeded_web3_workspace: 'Seeded workspace for Web3 target: {target}',
    seeded_mixed_workspace: 'Seeded workspace for mixed Web2+Web3 profile.',
    seeded_parallel_context: 'Seeded discovery/architecture/prd context for parallel profile.',
    step_ok: 'OK: {step}',
    web3_detected: 'Web3 framework detected: {framework} ({network})',
    web3_context_verified: 'Web3 context verified for network: {network}',
    mixed_context_verified: 'Mixed profile context verified (framework: {framework}).',
    parallel_status_verified: 'Parallel status verified for lanes: {count}',
    invalid_web3_target: 'Invalid --web3 target: {target}. Use ethereum, solana, or cardano.',
    invalid_profile: 'Invalid --profile value: {profile}. Use standard, mixed, or parallel.',
    profile_conflict: 'Do not combine --profile=mixed with --web3. Choose one profile mode.',
    assert_install_files: 'install copied zero files',
    assert_web3_framework: 'unexpected web3 framework detection: {framework}',
    assert_setup_written: 'setup:context did not write context file',
    assert_setup_project_type_dapp: 'setup did not infer project_type=dapp',
    assert_setup_web3_network: 'setup did not infer expected web3 network',
    assert_setup_web3_framework: 'setup did not keep expected web3 framework',
    assert_mixed_project_type_dapp: 'mixed profile did not infer project_type=dapp',
    assert_mixed_web3_enabled: 'mixed profile did not infer web3_enabled=true',
    assert_mixed_framework: 'mixed profile did not prefer web3 framework',
    assert_locale_apply_files: 'locale:apply copied zero files',
    assert_agents_count: 'agents command returned unexpected agent count',
    assert_prompt_path: 'agent:prompt did not include expected path information',
    assert_context_validate: 'context:validate failed',
    assert_web3_context_valid: 'web3 context parse failed',
    assert_web3_context_project_type: 'context project_type is not dapp',
    assert_web3_context_enabled: 'context web3_enabled is not true',
    assert_web3_context_network: 'context web3_networks does not include expected target',
    assert_doctor_ok: 'doctor check failed',
    assert_parallel_init_ok: 'parallel:init failed',
    assert_parallel_init_workers: 'parallel:init workers mismatch',
    assert_parallel_assign_ok: 'parallel:assign failed',
    assert_parallel_assign_scope: 'parallel:assign produced no scopes',
    assert_parallel_status_ok: 'parallel:status failed',
    assert_parallel_status_lanes: 'parallel:status lane count mismatch',
    assert_parallel_doctor_ok: 'parallel:doctor failed',
    assert_parallel_doctor_summary: 'parallel:doctor reported failures',
    completed: 'Smoke test completed successfully.',
    steps_count: 'Validated steps: {count}',
    workspace_kept: 'Workspace kept: {path}',
    workspace_removed: 'Workspace removed: {path}'
  },
  package_test: {
    start: 'Running package test from source: {sourceDir}',
    pack_done: 'Package tarball created: {tarball}',
    completed: 'Package test completed with {count} validated steps.',
    workspace: 'Package test workspace: {path}',
    error_unknown_detail: 'unknown error',
    error_npm_pack: 'npm pack failed: {detail}',
    error_tarball_missing: 'npm pack did not return tarball name',
    error_npx_init: 'npx init failed: {detail}',
    error_npx_setup_context: 'npx setup:context failed: {detail}',
    error_npx_doctor: 'npx doctor failed: {detail}',
    error_doctor_not_ok: 'doctor returned ok=false during package test',
    error_npx_mcp_init: 'npx mcp:init failed: {detail}',
    error_mcp_not_ok: 'mcp:init returned ok=false during package test'
  },
  workflow_plan: {
    context_missing:
      'Context file not found. Using fallback workflow based on provided/default classification.',
    title: 'Recommended workflow for classification {classification}:',
    notes: 'Notes:',
    command_line: '  Command: {command}',
    note_line: '  Note: {note}',
    note_framework_not_installed:
      'Framework is not installed yet; complete stack installation before @dev.',
    note_dapp_context:
      'dApp context detected; include Web3 skills during @architect and @dev.',
    note_micro_scope: 'Keep implementation scope minimal and avoid optional agents.',
    note_product_optional: '@product is optional for MICRO — skip it and go straight to @dev if the idea is already clear.',
    note_feature_flow: 'New feature workflow (after initial setup): @product → @analyst → @dev → @qa. No @setup required.'
  },
  workflow_next: {
    title: 'Workflow handoff for {mode} ({classification}):',
    completed: 'Completed stage: {agent}',
    detour: 'Detour active: {agent} (return to {returnTo})',
    current_agent: 'Current agent: {agent}',
    next_agent: 'Return/next agent: {agent}',
    done: 'Workflow is complete. No next agent remains.',
    state_file: 'State file: {path}'
  },
  parallel_init: {
    context_missing: 'Context file not found: {path}. Run setup:context first.',
    context_invalid: 'Context file is invalid or not parseable: {path}.',
    classification_unknown: 'unknown',
    requires_medium:
      'Parallel initialization is only supported for MEDIUM classification (current: {classification}). Use --force to override.',
    invalid_workers: 'Invalid --workers value. Use an integer between {min} and {max}.',
    already_exists:
      'Parallel context files already exist ({count}). Use --force to overwrite existing files.',
    prepared: 'Parallel workspace initialized at: {path}',
    dry_run_prepared: '[dry-run] Parallel workspace would be initialized at: {path}',
    workers_count: 'Workers: {count}',
    files_count: 'Files prepared: {count}',
    missing_prereq_count: 'Missing prerequisite context files: {count}',
    file_line: '  File: {file}'
  },
  parallel_doctor: {
    prefix_ok: 'OK',
    prefix_warn: 'WARN',
    prefix_fail: 'FAIL',
    check_line: '[{prefix}] {id} - {message}',
    hint_line: '  Hint: {hint}',
    invalid_workers: 'Invalid --workers value. Use an integer between {min} and {max}.',
    classification_unknown: 'unknown',
    requires_medium:
      'Parallel doctor fix mode requires MEDIUM classification (current: {classification}). Use --force to override.',
    report_title: 'Parallel doctor report: {path}',
    summary: 'Summary: {passed} passed, {failed} failed, {warnings} warnings.',
    fix_summary: 'Parallel fix changes applied: {count}',
    fix_summary_dry_run: '[dry-run] Parallel fix changes planned: {count}',
    check_context_exists_ok: 'project.context.md exists.',
    check_context_exists_missing: 'project.context.md is missing.',
    check_context_exists_hint: 'Run setup:context before parallel doctor.',
    check_context_parsed_ok: 'project.context.md is parseable.',
    check_context_parsed_invalid: 'project.context.md is invalid.',
    check_context_parsed_hint: 'Fix context frontmatter before running parallel doctor.',
    check_context_classification_ok:
      'Parallel mode allowed for classification {classification}.',
    check_context_classification_invalid:
      'Parallel mode requires MEDIUM classification (current: {classification}).',
    check_context_classification_hint: 'Use --force to override classification guard.',
    check_parallel_dir_ok: '.aioson/context/parallel directory exists.',
    check_parallel_dir_missing: '.aioson/context/parallel directory is missing.',
    check_parallel_dir_hint: 'Run parallel:init or parallel:doctor --fix.',
    check_parallel_shared_ok: 'shared-decisions.md is present.',
    check_parallel_shared_missing: 'shared-decisions.md is missing.',
    check_parallel_shared_hint: 'Run parallel:doctor --fix to restore baseline files.',
    check_lanes_present_ok: 'Detected {count} lane file(s).',
    check_lanes_present_missing: 'No agent lane status files found.',
    check_lanes_present_hint: 'Run parallel:init or parallel:doctor --fix.',
    check_lanes_sequence_ok: 'Lane sequence is contiguous (1..{workers}).',
    check_lanes_sequence_missing: 'Missing lane files in sequence: {lanes}',
    check_lanes_sequence_hint: 'Run parallel:doctor --fix to restore missing lane files.',
    check_workers_option: 'Workers option requested: {workers}.',
    check_prereq_ok: 'All prerequisite context files are present.',
    check_prereq_missing: '{count} prerequisite context file(s) are missing.',
    check_prereq_hint: 'Create discovery/architecture/prd context files before orchestration.'
  },
  parallel_assign: {
    invalid_workers: 'Invalid --workers value. Use an integer between {min} and {max}.',
    context_missing: 'Context file not found: {path}.',
    context_invalid: 'Context file is invalid or not parseable: {path}.',
    classification_unknown: 'unknown',
    requires_medium:
      'Parallel assignment requires MEDIUM classification (current: {classification}). Use --force to override.',
    parallel_missing: 'Parallel directory not found: {path}. Run parallel:init first.',
    no_lanes: 'No lane status files were found in .aioson/context/parallel.',
    missing_lanes: 'Missing lane files for requested workers: {lanes}.',
    source_missing: 'Could not resolve source document from --source={source}.',
    applied: 'Parallel scope assignment applied ({count} scope item(s)).',
    dry_run_applied: '[dry-run] Parallel scope assignment planned ({count} scope item(s)).',
    source_info: 'Source document: {source}',
    workers_count: 'Workers: {count}',
    files_count: 'Files updated: {count}',
    lane_scope_line: '- lane {lane}: {count} scope item(s)'
  },
  parallel_status: {
    parallel_missing: 'Parallel directory not found: {path}. Run parallel:init first.',
    no_lanes: 'No lane status files were found in .aioson/context/parallel.',
    title: 'Parallel status report: {path}',
    lanes_count: 'Lanes: {count}',
    statuses_title: 'Statuses:',
    status_line: '- {status}: {count}',
    status_pending: 'pending',
    status_in_progress: 'in_progress',
    status_completed: 'completed',
    status_blocked: 'blocked',
    status_other: 'other',
    scopes_count: 'Total scope items: {count}',
    deliverables_progress: 'Deliverables: {completed}/{total} completed',
    blockers_count: 'Open blockers: {count}',
    shared_decisions: 'Shared decision log entries: {count}',
    lane_line: '- lane {lane}: status={status}, scope={scope}, blockers={blockers}'
  },
  mcp_init: {
    context_missing:
      'Context file not found. Generating baseline MCP plan with generic assumptions.',
    invalid_tool: 'Invalid --tool value: {tool}. Use one of: {expected}.',
    reason_filesystem: 'Mandatory local workspace access.',
    reason_context7: 'Use up-to-date official documentation at implementation time.',
    reason_database_none: 'No database stack detected yet.',
    reason_database_enabled: 'Context indicates database-backed features (remote MCP endpoint recommended).',
    reason_web_search: 'Useful for package vetting and release-note verification.',
    reason_chain_rpc_disabled: 'Web3 is disabled for this project.',
    reason_chain_rpc_enabled: 'dApp context detected; chain RPC access is required.',
    reason_makopy: 'Optional content pipeline integration.',
    note_workspace_local: 'This is a workspace-local preset generated by AIOSON.',
    note_replace_placeholders: 'Replace placeholder commands with the MCP servers you actually use.',
    note_keep_secrets_env: 'Keep secrets in environment variables, never inline tokens.',
    generated: 'MCP plan written: {path}',
    dry_run_generated: '[dry-run] MCP plan would be written: {path}',
    server_count: 'MCP servers in plan: {count}',
    preset_count: 'Tool presets generated: {count}',
    preset_written: 'Preset written ({tool}): {path}',
    preset_dry_run: '[dry-run] Preset would be written ({tool}): {path}'
  },
  mcp_doctor: {
    prefix_ok: 'OK',
    prefix_warn: 'WARN',
    prefix_fail: 'FAIL',
    check_line: '[{prefix}] {id} - {message}',
    hint_line: '  Hint: {hint}',
    context_missing: 'project.context.md was not found.',
    context_missing_hint: 'Run setup first for context-aware MCP validation.',
    context_parse_invalid: 'project.context.md could not be parsed ({reason}).',
    context_parse_invalid_hint: 'Fix context formatting to enable stack-aware MCP validation.',
    context_ok: 'project.context.md is available and parseable.',
    plan_missing: 'MCP plan file was not found (.aioson/mcp/servers.local.json).',
    plan_missing_hint: 'Run: aioson mcp:init',
    plan_invalid: 'MCP plan JSON is invalid: {error}',
    plan_invalid_hint: 'Regenerate the plan with: aioson mcp:init',
    plan_ok: 'MCP plan file is present and valid JSON.',
    plan_servers_ok: 'MCP plan declares {count} server definition(s).',
    plan_servers_missing: 'MCP plan has no server definitions.',
    plan_servers_hint: 'Regenerate with: aioson mcp:init',
    core_enabled: 'Core MCP server "{server}" is enabled.',
    core_missing: 'Core MCP server "{server}" is missing or disabled.',
    core_missing_hint: 'Regenerate and keep baseline core servers enabled.',
    presets_any_ok: '{count} MCP preset file(s) found.',
    presets_any_missing: 'No MCP preset files were found.',
    presets_any_hint: 'Run: aioson mcp:init',
    presets_coverage_partial: 'Only {existing}/{total} tool presets are present.',
    presets_coverage_partial_hint:
      'Run: aioson mcp:init (without --tool) to generate all presets.',
    presets_coverage_full: 'All tool presets are present (claude, codex, gemini, opencode).',
    env_none_required: 'No required environment variables in enabled MCP servers.',
    env_missing: '{missing}/{total} required env var(s) are missing: {vars}',
    env_missing_hint_strict: 'Set the missing variables before execution.',
    env_missing_hint_relaxed:
      'Set variables for full runtime readiness. Use --strict-env to fail on this check.',
    env_all_present: 'All required env vars are available ({count}).',
    compat_database_ok: 'Database MCP matches context stack engine ({engine}).',
    compat_database_mismatch: 'Database MCP does not fully match context stack ({engine}).',
    compat_database_hint: 'Regenerate with: aioson mcp:init, or adjust database server manually.',
    compat_web3_ok: 'chain-rpc MCP is enabled for Web3 context.',
    compat_web3_missing: 'Web3 context detected, but chain-rpc MCP is missing or disabled.',
    compat_web3_missing_hint: 'Regenerate with: aioson mcp:init',
    compat_web3_unneeded: 'chain-rpc MCP is enabled, but context is not Web3.',
    compat_web3_unneeded_hint: 'Disable chain-rpc if not needed.',
    report_title: 'MCP doctor report: {path}',
    summary: 'Summary: {passed} passed, {failed} failed, {warnings} warnings.'
  },
  qa_doctor: {
    prefix_ok: 'OK',
    prefix_warn: 'WARN',
    prefix_fail: 'FAIL',
    check_line: '[{prefix}] {id} - {message}',
    hint_line: '  Hint: {hint}',
    report_title: 'QA doctor report: {path}',
    summary: 'Summary: {passed} passed, {failed} failed, {warnings} warnings.',
    playwright_ok: 'Playwright is installed.',
    playwright_missing: 'Playwright package not found.',
    playwright_missing_hint: 'Run: npm install -g playwright && npx playwright install chromium',
    chromium_ok: 'Chromium browser binary found.',
    chromium_missing: 'Chromium binary not found.',
    chromium_missing_hint: 'Run: npx playwright install chromium',
    config_ok: 'aios-qa.config.json found and valid.',
    config_missing: 'aios-qa.config.json not found.',
    config_missing_hint: 'Run: aioson qa:init --url=<your-app-url>',
    config_invalid: 'aios-qa.config.json is not valid JSON: {error}',
    url_ok: 'Target URL is reachable ({url}).',
    url_missing: 'No target URL configured in aios-qa.config.json.',
    url_missing_hint: 'Run: aioson qa:init --url=<your-app-url>',
    url_unreachable: 'Target URL is not reachable ({url}): {error}',
    url_unreachable_hint: 'Start your application before running qa:run or qa:scan.',
    context_ok: 'project.context.md found — tests will be enriched with project context.',
    context_missing: 'project.context.md not found — running in generic mode.',
    prd_ok: 'prd.md found — {count} acceptance criteria mapped to test scenarios.',
    prd_missing: 'prd.md not found — AC coverage mapping will be skipped.'
  },
  qa_init: {
    context_found: 'Context found: project={name}, url={url}',
    prd_found: 'prd.md found — extracted {count} acceptance criteria as test scenarios.',
    prd_missing: 'prd.md not found — no AC scenarios generated. Add prd.md to enrich tests.',
    generated: 'QA config written: {path}',
    dry_run_generated: '[dry-run] QA config would be written: {path}',
    scenarios_count: 'Test scenarios from prd.md: {count}',
    personas_count: 'Personas enabled: {count} (naive, hacker, power, mobile)',
    probes_count: 'Security probes enabled: {count}',
    next_steps: 'Next steps:',
    step_doctor: '1. Verify prerequisites: aioson qa:doctor',
    step_run: '2. Run browser tests: aioson qa:run'
  },
  qa_run: {
    playwright_missing: 'Playwright is not installed. Run: npm install -g playwright && npx playwright install chromium',
    config_missing: 'aios-qa.config.json not found. Run: aioson qa:init --url=<your-app-url>',
    url_missing: 'No URL configured. Add url to aios-qa.config.json or use --url=<app-url>.',
    starting: 'Starting browser QA session: {url}',
    persona_start: 'Running persona: {persona}',
    persona_done: 'Persona "{persona}" complete — {count} finding(s)',
    accessibility: 'Running accessibility audit...',
    performance: 'Capturing performance metrics...',
    ac_scenarios: 'Documenting AC coverage...',
    done: 'QA session complete.',
    report_written: 'Report written: {path}',
    json_written: 'JSON report written: {path}',
    screenshots_dir: 'Screenshots saved to: {path}',
    findings_summary: 'Findings: {critical} critical, {high} high, {medium} medium, {low} low',
    html_report_written: 'HTML report written: {path}'
  },
  qa_scan: {
    playwright_missing: 'Playwright is not installed. Run: npm install -g playwright && npx playwright install chromium',
    config_missing: 'aios-qa.config.json not found. Run: aioson qa:init --url=<your-app-url>',
    url_missing: 'No URL configured. Add url to aios-qa.config.json or use --url=<app-url>.',
    starting: 'Starting autonomous scan: {url}',
    crawling: 'Crawling routes (max depth {depth}, max pages {pages})...',
    routes_found: 'Routes discovered: {count}',
    scanning_route: 'Scanning: {route}',
    done: 'Autonomous scan complete.',
    report_written: 'Report written: {path}',
    findings_summary: 'Findings: {critical} critical, {high} high, {medium} medium, {low} low',
    html_report_written: 'HTML report written: {path}'
  },
  qa_report: {
    not_found: 'No QA report found. Run: aioson qa:run or aioson qa:scan',
    html_report_written: 'HTML report written: {path}'
  },
  config: {
    usage_error:
      'Usage: aioson config <set KEY=value|show|get KEY> [--json] [--locale=en]',
    set_ok: 'Config key set: {key} (saved to {path})',
    show_header: 'Global config: {path}',
    show_empty: '  (no keys configured)',
    show_line: '  {key} = {value}',
    get_line: '{key} = {value}',
    key_not_found: 'Key not found: {key}'
  },
  runtime: {
    option_required: 'Required option missing: {option}',
    store_missing: 'Runtime store not found: {path}. Run: aioson runtime:init',
    init_ok: 'Runtime store initialized: {path}',
    ingest_ok: 'Runtime contents indexed: {indexed} | skipped: {skipped} ({path})',
    task_start_ok: 'Task started: {task} ({path})',
    start_ok: 'Run started: {run} ({path})',
    update_ok: 'Run updated: {run} ({path})',
    task_finish_ok: 'Task completed: {task} ({path})',
    finish_ok: 'Run completed: {run} ({path})',
    task_fail_ok: 'Task failed: {task} ({path})',
    fail_ok: 'Run failed: {run} ({path})',
    log_ok: 'Event logged: {agent} / {run} ({path})',
    log_finish_ok: 'Run finished: {agent} / {run} ({path})',
    log_agent_required: 'Missing required option: --agent',
    status_title: 'Runtime status: {path}',
    status_db: 'DB: {path}',
    status_task_counts:
      'Tasks -> Queued: {queued} | Running: {running} | Completed: {completed} | Failed: {failed}',
    status_counts:
      'Runs  -> Queued: {queued} | Running: {running} | Completed: {completed} | Failed: {failed}',
    status_no_active_tasks: 'No active tasks.',
    status_active_tasks_title: 'Active tasks:',
    status_active_task_line: '- {task} | squad: {squad} | status: {status} | work: {title}',
    status_no_active: 'No active agent runs.',
    status_active_title: 'Active runs:',
    status_active_line: '- {agent} | squad: {squad} | status: {status} | work: {title}',
    status_live_sessions_title: 'Active live sessions:',
    status_live_session_line: '- {task} | agent: {agent} | status: {status} | plan: {plan} | micro: {micro} | handoffs: {handoffs} | work: {title}',
    status_micro_tasks_title: 'Active micro-tasks:',
    status_micro_task_line: '- {task} | parent: {parent} | status: {status} | work: {title}',
    status_handoffs_title: 'Recent handoffs:',
    status_handoff_line: '- {created} | {from} -> {to} | session: {session} | {message}'
  },
  live: {
    unsupported_tool: 'Unsupported live tool: {tool}. Supported tools: {supported}',
    plan_not_found: 'Plan file not found: {plan}',
    no_active_session: 'No active live session found for {agent}.',
    session_not_active: 'Live session for {agent} is not active.',
    json_requires_no_launch: '--json requires --no-launch for live:start because foreground launch is interactive.',
    tool_binary_not_found: 'Tool binary not found in PATH: {binary}',
    tool_mismatch: 'Active session uses tool "{existing}" but --tool={requested} was given. Close the session first or use the same tool.',
    micro_task_already_open: 'A live micro-task is already open for {agent}. Emit task_completed before task_started again.',
    handoff_same_agent: 'live:handoff requires different --agent and --to values.',
    handoff_agent_mismatch: 'No active live session found for {agent}.',
    watch_json_conflict: '--watch cannot be combined with --json.',
    no_session_found: 'No live session found.',
    no_session_for_agent: 'No live session found for {agent}.',
    session_already_closed: 'Live session {session} is already closed.',
    session_already_active: 'Live session already active: {agent} | session: {session} | run: {runKey} ({dbPath})',
    session_started: 'Live session started: {agent} | tool: {tool} | session: {session} ({dbPath})',
    event_recorded: 'Live event recorded: {agent} | {eventType} | {session} ({dbPath})',
    handoff_recorded: 'Live handoff recorded: {from} -> {to} | {session} ({dbPath})',
    session_closed: 'Live session closed: {agent} | {session} ({dbPath})',
    process_dead_warning: 'Process is dead while the live session is still open. Close it manually with `aioson live:close . --status=failed`.',
    list_title: 'Live sessions ({count}):',
    list_empty: 'No live sessions found.',
    list_line: '- {session} | {agent} | {tool} | {phase} | {updatedAt}'
  },
  squad_status: {
    no_squad: 'No squads found.',
    hint: 'Use @squad in your AI session to assemble a squad.',
    squads_found: '{count} squad(s) found:',
    most_recent: '(most recent)',
    squad_item: '  [{file}]{marker}',
    name: '    Squad       : {value}',
    mode: '    Mode        : {value}',
    goal: '    Goal        : {value}',
    agents: '    Agents      : {specialists} specialists / {total} total ({path})',
    sessions: '    Sessions    : {count} ({path})',
    latest_html: '    Latest HTML : {value}',
    logs: '    Logs        : {count} ({path})',
    genomes: '    Genomes     : {count} squad-level / {agent_count} agent bindings'
  },
  squad_agent_create: {
    no_name: 'Usage: aioson squad:agent-create [path] --name=<agent-name> [--type=agent|assistant|clone|worker] [--scope=my-agents|squad] [--squad=<slug>]',
    invalid_scope: 'Invalid scope: "{scope}". Use "my-agents" or "squad".',
    invalid_type: 'Invalid type: "{type}". Use: agent, assistant, clone, worker.',
    invalid_tier: 'Invalid tier: "{tier}". Use: 0 (foundation), 1 (master), 2 (systematizer), 3 (specialist).',
    invalid_disc: 'Invalid DISC profile: "{disc}".',
    no_squads: 'No squads found. Create a squad first with @squad or provide --squad=<slug>.',
    squad_required: '--squad=<slug> required when scope is "squad".',
    squad_not_found: 'Squad "{squad}" not found.',
    already_exists: 'Agent already exists: {path}'
  },
  squad_doctor: {
    prefix_ok: 'OK',
    prefix_warn: 'WARN',
    prefix_fail: 'FAIL',
    report_title: 'Squad report {squad}: {path}',
    check_line: '[{prefix}] {message}',
    check_metadata: 'Squad metadata present: {path}',
    check_manifest: 'Squad manifest present: {path}',
    check_rules: 'Rules/agents.md present: {path}',
    check_design_doc: 'Squad design doc: {path}',
    check_readiness: 'Squad readiness: {path}',
    check_executors: 'Declared executors: {count} | missing files: {missing}',
    check_output_dir: 'Squad output directory: {path}',
    check_media_dir: 'Squad media directory: {path}',
    check_runtime_missing: 'Runtime store missing. Run aioson runtime:init.',
    check_active_runs: 'Active runs: {count} | possibly stuck (> {minutes} min): {stale}',
    check_content_indexing: 'Indexed contents: {indexed} | pending output files: {pending}',
    summary: 'Summary -> checks OK: {passed} | warnings: {warned} | failures: {failed}'
  },
  scan_project: {
    scanning: 'aioson scan:project — scanning {dir}',
    folder_required:
      'Pass --folder=<path[,path2]> to generate full scans for specific folders. Example: --folder=src or --folder=app.',
    folder_required_examples_title: '\x1b[33mQuick start:\x1b[0m',
    folder_required_example_local:
      '  Local maps only : aioson scan:project . --folder=src',
    folder_required_example_multi:
      '  Multiple folders: aioson scan:project . --folder=src,app',
    folder_required_example_llm:
      '  API automation  : aioson scan:project . --folder=src --with-llm --provider=openai',
    folder_required_example_cli:
      '  No API in aioson: aioson scan:project . --folder=src  -> then run @analyst in Codex/Claude/Gemini',
    folder_required_example_prompt:
      '  Ready prompt    : aioson agent:prompt analyst --tool=codex',
    folder_required_example_next:
      '  Workflow after full scan: @analyst -> @architect -> @dev',
    folder_not_found: 'Folder "{folder}" was not found in this project. Top-level directories detected: {available}',
    config_missing: '{file} not found. To use LLM mode, copy aioson-models.json and fill in your API keys.',
    config_invalid: 'Invalid JSON in aioson-models.json: {error}',
    provider_missing: 'LLM provider "{provider}" not found in aioson-models.json. Available: {available}',
    provider_info: '  Provider : {provider}',
    model_info: '  Model    : {model}',
    context_found: '  Context  : project.context.md found',
    context_missing: '  Context  : project.context.md not found (run aioson setup:context first)',
    spec_found: '  Spec     : spec.md found — development memory included',
    existing_discovery_found: '  Context  : existing discovery.md found at {path}',
    existing_skeleton_found: '  Context  : existing skeleton-system.md found at {path}',
    context_update_mode: '  Mode     : update/merge of existing discovery.md + skeleton-system.md enabled',
    context_mode: '  Context  : context-mode={mode} (recommended default for brownfield: merge)',
    local_only: '  LLM      : disabled by default — local scan only (use --with-llm to generate discovery.md + skeleton-system.md)',
    walking: '  Scanning project structure...',
    walk_done: '  Files    : {files} entries mapped | Key files: {keys} read',
    index_written: '  Index    : local scan index written to {path} (mode: {mode})',
    folders_written: '  Folders  : folder map written to {path}',
    folder_written: '  Folder   : full map for {folder} written to {path}',
    forge_written: '  AIOS     : useful .aioson map written to {path}',
    memory_index_written: '  Memory   : memory-index.md written to {path}',
    spec_current_written: '  Memory   : spec-current.md written to {path}',
    spec_history_written: '  Memory   : spec-history.md written to {path}',
    module_memory_written: '  Module   : focused memory for {folder} written to {path}',
    dry_run_done: '[dry-run] Would scan {treeCount} entries and {keyCount} key files — no LLM call made.',
    local_done: '  Result   : local scan completed — index, folder map, requested folder scans and .aioson map are ready.',
    local_missing: '  Missing  : discovery.md + skeleton-system.md were not generated in this local-only scan.',
    architecture_note: '  Note     : architecture.md is not generated by scan:project; it comes later from @architect.',
    local_paths_title: '\n\x1b[33m  How to generate discovery now:\x1b[0m',
    local_path_api: '  \x1b[32mPath A — API automation\x1b[0m',
    calling_llm: '  Calling {provider} ({model})...',
    llm_missing_api_key:
      'The API key for provider "{provider}" is still missing in {file}. Fill providers.{provider}.api_key or choose another provider with --provider=...',
    llm_error: 'LLM call failed: {error}',
    gitignore_policy_written:
      '  Gitignore: AIOSON policy updated in {path} to ignore framework-managed files',
    gitignore_tracked_note:
      '  Gitignore: if those files were already tracked by Git before, you still need one git rm --cached pass for them to stop appearing in status',
    invalid_llm_output_discovery_empty:
      'The LLM returned an empty discovery.md. No existing files were overwritten. Keep the current backup and retry with a stronger model or fewer folders.',
    invalid_llm_output_skeleton_empty:
      'The LLM returned an empty skeleton-system.md after the delimiter. No existing files were overwritten. Retry with a stronger model or a smaller scope.',
    gitignore_backups_written: '  Gitignore: local backup rule ensured in {path}',
    backups_written: '  Backup   : saved {count} file(s) into {path}',
    discovery_written: 'discovery.md written: {path} ({chars} chars)',
    skeleton_written: 'skeleton-system.md written: {path} ({chars} chars)',
    skeleton_missing: 'Skeleton delimiter not found in LLM response — skeleton-system.md not written.',
    local_next_steps: '  1. Run: aioson scan:project {target} --folder={folders} --with-llm --provider=<provider>',
    local_path_cli: '  \x1b[36mPath B — Your AI CLI (no API inside aioson)\x1b[0m',
    local_cli_step_analyst: '  2. In Codex, Claude Code, or another client, run @analyst — it can use scan-index.md + scan-folders.md + scan-<folder>.md to write discovery.md',
    local_cli_step_prompt_codex: '  3. If the client does not understand @analyst, generate a ready prompt: aioson agent:prompt analyst --tool=codex',
    local_cli_step_prompt_claude: '  4. Swap --tool=codex for --tool=claude or --tool=gemini when needed',
    local_cli_step_model_hint: '  5. If your client supports model selection, prefer a fast/cheap model for this discovery step',
    local_workflow_title: '\n\x1b[33m  After discovery:\x1b[0m',
    local_step_architect: '  3. Run @architect — generates architecture.md from the consolidated discovery',
    local_step_dev: '  4. Run @dev — only start coding after discovery.md + architecture.md are ready',
    next_steps: '\n  Next steps:',
    step_analyst: '  1. Open your AI coding session and run @analyst — review discovery.md + skeleton-system.md and consolidate the current scope',
    step_architect: '  2. Run @architect — generates architecture.md from the consolidated discovery',
    step_dev: '  3. Run @dev — reads skeleton-system.md first, then discovery.md + architecture.md + spec.md'
  },
  squad_investigate: {
    no_runtime: 'Runtime store not found. Run aioson runtime:init first.',
    no_investigations: 'No investigations found.',
    not_found: 'Investigation not found: {slug}',
    no_report: 'Investigation "{slug}" has no report file.',
    report_missing: 'Report file not found: {path}',
    show_usage: 'Usage: aioson squad:investigate [path] --sub=show --investigation=<slug>',
    score_usage: 'Usage: aioson squad:investigate [path] --sub=score --investigation=<slug>',
    link_usage: 'Usage: aioson squad:investigate [path] --sub=link --investigation=<slug> --squad=<slug>',
    register_usage: 'Usage: aioson squad:investigate [path] --sub=register --report=<path> [--domain=<name>] [--squad=<slug>]',
    linked: 'Investigation "{investigation}" linked to squad "{squad}".',
    registered: 'Investigation registered: {slug} ({path})',
    unknown_sub: 'Unknown subcommand: {sub}. Use: list, show, score, link, register.'
  },

  implementation_plan: {
    not_found: 'Implementation plan not found: {file}',
    no_runtime: 'Runtime store not found. Run aioson runtime:init first.',
    no_plans: 'No implementation plans registered.',
    no_created_date: 'Plan has no created date in frontmatter — cannot check staleness.',
    is_stale: 'Plan is STALE — source artifacts changed after plan was created.',
    is_fresh: 'Plan is up to date.',
    checkpoint_usage: 'Usage: aioson plan [path] --sub=checkpoint --feature=<slug> --phase=<N>',
    phase_completed: 'Phase {phase} marked as completed.',
    phase_not_found: 'Phase {phase} not found in plan.',
    registered: 'Implementation plan registered: {planId} ({phases} phases)'
  },

  squad_plan: {
    slug_required: 'Squad slug is required.',
    not_found: 'Execution plan not found for squad: {slug}',
    no_runtime: 'Runtime store not found. Run aioson runtime:init first.',
    no_plan: 'No execution plan registered for squad: {slug}',
    no_created_date: 'Plan has no created date in frontmatter — cannot check staleness.',
    is_stale: 'Execution plan is STALE — squad artifacts changed after plan was created.',
    is_fresh: 'Execution plan is up to date.',
    checkpoint_usage: 'Usage: aioson squad:plan [path] --sub=checkpoint --squad=<slug> --round=<N>',
    round_completed: 'Round {round} marked as completed.',
    round_not_found: 'Round {round} not found in plan.',
    registered: 'Execution plan registered: {planSlug} ({rounds} rounds)'
  },

  squad_learning: {
    slug_required: 'Squad slug is required.',
    no_runtime: 'Runtime store not found. Run aioson runtime:init first.',
    no_learnings: 'No learnings found for squad: {slug}',
    not_found: 'Learning not found: {id}',
    archived_count: '{count} learning(s) marked as stale for squad: {slug}',
    promote_usage: 'Usage: aioson squad:learning [path] --sub=promote --squad=<slug> --id=<learning-id> [--to=<rule-path>]',
    promoted: 'Learning {id} promoted to rule at {path}'
  },

  learning: {
    no_runtime: 'Runtime store not found. Run aioson runtime:init first.',
    no_learnings: 'No project learnings found.',
    not_found: 'Learning not found: {id}',
    promote_usage: 'Usage: aioson learning [path] --sub=promote --id=<learning-id> [--to=<rule-path>]',
    promoted: 'Learning {id} promoted to rule at {path}'
  }
};
