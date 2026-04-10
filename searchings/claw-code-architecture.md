# Claw Code Architecture Analysis

**Repository:** https://github.com/ultraworkers/claw-code  
**Status:** ~141k stars, 102k forks - "fastest repo in history to surpass 50K stars" (2 hours)  
**Purpose:** Clean-room Python/Rust rewrite of Claw Code agent harness system  
**Development Approach:** AI-assisted using oh-my-codex (OmX), with `$team` mode for parallel review and `$ralph` mode for persistent execution loops  
**Generated:** 2026-04-02

---

## 1. Repository Overview

**Claw Code** emerged after Claw Code's source code leaked in March 2026. Developer @instructkr created a clean-room Python rewrite from scratch, achieving 50K GitHub stars within 2 hours. The project provides:

- A reimplementation of the original Claw Code framework's core functionality
- Tool wiring, task orchestration, and runtime context management
- Dual implementation: Python (exploration/prototyping) + Rust (production)

### Dual Implementation Strategy

```
├── src/                    # Python workspace (66 items)
├── rust/                  # Rust production implementation
│   ├── crates/             # 8 workspace crates
│   └── Cargo.toml
└── tests/                 # Python verification suite
```

---

## 2. Rust Workspace Crates

| Crate | Purpose |
|-------|---------|
| `claw-cli` | User-facing binary, REPL, OAuth handling |
| `api` | Provider clients (Claw, OpenAI compat), OAuth, SSE streaming |
| `runtime` | Session management, MCP orchestration, permissions, hooks |
| `tools` | Built-in tool implementations (bash, file ops, web, agent) |
| `commands` | Slash-command registry with 28 commands |
| `plugins` | Plugin discovery, lifecycle, manifest validation |
| `lsp` | Language Server Protocol support |
| `server` / `compat-harness` | Supporting services and compatibility tooling |

---

## 3. Agent Architecture Breakdown

### Python Implementation (`src/`)

**Key Modules:**

- **`task.py` / `PortingTask`**: Task abstraction with frozen dataclass pattern
- **`models.py`**: Core data structures - `Subsystem`, `PortingModule`, `PermissionDenial`, `UsageSummary`
- **`runtime.py`**: `PortRuntime` class managing `RuntimeSession` with:
  - `route_prompt()` - token-based routing to commands/tools
  - `bootstrap_session()` - creates complete session with context, setup, history
  - `run_turn_loop()` - configurable turn iteration with early termination
  - `RoutedMatch` dataclass for routing results

**Agent-Related Patterns:**

- **Token-based routing**: Splits prompt into lowercase tokens, matches against command/tool names and responsibilities
- **Session bootstrap**: Single method creates complete `RuntimeSession` aggregating context, setup, history, matches, and results
- **Turn loop orchestration**: Iterates with configurable `max_turns`, breaks on non-completed stop reason

### Rust Implementation (`rust/crates/runtime/src/`)

**Core Modules** (17 private + 1 public):
`bash`, `bootstrap`, `compact`, `config`, `conversation`, `file_ops`, `hooks`, `json`, `mcp`, `mcp_client`, `mcp_stdio`, `oauth`, `permissions`, `prompt`, `remote`, `session`, `usage`, `pub mod sandbox`

**Session/Conversation Types:**
```rust
pub struct Session { version: u32, messages: Vec<ConversationMessage> }
pub enum MessageRole { System, User, Assistant, Tool }
pub enum ContentBlock { Text, ToolUse, ToolResult }
pub struct ConversationMessage { role: MessageRole, blocks: Vec<ContentBlock>, usage: Option<TokenUsage> }
```

**Builder-style Constructors:**
```rust
ConversationMessage::user_text(text) -> Self
ConversationMessage::assistant(blocks) -> Self
ConversationMessage::tool_result(tool_use_id, tool_name, output, is_error) -> Self
```

---

## 4. Squad Architecture (Plugin System)

### Plugin System (`rust/crates/plugins/`)

**Trait-based Polymorphism:**
```rust
pub trait Plugin {
    fn metadata(&self) -> &PluginMetadata;
    fn hooks(&self) -> &PluginHooks;
    fn lifecycle(&self) -> &PluginLifecycle;
    fn tools(&self) -> &[PluginTool];
    fn validate(&self) -> Result<(), PluginError>;
    fn initialize(&self) -> Result<(), PluginError>;
    fn shutdown(&self) -> Result<(), PluginError>;
}
```

**Plugin Types:**
- `BuiltinPlugin`, `BundledPlugin`, `ExternalPlugin` (via `PluginDefinition` enum)
- `PluginKind`, `PluginPermission`, `PluginInstallSource` enums

