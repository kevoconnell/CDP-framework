import * as ChromeLauncher from "chrome-launcher";
import type { LaunchedChrome } from "chrome-launcher";
import { CDPConnection } from "../CDPConnection/index.js";
import { Page } from "../page/index.js";
import type { IBrowser, LaunchOptions, Target } from "./types.js";
import {
  BrowserNotConnectedError,
  BrowserLaunchError,
  TargetClosedError,
} from "./errors.js";

export class Browser implements IBrowser {
  private chrome: LaunchedChrome | null = null;
  private connection: CDPConnection | null = null;

  /**
   * @name launch
   * @description Launches Chrome and connects to its DevTools WebSocket endpoint.
   *
   * @param options - Chrome startup options (supports `headless`, `windowSize`,
   *   and any `chrome-launcher` option such as `chromePath` or `chromeFlags`).
   * @returns {Promise<void>} Resolves once the DevTools connection is established.
   * @throws {BrowserLaunchError} When Chrome fails to start or the endpoint is unavailable.
   */
  async launch(options?: LaunchOptions): Promise<void> {
    try {
      const chromeFlags: string[] = [];

      if (options?.headless) {
        chromeFlags.push("--headless", "--disable-gpu");
      }

      if (options?.windowSize) {
        chromeFlags.push(
          `--window-size=${options.windowSize.width},${options.windowSize.height}`
        );
      }

      this.chrome = await ChromeLauncher.launch({
        chromeFlags,
        ...options,
      });

      const response = await fetch(
        `http://localhost:${this.chrome.port}/json/version`
      );
      const versionInfo = await response.json();
      const wsUrl = versionInfo.webSocketDebuggerUrl;

      this.connection = new CDPConnection(wsUrl);
      await this.connection.connect();
      await this.closeInitialPage();
    } catch (error) {
      throw new BrowserLaunchError((error as Error).message, error as Error);
    }
  }

  private async closeInitialPage(): Promise<void> {
    const targets = await this.targets();
    const pageTargets = targets.filter((t) => t.type === "page");
    await Promise.all(
      pageTargets.map((target) => this.closeTargetById(target.targetId))
    );
  }

  /**
   * @name close
   * @description Closes every open page target and tears down the Chrome process.
   *
   * @returns {Promise<void>} Resolves after all connections are closed and the process exits.
   */
  async close(): Promise<void> {
    const errors: Error[] = [];

    if (this.connection) {
      const targets = await this.targets();
      const pageTargets = targets.filter((t) => t.type === "page");

      await Promise.all(
        pageTargets.map((target) => this.closeTargetById(target.targetId))
      );

      this.connection.close();
      this.connection = null;
    }

    if (this.chrome) {
      try {
        this.chrome.kill();
      } catch (error) {
        errors.push(
          new Error(
            `Failed to kill Chrome process: ${(error as Error).message}`
          )
        );
      }
      this.chrome = null;
    }
  }

  /**
   * @name targets
   * @description Retrieves the current list of available debugging targets.
   *
   * @returns {Promise<Target[]>} Array of `Protocol.Target.TargetInfo` objects.
   * @throws {BrowserNotConnectedError} If the root CDP connection is not established.
   *
   * @example
   * ```typescript
   * const targets = await browser.targets();
   * console.log(targets);
   * ```
   *
   * @note Gotcha: there is a small delay between a page closing and the target being removed from the list (like 50-100ms)
   */
  async targets(): Promise<Target[]> {
    if (!this.connection) {
      throw new BrowserNotConnectedError("get targets");
    }

    const result = await this.connection.send("Target.getTargets");

    return result.targetInfos;
  }

  /**
   * @name newPage
   * @description Creates a new target and returns a bound `Page` instance.
   *
   * @returns {Promise<Page>} A `Page` connected to the new target.
   * @throws {BrowserNotConnectedError} When called before `launch()`.
   * @throws {TargetClosedError} If Chrome cannot find the target after creation.
   *
   * @example
   * ```typescript
   * const page = await browser.newPage();
   * console.log(page);
   * ```
   */
  async newPage(): Promise<Page> {
    if (!this.connection) {
      throw new BrowserNotConnectedError("create new page");
    }

    if (!this.chrome) {
      throw new BrowserLaunchError("create new chromium instance");
    }

    const result = await this.connection.send("Target.createTarget", {
      url: "about:blank",
    });

    const targetId = result.targetId;

    await this.connection.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });

    const response = await fetch(`http://localhost:${this.chrome.port}/json`);
    const targets = await response.json();
    const target = targets.find((t: any) => t.id === targetId);

    if (!target) {
      throw new TargetClosedError(targetId);
    }

    const pageConnection = new CDPConnection(target.webSocketDebuggerUrl);
    await pageConnection.connect();

    return new Page(pageConnection, targetId);
  }

  /**
   * Sends `Target.closeTarget` for the given identifier.
   *
   * @param targetId - Identifier of the target to close.
   * @returns {Promise<void>}
   * @throws {BrowserNotConnectedError} If the root connection is unavailable.
   * @throws {TargetClosedError} When Chrome reports the target could not be closed.
   *
   * @example
   * ```typescript
   * await browser.closeTargetById("1234567890");
   * console.log("Target closed");
   * ```
   */
  private async closeTargetById(targetId: string): Promise<void> {
    if (!this.connection) {
      throw new BrowserNotConnectedError("close page");
    }

    const result = await this.connection.send("Target.closeTarget", {
      targetId,
    });

    if (!result.success) {
      throw new TargetClosedError(targetId);
    }
  }
}
