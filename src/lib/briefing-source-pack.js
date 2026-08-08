'use strict';

const fs = require('node:fs/promises');
const fsNative = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { collectStagedSecretFindings } = require('./security/staged-secret-detector');
const {
  resolveExistingInsideRoot,
  validateFeatureSlug
} = require('../verification/path-policy');

const SOURCE_PACK_MODULE = '.aioson/docs/briefing/source-pack-intake.md';
const SQL_SOURCE_MODULE = '.aioson/docs/briefing/sql-as-documentation.md';
const MAX_PACK_FILES = 500;
const MAX_DIRECT_READ_BYTES = 512 * 1024;
const LARGE_PACK_BYTES = 8 * 1024 * 1024;

const SKIPPED_DIRECTORIES = new Set([
  '.git', '.aioson', '.cache', '.next', '.turbo',
  'node_modules', 'dist', 'build', 'coverage', 'vendor'
]);

const ARCHIVE_ROOT_DIRECTORIES = new Set([
  'archive', 'archives', 'archived', 'done'
]);

const IGNORED_FILES = new Set([
  '.ds_store', 'thumbs.db', 'desktop.ini'
]);

const DOCUMENTATION_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.rst', '.adoc']);
const STRUCTURED_EXTENSIONS = new Set([
  '.json', '.jsonc', '.yaml', '.yml', '.toml', '.xml',
  '.graphql', '.gql', '.proto', '.prisma'
]);
const SOURCE_CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx',
  '.py', '.php', '.rb', '.java', '.kt', '.kts',
  '.go', '.rs', '.cs', '.sh', '.bash', '.ps1'
]);
const TABULAR_EXTENSIONS = new Set(['.csv', '.tsv']);
const VISUAL_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const DOCUMENT_EXTENSIONS = new Set(['.pdf']);
const BLOCKED_BINARY_EXTENSIONS = new Set([
  '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.pem', '.key', '.p12', '.pfx', '.jks', '.keystore'
]);

const SENSITIVE_BASENAMES = new Set([
  '.env', 'credentials.json', 'service-account.json',
  'service_account.json', 'aioson-models.json', 'id_rsa', 'id_ed25519'
]);

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function normalizeExtension(fileName) {
  const lower = String(fileName || '').toLowerCase();
  if (lower === '.env' || lower.startsWith('.env.')) return '.env';
  return path.extname(lower);
}

function naturalCompare(left, right) {
  return String(left).localeCompare(String(right), 'en', {
    numeric: true,
    sensitivity: 'base'
  });
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fsNative.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

function isSensitivePath(relativePath) {
  const normalized = toPosix(relativePath).toLowerCase();
  const base = path.posix.basename(normalized);
  if (SENSITIVE_BASENAMES.has(base)) return true;
  if (base.startsWith('.env.')) return true;
  if (/^(?:credentials?|secrets?)(?:[._-].+)?\.(?:json|ya?ml|toml|txt)$/i.test(base)) return true;
  return false;
}

function isProbablyBinary(buffer) {
  if (!buffer || buffer.length === 0) return false;
  if (buffer.includes(0)) return true;
  let controls = 0;
  for (const byte of buffer) {
    if (byte < 9 || (byte > 13 && byte < 32)) controls += 1;
  }
  return controls / buffer.length > 0.08;
}

async function readInspectionText(filePath, size) {
  const bytes = Math.min(Number(size) || 0, MAX_DIRECT_READ_BYTES);
  if (bytes === 0) return { text: '', binary: false, complete: true };
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    const sample = buffer.subarray(0, bytesRead);
    const binary = isProbablyBinary(sample);
    return {
      text: binary ? '' : sample.toString('utf8'),
      binary,
      complete: size <= MAX_DIRECT_READ_BYTES
    };
  } finally {
    await handle.close();
  }
}

function countMatches(text, pattern) {
  return (String(text || '').match(pattern) || []).length;
}

