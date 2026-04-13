/**
 * Hermes Bridge Skill for OpenClaw
 *
 * Routes complex messages to Hermes AI for processing.
 * Uses hermes chat CLI for AI responses.
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

interface HermesBridgeConfig {
  hermesCommand: string;
  privilegedUsers: string[];
  keywords: string[];
  timeout: number;
}

// Default configuration
const DEFAULT_CONFIG: HermesBridgeConfig = {
  hermesCommand: "hermes",
  privilegedUsers: [],
  keywords: [
    "hermes",
    "analyze",
    "analyse",
    "分析",
    "代码生成",
    "complex",
    "reasoning",
    "推理",
    "帮我",
    "请帮我",
  ],
  timeout: 60000, // 60 seconds for AI response
};

/**
 * Load configuration from config.json
 */
function loadConfig(): HermesBridgeConfig {
  try {
    const configPath = path.join(__dirname, "config.json");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    }
  } catch (e) {
    console.error("Failed to load hermes-bridge config:", e);
  }
  return DEFAULT_CONFIG;
}

/**
 * Check if message should be routed to Hermes
 */
function shouldRouteToHermes(
  message: string,
  userId: string | undefined,
  config: HermesBridgeConfig
): boolean {
  // Check exact commands first
  const lowerMessage = message.toLowerCase().trim();
  if (lowerMessage.startsWith("/hermes") || lowerMessage.startsWith("/ask-hermes")) {
    return true;
  }

  // Check privileged users
  if (userId && config.privilegedUsers.includes(userId)) {
    return true;
  }

  // Check keywords
  for (const keyword of config.keywords) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Main skill handler
 */
export async function handleHermesBridge(
  context: {
    message: string;
    userId?: string;
    channel?: string;
    [key: string]: unknown;
  }
): Promise<{ routed: boolean; response?: string; error?: string }> {
  const config = loadConfig();
  const { message, userId } = context;

  // Check if should route to Hermes
  const shouldRoute = shouldRouteToHermes(message, userId, config);

  if (!shouldRoute) {
    return { routed: false };
  }

  // Route to Hermes AI via CLI
  try {
    // Extract the actual message (remove /hermes or /ask-hermes prefix)
    let query = message;
    const lowerMessage = message.toLowerCase().trim();
    if (lowerMessage.startsWith("/hermes")) {
      query = message.slice("/hermes".length).trim();
    } else if (lowerMessage.startsWith("/ask-hermes")) {
      query = message.slice("/ask-hermes".length).trim();
    }

    // If no query after command, use a default prompt
    if (!query) {
      query = "你好";
    }

    const response = await callHermesChat(query, config);
    return { routed: true, response };
  } catch (error) {
    console.error("Hermes AI call failed:", error);
    return {
      routed: true,
      error: error instanceof Error ? error.message : "Hermes unavailable",
    };
  }
}

/**
 * Call Hermes AI via CLI chat command
 */
async function callHermesChat(
  query: string,
  config: HermesBridgeConfig
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.hermesCommand, ["chat", "-Q", "-q", query], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: config.timeout,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Hermes exited with code ${code}: ${stderr}`));
        return;
      }

      // Parse the output - extract just the AI response
      // hermes chat -Q outputs in format:
      // ╭─ ⚕ Hermes ───────────────────────────────────────────────────────────╮
      // AI response text
      // ╰──────────────────────────────────────────────────────────────────────╯
      // session_id: xxx

      const response = parseHermesOutput(stdout);
      if (response) {
        resolve(response);
      } else if (stdout.trim()) {
        // Fallback: return the raw output cleaned up
        resolve(cleanHermesOutput(stdout));
      } else {
        reject(new Error("Hermes returned empty response"));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start Hermes: ${err.message}`));
    });
  });
}

/**
 * Parse Hermes chat output to extract the AI response
 */
function parseHermesOutput(output: string): string | null {
  // Remove box-drawing characters and session info
  const lines = output.split("\n");
  const responseLines: string[] = [];
  let inResponse = false;

  for (const line of lines) {
    // Skip the header/footer lines
    if (line.includes("─ ⚕ Hermes ─") || line.includes("─") || line.includes("╰")) {
      continue;
    }
    // Skip session_id line
    if (line.trim().startsWith("session_id:")) {
      continue;
    }
    // Everything else is response content
    if (line.trim()) {
      responseLines.push(line);
    }
  }

  if (responseLines.length > 0) {
    return responseLines.join("\n").trim();
  }
  return null;
}

/**
 * Clean up Hermes output as fallback
 */
function cleanHermesOutput(output: string): string {
  // Remove box-drawing characters, headers, footers
  return output
    .replace(/[╭╮╯╰─]/g, "")
    .replace(/⚕ Hermes.*?╮/g, "")
    .replace(/session_id:.*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Export for OpenClaw skill system
export default {
  name: "hermes",
  description: "Route complex messages to Hermes AI for processing",
  handle: handleHermesBridge,
};
