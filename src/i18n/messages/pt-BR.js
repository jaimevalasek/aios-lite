'use strict';

module.exports = {
  cli: {
    title: 'CLI do AIOS Lite',
    usage: 'Uso:',
    help_init: 'aios-lite init <project-name> [--force] [--dry-run] [--locale=pt-BR]',
    help_install: 'aios-lite install [path] [--force] [--dry-run] [--locale=pt-BR]',
    help_update: 'aios-lite update [path] [--dry-run] [--locale=pt-BR]',
    help_info: 'aios-lite info [path] [--json] [--locale=pt-BR]',
    help_doctor: 'aios-lite doctor [path] [--fix] [--dry-run] [--json] [--locale=pt-BR]',
    help_i18n_add: 'aios-lite i18n:add <locale> [--force] [--dry-run] [--locale=pt-BR]',
    help_agents: 'aios-lite agents [path] [--lang=en|pt-BR|es|fr] [--locale=pt-BR]',
    help_agent_prompt:
      'aios-lite agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=pt-BR]',
    help_context_validate: 'aios-lite context:validate [path] [--json] [--locale=pt-BR]',
    help_setup_context:
      'aios-lite setup:context [path] [--defaults] [--project-type=web_app|api|site|script|dapp] [--language=pt-BR] [--web3-enabled=true|false] [--locale=pt-BR]',
    help_locale_apply:
      'aios-lite locale:apply [path] [--lang=en|pt-BR|es|fr] [--dry-run] [--locale=pt-BR]',
    help_test_smoke:
      'aios-lite test:smoke [workspace-path] [--lang=en|pt-BR|es|fr] [--web3=ethereum|solana|cardano] [--profile=standard|mixed|parallel] [--keep] [--json] [--locale=pt-BR]',
    help_test_package:
      'aios-lite test:package [source-path] [--keep] [--dry-run] [--json] [--locale=pt-BR]',
    help_workflow_plan:
      'aios-lite workflow:plan [path] [--classification=MICRO|SMALL|MEDIUM] [--json] [--locale=pt-BR]',
    help_parallel_init:
      'aios-lite parallel:init [path] [--workers=2..6] [--force] [--dry-run] [--json] [--locale=pt-BR]',
    help_parallel_doctor:
      'aios-lite parallel:doctor [path] [--workers=2..6] [--fix] [--force] [--dry-run] [--json] [--locale=pt-BR]',
    help_parallel_assign:
      'aios-lite parallel:assign [path] [--source=auto|prd|architecture|discovery|<file>] [--workers=2..6] [--force] [--dry-run] [--json] [--locale=pt-BR]',
    help_parallel_status:
      'aios-lite parallel:status [path] [--json] [--locale=pt-BR]',
    help_mcp_init:
      'aios-lite mcp:init [path] [--tool=claude|codex|gemini|opencode] [--dry-run] [--json] [--locale=pt-BR]',
    help_mcp_doctor:
      'aios-lite mcp:doctor [path] [--strict-env] [--json] [--locale=pt-BR]',
    unknown_command: 'Comando desconhecido: {command}',
    error_prefix: 'Erro: {message}'
  },
  init: {
    usage_error: 'Uso: aios-lite init <project-name> [--force] [--dry-run] [--locale=pt-BR]',
    non_empty_dir: 'Diretorio nao esta vazio: {targetDir}. Use --force para continuar.',
    created_at: 'Projeto criado em: {targetDir}',
    files_copied: 'Arquivos copiados: {count}',
    files_skipped: 'Arquivos ignorados: {count}',
    next_steps: 'Proximos passos:',
    step_cd: '1. cd {projectName}',
    step_setup: '2. Abra na sua AI CLI e execute @setup'
  },
  install: {
    framework_detected: 'Framework detectado: {framework} ({evidence})',
    framework_not_detected: 'Nenhum framework detectado. Instalando em modo generico.',
    done_at: 'Instalacao concluida em: {targetDir}',
    files_copied: 'Arquivos copiados: {count}',
    files_skipped: 'Arquivos ignorados: {count}'
  },
  update: {
    not_installed: 'Nenhuma instalacao do AIOS Lite encontrada em {targetDir}.',
    done_at: 'Atualizacao concluida em: {targetDir}',
    files_updated: 'Arquivos atualizados: {count}',
    backups_created: 'Backups criados: {count}'
  },
  info: {
    cli_version: 'AIOS Lite CLI: v{version}',
    directory: 'Diretorio: {targetDir}',
    installed_here: 'Instalado neste diretorio: {value}',
    framework_detected: 'Framework detectado: {framework}',
    evidence: 'Evidencia: {evidence}',
    yes: 'sim',
    no: 'nao',
    none: 'nenhum'
  },
  doctor: {
    ok: 'OK',
    fail: 'FALHA',
    diagnosis_ok: 'Diagnostico: instalacao saudavel.',
    diagnosis_fail: 'Diagnostico: {count} problema(s) encontrado(s).',
    hint_prefix: '-> {hint}',
    required_file: 'Arquivo obrigatorio: {rel}',
    context_generated: 'Contexto principal gerado',
    context_hint: 'Execute @setup para gerar .aios-lite/context/project.context.md',
    context_frontmatter_valid: 'Frontmatter do contexto do projeto esta valido',
    context_frontmatter_valid_hint:
      'Garanta que project.context.md comeca com frontmatter YAML delimitado por ---',
    context_frontmatter_invalid: 'Frontmatter do contexto do projeto esta invalido ({reason})',
    context_frontmatter_invalid_hint:
      'Reescreva project.context.md usando o formato de saida do @setup.',
    context_required_field: 'Campo obrigatorio ausente no contexto: {field}',
    context_required_field_hint:
      'Execute novamente @setup e confirme que todos os campos obrigatorios estao presentes.',
    context_framework_installed_type: '`framework_installed` deve ser booleano (true/false)',
    context_framework_installed_type_hint:
      'Defina framework_installed como true ou false sem aspas.',
    context_classification_value: '`classification` deve ser um de {expected}',
    context_classification_value_hint: 'Use MICRO, SMALL ou MEDIUM exatamente.',
    context_project_type_value: '`project_type` deve ser um de {expected}',
    context_project_type_value_hint: 'Use web_app, api, site, script ou dapp exatamente.',
    context_profile_value: '`profile` deve ser um de {expected}',
    context_profile_value_hint: 'Use developer, beginner ou team exatamente.',
    context_conversation_language_format:
      '`conversation_language` nao e uma tag BCP-47 valida',
    context_conversation_language_format_hint: 'Use valores como en, en-US, pt-BR.',
    node_version: 'Node.js >= 18 (atual: {version})',
    fix_start: 'Modo de correcao segura habilitado.',
    fix_start_dry_run: 'Modo de correcao segura habilitado (dry-run).',
    fix_action_required_files: 'Restaurar arquivos gerenciados ausentes a partir do template',
    fix_action_locale_sync: 'Sincronizar prompts ativos dos agentes com o idioma do contexto',
    fix_not_applicable: 'Nao aplicavel para o estado atual.',
    fix_target_count: 'Alvos identificados: {count}',
    fix_applied_count: 'Mudancas aplicadas: {count}',
    fix_planned_count: 'Mudancas planejadas: {count}',
    fix_locale: 'Locale resolvido: {locale}',
    fix_summary: 'Mudancas de correcao segura aplicadas: {count}',
    fix_summary_dry_run: '[dry-run] Mudancas de correcao segura planejadas: {count}'
  },
  i18n_add: {
    usage_error: 'Uso: aios-lite i18n:add <locale> [--force] [--dry-run] [--locale=pt-BR]',
    invalid_locale: 'Codigo de locale invalido: {locale}. Formatos esperados como en, fr, pt-br.',
    base_locale: 'O locale "en" e o dicionario base e nao pode ser gerado.',
    locale_exists: 'Arquivo de locale ja existe: {path}. Use --force para sobrescrever.',
    dry_run_created: '[dry-run] O scaffold de locale seria criado: {locale}',
    dry_run_overwritten: '[dry-run] O scaffold de locale seria sobrescrito: {locale}',
    created: 'Scaffold de locale criado: {locale}',
    overwritten: 'Scaffold de locale sobrescrito: {locale}',
    file_path: 'Arquivo de locale: {path}',
    next_steps: 'Proximos passos:',
    step_translate: '1. Substitua as strings em ingles pelos textos traduzidos nesse arquivo.',
    step_try: '2. Execute a CLI com --locale={locale} para validar o novo dicionario.'
  },
  agents: {
    list_title: 'Agentes disponiveis (locale resolvido: {locale}):',
    path: 'Caminho',
    active_path: 'Caminho ativo',
    depends: 'Depende de',
    output: 'Saida',
    none: 'nenhum',
    prompt_usage_error:
      'Uso: aios-lite agent:prompt <agent> [path] [--tool=codex|claude|gemini|opencode] [--lang=en|pt-BR|es|fr] [--locale=pt-BR]',
    prompt_unknown_agent: 'Agente desconhecido: {agent}',
    prompt_title: 'Prompt para o agente "{agent}" na ferramenta "{tool}" (locale: {locale}):'
  },
  context_validate: {
    missing_file: 'Arquivo de contexto nao encontrado: {path}',
    hint_setup: 'Execute @setup para gerar o arquivo primeiro.',
    invalid_frontmatter: 'O arquivo de contexto tem frontmatter YAML invalido.',
    file_path: 'Arquivo de contexto: {path}',
    parse_reason: 'Motivo do parse: {reason}',
    hint_fix_frontmatter: 'Use @setup para regenerar um arquivo de contexto valido.',
    invalid_fields: 'O arquivo de contexto foi lido, mas tem problemas de validacao:',
    valid: 'O arquivo de contexto esta valido.'
  },
  setup_context: {
    detected: 'Framework detectado: {framework} (installed={installed})',
    q_project_name: 'Nome do projeto',
    q_project_type: 'Tipo do projeto (web_app|api|site|script|dapp)',
    q_profile: 'Perfil: [1] developer [2] beginner [3] team',
    q_use_detected_framework: 'Usar framework detectado? (true/false)',
    q_framework: 'Framework',
    q_framework_installed: 'Framework instalado? (true/false)',
    q_language: 'Idioma da conversa (por exemplo en ou pt-BR)',
    q_backend_menu:
      'Backend: [1] Laravel [2] Rails [3] Django [4] Node/Express [5] Next.js [6] Nuxt [7] Hardhat [8] Foundry [9] Truffle [10] Anchor [11] Solana Web3 [12] Cardano [13] Other',
    q_backend_text: 'Backend (texto livre)',
    q_laravel_version: 'Versao do Laravel (por exemplo 11, 10)',
    q_frontend_menu:
      'Frontend: [1] TALL Stack [2] VILT Stack [3] Blade [4] Next.js [5] Nuxt [6] React [7] Vue [8] Other',
    q_frontend_text: 'Frontend (texto livre)',
    q_auth_menu:
      'Auth (Laravel): [1] Breeze [2] Jetstream + Livewire [3] Filament Shield [4] Custom',
    q_web3_enabled: 'Web3 habilitado? (true/false)',
    q_web3_networks: 'Redes Web3 (por exemplo ethereum, solana, cardano)',
    q_contract_framework: 'Framework de contratos (por exemplo Hardhat, Foundry, Anchor, Aiken)',
    q_wallet_provider: 'Wallet provider (por exemplo wagmi, RainbowKit, Phantom, Lace)',
    q_indexer: 'Indexer (por exemplo The Graph, Helius, Blockfrost)',
    q_rpc_provider: 'RPC provider (por exemplo Alchemy, Infura, QuickNode)',
    q_jetstream_teams: 'Jetstream com teams habilitado? (true/false)',
    q_jetstream_existing_action:
      'Projeto Laravel existente sem Jetstream detectado. Acao: [1] continuar sem Jetstream [2] recriar com Jetstream (recomendado) [3] instalacao manual (risco)',
    q_auth_text: 'Estrategia de autenticacao (texto livre)',
    q_uiux_menu: 'UI/UX: [1] Tailwind [2] Flux UI [3] shadcn/ui [4] Filament',
    q_uiux_text: 'Abordagem de UI/UX (texto livre)',
    q_database_menu:
      'Banco de dados: [1] MySQL [2] PostgreSQL [3] SQLite [4] MongoDB [5] Supabase [6] PlanetScale',
    q_database_text: 'Banco de dados (texto livre)',
    q_services_list:
      'Servicos adicionais (lista separada por virgula): queues, storage, websockets, payments, email, cache, search',
    q_rails_options:
      'Opcoes usadas no Rails (lista por virgula, ex: --database=postgresql,--css=tailwind,--api)',
    q_next_options:
      'Opcoes do create-next-app (lista por virgula, ex: TypeScript,ESLint,Tailwind CSS,App Router,src/ directory)',
    q_beginner_summary: 'Descreva seu projeto em uma frase',
    q_beginner_users:
      'Usuarios esperados: [1] pessoal/pequeno ate 10 [2] time pequeno ate 100 [3] clientes externos',
    q_beginner_mobile: 'Requisito mobile: [1] app mobile [2] web responsiva [3] apenas desktop',
    q_beginner_hosting: 'Preferencia de hospedagem: [1] gerenciado simples [2] VPS [3] cloud provider',
    q_beginner_accept_recommendation: 'Aceitar recomendacao inicial? (true/false)',
    beginner_recommendation:
      'Recomendacao inicial -> framework: {framework}, frontend: {frontend}, database: {database}, auth: {auth}',
    q_user_types: 'Quantos tipos de usuario?',
    q_integrations: 'Quantas integracoes externas?',
    q_rules_complexity: 'Complexidade de regras (none|some|complex)',
    written: 'Arquivo de contexto escrito: {path}',
    classification_result: 'Classificacao: {classification} (score={score}/6)',
    locale_applied: 'Pacote de agentes localizado aplicado: {locale} ({count} arquivos)'
  },
  locale_apply: {
    applied: 'Pacote de locale aplicado: {locale}',
    dry_run_applied: '[dry-run] Pacote de locale seria aplicado: {locale}',
    copied_count: 'Arquivos copiados: {count}',
    missing_count: 'Arquivos de locale ausentes: {count}'
  },
  smoke: {
    start: 'Executando smoke test em: {projectDir}',
    using_web3_profile: 'Usando perfil Web3 de smoke: {target}',
    using_mixed_profile: 'Usando perfil misto Web2+Web3 para smoke test.',
    using_parallel_profile: 'Usando perfil de smoke para orquestracao paralela.',
    seeded_web3_workspace: 'Workspace inicializado para alvo Web3: {target}',
    seeded_mixed_workspace: 'Workspace inicializado para perfil misto Web2+Web3.',
    seeded_parallel_context: 'Contexto discovery/architecture/prd inicializado para perfil paralelo.',
    step_ok: 'OK: {step}',
    web3_detected: 'Framework Web3 detectado: {framework} ({network})',
    web3_context_verified: 'Contexto Web3 verificado para rede: {network}',
    mixed_context_verified: 'Contexto do perfil misto verificado (framework: {framework}).',
    parallel_status_verified: 'Status paralelo verificado para lanes: {count}',
    invalid_web3_target: 'Alvo --web3 invalido: {target}. Use ethereum, solana ou cardano.',
    invalid_profile: 'Valor invalido para --profile: {profile}. Use standard, mixed ou parallel.',
    profile_conflict: 'Nao combine --profile=mixed com --web3. Escolha um modo de perfil.',
    completed: 'Smoke test concluido com sucesso.',
    steps_count: 'Etapas validadas: {count}',
    workspace_kept: 'Workspace mantido: {path}',
    workspace_removed: 'Workspace removido: {path}'
  },
  package_test: {
    start: 'Executando teste de pacote a partir da origem: {sourceDir}',
    pack_done: 'Tarball do pacote criado: {tarball}',
    completed: 'Teste de pacote concluido com {count} etapas validadas.',
    workspace: 'Workspace do teste de pacote: {path}'
  },
  workflow_plan: {
    context_missing:
      'Arquivo de contexto nao encontrado. Usando workflow de fallback com base na classificacao informada/padrao.',
    title: 'Workflow recomendado para classificacao {classification}:',
    notes: 'Notas:'
  },
  parallel_init: {
    context_missing:
      'Arquivo de contexto nao encontrado: {path}. Execute setup:context primeiro.',
    context_invalid: 'Arquivo de contexto invalido ou nao parseavel: {path}.',
    requires_medium:
      'Inicializacao paralela so e suportada para classificacao MEDIUM (atual: {classification}). Use --force para sobrescrever.',
    invalid_workers:
      'Valor invalido para --workers. Use um inteiro entre {min} e {max}.',
    already_exists:
      'Arquivos de contexto paralelo ja existem ({count}). Use --force para sobrescrever.',
    prepared: 'Workspace paralelo inicializado em: {path}',
    dry_run_prepared: '[dry-run] Workspace paralelo seria inicializado em: {path}',
    workers_count: 'Workers: {count}',
    files_count: 'Arquivos preparados: {count}',
    missing_prereq_count: 'Arquivos de contexto prerequisitos ausentes: {count}'
  },
  parallel_doctor: {
    invalid_workers:
      'Valor invalido para --workers. Use um inteiro entre {min} e {max}.',
    requires_medium:
      'Modo de correcao do parallel doctor requer classificacao MEDIUM (atual: {classification}). Use --force para sobrescrever.',
    report_title: 'Relatorio do parallel doctor: {path}',
    summary: 'Resumo: {passed} aprovados, {failed} falhas, {warnings} avisos.',
    fix_summary: 'Mudancas de correcao paralela aplicadas: {count}',
    fix_summary_dry_run: '[dry-run] Mudancas de correcao paralela planejadas: {count}'
  },
  parallel_assign: {
    invalid_workers:
      'Valor invalido para --workers. Use um inteiro entre {min} e {max}.',
    context_missing: 'Arquivo de contexto nao encontrado: {path}.',
    context_invalid: 'Arquivo de contexto invalido ou nao parseavel: {path}.',
    requires_medium:
      'A atribuicao paralela requer classificacao MEDIUM (atual: {classification}). Use --force para sobrescrever.',
    parallel_missing:
      'Diretorio paralelo nao encontrado: {path}. Execute parallel:init primeiro.',
    no_lanes: 'Nenhum arquivo de lane foi encontrado em .aios-lite/context/parallel.',
    missing_lanes: 'Arquivos de lane ausentes para os workers solicitados: {lanes}.',
    source_missing: 'Nao foi possivel resolver o documento de origem com --source={source}.',
    applied: 'Atribuicao de escopo paralelo aplicada ({count} item(ns) de escopo).',
    dry_run_applied:
      '[dry-run] Atribuicao de escopo paralelo planejada ({count} item(ns) de escopo).',
    source_info: 'Documento de origem: {source}',
    workers_count: 'Workers: {count}',
    files_count: 'Arquivos atualizados: {count}'
  },
  parallel_status: {
    parallel_missing:
      'Diretorio paralelo nao encontrado: {path}. Execute parallel:init primeiro.',
    no_lanes: 'Nenhum arquivo de lane foi encontrado em .aios-lite/context/parallel.',
    title: 'Relatorio de status paralelo: {path}',
    lanes_count: 'Lanes: {count}',
    statuses_title: 'Status:',
    scopes_count: 'Total de itens de escopo: {count}',
    deliverables_progress: 'Entregaveis: {completed}/{total} concluidos',
    blockers_count: 'Bloqueios em aberto: {count}',
    shared_decisions: 'Entradas no log de decisoes compartilhadas: {count}'
  },
  mcp_init: {
    context_missing:
      'Arquivo de contexto nao encontrado. Gerando plano MCP base com suposicoes genericas.',
    generated: 'Plano MCP escrito: {path}',
    dry_run_generated: '[dry-run] Plano MCP seria escrito: {path}',
    server_count: 'Servidores MCP no plano: {count}',
    preset_count: 'Presets de ferramentas gerados: {count}',
    preset_written: 'Preset escrito ({tool}): {path}',
    preset_dry_run: '[dry-run] Preset seria escrito ({tool}): {path}'
  }
};
