# Iteration 61 — qa: browser testing commands → v0.1.26

## Date
2026-03-04

## Commit
838866c — feat(qa): add browser QA commands powered by Playwright

---

## What was requested
Add browser QA capability directly inside aios-lite (same Node.js stack, same install). No separate project needed. The user had a vision for a "qa-master" that opens Chrome, alternates between personas (naive user, hacker, power user, mobile), and generates actionable reports — all without requiring an LLM.

---

## Architecture decision
Playwright as optional runtime dependency (checked at runtime via `require('playwright')`). Clear install hint when not present. Zero impact on `npm install -g aios-lite` for users who don't need browser testing.

---

## Files created (5)

| File | Purpose |
|------|---------|
| `src/commands/qa-doctor.js` | Prerequisite checker (Playwright, Chromium, config, URL, context, prd.md) |
| `src/commands/qa-init.js` | Config generator — reads prd.md + discovery.md → aios-qa.config.json |
| `src/commands/qa-run.js` | Full browser QA session (4 personas + probes + a11y + perf + AC coverage) |
| `src/commands/qa-scan.js` | Autonomous crawler — maps all routes, probes each one |
| `src/commands/qa-report.js` | Display last generated report |

## Files modified (12)

| File | Change |
|------|--------|
| `src/cli.js` | 5 new command routes + help lines + JSON_SUPPORTED_COMMANDS entries |
| `src/i18n/messages/en.js` | Added qa_doctor, qa_init, qa_run, qa_scan, qa_report sections |
| `src/i18n/messages/pt-BR.js` | Same (Portuguese translations) |
| `src/i18n/messages/es.js` | Same (Spanish translations) |
| `src/i18n/messages/fr.js` | Same (French translations) |
| `template/.aios-lite/agents/qa.md` | aios-qa integration section (merge rules) |
| `template/.aios-lite/locales/en/agents/qa.md` | Same |
| `template/.aios-lite/locales/pt-BR/agents/qa.md` | Same (Portuguese) |
| `template/.aios-lite/locales/es/agents/qa.md` | Same (Spanish) |
| `template/.aios-lite/locales/fr/agents/qa.md` | Same (French) |
| `.gitignore` | Added `qa-senior.txt` (user's local notes file) |

---

## Commands

```bash
aios-lite qa:init    # reads prd.md + discovery.md → generates aios-qa.config.json
aios-lite qa:doctor  # checks Playwright, Chromium, config, URL reachable, context, prd.md
aios-lite qa:run     # full QA session in browser
aios-lite qa:scan    # autonomous crawler (depth 3, max 50 pages)
aios-lite qa:report  # display last report
```

---

## qa:run — what it does

### 4 personas

| Persona | Behavior |
|---------|----------|
| naive | Empty form submits, 10K-char inputs, ghost clickable elements |
| hacker | Exposed secrets (8 patterns), sensitive files (10 paths), XSS, open redirect, SQL injection, IDOR (±1 ID), debug routes |
| power | Keyboard navigation focus visibility, boundary values on number/date inputs |
| mobile | 375px viewport, horizontal overflow, touch targets < 44px, fonts < 12px |

### Security probes (hacker persona)
- **Exposed secrets**: `window.__NEXT_DATA__`, `window.__env__`, `window.ENV`, etc. against 8 patterns (OpenAI sk-, Stripe pk_live/pk_test, AWS AKIA, Google AIzaSy, GitHub ghp_/ghs_, Slack xox*, generic SECRET/TOKEN/PASSWORD)
- **Sensitive files**: `/.env`, `/.env.local`, `/.env.production`, `/.env.development`, `/.git/config`, `/config.js`, `/api/config`, `/wp-config.php`, `/application.yml`, `/application.properties`
- **XSS**: `<img src=x onerror="window.__xss=1">` in all text inputs, dialog detection + eval check
- **Open redirect**: 8 param names (`redirect`, `next`, `return`, `returnUrl`, `goto`, `url`, `dest`, `destination`)
- **SQL injection**: `' OR '1'='1' --` with SQL error message detection in response
- **IDOR**: numeric ID in URL → try ±1 and +9999
- **Debug routes**: 8 common routes (`/admin`, `/debug`, `/_debug`, `/api/debug`, etc.)

### Network + console analysis (post-persona)
- Console errors with stack traces → Medium finding
- Sensitive params in GET URLs → High finding
- HTTP requests from HTTPS page → Medium finding (mixed content)

### Accessibility (5 checks)
- Images without `alt` attribute (WCAG 1.1.1)
- Form inputs without accessible label (WCAG 1.3.1)
- Buttons without accessible name (WCAG 4.1.2)
- Heading level skipped (e.g. h1 → h3)
- `<html>` missing `lang` attribute (WCAG 3.1.1)

### Performance (4 checks)
- Page load time > threshold (default 3000ms)
- TTFB > threshold (default 800ms)
- Request count > threshold (default 80)
- Total transfer size > threshold (default 2048KB)

### AC coverage
Reads `prd.md`, parses AC items from table rows and 🔴 must-have bullets, screenshots each with the current page state.

### Output
- `aios-qa-report.md` — same severity format as `@qa` (Critical/High/Medium/Low)
- `aios-qa-report.json` — machine-readable for CI/CD
- `aios-qa-screenshots/` — one PNG per finding ID + one per AC item

---

## qa:scan — autonomous crawler

1. Crawls all routes from base URL (BFS, configurable depth/max-pages)
2. Probes sensitive files (once per domain)
3. On each route: secret scan (HTML source + window globals), console leakage, accessibility quick check, horizontal overflow

---

## @qa agent integration

Added to base qa.md + all 4 locale variants:
- If `aios-qa-report.md` exists → read before writing QA report
- AC marked FAIL by aios-qa → override status to Missing
- Same finding in static review + browser → promote severity one level
- Add `[browser-validated]` tag to ACs that passed

---

## aios-qa.config.json structure

```json
{
  "project_name": "MyApp",
  "url": "http://localhost:3000",
  "language": "en",
  "personas": ["naive", "hacker", "power", "mobile"],
  "security_probes": ["exposed_env_vars", "xss_inputs", "open_redirect", "sensitive_files", "idor_probe", "console_leaks", "debug_routes", "mixed_content", "sensitive_get_params"],
  "performance_thresholds": { "page_load_ms": 3000, "ttfb_ms": 800, "requests_max": 80, "transfer_max_kb": 2048 },
  "accessibility": true,
  "network_capture": true,
  "screenshot_on_finding": true,
  "scenarios": [],
  "business_rules": []
}
```

---

## Typical workflow

```
Terminal 1 (aios-lite agents):
@setup → @product → @analyst → @architect → @dev

Terminal 2 (browser QA, while app is running):
aios-lite qa:init --url=http://localhost:3000
aios-lite qa:run

Terminal 1 (continues):
@qa   ← reads aios-qa-report.md and merges findings
```

---

## Test result
178/178 pass. Lint clean.
