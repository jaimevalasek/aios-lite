'use strict';

module.exports = {
  cli: {
    title: 'AIOSON CLI',
    title_line: '{title}\n',
    usage: 'Uso:',
    help_item_line: '  {text}',
    help_init:
      'aioson init <project-name> [--force] [--dry-run] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode] [--locale=es]',
    help_install:
      'aioson install [path] [--force] [--dry-run] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode] [--locale=es]',
    help_update:
      'aioson update [path] [--dry-run] [--lang=en|pt-BR|es|fr] [--locale=es]',
    help_info: 'aioson info [path] [--json] [--locale=es]',
    help_doctor: 'aioson doctor [path] [--fix] [--dry-run] [--json] [--locale=es]',
    help_i18n_add: 'aioson i18n:add <locale> [--force] [--dry-run] [--locale=es]',
    help_agents: 'aioson agents [path] [--lang=en|pt-BR|es|fr] [--locale=es]',
    help_agent_prompt:
      'aioson agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=es]',
    help_context_validate: 'aioson context:validate [path] [--json] [--locale=es]',
    help_setup_context:
      'aioson setup:context [path] [--defaults] [--project-type=web_app|api|site|script|dapp] [--framework=<name>] [--backend=<name>] [--frontend=<name>] [--database=<name>] [--auth=<name>] [--uiux=<name>] [--language=es] [--web3-enabled=true|false] [--locale=es]',
    help_locale_apply: 'aioson locale:apply [path] [--lang=en|pt-BR|es|fr] [--dry-run] [--locale=es]',
    help_locale_diff: 'aioson locale:diff [agent] [--lang=en|pt-BR|es|fr] [--json] [--locale=en]',
    help_test_agents: 'aioson test:agents [--json] [--locale=en]',
    help_test_smoke:
      'aioson test:smoke [workspace-path] [--lang=en|pt-BR|es|fr] [--web3=ethereum|solana|cardano] [--profile=standard|mixed|parallel] [--keep] [--json] [--locale=es]',
    help_test_package:
      'aioson test:package [source-path] [--keep] [--dry-run] [--json] [--locale=es]',
    help_workflow_plan:
      'aioson workflow:plan [path] [--classification=MICRO|SMALL|MEDIUM] [--json] [--locale=es]',
    help_parallel_init:
      'aioson parallel:init [path] [--workers=2..6] [--force] [--dry-run] [--json] [--locale=es]',
    help_parallel_doctor:
      'aioson parallel:doctor [path] [--workers=2..6] [--fix] [--force] [--dry-run] [--json] [--locale=es]',
    help_parallel_assign:
      'aioson parallel:assign [path] [--source=auto|prd|architecture|discovery|<file>] [--workers=2..6] [--force] [--dry-run] [--json] [--locale=es]',
    help_parallel_status:
      'aioson parallel:status [path] [--json] [--locale=es]',
    help_mcp_init:
      'aioson mcp:init [path] [--tool=claude|codex|gemini|opencode] [--dry-run] [--json] [--locale=es]',
    help_mcp_doctor:
      'aioson mcp:doctor [path] [--strict-env] [--json] [--locale=es]',
    help_qa_doctor:
      'aioson qa:doctor [path] [--json] [--locale=es]',
    help_qa_init:
      'aioson qa:init [path] [--url=<app-url>] [--dry-run] [--json] [--locale=es]',
    help_qa_run:
      'aioson qa:run [path] [--url=<app-url>] [--persona=naive|hacker|power|mobile] [--headed] [--html] [--json] [--locale=es]',
    help_qa_scan:
      'aioson qa:scan [path] [--url=<app-url>] [--depth=3] [--max-pages=50] [--headed] [--html] [--json] [--locale=es]',
    help_qa_report:
      'aioson qa:report [path] [--html] [--json] [--locale=es]',
    help_scan_project:
      'aioson scan:project [path] --folder=<ruta[,ruta2]> [--summary-mode=titles|summaries|raw] [--with-llm] [--provider=<name>] [--llm-model=<name>] [--dry-run] [--json] [--locale=es]',
    help_config:
      'aioson config <set KEY=value|show|get KEY> [--json] [--locale=es]',
    help_genome_doctor:
      'aioson genome:doctor <archivo> [--json] [--locale=es]',
    help_genome_migrate:
      'aioson genome:migrate <archivo-o-directorio> [--write] [--no-backup] [--json] [--locale=es]',
    help_squad_status:
      'aioson squad:status [path] [--json] [--locale=es]',
    help_squad_repair_genomes:
      'aioson squad:repair-genomes <manifest.json> [--write] [--no-backup] [--json] [--locale=es]',
    help_squad_validate:
      'aioson squad:validate [path] --squad=<slug> [--locale=es]',
    help_squad_export:
      'aioson squad:export [path] --squad=<slug> [--locale=es]',
    help_squad_pipeline:
      'aioson squad:pipeline [path] [--sub=list|show|status] [--pipeline=<slug>] [--locale=es]',
    dashboard_moved:
      'El flujo `{command}` fue eliminado del CLI. El dashboard de AIOSON ahora se instala por separado. Abre la app del dashboard en tu computadora, crea o agrega un proyecto y selecciona la carpeta que ya contiene `.aioson/`.',
    dashboard_moved_line: '{message}\n',
    unknown_command: 'Comando desconocido: {command}',
    unknown_command_line: '{message}\n',
    error_prefix: 'Error: {message}'
  },
  init: {
    usage_error:
      'Uso: aioson init <project-name> [--force] [--dry-run] [--lang=en|pt-BR|es|fr] [--tool=codex|claude|gemini|opencode] [--locale=es]',
    non_empty_dir: 'El directorio no esta vacio: {targetDir}. Usa --force para continuar.',
    created_at: 'Proyecto creado en: {targetDir}',
    files_copied: 'Archivos copiados: {count}',
    files_skipped: 'Archivos omitidos: {count}',
    next_steps: 'Siguientes pasos:',
    step_cd: '1. cd {projectName}',
    step_setup: '2. Abre en tu AI CLI y ejecuta @setup',
    step_agents: '3. Si no aparece selector visual, ejecuta: aioson agents',
    step_agent_prompt:
      '4. Genera el prompt de setup para tu herramienta: aioson agent:prompt setup --tool={tool}'
  },
  install: {
    framework_detected: 'Framework detectado: {framework} ({evidence})',
    framework_not_detected: 'No se detecto framework. Instalando en modo generico.',
    done_at: 'Instalacion completada en: {targetDir}',
    files_copied: 'Archivos copiados: {count}',
    files_skipped: 'Archivos omitidos: {count}',
    next_steps: 'Siguientes pasos:',
    step_setup_context:
      '1. Genera/actualiza el contexto del proyecto: aioson setup:context --defaults',
    step_agents: '2. Si no aparece selector visual, ejecuta: aioson agents',
    step_agent_prompt:
      '3. Genera el prompt de setup para tu herramienta: aioson agent:prompt setup --tool={tool}',
    existing_project_detected:
      '⚠ Proyecto existente detectado ({count} archivos). Ejecuta el scanner antes de comenzar:',
    existing_project_scan_hint:
      '  aioson scan:project --folder=src   (genera scan-index.md localmente; agrega --with-llm para discovery.md)'
  },
  update: {
    not_installed: 'No se encontro instalacion de AIOSON en {targetDir}.',
    done_at: 'Actualizacion completada en: {targetDir}',
    files_updated: 'Archivos actualizados: {count}',
    backups_created: 'Backups creados: {count}'
  },
  info: {
    cli_version: 'AIOSON CLI: v{version}',
    directory: 'Directorio: {targetDir}',
    installed_here: 'Instalado en este directorio: {value}',
    framework_detected: 'Framework detectado: {framework}',
    evidence: 'Evidencia: {evidence}',
    yes: 'si',
    no: 'no',
    none: 'ninguno'
  },
  doctor: {
    ok: 'OK',
    fail: 'FALLO',
    diagnosis_ok: 'Diagnostico: instalacion saludable.',
    diagnosis_fail: 'Diagnostico: {count} problema(s) encontrado(s).',
    hint_prefix: '-> {hint}',
    check_line: '[{icon}] {message}',
    hint_line: '  Sugerencia: {hint}',
    fix_action_line: '- Accion: {action}',
    detail_line: '  Detalle: {text}',
    required_file: 'Archivo requerido: {rel}',
    context_generated: 'Contexto principal generado',
    context_hint: 'Ejecuta @setup para generar .aioson/context/project.context.md',
    context_frontmatter_valid: 'El frontmatter del contexto es valido',
    context_frontmatter_valid_hint:
      'Asegura que project.context.md comience con frontmatter YAML delimitado por ---',
    context_frontmatter_invalid: 'El frontmatter del contexto es invalido ({reason})',
    context_frontmatter_invalid_hint:
      'Reescribe project.context.md usando el formato de salida de @setup.',
    context_required_field: 'Falta campo requerido de contexto: {field}',
    context_required_field_hint:
      'Vuelve a ejecutar @setup y confirma que todos los campos requeridos esten presentes.',
    context_framework_installed_type: '`framework_installed` debe ser booleano (true/false)',
    context_framework_installed_type_hint:
      'Define framework_installed como true o false sin comillas.',
    context_classification_value: '`classification` debe ser uno de {expected}',
    context_classification_value_hint: 'Usa MICRO, SMALL o MEDIUM exactamente.',
    context_project_type_value: '`project_type` debe ser uno de {expected}',
    context_project_type_value_hint: 'Usa web_app, api, site, script o dapp exactamente.',
    context_profile_value: '`profile` debe ser uno de {expected}',
    context_profile_value_hint: 'Usa developer, beginner o team exactamente.',
    context_conversation_language_format: '`conversation_language` no es una etiqueta BCP-47 valida',
    context_conversation_language_format_hint: 'Usa valores como en, en-US, pt-BR.',
    node_version: 'Node.js >= 18 (actual: {version})',
    gateway_claude_pointer: 'El gateway de CLAUDE referencia archivos compartidos de AIOSON',
    gateway_claude_pointer_hint:
      'Asegura que CLAUDE.md referencie .aioson/config.md y .aioson/agents/setup.md.',
    gateway_codex_pointer: 'El gateway de Codex referencia archivos compartidos de AIOSON',
    gateway_codex_pointer_hint:
      'Asegura que AGENTS.md referencie .aioson/config.md y .aioson/agents/.',
    gateway_gemini_pointer: 'El gateway de Gemini referencia rutas compartidas de comandos y agentes',
    gateway_gemini_pointer_hint:
      'Asegura que .gemini/GEMINI.md referencie .gemini/commands/ y .aioson/agents/.',
    gateway_gemini_command_pointer:
      'El archivo de comando de Gemini mapea al agente compartido: {file}',
    gateway_gemini_command_pointer_hint:
      'Asegura que {file} incluya instruction_file = ".aioson/agents/{agent}.md".',
    gateway_opencode_pointer: 'El gateway de OpenCode referencia archivos compartidos de AIOSON',
    gateway_opencode_pointer_hint:
      'Asegura que OPENCODE.md referencie .aioson/config.md y .aioson/agents/.',
    fix_start: 'Modo de correccion segura habilitado.',
    fix_start_dry_run: 'Modo de correccion segura habilitado (dry-run).',
    fix_action_required_files: 'Restaurar archivos gestionados faltantes desde la plantilla',
    fix_action_gateway_contracts:
      'Restaurar archivos de contrato de gateway rotos desde la plantilla',
    fix_action_locale_sync: 'Sincronizar prompts activos de agentes con el idioma del contexto',
    fix_not_applicable: 'No aplica para el estado actual.',
    fix_target_count: 'Objetivos identificados: {count}',
    fix_applied_count: 'Cambios aplicados: {count}',
    fix_planned_count: 'Cambios planificados: {count}',
    fix_locale: 'Locale resuelto: {locale}',
    fix_summary: 'Cambios de correccion segura aplicados: {count}',
    fix_summary_dry_run: '[dry-run] Cambios de correccion segura planificados: {count}'
  },
  i18n_add: {
    usage_error: 'Uso: aioson i18n:add <locale> [--force] [--dry-run] [--locale=es]',
    invalid_locale: 'Codigo de locale invalido: {locale}. Formatos esperados como en, fr, pt-br.',
    base_locale: 'El locale "en" es el diccionario base y no puede generarse.',
    locale_exists: 'El archivo de locale ya existe: {path}. Usa --force para sobrescribir.',
    dry_run_created: '[dry-run] Se crearia el scaffold de locale: {locale}',
    dry_run_overwritten: '[dry-run] Se sobrescribiria el scaffold de locale: {locale}',
    created: 'Scaffold de locale creado: {locale}',
    overwritten: 'Scaffold de locale sobrescrito: {locale}',
    file_path: 'Archivo de locale: {path}',
    next_steps: 'Siguientes pasos:',
    step_translate: '1. Reemplaza las cadenas en ingles por texto traducido en ese archivo.',
    step_try: '2. Ejecuta la CLI con --locale={locale} para validar el nuevo diccionario.'
  },
  agents: {
    list_title: 'Agentes disponibles (locale resuelto: {locale}):',
    path: 'Ruta',
    active_path: 'Ruta activa',
    depends: 'Depende de',
    output: 'Salida',
    agent_line: '- Agente: {label} - {command} ({id})',
    path_line: '  Ruta: {path}',
    active_path_line: '  Ruta activa: {path}',
    depends_line: '  Depende de: {value}',
    output_line: '  Salida: {value}',
    none: 'ninguno',
    prompt_usage_error:
      'Uso: aioson agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=es]',
    prompt_unknown_agent: 'Agente desconocido: {agent}',
    prompt_title: 'Prompt para el agente "{agent}" en la herramienta "{tool}" (locale: {locale}):'
  },
  context_validate: {
    missing_file: 'Archivo de contexto no encontrado: {path}',
    hint_setup: 'Ejecuta @setup para generar el archivo primero.',
    invalid_frontmatter: 'El archivo de contexto tiene frontmatter YAML invalido.',
    file_path: 'Archivo de contexto: {path}',
    parse_reason_unknown: 'desconocido',
    parse_reason_missing_frontmatter: 'falta el delimitador inicial del frontmatter',
    parse_reason_unclosed_frontmatter: 'bloque de frontmatter sin cerrar',
    parse_reason_invalid_frontmatter_line: 'sintaxis invalida en linea de frontmatter',
    parse_reason: 'Motivo de parseo: {reason}',
    hint_fix_frontmatter: 'Usa @setup para regenerar un archivo de contexto valido.',
    invalid_fields: 'El archivo de contexto fue parseado pero tiene problemas de validacion:',
    issue_line: '- {issue}',
    valid: 'El archivo de contexto es valido.'
  },
  setup_context: {
    detected: 'Framework detectado: {framework} (installed={installed})',
    q_project_name: 'Nombre del proyecto',
    q_project_type: 'Tipo de proyecto (web_app|api|site|script|dapp)',
    q_profile: 'Perfil: [1] developer [2] beginner [3] team',
    q_use_detected_framework: 'Usar framework detectado? (true/false)',
    q_framework: 'Framework',
    q_framework_installed: 'Framework instalado? (true/false)',
    q_language: 'Idioma de conversacion (por ejemplo en o pt-BR)',
    q_backend_menu:
      'Backend: [1] Laravel [2] Rails [3] Django [4] Node/Express [5] Next.js [6] Nuxt [7] Hardhat [8] Foundry [9] Truffle [10] Anchor [11] Solana Web3 [12] Cardano [13] Other',
    q_backend_text: 'Backend (texto libre)',
    q_laravel_version: 'Version de Laravel (por ejemplo 11, 10)',
    q_frontend_menu:
      'Frontend: [1] TALL Stack [2] VILT Stack [3] Blade [4] Next.js [5] Nuxt [6] React [7] Vue [8] Other',
    q_frontend_text: 'Frontend (texto libre)',
    q_auth_menu:
      'Auth (Laravel): [1] Breeze [2] Jetstream + Livewire [3] Filament Shield [4] Custom',
    q_web3_enabled: 'Web3 habilitado? (true/false)',
    q_web3_networks: 'Redes Web3 (por ejemplo ethereum, solana, cardano)',
    q_contract_framework: 'Framework de contratos (por ejemplo Hardhat, Foundry, Anchor, Aiken)',
    q_wallet_provider: 'Proveedor de wallet (por ejemplo wagmi, RainbowKit, Phantom, Lace)',
    q_indexer: 'Indexer (por ejemplo The Graph, Helius, Blockfrost)',
    q_rpc_provider: 'Proveedor RPC (por ejemplo Alchemy, Infura, QuickNode)',
    q_jetstream_teams: 'Jetstream teams habilitado? (true/false)',
    q_jetstream_existing_action:
      'Proyecto Laravel existente sin Jetstream detectado. Accion: [1] continuar sin Jetstream [2] recrear con Jetstream (recomendado) [3] instalacion manual (riesgo)',
    q_auth_text: 'Enfoque de autenticacion (texto libre)',
    q_uiux_menu: 'UI/UX: [1] Tailwind [2] Flux UI [3] shadcn/ui [4] Filament',
    q_uiux_text: 'Enfoque de UI/UX (texto libre)',
    q_database_menu:
      'Base de datos: [1] MySQL [2] PostgreSQL [3] SQLite [4] MongoDB [5] Supabase [6] PlanetScale',
    q_database_text: 'Base de datos (texto libre)',
    q_services_list:
      'Servicios adicionales (lista separada por comas): queues, storage, websockets, payments, email, cache, search',
    q_rails_options:
      'Opciones usadas en Rails (lista separada por comas, ej. --database=postgresql,--css=tailwind,--api)',
    q_next_options:
      'Opciones de create-next-app (lista separada por comas, ej. TypeScript,ESLint,Tailwind CSS,App Router,src/ directory)',
    q_beginner_summary: 'Describe tu proyecto en una frase',
    q_beginner_users:
      'Usuarios esperados: [1] personal/pequeno hasta 10 [2] equipo pequeno hasta 100 [3] clientes externos',
    q_beginner_mobile: 'Requisito movil: [1] app movil [2] web responsiva [3] solo desktop',
    q_beginner_hosting: 'Preferencia de hosting: [1] gestionado simple [2] VPS [3] cloud provider',
    q_beginner_accept_recommendation: 'Aceptar recomendacion inicial? (true/false)',
    beginner_recommendation:
      'Recomendacion inicial -> framework: {framework}, frontend: {frontend}, database: {database}, auth: {auth}',
    q_user_types: 'Cuantos tipos de usuario?',
    q_integrations: 'Cuantas integraciones externas?',
    q_rules_complexity: 'Complejidad de reglas (none|some|complex)',
    note_status_enabled: 'habilitado',
    note_status_disabled: 'deshabilitado',
    note_jetstream_teams: 'Jetstream teams: {status}',
    note_selected_services: 'Servicios seleccionados: {services}',
    note_rails_setup_flags: 'Flags de setup de Rails: {flags}',
    note_next_setup_flags: 'Flags de setup de Next.js: {flags}',
    note_next_create_flags: 'Flags de create-next-app: {flags}',
    note_jetstream_existing_action: 'Accion para proyecto existente con Jetstream: {action}',
    note_mobile_first:
      'Se detecto requisito mobile-first; considera React Native/Expo como siguiente paso.',
    note_vps_preference:
      'Se detecto preferencia por VPS; mantén scripts de despliegue simples y reproducibles.',
    note_cloud_profile:
      'Se detecto perfil cloud; usa base de datos gestionada y object storage desde el inicio.',
    note_web3_terms: 'Se detectaron terminos Web3; recomendacion inicial de dApp aplicada.',
    note_starter_profile:
      'Esta recomendacion es un perfil inicial; ajusta cuando los requisitos sean mas claros.',
    note_team_profile:
      'Perfil de equipo seleccionado; conserva convenciones explicitas del equipo y reglas de CI.',
    note_beginner_declined:
      'Recomendacion inicial rechazada; usando stack personalizado del onboarding.',
    note_monorepo:
      'Monorepo detectado: framework Web3 y framework de aplicacion coexisten. Confirmar el framework principal con el usuario y documentar la estructura en Notes.',
    written: 'Archivo de contexto escrito: {path}',
    classification_result: 'Clasificacion: {classification} (score={score}/6)',
    locale_applied: 'Paquete localizado de agentes aplicado: {locale} ({count} archivos)'
  },
  locale_apply: {
    applied: 'Paquete de locale aplicado: {locale}',
    dry_run_applied: '[dry-run] Se aplicaria el paquete de locale: {locale}',
    copied_count: 'Archivos copiados: {count}',
    missing_count: 'Archivos de locale faltantes: {count}',
    copy_line: '  Archivo: {source} -> {target}'
  },
  smoke: {
    start: 'Ejecutando smoke test en: {projectDir}',
    using_web3_profile: 'Usando perfil Web3 de smoke: {target}',
    using_mixed_profile: 'Usando perfil mixto monorepo Web2+Web3 para smoke.',
    using_parallel_profile: 'Usando perfil de smoke de orquestacion paralela.',
    seeded_web3_workspace: 'Workspace inicializado para objetivo Web3: {target}',
    seeded_mixed_workspace: 'Workspace inicializado para perfil mixto Web2+Web3.',
    seeded_parallel_context: 'Contexto discovery/architecture/prd inicializado para perfil paralelo.',
    step_ok: 'OK: {step}',
    web3_detected: 'Framework Web3 detectado: {framework} ({network})',
    web3_context_verified: 'Contexto Web3 verificado para red: {network}',
    mixed_context_verified: 'Contexto de perfil mixto verificado (framework: {framework}).',
    parallel_status_verified: 'Estado paralelo verificado para lanes: {count}',
    invalid_web3_target: 'Objetivo --web3 invalido: {target}. Usa ethereum, solana o cardano.',
    invalid_profile: 'Valor invalido para --profile: {profile}. Usa standard, mixed o parallel.',
    profile_conflict: 'No combines --profile=mixed con --web3. Elige un solo modo de perfil.',
    assert_install_files: 'install copio cero archivos',
    assert_web3_framework: 'deteccion inesperada de framework web3: {framework}',
    assert_setup_written: 'setup:context no escribio el archivo de contexto',
    assert_setup_project_type_dapp: 'setup no infirio project_type=dapp',
    assert_setup_web3_network: 'setup no infirio la red web3 esperada',
    assert_setup_web3_framework: 'setup no mantuvo el framework web3 esperado',
    assert_mixed_project_type_dapp: 'el perfil mixed no infirio project_type=dapp',
    assert_mixed_web3_enabled: 'el perfil mixed no infirio web3_enabled=true',
    assert_mixed_framework: 'el perfil mixed no priorizo el framework web3 esperado',
    assert_locale_apply_files: 'locale:apply copio cero archivos',
    assert_agents_count: 'el comando agents devolvio una cantidad inesperada',
    assert_prompt_path: 'agent:prompt no incluyo la ruta esperada',
    assert_context_validate: 'context:validate fallo',
    assert_web3_context_valid: 'fallo al parsear el contexto web3',
    assert_web3_context_project_type: 'project_type del contexto no es dapp',
    assert_web3_context_enabled: 'web3_enabled del contexto no es true',
    assert_web3_context_network: 'web3_networks del contexto no incluye el objetivo esperado',
    assert_doctor_ok: 'la verificacion doctor fallo',
    assert_parallel_init_ok: 'parallel:init fallo',
    assert_parallel_init_workers: 'los workers de parallel:init no coinciden',
    assert_parallel_assign_ok: 'parallel:assign fallo',
    assert_parallel_assign_scope: 'parallel:assign no produjo alcance',
    assert_parallel_status_ok: 'parallel:status fallo',
    assert_parallel_status_lanes: 'la cantidad de lanes en parallel:status no coincide',
    assert_parallel_doctor_ok: 'parallel:doctor fallo',
    assert_parallel_doctor_summary: 'parallel:doctor reporto fallos',
    completed: 'Smoke test completado con exito.',
    steps_count: 'Pasos validados: {count}',
    workspace_kept: 'Workspace conservado: {path}',
    workspace_removed: 'Workspace eliminado: {path}'
  },
  package_test: {
    start: 'Ejecutando prueba de paquete desde origen: {sourceDir}',
    pack_done: 'Tarball de paquete creado: {tarball}',
    completed: 'Prueba de paquete completada con {count} pasos validados.',
    workspace: 'Workspace de prueba de paquete: {path}',
    error_unknown_detail: 'error desconocido',
    error_npm_pack: 'npm pack fallo: {detail}',
    error_tarball_missing: 'npm pack no devolvio el nombre del tarball',
    error_npx_init: 'npx init fallo: {detail}',
    error_npx_setup_context: 'npx setup:context fallo: {detail}',
    error_npx_doctor: 'npx doctor fallo: {detail}',
    error_doctor_not_ok: 'doctor devolvio ok=false durante la prueba de paquete',
    error_npx_mcp_init: 'npx mcp:init fallo: {detail}',
    error_mcp_not_ok: 'mcp:init devolvio ok=false durante la prueba de paquete'
  },
  workflow_plan: {
    context_missing:
      'Archivo de contexto no encontrado. Usando workflow de respaldo segun la clasificacion indicada/predeterminada.',
    title: 'Workflow recomendado para clasificacion {classification}:',
    notes: 'Notas:',
    command_line: '  Comando: {command}',
    note_line: '  Nota: {note}',
    note_framework_not_installed:
      'El framework aun no esta instalado; completa la instalacion del stack antes de @dev.',
    note_dapp_context:
      'Contexto dApp detectado; incluye skills Web3 durante @architect y @dev.',
    note_micro_scope:
      'Mantén el alcance de implementacion minimo y evita agentes opcionales.',
    note_product_optional:
      '@product es opcional para MICRO — omitelo y ve directo a @dev si la idea ya esta clara.',
    note_feature_flow:
      'Flujo para nueva feature (tras la configuracion inicial): @product → @analyst → @dev → @qa. Sin @setup.'
  },
  parallel_init: {
    context_missing:
      'Archivo de contexto no encontrado: {path}. Ejecuta setup:context primero.',
    context_invalid: 'Archivo de contexto invalido o no parseable: {path}.',
    classification_unknown: 'desconocida',
    requires_medium:
      'La inicializacion paralela solo esta soportada para clasificacion MEDIUM (actual: {classification}). Usa --force para forzar.',
    invalid_workers:
      'Valor invalido para --workers. Usa un entero entre {min} y {max}.',
    already_exists:
      'Los archivos de contexto paralelo ya existen ({count}). Usa --force para sobrescribir.',
    prepared: 'Workspace paralelo inicializado en: {path}',
    dry_run_prepared: '[dry-run] El workspace paralelo se inicializaria en: {path}',
    workers_count: 'Workers: {count}',
    files_count: 'Archivos preparados: {count}',
    missing_prereq_count: 'Archivos de contexto prerequisito faltantes: {count}',
    file_line: '  Archivo: {file}'
  },
  parallel_doctor: {
    prefix_ok: 'OK',
    prefix_warn: 'AVISO',
    prefix_fail: 'FALLO',
    check_line: '[{prefix}] {id} - {message}',
    hint_line: '  Sugerencia: {hint}',
    invalid_workers:
      'Valor invalido para --workers. Usa un entero entre {min} y {max}.',
    classification_unknown: 'desconocida',
    requires_medium:
      'El modo fix de parallel doctor requiere clasificacion MEDIUM (actual: {classification}). Usa --force para forzar.',
    report_title: 'Reporte de parallel doctor: {path}',
    summary: 'Resumen: {passed} correctos, {failed} fallos, {warnings} advertencias.',
    fix_summary: 'Cambios de correccion paralela aplicados: {count}',
    fix_summary_dry_run: '[dry-run] Cambios de correccion paralela planificados: {count}',
    check_context_exists_ok: 'project.context.md existe.',
    check_context_exists_missing: 'project.context.md falta.',
    check_context_exists_hint: 'Ejecuta setup:context antes de parallel doctor.',
    check_context_parsed_ok: 'project.context.md es parseable.',
    check_context_parsed_invalid: 'project.context.md es invalido.',
    check_context_parsed_hint:
      'Corrige el frontmatter del contexto antes de ejecutar parallel doctor.',
    check_context_classification_ok:
      'Modo paralelo permitido para clasificacion {classification}.',
    check_context_classification_invalid:
      'Modo paralelo requiere clasificacion MEDIUM (actual: {classification}).',
    check_context_classification_hint:
      'Usa --force para sobrescribir la regla de clasificacion.',
    check_parallel_dir_ok: 'El directorio .aioson/context/parallel existe.',
    check_parallel_dir_missing: 'El directorio .aioson/context/parallel falta.',
    check_parallel_dir_hint: 'Ejecuta parallel:init o parallel:doctor --fix.',
    check_parallel_shared_ok: 'shared-decisions.md esta presente.',
    check_parallel_shared_missing: 'shared-decisions.md falta.',
    check_parallel_shared_hint:
      'Ejecuta parallel:doctor --fix para restaurar los archivos base.',
    check_lanes_present_ok: 'Se detectaron {count} archivo(s) de lane.',
    check_lanes_present_missing: 'No se encontraron archivos de estado de lane.',
    check_lanes_present_hint: 'Ejecuta parallel:init o parallel:doctor --fix.',
    check_lanes_sequence_ok: 'La secuencia de lanes es continua (1..{workers}).',
    check_lanes_sequence_missing: 'Faltan archivos de lane en la secuencia: {lanes}',
    check_lanes_sequence_hint:
      'Ejecuta parallel:doctor --fix para restaurar las lanes faltantes.',
    check_workers_option: 'Opcion de workers solicitada: {workers}.',
    check_prereq_ok: 'Todos los archivos de contexto prerequisito estan presentes.',
    check_prereq_missing: 'Faltan {count} archivo(s) de contexto prerequisito.',
    check_prereq_hint: 'Crea los archivos discovery/architecture/prd antes de orquestar.'
  },
  parallel_assign: {
    invalid_workers:
      'Valor invalido para --workers. Usa un entero entre {min} y {max}.',
    context_missing: 'Archivo de contexto no encontrado: {path}.',
    context_invalid: 'Archivo de contexto invalido o no parseable: {path}.',
    classification_unknown: 'desconocida',
    requires_medium:
      'La asignacion paralela requiere clasificacion MEDIUM (actual: {classification}). Usa --force para forzar.',
    parallel_missing:
      'Directorio paralelo no encontrado: {path}. Ejecuta parallel:init primero.',
    no_lanes: 'No se encontraron archivos de lanes en .aioson/context/parallel.',
    missing_lanes: 'Faltan archivos de lanes para los workers solicitados: {lanes}.',
    source_missing: 'No se pudo resolver el documento fuente con --source={source}.',
    applied: 'Asignacion de alcance paralelo aplicada ({count} item(s) de alcance).',
    dry_run_applied:
      '[dry-run] Asignacion de alcance paralelo planificada ({count} item(s) de alcance).',
    source_info: 'Documento fuente: {source}',
    workers_count: 'Workers: {count}',
    files_count: 'Archivos actualizados: {count}',
    lane_scope_line: '- lane {lane}: {count} item(s) de alcance'
  },
  parallel_status: {
    parallel_missing:
      'Directorio paralelo no encontrado: {path}. Ejecuta parallel:init primero.',
    no_lanes: 'No se encontraron archivos de lanes en .aioson/context/parallel.',
    title: 'Reporte de estado paralelo: {path}',
    lanes_count: 'Lanes: {count}',
    statuses_title: 'Estados:',
    status_line: '- {status}: {count}',
    status_pending: 'pendiente',
    status_in_progress: 'en_progreso',
    status_completed: 'completado',
    status_blocked: 'bloqueado',
    status_other: 'otro',
    scopes_count: 'Total de items de alcance: {count}',
    deliverables_progress: 'Entregables: {completed}/{total} completados',
    blockers_count: 'Bloqueos abiertos: {count}',
    shared_decisions: 'Entradas del log de decisiones compartidas: {count}',
    lane_line: '- lane {lane}: status={status}, alcance={scope}, bloqueos={blockers}'
  },
  mcp_init: {
    context_missing:
      'Archivo de contexto no encontrado. Generando plan MCP base con supuestos genericos.',
    invalid_tool: 'Valor invalido para --tool: {tool}. Usa uno de: {expected}.',
    reason_filesystem: 'Acceso local obligatorio al workspace.',
    reason_context7:
      'Usa documentacion oficial actualizada en el momento de la implementacion.',
    reason_database_none: 'Aun no se detecto una stack de base de datos.',
    reason_database_enabled:
      'El contexto indica capacidades con base de datos (se recomienda endpoint MCP remoto).',
    reason_web_search:
      'Util para evaluar paquetes y verificar notas de lanzamiento.',
    reason_chain_rpc_disabled: 'Web3 esta deshabilitado para este proyecto.',
    reason_chain_rpc_enabled: 'Se detecto contexto dApp; se requiere acceso RPC de chain.',
    reason_makopy: 'Integracion opcional de pipeline de contenido.',
    note_workspace_local: 'Este es un preset local de workspace generado por AIOSON.',
    note_replace_placeholders:
      'Reemplaza comandos placeholder por los servidores MCP que realmente usas.',
    note_keep_secrets_env:
      'Mantén secretos en variables de entorno, nunca inline tokens.',
    generated: 'Plan MCP escrito: {path}',
    dry_run_generated: '[dry-run] Se escribiria el plan MCP: {path}',
    server_count: 'Servidores MCP en el plan: {count}',
    preset_count: 'Presets de herramientas generados: {count}',
    preset_written: 'Preset escrito ({tool}): {path}',
    preset_dry_run: '[dry-run] Se escribiria el preset ({tool}): {path}'
  },
  mcp_doctor: {
    prefix_ok: 'OK',
    prefix_warn: 'AVISO',
    prefix_fail: 'FALLO',
    check_line: '[{prefix}] {id} - {message}',
    hint_line: '  Sugerencia: {hint}',
    context_missing: 'project.context.md no fue encontrado.',
    context_missing_hint: 'Ejecuta setup primero para validacion MCP basada en contexto.',
    context_parse_invalid: 'project.context.md no pudo parsearse ({reason}).',
    context_parse_invalid_hint:
      'Corrige el formato del contexto para habilitar validacion MCP por stack.',
    context_ok: 'project.context.md esta disponible y parseable.',
    plan_missing: 'No se encontro el archivo de plan MCP (.aioson/mcp/servers.local.json).',
    plan_missing_hint: 'Ejecuta: aioson mcp:init',
    plan_invalid: 'JSON del plan MCP invalido: {error}',
    plan_invalid_hint: 'Regenera el plan con: aioson mcp:init',
    plan_ok: 'El archivo de plan MCP esta presente y con JSON valido.',
    plan_servers_ok: 'El plan MCP declara {count} definicion(es) de servidor.',
    plan_servers_missing: 'El plan MCP no tiene definiciones de servidor.',
    plan_servers_hint: 'Regenera con: aioson mcp:init',
    core_enabled: 'El servidor MCP core "{server}" esta habilitado.',
    core_missing: 'El servidor MCP core "{server}" falta o esta deshabilitado.',
    core_missing_hint: 'Regenera y manten habilitados los servidores core base.',
    presets_any_ok: 'Se encontraron {count} archivo(s) de preset MCP.',
    presets_any_missing: 'No se encontraron archivos de preset MCP.',
    presets_any_hint: 'Ejecuta: aioson mcp:init',
    presets_coverage_partial:
      'Solo {existing}/{total} presets de herramientas estan presentes.',
    presets_coverage_partial_hint:
      'Ejecuta: aioson mcp:init (sin --tool) para generar todos los presets.',
    presets_coverage_full:
      'Todos los presets de herramientas estan presentes (claude, codex, gemini, opencode).',
    env_none_required:
      'No hay variables de entorno obligatorias en servidores MCP habilitados.',
    env_missing: 'Faltan {missing}/{total} variable(s) de entorno obligatoria(s): {vars}',
    env_missing_hint_strict: 'Define las variables faltantes antes de la ejecucion.',
    env_missing_hint_relaxed:
      'Define variables para disponibilidad completa en runtime. Usa --strict-env para fallar en esta verificacion.',
    env_all_present: 'Todas las variables obligatorias estan disponibles ({count}).',
    compat_database_ok: 'Database MCP coincide con el engine del contexto ({engine}).',
    compat_database_mismatch:
      'Database MCP no coincide completamente con el stack del contexto ({engine}).',
    compat_database_hint:
      'Regenera con: aioson mcp:init, o ajusta manualmente el servidor database.',
    compat_web3_ok: 'chain-rpc MCP esta habilitado para contexto Web3.',
    compat_web3_missing: 'Se detecto contexto Web3, pero chain-rpc MCP falta o esta deshabilitado.',
    compat_web3_missing_hint: 'Regenera con: aioson mcp:init',
    compat_web3_unneeded: 'chain-rpc MCP esta habilitado, pero el contexto no es Web3.',
    compat_web3_unneeded_hint: 'Deshabilita chain-rpc si no es necesario.',
    report_title: 'Reporte MCP doctor: {path}',
    summary: 'Resumen: {passed} correctos, {failed} fallos, {warnings} advertencias.'
  },
  qa_doctor: {
    prefix_ok: 'OK',
    prefix_warn: 'AVISO',
    prefix_fail: 'FALLO',
    check_line: '[{prefix}] {id} - {message}',
    hint_line: '  Sugerencia: {hint}',
    report_title: 'Reporte QA doctor: {path}',
    summary: 'Resumen: {passed} correctos, {failed} fallos, {warnings} advertencias.',
    playwright_ok: 'Playwright esta instalado.',
    playwright_missing: 'Paquete Playwright no encontrado.',
    playwright_missing_hint: 'Ejecuta: npm install -g playwright && npx playwright install chromium',
    chromium_ok: 'Binario de Chromium encontrado.',
    chromium_missing: 'Binario de Chromium no encontrado.',
    chromium_missing_hint: 'Ejecuta: npx playwright install chromium',
    config_ok: 'aios-qa.config.json encontrado y valido.',
    config_missing: 'aios-qa.config.json no encontrado.',
    config_missing_hint: 'Ejecuta: aioson qa:init --url=<url-de-tu-app>',
    config_invalid: 'aios-qa.config.json no es JSON valido: {error}',
    url_ok: 'URL de destino accesible ({url}).',
    url_missing: 'Ninguna URL configurada en aios-qa.config.json.',
    url_missing_hint: 'Ejecuta: aioson qa:init --url=<url-de-tu-app>',
    url_unreachable: 'URL de destino no accesible ({url}): {error}',
    url_unreachable_hint: 'Inicia tu aplicacion antes de ejecutar qa:run o qa:scan.',
    context_ok: 'project.context.md encontrado — las pruebas se enriqueceran con contexto del proyecto.',
    context_missing: 'project.context.md no encontrado — ejecutando en modo generico.',
    prd_ok: 'prd.md encontrado — {count} criterios de aceptacion mapeados como escenarios de prueba.',
    prd_missing: 'prd.md no encontrado — se omitira el mapeo de cobertura AC.'
  },
  qa_init: {
    context_found: 'Contexto encontrado: proyecto={name}, url={url}',
    prd_found: 'prd.md encontrado — {count} criterios de aceptacion extraidos como escenarios.',
    prd_missing: 'prd.md no encontrado — no se generaron escenarios AC.',
    generated: 'Configuracion QA escrita: {path}',
    dry_run_generated: '[dry-run] La configuracion QA se escribiria en: {path}',
    scenarios_count: 'Escenarios de prueba del prd.md: {count}',
    personas_count: 'Personas habilitadas: {count} (naive, hacker, power, mobile)',
    probes_count: 'Sondas de seguridad habilitadas: {count}',
    next_steps: 'Proximos pasos:',
    step_doctor: '1. Verificar prerequisitos: aioson qa:doctor',
    step_run: '2. Ejecutar pruebas en el navegador: aioson qa:run'
  },
  qa_run: {
    playwright_missing: 'Playwright no esta instalado. Ejecuta: npm install -g playwright && npx playwright install chromium',
    config_missing: 'aios-qa.config.json no encontrado. Ejecuta: aioson qa:init --url=<url-de-tu-app>',
    url_missing: 'Ninguna URL configurada. Agrega url a aios-qa.config.json o usa --url=<app-url>.',
    starting: 'Iniciando sesion QA en el navegador: {url}',
    persona_start: 'Ejecutando persona: {persona}',
    persona_done: 'Persona "{persona}" completada — {count} hallazgo(s)',
    accessibility: 'Ejecutando auditoria de accesibilidad...',
    performance: 'Capturando metricas de rendimiento...',
    ac_scenarios: 'Documentando cobertura de AC...',
    done: 'Sesion QA completada.',
    report_written: 'Reporte escrito: {path}',
    json_written: 'Reporte JSON escrito: {path}',
    screenshots_dir: 'Capturas guardadas en: {path}',
    findings_summary: 'Hallazgos: {critical} criticos, {high} altos, {medium} medios, {low} bajos',
    html_report_written: 'Reporte HTML escrito: {path}'
  },
  qa_scan: {
    playwright_missing: 'Playwright no esta instalado. Ejecuta: npm install -g playwright && npx playwright install chromium',
    config_missing: 'aios-qa.config.json no encontrado. Ejecuta: aioson qa:init --url=<url-de-tu-app>',
    url_missing: 'Ninguna URL configurada. Agrega url a aios-qa.config.json o usa --url=<app-url>.',
    starting: 'Iniciando escaneo autonomo: {url}',
    crawling: 'Rastreando rutas (profundidad max {depth}, max {pages} paginas)...',
    routes_found: 'Rutas descubiertas: {count}',
    scanning_route: 'Escaneando: {route}',
    done: 'Escaneo autonomo completado.',
    report_written: 'Reporte escrito: {path}',
    findings_summary: 'Hallazgos: {critical} criticos, {high} altos, {medium} medios, {low} bajos',
    html_report_written: 'Reporte HTML escrito: {path}'
  },
  qa_report: {
    not_found: 'No se encontro reporte QA. Ejecuta: aioson qa:run o aioson qa:scan',
    html_report_written: 'Reporte HTML escrito: {path}'
  },
  config: {
    usage_error:
      'Uso: aioson config <set KEY=value|show|get KEY> [--json] [--locale=es]',
    set_ok: 'Clave configurada: {key} (guardada en {path})',
    show_header: 'Config global: {path}',
    show_empty: '  (ninguna clave configurada)',
    show_line: '  {key} = {value}',
    get_line: '{key} = {value}',
    key_not_found: 'Clave no encontrada: {key}'
  },
  squad_status: {
    no_squad: 'No se encontro ningun squad.',
    hint: 'Usa @squad en tu sesion de IA para armar un squad.',
    squads_found: '{count} squad(s) encontrados:',
    most_recent: '(mas reciente)',
    squad_item: '  [{file}]{marker}',
    name: '    Squad       : {value}',
    mode: '    Modo        : {value}',
    goal: '    Objetivo    : {value}',
    agents: '    Agentes     : {specialists} especialistas / {total} total ({path})',
    sessions: '    Sesiones    : {count} ({path})',
    latest_html: '    Latest HTML : {value}',
    logs: '    Logs        : {count} ({path})',
    genomes: '    Genomas     : {count} en el squad / {agent_count} vinculos por agente'
  },
  scan_project: {
    scanning: 'aioson scan:project — escaneando {dir}',
    folder_required:
      'Usa --folder=<ruta[,ruta2]> para generar mapas completos de carpetas especificas. Ejemplo: --folder=src o --folder=app.',
    folder_not_found: 'La carpeta "{folder}" no existe en este proyecto. Directorios de nivel superior detectados: {available}',
    config_missing: '{file} no encontrado. Para usar el modo con LLM, copia aioson-models.json y completa tus claves de API.',
    config_invalid: 'JSON invalido en aioson-models.json: {error}',
    provider_missing: 'Provider de LLM "{provider}" no encontrado en aioson-models.json. Disponibles: {available}',
    provider_info: '  Provider : {provider}',
    model_info: '  Modelo   : {model}',
    context_found: '  Contexto : project.context.md encontrado',
    context_missing: '  Contexto : project.context.md no encontrado (ejecuta aioson setup:context primero)',
    spec_found: '  Spec     : spec.md encontrado — memoria de desarrollo incluida',
    local_only: '  LLM      : desactivada por defecto — solo escaneo local (usa --with-llm para generar discovery.md + skeleton-system.md)',
    walking: '  Escaneando estructura del proyecto...',
    walk_done: '  Archivos : {files} entradas mapeadas | Archivos clave: {keys} leidos',
    index_written: '  Indice   : scan local escrito en {path} (modo: {mode})',
    folders_written: '  Carpetas : mapa de carpetas escrito en {path}',
    folder_written: '  Carpeta  : mapa completo de {folder} escrito en {path}',
    forge_written: '  AIOS     : mapa util de .aioson escrito en {path}',
    dry_run_done: '[dry-run] Escanearia {treeCount} entradas y {keyCount} archivos clave — sin llamada LLM.',
    local_done: '  Resultado: escaneo local completado — indice, mapa de carpetas, scans solicitados y .aioson listos.',
    calling_llm: '  Llamando {provider} ({model})...',
    llm_missing_api_key:
      'La API key del provider "{provider}" todavia no esta configurada en {file}. Completa providers.{provider}.api_key o elige otro provider con --provider=...',
    llm_error: 'Llamada LLM fallo: {error}',
    discovery_written: 'discovery.md escrito: {path} ({chars} chars)',
    skeleton_written: 'skeleton-system.md escrito: {path} ({chars} chars)',
    skeleton_missing: 'Delimitador skeleton no encontrado en respuesta LLM — skeleton-system.md no escrito.',
    next_steps: '\n  Proximos pasos:',
    step_analyst: '  1. Abre tu sesion de IA y ejecuta @analyst — lee discovery.md + skeleton-system.md automaticamente',
    step_dev: '  2. Ejecuta @dev — lee skeleton-system.md primero, luego discovery.md + spec.md'
  }
};
