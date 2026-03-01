'use strict';

module.exports = {
  cli: {
    title: 'AIOS Lite CLI',
    usage: 'Usage:',
    help_init: 'aios-lite init <project-name> [--force] [--dry-run] [--locale=en]',
    help_install: 'aios-lite install [path] [--force] [--dry-run] [--locale=en]',
    help_update: 'aios-lite update [path] [--dry-run] [--locale=en]',
    help_info: 'aios-lite info [path] [--locale=en]',
    help_doctor: 'aios-lite doctor [path] [--locale=en]',
    help_i18n_add: 'aios-lite i18n:add <locale> [--force] [--dry-run] [--locale=en]',
    help_agents: 'aios-lite agents [--locale=en]',
    help_agent_prompt: 'aios-lite agent:prompt <agent> [--tool=codex|claude|gemini|opencode] [--locale=en]',
    help_context_validate: 'aios-lite context:validate [path] [--locale=en]',
    help_setup_context: 'aios-lite setup:context [path] [--defaults] [--project-name=...] [--language=en] [--locale=en]',
    unknown_command: 'Unknown command: {command}',
    error_prefix: 'Error: {message}'
  },
  init: {
    usage_error: 'Usage: aios-lite init <project-name> [--force] [--dry-run] [--locale=en]',
    non_empty_dir: 'Directory is not empty: {targetDir}. Use --force to continue.',
    created_at: 'Project created at: {targetDir}',
    files_copied: 'Files copied: {count}',
    files_skipped: 'Files skipped: {count}',
    next_steps: 'Next steps:',
    step_cd: '1. cd {projectName}',
    step_setup: '2. Open in your AI CLI and run @setup'
  },
  install: {
    framework_detected: 'Framework detected: {framework} ({evidence})',
    framework_not_detected: 'No framework detected. Installing in generic mode.',
    done_at: 'Installation completed at: {targetDir}',
    files_copied: 'Files copied: {count}',
    files_skipped: 'Files skipped: {count}'
  },
  update: {
    not_installed: 'No AIOS Lite installation found in {targetDir}.',
    done_at: 'Update completed at: {targetDir}',
    files_updated: 'Files updated: {count}',
    backups_created: 'Backups created: {count}'
  },
  info: {
    cli_version: 'AIOS Lite CLI: v{version}',
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
    required_file: 'Required file: {rel}',
    context_generated: 'Main context generated',
    context_hint: 'Run @setup to generate .aios-lite/context/project.context.md',
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
    context_project_type_value_hint: 'Use web_app, api, site, or script exactly.',
    context_profile_value: '`profile` must be one of {expected}',
    context_profile_value_hint: 'Use developer, beginner, or team exactly.',
    context_conversation_language_format: '`conversation_language` is not a valid BCP-47 tag',
    context_conversation_language_format_hint: 'Use values like en, en-US, pt-BR.',
    node_version: 'Node.js >= 18 (current: {version})'
  },
  i18n_add: {
    usage_error: 'Usage: aios-lite i18n:add <locale> [--force] [--dry-run] [--locale=en]',
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
    list_title: 'Available agents:',
    path: 'Path',
    depends: 'Depends on',
    output: 'Output',
    none: 'none',
    prompt_usage_error: 'Usage: aios-lite agent:prompt <agent> [--tool=codex|claude|gemini|opencode] [--locale=en]',
    prompt_unknown_agent: 'Unknown agent: {agent}',
    prompt_title: 'Prompt for agent "{agent}" on tool "{tool}":'
  },
  context_validate: {
    missing_file: 'Context file not found: {path}',
    hint_setup: 'Run @setup to generate the file first.',
    invalid_frontmatter: 'Context file has invalid YAML frontmatter.',
    file_path: 'Context file: {path}',
    parse_reason: 'Parse reason: {reason}',
    hint_fix_frontmatter: 'Use @setup to regenerate a valid context file.',
    invalid_fields: 'Context file is parsed but has validation issues:',
    valid: 'Context file is valid.'
  },
  setup_context: {
    detected: 'Detected framework: {framework} (installed={installed})',
    q_project_name: 'Project name',
    q_project_type: 'Project type (web_app|api|site|script)',
    q_profile: 'Profile (developer|beginner|team)',
    q_framework: 'Framework',
    q_framework_installed: 'Framework installed? (true/false)',
    q_language: 'Conversation language (for example en or pt-BR)',
    q_user_types: 'How many user types?',
    q_integrations: 'How many external integrations?',
    q_rules_complexity: 'Rules complexity (none|some|complex)',
    written: 'Context file written: {path}',
    classification_result: 'Classification: {classification} (score={score}/6)'
  }
};
