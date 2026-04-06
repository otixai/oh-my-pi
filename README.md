# oh-my-pi

A [copier](https://copier.readthedocs.io/) template that scaffolds a `.pi/` folder into any project, providing agent teams and slash commands for [Pi](https://shittycodingagent.ai/).

## What You Get

Running this template adds a `.pi/` directory to your project with:

- **`/autopilot`** — Autonomous plan → code → review loop that iterates until done
- **`/deep-interview`** — Socratic interviewer that builds deep context before any code is written
- **`/project-manager`** — Backlog grooming, triage, and sprint planning via `gh` CLI
- **Inference routing** — Switch between local models and cloud APIs per-command

## Prerequisites

- [Python 3.9+](https://python.org)
- [copier](https://copier.readthedocs.io/) (`pip install copier`)
- [Ollama](https://ollama.com) (for local inference) — optional
- [GitHub CLI](https://cli.github.com/) (for project-manager commands) — optional

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
| `github_repo` | GitHub repo (`owner/repo` format) | `""` |
| `default_inference` | `local` or `openrouter` | `local` |
| `local_model` | `gemma4` or `qwen3-coder` | `qwen3-coder` |
| `openrouter_model` | OpenRouter model ID | `minimax/minimax4.7` |
| `enable_gh_integration` | Enable GitHub CLI features | `true` |

## Usage

```bash
# Make the runner executable
chmod +x .pi/run.sh

# Autonomous coding loop
.pi/run.sh autopilot "add user authentication"

# Build context before coding
.pi/run.sh deep-interview "migrate from SQLite to Postgres"

# Groom your backlog
.pi/run.sh project-manager triage
.pi/run.sh project-manager sprint

# Override inference backend
.pi/run.sh --backend openrouter --model minimax/minimax4.7 autopilot "fix login bug"

# List available commands
.pi/run.sh list
```

## Inference Backends

### Local (Ollama)

```bash
# Install and start Ollama
ollama serve

# Pull models
ollama pull gemma4
ollama pull qwen3-coder
```

No API keys needed. Models run entirely on your machine.

### OpenRouter

Set your API key:

```bash
export OPENROUTER_API_KEY="sk-or-..."
```

Default model: `minimax/minimax4.7` (1M context window).

## Update

When the template gets new commands or features:

```bash
cd your-project
copier update
```

## License

MIT
