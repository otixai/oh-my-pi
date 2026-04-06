#!/usr/bin/env bash
# oh-my-pi setup — pull required Ollama models
set -euo pipefail

MODELS=(
  "glm-4.7-flash"
  "qwen3-coder:30b"
)

echo "oh-my-pi: pulling Ollama models..."

if ! command -v ollama &>/dev/null; then
  echo "Error: ollama not found. Install from https://ollama.com"
  exit 1
fi

if ! curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "Error: ollama server not running. Start with: ollama serve"
  exit 1
fi

for model in "${MODELS[@]}"; do
  echo "Pulling $model..."
  ollama pull "$model"
done

echo "Done. All models ready."
