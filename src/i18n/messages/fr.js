'use strict';

module.exports = {
  cli: {
    title: 'AIOS Lite CLI',
    usage: 'Utilisation :',
    help_init: 'aios-lite init <project-name> [--force] [--dry-run] [--locale=fr]',
    help_install: 'aios-lite install [path] [--force] [--dry-run] [--locale=fr]',
    help_update: 'aios-lite update [path] [--dry-run] [--locale=fr]',
    help_info: 'aios-lite info [path] [--json] [--locale=fr]',
    help_doctor: 'aios-lite doctor [path] [--fix] [--dry-run] [--json] [--locale=fr]',
    help_i18n_add: 'aios-lite i18n:add <locale> [--force] [--dry-run] [--locale=fr]',
    help_agents: 'aios-lite agents [path] [--lang=en|pt-BR|es|fr] [--locale=fr]',
    help_agent_prompt:
      'aios-lite agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=fr]',
    help_context_validate: 'aios-lite context:validate [path] [--json] [--locale=fr]',
    help_setup_context:
      'aios-lite setup:context [path] [--defaults] [--project-type=web_app|api|site|script|dapp] [--language=fr] [--web3-enabled=true|false] [--locale=fr]',
    help_locale_apply: 'aios-lite locale:apply [path] [--lang=en|pt-BR|es|fr] [--dry-run] [--locale=fr]',
    help_test_smoke:
      'aios-lite test:smoke [workspace-path] [--lang=en|pt-BR|es|fr] [--web3=ethereum|solana|cardano] [--profile=standard|mixed] [--keep] [--json] [--locale=fr]',
    help_test_package:
      'aios-lite test:package [source-path] [--keep] [--dry-run] [--json] [--locale=fr]',
    help_workflow_plan:
      'aios-lite workflow:plan [path] [--classification=MICRO|SMALL|MEDIUM] [--json] [--locale=fr]',
    help_mcp_init:
      'aios-lite mcp:init [path] [--tool=claude|codex|gemini|opencode] [--dry-run] [--json] [--locale=fr]',
    help_mcp_doctor:
      'aios-lite mcp:doctor [path] [--strict-env] [--json] [--locale=fr]',
    unknown_command: 'Commande inconnue : {command}',
    error_prefix: 'Erreur : {message}'
  },
  init: {
    usage_error: 'Utilisation : aios-lite init <project-name> [--force] [--dry-run] [--locale=fr]',
    non_empty_dir: 'Le repertoire n est pas vide : {targetDir}. Utilisez --force pour continuer.',
    created_at: 'Projet cree dans : {targetDir}',
    files_copied: 'Fichiers copies : {count}',
    files_skipped: 'Fichiers ignores : {count}',
    next_steps: 'Etapes suivantes :',
    step_cd: '1. cd {projectName}',
    step_setup: '2. Ouvrez dans votre AI CLI et executez @setup'
  },
  install: {
    framework_detected: 'Framework detecte : {framework} ({evidence})',
    framework_not_detected: 'Aucun framework detecte. Installation en mode generique.',
    done_at: 'Installation terminee dans : {targetDir}',
    files_copied: 'Fichiers copies : {count}',
    files_skipped: 'Fichiers ignores : {count}'
  },
  update: {
    not_installed: 'Aucune installation AIOS Lite trouvee dans {targetDir}.',
    done_at: 'Mise a jour terminee dans : {targetDir}',
    files_updated: 'Fichiers mis a jour : {count}',
    backups_created: 'Sauvegardes creees : {count}'
  },
  info: {
    cli_version: 'AIOS Lite CLI : v{version}',
    directory: 'Repertoire : {targetDir}',
    installed_here: 'Installe dans ce repertoire : {value}',
    framework_detected: 'Framework detecte : {framework}',
    evidence: 'Preuve : {evidence}',
    yes: 'oui',
    no: 'non',
    none: 'aucun'
  },
  doctor: {
    ok: 'OK',
    fail: 'ECHEC',
    diagnosis_ok: 'Diagnostic : installation saine.',
    diagnosis_fail: 'Diagnostic : {count} probleme(s) detecte(s).',
    hint_prefix: '-> {hint}',
    required_file: 'Fichier requis : {rel}',
    context_generated: 'Contexte principal genere',
    context_hint: 'Executez @setup pour generer .aios-lite/context/project.context.md',
    context_frontmatter_valid: 'Le frontmatter du contexte est valide',
    context_frontmatter_valid_hint:
      'Assurez-vous que project.context.md commence par un frontmatter YAML delimite par ---',
    context_frontmatter_invalid: 'Le frontmatter du contexte est invalide ({reason})',
    context_frontmatter_invalid_hint:
      'Reecrivez project.context.md avec le format de sortie de @setup.',
    context_required_field: 'Champ de contexte requis manquant : {field}',
    context_required_field_hint:
      'Relancez @setup et confirmez que tous les champs requis sont presents.',
    context_framework_installed_type: '`framework_installed` doit etre booleen (true/false)',
    context_framework_installed_type_hint:
      'Definissez framework_installed a true ou false sans guillemets.',
    context_classification_value: '`classification` doit etre une des valeurs {expected}',
    context_classification_value_hint: 'Utilisez MICRO, SMALL ou MEDIUM exactement.',
    context_project_type_value: '`project_type` doit etre une des valeurs {expected}',
    context_project_type_value_hint: 'Utilisez web_app, api, site, script ou dapp exactement.',
    context_profile_value: '`profile` doit etre une des valeurs {expected}',
    context_profile_value_hint: 'Utilisez developer, beginner ou team exactement.',
    context_conversation_language_format: '`conversation_language` n est pas une balise BCP-47 valide',
    context_conversation_language_format_hint: 'Utilisez des valeurs comme en, en-US, pt-BR.',
    node_version: 'Node.js >= 18 (actuel : {version})',
    fix_start: 'Mode de correction sure active.',
    fix_start_dry_run: 'Mode de correction sure active (dry-run).',
    fix_action_required_files: 'Restaurer les fichiers geres manquants depuis le template',
    fix_action_locale_sync: 'Synchroniser les prompts actifs des agents avec la langue du contexte',
    fix_not_applicable: 'Non applicable pour l etat actuel.',
    fix_target_count: 'Cibles identifiees : {count}',
    fix_applied_count: 'Modifications appliquees : {count}',
    fix_planned_count: 'Modifications planifiees : {count}',
    fix_locale: 'Locale resolu : {locale}',
    fix_summary: 'Modifications de correction sure appliquees : {count}',
    fix_summary_dry_run: '[dry-run] Modifications de correction sure planifiees : {count}'
  },
  i18n_add: {
    usage_error: 'Utilisation : aios-lite i18n:add <locale> [--force] [--dry-run] [--locale=fr]',
    invalid_locale: 'Code locale invalide : {locale}. Formats attendus comme en, fr, pt-br.',
    base_locale: 'Le locale "en" est le dictionnaire de base et ne peut pas etre genere.',
    locale_exists: 'Le fichier locale existe deja : {path}. Utilisez --force pour ecraser.',
    dry_run_created: '[dry-run] Le scaffold locale serait cree : {locale}',
    dry_run_overwritten: '[dry-run] Le scaffold locale serait ecrase : {locale}',
    created: 'Scaffold locale cree : {locale}',
    overwritten: 'Scaffold locale ecrase : {locale}',
    file_path: 'Fichier locale : {path}',
    next_steps: 'Etapes suivantes :',
    step_translate: '1. Remplacez les chaines anglaises par du texte traduit dans ce fichier.',
    step_try: '2. Lancez la CLI avec --locale={locale} pour valider le nouveau dictionnaire.'
  },
  agents: {
    list_title: 'Agents disponibles (locale resolu : {locale}) :',
    path: 'Chemin',
    active_path: 'Chemin actif',
    depends: 'Depend de',
    output: 'Sortie',
    none: 'aucun',
    prompt_usage_error:
      'Utilisation : aios-lite agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=fr]',
    prompt_unknown_agent: 'Agent inconnu : {agent}',
    prompt_title: 'Prompt pour l agent "{agent}" sur l outil "{tool}" (locale : {locale}) :'
  },
  context_validate: {
    missing_file: 'Fichier de contexte introuvable : {path}',
    hint_setup: 'Executez @setup pour generer le fichier.',
    invalid_frontmatter: 'Le fichier de contexte contient un frontmatter YAML invalide.',
    file_path: 'Fichier de contexte : {path}',
    parse_reason: 'Raison du parse : {reason}',
    hint_fix_frontmatter: 'Utilisez @setup pour regenerer un fichier de contexte valide.',
    invalid_fields: 'Le fichier de contexte est parse mais comporte des problemes de validation :',
    valid: 'Le fichier de contexte est valide.'
  },
  setup_context: {
    detected: 'Framework detecte : {framework} (installed={installed})',
    q_project_name: 'Nom du projet',
    q_project_type: 'Type de projet (web_app|api|site|script|dapp)',
    q_profile: 'Profil : [1] developer [2] beginner [3] team',
    q_use_detected_framework: 'Utiliser le framework detecte ? (true/false)',
    q_framework: 'Framework',
    q_framework_installed: 'Framework installe ? (true/false)',
    q_language: 'Langue de conversation (par exemple en ou pt-BR)',
    q_backend_menu:
      'Backend: [1] Laravel [2] Rails [3] Django [4] Node/Express [5] Next.js [6] Nuxt [7] Hardhat [8] Foundry [9] Truffle [10] Anchor [11] Solana Web3 [12] Cardano [13] Other',
    q_backend_text: 'Backend (texte libre)',
    q_laravel_version: 'Version Laravel (par exemple 11, 10)',
    q_frontend_menu:
      'Frontend: [1] TALL Stack [2] VILT Stack [3] Blade [4] Next.js [5] Nuxt [6] React [7] Vue [8] Other',
    q_frontend_text: 'Frontend (texte libre)',
    q_auth_menu:
      'Auth (Laravel): [1] Breeze [2] Jetstream + Livewire [3] Filament Shield [4] Custom',
    q_web3_enabled: 'Web3 active ? (true/false)',
    q_web3_networks: 'Reseaux Web3 (par exemple ethereum, solana, cardano)',
    q_contract_framework: 'Framework de contrats (par exemple Hardhat, Foundry, Anchor, Aiken)',
    q_wallet_provider: 'Fournisseur wallet (par exemple wagmi, RainbowKit, Phantom, Lace)',
    q_indexer: 'Indexer (par exemple The Graph, Helius, Blockfrost)',
    q_rpc_provider: 'Fournisseur RPC (par exemple Alchemy, Infura, QuickNode)',
    q_jetstream_teams: 'Jetstream teams active ? (true/false)',
    q_jetstream_existing_action:
      'Projet Laravel existant sans Jetstream detecte. Action : [1] continuer sans Jetstream [2] recreer avec Jetstream (recommande) [3] installation manuelle (risque)',
    q_auth_text: 'Approche d authentification (texte libre)',
    q_uiux_menu: 'UI/UX: [1] Tailwind [2] Flux UI [3] shadcn/ui [4] Filament',
    q_uiux_text: 'Approche UI/UX (texte libre)',
    q_database_menu:
      'Base de donnees: [1] MySQL [2] PostgreSQL [3] SQLite [4] MongoDB [5] Supabase [6] PlanetScale',
    q_database_text: 'Base de donnees (texte libre)',
    q_services_list:
      'Services additionnels (liste separee par virgules) : queues, storage, websockets, payments, email, cache, search',
    q_rails_options:
      'Options utilisees dans Rails (liste separee par virgules, ex. --database=postgresql,--css=tailwind,--api)',
    q_next_options:
      'Options create-next-app (liste separee par virgules, ex. TypeScript,ESLint,Tailwind CSS,App Router,src/ directory)',
    q_beginner_summary: 'Decrivez votre projet en une phrase',
    q_beginner_users:
      'Utilisateurs attendus : [1] personnel/petit jusqu a 10 [2] petite equipe jusqu a 100 [3] clients externes',
    q_beginner_mobile: 'Besoin mobile : [1] app mobile [2] web responsive [3] desktop uniquement',
    q_beginner_hosting: 'Preference d hebergement : [1] gere simple [2] VPS [3] cloud provider',
    q_beginner_accept_recommendation: 'Accepter la recommandation initiale ? (true/false)',
    beginner_recommendation:
      'Recommandation initiale -> framework: {framework}, frontend: {frontend}, database: {database}, auth: {auth}',
    q_user_types: 'Combien de types d utilisateurs ?',
    q_integrations: 'Combien d integrations externes ?',
    q_rules_complexity: 'Complexite des regles (none|some|complex)',
    written: 'Fichier contexte ecrit : {path}',
    classification_result: 'Classification : {classification} (score={score}/6)',
    locale_applied: 'Pack d agents localise applique : {locale} ({count} fichiers)'
  },
  locale_apply: {
    applied: 'Pack locale applique : {locale}',
    dry_run_applied: '[dry-run] Le pack locale serait applique : {locale}',
    copied_count: 'Fichiers copies : {count}',
    missing_count: 'Fichiers locale manquants : {count}'
  },
  smoke: {
    start: 'Execution du smoke test dans : {projectDir}',
    using_web3_profile: 'Utilisation du profil smoke Web3 : {target}',
    using_mixed_profile: 'Utilisation du profil monorepo mixte Web2+Web3.',
    seeded_web3_workspace: 'Workspace initialise pour la cible Web3 : {target}',
    seeded_mixed_workspace: 'Workspace initialise pour le profil mixte Web2+Web3.',
    step_ok: 'OK : {step}',
    web3_detected: 'Framework Web3 detecte : {framework} ({network})',
    web3_context_verified: 'Contexte Web3 verifie pour le reseau : {network}',
    mixed_context_verified: 'Contexte du profil mixte verifie (framework : {framework}).',
    invalid_web3_target: 'Valeur --web3 invalide : {target}. Utilisez ethereum, solana ou cardano.',
    invalid_profile: 'Valeur --profile invalide : {profile}. Utilisez standard ou mixed.',
    profile_conflict: 'Ne combinez pas --profile=mixed avec --web3. Choisissez un seul mode.',
    completed: 'Smoke test termine avec succes.',
    steps_count: 'Etapes validees : {count}',
    workspace_kept: 'Workspace conserve : {path}',
    workspace_removed: 'Workspace supprime : {path}'
  },
  package_test: {
    start: 'Execution du test package depuis la source : {sourceDir}',
    pack_done: 'Tarball package cree : {tarball}',
    completed: 'Test package termine avec {count} etapes validees.',
    workspace: 'Workspace du test package : {path}'
  },
  workflow_plan: {
    context_missing:
      'Fichier contexte introuvable. Utilisation du workflow de secours selon la classification fournie/par defaut.',
    title: 'Workflow recommande pour la classification {classification} :',
    notes: 'Notes :'
  },
  mcp_init: {
    context_missing:
      'Fichier contexte introuvable. Generation d un plan MCP de base avec hypotheses generiques.',
    generated: 'Plan MCP ecrit : {path}',
    dry_run_generated: '[dry-run] Le plan MCP serait ecrit : {path}',
    server_count: 'Serveurs MCP dans le plan : {count}',
    preset_count: 'Presets outils generes : {count}',
    preset_written: 'Preset ecrit ({tool}) : {path}',
    preset_dry_run: '[dry-run] Le preset serait ecrit ({tool}) : {path}'
  }
};
