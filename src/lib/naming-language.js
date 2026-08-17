'use strict';

/**
 * Deterministic detection of non-English SOURCE IDENTIFIERS.
 *
 * `.aioson/rules/source-code-language-convention.md` has always said technical
 * identifiers are English while user-facing copy follows the project language.
 * Nothing ever MEASURED it, so a feature-scoped acceptance criterion could
 * translate a whole tree ("servidor/", "rotas/", "nucleo/", "estado.ts") and
 * every gate still went green. This module is that missing measurement.
 *
 * What it looks at — and, just as importantly, what it never looks at:
 *
 *   scanned   path segments, file basenames, and DECLARED identifiers
 *             (class/function/const/type/def/fn/func/struct names).
 *   ignored   string literals, comments, and any user-facing copy. Product
 *             language belongs there by contract; flagging it would be wrong.
 *
 * Two evidence classes keep false positives near zero:
 *
 *   role       a closed lexicon of TECHNICAL scaffolding words that carry an
 *              unambiguous English equivalent (servidor→server, rotas→routes,
 *              criar→create). Domain nouns a product legitimately owns are NOT
 *              in it, so a canonical product vocabulary stays untouched.
 *   morphology suffixes that exist in pt/es and not in English (-cao, -agem,
 *              -dade, -mento, -ador, -encia), plus accented identifiers.
 *
 * Words that are spelled the same in English (data, total, local, media, item,
 * converter, valor, vista) are deliberately absent: an exact-token match on an
 * accent-folded lexicon is the whole false-positive defence.
 *
 * Language-neutral by construction: the scanner asserts nothing about which
 * human language a project speaks — it asserts that technical scaffolding is
 * named in English, which is what the rule says.
 */

const path = require('node:path');
const fs = require('node:fs');

// ─── lexicon: translated technical scaffolding (HIGH confidence) ──────────────
// Accent-folded, lowercase, singular AND plural where both occur in real code.
// Every entry must fail this test to be admitted: "is this also an English
// word, or a word a product could legitimately own as domain vocabulary?"

const ROLE_TOKENS = new Set([
  // layers, structure, artifacts
  'servidor', 'servidores', 'servico', 'servicos', 'servicio', 'servicios',
  'rota', 'rotas', 'ruta', 'rutas', 'nucleo', 'dominio', 'dominios',
  'controlador', 'controladores', 'repositorio', 'repositorios',
  'modelo', 'modelos', 'fabrica', 'fabricas', 'biblioteca', 'bibliotecas',
  'pacote', 'pacotes', 'modulo', 'modulos', 'componente', 'componentes',
  'utilitario', 'utilitarios', 'ajudante', 'auxiliar', 'apoio', 'ajuda',
  'arquivo', 'arquivos', 'archivo', 'archivos', 'ficheiro', 'ficheiros',
  'pasta', 'pastas', 'diretorio', 'diretorios', 'carpeta',
  'tipos', 'estado', 'estados', 'consulta', 'consultas',
  'requisicao', 'requisicoes', 'resposta', 'respostas', 'respuesta',
  'usuario', 'usuarios', 'senha', 'senhas', 'contrasena',
  'erro', 'erros', 'falha', 'falhas', 'teste', 'testes', 'prueba', 'pruebas',
  'formulario', 'formularios', 'botao', 'botoes', 'boton', 'botones',
  'mensagem', 'mensagens', 'mensaje', 'mensajes',
  'pagina', 'paginas', 'pantalla', 'tela', 'telas',
  'midia', 'midias', 'controle', 'controles', 'envio', 'envios',
  'nome', 'nomes', 'numero', 'numeros', 'texto', 'textos',
  'titulo', 'titulos', 'chave', 'chaves',

  // verbs — the strongest signal in a function name
  'criar', 'crear', 'adicionar', 'agregar', 'atualizar', 'actualizar',
  'excluir', 'apagar', 'remover', 'eliminar', 'borrar',
  'buscar', 'pesquisar', 'procurar', 'encontrar',
  'salvar', 'guardar', 'gravar', 'enviar', 'receber', 'listar',
  'obter', 'definir', 'calcular', 'carregar', 'mostrar', 'exibir',
  'ocultar', 'esconder', 'abrir', 'fechar', 'cerrar',
  'iniciar', 'comecar', 'parar', 'copiar', 'colar', 'mover',
  'ordenar', 'filtrar', 'contar', 'somar', 'formatar',
  'validar', 'verificar', 'checar', 'marcar', 'selecionar', 'limpar',
  'editar', 'visualizar', 'gerar', 'processar', 'executar', 'tratar',
  'montar', 'aplicar', 'renderizar', 'atribuir', 'alterar', 'trocar'
]);