**Registry Pattern:**
```rust
PluginRegistry -> Vec<RegisteredPlugin> (sorted by ID, BTreeMap deduplication)
PluginManager -> discovery, install, update, uninstall, enable, disable
```

**Manifest-driven Discovery**: Plugins discovered via `plugin.json` in root or `.claw-plugin/plugin.json`

### Hook System (`rust/crates/runtime/src/hooks.rs`)

**Event Types:**
- `HookEvent::PreToolUse`, `HookEvent::PostToolUse`

**Exit Code Handling:**
| Code | Action |
|------|--------|
| 0 | Allow tool execution |
| 2 | Deny tool execution |
| other | Warn, continue execution |

**Context Passing**: Environment variables + stdin JSON payload

---

## 5. Process and Workflow Patterns

### Bootstrap Pipeline (`src/bootstrap_graph.py`)

Seven-stage sequential pipeline with frozen `BootstrapGraph`:

1. Top-level prefetch side effects
2. Warning handler and environment guards
3. CLI parser and pre-action trust gate
4. Setup plus parallel command/agent loading
5. Deferred initialization after trust verification
6. Mode routing across multiple connection types
7. Query engine submit loop

### CLI Architecture (`rust/crates/claw-cli/`)

**Modular Structure:**
```rust
mod init;      // Repository initialization
mod input;     // Line editing, history, completion
mod render;    // Terminal output, markdown, spinners
```

**Key Types:**
```rust
enum CliAction { Prompt, Repl, Login, Logout, Init, ResumeSession, ... }
enum CliOutputFormat { Text, Json }
struct LiveCli { model, tools, permissions, runtime, session_handle }
```

**Runtime Builder Pattern:**
```rust
fn build_runtime(...) -> Result<ConversationRuntime<...>>
fn run_repl(model, allowed_tools, permission_mode)
```

### Slash Commands (`rust/crates/commands/`)

**28 slash commands** across 5 categories:

| Category | Commands |
|----------|----------|
| **Core** | Help, Exit, Clear, Confirm |
| **Workspace** | TodoWrite, Ask, Agent, WebFetch, WebSearch, Lsp |
| **Session** | Save, Load, Reset, Compact |
| **Git** | Branch, Commit, CommitPushPr, Push, Pull, Fetch, Checkout, Worktree |
| **Automation** | Skills, Agents, Plugins |

**Command Parsing**: Pattern matching via `SlashCommand::parse()`

**Multi-source Discovery**: Hierarchical roots with shadowing for agents/skills

---

## 6. Token Optimization Techniques

### Session Compaction (`rust/crates/runtime/src/compact.rs`)

```rust
pub struct CompactionConfig {
    pub preserve_recent_messages: usize,
    pub max_estimated_tokens: usize,
}

pub struct CompactionResult {
    pub summary: String,
    pub formatted_summary: String,
    pub compacted_session: Session,
    pub removed_message_count: usize,
}
```

**Key Functions:**
- `estimate_session_tokens()` - rough estimation (`len/4 + 1`)
- `should_compact()` - threshold checking
- `compact_session()` - merges new summary with existing (incremental)
- `get_compact_continuation_message()` - formats continuation prompt

**Tiered Preservation**: Keeps recent N messages verbatim; older messages summarized into system context

**Incremental Merging**: When re-compacting, highlights are combined from "Previously compacted context" and "Newly compacted context"

### Query Engine Configuration (`src/query_engine.py`)

```python
@dataclass(frozen=True)
class QueryEngineConfig:
    max_turns: int = 8
    max_budget_tokens: int = 2000
    compact_after_turns: int = 12
```

**Automatic Compaction**: After `compact_after_turns`, messages sliced to last N entries

**Budget Tracking**: `projected_usage` gates continued processing

### Token Usage Tracking (`src/models.py`, `src/cost_tracker.py`)

```python
@dataclass(frozen=True)
class UsageSummary:
    input_tokens: int
    output_tokens: int
    def add_turn(self, units: int) -> UsageSummary  # Immutable update
```

---

## 7. Configuration Patterns

### Rust Config Discovery (`rust/crates/runtime/src/config.rs`)

**5 Config Locations** (in precedence order):
1. User legacy config
2. User settings
3. Project legacy config
4. Project settings
5. Local settings

**ConfigSource Precedence**: User → Project → Local (later overrides earlier)

**Deep Object Merging**: Recursive merge for nested values

### Permission Modes

```rust
enum PermissionMode {
    ReadOnly,
    WorkspaceWrite,
    DangerFullAccess,
    Prompt,
    Allow
}

pub struct PermissionPolicy {
    active_mode: PermissionMode,
    tool_requirements: BTreeMap<String, PermissionMode>,
}
```

