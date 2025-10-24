import type { ProtocolMapping } from "devtools-protocol/types/protocol-mapping.js";
import type { CDPConnection } from "../CDPConnection/index.js";
import keycode from "keycode";
import { writeFile } from "fs/promises";

import Protocol from "devtools-protocol";
import {
  EvaluateResult,
  IPage,
  NavigationOptions,
  ScreenshotOptions,
  TypeOptions,
} from "./types.js";
import {
  ElementNotFoundError,
  EvaluationError,
  InvalidKeyError,
  NavigationError,
  ScreenshotError,
} from "./errors.js";

export class Page implements IPage {
  private connection: CDPConnection;
  private targetId: string;

  constructor(connection: CDPConnection, targetId: string) {
    this.connection = connection;
    this.targetId = targetId;
  }

  /**
   * @name on
   * @description Registers an event listener for Chrome DevTools Protocol events.
   *
   * @param event - CDP event name to listen for (e.g., `"Page.loadEventFired"`).
   * @param handler - Callback invoked with the event payload.
   * @returns This `Page` instance for chaining.
   *
   * @example
   * ```typescript
   * page.on("Page.loadEventFired", () => {
   *   console.log("Page loaded");
   * });
   * ```
   *
   * @note Gotcha: CDP may emit events for `about:blank` frames;
   */
  on<K extends keyof ProtocolMapping.Events>(
    event: K,
    handler: (...args: ProtocolMapping.Events[K]) => void
  ): this {
    this.connection.on(event, handler);
    return this;
  }

  /**
   * @name off
   * @description Removes a previously registered CDP event listener.
   *
   * @param event - CDP event name to stop listening for.
   * @param handler - Exact callback instance originally passed to `on`.
   * @returns {Page} this
   *
   * @example
   * ```typescript
   * const handler = () => console.log("Page loaded");
   * page.on("Page.loadEventFired", handler);
   * page.off("Page.loadEventFired", handler);
   * ```
   */
  off<K extends keyof ProtocolMapping.Events>(
    event: K,
    handler: (...args: ProtocolMapping.Events[K]) => void
  ): this {
    this.connection.off(event, handler);
    return this;
  }

  /**
   * @name once
   * @description Registers a one-time event listener for Chrome DevTools Protocol events.
   *
   * @param event - The CDP event name to listen for
   * @param handler - Callback function invoked when the event is emitted
   * @returns {Page} this
   *
   * @example
   * ```typescript
   * page.once("Page.loadEventFired", () => {
   *   console.log("Page loaded");
   * });
   * ```
   */
  once<K extends keyof ProtocolMapping.Events>(
    event: K,
    handler: (...args: ProtocolMapping.Events[K]) => void
  ): this {
    this.connection.once(event, handler);
    return this;
  }

  /**
   * @name getTargetId
   * @description Returns the target ID of the page.
   *
   * @returns {String} The target ID of the page
   *
   * @example
   * ```typescript
   * const targetId = page.getTargetId();
   * console.log(targetId);
   * ```
   */
  getTargetId(): string {
    return this.targetId;
  }

  /**
   * @name goto
   * @description Navigates to a URL.
   *
   * @param url - The URL to navigate to
   * @param options - Optional navigation options
   * @returns {Promise<void>}
   * @throws {NavigationError} If the navigation fails
   *
   * @example
   * ```typescript
   * await page.goto("https://example.com");
   * ```
   */
  async goto(url: string, options?: NavigationOptions): Promise<void> {
    try {
      await this.connection.send("Page.enable");
      await this.connection.send("Page.navigate", { url });

      if (options?.waitUntil) {
        await this.waitForNavigation(options.waitUntil);
      }
    } catch (error) {
      throw new NavigationError(url, error as Error, this.targetId);
    }
  }

  /**
   * @name content
   * @description Returns the HTML content of the page.
   *
   * @returns {Promise<string>} The HTML content of the page
   * @throws {EvaluationError} If the evaluation fails
   *
   * @example
   * ```typescript
   * const html = await page.content();
   * console.log(html);
   * ```
   */
  async content(): Promise<string> {
    try {
      return await this.evaluate("document.documentElement.outerHTML");
    } catch (error) {
      throw error;
    }
  }

  /**
   * @name evaluate
   * @description Evaluates a JavaScript expression in the context of the page.
   *
   * @param script - The JavaScript expression to evaluate
   * @returns {Promise<T>} The result of the evaluation as type T
   * @throws {EvaluationError} If the evaluation fails
   *
   * @example
   * ```typescript
   * const html = await page.evaluate("document.documentElement.outerHTML");
   * console.log(html);
   * ```
   */
  async evaluate(script: string): Promise<EvaluateResult> {
    try {
      const result = await this.connection.send("Runtime.evaluate", {
        expression: script,
        returnByValue: true,
        awaitPromise: true,
      });

      if (result.exceptionDetails) {
        throw new EvaluationError(
          script,
          result.exceptionDetails,
          this.targetId
        );
      }

      return result.result.value;
    } catch (error) {
      throw new EvaluationError(script, error, this.targetId);
    }
  }

