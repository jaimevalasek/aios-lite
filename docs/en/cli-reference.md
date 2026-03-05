# CLI Reference

Complete reference for all `aios-lite` commands.

---

## init

Create a new project directory and install AIOS Lite inside it.

```bash
aios-lite init <project-name>
aios-lite init my-app --lang=pt-BR
aios-lite init my-app --tool=codex
aios-lite init my-app --lang=es --tool=gemini --json
```

**Options:**
- `--lang=en|pt-BR|es|fr` — sets `conversation_language` in the generated context and applies the matching agent locale pack. Default: `en`.
- `--tool=codex|claude|gemini|opencode` — configures the primary AI client. Affects which gateway file is used. Default: `codex`.
- `--json` — prints structured JSON result instead of human-readable output.

**What it does:**
1. Creates `<project-name>/` directory.
2. Copies all template files into it.
3. Applies the selected locale pack.
4. Prints the recommended first command (`@setup`).

---

## install

Install AIOS Lite in an existing directory (or the current directory).

```bash
aios-lite install
aios-lite install ./my-project
aios-lite install --lang=pt-BR --tool=claude
```

**Options:** same as `init`.

**Use this when:**
- The project already exists (legacy codebase, existing repo).
- You want to add AIOS Lite to a monorepo package.

---

## update

Update managed files to the latest template version. Preserves context files and anything not in the managed file list.

```bash
aios-lite update
aios-lite update ./my-project
aios-lite update --lang=pt-BR
```

**Options:**
- `--lang=en|pt-BR|es|fr` — re-applies the locale pack after updating. If omitted, re-applies whatever locale is currently active.
- `--json` — prints structured JSON result.

**What it updates:** all files in the `MANAGED_FILES` list (agents, config, gateway files, skills). Does not touch `project.context.md`, `discovery.md`, `architecture.md`, or other context files you created.

---

## info

Show CLI version, installation status, and detected framework for a directory.

```bash
aios-lite info
aios-lite info ./my-project
aios-lite info --json
```

**Output:**
```
aios-lite v0.1.25
Directory: /path/to/my-project
Installed here: yes
Framework detected: Laravel
Evidence: composer.json, artisan
```

**With `--json`:**
```json
{
  "ok": true,
  "version": "0.1.25",
  "targetDir": "/path/to/my-project",
  "installed": true,
  "detection": {
    "framework": "Laravel",
    "evidence": "composer.json, artisan"
  }
}
```

---

## doctor

Verify that all managed files are present and valid. Use `--fix` to restore any missing files.

```bash
aios-lite doctor
aios-lite doctor ./my-project
aios-lite doctor --fix
aios-lite doctor --fix --dry-run
aios-lite doctor --json
```

**Options:**
- `--fix` — copies missing managed files from the template. Does not overwrite existing files.
- `--dry-run` — shows what `--fix` would do without making changes.
- `--json` — structured JSON output with per-check results.

**Checks performed:**
- All files in `MANAGED_FILES` exist.
- Gateway files (`CLAUDE.md`, `AGENTS.md`, `OPENCODE.md`, `.gemini/GEMINI.md`) are present.
- `.aios-lite/agents/` directory is populated.
- `.aios-lite/context/` directory exists.

**Typical workflow after an update:**
```bash
aios-lite update
aios-lite doctor --fix
```

---

## setup:context

Interactive wizard that creates `.aios-lite/context/project.context.md`. This is the main context file that all agents read.

```bash
# Interactive mode
aios-lite setup:context

# Non-interactive (CI / scripted)
aios-lite setup:context --defaults
aios-lite setup:context --defaults --framework="Laravel" --backend="PHP" --database="MySQL"
aios-lite setup:context --defaults --framework="Next.js" --frontend="React" --lang=pt-BR
```

**Non-interactive flags:**
- `--defaults` — skips all prompts, uses detected or provided values.
- `--framework=<name>` — e.g. `"Laravel"`, `"Next.js"`, `"Django"`, `"Hardhat"`. Any free-text value accepted.
- `--backend=<name>` — e.g. `"PHP"`, `"Python"`, `"Node.js"`.
- `--frontend=<name>` — e.g. `"React"`, `"Vue"`, `"Livewire"`.
- `--database=<name>` — e.g. `"PostgreSQL"`, `"MySQL"`, `"SQLite"`.
- `--auth=<name>` — e.g. `"Laravel Breeze"`, `"JWT"`, `"None"`.
- `--uiux=<name>` — e.g. `"Tailwind CSS"`, `"shadcn/ui"`.
- `--classification=MICRO|SMALL|MEDIUM` — override the auto-calculated score.
- `--profile=developer|beginner|team` — sets the AI interaction style.
- `--lang=en|pt-BR|es|fr` — sets `conversation_language`.
- `--json` — structured JSON output.

**Web3 flags:**
- `--web3-enabled=true|false`
- `--web3-networks=ethereum,solana`
- `--contract-framework=Hardhat`
- `--wallet-provider=wagmi`
- `--indexer="The Graph"`
- `--rpc-provider=Alchemy`

**Brownfield / legacy project example:**
```bash
aios-lite install .
aios-lite setup:context --defaults --framework="CodeIgniter 3" --backend="PHP" --database="MySQL"
```

---

## context:validate

Validate the existing `project.context.md` file — checks YAML frontmatter structure, required fields, and allowed values.

```bash
aios-lite context:validate
aios-lite context:validate ./my-project
aios-lite context:validate --json
```

