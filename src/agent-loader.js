'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { IndexManager } = require('./context-search');

const SHARD_SEARCH_DIR = path.join(os.homedir(), '.aioson', 'shards');
const MAX_SHARD_TOKENS = 2000;
const DEFAULT_SHARDS = 3;

function estimateTokens(str) {
  return Math.ceil(str.length / 4);
}

/**
 * Split a markdown document into semantic shards by H2/H3 headings.
 * Each shard = heading + its content until the next heading.
 *
 * @param {string} content — raw markdown
 * @param {string} agentId — used to label shards
 * @returns {Array<{id, heading, level, content, tokens}>}
 */
function shardMarkdown(content, agentId) {
  const lines = content.split('\n');
  const shards = [];
  let currentHeading = '(preamble)';
  let currentLevel = 1;
  let currentLines = [];
  let shardIndex = 0;

  function flushShard() {
    const text = currentLines.join('\n').trim();
    if (!text) return;
    const tokens = estimateTokens(text);
    shards.push({
      id: `${agentId}:shard:${shardIndex}`,
      heading: currentHeading,
      level: currentLevel,
      content: text,
      tokens
    });
    shardIndex++;
  }

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);

    if (h2 || h3) {
      flushShard();
      currentHeading = (h2 || h3)[1].trim();
      currentLevel = h2 ? 2 : 3;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  flushShard();
  return shards;
}

/**
 * Agent shard loader — indexes agent instruction files as shards
 * and loads only the relevant ones based on a goal query.
 */
class AgentLoader {
  constructor(opts = {}) {
    this._searchDir = opts.searchDir || SHARD_SEARCH_DIR;
    this._idx = null;
    this._shardMap = new Map(); // id → shard content
  }

  async open() {
    this._idx = new IndexManager(this._searchDir);
    await this._idx.open();
    return this;
  }

  close() {
    if (this._idx) {
      this._idx.close();
      this._idx = null;
    }
  }

  /**
   * Index a single agent instruction file as shards.
   * @param {string} filePath — absolute path to agent .md file
   * @param {string} agentId
   * @param {object} opts — { force? }
   */
  async indexAgentFile(filePath, agentId, opts = {}) {
    const content = await fs.readFile(filePath, 'utf8');
    const shards = shardMarkdown(content, agentId);

    // Write individual shard files to a temp dir for FTS5 indexing
    const shardDir = path.join(this._searchDir, 'agent-shards', agentId);
    await fs.mkdir(shardDir, { recursive: true });

    for (const shard of shards) {
      const shardFile = path.join(shardDir, `${shard.id.replace(/:/g, '_')}.md`);
      const shardContent = `# ${shard.heading}\n\n${shard.content}`;
      await fs.writeFile(shardFile, shardContent, 'utf8');
      // Keep content in memory for fast retrieval
      this._shardMap.set(shard.id, shard);
    }

    // Index the shard dir
    await this._idx.indexDirectory(shardDir, { force: opts.force !== false });

    return { agentId, shards: shards.length };
  }

  /**
   * Index an entire agents directory.
   * @param {string} agentsDir — directory containing agent .md files
   * @param {object} opts — { force? }
   * @returns {{ agents: number, totalShards: number }}
   */
  async indexAgentsDir(agentsDir, opts = {}) {
    let entries;
    try {
      entries = await fs.readdir(agentsDir, { withFileTypes: true });
    } catch {
      return { agents: 0, totalShards: 0 };
    }

    let agents = 0;
    let totalShards = 0;

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.md')) continue;

      const agentId = entry.name.replace(/\.md$/, '');
      const filePath = path.join(agentsDir, entry.name);

      try {
        const result = await this.indexAgentFile(filePath, agentId, opts);
        agents++;
        totalShards += result.shards;
      } catch {
        // best-effort: skip unreadable files
      }
    }

    return { agents, totalShards };
  }

  /**
   * Load the most relevant shards for an agent given a goal query.
   *
   * Strategy:
   * 1. Search FTS5 index for the goal query, filtered to agent shards
   * 2. Always include H1/H2 "Role" and "preamble" shards
   * 3. Fill remaining budget with ranked results
   *
   * @param {string} agentId
   * @param {string} goal
   * @param {object} opts — { maxShards?, maxTokens? }
   * @returns {{ shards: Array, tokens: number, agentId: string }}
   */
  async loadRelevantShards(agentId, goal, opts = {}) {
    const maxShards = opts.maxShards || DEFAULT_SHARDS;
    const maxTokens = opts.maxTokens || MAX_SHARD_TOKENS;

    // If shards aren't in memory (e.g., loaded from a previous session), load from disk
    if (this._shardMap.size === 0) {
      await this._loadShardsFromDisk(agentId);
    }

    const agentShards = [...this._shardMap.values()].filter(s => s.id.startsWith(`${agentId}:`));

    if (agentShards.length === 0) {
      return { shards: [], tokens: 0, agentId };
    }

    // Always include preamble/role shards
    const priority = agentShards.filter(s =>
      s.heading === '(preamble)' ||
      /^role$/i.test(s.heading) ||
      /^your role$/i.test(s.heading)
    );

    let selected = [...priority];
    let usedTokens = selected.reduce((sum, s) => sum + s.tokens, 0);

    // Search for relevant shards
    if (goal && goal.trim()) {
      const searchResults = this._idx.search(`${agentId} ${goal}`, { limit: maxShards + 2 });

      for (const result of searchResults) {
        if (selected.length >= maxShards) break;

        // Match result back to shard via heading
        const matchedShard = agentShards.find(s =>
          result.relPath.includes(s.id.replace(/:/g, '_')) ||
          s.heading.toLowerCase().includes(result.title.toLowerCase())
        );

        if (!matchedShard) continue;
        if (selected.some(s => s.id === matchedShard.id)) continue;

        if (usedTokens + matchedShard.tokens <= maxTokens) {
          selected.push(matchedShard);
          usedTokens += matchedShard.tokens;
        }
      }
    }

    // Fill with remaining shards if budget allows
    if (selected.length < maxShards) {
      for (const shard of agentShards) {
        if (selected.length >= maxShards) break;
        if (selected.some(s => s.id === shard.id)) continue;
        if (usedTokens + shard.tokens <= maxTokens) {
          selected.push(shard);
          usedTokens += shard.tokens;
        }
      }
    }

    return {
      agentId,
      shards: selected,
      tokens: usedTokens,
      totalShards: agentShards.length
    };
  }

  /**
   * Load shards from disk (for cross-session use).
   * @private
   */
  async _loadShardsFromDisk(agentId) {
    const shardDir = path.join(this._searchDir, 'agent-shards', agentId);
    let files;
    try {
      files = await fs.readdir(shardDir);
    } catch {
      return;
    }

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const filePath = path.join(shardDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        // Reconstruct shard id from filename
        const id = file.replace(/\.md$/, '').replace(/_/g, ':');
        const headingMatch = content.match(/^#\s+(.+)$/m);
        const heading = headingMatch ? headingMatch[1] : '(unknown)';
        const tokens = estimateTokens(content);
        this._shardMap.set(id, { id, heading, level: 2, content, tokens });
      } catch {
        // skip
      }
    }
  }

  /**
   * Build a merged context string from selected shards.
   * @param {Array} shards
   * @returns {string}
   */
  static buildContext(shards) {
    return shards.map(s => s.content).join('\n\n---\n\n');
  }

  /**
   * Return index statistics for all agent shards.
   */
  stats() {
    return this._idx.stats();
  }
}

module.exports = { AgentLoader, shardMarkdown };
