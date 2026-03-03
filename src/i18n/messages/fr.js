'use strict';

module.exports = {
  cli: {
    title: 'AIOS Lite CLI',
    title_line: '{title}\n',
    usage: 'Utilisation :',
    help_item_line: '  {text}',
    help_init:
      'aios-lite init <project-name> [--force] [--dry-run] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode] [--locale=fr]',
    help_install:
      'aios-lite install [path] [--force] [--dry-run] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode] [--locale=fr]',
    help_update:
      'aios-lite update [path] [--dry-run] [--lang=en|pt-BR|es|fr] [--locale=fr]',
    help_info: 'aios-lite info [path] [--json] [--locale=fr]',
    help_doctor: 'aios-lite doctor [path] [--fix] [--dry-run] [--json] [--locale=fr]',
    help_i18n_add: 'aios-lite i18n:add <locale> [--force] [--dry-run] [--locale=fr]',
    help_agents: 'aios-lite agents [path] [--lang=en|pt-BR|es|fr] [--locale=fr]',
    help_agent_prompt:
      'aios-lite agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=fr]',
    help_context_validate: 'aios-lite context:validate [path] [--json] [--locale=fr]',
    help_setup_context:
      'aios-lite setup:context [path] [--defaults] [--project-type=web_app|api|site|script|dapp] [--framework=<name>] [--backend=<name>] [--frontend=<name>] [--database=<name>] [--auth=<name>] [--uiux=<name>] [--language=fr] [--web3-enabled=true|false] [--locale=fr]',
    help_locale_apply: 'aios-lite locale:apply [path] [--lang=en|pt-BR|es|fr] [--dry-run] [--locale=fr]',
    help_test_agents: 'aios-lite test:agents [--json] [--locale=en]',
    help_test_smoke:
      'aios-lite test:smoke [workspace-path] [--lang=en|pt-BR|es|fr] [--web3=ethereum|solana|cardano] [--profile=standard|mixed|parallel] [--keep] [--json] [--locale=fr]',
    help_test_package:
      'aios-lite test:package [source-path] [--keep] [--dry-run] [--json] [--locale=fr]',
    help_workflow_plan:
      'aios-lite workflow:plan [path] [--classification=MICRO|SMALL|MEDIUM] [--json] [--locale=fr]',
    help_parallel_init:
      'aios-lite parallel:init [path] [--workers=2..6] [--force] [--dry-run] [--json] [--locale=fr]',
    help_parallel_doctor:
      'aios-lite parallel:doctor [path] [--workers=2..6] [--fix] [--force] [--dry-run] [--json] [--locale=fr]',
    help_parallel_assign:
      'aios-lite parallel:assign [path] [--source=auto|prd|architecture|discovery|<file>] [--workers=2..6] [--force] [--dry-run] [--json] [--locale=fr]',
    help_parallel_status:
      'aios-lite parallel:status [path] [--json] [--locale=fr]',
    help_mcp_init:
      'aios-lite mcp:init [path] [--tool=claude|codex|gemini|opencode] [--dry-run] [--json] [--locale=fr]',
    help_mcp_doctor:
      'aios-lite mcp:doctor [path] [--strict-env] [--json] [--locale=fr]',
    unknown_command: 'Commande inconnue : {command}',
    unknown_command_line: '{message}\n',
    error_prefix: 'Erreur : {message}'
  },
  init: {
    usage_error:
      'Utilisation : aios-lite init <project-name> [--force] [--dry-run] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode] [--locale=fr]',
    non_empty_dir: 'Le repertoire n est pas vide : {targetDir}. Utilisez --force pour continuer.',
    created_at: 'Projet cree dans : {targetDir}',
    files_copied: 'Fichiers copies : {count}',
    files_skipped: 'Fichiers ignores : {count}',
    next_steps: 'Etapes suivantes :',
    step_cd: '1. cd {projectName}',
    step_setup: '2. Ouvrez dans votre AI CLI et executez @setup',
    step_agents: '3. Si aucun selecteur visuel n apparait, lancez : aios-lite agents',
    step_agent_prompt:
      '4. Generez le prompt setup pour votre outil : aios-lite agent:prompt setup --tool={tool}'
  },
  install: {
    framework_detected: 'Framework detecte : {framework} ({evidence})',
    framework_not_detected: 'Aucun framework detecte. Installation en mode generique.',
    done_at: 'Installation terminee dans : {targetDir}',
    files_copied: 'Fichiers copies : {count}',
    files_skipped: 'Fichiers ignores : {count}',
    next_steps: 'Etapes suivantes :',
    step_setup_context: '1. Generez/mettez a jour le contexte projet : aios-lite setup:context --defaults',
    step_agents: '2. Si aucun selecteur visuel n apparait, lancez : aios-lite agents',
    step_agent_prompt:
      '3. Generez le prompt setup pour votre outil : aios-lite agent:prompt setup --tool={tool}'
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
    check_line: '[{icon}] {message}',
    hint_line: '  Astuce : {hint}',
    fix_action_line: '- Action : {action}',
    detail_line: '  Detail : {text}',
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
    gateway_claude_pointer: 'La passerelle CLAUDE reference les fichiers partages AIOS Lite',
    gateway_claude_pointer_hint:
      'Assurez-vous que CLAUDE.md reference .aios-lite/config.md et .aios-lite/agents/setup.md.',
    gateway_codex_pointer: 'La passerelle Codex reference les fichiers partages AIOS Lite',
    gateway_codex_pointer_hint:
      'Assurez-vous que AGENTS.md reference .aios-lite/config.md et .aios-lite/agents/.',
    gateway_gemini_pointer: 'La passerelle Gemini reference les chemins partages commandes et agents',
    gateway_gemini_pointer_hint:
      'Assurez-vous que .gemini/GEMINI.md reference .gemini/commands/ et .aios-lite/agents/.',
    gateway_gemini_command_pointer:
      'Le fichier de commande Gemini pointe vers l agent partage : {file}',
    gateway_gemini_command_pointer_hint:
      'Assurez-vous que {file} inclut instruction_file = ".aios-lite/agents/{agent}.md".',
    gateway_opencode_pointer: 'La passerelle OpenCode reference les fichiers partages AIOS Lite',
    gateway_opencode_pointer_hint:
      'Assurez-vous que OPENCODE.md reference .aios-lite/config.md et .aios-lite/agents/.',
    fix_start: 'Mode de correction sure active.',
    fix_start_dry_run: 'Mode de correction sure active (dry-run).',
    fix_action_required_files: 'Restaurer les fichiers geres manquants depuis le template',
    fix_action_gateway_contracts:
      'Restaurer les fichiers de contrat de passerelle casses depuis le template',
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
    agent_line: '- Agent : {command} ({id})',
    path_line: '  Chemin : {path}',
    active_path_line: '  Chemin actif : {path}',
    depends_line: '  Depend de : {value}',
    output_line: '  Sortie : {value}',
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
    parse_reason_unknown: 'inconnu',
    parse_reason_missing_frontmatter: 'delimiteur de frontmatter initial manquant',
    parse_reason_unclosed_frontmatter: 'bloc de frontmatter non ferme',
    parse_reason_invalid_frontmatter_line: 'syntaxe invalide sur une ligne de frontmatter',
    parse_reason: 'Raison du parse : {reason}',
    hint_fix_frontmatter: 'Utilisez @setup pour regenerer un fichier de contexte valide.',
    invalid_fields: 'Le fichier de contexte est parse mais comporte des problemes de validation :',
    issue_line: '- {issue}',
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
    note_status_enabled: 'active',
    note_status_disabled: 'desactive',
    note_jetstream_teams: 'Jetstream teams : {status}',
    note_selected_services: 'Services selectionnes : {services}',
    note_rails_setup_flags: 'Flags de setup Rails : {flags}',
    note_next_setup_flags: 'Flags de setup Next.js : {flags}',
    note_next_create_flags: 'Flags create-next-app : {flags}',
    note_jetstream_existing_action:
      'Action pour projet existant avec Jetstream : {action}',
    note_mobile_first:
      'Besoin mobile-first detecte ; envisagez React Native/Expo en etape suivante.',
    note_vps_preference:
      'Preference VPS detectee ; gardez des scripts de deploiement simples et reproductibles.',
    note_cloud_profile:
      'Profil cloud detecte ; utilisez base geree et object storage des le depart.',
    note_web3_terms:
      'Termes Web3 detectes ; recommandation initiale dApp appliquee.',
    note_starter_profile:
      'Cette recommandation est un profil de depart ; ajustez-la quand les besoins seront plus clairs.',
    note_team_profile:
      'Profil equipe selectionne ; preservez des conventions d equipe explicites et des regles CI.',
    note_beginner_declined:
      'Recommandation initiale refusee ; utilisation d une stack personnalisee issue de l onboarding.',
    note_monorepo:
      'Monorepo detecte : framework Web3 et framework applicatif coexistent. Confirmer le framework principal avec l utilisateur et documenter la structure dans Notes.',
    written: 'Fichier contexte ecrit : {path}',
    classification_result: 'Classification : {classification} (score={score}/6)',
    locale_applied: 'Pack d agents localise applique : {locale} ({count} fichiers)'
  },
  locale_apply: {
    applied: 'Pack locale applique : {locale}',
    dry_run_applied: '[dry-run] Le pack locale serait applique : {locale}',
    copied_count: 'Fichiers copies : {count}',
    missing_count: 'Fichiers locale manquants : {count}',
    copy_line: '  Fichier : {source} -> {target}'
  },
  smoke: {
    start: 'Execution du smoke test dans : {projectDir}',
    using_web3_profile: 'Utilisation du profil smoke Web3 : {target}',
    using_mixed_profile: 'Utilisation du profil monorepo mixte Web2+Web3.',
    using_parallel_profile: 'Utilisation du profil smoke d orchestration parallele.',
    seeded_web3_workspace: 'Workspace initialise pour la cible Web3 : {target}',
    seeded_mixed_workspace: 'Workspace initialise pour le profil mixte Web2+Web3.',
    seeded_parallel_context: 'Contexte discovery/architecture/prd initialise pour le profil parallele.',
    step_ok: 'OK : {step}',
    web3_detected: 'Framework Web3 detecte : {framework} ({network})',
    web3_context_verified: 'Contexte Web3 verifie pour le reseau : {network}',
    mixed_context_verified: 'Contexte du profil mixte verifie (framework : {framework}).',
    parallel_status_verified: 'Statut parallele verifie pour les lanes : {count}',
    invalid_web3_target: 'Valeur --web3 invalide : {target}. Utilisez ethereum, solana ou cardano.',
    invalid_profile:
      'Valeur --profile invalide : {profile}. Utilisez standard, mixed ou parallel.',
    profile_conflict: 'Ne combinez pas --profile=mixed avec --web3. Choisissez un seul mode.',
    assert_install_files: 'install a copie zero fichier',
    assert_web3_framework: 'detection inattendue du framework web3 : {framework}',
    assert_setup_written: 'setup:context n a pas ecrit le fichier de contexte',
    assert_setup_project_type_dapp: 'setup n a pas infere project_type=dapp',
    assert_setup_web3_network: 'setup n a pas infere le reseau web3 attendu',
    assert_setup_web3_framework: 'setup n a pas conserve le framework web3 attendu',
    assert_mixed_project_type_dapp: 'le profil mixed n a pas infere project_type=dapp',
    assert_mixed_web3_enabled: 'le profil mixed n a pas infere web3_enabled=true',
    assert_mixed_framework: 'le profil mixed n a pas privilegie le framework web3 attendu',
    assert_locale_apply_files: 'locale:apply a copie zero fichier',
    assert_agents_count: 'la commande agents a retourne un nombre inattendu',
    assert_prompt_path: 'agent:prompt n a pas inclus le chemin attendu',
    assert_context_validate: 'context:validate a echoue',
    assert_web3_context_valid: 'echec du parse du contexte web3',
    assert_web3_context_project_type: 'project_type du contexte n est pas dapp',
    assert_web3_context_enabled: 'web3_enabled du contexte n est pas true',
    assert_web3_context_network:
      'web3_networks du contexte n inclut pas la cible attendue',
    assert_doctor_ok: 'la verification doctor a echoue',
    assert_parallel_init_ok: 'parallel:init a echoue',
    assert_parallel_init_workers: 'les workers de parallel:init ne correspondent pas',
    assert_parallel_assign_ok: 'parallel:assign a echoue',
    assert_parallel_assign_scope: 'parallel:assign n a produit aucun scope',
    assert_parallel_status_ok: 'parallel:status a echoue',
    assert_parallel_status_lanes: 'le nombre de lanes dans parallel:status ne correspond pas',
    assert_parallel_doctor_ok: 'parallel:doctor a echoue',
    assert_parallel_doctor_summary: 'parallel:doctor a signale des echecs',
    completed: 'Smoke test termine avec succes.',
    steps_count: 'Etapes validees : {count}',
    workspace_kept: 'Workspace conserve : {path}',
    workspace_removed: 'Workspace supprime : {path}'
  },
  package_test: {
    start: 'Execution du test package depuis la source : {sourceDir}',
    pack_done: 'Tarball package cree : {tarball}',
    completed: 'Test package termine avec {count} etapes validees.',
    workspace: 'Workspace du test package : {path}',
    error_unknown_detail: 'erreur inconnue',
    error_npm_pack: 'npm pack a echoue : {detail}',
    error_tarball_missing: 'npm pack n a pas retourne le nom du tarball',
    error_npx_init: 'npx init a echoue : {detail}',
    error_npx_setup_context: 'npx setup:context a echoue : {detail}',
    error_npx_doctor: 'npx doctor a echoue : {detail}',
    error_doctor_not_ok: 'doctor a retourne ok=false pendant le test package',
    error_npx_mcp_init: 'npx mcp:init a echoue : {detail}',
    error_mcp_not_ok: 'mcp:init a retourne ok=false pendant le test package'
  },
  workflow_plan: {
    context_missing:
      'Fichier contexte introuvable. Utilisation du workflow de secours selon la classification fournie/par defaut.',
    title: 'Workflow recommande pour la classification {classification} :',
    notes: 'Notes :',
    command_line: '  Commande : {command}',
    note_line: '  Note : {note}',
    note_framework_not_installed:
      'Le framework n est pas encore installe ; terminez l installation du stack avant @dev.',
    note_dapp_context:
      'Contexte dApp detecte ; incluez les skills Web3 pendant @architect et @dev.',
    note_micro_scope:
      'Gardez un scope d implementation minimal et evitez les agents optionnels.'
  },
  parallel_init: {
    context_missing:
      'Fichier de contexte introuvable : {path}. Executez setup:context avant.',
    context_invalid: 'Fichier de contexte invalide ou non parseable : {path}.',
    classification_unknown: 'inconnue',
    requires_medium:
      'L initialisation parallele est prise en charge uniquement pour la classification MEDIUM (actuelle : {classification}). Utilisez --force pour forcer.',
    invalid_workers:
      'Valeur --workers invalide. Utilisez un entier entre {min} et {max}.',
    already_exists:
      'Les fichiers de contexte parallele existent deja ({count}). Utilisez --force pour ecraser.',
    prepared: 'Workspace parallele initialise dans : {path}',
    dry_run_prepared: '[dry-run] Le workspace parallele serait initialise dans : {path}',
    workers_count: 'Workers : {count}',
    files_count: 'Fichiers prepares : {count}',
    missing_prereq_count: 'Fichiers de contexte prerequis manquants : {count}',
    file_line: '  Fichier : {file}'
  },
  parallel_doctor: {
    prefix_ok: 'OK',
    prefix_warn: 'AVERT',
    prefix_fail: 'ECHEC',
    check_line: '[{prefix}] {id} - {message}',
    hint_line: '  Astuce : {hint}',
    invalid_workers:
      'Valeur --workers invalide. Utilisez un entier entre {min} et {max}.',
    classification_unknown: 'inconnue',
    requires_medium:
      'Le mode fix de parallel doctor exige la classification MEDIUM (actuelle : {classification}). Utilisez --force pour forcer.',
    report_title: 'Rapport parallel doctor : {path}',
    summary: 'Resume : {passed} valides, {failed} echecs, {warnings} avertissements.',
    fix_summary: 'Corrections paralleles appliquees : {count}',
    fix_summary_dry_run: '[dry-run] Corrections paralleles planifiees : {count}',
    check_context_exists_ok: 'project.context.md existe.',
    check_context_exists_missing: 'project.context.md est manquant.',
    check_context_exists_hint: 'Executez setup:context avant parallel doctor.',
    check_context_parsed_ok: 'project.context.md est parseable.',
    check_context_parsed_invalid: 'project.context.md est invalide.',
    check_context_parsed_hint:
      'Corrigez le frontmatter du contexte avant d executer parallel doctor.',
    check_context_classification_ok:
      'Mode parallele autorise pour la classification {classification}.',
    check_context_classification_invalid:
      'Mode parallele exige la classification MEDIUM (actuelle : {classification}).',
    check_context_classification_hint:
      'Utilisez --force pour outrepasser la regle de classification.',
    check_parallel_dir_ok: 'Le repertoire .aios-lite/context/parallel existe.',
    check_parallel_dir_missing: 'Le repertoire .aios-lite/context/parallel est manquant.',
    check_parallel_dir_hint: 'Executez parallel:init ou parallel:doctor --fix.',
    check_parallel_shared_ok: 'shared-decisions.md est present.',
    check_parallel_shared_missing: 'shared-decisions.md est manquant.',
    check_parallel_shared_hint:
      'Executez parallel:doctor --fix pour restaurer les fichiers de base.',
    check_lanes_present_ok: '{count} fichier(s) de lane detecte(s).',
    check_lanes_present_missing: 'Aucun fichier de statut de lane n a ete trouve.',
    check_lanes_present_hint: 'Executez parallel:init ou parallel:doctor --fix.',
    check_lanes_sequence_ok: 'La sequence de lanes est continue (1..{workers}).',
    check_lanes_sequence_missing: 'Fichiers de lane manquants dans la sequence : {lanes}',
    check_lanes_sequence_hint:
      'Executez parallel:doctor --fix pour restaurer les lanes manquantes.',
    check_workers_option: 'Option workers demandee : {workers}.',
    check_prereq_ok: 'Tous les fichiers de contexte prerequis sont presents.',
    check_prereq_missing: '{count} fichier(s) de contexte prerequis manquant(s).',
    check_prereq_hint:
      'Creez les fichiers discovery/architecture/prd avant l orchestration.'
  },
  parallel_assign: {
    invalid_workers:
      'Valeur --workers invalide. Utilisez un entier entre {min} et {max}.',
    context_missing: 'Fichier de contexte introuvable : {path}.',
    context_invalid: 'Fichier de contexte invalide ou non parseable : {path}.',
    classification_unknown: 'inconnue',
    requires_medium:
      'L attribution parallele exige la classification MEDIUM (actuelle : {classification}). Utilisez --force pour forcer.',
    parallel_missing:
      'Repertoire parallele introuvable : {path}. Executez parallel:init avant.',
    no_lanes: 'Aucun fichier de lane trouve dans .aios-lite/context/parallel.',
    missing_lanes: 'Fichiers de lane manquants pour les workers demandes : {lanes}.',
    source_missing: 'Impossible de resoudre le document source avec --source={source}.',
    applied: 'Attribution de scope parallele appliquee ({count} element(s) de scope).',
    dry_run_applied:
      '[dry-run] Attribution de scope parallele planifiee ({count} element(s) de scope).',
    source_info: 'Document source : {source}',
    workers_count: 'Workers : {count}',
    files_count: 'Fichiers mis a jour : {count}',
    lane_scope_line: '- lane {lane} : {count} element(s) de scope'
  },
  parallel_status: {
    parallel_missing:
      'Repertoire parallele introuvable : {path}. Executez parallel:init avant.',
    no_lanes: 'Aucun fichier de lane trouve dans .aios-lite/context/parallel.',
    title: 'Rapport de statut parallele : {path}',
    lanes_count: 'Lanes : {count}',
    statuses_title: 'Statuts :',
    status_line: '- {status} : {count}',
    status_pending: 'en_attente',
    status_in_progress: 'en_cours',
    status_completed: 'termine',
    status_blocked: 'bloque',
    status_other: 'autre',
    scopes_count: 'Total des elements de scope : {count}',
    deliverables_progress: 'Livrables : {completed}/{total} termines',
    blockers_count: 'Blocages ouverts : {count}',
    shared_decisions: 'Entrees du journal de decisions partagees : {count}',
    lane_line: '- lane {lane} : status={status}, scope={scope}, blocages={blockers}'
  },
  mcp_init: {
    context_missing:
      'Fichier contexte introuvable. Generation d un plan MCP de base avec hypotheses generiques.',
    invalid_tool: 'Valeur --tool invalide : {tool}. Utilisez une de ces valeurs : {expected}.',
    reason_filesystem: 'Acces local obligatoire au workspace.',
    reason_context7:
      'Utilisez une documentation officielle a jour au moment de l implementation.',
    reason_database_none: 'Aucun stack de base de donnees detecte pour le moment.',
    reason_database_enabled:
      'Le contexte indique des fonctionnalites avec base de donnees (endpoint MCP distant recommande).',
    reason_web_search:
      'Utile pour evaluer les packages et verifier les notes de version.',
    reason_chain_rpc_disabled: 'Web3 est desactive pour ce projet.',
    reason_chain_rpc_enabled: 'Contexte dApp detecte ; acces RPC de chain requis.',
    reason_makopy: 'Integration optionnelle de pipeline de contenu.',
    note_workspace_local: 'Ceci est un preset local de workspace genere par AIOS Lite.',
    note_replace_placeholders:
      'Remplacez les commandes placeholder par les serveurs MCP que vous utilisez.',
    note_keep_secrets_env:
      'Gardez les secrets dans des variables d environnement, jamais inline tokens.',
    generated: 'Plan MCP ecrit : {path}',
    dry_run_generated: '[dry-run] Le plan MCP serait ecrit : {path}',
    server_count: 'Serveurs MCP dans le plan : {count}',
    preset_count: 'Presets outils generes : {count}',
    preset_written: 'Preset ecrit ({tool}) : {path}',
    preset_dry_run: '[dry-run] Le preset serait ecrit ({tool}) : {path}'
  },
  mcp_doctor: {
    prefix_ok: 'OK',
    prefix_warn: 'AVERT',
    prefix_fail: 'ECHEC',
    check_line: '[{prefix}] {id} - {message}',
    hint_line: '  Astuce : {hint}',
    context_missing: 'project.context.md introuvable.',
    context_missing_hint: 'Executez setup d abord pour une validation MCP basee sur le contexte.',
    context_parse_invalid: 'project.context.md n a pas pu etre parse ({reason}).',
    context_parse_invalid_hint:
      'Corrigez le format du contexte pour activer la validation MCP selon le stack.',
    context_ok: 'project.context.md est disponible et parseable.',
    plan_missing: 'Fichier de plan MCP introuvable (.aios-lite/mcp/servers.local.json).',
    plan_missing_hint: 'Executez : aios-lite mcp:init',
    plan_invalid: 'JSON du plan MCP invalide : {error}',
    plan_invalid_hint: 'Regenerez le plan avec : aios-lite mcp:init',
    plan_ok: 'Le fichier de plan MCP est present et JSON valide.',
    plan_servers_ok: 'Le plan MCP declare {count} definition(s) de serveur.',
    plan_servers_missing: 'Le plan MCP ne contient aucune definition de serveur.',
    plan_servers_hint: 'Regenerez avec : aios-lite mcp:init',
    core_enabled: 'Le serveur MCP core "{server}" est active.',
    core_missing: 'Le serveur MCP core "{server}" est absent ou desactive.',
    core_missing_hint: 'Regenerez et gardez les serveurs core de base actives.',
    presets_any_ok: '{count} fichier(s) de preset MCP trouve(s).',
    presets_any_missing: 'Aucun fichier de preset MCP trouve.',
    presets_any_hint: 'Executez : aios-lite mcp:init',
    presets_coverage_partial:
      'Seulement {existing}/{total} presets outils sont presents.',
    presets_coverage_partial_hint:
      'Executez : aios-lite mcp:init (sans --tool) pour generer tous les presets.',
    presets_coverage_full:
      'Tous les presets outils sont presents (claude, codex, gemini, opencode).',
    env_none_required:
      'Aucune variable d environnement requise dans les serveurs MCP actives.',
    env_missing:
      '{missing}/{total} variable(s) d environnement requise(s) manquante(s) : {vars}',
    env_missing_hint_strict: 'Definissez les variables manquantes avant execution.',
    env_missing_hint_relaxed:
      'Definissez les variables pour une disponibilite runtime complete. Utilisez --strict-env pour echouer sur ce controle.',
    env_all_present: 'Toutes les variables requises sont disponibles ({count}).',
    compat_database_ok:
      'Database MCP correspond au moteur de stack du contexte ({engine}).',
    compat_database_mismatch:
      'Database MCP ne correspond pas completement au stack du contexte ({engine}).',
    compat_database_hint:
      'Regenerez avec : aios-lite mcp:init, ou ajustez manuellement le serveur database.',
    compat_web3_ok: 'MCP chain-rpc est active pour le contexte Web3.',
    compat_web3_missing:
      'Contexte Web3 detecte, mais chain-rpc MCP est absent ou desactive.',
    compat_web3_missing_hint: 'Regenerez avec : aios-lite mcp:init',
    compat_web3_unneeded: 'chain-rpc MCP est active, mais le contexte n est pas Web3.',
    compat_web3_unneeded_hint: 'Desactivez chain-rpc si non necessaire.',
    report_title: 'Rapport MCP doctor : {path}',
    summary: 'Resume : {passed} valides, {failed} echecs, {warnings} avertissements.'
  }
};
