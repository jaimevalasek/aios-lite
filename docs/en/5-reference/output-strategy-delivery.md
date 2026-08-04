# Squad outputs and delivery

AIOSON squads are file-first. Every generated content item has a canonical file copy. The SQLite database at
`.aioson/runtime/aios.sqlite` belongs to one local clone and may index those files for dashboards, search, metrics,
coordination, and delivery. It is never the only content copy.

## Ownership boundary

| Surface | Role | Sharing |
|---|---|---|
| `.aioson/squads/{slug}/` | squad definition, agents, workflows, templates, contracts | versioned |
| `output/{slug}/` | canonical generated content | version when it is a useful deliverable |
| `media/{slug}/` | media referenced by outputs | project policy |
| `.aioson/runtime/aios.sqlite` | local index, telemetry, and operational coordination | gitignored, per clone |
| `aioson-logs/{slug}/` | verbose execution logs | gitignored, local |

A pull brings committed squad packages and outputs, not another developer's operational history. Each developer
creates a local runtime and can rebuild its content index from files.

## Current manifest contract

```json
{
  "storagePolicy": {
    "primary": "file",
    "artifacts": "output/editorial/",
    "exports": { "html": true, "markdown": true, "json": true }
  },
  "rules": {
    "outputsDir": "output/editorial",
    "logsDir": "aioson-logs/editorial",
    "mediaDir": "media/editorial"
  },
  "outputStrategy": {
    "mode": "files",
    "fileOutput": {
      "enabled": true,
      "dir": "output/editorial/",
      "formats": ["html", "md", "json"]
    },
    "delivery": {
      "webhooks": [],
      "cloudPublish": false,
      "autoPublish": false
    }
  }
}
```

`outputStrategy` configures formats and delivery. Runtime indexing is framework behavior, so new manifests do not
write `dataOutput`.

## Local index and maintenance

`runtime:ingest` and completed tracked runs can project files into `content_items`. This supports the local dashboard,
search, summaries, metrics, and delivery without making the database authoritative. File-backed index rows are
rebuildable and can be pruned explicitly:

```bash
aioson runtime:ingest . --squad=editorial
aioson runtime:storage . --json
aioson runtime:prune . --dry-run --json
aioson runtime:prune . --compact --json
```

Pruning preserves legacy database-only rows that do not have a registered source file. Export them before migration.

## Legacy migration

`outputStrategy.mode: "sqlite"`, `outputStrategy.mode: "hybrid"`, `dataOutput`, and
`storagePolicy.primary: "sqlite"` are legacy inputs. They remain readable for safe migration but produce validation
warnings.

1. Export or recreate each payload under `rules.outputsDir`.
2. Verify the files are complete without the database.
3. Set `storagePolicy.primary` to `"file"` and point `artifacts` to the real output directory.
4. Set `outputStrategy.mode` to `"files"` and keep `fileOutput.enabled: true`.
5. Remove `dataOutput`; keep delivery and webhook settings.
6. Validate the squad and reindex its files.

Output strategy transfer commands normalize legacy strategies to file-first:

```bash
aioson output-strategy:export . --squad=source
aioson output-strategy:import . --squad=target --from=source
```

## Team Git policy

- Always commit `.aioson/squads/{slug}/`.
- Never commit `.aioson/runtime/`, SQLite WAL/SHM files, or `aioson-logs/`.
- Commit `output/{slug}/` when it is a deliverable or useful shared evidence.
- Ignore disposable output in the project's own `.gitignore`.

This lets multiple developers use the same squad with independent local runtimes and no binary database merges.