// Connective particles: an English identifier never carries one as a token.
const PARTICLE_TOKENS = new Set(['da', 'das', 'dos', 'pelo', 'pela', 'nao', 'dele', 'dela']);

// ─── morphology: pt/es-only shapes (MED confidence) ───────────────────────────

const MORPHOLOGY = [
  { suffix: 'cao', min: 6 }, { suffix: 'coes', min: 7 },
  { suffix: 'agem', min: 6 }, { suffix: 'agens', min: 7 },
  { suffix: 'dade', min: 7 }, { suffix: 'dades', min: 8 },
  { suffix: 'mento', min: 7 }, { suffix: 'mentos', min: 8 },
  { suffix: 'ador', min: 7 }, { suffix: 'adores', min: 8 },
  { suffix: 'encia', min: 7 }, { suffix: 'ancia', min: 7 },
  { suffix: 'avel', min: 8 }, { suffix: 'aveis', min: 8 },
  { suffix: 'eiro', min: 7 }, { suffix: 'eira', min: 7 }
];

// English tokens that happen to end in one of the shapes above.
const MORPHOLOGY_EXCEPTIONS = new Set([
  'memento', 'pimento', 'cacao', 'travel', 'gravel', 'marvel', 'unravel',
  'matador', 'labrador', 'ambassador', 'cascade', 'facade', 'upgrade',
  'increment', 'implement', 'compliment', 'supplement', 'department'
]);

const ACCENTED = /[À-ſ]/;

// ─── tokenizing ───────────────────────────────────────────────────────────────

function fold(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Split an identifier into its words: camelCase, snake_case, kebab-case, digits. */
function tokenize(identifier) {
  return fold(identifier)
    .replace(/([a-z])([0-9])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1);
}

function splitWords(identifier) {
  // camelCase / PascalCase boundaries survive folding, so split before folding.
  return String(identifier)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s._\-/\\]+/)
    .flatMap((part) => tokenize(part))
    .filter(Boolean);
}

/**
 * Classify one identifier (or path segment).
 * @returns {{ kind: 'role'|'morphology'|'particle', token: string }|null}
 */
function classifyIdentifier(identifier) {
  if (!identifier) return null;
  const words = splitWords(identifier);
  if (words.length === 0) return null;

  for (const word of words) {
    if (ROLE_TOKENS.has(word)) return { kind: 'role', token: word };
  }
  if (words.length >= 2) {
    for (const word of words) {
      if (PARTICLE_TOKENS.has(word)) return { kind: 'particle', token: word };
    }
  }
  for (const word of words) {
    if (MORPHOLOGY_EXCEPTIONS.has(word)) continue;
    for (const shape of MORPHOLOGY) {
      if (word.length >= shape.min && word.endsWith(shape.suffix)) {
        return { kind: 'morphology', token: word };
      }
    }
  }
  if (ACCENTED.test(identifier)) return { kind: 'morphology', token: fold(identifier) };
  return null;
}

// ─── declaration extraction (never strings, never comments) ───────────────────

const DECLARATION_PATTERNS = [
  /\b(?:function|class|interface|enum|trait|struct|module)\s+([A-Za-z_$À-ſ][\w$À-ſ]*)/g,
  /\b(?:const|let|var|type)\s+([A-Za-z_$À-ſ][\w$À-ſ]*)/g,
  /\b(?:def|fn|func|sub)\s+(?:\([^)]*\)\s*)?([A-Za-z_$À-ſ][\w$À-ſ]*)/g,
  /\$([A-Za-z_À-ſ][\wÀ-ſ]*)\s*=[^=]/g
];

