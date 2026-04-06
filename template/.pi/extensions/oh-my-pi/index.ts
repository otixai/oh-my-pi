/**
 * oh-my-pi — Agent orchestration extension for Pi
 *
 * Registers slash commands and a delegate_task tool for subagent spawning
 * with inference routing.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { resolveModel, type InferenceConfig, loadInferenceConfig } from "./inference.js";

interface SubagentResult {
  agent: string;
  output: string;
  exitCode: number;
}

function runSubagent(
  agentFile: string,
  task: string,
  model: string | undefined,
  cwd: string,
  signal?: AbortSignal,
): Promise<SubagentResult> {
  return new Promise((resolve, reject) => {
    const args = ["-p", task, "--no-input"];
    if (agentFile) args.push("--system-prompt", agentFile);
    if (model) args.push("-m", model);

    const proc = spawn("pi", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

    signal?.addEventListener("abort", () => proc.kill("SIGTERM"));

    proc.on("close", (code) => {
      resolve({
        agent: path.basename(agentFile, ".md"),
        output: stdout || stderr,
        exitCode: code ?? 1,
      });
    });

    proc.on("error", reject);
  });
}

/** All available agents */
const AGENTS = ["planner", "coder", "reviewer", "interviewer", "researcher", "project-manager"];

/** Command definitions: name, description, prompt file, input label, fallback message */
interface CommandDef {
  name: string;
  description: string;
  promptFile: string;
  inputLabel: string;
  required: boolean;
  fallback: string;
}

const COMMANDS: CommandDef[] = [
  {
    name: "autopilot",
    description: "Autonomous plan-code-review loop until task is complete",
    promptFile: "autopilot.md",
    inputLabel: "Task",
    required: true,
    fallback:
      "You are an autopilot orchestrator. Use the delegate_task tool to run a plan-code-review loop:\n" +
      "1. Delegate to 'planner' to create a plan\n" +
      "2. Delegate to 'coder' to implement the plan\n" +
      "3. Delegate to 'reviewer' to verify\n" +
      "4. If reviewer says FAIL, loop back to step 1 with feedback. Max 5 iterations.",
  },
  {
    name: "deep-interview",
    description: "Socratic context builder — interview before coding",
    promptFile: "deep-interview.md",
    inputLabel: "Topic",
    required: true,
    fallback:
      "You are a deep interviewer. Before any code is written:\n" +
      "1. Delegate to 'interviewer' to surface hidden requirements, assumptions, and ambiguity\n" +
      "2. Synthesize findings into a structured context document\n" +
      "3. Delegate to 'planner' to produce a concrete implementation plan",
  },
  {
    name: "pm",
    description: "Project manager — backlog grooming and issue management via gh CLI",
    promptFile: "project-manager.md",
    inputLabel: "Subcommand",
    required: false,
    fallback:
      "You are a project manager. Use the delegate_task tool with the 'project-manager' agent.\n" +
      "The project-manager agent uses gh CLI for all GitHub operations.\n\n" +
      "Available subcommands: triage, groom, sprint, stale, report",
  },
  {
    name: "review",
    description: "Code review — review a diff, PR, or set of changes",
    promptFile: "review.md",
    inputLabel: "Target",
    required: false,
    fallback:
      "You are a code review orchestrator. Use delegate_task to:\n" +
      "1. Delegate to 'researcher' to get the diff (gh pr diff, git diff, or read files)\n" +
      "2. Delegate to 'reviewer' to review for correctness, security, and edge cases\n" +
      "3. Present findings by severity: critical > warning > suggestion",
  },
  {
    name: "test",
    description: "Generate tests for a file, function, or module",
    promptFile: "test.md",
    inputLabel: "Target",
    required: true,
    fallback:
      "You are a test generation orchestrator. Use delegate_task to:\n" +
      "1. Delegate to 'researcher' to understand the code and existing test patterns\n" +
      "2. Delegate to 'planner' to list test cases (happy path, edge cases, errors)\n" +
      "3. Delegate to 'coder' to write and run the tests",
  },
  {
    name: "refactor",
    description: "Refactor code with research-plan-execute-verify loop",
    promptFile: "refactor.md",
    inputLabel: "Target",
    required: true,
    fallback:
      "You are a refactoring orchestrator. Use delegate_task to:\n" +
      "1. Delegate to 'researcher' to map dependencies and callers\n" +
      "2. Delegate to 'interviewer' to clarify scope (what changes, what must not)\n" +
      "3. Delegate to 'planner' to break into atomic steps\n" +
      "4. For each step: delegate to 'coder' then 'reviewer' to verify tests pass",
  },
  {
    name: "debug",
    description: "Investigate and fix a bug with reproduce-trace-fix-verify loop",
    promptFile: "debug.md",
    inputLabel: "Bug",
    required: true,
    fallback:
      "You are a debugging orchestrator. Use delegate_task to:\n" +
      "1. Delegate to 'researcher' to reproduce the bug\n" +
      "2. Delegate to 'researcher' to trace root cause\n" +
      "3. Present hypotheses, then delegate to 'coder' to fix\n" +
      "4. Delegate to 'reviewer' to verify fix + regression test",
  },
  {
    name: "refine",
    description: "Create, edit, and refine GitHub issues and stories via gh CLI",
    promptFile: "refine.md",
    inputLabel: "Request",
    required: false,
    fallback:
      "You are a backlog refinement orchestrator. Use delegate_task to:\n" +
      "1. For new stories: delegate to 'interviewer' for requirements, then 'project-manager' to create via gh\n" +
      "2. For editing: delegate to 'project-manager' to update issues via gh\n" +
      "3. For grooming: delegate to 'interviewer' for gaps, then 'project-manager' to update\n" +
      "4. For epic breakdown: delegate to 'planner' to decompose, then 'project-manager' to create children\n\n" +
      "All GitHub operations use the gh CLI.",
  },
];

