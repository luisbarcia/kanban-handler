# kanban-handler CLI — Design Spec

## Overview

CLI Node.js/TypeScript para interagir com instancias Vibe Kanban self-hosted/remotas via REST API (Axum/Rust). Multi-contexto (estilo kubectl), distribuivel via npm, uso pessoal com potencial open-source.

**Instancia de referencia**: `kanban.servs.dev`

## Requisitos Funcionais

### RF-01: Gerenciamento de Contextos
- Adicionar, listar, remover e alternar entre instancias Vibe Kanban
- Cada contexto armazena: URL base, JWT token, projeto default (opcional)
- Resolucao de contexto: `--context` flag > `KANBAN_CONTEXT` env var > `currentContext` no config

### RF-02: CRUD de Issues
- Listar issues com filtros (status, projeto, assignee)
- Criar, visualizar, atualizar e deletar issues
- Mover issues entre status (`move`)
- Atribuir/desatribuir issues a membros

### RF-03: Gerenciamento de Tags
- Listar tags disponiveis
- Adicionar/remover tags de issues

### RF-04: Projetos
- Listar projetos da instancia

### RF-05: Workspaces
- Listar, iniciar e deletar workspaces

### RF-06: Sessions
- Listar, criar coding sessions
- Enviar prompts para sessions ativas

### RF-07: Health Check
- Verificar conectividade e autenticacao com a instancia ativa

### RF-08: Output Flexivel
- Formatos: `table` (default, colorido), `json` (para piping), `minimal` (apenas IDs/essenciais)
- Cores apenas quando stdout e TTY

## Requisitos Nao-Funcionais

### RNF-01: Performance
- Startup da CLI < 100ms (Node runtime ~30ms + commander ~18ms + overhead)
- Timeout de requests HTTP: 10s

### RNF-02: Compatibilidade
- Node.js >= 18.0.0 (fetch nativo)
- macOS, Linux, Windows

### RNF-03: Seguranca
- Tokens armazenados em config file local (permissoes 600)
- Suporte a override via env var (`KANBAN_TOKEN`) para CI/CD
- Nunca logar tokens em output verbose

### RNF-04: Distribuicao
- Publicavel via npm (`npm install -g kanban-handler`)
- Comando: `kanban`

## Estrutura de Comandos

```
kanban <comando> <subcomando> [opcoes]
```

### Comandos

| Comando | Subcomandos | Descricao |
|---------|-------------|-----------|
| `config` | `add-context`, `use-context`, `list-contexts`, `remove-context`, `show` | Gerenciar instancias e contexto ativo |
| `issues` | `list`, `create`, `get`, `update`, `delete`, `assign`, `unassign`, `move` | CRUD de issues + atribuicao + mudanca de status |
| `projects` | `list` | Listar projetos |
| `tags` | `list`, `add`, `remove` | Gerenciar tags em issues |
| `workspaces` | `list`, `start`, `delete` | Gerenciar workspaces |
| `sessions` | `list`, `create`, `prompt` | Gerenciar coding sessions |
| `health` | *(sem subcomando)* | Verificar conectividade |

### Flags Globais

| Flag | Descricao |
|------|-----------|
| `--context <name>` | Override do contexto ativo |
| `--token <jwt>` | Override do token de autenticacao |
| `--output <format>` | `table` (default), `json`, `minimal` |
| `--no-color` | Desabilitar cores |
| `--verbose` | Output detalhado para debug |

### Parametros por Subcomando

#### `config`

| Subcomando | Argumentos | Flags | Descricao |
|------------|------------|-------|-----------|
| `add-context` | `<name>` | `--url` (obrig.), `--token` (obrig.), `--default-project` (opc.) | Adiciona um contexto |
| `use-context` | `<name>` | — | Define contexto ativo |
| `list-contexts` | — | — | Lista todos os contextos |
| `remove-context` | `<name>` | — | Remove um contexto |
| `show` | — | — | Mostra contexto ativo (URL, projeto default, token mascarado) |

#### `issues`

| Subcomando | Argumentos | Flags | Descricao |
|------------|------------|-------|-----------|
| `list` | — | `--project` (obrig. se sem defaultProject), `--status`, `--assignee`, `--limit` (default 50), `--page` (default 1) | Lista issues com filtros e paginacao |
| `create` | — | `--title` (obrig.), `--project` (obrig. se sem defaultProject), `--description`, `--priority`, `--status` | Cria uma issue |
| `get` | `<issue-id>` | — | Exibe detalhes de uma issue |
| `update` | `<issue-id>` | `--title`, `--description`, `--priority`, `--status` | Atualiza campos de uma issue |
| `delete` | `<issue-id>` | `--force` (skip confirmacao) | Deleta uma issue |
| `assign` | `<issue-id>` | `--member` (obrig.) | Atribui issue a um membro |
| `unassign` | `<issue-id>` | `--member` (obrig.) | Remove atribuicao |
| `move` | `<issue-id>` | `--status` (obrig.) | Atalho para `update --status` |

