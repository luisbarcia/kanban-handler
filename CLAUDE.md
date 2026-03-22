# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

kanban-handler is a TypeScript CLI for managing Vibe Kanban boards on self-hosted/remote instances via REST API.

## Build & Development

```bash
npm run build        # Build with tsup (ESM, Node 18+)
npm run dev          # Watch mode
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:watch   # vitest watch
npm run lint         # eslint src/
npm run format       # prettier --write src/
```

## Architecture

Layered architecture with 4 layers, each in its own directory:

- **`src/commands/`** — Commander subcommands (CLI layer). Each file exports a `registerXxxCommand(program, configManager)` function. Pattern: resolve context → create client → call API → format output → handle errors.
- **`src/client/`** — Typed HTTP client (`KanbanClient`) with branded IDs, retry on 5xx/network errors, 10s timeout. Decoupled from CLI for future SDK extraction.
- **`src/config/`** — Multi-context config manager (kubectl-style). Uses `conf` for storage, `env-paths` for XDG paths. Resolution priority: flag > env var > config file.
- **`src/output/`** — Formatters (table/json/minimal) and UI helpers (chalk, ora, TTY detection).
- **`src/utils/errors.ts`** — Error hierarchy with exit codes (1=auth, 2=not found, 3=api, 4=network, 5=config).

## Key Decisions

- **fetch native** (Node 18+) — zero HTTP deps
- **Branded types** for domain IDs (ProjectId, IssueId, etc.) — prevents mixing IDs at compile time
- **commander** — 0 deps, fast startup
- **tsup** — bundles to single ESM file with shebang
- **vitest** — ESM-native, fast, Jest-compatible API

## Testing

Tests use vitest with globals. API client tests inject a mock `fetchFn`. Config manager tests use `ConfigManager.createInMemory()` to avoid disk I/O.

Run a single test file:
```bash
npx vitest run src/client/api-client.test.ts
```

## Config

Config stored at `~/.config/kanban-handler/config.json` (XDG). Multi-context with `currentContext` and named contexts. Token resolution: `--token` flag > `KANBAN_TOKEN` env > config.
