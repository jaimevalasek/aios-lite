'use strict';

module.exports = {
  cli: {
    title: 'AIOS Lite CLI',
    usage: 'Uso:',
    help_init: 'aios-lite init <project-name> [--force] [--dry-run] [--locale=es]',
    help_install: 'aios-lite install [path] [--force] [--dry-run] [--locale=es]',
    help_update: 'aios-lite update [path] [--dry-run] [--locale=es]',
    help_info: 'aios-lite info [path] [--json] [--locale=es]',
    help_doctor: 'aios-lite doctor [path] [--fix] [--dry-run] [--json] [--locale=es]',
    help_i18n_add: 'aios-lite i18n:add <locale> [--force] [--dry-run] [--locale=es]',
    help_agents: 'aios-lite agents [path] [--lang=en|pt-BR|es|fr] [--locale=es]',
    help_agent_prompt:
      'aios-lite agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=es]',
    help_context_validate: 'aios-lite context:validate [path] [--json] [--locale=es]',
    help_setup_context:
      'aios-lite setup:context [path] [--defaults] [--project-type=web_app|api|site|script|dapp] [--language=es] [--web3-enabled=true|false] [--locale=es]',
    help_locale_apply: 'aios-lite locale:apply [path] [--lang=en|pt-BR|es|fr] [--dry-run] [--locale=es]',
    help_test_smoke:
      'aios-lite test:smoke [workspace-path] [--lang=en|pt-BR|es|fr] [--web3=ethereum|solana|cardano] [--profile=standard|mixed] [--keep] [--json] [--locale=es]',
    help_test_package:
      'aios-lite test:package [source-path] [--keep] [--dry-run] [--json] [--locale=es]',
    help_workflow_plan:
      'aios-lite workflow:plan [path] [--classification=MICRO|SMALL|MEDIUM] [--json] [--locale=es]',
    help_parallel_init:
      'aios-lite parallel:init [path] [--workers=2..6] [--force] [--dry-run] [--json] [--locale=es]',
    help_parallel_doctor:
      'aios-lite parallel:doctor [path] [--workers=2..6] [--fix] [--force] [--dry-run] [--json] [--locale=es]',
    help_parallel_assign:
      'aios-lite parallel:assign [path] [--source=auto|prd|architecture|discovery|<file>] [--workers=2..6] [--force] [--dry-run] [--json] [--locale=es]',
    help_mcp_init:
      'aios-lite mcp:init [path] [--tool=claude|codex|gemini|opencode] [--dry-run] [--json] [--locale=es]',
    help_mcp_doctor:
      'aios-lite mcp:doctor [path] [--strict-env] [--json] [--locale=es]',
    unknown_command: 'Comando desconocido: {command}',
    error_prefix: 'Error: {message}'
  },
  init: {
    usage_error: 'Uso: aios-lite init <project-name> [--force] [--dry-run] [--locale=es]',
    non_empty_dir: 'El directorio no esta vacio: {targetDir}. Usa --force para continuar.',
    created_at: 'Proyecto creado en: {targetDir}',
    files_copied: 'Archivos copiados: {count}',
    files_skipped: 'Archivos omitidos: {count}',
    next_steps: 'Siguientes pasos:',
    step_cd: '1. cd {projectName}',
    step_setup: '2. Abre en tu AI CLI y ejecuta @setup'
  },
  install: {
    framework_detected: 'Framework detectado: {framework} ({evidence})',
    framework_not_detected: 'No se detecto framework. Instalando en modo generico.',
    done_at: 'Instalacion completada en: {targetDir}',
    files_copied: 'Archivos copiados: {count}',
    files_skipped: 'Archivos omitidos: {count}'
  },
  update: {
    not_installed: 'No se encontro instalacion de AIOS Lite en {targetDir}.',
    done_at: 'Actualizacion completada en: {targetDir}',
    files_updated: 'Archivos actualizados: {count}',
    backups_created: 'Backups creados: {count}'
  },
  info: {
    cli_version: 'AIOS Lite CLI: v{version}',
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
    required_file: 'Archivo requerido: {rel}',
    context_generated: 'Contexto principal generado',
    context_hint: 'Ejecuta @setup para generar .aios-lite/context/project.context.md',
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
    fix_start: 'Modo de correccion segura habilitado.',
    fix_start_dry_run: 'Modo de correccion segura habilitado (dry-run).',
    fix_action_required_files: 'Restaurar archivos gestionados faltantes desde la plantilla',
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
    usage_error: 'Uso: aios-lite i18n:add <locale> [--force] [--dry-run] [--locale=es]',
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
    none: 'ninguno',
    prompt_usage_error:
      'Uso: aios-lite agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=es]',
    prompt_unknown_agent: 'Agente desconocido: {agent}',
    prompt_title: 'Prompt para el agente "{agent}" en la herramienta "{tool}" (locale: {locale}):'
  },
  context_validate: {
    missing_file: 'Archivo de contexto no encontrado: {path}',
    hint_setup: 'Ejecuta @setup para generar el archivo primero.',
    invalid_frontmatter: 'El archivo de contexto tiene frontmatter YAML invalido.',
    file_path: 'Archivo de contexto: {path}',
    parse_reason: 'Motivo de parseo: {reason}',
    hint_fix_frontmatter: 'Usa @setup para regenerar un archivo de contexto valido.',
    invalid_fields: 'El archivo de contexto fue parseado pero tiene problemas de validacion:',
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
    written: 'Archivo de contexto escrito: {path}',
    classification_result: 'Clasificacion: {classification} (score={score}/6)',
    locale_applied: 'Paquete localizado de agentes aplicado: {locale} ({count} archivos)'
  },
  locale_apply: {
    applied: 'Paquete de locale aplicado: {locale}',
    dry_run_applied: '[dry-run] Se aplicaria el paquete de locale: {locale}',
    copied_count: 'Archivos copiados: {count}',
    missing_count: 'Archivos de locale faltantes: {count}'
  },
  smoke: {
    start: 'Ejecutando smoke test en: {projectDir}',
    using_web3_profile: 'Usando perfil Web3 de smoke: {target}',
    using_mixed_profile: 'Usando perfil mixto monorepo Web2+Web3 para smoke.',
    seeded_web3_workspace: 'Workspace inicializado para objetivo Web3: {target}',
    seeded_mixed_workspace: 'Workspace inicializado para perfil mixto Web2+Web3.',
    step_ok: 'OK: {step}',
    web3_detected: 'Framework Web3 detectado: {framework} ({network})',
    web3_context_verified: 'Contexto Web3 verificado para red: {network}',
    mixed_context_verified: 'Contexto de perfil mixto verificado (framework: {framework}).',
    invalid_web3_target: 'Objetivo --web3 invalido: {target}. Usa ethereum, solana o cardano.',
    invalid_profile: 'Valor invalido para --profile: {profile}. Usa standard o mixed.',
    profile_conflict: 'No combines --profile=mixed con --web3. Elige un solo modo de perfil.',
    completed: 'Smoke test completado con exito.',
    steps_count: 'Pasos validados: {count}',
    workspace_kept: 'Workspace conservado: {path}',
    workspace_removed: 'Workspace eliminado: {path}'
  },
  package_test: {
    start: 'Ejecutando prueba de paquete desde origen: {sourceDir}',
    pack_done: 'Tarball de paquete creado: {tarball}',
    completed: 'Prueba de paquete completada con {count} pasos validados.',
    workspace: 'Workspace de prueba de paquete: {path}'
  },
  workflow_plan: {
    context_missing:
      'Archivo de contexto no encontrado. Usando workflow de respaldo segun la clasificacion indicada/predeterminada.',
    title: 'Workflow recomendado para clasificacion {classification}:',
    notes: 'Notas:'
  },
  parallel_init: {
    context_missing:
      'Archivo de contexto no encontrado: {path}. Ejecuta setup:context primero.',
    context_invalid: 'Archivo de contexto invalido o no parseable: {path}.',
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
    missing_prereq_count: 'Archivos de contexto prerequisito faltantes: {count}'
  },
  parallel_doctor: {
    invalid_workers:
      'Valor invalido para --workers. Usa un entero entre {min} y {max}.',
    requires_medium:
      'El modo fix de parallel doctor requiere clasificacion MEDIUM (actual: {classification}). Usa --force para forzar.',
    report_title: 'Reporte de parallel doctor: {path}',
    summary: 'Resumen: {passed} correctos, {failed} fallos, {warnings} advertencias.',
    fix_summary: 'Cambios de correccion paralela aplicados: {count}',
    fix_summary_dry_run: '[dry-run] Cambios de correccion paralela planificados: {count}'
  },
  parallel_assign: {
    invalid_workers:
      'Valor invalido para --workers. Usa un entero entre {min} y {max}.',
    context_missing: 'Archivo de contexto no encontrado: {path}.',
    context_invalid: 'Archivo de contexto invalido o no parseable: {path}.',
    requires_medium:
      'La asignacion paralela requiere clasificacion MEDIUM (actual: {classification}). Usa --force para forzar.',
    parallel_missing:
      'Directorio paralelo no encontrado: {path}. Ejecuta parallel:init primero.',
    no_lanes: 'No se encontraron archivos de lanes en .aios-lite/context/parallel.',
    missing_lanes: 'Faltan archivos de lanes para los workers solicitados: {lanes}.',
    source_missing: 'No se pudo resolver el documento fuente con --source={source}.',
    applied: 'Asignacion de alcance paralelo aplicada ({count} item(s) de alcance).',
    dry_run_applied:
      '[dry-run] Asignacion de alcance paralelo planificada ({count} item(s) de alcance).',
    source_info: 'Documento fuente: {source}',
    workers_count: 'Workers: {count}',
    files_count: 'Archivos actualizados: {count}'
  },
  mcp_init: {
    context_missing:
      'Archivo de contexto no encontrado. Generando plan MCP base con supuestos genericos.',
    generated: 'Plan MCP escrito: {path}',
    dry_run_generated: '[dry-run] Se escribiria el plan MCP: {path}',
    server_count: 'Servidores MCP en el plan: {count}',
    preset_count: 'Presets de herramientas generados: {count}',
    preset_written: 'Preset escrito ({tool}): {path}',
    preset_dry_run: '[dry-run] Se escribiria el preset ({tool}): {path}'
  }
};
