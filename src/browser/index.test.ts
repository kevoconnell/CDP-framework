import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Browser } from "./index.js";
import * as chromeLauncher from "chrome-launcher";

// Mock chrome-launcher
vi.mock("chrome-launcher", () => ({
  launch: vi.fn(),
}));

// Mock CDPConnection
vi.mock("../CDPConnection/index.js", () => ({
  CDPConnection: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockImplementation((method: string) => {
      if (method === "Target.getTargets") {
        return Promise.resolve({
          targetInfos: [
            { targetId: "target1", type: "page", url: "https://example.com" },
          ],
        });
      }
      if (method === "Target.createTarget") {
        return Promise.resolve({ targetId: "new-target-123" });
      }
      if (method === "Target.attachToTarget") {
        return Promise.resolve({ sessionId: "session-123" });
      }
      if (method === "Target.closeTarget") {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({});
    }),
    close: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe("Browser", () => {
  let browser: Browser;

  beforeEach(() => {
    vi.clearAllMocks();
    browser = new Browser();

    // Setup default fetch mocks
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes("/json/version")) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              webSocketDebuggerUrl: "ws://localhost:9222/devtools/browser",
            }),
        });
      }
      if (url.includes("/json")) {
        return Promise.resolve({
          json: () =>
            Promise.resolve([
              {
                id: "new-target-123",
                webSocketDebuggerUrl:
                  "ws://localhost:9222/devtools/page/new-target-123",
              },
            ]),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  afterEach(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe("constructor", () => {
    it("should create a Browser instance", () => {
      expect(browser).toBeInstanceOf(Browser);
    });
  });

  describe("launch", () => {
    it("should launch Chrome in headless mode", async () => {
      const mockChrome = {
        port: 9222,
        kill: vi.fn(),
      };
      (chromeLauncher.launch as any).mockResolvedValue(mockChrome);

      await browser.launch({ headless: true });

      expect(chromeLauncher.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          chromeFlags: expect.arrayContaining(["--headless", "--disable-gpu"]),
        })
      );
    });

    it("should launch Chrome with custom window size", async () => {
      const mockChrome = {
        port: 9222,
        kill: vi.fn(),
      };
      (chromeLauncher.launch as any).mockResolvedValue(mockChrome);

      await browser.launch({
        windowSize: { width: 1920, height: 1080 },
      });

      expect(chromeLauncher.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          chromeFlags: expect.arrayContaining(["--window-size=1920,1080"]),
        })
      );
    });

    it("should launch Chrome without headless mode by default", async () => {
      const mockChrome = {
        port: 9222,
        kill: vi.fn(),
      };
      (chromeLauncher.launch as any).mockResolvedValue(mockChrome);

      await browser.launch();

      expect(chromeLauncher.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          chromeFlags: [],
        })
      );
    });

    it("should establish CDP connection", async () => {
      const mockChrome = {
        port: 9222,
        kill: vi.fn(),
      };
      (chromeLauncher.launch as any).mockResolvedValue(mockChrome);

      await browser.launch();

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:9222/json/version"
      );
    });
  });

  describe("close", () => {
    it("should close Chrome and CDP connection", async () => {
      const mockChrome = {
        port: 9222,
        kill: vi.fn(),
      };
      (chromeLauncher.launch as any).mockResolvedValue(mockChrome);

      await browser.launch();
      await browser.close();

      expect(mockChrome.kill).toHaveBeenCalled();
    });

    it("should handle close when not launched", async () => {
      await expect(browser.close()).resolves.not.toThrow();
    });
  });

  describe("targets", () => {
    it("should return list of targets", async () => {
      const mockChrome = {
        port: 9222,
        kill: vi.fn(),
      };
      (chromeLauncher.launch as any).mockResolvedValue(mockChrome);

      await browser.launch();
      const targets = await browser.targets();

      expect(targets).toEqual([
        { targetId: "target1", type: "page", url: "https://example.com" },
      ]);
    });

    it("should throw error if browser is not launched", async () => {
      await expect(browser.targets()).rejects.toThrow(
        "Browser is not connected"
      );
    });
  });

  describe("newPage", () => {
    it("should create a new page", async () => {
      const mockChrome = {
        port: 9222,
        kill: vi.fn(),
      };
      (chromeLauncher.launch as any).mockResolvedValue(mockChrome);

      await browser.launch();
      const page = await browser.newPage();

      expect(page).toBeDefined();
    });

    it("should throw error if browser is not launched", async () => {
      await expect(browser.newPage()).rejects.toThrow(
        "Browser is not connected"
      );
    });

    it("should throw error if target is not found", async () => {
      const mockChrome = {
        port: 9222,
        kill: vi.fn(),
      };
      (chromeLauncher.launch as any).mockResolvedValue(mockChrome);

      // Mock fetch to return no targets
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes("/json/version")) {
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                webSocketDebuggerUrl: "ws://localhost:9222/devtools/browser",
              }),
          });
        }
        if (url.includes("/json")) {
          return Promise.resolve({
            json: () => Promise.resolve([]),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      await browser.launch();
      await expect(browser.newPage()).rejects.toThrow("Target has been closed");
    });
  });
});