export default function ohMyPi(pi: ExtensionAPI) {
  const cwd = process.cwd();
  const piDir = path.join(cwd, ".pi");
  const agentsDir = path.join(piDir, "agents");
  const promptsDir = path.join(piDir, "prompts");
  let config: InferenceConfig;

  // Load inference config on session start
  pi.on("session_start", async (_event, ctx) => {
    config = loadInferenceConfig(piDir);
    ctx.ui.setStatus("oh-my-pi", `oh-my-pi | ${config.defaults.backend}:${config.defaults.model}`);
  });

  // --- delegate-task tool ---
  pi.registerTool({
    name: "delegate_task",
    label: "Delegate Task",
    description:
      `Delegate a task to a specialized subagent (${AGENTS.join(", ")}). ` +
      "The subagent runs in an isolated pi process with its own context window.",
    parameters: Type.Object({
      agent: Type.String({
        description: `Agent name: ${AGENTS.join(", ")}`,
      }),
      task: Type.String({ description: "Task description for the subagent" }),
      category: Type.Optional(
        Type.String({
          description: "Inference category: coding, reasoning, long-context, quick. Determines model selection.",
        }),
      ),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const agentFile = path.join(agentsDir, `${params.agent}.md`);
      if (!fs.existsSync(agentFile)) {
        return {
          content: [{ type: "text", text: `Unknown agent: ${params.agent}. Available: ${AGENTS.join(", ")}` }],
          details: {},
        };
      }

      const model = resolveModel(config, params.agent, params.category);
      const result = await runSubagent(agentFile, params.task, model, cwd, signal);

      return {
        content: [
          {
            type: "text",
            text: `## Agent: ${result.agent}\n**Exit code:** ${result.exitCode}\n\n${result.output}`,
          },
        ],
        details: { agent: result.agent, exitCode: result.exitCode },
      };
    },
  });

  // --- Register all commands from definitions ---
  for (const cmd of COMMANDS) {
    pi.registerCommand(cmd.name, {
      description: cmd.description,
      handler: async (args, ctx) => {
        const input = args?.trim() || "";

        if (cmd.required && !input) {
          ctx.ui.notify(`Usage: /${cmd.name} <${cmd.inputLabel.toLowerCase()}>`, "warn");
          return;
        }

        const promptFile = path.join(promptsDir, cmd.promptFile);
        if (fs.existsSync(promptFile)) {
          const template = fs.readFileSync(promptFile, "utf-8");
          ctx.ui.notify(`${cmd.name} started`, "info");
          ctx.sendUserMessage(
            input
              ? `${template}\n\n## ${cmd.inputLabel}\n\n${input}`
              : template,
          );
        } else {
          ctx.sendUserMessage(
            input
              ? `${cmd.fallback}\n\n## ${cmd.inputLabel}\n\n${input}`
              : cmd.fallback,
          );
        }
      },
    });
  }

  // --- /research command (special — ensures research dir exists) ---
  pi.registerCommand("research", {
    description: "Research a topic — verify APIs, libraries, patterns. Saves findings to .pi/research/",
    handler: async (args, ctx) => {
      if (!args?.trim()) {
        ctx.ui.notify("Usage: /research <question or topic>", "warn");
        return;
      }
      const researchDir = path.join(piDir, "research");
      if (!fs.existsSync(researchDir)) {
        fs.mkdirSync(researchDir, { recursive: true });
      }
      ctx.ui.notify("Research started", "info");
      ctx.sendUserMessage(
        `Use the delegate_task tool with agent 'researcher' to investigate the following.\n` +
          `The researcher will verify against actual installed versions and source code, ` +
          `then save findings to .pi/research/ as a markdown reference doc.\n\n` +
          `Other agents can later read these docs to get verified information.\n\n` +
          `## Research Question\n\n${args}`,
      );
    },
  });
}
