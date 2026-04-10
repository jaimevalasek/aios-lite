# Comparative Analysis: Claw Code vs AIOSON

**Date:** 2026-04-02  
**Purpose:** Architectural comparison for improvement opportunities

---

## 1. Executive Summary

Both projects address multi-agent development orchestration but with fundamentally different approaches:

| Aspect | Claw Code | AIOSON |
|--------|-----------|--------|
| **Primary Language** | Rust + Python | Node.js (JavaScript) |
| **Agent Model** | Tool-based with permission system | Specialized agents with handoff protocol |
| **Squad Model** | Plugin-based with hooks | Manifest-based with executors |
| **Token Optimization** | Session compaction with incremental summaries | Semantic sharding + FTS5 + context caching |
| **Communication** | MCP (Multi-transport) + Hooks | Intra-squad JSONL bus + Inter-squad webhooks |
| **Configuration** | Deep-merge precedence chain | YAML frontmatter + JSON manifests |

---

## 2. Agent Architecture Comparison

### Claw Code Agent Model

**Token-based Routing:**
```rust
// Routes prompt tokens to commands/tools based on match scores
route_prompt() -> RoutedMatch
```

**Characteristics:**
- Single agent with tool extensibility
- Permission-gated tool execution
- Session-based context management
- Hook system for pre/post tool events

**Strengths:**
- Simpler mental model
- Fast token-based routing
- Immutable frozen dataclasses throughout
- Builder patterns for fluent configuration

### AIOSON Agent Model

**Specialized Agent Handoff:**
```javascript
// Agent definitions with dependency chains
{
  id: 'dev',
  dependsOn: ['.aioson/context/project.context.md', ...],
}
```

**Characteristics:**
- 22+ specialized agents with distinct purposes
- Dependency-based activation
- Semantic shard loading (~2000 tokens/shard)
- Locale-aware agent localization

**Strengths:**
- Clear separation of concerns
- Domain-specific agents
- Agent reuse across projects (genome system)
- Workflow enforcement through handoff protocol

### Gap Analysis - Agent System

| Claw Code Feature | AIOSON Gap | Priority |
|-------------------|------------|----------|
| Immutable frozen dataclasses | AIOSON uses mutable objects | Medium |
| Builder patterns for config | AIOSON uses YAML/JSON only | High |
| Permission mode escalation | AIOSON lacks granular permissions | High |
| Hook events (pre/post tool) | AIOSON hooks:emit is basic | High |

---

## 3. Squad Architecture Comparison

### Claw Code Plugin System

**Trait-based architecture:**
```rust
pub trait Plugin {
    fn metadata(&self) -> &PluginMetadata;
    fn hooks(&self) -> &PluginHooks;
    fn tools(&self) -> &[PluginTool];
    // ...
}
```

**Strengths:**
- Type-safe plugin contracts
- Built-in validation lifecycle
- Manifest-driven discovery
- Multiple plugin types (builtin, bundled, external)

### AIOSON Squad System

**Manifest-based executors:**
```json
{
  "executors": [
    {
      "type": "agent|worker|clone|assistant|human-gate",
      "usesLLM": true,
      "modelTier": "powerful|balanced|fast"
    }
  ]
}
```

**Strengths:**
- 5 executor types (vs single plugin type)
- Workflow phases with dependencies
- Recovery configuration per squad
- Context monitoring with thresholds

### Gap Analysis - Squad System

| Claw Code Feature | AIOSON Gap | Priority |
|-------------------|------------|----------|
| Plugin validation lifecycle | Squad manifest validation is minimal | High |
| BTreeMap deduplication | AIOSON lacks deduplication strategy | Medium |
| Plugin permission tiers | AIOSON executor permissions are coarse | High |
| Hook exit code protocol (0=allow, 2=deny) | AIOSON hooks lack protocol | High |

---

## 4. Token Optimization Comparison

### Claw Code Session Compaction

```rust
pub struct CompactionResult {
    pub summary: String,
    pub formatted_summary: String,
    pub compacted_session: Session,
    pub removed_message_count: usize,
}
```

