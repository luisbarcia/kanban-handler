# kanban-handler

CLI for managing [Vibe Kanban](https://github.com/vibekanban) boards on self-hosted and remote instances via REST API.

[![CI](https://github.com/luisbarcia/kanban-handler/actions/workflows/ci.yml/badge.svg)](https://github.com/luisbarcia/kanban-handler/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)

<!-- TODO: Record a demo with asciinema or vhs (https://github.com/charmbracelet/vhs)
     Run: asciinema rec demo.cast
     Convert: agg demo.cast demo.gif
     Then replace this block with: ![demo](demo.gif)
-->

## Features

- **Multi-context management** — switch between Vibe Kanban instances like `kubectl`, with named contexts
- **Full issue lifecycle** — list, create, update, move, assign, and delete issues from the terminal
- **Multiple output formats** — `table`, `json`, and `minimal` for scripting and piping
- **Automatic retry** — retries on 5xx and network errors with exponential backoff
- **Secure by default** — warns on non-HTTPS URLs, branded types prevent ID mix-ups at compile time
- **Zero HTTP dependencies** — uses Node.js native `fetch` (18+)

## Quick Start

```bash
# Install
npm install -g kanban-handler

# Add your Vibe Kanban instance
kanban config add-context production \
  --url https://kanban.example.com \
  --token YOUR_JWT_TOKEN

# Verify connectivity
kanban health
```

## Usage

### Contexts

Manage multiple Vibe Kanban instances with named contexts:

```bash
# Add contexts for different environments
kanban config add-context staging --url https://staging.kanban.dev --token $STAGING_TOKEN
kanban config add-context production --url https://kanban.example.com --token $PROD_TOKEN

# Switch active context
kanban config use-context production

# List all contexts
kanban config list-contexts

# Show current context details
kanban config show
```

### Projects

```bash
kanban projects list
kanban projects list --output json
```

### Issues

```bash
# List issues in a project
kanban issues list --project abc123

# Create an issue
kanban issues create --project abc123 --title "Fix login bug" --priority high

# View a single issue
kanban issues get issue-456

# Update an issue
kanban issues update issue-456 --status done --priority low

# Assign and unassign
kanban issues assign issue-456 member-789
kanban issues unassign issue-456 member-789

# Delete (prompts for confirmation)
kanban issues delete issue-456
kanban issues delete issue-456 --force
```

### Tags

```bash
kanban tags list
kanban tags add issue-456 tag-abc
kanban tags remove issue-456 tag-abc
```

### Workspaces

```bash
kanban workspaces list
kanban workspaces start issue-456
kanban workspaces delete ws-789
```

### Sessions

```bash
# List sessions in a workspace
kanban sessions list ws-789

# Create a new AI session
kanban sessions create ws-789

# Run a prompt in a session
kanban sessions prompt ws-789 session-abc "Summarize the issue"

# Pipe prompts from stdin
echo "Analyze this issue" | kanban sessions prompt ws-789 session-abc -
```

### Global Options

Every command supports these flags:

```
--context <name>    Override active context
--token <jwt>       Override authentication token
--output <format>   Output format: table, json, minimal (default: table)
--no-color          Disable colored output
--verbose           Enable verbose output
```

## Configuration

Config is stored at `~/.config/kanban-handler/config.json` (XDG-compliant).

### Resolution Priority

Values are resolved in this order — first match wins:

| Setting | Flag | Environment Variable | Config File |
|---------|------|---------------------|-------------|
| Token | `--token` | `KANBAN_TOKEN` | Context token |
| Context | `--context` | `KANBAN_CONTEXT` | `currentContext` |
| Project | `--project` | — | Context `defaultProject` |

### Setting a Default Project

Avoid passing `--project` on every command:

```bash
kanban config add-context production \
  --url https://kanban.example.com \
  --token $TOKEN \
  --default-project abc123
```

## Output Formats

```bash
# Table (default) — human-readable with borders
kanban projects list

# JSON — machine-readable, pipe to jq
kanban projects list --output json | jq '.[].name'

# Minimal — one value per line, good for scripting
kanban projects list --output minimal
```

## Development

```bash
git clone https://github.com/luisbarcia/kanban-handler.git
cd kanban-handler
npm install

npm run build        # Build with tsup (ESM, single file with shebang)
npm run dev          # Watch mode
npm run test         # Run 213 tests with vitest
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run format       # Prettier
```

### Architecture

Four-layer design with strict separation of concerns:

```
src/
  commands/     CLI layer (Commander subcommands)
  client/       HTTP client with branded IDs and retry
  config/       Multi-context config manager (kubectl-style)
  output/       Formatters (table/json/minimal) and UI helpers
  utils/        Error hierarchy with typed exit codes
```

## License

[MIT](LICENSE)
