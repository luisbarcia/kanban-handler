# README Aprimorado — Design Spec

**Data:** 2026-03-23
**Status:** Aprovado

## Objetivo

Criar o README.md do kanban-handler com foco no público-alvo: usuários técnicos do Vibe Kanban que rodam instâncias remote/self-hosted e querem gerenciar boards pelo terminal.

## Tom

Minimalista técnico com um GIF placeholder no topo. Direto, sem emojis, exemplos de terminal reais.

## Estrutura

1. **Header** — Nome + one-liner + badges (CI, License MIT, Node >=18, npm version)
2. **Demo placeholder** — Bloco comentado com instruções para gravar com asciinema/vhs
3. **Features** — 5-6 bullets: multi-contexto kubectl-style, output formats, retry, branded types, zero HTTP deps
4. **Quick Start** — 3 passos: instalar, configurar contexto, primeiro comando
5. **Usage** — Exemplos dos comandos principais (config, issues, projects, tags, workspaces, sessions)
6. **Configuration** — Sistema de contextos, prioridade flag > env > config, env vars
7. **Output Formats** — Exemplo table|json|minimal
8. **Development** — Build, test, lint, arquitetura resumida
9. **License** — MIT

## Entregáveis

- `README.md` — arquivo principal
- `LICENSE` — MIT com author luisbarcia
- Atualizar `package.json` — license: MIT, author, keywords
