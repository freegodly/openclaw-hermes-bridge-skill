/**
 * Hermes Bridge Skill for OpenClaw
 *
 * Routes complex messages to Hermes MCP Server for AI processing.
 * Simple messages are handled directly by OpenClaw.
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

interface HermesBridgeConfig {
  hermesMcpUrl: string;
  privilegedUsers: string[];
  keywords: string[];
  timeout: number;
  transport: "streamable-http" | "stdio";
  command: string;
  args: string[];
}

// Default configuration
const DEFAULT_CONFIG: HermesBridgeConfig = {
  hermesMcpUrl: "http://localhost:18792/mcp",
  privilegedUsers: [],
  keywords: [
    "hermes",
    "analyze",
    "分析",
    "代码生成",
    "complex",
    "reasoning",
    "推理",
    "帮我",
    "请帮我",
  ],
  timeout: 30000,
  transport: "stdio",
  command: "hermes",
  args: ["mcp", "serve"],
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

  // Route to Hermes via MCP (only stdio mode supported)
  try {
    const response = await callHermesMCP(message, config);
    return { routed: true, response };
  } catch (error) {
    console.error("Hermes MCP call failed:", error);
    return {
      routed: true,
      error: error instanceof Error ? error.message : "Hermes unavailable",
    };
  }
}

/**
 * Call Hermes MCP Server via stdio
 */
async function callHermesMCP(
  message: string,
  config: HermesBridgeConfig
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.command, config.args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let requestId = 1;

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Hermes exited with code ${code}: ${stderr}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start Hermes: ${err.message}`));
    });

    // Give process time to start
    setTimeout(() => {
      // Send initialize
      const initRequest = {
        jsonrpc: "2.0",
        id: String(requestId++),
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "hermes-bridge-skill", version: "1.0.0" },
        },
      };

      proc.stdin.write(JSON.stringify(initRequest) + "\n");

      // Send notifications/initialized
      setTimeout(() => {
        proc.stdin.write(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "notifications/initialized",
            params: {},
          }) + "\n"
        );

        // Call messages_send tool with the user's message
        const toolRequest = {
          jsonrpc: "2.0",
          id: String(requestId++),
          method: "tools/call",
          params: {
            name: "messages_send",
            arguments: {
              target: "console", // Default target
              message: message,
            },
          },
        };

        proc.stdin.write(JSON.stringify(toolRequest) + "\n");

        // Wait for response
        setTimeout(() => {
          proc.kill();
          // Parse the last response from stdout
          const lines = stdout.trim().split("\n");
          let lastResult = "";
          for (const line of lines) {
            if (line.includes("result")) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.result) {
                  if (typeof parsed.result === "string") {
                    lastResult = parsed.result;
                  } else {
                    lastResult = JSON.stringify(parsed.result);
                  }
                }
              } catch {
                // Try to extract text from error
              }
            }
          }
          if (lastResult) {
            resolve(lastResult);
          } else if (stderr) {
            resolve(`Hermes: ${stderr.slice(0, 500)}`);
          } else {
            resolve("Hermes responded without result");
          }
        }, 3000);
      }, 1000);
    }, 1000);
  });
}

// Export for OpenClaw skill system
export default {
  name: "hermes",
  description: "Route complex messages to Hermes MCP Server",
  handle: handleHermesBridge,
};
