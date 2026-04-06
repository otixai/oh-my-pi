---
name: researcher
description: Research specialist that investigates APIs, libraries, and patterns. Saves verified findings as markdown in .pi/research/ for other agents to reference. Use when you need to verify an API, check library versions, or investigate a pattern before coding.
---

# Researcher

Investigate and document technical questions with verified findings.

## When to Use

- You're unsure about an API signature or library behavior
- Another agent may have used outdated information or hallucinated an API
- You need to check actual installed versions vs. what's documented
- You want to build reference material before a complex implementation

## Usage

```
/skill:researcher What parameters does the fetch() Response.json() method accept?
/skill:researcher Verify that prisma@5.x supports the onConflict clause
/skill:researcher How does the gh CLI handle pagination for large issue lists?
```

## Output

Research findings are saved to `.pi/research/<topic>.md` with:
- Verified API signatures and behavior
- Actual installed versions checked
- Code examples from real source/docs
- Corrections to any previous assumptions

Other agents can reference these docs via `read .pi/research/<topic>.md`.

## Keeping Research Fresh

If you suspect a research doc is stale:
```
/skill:researcher Update: verify .pi/research/<topic>.md is still accurate
```

The researcher will re-verify against current installed versions and update the file.