**Key Innovation: Incremental Merging**
- When re-compacting, combines "Previously compacted context" + "Newly compacted context"
- Highlights extracted from each compaction cycle
- Preserves recent messages verbatim

### AIOSON Token Management

**Multiple strategies:**
1. Semantic sharding (H2/H3 headings, ~2000 tokens)
2. FTS5 full-text search index
3. 24-hour TTL context cache
4. Context trimming with thresholds
5. Recovery context generation (max 2000 tokens)

**Weakness:** No incremental merging of compacted summaries

### Gap Analysis - Token Optimization

| Claw Code Feature | AIOSON Gap | Priority |
|-------------------|------------|----------|
| Incremental compaction merging | AIOSON regenerates recovery context | High |
| Budget tracking gates processing | AIOSON monitors but doesn't gate | High |
| `estimate_session_tokens()` simple formula | AIOSON lacks token estimation | Medium |
| UsageSummary immutable add_turn() | AIOSON uses mutable tracking | Low |

---

## 5. Configuration Patterns Comparison

### Claw Code Config System

**5-layer precedence:**
1. User legacy config
2. User settings
3. Project legacy config
4. Project settings
5. Local settings

**Deep object merging** for nested values

### AIOSON Config System

**YAML frontmatter in config.md:**
```yaml
---
project_name: My Project
classification: SMALL
---
```

**Plus JSON squad manifests**

### Gap Analysis - Configuration

| Claw Code Feature | AIOSON Gap | Priority |
|-------------------|------------|----------|
| Deep merge config | AIOSON uses shallow override | High |
| Config signature hashing | AIOSON lacks config fingerprints | Medium |
| Builder pattern config | AIOSON CLI flags are ad-hoc | Medium |

---

## 6. Process/Workflow Patterns Comparison

### Claw Code Bootstrap Pipeline

**7-stage sequential pipeline:**
```
bootstrap_graph.py:
1. Prefetch side effects
2. Warning handlers + env guards
3. CLI parser + trust gate
4. Setup + parallel load
5. Deferred init after trust
6. Mode routing
7. Query submit loop
```

**Innovation:** Trust gate before loading agents

### AIOSON Classification Workflow

```
MICRO: @setup -> @product -> @dev
SMALL: @setup -> @product -> @analyst -> @architect -> @dev -> @qa
MEDIUM: @setup -> @product -> @analyst -> @architect -> @ux-ui -> @pm -> @orchestrator -> @dev -> @qa
```

**Innovation:** Project complexity scoring

### Gap Analysis - Workflow

| Claw Code Feature | AIOSON Gap | Priority |
|-------------------|------------|----------|
| Trust gate before bootstrap | AIOSON trusts immediately | High |
| 7-stage pipeline with guards | AIOSON has simpler flow | High |
| `$ralph` persistent execution loop | AIOSON lacks persistent loops | High |
| `$team` parallel review mode | AIOSON parallel:assign is fragile | High |

---

## 7. Inter-Agent Communication Comparison

### Claw Code MCP Implementation

**Multi-transport MCP:**
```rust
pub enum McpClientTransport {
    Stdio(McpStdioTransport),
    Sse(McpRemoteTransport),
    Http(McpRemoteTransport),
    WebSocket(McpRemoteTransport),
    Sdk(McpSdkTransport),
    ManagedProxy(McpManagedProxyTransport),
}
```

**Tool routing via qualified names:** `"server_name::tool_name"`

### AIOSON Communication

**Intra-squad JSONL bus:**
```json
{
  "from": "executor-slug",
  "to": "*|specific-slug",
  "type": "finding|feedback|question|result|status|block"
}
```

**Inter-squad via webhooks**

### Gap Analysis - Communication

| Claw Code Feature | AIOSON Gap | Priority |
|-------------------|------------|----------|
| 7 MCP transports | AIOSON has 1 (stdio) | High |
| JSON-RPC with content-length framing | AIOSON uses raw JSONL | Medium |
| Tool index with qualified names | AIOSON lacks tool routing | High |
| Heartbeat for long operations | AIOSON lacks heartbeat | Medium |

---

