/**
 * oh-my-pi — Agent orchestration extension for Pi
 *
 * Registers the /autopilot, /deep-interview, /project-manager, and /research commands
 * as well as a delegate-task tool for subagent spawning with inference routing.
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

export default function ohMyPi(pi: ExtensionAPI) {
  const cwd = process.cwd();
  const piDir = path.join(cwd, ".pi");
  const agentsDir = path.join(piDir, "agents");
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
      "Delegate a task to a specialized subagent (planner, coder, reviewer, interviewer, project-manager). " +
      "The subagent runs in an isolated pi process with its own context window.",
    parameters: Type.Object({
      agent: Type.String({
        description: "Agent name: planner, coder, reviewer, interviewer, researcher, project-manager",
      }),
      task: Type.String({ description: "Task description for the subagent" }),
      category: Type.Optional(
        Type.String({
          description: "Inference category: coding, reasoning, quick. Determines model selection.",
        }),
      ),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const agentFile = path.join(agentsDir, `${params.agent}.md`);
      if (!fs.existsSync(agentFile)) {
        return {
          content: [{ type: "text", text: `Unknown agent: ${params.agent}. Available: planner, coder, reviewer, interviewer, researcher, project-manager` }],
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

  // --- /autopilot command ---
  pi.registerCommand("autopilot", {
    description: "Autonomous plan-code-review loop until task is complete",
    handler: async (args, ctx) => {
      if (!args?.trim()) {
        ctx.ui.notify("Usage: /autopilot <task description>", "warn");
        return;
      }
      // Inject the autopilot prompt template as a user message
      const promptFile = path.join(piDir, "prompts", "autopilot.md");
      if (fs.existsSync(promptFile)) {
        const template = fs.readFileSync(promptFile, "utf-8");
        ctx.ui.notify("Autopilot engaged", "info");
        // Send as user input so the agent picks it up
        ctx.sendUserMessage(`${template}\n\n## Task\n\n${args}`);
      } else {
        ctx.sendUserMessage(
          `You are an autopilot orchestrator. Use the delegate_task tool to run a plan-code-review loop:\n` +
            `1. Delegate to 'planner' to create a plan\n` +
            `2. Delegate to 'coder' to implement the plan\n` +
            `3. Delegate to 'reviewer' to verify\n` +
            `4. If reviewer says FAIL, loop back to step 1 with feedback. Max 5 iterations.\n\n` +
            `## Task\n\n${args}`,
        );
      }
    },
  });

  // --- /deep-interview command ---
  pi.registerCommand("deep-interview", {
    description: "Socratic context builder — interview before coding",
    handler: async (args, ctx) => {
      if (!args?.trim()) {
        ctx.ui.notify("Usage: /deep-interview <task or problem>", "warn");
        return;
      }
      const promptFile = path.join(piDir, "prompts", "deep-interview.md");
      if (fs.existsSync(promptFile)) {
        const template = fs.readFileSync(promptFile, "utf-8");
        ctx.ui.notify("Deep interview started", "info");
        ctx.sendUserMessage(`${template}\n\n## Topic\n\n${args}`);
      } else {
        ctx.sendUserMessage(
          `You are a deep interviewer. Before any code is written:\n` +
            `1. Delegate to 'interviewer' to surface hidden requirements, assumptions, and ambiguity\n` +
            `2. Synthesize findings into a structured context document\n` +
            `3. Delegate to 'planner' to produce a concrete implementation plan\n\n` +
            `## Topic\n\n${args}`,
        );
      }
    },
  });

  // --- /pm command ---
  pi.registerCommand("pm", {
    description: "Project manager — backlog grooming and issue management via gh CLI",
    handler: async (args, ctx) => {
      const subcommand = args?.trim() || "triage";
      const promptFile = path.join(piDir, "prompts", "project-manager.md");
      if (fs.existsSync(promptFile)) {
        const template = fs.readFileSync(promptFile, "utf-8");
        ctx.ui.notify(`PM: ${subcommand}`, "info");
        ctx.sendUserMessage(`${template}\n\n## Subcommand\n\n${subcommand}`);
      } else {
        ctx.sendUserMessage(
          `You are a project manager. Use the delegate_task tool with the 'project-manager' agent.\n` +
            `The project-manager agent uses gh CLI for all GitHub operations.\n\n` +
            `## Subcommand: ${subcommand}\n\n` +
            `Available: triage, groom, sprint, stale, report`,
        );
      }
    },
  });

  // --- /research command ---
  pi.registerCommand("research", {
    description: "Research a topic — verify APIs, libraries, patterns. Saves findings to .pi/research/",
    handler: async (args, ctx) => {
      if (!args?.trim()) {
        ctx.ui.notify("Usage: /research <question or topic>", "warn");
        return;
      }
      // Ensure research directory exists
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
