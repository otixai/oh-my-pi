# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

oh-my-pi is a **copier template** that scaffolds a `.pi/` folder into any project, providing agent teams, extensions, skills, and prompt templates for [Pi](https://pi.dev). The template creates a full agent orchestration layer where coding loops are managed through composable commands that delegate to specialized subagents.

## Architecture

### Copier Template Layout

```
copier.yml                                    # Template variables and prompts
template/.pi/
├── extensions/oh-my-pi/
│   ├── index.ts                              # Pi extension: registers commands + delegate_task tool
│   └── inference.ts.jinja                    # Inference routing (model resolution by agent/category)
├── agents/                                   # Subagent definitions (Pi frontmatter + system prompt)
│   ├── planner.md.jinja                      # Plan decomposition, read-only
│   ├── coder.md.jinja                        # Implementation, executes plans
│   ├── reviewer.md.jinja                     # Verification, read-only + tests
│   ├── interviewer.md.jinja                  # Socratic requirements analysis
│   ├── researcher.md.jinja                   # API/library verification, saves to .pi/research/
│   └── project-manager.md.jinja              # Backlog grooming via gh CLI
├── skills/                                   # Pi skills (SKILL.md + supporting files)
│   ├── deep-interview/SKILL.md
│   ├── project-manager/SKILL.md.jinja
│   └── researcher/SKILL.md
├── prompts/                                  # Prompt templates invoked by commands
│   ├── autopilot.md
│   ├── deep-interview.md
│   └── project-manager.md
├── research/                                 # Researcher output (verified reference docs)
└── settings.json.jinja                       # Pi settings (extension + skill discovery)
```

Files ending in `.jinja` are rendered by copier. Plain files are copied as-is.

### Extension (TypeScript)

`extensions/oh-my-pi/index.ts` is a Pi extension that:
- Registers a `delegate_task` tool — spawns isolated `pi` subprocesses for each agent
- Registers commands: `/autopilot`, `/deep-interview`, `/pm`, `/research`
- Loads inference config and displays backend/model in the status line

Uses `@mariozechner/pi-coding-agent` ExtensionAPI and `@sinclair/typebox` for tool parameter schemas.

### Agent Definitions

Each `.md` file in `agents/` follows Pi's agent format:
- YAML frontmatter: `name`, `description`, `tools` (allowlist), `model`
- Body: system prompt with output format

Agents are spawned as isolated `pi -p` subprocesses via the `delegate_task` tool.

### Inference Routing

`inference.ts` resolves models via 3-tier priority:
1. Agent-specific override (`agent_overrides`)
2. Category-based routing (`coding` → qwen3-coder, `reasoning` → gemma4, `long-context` → minimax4.7)
3. Default backend/model

Overridable at runtime via `.pi/inference.json`.

### Research System

The researcher agent saves verified findings to `.pi/research/<topic>.md`. Other agents check this directory before making assumptions about APIs or libraries. Research docs include version verification and can be refreshed when stale.

## Commands

```bash
# Test the template locally
copier copy . /tmp/test-project --trust

# Update an existing project
copier update --trust

# In a project with .pi/ installed, these Pi commands are available:
#   /autopilot <task>         — plan-code-review loop (max 5 iterations)
#   /deep-interview <task>    — Socratic interview then plan
#   /pm <subcommand>          — backlog grooming (triage|groom|sprint|stale|report)
#   /research <question>      — verify APIs/libraries, save to .pi/research/
#   /skill:deep-interview     — skill version of deep-interview
#   /skill:project-manager    — skill version of pm
#   /skill:researcher         — skill version of research
```

## Key Design Decisions

- **Pi-native** — uses Pi's extension API, agent format, skill standard, and prompt templates. Not a wrapper.
- **Subagent isolation** — each agent runs in its own `pi` process with a clean context window.
- **Category-based model routing** — agents declare what kind of work, config picks the model.
- **Research-backed accuracy** — researcher agent verifies APIs against actual installed versions before coding.
- **Local-first inference** — default to Ollama (gemma4, qwen3-coder); OpenRouter (minimax4.7) is opt-in.
- **gh CLI for all GitHub ops** — project-manager never calls the API directly.