## 8. Critical Gaps Summary

### High Priority

1. **Permission Mode Escalation** - AIOSON needs tiered tool permissions
2. **Hook Protocol** - Pre/post tool hooks with exit codes
3. **Incremental Compaction** - Merge compacted contexts instead of regenerating
4. **Trust Gate** - Verify before bootstrapping agents
5. **MCP Multi-transport** - Support SSE, HTTP, WebSocket transports
6. **Tool Routing** - Qualified names like `server::tool`
7. **Budget Gating** - Stop processing when budget exceeded
8. **Builder Patterns** - Fluent configuration APIs

### Medium Priority

1. **Config Deep Merge** - Recursive config value merging
2. **Config Signatures** - Detect config changes
3. **Parallel Review Mode** - `$team` equivalent
4. **Persistent Loops** - `$ralph` equivalent
5. **Token Estimation** - Simple formula like `len/4 + 1`
6. **Heartbeat Protocol** - For long-running operations
7. **Plugin Validation Lifecycle** - Trait-based validation

### Low Priority

1. **Immutable UsageSummary** - Frozen dataclass pattern
2. **Command Shadowing** - Hierarchical with override

---

## 9. Transplantable Patterns from Claw Code

### Pattern 1: Bootstrap Trust Gate
```python
# Claw Code: 7-stage pipeline with trust verification before agent load
# AIOSON: Add trust verification step before squad:autorun
```

### Pattern 2: Incremental Compaction
```rust
// Claw Code: Merges "Previously compacted" + "Newly compacted" highlights
// AIOSON: Modify recovery-context.js to maintain highlight history
```

### Pattern 3: Builder Pattern Configuration
```rust
// Claw Code: RuntimeFeatureConfig.with_hooks().with_plugins()
// AIOSON: Add builder methods for runtime configuration
```

### Pattern 4: Hook Exit Code Protocol
```rust
// Claw Code: 0=allow, 2=deny, other=warn
// AIOSON: Implement exit code interpretation in hooks:emit
```

### Pattern 5: Multi-transport MCP
```rust
// Claw Code: Stdio, SSE, HTTP, WebSocket, Sdk, ManagedProxy
// AIOSON: Extend mcp-connectors/ to support more transports
```

### Pattern 6: Persistent Execution Loop ($ralph)
```
// Claw Code: ralph mode for persistent execution
// AIOSON: squad:daemon could implement ralph-like loop
```

### Pattern 7: Parallel Team Review ($team)
```
// Claw Code: team mode for parallel review
// AIOSON: parallel:* commands need team-like coordination
```

---

## 10. Source Files Reference

### Claw Code (for implementation reference)
- Session compaction: `rust/crates/runtime/src/compact.rs`
- Config system: `rust/crates/runtime/src/config.rs`
- Permissions: `rust/crates/runtime/src/permissions.rs`
- Hooks: `rust/crates/runtime/src/hooks.rs`
- MCP: `rust/crates/runtime/src/mcp_client.rs`
- Plugins: `rust/crates/plugins/src/lib.rs`
- Bootstrap: `src/bootstrap_graph.py`
- Query Engine: `src/query_engine.py`

### AIOSON (for improvement targets)
- Squad infra: `src/squad/*.js`
- Context: `src/context-*.js`
- Runtime: `src/runtime-store.js`
- CLI: `src/cli.js`
- Agent loader: `src/agent-loader.js`

---

## 11. Conclusion

AIOSON has a more sophisticated agent specialization and squad coordination model, but lacks the engineering rigor in:

1. **Permission systems** - Claw Code's tiered escalation is missing
2. **Compaction strategy** - Incremental merging would save tokens
3. **Bootstrap security** - Trust gates prevent unauthorized access
4. **Plugin lifecycle** - Type-safe contracts with validation
5. **MCP depth** - Multi-transport support

The most impactful improvements would be:
1. Implementing permission mode escalation
2. Adding incremental compaction
3. Building a trust verification gate
4. Extending MCP to multi-transport
5. Adding hook exit code protocol

These would make AIOSON significantly more robust for production multi-agent workflows.
