# Task Plan — Attack Taxonomy Tests

## Goal
Expand test coverage for kanban-handler CLI using the Attack Taxonomy approach.
DO NOT modify source files. Only add/modify test files.

## Current State
- 38 tests passing across 6 test files
- Vitest + TypeScript + tsup

## Files Analyzed
- src/config/manager.ts — ConfigManager (in-memory store)
- src/client/api-client.ts — KanbanClient (fetch wrapper, retry logic)
- src/client/endpoints.ts — URL factory functions
- src/output/formatter.ts — formatOutput / formatSingle
- src/utils/errors.ts — error classes
- src/client/types.ts — branded ID types, interfaces

## Existing Coverage
### manager.test.ts (7 tests)
- add + retrieve context
- sets current on first add
- switches context
- throws on unknown context switch
- removes context
- lists contexts
- resolveToken and resolveContextName priority

### api-client.test.ts (7 tests)
- health() returns status
- 401 → AuthError
- 404 → NotFoundError
- retries on 500
- exhausts retries on 500 → ApiError
- TypeError → NetworkError
- listProjects returns array

### endpoints.test.ts (5 tests)
- health
- listIssues with all params
- getIssue
- assignIssue/unassignIssue
- sessions

### formatter.test.ts (7 tests)
- json/minimal/table/default for formatOutput
- json/minimal/table for formatSingle

### errors.test.ts (7 tests - inferred)
- exit codes, names, statusCode, url

## Gaps (Attack Taxonomy)

### ConfigManager — Input/State/Error Attacks
- [ ] removeContext(active) → currentContext switches to first remaining
- [ ] removeContext(active) → empty store → currentContext = ""
- [ ] removeContext(non-existent) → no error, no-op
- [ ] showCurrentContext with token <= 8 chars → "****"
- [ ] showCurrentContext with token exactly 8 chars → "****"
- [ ] showCurrentContext with token > 8 chars → masked properly
- [ ] showCurrentContext with defaultProject → included in result
- [ ] showCurrentContext without defaultProject → not in result
- [ ] resolveToken() with no context → throws ConfigError
- [ ] getCurrentContext() with stale currentContext name → throws ConfigError
- [ ] addContext overwrites existing context (same name)
- [ ] addContext with empty string name
- [ ] addContext second context does NOT change currentContext
- [ ] listContexts empty → []

### KanbanClient — Error Path Attacks
- [ ] 400 → ApiError (not retried)
- [ ] 422 → ApiError (not retried)
- [ ] 403 → ApiError (not retried)
- [ ] malformed JSON on success → error
- [ ] empty body on error → fallback message "HTTP {status}"
- [ ] abort signal (timeout) → NetworkError after retry
- [ ] createIssue sends correct body
- [ ] updateIssue sends correct body
- [ ] deleteIssue uses DELETE method
- [ ] moveIssue delegates to updateIssue with status only
- [ ] assignIssue sends memberId in body
- [ ] unassignIssue uses correct URL with memberId
- [ ] listIssues with filters passes query params
- [ ] listTags returns array
- [ ] addTag sends tagId in body
- [ ] removeTag uses DELETE with tagId in URL
- [ ] startWorkspace sends issueId in body
- [ ] deleteWorkspace uses DELETE
- [ ] listSessions returns array
- [ ] createSession uses POST
- [ ] runSessionPrompt sends prompt in body

### Endpoints — Edge Cases
- [ ] listIssues with no filters/pagination → only project_id in URL
- [ ] listIssues with only status filter
- [ ] listIssues with only assignee filter
- [ ] listIssues with only limit pagination
- [ ] listIssues with undefined filters object (undefined properties)
- [ ] IDs with special characters (URL encoding)
- [ ] createSession endpoint URL
- [ ] deleteWorkspace endpoint URL
- [ ] startWorkspace endpoint URL

### Formatter — Edge Cases
- [ ] formatOutput empty array → valid output (table still shows headers)
- [ ] formatOutput items with missing columns → "" fallback
- [ ] formatOutput items with null/undefined values → "" fallback
- [ ] formatOutput minimal with single item
- [ ] formatSingle empty object
- [ ] formatSingle with undefined values → "" fallback
- [ ] formatSingle minimal with undefined first value
- [ ] formatOutput json preserves null values

## Phases

- [x] Phase 1: Analyze source files
- [x] Phase 2: Analyze existing tests
- [x] Phase 3: Write ConfigManager attack tests (manager.attack.test.ts — 49 tests)
- [x] Phase 4: Write KanbanClient attack tests (api-client.attack.test.ts — 40 tests)
- [x] Phase 5: Write Endpoints attack tests (endpoints.attack.test.ts — 27 tests)
- [x] Phase 6: Write Formatter attack tests (formatter.attack.test.ts — 23 tests)
- [x] Phase 7: Run vitest (177/177 passing) + typecheck (clean) + commit (89387b3)

## Final Result (Phase 7)
- Before: 38 tests across 6 files
- After: 177 tests across 10 files (+139 new tests)
- TypeCheck: clean (no errors)
- Commit: test: expand coverage with attack taxonomy tests

---

## Phase 8: Command Handler Tests (current)
### Goal
Add tests for src/commands/ layer — zero coverage identified by test-skeptic.

### Strategy
- Test each register function directly
- Use ConfigManager.createInMemory() for config
- Mock KanbanClient via vi.mock("../client/api-client.js")
- Capture console output via vi.spyOn
- Use program.exitOverride() + try/catch for process.exit scenarios

### Files to Create
- [ ] src/commands/config.test.ts (config subcommands — no API needed)
- [ ] src/commands/health.test.ts (health command + KanbanClient mock)
- [ ] src/commands/issues.test.ts (issues subcommands + KanbanClient mock)

### Tests Planned
- config: add-context (happy path, invalid URL, HTTP warning, with defaultProject)
- config: use-context (valid, invalid → exit 5)
- config: list-contexts (shows all with active marker)
- config: remove-context (removes and prints success)
- config: show (masked token, exits 5 when no context)
- health: success (prints Connected to URL)
- health: unhealthy (prints unhealthy warning)
- health: network error → exit code 4
- health: no context → exit 5
- issues list: happy path with projectId
- issues list: uses defaultProject from context
- issues list: no project → exit 5
- issues create: sends correct title
- issues delete --force: skips confirmation
- issues move: calls moveIssue
- issues get: calls getIssue
