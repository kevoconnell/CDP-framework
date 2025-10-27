export { Browser } from "./browser/index.js";
export { Page } from "./page/index.js";
export { CDPConnection } from "./CDPConnection/index.js";
export { Agent } from "./agent/index.js";
export { DEFAULT_AGENT_PROMPT } from "./agent/prompt.js";

// Re-export MCP types and classes from OpenAI Agents SDK
export { MCPServerStdio, MCPServerSSE, MCPServerStreamableHttp } from "@openai/agents";

// Export types from their respective modules
export type { IBrowser, LaunchOptions, Target } from "./browser/types.js";
export type {
  IPage,
  NavigationOptions,
  ScreenshotOptions,
} from "./page/types.js";
export type { ICDPConnection } from "./CDPConnection/types.js";
export type {
  IAgent,
  AgentConfig,
  AgentToolDefinition,
  MCPServerInstance,
} from "./agent/types.js";