function cleanSqlObject(value) {
  return String(value || '')
    .replace(/[`"\[\]]/g, '')
    .replace(/[;,]+$/g, '')
    .trim();
}

function collectSqlObjects(text) {
  const objects = new Set();
  const patterns = [
    /\b(?:create|alter|drop)\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?([`"\[\]A-Za-z0-9_.-]+)/gi,
    /\bcreate\s+(?:or\s+replace\s+)?view\s+([`"\[\]A-Za-z0-9_.-]+)/gi,
    /\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure|trigger)\s+([`"\[\]A-Za-z0-9_.-]+)/gi,
    /\breferences\s+([`"\[\]A-Za-z0-9_.-]+)/gi
  ];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null && objects.size < 100) {
      const object = cleanSqlObject(match[1]);
      if (object) objects.add(object);
    }
  }
  return [...objects].sort(naturalCompare);
}

function detectSqlDialects(text) {
  const dialects = [];
  if (/\b(?:serial|bigserial|plpgsql|returning)\b|::[A-Za-z_]/i.test(text)) dialects.push('postgresql');
  if (/\b(?:auto_increment|engine\s*=|unsigned)\b|`[^`]+`/i.test(text)) dialects.push('mysql');
  if (/\b(?:pragma|without\s+rowid|autoincrement)\b/i.test(text)) dialects.push('sqlite');
  if (/\b(?:nvarchar|identity\s*\(|uniqueidentifier)\b|^\s*go\s*$/im.test(text)) dialects.push('sqlserver');
  return dialects.length > 0 ? [...new Set(dialects)] : ['unknown'];
}

function analyzeSql(text, relativePath) {
  const normalizedPath = toPosix(relativePath).toLowerCase();
  const base = path.posix.basename(normalizedPath);
  const operations = {
    create_table: countMatches(text, /\bcreate\s+table\b/gi),
    alter_table: countMatches(text, /\balter\s+table\b/gi),
    drop_table: countMatches(text, /\bdrop\s+table\b/gi),
    create_view: countMatches(text, /\bcreate\s+(?:or\s+replace\s+)?view\b/gi),
    create_trigger: countMatches(text, /\bcreate\s+(?:or\s+replace\s+)?trigger\b/gi),
    create_routine: countMatches(text, /\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\b/gi),
    insert: countMatches(text, /\binsert\s+into\b/gi),
    update: countMatches(text, /\bupdate\s+[`"\[A-Za-z_]/gi),
    delete: countMatches(text, /\bdelete\s+from\b/gi),
    copy: countMatches(text, /\bcopy\s+[`"\[A-Za-z_].*\bfrom\s+stdin\b/gi)
  };
  const ddlCount = operations.create_table + operations.alter_table + operations.drop_table
    + operations.create_view + operations.create_trigger + operations.create_routine;
  const dmlCount = operations.insert + operations.update + operations.delete + operations.copy;
  const namedMigration = /(^|\/)migrations?(\/|$)/i.test(normalizedPath)
    || /^(?:v?\d{3,}|\d{4}[-_]?\d{2}[-_]?\d{2})[-_.]/i.test(base);
  const namedData = /(?:^|[-_.])(seed|dump|data|export|backup)(?:[-_.]|$)/i.test(base);
  const namedSchema = /(?:^|[-_.])(schema|structure|ddl)(?:[-_.]|$)/i.test(base);
  const containsRowData = namedData
    || operations.copy > 0
    || /\binsert\s+into\b[\s\S]{0,500}?\bvalues\s*\(\s*(?!(?:new|old)\s*\.)/i.test(text);

  let kind = 'sql_source';
  if (namedData || (containsRowData && ddlCount === 0)) kind = 'sql_data';
  else if (namedMigration || operations.alter_table > 0 || operations.drop_table > 0) kind = 'sql_migration';
  else if (namedSchema || operations.create_table > 0) kind = 'sql_schema';

  return {
    kind,
    dialect_hints: detectSqlDialects(text),
    operations,
    objects: collectSqlObjects(text),
    has_ddl: ddlCount > 0,
    has_data_statements: dmlCount > 0,
    contains_row_data: containsRowData
  };
}

function classifyPath(relativePath) {
  const normalized = toPosix(relativePath).toLowerCase();
  const base = path.posix.basename(normalized);
  const extension = normalizeExtension(base);

  if (isSensitivePath(normalized)) return { kind: 'sensitive', family: 'blocked' };
  if (extension === '.sql') return { kind: 'sql_source', family: 'database' };
  if (DOCUMENTATION_EXTENSIONS.has(extension)) return { kind: 'documentation', family: 'documentation' };
  if (STRUCTURED_EXTENSIONS.has(extension)) return { kind: 'structured_source', family: 'structured' };
  if (SOURCE_CODE_EXTENSIONS.has(extension)) return { kind: 'source_code', family: 'code' };
  if (TABULAR_EXTENSIONS.has(extension)) return { kind: 'tabular_data', family: 'data' };
  if (VISUAL_EXTENSIONS.has(extension)) return { kind: 'visual_reference', family: 'visual' };
  if (DOCUMENT_EXTENSIONS.has(extension)) return { kind: 'document_reference', family: 'document' };
  if (BLOCKED_BINARY_EXTENSIONS.has(extension)) return { kind: 'blocked_binary', family: 'blocked' };
  return { kind: 'unknown', family: 'unknown' };
}

function inferRole(relativePath, kind) {
  const normalized = toPosix(relativePath).toLowerCase();
  const base = path.posix.basename(normalized);
  if (kind === 'sensitive' || kind === 'blocked_binary' || kind === 'binary') return 'blocked';
  if (kind === 'sql_migration' || /(?:migration|history|changelog)/i.test(normalized)) return 'history';
  if (kind === 'sql_data' || /(?:sample|example|fixture|seed|mock|payload)/i.test(normalized)) return 'example';
  if (/(?:brief|idea|intent|requirement|requisit|scope|escopo|notes?|readme)/i.test(base)) return 'intent';
  if (kind === 'sql_schema' || kind === 'sql_source' || kind === 'source_code') return 'current_state';
  if (/(?:openapi|swagger|schema|contract|graphql|proto)/i.test(base)) return 'contract';
  if (kind === 'visual_reference' || kind === 'document_reference') return 'reference';
  return 'auxiliary';
}

function loadPolicyFor({ kind, role, size, binary, secretFindings, sql }) {
  if (role === 'blocked' || binary || secretFindings.length > 0) return 'blocked';
  if (size > MAX_DIRECT_READ_BYTES) return 'metadata_only';
  if (kind === 'visual_reference' || kind === 'document_reference' || kind === 'tabular_data') {
    return 'metadata_only';
  }
  if (kind === 'unknown') return 'metadata_only';
  if (sql && sql.contains_row_data) return 'metadata_only';
  return 'read';
}

async function walkSourceDirectory(absoluteRoot, relativeRoot) {
  const files = [];
  const ignored = [];
  const skippedDirectories = [];
  const symlinks = [];

  async function walk(absoluteDir, relativeDir) {
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => []);
    entries.sort((left, right) => naturalCompare(left.name, right.name));
    for (const entry of entries) {
      const relativePath = `${relativeDir}/${entry.name}`.replace(/\\/g, '/');
      const lowerName = entry.name.toLowerCase();
      if (entry.isSymbolicLink()) {
        symlinks.push(relativePath);
        continue;
      }
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(lowerName)) {
          skippedDirectories.push(relativePath);
          continue;
        }
        await walk(path.join(absoluteDir, entry.name), relativePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (IGNORED_FILES.has(lowerName)) {
        ignored.push(relativePath);
        continue;
      }
      const absolutePath = path.join(absoluteDir, entry.name);
      const stat = await fs.stat(absolutePath);
      files.push({
        path: relativePath,
        absolute_path: absolutePath,
        size: stat.size
      });
    }
  }

  await walk(absoluteRoot, relativeRoot);
  files.sort((left, right) => naturalCompare(left.path, right.path));
  return {
    files,
    ignored: ignored.sort(naturalCompare),
    skipped_directories: skippedDirectories.sort(naturalCompare),
    symlinks: symlinks.sort(naturalCompare)
  };
}

async function collectBriefingSourceFiles(targetDir, slug) {
  const validation = validateFeatureSlug(slug);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.reason,
      slug: String(slug || ''),
      files: []
    };
  }
  const relativeRoot = `plans/${validation.feature_slug}`;
  const resolved = await resolveExistingInsideRoot(targetDir, relativeRoot);
  if (!resolved.ok) {
    return {
      ok: false,
      error: resolved.reason === 'path_missing' ? 'source_pack_not_found' : resolved.reason,
      slug: validation.feature_slug,
      path: relativeRoot,
      files: []
    };
  }
  const stat = await fs.stat(resolved.real_path);
  if (!stat.isDirectory()) {
    return {
      ok: false,
      error: 'source_pack_not_directory',
      slug: validation.feature_slug,
      path: relativeRoot,
      files: []
    };
  }
  const walked = await walkSourceDirectory(resolved.real_path, relativeRoot);
  return {
    ok: true,
    slug: validation.feature_slug,
    path: relativeRoot,
    ...walked
  };
}

function summarizeEntries(entries) {
  const extensionCounts = {};
  const familyCounts = {};
  let totalBytes = 0;
  for (const entry of entries) {
    const extension = normalizeExtension(entry.path) || '(none)';
    const { family } = classifyPath(entry.path);
    extensionCounts[extension] = (extensionCounts[extension] || 0) + 1;
    familyCounts[family] = (familyCounts[family] || 0) + 1;
    totalBytes += Number(entry.size) || 0;
  }
  return {
    file_count: entries.length,
    total_bytes: totalBytes,
    extension_counts: extensionCounts,
    family_counts: familyCounts,
    has_sql: Boolean(extensionCounts['.sql']),
    mixed: Object.keys(familyCounts).filter((family) => family !== 'unknown').length > 1,
    sample_paths: entries.slice(0, 8).map((entry) => entry.path)
  };
}

async function discoverBriefingSourcePacks(targetDir) {
  const plans = await resolveExistingInsideRoot(targetDir, 'plans');
  if (!plans.ok) {
    if (plans.reason === 'path_missing') {
      return {
        ok: true,
        plans_root: 'plans',
        packs: [],
        loose_files: [],
        ignored_directories: [],
        warnings: ['plans_missing']
      };
    }
    return {
      ok: false,
      error: plans.reason,
      plans_root: 'plans',
      packs: [],
      loose_files: [],
      ignored_directories: []
    };
  }
  const entries = await fs.readdir(plans.real_path, { withFileTypes: true });
  entries.sort((left, right) => naturalCompare(left.name, right.name));
  const packs = [];
  const looseFiles = [];
  const ignoredDirectories = [];

  for (const entry of entries) {
    const relativePath = `plans/${entry.name}`;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      const lowerName = entry.name.toLowerCase();
      if (SKIPPED_DIRECTORIES.has(lowerName) || ARCHIVE_ROOT_DIRECTORIES.has(lowerName)) {
        ignoredDirectories.push(relativePath);
        continue;
      }
      const walked = await walkSourceDirectory(path.join(plans.real_path, entry.name), relativePath);
      const validation = validateFeatureSlug(entry.name);
      packs.push({
        slug: entry.name,
        path: relativePath,
        selectable: validation.ok,
        ...summarizeEntries(walked.files),
        ignored_count: walked.ignored.length,
        skipped_directory_count: walked.skipped_directories.length,
        symlink_count: walked.symlinks.length,
        warnings: validation.ok ? [] : ['invalid_slug']
      });
      continue;
    }
    if (!entry.isFile() || IGNORED_FILES.has(entry.name.toLowerCase())) continue;
    const stat = await fs.stat(path.join(plans.real_path, entry.name));
    const classification = classifyPath(relativePath);
    looseFiles.push({
      path: relativePath,
      size: stat.size,
      extension: normalizeExtension(entry.name) || null,
      kind: classification.kind,
      family: classification.family
    });
  }

  return {
    ok: true,
    plans_root: 'plans',
    packs,
    loose_files: looseFiles,
    ignored_directories: ignoredDirectories,
    warnings: []
  };
}

async function inspectSourceFile(entry) {
  const baseClassification = classifyPath(entry.path);
  const extension = normalizeExtension(entry.path);
  const fingerprint = `sha256:${await sha256File(entry.absolute_path)}`;
  let inspection = { text: '', binary: false, complete: entry.size === 0 };
  const inspectText = baseClassification.family !== 'blocked'
    && !VISUAL_EXTENSIONS.has(extension)
    && !DOCUMENT_EXTENSIONS.has(extension);
  if (inspectText) inspection = await readInspectionText(entry.absolute_path, entry.size);

  let kind = inspection.binary ? 'binary' : baseClassification.kind;
  let family = baseClassification.family;
  let sql = null;
  if (!inspection.binary && extension === '.sql') {
    sql = analyzeSql(inspection.text, entry.path);
    kind = sql.kind;
    family = 'database';
  } else if (!inspection.binary && kind === 'unknown' && inspection.text.trim()) {
    kind = 'text_source';
    family = 'text';
  }
  const secretScan = inspection.text
    ? collectStagedSecretFindings(entry.path, inspection.text)
    : { findings: [], suppressed: [] };
  const role = inferRole(entry.path, kind);
  const warnings = [];
  if (entry.size === 0) warnings.push('empty_file');
  if (!inspection.complete) warnings.push('large_file');
  if (inspection.binary) warnings.push('binary_content');
  if (secretScan.findings.length > 0) warnings.push('secret_detected');
  if (sql && sql.contains_row_data) warnings.push('sql_contains_data_statements');
  if (kind === 'unknown') warnings.push('unsupported_type');

  return {
    path: entry.path,
    extension: extension || null,
    size: entry.size,
    fingerprint,
    kind,
    family,
    role: secretScan.findings.length > 0 ? 'blocked' : role,
    load_policy: loadPolicyFor({
      kind,
      role: secretScan.findings.length > 0 ? 'blocked' : role,
      size: entry.size,
      binary: inspection.binary,
      secretFindings: secretScan.findings,
      sql
    }),
    warnings,
    security_findings: secretScan.findings.map((finding) => ({
      id: finding.id,
      reason: finding.reason,
      line: finding.line
    })),
    sql
  };
}

function buildLogicalGroups(files) {
  const groups = {
    intent: [],
    contract: [],
    current_state: [],
    history: [],
    example: [],
    reference: [],
    auxiliary: [],
    blocked: []
  };
  for (const file of files) {
    const role = Object.prototype.hasOwnProperty.call(groups, file.role) ? file.role : 'auxiliary';
    groups[role].push(file.path);
  }
  return groups;
}

async function inspectBriefingSourcePack(targetDir, slug) {
  const collected = await collectBriefingSourceFiles(targetDir, slug);
  if (!collected.ok) return collected;
  if (collected.files.length > MAX_PACK_FILES) {
    return {
      ok: false,
      error: 'source_pack_too_many_files',
      slug: collected.slug,
      path: collected.path,
      file_count: collected.files.length,
      max_files: MAX_PACK_FILES
    };
  }

  const files = [];
  for (const entry of collected.files) files.push(await inspectSourceFile(entry));
  const migrations = files
    .filter((file) => file.kind === 'sql_migration')
    .sort((left, right) => naturalCompare(left.path, right.path));
  migrations.forEach((file, index) => { file.migration_order = index + 1; });

  const summary = summarizeEntries(collected.files);
  const warnings = [];
  if (summary.total_bytes > LARGE_PACK_BYTES) warnings.push('large_pack');
  if (collected.symlinks.length > 0) warnings.push('symlinks_skipped');
  if (collected.skipped_directories.length > 0) warnings.push('generated_directories_skipped');
  if (files.some((file) => file.load_policy === 'blocked')) warnings.push('blocked_sources_present');
  if (files.some((file) => file.warnings.includes('sql_contains_data_statements'))) {
    warnings.push('sql_data_requires_safe_handling');
  }

  const loadModules = [SOURCE_PACK_MODULE];
  if (summary.has_sql) loadModules.push(SQL_SOURCE_MODULE);
  return {
    ok: true,
    slug: collected.slug,
    path: collected.path,
    ...summary,
    files,
    logical_groups: buildLogicalGroups(files),
    migration_order: migrations.map((file) => file.path),
    load_modules: loadModules,
    needs_intent_question: !files.some((file) => file.role === 'intent'),
    source_policy: 'read_only',
    organization_policy: 'logical_only',
    ignored: collected.ignored,
    skipped_directories: collected.skipped_directories,
    symlinks: collected.symlinks,
    warnings
  };
}

module.exports = {
  MAX_DIRECT_READ_BYTES,
  MAX_PACK_FILES,
  SOURCE_PACK_MODULE,
  SQL_SOURCE_MODULE,
  analyzeSql,
  classifyPath,
  collectBriefingSourceFiles,
  discoverBriefingSourcePacks,
  inspectBriefingSourcePack,
  sha256File
};