**What it validates:**
- File exists at `.aios-lite/context/project.context.md`.
- YAML frontmatter is parseable.
- All required fields are present: `project_name`, `project_type`, `profile`, `framework`, `framework_installed`, `classification`, `conversation_language`, `aios_lite_version`.
- `project_type` is one of: `web_app`, `api`, `site`, `script`, `dapp`.
- `classification` is one of: `MICRO`, `SMALL`, `MEDIUM`.
- `profile` is one of: `developer`, `beginner`, `team`.

**Typical use:** run after manually editing `project.context.md` to confirm it's still valid.

```bash
# edit project.context.md
aios-lite context:validate
# ✓ project.context.md is valid
```

---

## agents

List all registered agents with their paths, dependencies, and outputs.

```bash
aios-lite agents
aios-lite agents ./my-project
aios-lite agents --json
```

**Output example:**
```
Agents (locale: en):
@setup (setup)
  Path: .aios-lite/locales/en/agents/setup.md
  Active: .aios-lite/agents/setup.md
  Depends on: none
  Output: .aios-lite/context/project.context.md

@product (product)
  Path: .aios-lite/locales/en/agents/product.md
  Active: .aios-lite/agents/product.md
  Depends on: none
  Output: .aios-lite/context/prd.md
...
```

The locale shown reflects the active agent locale pack (from `project.context.md` or the `--lang` flag).

---

## agent:prompt

Print the activation prompt for a specific agent, ready to paste into any AI CLI that does not support slash commands.

```bash
aios-lite agent:prompt setup
aios-lite agent:prompt setup --tool=codex
aios-lite agent:prompt ux-ui --tool=claude
aios-lite agent:prompt dev --tool=gemini --json
```

**Arguments:**
- `<agent>` — agent id: `setup`, `product`, `analyst`, `architect`, `ux-ui`, `pm`, `dev`, `qa`, `orchestrator`.

**Options:**
- `--tool=codex|claude|gemini|opencode` — formats the prompt for the target CLI. Default: `codex`.
- `--json` — returns structured JSON with the prompt string.

**When to use:** if you're using an AI CLI that doesn't support `/setup` slash commands, run this to get the exact text to paste into the chat.

```bash
# Copy the prompt for @analyst in Gemini
aios-lite agent:prompt analyst --tool=gemini
# → paste the output into Gemini CLI
```

---

## workflow:plan

Show the recommended agent sequence for the current project based on its `classification`.

```bash
aios-lite workflow:plan
aios-lite workflow:plan ./my-project
aios-lite workflow:plan --classification=SMALL
aios-lite workflow:plan --json
```

**Options:**
- `--classification=MICRO|SMALL|MEDIUM` — override the value from `project.context.md`.
- `--json` — structured JSON with `sequence`, `commands`, and `notes` arrays.

**Output example:**
```
Workflow plan — SMALL:
  @setup
  @product
  @analyst
  @architect
  @dev
  @qa

Notes:
  — Framework not installed: agents will include installation steps.
```

**Sequences by classification:**
- `MICRO`: `@setup → @product (optional) → @dev`
- `SMALL`: `@setup → @product → @analyst → @architect → @dev → @qa`
- `MEDIUM`: `@setup → @product → @analyst → @architect → @ux-ui → @pm → @orchestrator → @dev → @qa`

**Feature development workflow (after initial setup):**

Once the project is set up, each new feature follows a shorter sequence — no `@setup` required:

```
@product → @analyst → @dev → @qa
```

`@product` creates a feature-scoped `prd-{slug}.md` and registers the feature in `features.md`. `@analyst` produces `requirements-{slug}.md` and `spec-{slug}.md`. `@dev` reads the feature spec. `@qa` closes the feature by updating `spec-{slug}.md` with a QA sign-off and marking it `done` in `features.md`.

The `SMALL` and MEDIUM outputs include a note reminding you of this sequence.

---

## test:smoke

End-to-end integration test that installs AIOS Lite in a temporary directory, runs all major commands, and verifies the output. Used for CI and release validation.

```bash
aios-lite test:smoke
aios-lite test:smoke --lang=pt-BR
aios-lite test:smoke --web3=ethereum
aios-lite test:smoke --web3=solana
aios-lite test:smoke --web3=cardano
aios-lite test:smoke --profile=mixed
aios-lite test:smoke --profile=parallel
aios-lite test:smoke --keep
aios-lite test:smoke --json
```

**Options:**
- `--lang=en|pt-BR|es|fr` — runs the test with the given locale active.
- `--web3=ethereum|solana|cardano` — seeds a Web3 project structure and tests Web3 context generation.
- `--profile=standard|mixed|parallel` — `standard` runs the default flow; `mixed` runs a combined locale+web3 test; `parallel` includes `parallel:init` and `parallel:assign`.
- `--keep` — preserves the temporary directory after the test for inspection.
- `--json` — structured JSON output with per-step results.

**What the standard profile tests:**
1. `install` in temp dir
2. `setup:context --defaults`
3. `locale:apply`
4. `agents` list
5. `agent:prompt setup`
6. `context:validate`
7. `doctor`
8. `update`
9. `workflow:plan`

**Note:** this command is intended for contributors and CI pipelines, not for daily project use.

---

## test:package

Simulate `npm pack` in a temporary directory to verify what would be published and that the package installs correctly.

```bash
aios-lite test:package
aios-lite test:package ./path/to/source
aios-lite test:package --keep
aios-lite test:package --dry-run
aios-lite test:package --json
```

**Options:**
- `--keep` — preserves the temp directory after the test.
- `--dry-run` — checks prerequisites without actually running `npm pack`.
- `--json` — structured JSON output.

**What it does:**
1. Runs `npm pack` on the source directory.
2. Extracts the `.tgz` in a temporary directory.
3. Verifies the key files are present in the package.
4. Reports pass/fail.

**Note:** requires Node.js and npm to be available. Intended for release validation.
