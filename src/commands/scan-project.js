'use strict';

/**
 * scan:project — Brownfield project scanner
 *
 * Walks the project directory, reads key files, calls a cheap LLM to generate:
 *   - .aios-lite/context/discovery.md
 *   - .aios-lite/context/skeleton-system.md
 *
 * Config: aios-lite-models.json in the target project root.
 * Zero npm dependencies — uses node:fs, node:https, node:http only.
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const https = require('node:https');
const http = require('node:http');
const { ensureDir, exists } = require('../utils');

// ── Constants ────────────────────────────────────────────────────────────────

const CONFIG_FILE    = 'aios-lite-models.json';
const OUTPUT_FILE    = '.aios-lite/context/discovery.md';
const SKELETON_FILE  = '.aios-lite/context/skeleton-system.md';
const CONTEXT_FILE   = '.aios-lite/context/project.context.md';
const SPEC_FILE      = '.aios-lite/context/spec.md';
const DELIMITER      = '<<<SKELETON>>>';

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'vendor', '.next', 'dist', 'build',
  '__pycache__', '.cache', 'coverage', '.nyc_output', 'target',
  '.gradle', 'venv', '.venv', 'env', '.env', 'storage',
  'bootstrap/cache', '.idea', '.vscode', 'tmp', 'temp', 'logs',
  'public/build', 'public/hot', '.aios-lite/backups',
]);

const SKIP_EXTENSIONS = new Set([
  '.lock', '.log', '.map', '.min.js', '.min.css',
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.mp3', '.wav', '.avi',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.pyc', '.pyo', '.class', '.o', '.a', '.so',
  '.sqlite', '.db', '.sqlite3',
]);

const KEY_FILE_NAMES = new Set([
  'package.json', 'composer.json', 'requirements.txt', 'pyproject.toml',
  'Gemfile', 'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle',
  'docker-compose.yml', 'docker-compose.yaml', 'Dockerfile',
  '.env.example', '.env.sample', 'README.md',
  'schema.prisma', 'schema.rb', 'routes.rb',
  'tsconfig.json', 'next.config.js', 'next.config.ts',
  'vite.config.js', 'vite.config.ts',
  'tailwind.config.js', 'tailwind.config.ts',
  'webpack.config.js',
]);

const KEY_FILE_PATHS = new Set([
  'prisma/schema.prisma',
  'database/schema.rb',
  'config/routes.rb',
  'routes/web.php',
  'routes/api.php',
  'config/app.php',
  'app/Http/Kernel.php',
  'app/Providers/RouteServiceProvider.php',
]);

const MAX_KEY_FILE_CHARS = 3000;
const MAX_TREE_FILES     = 300;

const PROVIDER_BASE_URLS = {
  deepseek:  'https://api.deepseek.com/v1',
  openai:    'https://api.openai.com/v1',
  gemini:    'https://generativelanguage.googleapis.com/v1beta/openai',
  groq:      'https://api.groq.com/openai/v1',
  together:  'https://api.together.xyz/v1',
  mistral:   'https://api.mistral.ai/v1',
  anthropic: null, // uses its own format
};

// ── File system helpers ──────────────────────────────────────────────────────

async function readFileSafe(filePath, maxChars) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    if (maxChars && content.length > maxChars) {
      return content.slice(0, maxChars) + `\n... [truncated at ${maxChars} chars]`;
    }
    return content;
  } catch {
    return null;
  }
}

async function loadGitignorePatterns(root) {
  const patterns = new Set();
  try {
    const gi = await fs.readFile(path.join(root, '.gitignore'), 'utf8');
    for (const line of gi.split('\n')) {
      const clean = line.trim().replace(/^\//, '').replace(/\/$/, '');
      if (clean && !clean.startsWith('#')) patterns.add(clean);
    }
  } catch { /* no .gitignore */ }
  return patterns;
}

function shouldSkip(relPath, ext, gitignorePatterns) {
  const parts = relPath.split('/');
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) return true;
    if (gitignorePatterns.has(part)) return true;
  }
  if (SKIP_EXTENSIONS.has(ext)) return true;
  return false;
}