**Tiered Escalation**: Ordinal comparison (`current >= required`)

### Plugin Configuration

```rust
pub struct RuntimePluginConfig {
    enabled_plugins: Vec<String>,
    external_directories: Vec<PathBuf>,
    install_root: PathBuf,
    registry_path: PathBuf,
}

pub struct RuntimeHookConfig {
    pre_tool_use: Vec<String>,
    post_tool_use: Vec<String>,
}
```

---

## 8. Inter-Agent/Inter-Squad Communication Patterns

### MCP (Model Context Protocol) Implementation

**Transport Abstraction** (`rust/crates/runtime/src/mcp_client.rs`):
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

**Server Manager** (`rust/crates/runtime/src/mcp_stdio.rs`):
```rust
pub struct McpServerManager {
    servers: BTreeMap<String, ManagedMcpServer>,
    tool_index: BTreeMap<String, ToolRoute>,  // Qualified names: "server_name::tool_name"
}
```

**Content-Length Framing**: HTTP-like headers for message boundaries

**JSON-RPC Protocol**: Standard request/response with `id`, `method`, `params`

### Tool Execution Flow

```
QueryEnginePort.submit_message()
├── Check max_turns threshold
├── Format output (structured or plain)
├── Calculate projected_usage
├── Check max_budget_tokens
├── Append to mutable_messages
├── Extend permission_denials
├── Update total_usage
└── compact_messages_if_needed()

Tool Pool: PORTED_TOOLS (singleton, cached via @lru_cache)
└── get_tools(simple_mode, include_mcp, permission_context)
```

### Hook-based Communication

**Pre/Post Tool Hooks**: Environment variables + stdin JSON for context passing

---

## 9. Unique or Innovative Engineering Patterns

### 1. Dual Language Strategy
Python for exploration/prototyping, Rust for production - with structural correspondence between `src/` modules and `rust/crates/*`

### 2. Immutable-first Design
Extensive use of `@dataclass(frozen=True)` for thread-safe, hashable data structures throughout

### 3. Port Pattern Architecture
`QueryEnginePort` acts as adapter between query engine and external systems (session store, transcript store, port manifest)

### 4. Factory/Registry Patterns
- `PortingBacklog` wraps module collections with `summary_lines()` method
- `ToolRegistry` with definitions, permission_specs, execute, normalize_allowed_tools
- `CommandRegistry` with 28 slash commands across 5 categories

### 5. Multi-transport MCP Architecture
Seven distinct MCP transport implementations with unified interface

### 6. Signature-based Config Change Detection
`mcp_server_signature()` and `scoped_mcp_config_hash()` for reproducible config fingerprints

### 7. Builder Pattern for Configuration
```rust
impl RuntimeFeatureConfig {
    pub fn with_hooks(mut self, hooks: RuntimeHookConfig) -> Self { ... }
    pub fn with_plugins(mut self, plugins: RuntimePluginConfig) -> Self { ... }
}
```

### 8. Async Streaming with Heartbeat
`InternalPromptProgressReporter` uses `mpsc::channel` with 3-second heartbeat for long-running operations

### 9. Subagent Tool Executor (`rust/crates/tools/src/lib.rs`)
```rust
pub struct SubagentToolExecutor {
    plugin_tools: Vec<PluginTool>,
}
pub struct AgentJob { ... }
pub struct AgentOutput { ... }
pub struct ProviderRuntimeClient { ... }
```
Thread-based spawning with manifest persistence

### 10. LSP Context Enrichment
Generates prompt-friendly sections combining diagnostics, definitions, and references

---

## 10. File Classification Summary

| Category | Key Files |
|----------|-----------|
| **token_optimization** | `src/query_engine.py`, `rust/crates/runtime/src/compact.rs`, `src/models.py` |
| **agent_architecture** | `src/runtime.py`, `src/task.py`, `src/models.py`, `rust/crates/runtime/src/lib.rs` |
| **squad_architecture** | `rust/crates/plugins/src/lib.rs`, `rust/crates/commands/src/lib.rs` |
| **process_scripts** | `src/bootstrap_graph.py`, `rust/crates/claw-cli/src/main.rs`, `src/system_init.py` |
| **configuration** | `rust/crates/runtime/src/config.rs`, `rust/crates/runtime/src/permissions.rs` |
| **inter_agent_communication** | `rust/crates/runtime/src/mcp.rs`, `rust/crates/runtime/src/mcp_client.rs`, `rust/crates/runtime/src/mcp_stdio.rs`, `rust/crates/runtime/src/hooks.rs` |

---

## 11. Sources

- [ultraworkers/claw-code GitHub Repository](https://github.com/ultraworkers/claw-code)
