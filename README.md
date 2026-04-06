# oh-my-pi

A [copier](https://copier.readthedocs.io/) template that scaffolds a `.pi/` folder into any project, providing agent orchestration for [Pi](https://pi.dev).

## What You Get

A full agent team with commands, skills, and inference routing:

| Command | What it does | Agents used |
|---------|-------------|-------------|
| `/autopilot <task>` | Autonomous plan → code → review loop | planner, coder, reviewer |
| `/deep-interview <task>` | Socratic interview before coding | interviewer, planner |
| `/pm <sub>` | Backlog grooming via `gh` CLI | project-manager |
| `/research <question>` | Verify APIs/libraries, save reference docs | researcher |

### Agents

| Agent | Role | Default Model |
|-------|------|---------------|
| **planner** | Decomposes tasks into concrete plans | qwen3-coder |
| **coder** | Executes plans with minimal changes | qwen3-coder |
| **reviewer** | Verifies against acceptance criteria | gemma4 |
| **interviewer** | Surfaces hidden requirements and ambiguity | gemma4 |
| **researcher** | Verifies APIs/libs, saves findings to `.pi/research/` | qwen3-coder |
| **project-manager** | Triages issues, grooms backlog via `gh` | qwen3-coder |

Each agent runs in an **isolated pi process** with its own context window.

### Research System

The researcher agent saves verified findings as markdown in `.pi/research/`. Other agents check these docs before making assumptions — catching hallucinated APIs and outdated library usage before they become bugs.

## Prerequisites

- [Pi](https://pi.dev) installed
- [copier](https://copier.readthedocs.io/) (`pip install copier`)
- [Ollama](https://ollama.com) (for local inference) — optional
- [GitHub CLI](https://cli.github.com/) (for `/pm` commands) — optional

## Install

```bash
# Apply to a new or existing project
copier copy gh:otixai/oh-my-pi your-project/

# Or from inside an existing project
cd your-project
copier copy gh:otixai/oh-my-pi .
```

You'll be prompted for:

| Variable | Description | Default |
|----------|-------------|---------|
| `project_name` | Your project's name | — |
| `github_repo` | GitHub repo (`owner/repo`) | `""` |
| `default_inference` | `local` or `openrouter` | `local` |
| `local_model` | `gemma4` or `qwen3-coder` | `qwen3-coder` |
| `openrouter_model` | OpenRouter model ID | `minimax/minimax4.7` |
| `enable_gh_integration` | Enable `/pm` commands | `true` |

## Usage

```bash
# Start pi in your project — commands are auto-discovered
pi

# Autonomous coding loop
/autopilot add user authentication

# Build context before coding
/deep-interview migrate from SQLite to Postgres

# Verify an API before using it
/research does prisma 5.x support onConflict in createMany?

# Groom your backlog
/pm triage
/pm sprint
```

### Skills

Skills are also registered and can be invoked directly:

```bash
/skill:deep-interview complex database migration
/skill:researcher verify the OpenRouter API response format
/skill:project-manager groom #42
```

## Inference Backends

### Local (Ollama)

```bash
ollama serve
ollama pull gemma4
ollama pull qwen3-coder
```

### OpenRouter

```bash
export OPENROUTER_API_KEY="sk-or-..."
```

Default model: `minimax/minimax4.7` (1M context window).

### Runtime Override

Create `.pi/inference.json` to override model routing:

```json
{
  "agent_overrides": {
    "researcher": { "model": "minimax/minimax4.7" }
  },
  "categories": {
    "coding": { "backend": "local", "model": "qwen3-coder" },
    "long-context": { "backend": "openrouter", "model": "minimax/minimax4.7" }
  }
}
```

## Update

```bash
cd your-project
copier update
```

## License

MIT
