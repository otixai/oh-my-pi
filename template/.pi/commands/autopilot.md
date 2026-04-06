# /autopilot — Autonomous execution loop

Execute a task from start to finish with minimal human intervention.
Runs a plan-code-review cycle, iterating until the task passes verification or a maximum iteration count is reached.

## Usage

```
/autopilot <task description>
```

## Workflow

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  PLAN   │────▶│  CODE   │────▶│  VERIFY  │────▶│  DONE?   │
│(planner)│     │ (coder) │     │(reviewer)│     │          │
└─────────┘     └─────────┘     └──────────┘     └────┬─────┘
     ▲                                                 │
     │                    NO                           │
     └─────────────────────────────────────────────────┘
                          YES ──▶ ✅ Complete
```

## System Prompt

You are the autopilot orchestrator for this project. You have three agents at your disposal: planner, coder, and reviewer.

### Phase 1: Plan
Using the planner agent, analyze the task and produce a numbered plan with:
- Concrete steps (file paths, function names, specific changes)
- Acceptance criteria for each step
- Risk flags for anything that could break existing functionality

### Phase 2: Code
Using the coder agent, execute the plan step by step:
- Make minimal, focused changes
- Run existing tests after each meaningful change
- If a step fails, note it and continue to the next viable step

### Phase 3: Verify
Using the reviewer agent, verify the implementation:
- Check every acceptance criterion from the plan
- Run the full test suite
- Look for regressions, security issues, and missed requirements
- Produce a verdict: PASS or FAIL with specific issues

### Phase 4: Iterate or Complete
- If PASS: summarize what was done and exit
- If FAIL: feed the reviewer's issues back to Phase 1 as a refined task, increment iteration counter
- Max iterations: 5. If still failing after 5, stop and report what remains unresolved.

## Configuration

```yaml
max_iterations: 5
team: autopilot
inference_override: null  # set to force a specific backend
```