async function walkProject(root) {
  const gitignore = await loadGitignorePatterns(root);
  const treeLines = [];
  const keyContents = {};
  let fileCount = 0;

  async function walk(dir, depth) {
    if (fileCount >= MAX_TREE_FILES) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch { return; }

    // dirs first (alphabetical), then files (alphabetical)
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath  = path.relative(root, fullPath).replace(/\\/g, '/');
      const ext      = path.extname(entry.name).toLowerCase();
      const indent   = '  '.repeat(depth);

      if (shouldSkip(relPath, ext, gitignore)) continue;

      if (entry.isDirectory()) {
        treeLines.push(`${indent}${entry.name}/`);
        await walk(fullPath, depth + 1);
      } else {
        if (fileCount >= MAX_TREE_FILES) {
          treeLines.push(`${indent}... [more files omitted]`);
          return;
        }
        treeLines.push(`${indent}${entry.name}`);
        fileCount++;

        const isKeyName = KEY_FILE_NAMES.has(entry.name);
        const isKeyPath = KEY_FILE_PATHS.has(relPath) || [...KEY_FILE_PATHS].some((p) => relPath.endsWith(p));
        if ((isKeyName || isKeyPath) && !(relPath in keyContents)) {
          const content = await readFileSafe(fullPath, MAX_KEY_FILE_CHARS);
          if (content) keyContents[relPath] = content;
        }
      }
    }
  }

  await walk(root, 0);
  return { treeLines, keyContents };
}

// ── HTTP helper (zero external deps) ────────────────────────────────────────

function httpPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const data = Buffer.from(JSON.stringify(body), 'utf8');

    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, ...headers },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 400)}`));
        } else {
          resolve(text);
        }
      });
    });

    req.setTimeout(180000, () => { req.destroy(new Error('Request timed out (180s)')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── LLM providers ───────────────────────────────────────────────────────────

async function callOpenAICompatible(baseUrl, apiKey, model, prompt) {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const text = await httpPost(
    url,
    { Authorization: `Bearer ${apiKey}` },
    { model, messages: [{ role: 'user', content: prompt }], max_tokens: 4096, temperature: 0.2 }
  );
  const data = JSON.parse(text);
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey, model, prompt) {
  const text = await httpPost(
    'https://api.anthropic.com/v1/messages',
    { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    { model, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }
  );
  const data = JSON.parse(text);
  return data.content[0].text;
}

async function callLLM(providerName, providerCfg, prompt) {
  const apiKey  = providerCfg.api_key  || '';
  const model   = providerCfg.model    || '';
  const baseUrl = providerCfg.base_url || PROVIDER_BASE_URLS[providerName] || '';

  if (!apiKey || apiKey.startsWith('YOUR_')) {
    throw new Error(`API key not configured for provider '${providerName}'`);
  }
  if (!model) {
    throw new Error(`Model not configured for provider '${providerName}'`);
  }

  if (providerName === 'anthropic') return callAnthropic(apiKey, model, prompt);
  if (!baseUrl) throw new Error(`No base_url for provider '${providerName}'`);
  return callOpenAICompatible(baseUrl, apiKey, model, prompt);
}

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(treeLines, keyContents, projectContext, specContent) {
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const parts = ['You are analyzing a software project to generate a structured discovery document.\n'];

  if (projectContext) {
    parts.push(`## Project Context (aios-lite)\n\`\`\`\n${projectContext}\n\`\`\`\n`);
  }
  parts.push(`## Project Structure\n\`\`\`\n${treeLines.join('\n')}\n\`\`\`\n`);

  if (Object.keys(keyContents).length > 0) {
    parts.push('## Key Files\n');
    for (const [filePath, content] of Object.entries(keyContents).slice(0, 12)) {
      parts.push(`### ${filePath}\n\`\`\`\n${content}\n\`\`\`\n`);
    }
  }

  if (specContent) {
    parts.push(`## Development Memory (spec.md)\n\`\`\`\n${specContent}\n\`\`\`\n`);
  }

  parts.push(`
## Task
Generate TWO documents. Separate them with exactly this delimiter on its own line:
<<<SKELETON>>>

### Document 1: \`.aios-lite/context/discovery.md\`
Generate with exactly these sections:

# Discovery

## 1. What this project builds
2-3 objective lines describing what the system does.

## 2. Project structure overview
Key directories and their responsibilities. Identify the architectural pattern (MVC, layered, feature-based, etc.).

## 3. Key entities and relationships
Entities inferred from models, migrations, or schema files. Include relationships if detectable.

## 4. Entry points and routes
Main route files, controllers, or API handlers identified.

## 5. Dependencies and services
Key packages from package.json / composer.json / requirements.txt. External services detected.

## 6. Existing patterns and conventions
Coding patterns already in use (naming, folder organization, auth approach, etc.). These must be preserved.

## 7. Development state
What appears to be done, in-progress, or missing. Use spec.md if available.

## 8. Risks and technical debt
Issues, inconsistencies, or missing pieces that could become problems.

## 9. What to preserve
Explicit list of conventions and structures the AI must NOT change or override.

---
_Generated by aios-lite scan:project — ${now}_

<<<SKELETON>>>

### Document 2: \`.aios-lite/context/skeleton-system.md\`
A lightweight living index of the system. Keep it concise — AI agents read this frequently as a quick-reference index. Do NOT repeat the full analysis from Document 1 here.

Generate with exactly this format:

# System Skeleton
_Generated by aios-lite scan:project — ${now}_

## File map
Indented tree of key files and directories grouped by domain/module.
Skip: detailed migration lists, test fixtures, config boilerplate, lock files.
Mark each module or file with inferred status:
  ✓  complete — code present and appears fully implemented
  ◑  partial  — scaffolded or incomplete implementation
  ○  missing  — referenced but not found or empty

## Key routes
Main routes mapped to their handlers. One per line.
Format: \`METHOD /path → Handler@method\`
Skip standard auth boilerplate (login/logout/password-reset) unless customized.
If no route files found: _No route files detected_

## Module status
| Module | Status | Key files |
|--------|--------|-----------|
One row per logical module or feature area.
Status: ✓ done | ◑ in-progress | ○ pending

## Key relationships
Entity relationships in plain English, one per line.
Example: \`User hasMany Orders → OrderItem → Product\`
If no models/schema found: _No entities detected_
`);

  return parts.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function runScanProject({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');

  logger.log(t('scan_project.scanning', { dir: targetDir }));

  // Load config
  const configPath = path.join(targetDir, CONFIG_FILE);
  if (!(await exists(configPath))) {
    logger.error(t('scan_project.config_missing', { file: CONFIG_FILE }));
    process.exitCode = 1;
    return { ok: false, error: 'config_not_found' };
  }

  let config;
  try {
    config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  } catch (err) {
    logger.error(t('scan_project.config_invalid', { error: err.message }));
    process.exitCode = 1;
    return { ok: false, error: 'config_invalid' };
  }

  const providerName = String(options.provider || config.preferred_scan_provider || '');
  const providers    = config.providers || {};

  if (!providerName || !providers[providerName]) {
    const available = Object.keys(providers).join(', ') || '(none)';
    logger.error(t('scan_project.provider_missing', { provider: providerName, available }));
    process.exitCode = 1;
    return { ok: false, error: 'provider_not_found' };
  }

  const providerCfg = providers[providerName];
  const model = providerCfg.model || '?';
  logger.log(t('scan_project.provider_info', { provider: providerName, model }));

  // Read context files
  const projectContext = await readFileSafe(path.join(targetDir, CONTEXT_FILE));
  const specContent    = await readFileSafe(path.join(targetDir, SPEC_FILE));

  if (projectContext) logger.log(t('scan_project.context_found'));
  else logger.log(t('scan_project.context_missing'));
  if (specContent) logger.log(t('scan_project.spec_found'));

  // Walk project
  logger.log(t('scan_project.walking'));
  const { treeLines, keyContents } = await walkProject(targetDir);
  logger.log(t('scan_project.walk_done', { files: treeLines.filter((l) => !l.endsWith('/')).length, keys: Object.keys(keyContents).length }));

  if (options['dry-run']) {
    const output = { ok: true, dryRun: true, treeLines: treeLines.length, keyFiles: Object.keys(keyContents).length, provider: providerName, model };
    if (options.json) return output;
    logger.log(t('scan_project.dry_run_done', { treeCount: treeLines.length, keyCount: Object.keys(keyContents).length }));
    return output;
  }

  // Build prompt and call LLM
  const prompt = buildPrompt(treeLines, keyContents, projectContext, specContent);
  logger.log(t('scan_project.calling_llm', { provider: providerName, model }));

  let result;
  try {
    result = await callLLM(providerName, providerCfg, prompt);
  } catch (err) {
    logger.error(t('scan_project.llm_error', { error: err.message }));
    process.exitCode = 1;
    return { ok: false, error: err.message };
  }

  // Parse and write both documents
  const outputPath   = path.join(targetDir, OUTPUT_FILE);
  const skeletonPath = path.join(targetDir, SKELETON_FILE);

  await ensureDir(path.dirname(outputPath));

  let discoveryContent, skeletonContent;
  if (result.includes(DELIMITER)) {
    const parts = result.split(DELIMITER);
    discoveryContent = parts[0].trim();
    skeletonContent  = parts[1].trim();
  } else {
    discoveryContent = result.trim();
    skeletonContent  = null;
  }

  await fs.writeFile(outputPath, discoveryContent, 'utf8');
  logger.log(t('scan_project.discovery_written', { path: outputPath, chars: discoveryContent.length }));

  if (skeletonContent) {
    await fs.writeFile(skeletonPath, skeletonContent, 'utf8');
    logger.log(t('scan_project.skeleton_written', { path: skeletonPath, chars: skeletonContent.length }));
  } else {
    logger.log(t('scan_project.skeleton_missing'));
  }

  logger.log(t('scan_project.next_steps'));
  logger.log(t('scan_project.step_analyst'));
  logger.log(t('scan_project.step_dev'));

  const output = { ok: true, targetDir, provider: providerName, model, discoveryPath: outputPath, skeletonPath: skeletonContent ? skeletonPath : null };
  if (options.json) return output;
  return output;
}

module.exports = { runScanProject };
