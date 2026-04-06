# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

oh-my-pi is a **copier template** that scaffolds a `.pi/` folder into any project, providing agent teams and slash commands for [Pi](https://shittycodingagent.ai/). The template creates a structured workspace where coding loops (loops of loops) are managed through composable slash commands that orchestrate different agent configurations.

## Architecture

### Copier Template Layout

```
copier.yml                          # Template variables and prompts
template/.pi/
├── run.sh.jinja                    # Command runner (routes commands to agents)
├── config/
│   ├── inference.yml.jinja         # Inference backend config (local/openrouter)
│   ├── agents.yml.jinja            # Agent roles, system prompts, team compositions
│   └── project.yml.jinja           # Project-level settings
└── commands/
    ├── autopilot.md                # Autonomous plan-code-review loop (max 5 iterations)
    ├── deep-interview.md           # Socratic context builder before coding
    ├── project-manager.md          # Backlog grooming via gh CLI
    └── list.md                     # Command index
```

Files ending in `.jinja` are rendered by copier with user-provided variables. Plain `.md` files are copied as-is.

### Agent Teams

Defined in `agents.yml.jinja`. Each team is a named set of agents with a workflow:

- **autopilot** — `planner -> coder -> reviewer` loop, iterates until pass or max iterations
- **deep_interview** — `interviewer -> planner`, builds context before producing a plan
- **grooming** — `project_manager -> planner`, triages/grooms issues via `gh` CLI

### Inference Routing

Configured in `inference.yml.jinja`. Two backends:

| Backend | Models | Config |
|---------|--------|--------|
| `local` (Ollama) | `gemma4`, `qwen3-coder` | `http://localhost:11434` |
| `openrouter` | `minimax/minimax4.7` | `OPENROUTER_API_KEY` env var |

`run.sh` resolves the backend at invocation time. Override with `--backend` and `--model` flags.

### Command Design

Each command is a markdown file in `commands/` containing:
1. Usage and workflow diagram
2. System prompt for the orchestrator
3. Phase-by-phase instructions for each agent
4. YAML configuration block

Commands are composable — `/deep-interview` output can be piped into `/autopilot`.

## Commands

```bash
# Test the template locally
copier copy . /tmp/test-project --trust

# Update an existing project
copier update --trust

# Run a command (in a project that has .pi/ installed)
.pi/run.sh autopilot "add user authentication"
.pi/run.sh deep-interview "migrate database to postgres"
.pi/run.sh project-manager triage
.pi/run.sh --backend openrouter --model minimax/minimax4.7 autopilot "fix login bug"
```

## Key Design Decisions

- **`.pi/` not `.claude/`** — this template targets Pi, not Claude Code directly.
- **Environment variables for secrets** — `OPENROUTER_API_KEY` is read from env, never stored in template output.
- **Local-first inference** — default to Ollama; OpenRouter is opt-in.
- **Composable loops** — slash commands are the unit of composition. Keep them small and chainable.
- **gh CLI for all GitHub ops** — the project-manager agent never calls the GitHub API directly; everything goes through `gh`.