#### `tags`

| Subcomando | Argumentos | Flags | Descricao |
|------------|------------|-------|-----------|
| `list` | — | — | Lista tags disponiveis |
| `add` | `<issue-id>` | `--tag` (obrig.) | Adiciona tag a issue |
| `remove` | `<issue-id>` | `--tag` (obrig.) | Remove tag de issue |

#### `workspaces`

| Subcomando | Argumentos | Flags | Descricao |
|------------|------------|-------|-----------|
| `list` | — | — | Lista workspaces |
| `start` | `<issue-id>` | — | Cria workspace para uma issue |
| `delete` | `<workspace-id>` | `--force` | Deleta workspace |

#### `sessions`

| Subcomando | Argumentos | Flags | Descricao |
|------------|------------|-------|-----------|
| `list` | `<workspace-id>` | — | Lista sessions de um workspace |
| `create` | `<workspace-id>` | — | Cria session em workspace |
| `prompt` | `<session-id>` | `--message` (obrig., ou stdin) | Envia prompt para session ativa |

### Exemplos de Uso

```bash
# Setup inicial
kanban config add-context prod --url https://kanban.servs.dev --token <jwt>
kanban config use-context prod

# Trabalho diario
kanban issues list --project <id> --status backlog
kanban issues create --title "Implementar feature X" --project <id> --priority high
kanban issues move abc123 --status in_progress
kanban issues assign abc123 --member <user-id>

# Scripting
kanban issues list --output json | jq '.[] | .title'

# Health check
kanban health
```

## Arquitetura

### Diagrama de Camadas

```
+---------------------+
|     CLI Layer        |  commander — parse args, flags
|  src/commands/*.ts   |
+----------+----------+
           |
+----------v----------+
|   Client Layer       |  HTTP client tipado, retry, error handling
|  src/client/*.ts     |  (extraivel como SDK futuro)
+----------+----------+
           |
+----------v----------+
|   Config Layer       |  Multi-contexto, env-paths, conf
|  src/config/*.ts     |
+----------+----------+
           |
+----------v----------+
|   Output Layer       |  table/json/minimal, TTY detection
|  src/output/*.ts     |
+---------------------+
```

### Estrutura de Diretorios

```
src/
  index.ts                 # Entry point (#!/usr/bin/env node)
  cli.ts                   # Commander setup, registro de comandos
  commands/
    config.ts              # add-context, use-context, list, remove, show
    issues.ts              # list, create, get, update, delete, assign, move
    projects.ts            # list
    tags.ts                # list, add, remove
    workspaces.ts          # list, start, delete
    sessions.ts            # list, create, prompt
    health.ts              # health check
  client/
    api-client.ts          # Classe KanbanClient — HTTP client tipado
    types.ts               # Branded types (IssueId, ProjectId), interfaces da API
    endpoints.ts           # Mapeamento de rotas REST
  config/
    manager.ts             # CRUD de contextos, resolucao de contexto ativo
    paths.ts               # Caminhos XDG via env-paths
  output/
    formatter.ts           # table / json / minimal formatters
    ui.ts                  # chalk, ora, cli-table3 com TTY detection
  utils/
    errors.ts              # Classes de erro (AuthError, NetworkError, ApiError)
```

### Client HTTP Tipado

