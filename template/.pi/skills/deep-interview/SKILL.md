---
name: deep-interview
description: Socratic deep-interview that surfaces hidden requirements, assumptions, and ambiguity before any code is written. Use when a task is complex, vague, or high-risk.
---

# Deep Interview

Build thorough understanding of a task before implementation.

## When to Use

- Task description is vague or has multiple interpretations
- Changes touch multiple systems or APIs
- High-risk changes where regressions would be costly
- You want to build a context document before running /autopilot

## Usage

```
/skill:deep-interview <task description>
```

Or use the `/deep-interview` command directly.

## Process

1. The interviewer agent runs a structured interview (scope, assumptions, dependencies, ambiguity, edge cases)
2. Findings are synthesized into a context document
3. The planner agent produces an implementation plan grounded in the interview findings

## Output

A structured context document + implementation plan that can be passed to `/autopilot`.
