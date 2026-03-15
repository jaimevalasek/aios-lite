# Dynamic Skill: npm Packages

Use trusted package metadata and changelogs to verify compatibility, version stability, and maintenance status before adding a dependency.

**Fetch from:**
- Registry: https://registry.npmjs.org/{package-name}
- Changelog: https://github.com/{owner}/{repo}/blob/main/CHANGELOG.md

**What to verify:**
- Weekly downloads (>10k/week = safe; <1k = risk)
- Last publish date (>1 year without update = maintenance risk)
- Open issues / CVEs (check https://snyk.io/vuln/)
- Peer dependency constraints (avoid major version conflicts)
- Bundle size: https://bundlephobia.com/package/{name}

**MCP tool example:** `mcp_fetch url="https://registry.npmjs.org/zod" topic="latest version and peer deps"`
