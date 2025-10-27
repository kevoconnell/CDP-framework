import { Browser } from "../browser/index.js";
import type { Page } from "../page/index.js";
import type { Tool, MCPServer, RunResult } from "@openai/agents";

export interface IAgent {
  /**
   * Execute the agent with a given task/prompt
   */
  run(
    task: string,
    options?: {
      maxTurns?: number;
    }
  ): Promise<RunResult<any, any>>;

  /**
   * Set the page instance for the agent to interact with
   */
  setPage(page: Page): void;

  /**
   * Get the current page instance
   */
  getPage(): Page | null;
}

export type AgentToolDefinition = Tool<unknown>;
export type MCPServerInstance = MCPServer;

export interface AgentConfig {
  /**
   * The browser instance to use
   */
  browser?: Browser;

  /**
   * Custom tools to add to the agent
   */
  customTools?: AgentToolDefinition[];

  /**
   * MCP servers to connect (e.g., filesystem, database, etc.)
   * Use MCPServerStdio, MCPServerSSE, or MCPServerStreamableHttp
   */
  mcpServers?: MCPServerInstance[];

  /**
   * Model to use for the agent
   */
  model?: string;

  /**
   * System instructions for the agent
   */
  instructions?: string;

  /**
   * OpenAI API key (defaults to process.env.OPENAI_API_KEY)
   */
  apiKey?: string;

  /**
   * Base URL for OpenAI API (optional, for custom endpoints)
   */
  baseURL?: string;

  /**
   * Model to use when summarizing prompts after a context overflow
   */
  summarizationModel?: string;
}
