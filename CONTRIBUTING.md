# Contributing

Thanks for considering contributing to kanban-handler.

## Development Setup

```bash
git clone https://github.com/luisbarcia/kanban-handler.git
cd kanban-handler
npm install
npm run dev   # watch mode
```

## Workflow

1. Fork the repo and create a branch from `main`
2. Write your changes following the existing code style
3. Add or update tests for any new functionality
4. Run the full check suite before submitting:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

5. Open a Pull Request against `main`

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/). All commits must follow the format:

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, ci, chore
```

Commits are validated by commitlint on push. Release-please uses them to generate changelogs and determine version bumps.

## Architecture

The codebase has four layers with strict separation:

| Layer | Directory | Responsibility |
|-------|-----------|---------------|
| CLI | `src/commands/` | Commander subcommands, flag parsing, output |
| Client | `src/client/` | HTTP client, typed endpoints, retry logic |
| Config | `src/config/` | Multi-context config management (XDG paths) |
| Output | `src/output/` | Formatters (table/json/minimal), UI helpers |

Each command follows the pattern: resolve context -> create client -> call API -> format output -> handle errors.

## Testing

- Tests use **vitest** with globals enabled
- API client tests inject a mock `fetchFn` — no real HTTP calls
- Config tests use `ConfigManager.createInMemory()` — no disk I/O
- Run a single file: `npx vitest run src/client/api-client.test.ts`

## Code Style

- TypeScript strict mode with `exactOptionalPropertyTypes`
- ESM only (`"type": "module"`)
- Prettier for formatting, ESLint for linting
- Branded types for domain IDs (prevents mixing at compile time)

## Reporting Bugs

Open an [issue](https://github.com/luisbarcia/kanban-handler/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
- CLI output with `--verbose` flag
