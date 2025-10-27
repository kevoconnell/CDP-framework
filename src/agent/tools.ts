import { tool } from "@openai/agents";
import { z } from "zod";
import type { Agent } from "./index.js";

/**
 * Creates browser automation tools for the agent
 * @param agent - The Agent instance that contains the Page
 * @returns Array of tool functions
 */
export function createBrowserTools(agent: Agent) {
  const navigate = tool({
    name: "navigate",
    description:
      "Navigate to a URL in the browser. Use this to open web pages.",
    parameters: z.object({
      url: z
        .string()
        .describe("The URL to navigate to (e.g., 'https://example.com')"),
      waitUntil: z
        .enum(["load", "domcontentloaded"])
        .default("load")
        .describe("When to consider navigation succeeded. Defaults to 'load'."),
    }),
    execute: async ({ url, waitUntil }) => {
      const page = agent.getPage();
      if (!page) {
        throw new Error("No page instance available");
      }
      await page.goto(url, { waitUntil });
      return { success: true, message: `Navigated to ${url}` };
    },
  });

  const click = tool({
    name: "click",
    description:
      "Click an element on the page using a CSS selector. Use this to interact with buttons, links, and other clickable elements.",
    parameters: z.object({
      selector: z
        .string()
        .describe(
          "CSS selector for the element to click (e.g., '.submit-button', '#login')"
        ),
    }),
    execute: async ({ selector }) => {
      const page = agent.getPage();
      if (!page) {
        throw new Error("No page instance available");
      }
      await page.click(selector);
      return { success: true, message: `Clicked element: ${selector}` };
    },
  });

  const type = tool({
    name: "type",
    description:
      "Type text into the currently focused element. Use this after clicking on an input field.",
    parameters: z.object({
      text: z.string().describe("The text to type"),
    }),
    execute: async ({ text }) => {
      const page = agent.getPage();
      if (!page) {
        throw new Error("No page instance available");
      }
      await page.type(text);
      return { success: true, message: `Typed text: ${text}` };
    },
  });

  const press = tool({
    name: "press",
    description:
      "Press a keyboard key. Use this for special keys like Enter, Tab, Escape, etc.",
    parameters: z.object({
      key: z
        .string()
        .describe("The key to press (e.g., 'Enter', 'Tab', 'Escape')"),
    }),
    execute: async ({ key }) => {
      const page = agent.getPage();
      if (!page) {
        throw new Error("No page instance available");
      }
      await page.press(key);
      return { success: true, message: `Pressed key: ${key}` };
    },
  });

  const scroll = tool({
    name: "scroll",
    description:
      "Scroll the page by a specified amount. Use this to reveal more content.",
    parameters: z.object({
      deltaX: z
        .number()
        .default(0)
        .describe("Horizontal scroll delta in pixels"),
      deltaY: z.number().default(0).describe("Vertical scroll delta in pixels"),
    }),
    execute: async ({ deltaX, deltaY }) => {
      const page = agent.getPage();
      if (!page) {
        throw new Error("No page instance available");
      }
      await page.scroll({ deltaX, deltaY });
      return {
        success: true,
        message: `Scrolled page by deltaX: ${deltaX}, deltaY: ${deltaY}`,
      };
    },
  });

  const evaluate = tool({
    name: "evaluate",
    description:
      "Execute JavaScript code in the context of the page. Use this to extract information or manipulate the DOM.",
    parameters: z.object({
      script: z.string().describe("The JavaScript code to execute"),
    }),
    execute: async ({ script }) => {
      const page = agent.getPage();
      if (!page) {
        throw new Error("No page instance available");
      }
      const result = await page.evaluate(script);
      return { success: true, result };
    },
  });

  const screenshot = tool({
    name: "screenshot",
    description:
      "Take a screenshot of the current page. NOTE: This tool doesn't return the image to you - instead, tell the user to use the includeScreenshot option when calling agent.run(). This tool is mainly for saving screenshots to disk.",
    parameters: z.object({
      savePath: z
        .string()
        .default("")
        .describe("Optional path to save the screenshot file"),
    }),
    execute: async ({ savePath }) => {
      const page = agent.getPage();
      if (!page) {
        throw new Error("No page instance available");
      }

      // Save screenshot if path provided
      if (savePath) {
        await page.screenshot({
          format: "png",
          path: savePath,
        });
        return {
          success: true,
          message: `Screenshot saved to ${savePath}. Note: To analyze screenshots visually, the user should pass includeScreenshot: true to agent.run()`,
        };
      }

      return {
        success: true,
        message:
          "To see screenshots, the user should use includeScreenshot: true when calling agent.run()",
      };
    },
  });

  const getContent = tool({
    name: "get_content",
    description:
      "Get the HTML content of the current page. Use this to analyze the page structure.",
    parameters: z.object({}),
    execute: async () => {
      const page = agent.getPage();
      if (!page) {
        throw new Error("No page instance available");
      }
      const content = await page.content();
      return { success: true, content };
    },
  });

  return [
    navigate,
    click,
    type,
    press,
    scroll,
    evaluate,
    screenshot,
    getContent,
  ];
}