  /**
   * @name screenshot
   * @description Captures a screenshot of the current page using CDP.
   *
   * @param options - Optional screenshot configuration (format, quality, clip, path, etc.).
   * @returns {Promise<Buffer>} A buffer containing the screenshot bytes.
   * @throws {ScreenshotError} If the screenshot capture fails or the file cannot be written.
   *
   * @example
   * ```typescript
   * const screenshot = await page.screenshot();
   * console.log(screenshot);
   * ```
   */
  async screenshot(options?: ScreenshotOptions): Promise<Buffer> {
    const screenshotParams: Protocol.Page.CaptureScreenshotRequest = {
      format: options?.format || "png",
    };

    if (options?.quality) {
      screenshotParams.quality = options.quality;
    }

    if (options?.clip) {
      screenshotParams.clip = options.clip;
    }

    try {
      const result = await this.connection.send(
        "Page.captureScreenshot",
        screenshotParams
      );
      const buffer = Buffer.from(result.data, "base64");

      // If path is provided, write the screenshot to disk
      if (options?.path) {
        try {
          await writeFile(options.path, buffer);
        } catch (error) {
          throw new ScreenshotError(
            `Failed to write screenshot to file: ${(error as Error).message}`,
            options.path,
            this.targetId
          );
        }
      }

      return buffer;
    } catch (error) {
      if (error instanceof ScreenshotError) {
        throw error;
      }
      throw new ScreenshotError(
        `Failed to capture screenshot: ${(error as Error).message}`,
        options?.path,
        this.targetId
      );
    }
  }

  /**
   * @name click
   * @description Clicks the first element matching the provided selector.
   *
   * @param selector - CSS selector for the desired element.
   * @returns {Promise<void>}
   * @throws {ElementNotFoundError} If the selector does not resolve to an element.
   *
   * @example
   * ```typescript
   * await page.click(".button");
   * ```
   */
  async click(selector: string): Promise<void> {
    await this.connection.send("DOM.enable");

    const { root } = await this.connection.send("DOM.getDocument");

    if (!root) {
      throw new ElementNotFoundError(selector, this.targetId);
    }

    const { nodeId } = await this.connection.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector,
    });

    if (!nodeId) {
      throw new ElementNotFoundError(selector, this.targetId);
    }

    const { model } = await this.connection.send("DOM.getBoxModel", {
      nodeId,
    });

    const [x1, y1, x2, y2, x3, y3, x4, y4] = model.content;

    //get the center
    const x = (x1 + x2 + x3 + x4) / 4;
    const y = (y1 + y2 + y3 + y4) / 4;

    await this.connection.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1,
    });

    await this.connection.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
  }

  /**
   * @name press
   * @description Dispatches key down and up events for the provided key.
   *
   * @param key - Key name (case-insensitive) to send.
   * @returns void
   * @throws InvalidKeyError If the key is not supported by the keycode library.
   *
   * @example
   * ```typescript
   * await page.press("Enter");
   * ```
   */
  async press(key: string): Promise<void> {
    const code = keycode(key.toLowerCase());

    if (code === undefined) {
      throw new InvalidKeyError(key, this.targetId);
    }

    await this.connection.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      windowsVirtualKeyCode: code,
      key: key,
    });

    await this.connection.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      windowsVirtualKeyCode: code,
      key: key,
    });
  }

  /**
   * @name type
   * @description Types the given text by dispatching key events for each character.
   *
   * @param text - Text to type.
   * @param options - Optional typing configuration (e.g., delay between characters).
   * @returns void
   *
   * @example
   * ```typescript
   * await page.type("Hello");
   * ```
   */
  async type(text: string, options?: TypeOptions): Promise<void> {
    for (const char of text) {
      const code = char.charCodeAt(0);

      await this.connection.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        text: char,
        windowsVirtualKeyCode: code,
      });

      await this.connection.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        windowsVirtualKeyCode: code,
      });
      if (options?.delay) {
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      }
    }
  }

  /**
   * @name close
   * @description Closes the page.
   * @param options - Optional options for closing the page.
   * @param options.waitForClose - Whether to wait for the page to be closed.
   * @param options.timeout - The timeout in milliseconds to wait for the page to be closed.
   * @returns {Promise<void>} Resolves once the page is closed.
   * @throws {Error} When Chrome reports the target could not be closed.
   *
   * @example
   * ```typescript
   * await page.close({ force: true });
   * console.log("Page closed");
   * ```
   */
  async close(): Promise<void> {
    try {
      const result = await this.connection.send("Target.closeTarget", {
        targetId: this.targetId,
      });

      if (!result.success) {
        throw new Error(`Failed to close target ${this.targetId}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to close target ${this.targetId}: ${(error as Error).message}`
      );
    }
  }

  /**
   * @name waitForNavigation
   * @description Waits for either the load or DOMContentLoaded lifecycle event.
   *
   * @param waitUntil - Lifecycle event to await.
   * @returns void
   *
   * @example
   * ```typescript
   * await page.waitForNavigation("load");
   * console.log("Page loaded");
   * ```
   */
  private async waitForNavigation(
    waitUntil: "load" | "domcontentloaded"
  ): Promise<void> {
    return new Promise((resolve) => {
      if (waitUntil === "load") {
        this.connection.once("Page.loadEventFired", () => resolve());
      } else if (waitUntil === "domcontentloaded") {
        this.connection.once("Page.domContentEventFired", () => resolve());
      }
    });
  }
}