```typescript
// Branded types — todos os IDs de dominio sao branded para type safety
type Brand<T, B extends string> = T & { readonly __brand: B };
type ProjectId = Brand<string, "ProjectId">;
type IssueId = Brand<string, "IssueId">;
type MemberId = Brand<string, "MemberId">;
type TagId = Brand<string, "TagId">;
type WorkspaceId = Brand<string, "WorkspaceId">;
type SessionId = Brand<string, "SessionId">;

// Response envelope (espelhando API Axum)
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error_data?: { message: string; code: string };
}

// Paginacao
interface PaginationParams {
  limit?: number;   // default 50
  page?: number;    // default 1
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Interfaces de dominio (campos principais)
interface Issue {
  id: IssueId;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  projectId: ProjectId;
  assignees: MemberId[];
  tags: TagId[];
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: ProjectId;
  name: string;
}

interface Tag {
  id: TagId;
  name: string;
  color?: string;
}

interface Workspace {
  id: WorkspaceId;
  issueId: IssueId;
  status: string;
}

interface Session {
  id: SessionId;
  workspaceId: WorkspaceId;
  status: string;
}

interface Execution {
  id: string;
  sessionId: SessionId;
  status: string;
  output?: string;
}

interface CreateIssueInput {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
}

interface UpdateIssueInput {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
}

interface IssueFilters {
  status?: string;
  assignee?: MemberId;
}

interface HealthStatus {
  ok: boolean;
  version?: string;
}

// Client
class KanbanClient {
  constructor(private baseUrl: string, private token: string) {}

  // Issues
  listIssues(projectId: ProjectId, filters?: IssueFilters, pagination?: PaginationParams): Promise<PaginatedResponse<Issue>>
  createIssue(projectId: ProjectId, input: CreateIssueInput): Promise<Issue>
  getIssue(issueId: IssueId): Promise<Issue>
  updateIssue(issueId: IssueId, input: UpdateIssueInput): Promise<Issue>
  deleteIssue(issueId: IssueId): Promise<void>
  moveIssue(issueId: IssueId, status: string): Promise<Issue>  // atalho para updateIssue({ status })
  assignIssue(issueId: IssueId, memberId: MemberId): Promise<void>
  unassignIssue(issueId: IssueId, memberId: MemberId): Promise<void>

  // Projects
  listProjects(): Promise<Project[]>

  // Tags
  listTags(): Promise<Tag[]>
  addTag(issueId: IssueId, tagId: TagId): Promise<void>
  removeTag(issueId: IssueId, tagId: TagId): Promise<void>

  // Workspaces
  listWorkspaces(): Promise<Workspace[]>
  startWorkspace(issueId: IssueId): Promise<Workspace>
  deleteWorkspace(workspaceId: WorkspaceId): Promise<void>

  // Sessions
  listSessions(workspaceId: WorkspaceId): Promise<Session[]>
  createSession(workspaceId: WorkspaceId): Promise<Session>
  runSessionPrompt(sessionId: SessionId, prompt: string): Promise<Execution>

  // Health
  health(): Promise<HealthStatus>
}
```

### Mapeamento de Endpoints REST

Endpoints baseados na API Axum do Vibe Kanban (porta 9119 local, custom em self-hosted):

| Metodo Client | HTTP Method | Endpoint |
|---------------|-------------|----------|
| `health()` | `GET` | `/api/health` |
| `listProjects()` | `GET` | `/api/projects` |
| `listIssues()` | `GET` | `/api/issues?project_id=:id&status=:s&assignee=:id&limit=:n&page=:p` |
| `createIssue()` | `POST` | `/api/issues` |
| `getIssue()` | `GET` | `/api/issues/:id` |
| `updateIssue()` | `PATCH` | `/api/issues/:id` |
| `moveIssue()` | `PATCH` | `/api/issues/:id` (body: `{ status }`) |
| `deleteIssue()` | `DELETE` | `/api/issues/:id` |
| `assignIssue()` | `POST` | `/api/issues/:id/assignees` |
| `unassignIssue()` | `DELETE` | `/api/issues/:id/assignees/:memberId` |
| `listTags()` | `GET` | `/api/tags` |
| `addTag()` | `POST` | `/api/issues/:id/tags` |
| `removeTag()` | `DELETE` | `/api/issues/:id/tags/:tagId` |
| `listWorkspaces()` | `GET` | `/api/workspaces` |
| `startWorkspace()` | `POST` | `/api/workspaces` |
| `deleteWorkspace()` | `DELETE` | `/api/workspaces/:id` |
| `listSessions()` | `GET` | `/api/workspaces/:id/sessions` |
| `createSession()` | `POST` | `/api/workspaces/:id/sessions` |
| `runSessionPrompt()` | `POST` | `/api/sessions/:id/follow-up` |

**Nota**: Endpoints inferidos da analise do codigo-fonte Axum. Serao validados contra a instancia real (`kanban.servs.dev`) durante implementacao. Discrepancias serao ajustadas no client sem impacto na CLI layer.

### Comportamento HTTP

- `fetch` nativo (Node 18+), zero deps externas
- Retry 1x em status 5xx e erros de rede (ECONNRESET, ECONNREFUSED, DNS failure) com backoff de 1s
- Timeout de 10s via `AbortController`
- Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Auth: JWT Bearer token padrao (sem claims especificos requeridos pela CLI)

### Config Multi-Contexto

Arquivo: `~/.config/kanban-handler/config.json` (via `env-paths`)

