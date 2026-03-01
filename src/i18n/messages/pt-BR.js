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
    parse_reason_unknown: 'desconhecido',
    parse_reason_missing_frontmatter: 'delimitador inicial do frontmatter ausente',
    parse_reason_unclosed_frontmatter: 'bloco de frontmatter nao fechado',
    parse_reason_invalid_frontmatter_line: 'sintaxe invalida em linha do frontmatter',
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
    note_status_enabled: 'habilitado',
    note_status_disabled: 'desabilitado',
    note_jetstream_teams: 'Jetstream teams: {status}',
    note_selected_services: 'Servicos selecionados: {services}',
    note_rails_setup_flags: 'Flags de setup do Rails: {flags}',
    note_next_setup_flags: 'Flags de setup do Next.js: {flags}',
    note_next_create_flags: 'Flags do create-next-app: {flags}',
    note_jetstream_existing_action: 'Acao para projeto existente com Jetstream: {action}',
    note_mobile_first:
      'Requisito mobile-first detectado; considere React Native/Expo como proximo passo.',
    note_vps_preference:
      'Preferencia por VPS detectada; mantenha scripts de deploy simples e reproduziveis.',
    note_cloud_profile:
      'Perfil cloud detectado; use banco gerenciado e object storage desde o inicio.',
    note_web3_terms: 'Termos Web3 detectados; recomendacao inicial de dApp aplicada.',
    note_starter_profile:
      'Esta recomendacao e um perfil inicial; ajuste quando os requisitos ficarem mais claros.',
    note_team_profile:
      'Perfil de time selecionado; preserve convencoes explicitas de equipe e regras de CI.',
    note_beginner_declined:
      'Recomendacao inicial recusada; usando stack customizada do onboarding.',
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
    assert_install_files: 'install copiou zero arquivos',
    assert_web3_framework: 'deteccao de framework web3 inesperada: {framework}',
    assert_setup_written: 'setup:context nao gravou o arquivo de contexto',
    assert_setup_project_type_dapp: 'setup nao inferiu project_type=dapp',
    assert_setup_web3_network: 'setup nao inferiu a rede web3 esperada',
    assert_setup_web3_framework: 'setup nao manteve o framework web3 esperado',
    assert_mixed_project_type_dapp: 'perfil mixed nao inferiu project_type=dapp',
    assert_mixed_web3_enabled: 'perfil mixed nao inferiu web3_enabled=true',
    assert_mixed_framework: 'perfil mixed nao priorizou o framework web3 esperado',
    assert_locale_apply_files: 'locale:apply copiou zero arquivos',
    assert_agents_count: 'comando agents retornou contagem inesperada',
    assert_prompt_path: 'agent:prompt nao incluiu o caminho esperado',
    assert_context_validate: 'context:validate falhou',
    assert_web3_context_valid: 'falha ao validar parse do contexto web3',
    assert_web3_context_project_type: 'project_type do contexto nao e dapp',
    assert_web3_context_enabled: 'web3_enabled do contexto nao e true',
    assert_web3_context_network: 'web3_networks do contexto nao inclui o alvo esperado',
    assert_doctor_ok: 'checagem doctor falhou',
    assert_parallel_init_ok: 'parallel:init falhou',
    assert_parallel_init_workers: 'workers de parallel:init nao conferem',
    assert_parallel_assign_ok: 'parallel:assign falhou',
    assert_parallel_assign_scope: 'parallel:assign nao gerou escopos',
    assert_parallel_status_ok: 'parallel:status falhou',
    assert_parallel_status_lanes: 'quantidade de lanes em parallel:status nao confere',
    assert_parallel_doctor_ok: 'parallel:doctor falhou',
    assert_parallel_doctor_summary: 'parallel:doctor reportou falhas',
    completed: 'Smoke test concluido com sucesso.',
    steps_count: 'Etapas validadas: {count}',
    workspace_kept: 'Workspace mantido: {path}',
    workspace_removed: 'Workspace removido: {path}'
  },
  package_test: {
    start: 'Executando teste de pacote a partir da origem: {sourceDir}',
    pack_done: 'Tarball do pacote criado: {tarball}',
    completed: 'Teste de pacote concluido com {count} etapas validadas.',
    workspace: 'Workspace do teste de pacote: {path}',
    error_unknown_detail: 'erro desconhecido',
    error_npm_pack: 'Falha no npm pack: {detail}',
    error_tarball_missing: 'npm pack nao retornou o nome do tarball',
    error_npx_init: 'Falha no npx init: {detail}',
    error_npx_setup_context: 'Falha no npx setup:context: {detail}',
    error_npx_doctor: 'Falha no npx doctor: {detail}',
    error_doctor_not_ok: 'doctor retornou ok=false durante o teste de pacote',
    error_npx_mcp_init: 'Falha no npx mcp:init: {detail}',
    error_mcp_not_ok: 'mcp:init retornou ok=false durante o teste de pacote'
  },
  workflow_plan: {
    context_missing:
      'Arquivo de contexto nao encontrado. Usando workflow de fallback com base na classificacao informada/padrao.',
    title: 'Workflow recomendado para classificacao {classification}:',
    notes: 'Notas:',
    note_framework_not_installed:
      'Framework ainda nao esta instalado; conclua a instalacao da stack antes de @dev.',
    note_dapp_context:
      'Contexto dApp detectado; inclua skills Web3 durante @architect e @dev.',
    note_micro_scope:
      'Mantenha o escopo de implementacao minimo e evite agentes opcionais.'
  },
  parallel_init: {
    context_missing:
      'Arquivo de contexto nao encontrado: {path}. Execute setup:context primeiro.',
    context_invalid: 'Arquivo de contexto invalido ou nao parseavel: {path}.',
    classification_unknown: 'desconhecida',
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
    prefix_ok: 'OK',
    prefix_warn: 'AVISO',
    prefix_fail: 'FALHA',
    invalid_workers:
      'Valor invalido para --workers. Use um inteiro entre {min} e {max}.',
    classification_unknown: 'desconhecida',
    requires_medium:
      'Modo de correcao do parallel doctor requer classificacao MEDIUM (atual: {classification}). Use --force para sobrescrever.',
    report_title: 'Relatorio do parallel doctor: {path}',
    summary: 'Resumo: {passed} aprovados, {failed} falhas, {warnings} avisos.',
    fix_summary: 'Mudancas de correcao paralela aplicadas: {count}',
    fix_summary_dry_run: '[dry-run] Mudancas de correcao paralela planejadas: {count}',
    check_context_exists_ok: 'project.context.md existe.',
    check_context_exists_missing: 'project.context.md esta ausente.',
    check_context_exists_hint: 'Execute setup:context antes do parallel doctor.',
    check_context_parsed_ok: 'project.context.md esta parseavel.',
    check_context_parsed_invalid: 'project.context.md esta invalido.',
    check_context_parsed_hint:
      'Corrija o frontmatter do contexto antes de executar parallel doctor.',
    check_context_classification_ok:
      'Modo paralelo permitido para classificacao {classification}.',
    check_context_classification_invalid:
      'Modo paralelo requer classificacao MEDIUM (atual: {classification}).',
    check_context_classification_hint: 'Use --force para sobrescrever a regra de classificacao.',
    check_parallel_dir_ok: 'Diretorio .aios-lite/context/parallel existe.',
    check_parallel_dir_missing: 'Diretorio .aios-lite/context/parallel esta ausente.',
    check_parallel_dir_hint: 'Execute parallel:init ou parallel:doctor --fix.',
    check_parallel_shared_ok: 'shared-decisions.md esta presente.',
    check_parallel_shared_missing: 'shared-decisions.md esta ausente.',
    check_parallel_shared_hint:
      'Execute parallel:doctor --fix para restaurar os arquivos base.',
    check_lanes_present_ok: '{count} arquivo(s) de lane detectado(s).',
    check_lanes_present_missing: 'Nenhum arquivo de status de lane foi encontrado.',
    check_lanes_present_hint: 'Execute parallel:init ou parallel:doctor --fix.',
    check_lanes_sequence_ok: 'Sequencia de lanes e continua (1..{workers}).',
    check_lanes_sequence_missing: 'Arquivos de lane ausentes na sequencia: {lanes}',
    check_lanes_sequence_hint:
      'Execute parallel:doctor --fix para restaurar as lanes ausentes.',
    check_workers_option: 'Opcao de workers solicitada: {workers}.',
    check_prereq_ok: 'Todos os arquivos de contexto prerequisitos estao presentes.',
    check_prereq_missing: '{count} arquivo(s) de contexto prerequisito ausente(s).',
    check_prereq_hint:
      'Crie os arquivos discovery/architecture/prd antes da orquestracao.'
  },
  parallel_assign: {
    invalid_workers:
      'Valor invalido para --workers. Use um inteiro entre {min} e {max}.',
    context_missing: 'Arquivo de contexto nao encontrado: {path}.',
    context_invalid: 'Arquivo de contexto invalido ou nao parseavel: {path}.',
    classification_unknown: 'desconhecida',
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
    files_count: 'Arquivos atualizados: {count}',
    lane_scope_line: '- lane {lane}: {count} item(ns) de escopo'
  },
  parallel_status: {
    parallel_missing:
      'Diretorio paralelo nao encontrado: {path}. Execute parallel:init primeiro.',
    no_lanes: 'Nenhum arquivo de lane foi encontrado em .aios-lite/context/parallel.',
    title: 'Relatorio de status paralelo: {path}',
    lanes_count: 'Lanes: {count}',
    statuses_title: 'Status:',
    status_line: '- {status}: {count}',
    status_pending: 'pendente',
    status_in_progress: 'em_andamento',
    status_completed: 'concluido',
    status_blocked: 'bloqueado',
    status_other: 'outro',
    scopes_count: 'Total de itens de escopo: {count}',
    deliverables_progress: 'Entregaveis: {completed}/{total} concluidos',
    blockers_count: 'Bloqueios em aberto: {count}',
    shared_decisions: 'Entradas no log de decisoes compartilhadas: {count}',
    lane_line: '- lane {lane}: status={status}, escopo={scope}, bloqueios={blockers}'
  },
  mcp_init: {
    context_missing:
      'Arquivo de contexto nao encontrado. Gerando plano MCP base com suposicoes genericas.',
    invalid_tool: 'Valor invalido para --tool: {tool}. Use um de: {expected}.',
    reason_filesystem: 'Acesso local obrigatorio ao workspace.',
    reason_context7: 'Use documentacao oficial atualizada no momento da implementacao.',
    reason_database_none: 'Nenhuma stack de banco de dados foi detectada ainda.',
    reason_database_enabled:
      'O contexto indica recursos com banco de dados (endpoint MCP remoto recomendado).',
    reason_web_search: 'Util para avaliacao de pacotes e verificacao de release notes.',
    reason_chain_rpc_disabled: 'Web3 esta desabilitado para este projeto.',
    reason_chain_rpc_enabled: 'Contexto dApp detectado; acesso RPC de chain e necessario.',
    reason_makopy: 'Integracao opcional de pipeline de conteudo.',
    note_workspace_local: 'Este e um preset local de workspace gerado pelo AIOS Lite.',
    note_replace_placeholders:
      'Substitua comandos placeholder pelos servidores MCP que voce realmente usa.',
    note_keep_secrets_env:
      'Mantenha segredos em variaveis de ambiente, nunca inline tokens.',
    generated: 'Plano MCP escrito: {path}',
    dry_run_generated: '[dry-run] Plano MCP seria escrito: {path}',
    server_count: 'Servidores MCP no plano: {count}',
    preset_count: 'Presets de ferramentas gerados: {count}',
    preset_written: 'Preset escrito ({tool}): {path}',
    preset_dry_run: '[dry-run] Preset seria escrito ({tool}): {path}'
  },
  mcp_doctor: {
    prefix_ok: 'OK',
    prefix_warn: 'AVISO',
    prefix_fail: 'FALHA',
    context_missing: 'project.context.md nao foi encontrado.',
    context_missing_hint: 'Execute setup primeiro para validacao MCP orientada por contexto.',
    context_parse_invalid: 'project.context.md nao pode ser parseado ({reason}).',
    context_parse_invalid_hint:
      'Corrija a formatacao do contexto para habilitar validacao MCP por stack.',
    context_ok: 'project.context.md esta disponivel e parseavel.',
    plan_missing: 'Arquivo do plano MCP nao encontrado (.aios-lite/mcp/servers.local.json).',
    plan_missing_hint: 'Execute: aios-lite mcp:init',
    plan_invalid: 'JSON do plano MCP invalido: {error}',
    plan_invalid_hint: 'Regenere o plano com: aios-lite mcp:init',
    plan_ok: 'Arquivo do plano MCP presente e com JSON valido.',
    plan_servers_ok: 'Plano MCP declara {count} definicao(oes) de servidor.',
    plan_servers_missing: 'Plano MCP nao possui definicoes de servidor.',
    plan_servers_hint: 'Regenere com: aios-lite mcp:init',
    core_enabled: 'Servidor MCP core "{server}" esta habilitado.',
    core_missing: 'Servidor MCP core "{server}" esta ausente ou desabilitado.',
    core_missing_hint: 'Regenere e mantenha os servidores core basicos habilitados.',
    presets_any_ok: '{count} arquivo(s) de preset MCP encontrado(s).',
    presets_any_missing: 'Nenhum arquivo de preset MCP foi encontrado.',
    presets_any_hint: 'Execute: aios-lite mcp:init',
    presets_coverage_partial: 'Apenas {existing}/{total} presets de ferramentas estao presentes.',
    presets_coverage_partial_hint:
      'Execute: aios-lite mcp:init (sem --tool) para gerar todos os presets.',
    presets_coverage_full:
      'Todos os presets de ferramentas estao presentes (claude, codex, gemini, opencode).',
    env_none_required: 'Nenhuma variavel de ambiente obrigatoria nos servidores MCP habilitados.',
    env_missing: '{missing}/{total} variavel(is) de ambiente obrigatoria(s) ausente(s): {vars}',
    env_missing_hint_strict: 'Defina as variaveis ausentes antes da execucao.',
    env_missing_hint_relaxed:
      'Defina variaveis para prontidao total de runtime. Use --strict-env para falhar nesta checagem.',
    env_all_present: 'Todas as variaveis obrigatorias estao disponiveis ({count}).',
    compat_database_ok: 'Database MCP corresponde ao engine da stack de contexto ({engine}).',
    compat_database_mismatch:
      'Database MCP nao corresponde completamente a stack de contexto ({engine}).',
    compat_database_hint:
      'Regenere com: aios-lite mcp:init, ou ajuste manualmente o servidor de database.',
    compat_web3_ok: 'MCP chain-rpc esta habilitado para contexto Web3.',
    compat_web3_missing: 'Contexto Web3 detectado, mas chain-rpc MCP esta ausente ou desabilitado.',
    compat_web3_missing_hint: 'Regenere com: aios-lite mcp:init',
    compat_web3_unneeded: 'chain-rpc MCP esta habilitado, mas o contexto nao e Web3.',
    compat_web3_unneeded_hint: 'Desabilite chain-rpc se nao for necessario.',
    report_title: 'Relatorio MCP doctor: {path}',
    summary: 'Resumo: {passed} aprovados, {failed} falhas, {warnings} avisos.'
  }
};
