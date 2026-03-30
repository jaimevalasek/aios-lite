#!/usr/bin/env node
'use strict';

/**
 * Benchmark — Context Optimizations (Fases 1-5 + Agent Sharding)
 *
 * Measures performance and token efficiency of each optimization layer.
 * Run: node scripts/benchmark-optimizations.js
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { generateSessionRecovery } = require('../src/recovery-context-session');
const { IndexManager } = require('../src/context-search');
const { saveContextShadow, listSessions, restoreContext } = require('../src/context-cache');
const { executeInSandbox } = require('../src/sandbox');
const { AgentLoader, shardMarkdown } = require('../src/agent-loader');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hrMs() {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

async function bench(label, fn, iterations = 1) {
  const start = hrMs();
  let result;
  for (let i = 0; i < iterations; i++) {
    result = await fn();
  }
  const elapsed = hrMs() - start;
  const avg = elapsed / iterations;
  console.log(`  ${label.padEnd(40)} ${avg.toFixed(1).padStart(8)}ms`);
  return result;
}

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-bench-'));
}

// ─── Benchmark suites ─────────────────────────────────────────────────────────

async function benchRecovery(tmp) {
  console.log('\n[ Fase 1 — Session Recovery ]');

  const sessionState = {
    goal: 'implement context optimizations across all phases',
    agent: 'deyvin',
    tasks: Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      title: `Task ${i + 1}`,
      status: i < 3 ? 'completed' : 'in_progress'
    })),
    notes: ['Started FTS5 index', 'Cache module stable', 'Sandbox redaction tested']
  };

  await bench('generateSessionRecovery (cold)', () =>
    generateSessionRecovery(tmp, sessionState)
  );

  await bench('generateSessionRecovery (warm, file exists)', () =>
    generateSessionRecovery(tmp, sessionState), 5
  );
}

async function benchFTS5(tmp) {
  console.log('\n[ Fase 3 — FTS5 Search Index ]');

  const searchDir = path.join(tmp, 'search');
  const docsDir = path.join(tmp, 'docs');
  await fs.mkdir(docsDir, { recursive: true });

  // Create sample documents
  const docs = [
    { name: 'context.md', content: '# Project Context\n\nframework: next\nclassification: MEDIUM\n' + 'keyword '.repeat(200) },
    { name: 'spec.md', content: '# Spec\n\n## Stack\nNext.js + TypeScript\n\n## Features\n' + 'feature '.repeat(200) },
    { name: 'architecture.md', content: '# Architecture\n\n## Modules\nAPI layer\nData layer\n' + 'module '.repeat(200) },
    { name: 'discovery.md', content: '# Discovery\n\nDomain entities and relationships\n' + 'entity '.repeat(200) },
    { name: 'design.md', content: '# Design System\n\nColor tokens, spacing, typography\n' + 'design '.repeat(200) },
  ];

  for (const doc of docs) {
    await fs.writeFile(path.join(docsDir, doc.name), doc.content, 'utf8');
  }

  const idx = new IndexManager(searchDir);
  await idx.open();

  try {
    await bench('indexDirectory (5 docs, force)', () =>
      idx.indexDirectory(docsDir, { force: true })
    );

    await bench('search — simple query', () =>
      idx.search('context framework'), 10
    );

    await bench('search — multi-word query', () =>
      idx.search('architecture modules API layer'), 10
    );

    await bench('search — no results query', () =>
      idx.search('xyzzy42nonexistent'), 10
    );

    const stats = idx.stats();
    console.log(`  Index stats: ${stats.totalDocs} docs, ${(stats.totalSize / 1024).toFixed(1)}KB`);
  } finally {
    idx.close();
  }
}

async function benchCache(tmp) {
  console.log('\n[ Fase 4 — Context Cache RAM ]');

  const cacheDir = path.join(tmp, 'cache');
  const content = '# Recovery Context\n\n' + 'context data '.repeat(500);

  let savedSessionId;

  await bench('saveContextShadow (1KB)', async () => {
    const r = await saveContextShadow(content, { goal: 'bench test', agent: 'dev' }, { cacheDir });
    savedSessionId = r.sessionId;
  });

  await bench('listSessions (10 sessions)', async () => {
    for (let i = 0; i < 9; i++) {
      await saveContextShadow(`session ${i}`, {}, { cacheDir });
    }
    return listSessions({ cacheDir });
  });

  await bench('restoreContext (full)', () =>
    restoreContext(savedSessionId, { cacheDir }), 5
  );

  await bench('restoreContext (with query filter)', () =>
    restoreContext(savedSessionId, { cacheDir, query: 'Recovery' }), 5
  );
}

async function benchSandbox() {
  console.log('\n[ Fase 5 — Sandbox Executor ]');

  await bench('executeInSandbox — echo (fast cmd)', () =>
    executeInSandbox('echo "benchmark test"'), 3
  );

  await bench('executeInSandbox — node -e (js eval)', () =>
    executeInSandbox('node -e "process.stdout.write(JSON.stringify({ok:true}))"'), 3
  );

  const secretText = 'ghp_abcdefghijklmnopqrstuvwxyz12345678AB token=sk-abc123def456ghi789jkl012mno345pqr678';
  await bench('redactCredentials (2 secrets)', async () => {
    const { redactCredentials } = require('../src/sandbox');
    redactCredentials(secretText);
  }, 1000);
}

async function benchAgentSharding(tmp) {
  console.log('\n[ Agent Sharding — agent-loader ]');

  const searchDir = path.join(tmp, 'shards');
  const agentFile = path.join(tmp, 'dev-agent.md');

  // Simulate a realistic agent instruction file
  const agentContent = [
    '# Dev Agent',
    '',
    '## Role',
    'You are a senior full-stack developer with expertise in Node.js, React, and TypeScript.',
    '',
    '## Implementation Guidelines',
    'Write clean, well-tested code. Follow SOLID principles. Use TypeScript for all new code.',
    'Avoid premature abstractions. Prefer composition over inheritance.',
    '',
    '## TDD Requirements',
    'Write tests before implementation. Target 80%+ coverage. Use node:test for unit tests.',
    '',
    '## Error Handling',
    'Use structured error objects. Log with context. Never swallow errors silently.',
    '',
    '## Output Format',
    'Return structured summaries. Include: what was built, tests written, open decisions.',
    '',
    '## Code Review Checklist',
    'Security: no hardcoded secrets. Performance: no N+1 queries. Docs: JSDoc on public APIs.',
    '',
    '## Dependencies',
    'Prefer stdlib. Minimize third-party deps. Audit new packages before adding.',
    '',
    '## Context Management',
    'Keep context under 2000 tokens per shard. Use recovery-context.md after compacts.',
  ].join('\n');

  await fs.writeFile(agentFile, agentContent, 'utf8');

  const shards = shardMarkdown(agentContent, 'dev');
  console.log(`  Shards from agent file: ${shards.length}`);
  const totalTokens = shards.reduce((s, sh) => s + sh.tokens, 0);
  console.log(`  Total tokens (all shards): ${totalTokens}`);

  const loader = new AgentLoader({ searchDir });
  await loader.open();

  try {
    await bench('indexAgentFile', () =>
      loader.indexAgentFile(agentFile, 'dev', { force: true })
    );

    const result = await bench('loadRelevantShards (TDD goal)', () =>
      loader.loadRelevantShards('dev', 'implement with TDD and error handling', {
        maxShards: 3,
        maxTokens: 2000
      })
    );

    if (result) {
      console.log(`  Selected shards: ${result.shards.length}/${result.totalShards} (${result.tokens} tokens)`);
      console.log(`  Token reduction: ${totalTokens}→${result.tokens} (${Math.round((1 - result.tokens / totalTokens) * 100)}% saved)`);
    }

    await bench('loadRelevantShards (10x)', () =>
      loader.loadRelevantShards('dev', 'implement a new feature', {
        maxShards: 3, maxTokens: 2000
      }), 10
    );
  } finally {
    loader.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('AIOSON Context Optimizations — Benchmark');
  console.log('='.repeat(50));

  const tmp = await makeTmpDir();

  try {
    await benchRecovery(tmp);
    await benchFTS5(tmp);
    await benchCache(tmp);
    await benchSandbox();
    await benchAgentSharding(tmp);

    console.log('\n' + '='.repeat(50));
    console.log('Benchmark complete.');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('Benchmark error:', err);
  process.exitCode = 1;
});