```json
{
  "currentContext": "prod",
  "contexts": {
    "prod": {
      "url": "https://kanban.servs.dev",
      "token": "jwt-token-aqui",
      "defaultProject": "ba3047f4-f056-496e-8ba0-c2fc59dacfce"
    },
    "local": {
      "url": "http://localhost:9119",
      "token": "jwt-token-local"
    }
  }
}
```

Resolucao de contexto (prioridade):
1. `--context` flag
2. `KANBAN_CONTEXT` env var
3. `currentContext` do config file

Resolucao de token (prioridade):
1. `--token` flag
2. `KANBAN_TOKEN` env var
3. `token` do contexto ativo

### Exit Codes e Tratamento de Erros

| Exit Code | Classe de Erro | Descricao |
|-----------|---------------|-----------|
| `0` | — | Sucesso |
| `1` | `AuthError` | Falha de autenticacao (401, token expirado/invalido) |
| `2` | `NotFoundError` | Recurso nao encontrado (404) |
| `3` | `ApiError` | Erro da API (400, 422, 5xx apos retry) |
| `4` | `NetworkError` | Erro de rede (DNS, connection refused, timeout) |
| `5` | `ConfigError` | Erro de configuracao (sem contexto ativo, config corrompido) |

Comportamento:
- Erros vao para `stderr`, nunca para `stdout`
- Em modo `--verbose`: stack trace completo + request/response details (sem token)
- Em modo normal: mensagem amigavel + sugestao de acao (ex: "Token expirado. Use `kanban config add-context` para atualizar.")
- `AuthError` (401): sugere reautenticacao com `kanban config add-context --token`
- `NetworkError`: mostra URL tentada e sugere verificar `kanban health`

## Stack Tecnica

| Camada | Escolha | Justificativa |
|--------|---------|---------------|
| Runtime | Node.js 18+ | fetch nativo, LTS |
| Linguagem | TypeScript (strict) | Type safety, branded types |
| CLI Framework | commander | 0 deps, 18ms startup |
| Build | tsup | Bundler rapido, ESM output |
| Test | vitest | Rapido, ESM nativo, Jest-compatible |
| Config | conf + env-paths | Cross-platform XDG, schema validation |
| Output | chalk + ora + cli-table3 | Padrao do ecossistema |
| Lint | eslint + prettier | Consistencia |

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Distribuicao

- **npm**: `npm install -g kanban-handler`
- **Comando**: `kanban`
- **package.json bin**: `{ "kanban": "./dist/index.js" }`
- **Engines**: `{ "node": ">=18.0.0" }`
- **Futuro**: Homebrew formula, binarios standalone

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| API Vibe Kanban nao documentada, pode mudar | Media | Alto | Client isolado, facil de adaptar. Testes de integracao. |
| JWT expira sem refresh endpoint conhecido | Alta | Medio | Mensagem de erro clara, flag `--token` para override |
| Endpoints variam entre versoes self-hosted | Baixa | Medio | Defaults conservadores, flag `--api-version` futura |
| Nome `kanban` conflita no npm | Media | Baixo | Publicar como `kanban-handler`, alias `kanban` local |

## Decisoes de Arquitetura (ADRs)

### ADR-001: Commander sobre oclif

**Status**: Aceito

**Contexto**: Precisamos de um framework CLI para TypeScript com startup rapido e baixa complexidade.

**Decisao**: Usar `commander` ao inves de `oclif`.

**Alternativas**: oclif (enterprise, plugins, auto-update), yargs (parsing complexo), clipanion (type-safe).

**Consequencias**: Startup 18ms vs 85ms do oclif. Zero deps. Sem plugin system built-in, mas o escopo atual nao exige.

### ADR-002: fetch nativo sobre axios/got

**Status**: Aceito

**Contexto**: Precisamos de um HTTP client para comunicar com a REST API do Vibe Kanban.

**Decisao**: Usar `fetch` nativo do Node 18+ ao inves de axios ou got.

**Alternativas**: axios (55M downloads, interceptors), got (retry built-in, hooks), undici (mais rapido).

**Consequencias**: Zero deps HTTP. Retry e timeout implementados manualmente (~20 linhas). Requer Node >= 18.

### ADR-003: Separacao client/commands para SDK futuro

**Status**: Aceito

**Contexto**: O projeto pode evoluir para ter um SDK reutilizavel por terceiros.

**Decisao**: Separar `src/client/` (HTTP client tipado) de `src/commands/` (CLI layer) desde o inicio.

**Alternativas**: Monolitico (tudo junto), monorepo com pacotes separados desde o inicio.

**Consequencias**: Custo minimo de separacao agora. Facilita extracao futura sem rewrite.