function stripLiterals(line) {
  return line
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

function isCommentLine(stripped) {
  return stripped.startsWith('//') || stripped.startsWith('*') ||
    stripped.startsWith('#') || stripped.startsWith('/*') || stripped.startsWith('--');
}

// ─── path segments ────────────────────────────────────────────────────────────

const PATH_SKIP = new Set(['src', 'lib', 'app', 'test', 'tests', 'e2e', 'public', 'assets', 'index']);

function scanPathSegments(rel) {
  const hits = [];
  const segments = rel.split('/');
  segments.forEach((segment, i) => {
    const isFile = i === segments.length - 1;
    const bare = isFile ? segment.replace(/\.[^.]+$/, '').replace(/\.(test|spec|stories|d)$/, '') : segment;
    if (!bare || PATH_SKIP.has(fold(bare))) return;
    const hit = classifyIdentifier(bare);
    if (hit) hits.push({ segment: bare, ...hit, where: isFile ? 'filename' : 'directory' });
  });
  return hits;
}

// ─── public scan ──────────────────────────────────────────────────────────────

const MAX_PER_FILE = 6;

/**
 * Is the convention armed for this project?
 *
 * The rule file is the client's override channel: a project that deliberately
 * wants native-language identifiers (a locale-scoped squad, a teaching repo)
 * removes or edits the rule, and the measurement goes quiet with it. Nothing
 * else can switch this off — which is exactly what "rules are supreme" means.
 */
function conventionArmed(targetDir) {
  const rulePath = path.join(targetDir, '.aioson', 'rules', 'source-code-language-convention.md');
  try {
    return fs.statSync(rulePath).isFile();
  } catch {
    return false;
  }
}

/**
 * @param {{ rel: string, lines: string[] }} file
 * @param {(finding: object) => void} push
 */
function scanNamingLanguage(file, push) {
  const { rel, lines } = file;
  const seen = new Set();
  let emitted = 0;

  const emit = (finding) => {
    if (emitted >= MAX_PER_FILE) return;
    const key = `${finding.kind}:${finding.token}`;
    if (seen.has(key)) return;
    seen.add(key);
    emitted += 1;
    push({
      category: 'NAMING_LANGUAGE',
      severity: finding.kind === 'role' ? 'HIGH' : 'MED',
      message: finding.message,
      file: rel,
      line: finding.line,
      // `token` + `scope` are what make a finding identifiable across edits, so
      // a baseline can tell pre-existing debt from a new violation without
      // depending on line numbers that shift on every touch.
      token: finding.token,
      scope: finding.scope || 'file',
      snippet: finding.snippet.slice(0, 120)
    });
  };

  for (const hit of scanPathSegments(rel)) {
    emit({
      kind: hit.kind,
      token: hit.token,
      // A directory violation belongs to the directory, not to each file under
      // it: `servidor/` is one decision, not one per file inside.
      scope: hit.where === 'directory' ? `dir:${hit.segment}` : 'file',
      line: 1,
      message: `non-English ${hit.where} "${hit.segment}" (technical paths and filenames are English — see .aioson/rules/source-code-language-convention.md)`,
      snippet: rel
    });
  }

  lines.forEach((raw, i) => {
    const stripped = raw.trim();
    if (!stripped || isCommentLine(stripped)) return;
    const code = stripLiterals(stripped);
    for (const pattern of DECLARATION_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const name = match[1];
        const hit = classifyIdentifier(name);
        if (!hit) continue;
        emit({
          kind: hit.kind,
          token: name,
          line: i + 1,
          message: `non-English identifier "${name}" (declared name translated from the project language — see .aioson/rules/source-code-language-convention.md)`,
          snippet: stripped
        });
      }
    }
  });
}

module.exports = {
  scanNamingLanguage,
  classifyIdentifier,
  conventionArmed,
  splitWords,
  ROLE_TOKENS
};
