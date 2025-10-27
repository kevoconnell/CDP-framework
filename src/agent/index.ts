import {
  Agent as OpenAIAgent,
  run,
  RunResult,
  webSearchTool,
  setDefaultOpenAIClient,
} from "@openai/agents";
import { config } from "dotenv";
import type { Page } from "../page/index.js";
import type { AgentConfig, IAgent } from "./types.js";
import { createBrowserTools } from "./tools.js";
import { DEFAULT_AGENT_PROMPT } from "./prompt.js";
import { Browser } from "../browser/index.js";
import { OpenAI } from "openai";

// Load environment variables from .env file
config();

export class Agent implements IAgent {
  private openaiAgent: OpenAIAgent;
  private page: Page | null = null;
  private baseURL: string | undefined;
  private apiKey: string;
  private browser: Browser;
  private initPromise: Promise<void>;

  /**
   * Creates a new Agent instance
   * @param config - Configuration for the agent
   */
  constructor(config?: AgentConfig) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenAI API key is required. Provide it via config.apiKey or set OPENAI_API_KEY environment variable."
      );
    }

    this.apiKey = apiKey;

    this.baseURL = config?.baseURL;
    //make open AI client
    if (this.baseURL) {
      const openaiClient = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseURL,
      });
      setDefaultOpenAIClient(openaiClient);
    }
    this.browser = config?.browser || new Browser();

    const browserTools = createBrowserTools(this);

    this.openaiAgent = new OpenAIAgent({
      name: "Browser Agent",
      model: config?.model || "gpt-5-nano",
      instructions: config?.instructions || DEFAULT_AGENT_PROMPT,
      tools: [...browserTools, webSearchTool()],
    });

    // Initialize browser and page asynchronously
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the browser and create the first page
   * @private
   */
  private async initialize(): Promise<void> {
    await this.browser.launch();
    this.page = await this.browser.newPage();
  }

  /**
   * Set the page instance for the agent to interact with
   */
  setPage(page: Page): void {
    this.page = page;
  }

  /**
   * Get the current page instance
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get the browser instance
   */
  getBrowser(): Browser {
    return this.browser;
  }

  /**
   * Execute the agent with a given task
   * @param task - The task or prompt for the agent to execute
   * @param options - Optional run options
   * @returns The agent's response
   */
  async run(
    task: string,
    options?: {
      maxTurns?: number;
    }
  ): Promise<RunResult<any, any>> {
    try {
      // Ensure browser and page are initialized before running
      await this.initPromise;

      const result = await run(this.openaiAgent, task, {
        maxTurns: options?.maxTurns || 25, // Default to 25 turns, can be overridden
      });

      return result;
    } catch (error) {
      throw new Error(`Agent execution failed: ${(error as Error).message}`);
    }
  }
}
