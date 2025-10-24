import { describe, it, expect, vi, beforeEach } from "vitest";
import { Page } from "./index.js";
import type { CDPConnection } from "../CDPConnection/index.js";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock keycode
vi.mock("keycode", () => ({
  default: vi.fn((key: string) => {
    const keyCodes: Record<string, number> = {
      enter: 13,
      escape: 27,
      backspace: 8,
      tab: 9,
    };
    return keyCodes[key] || 65;
  }),
}));

describe("Page", () => {
  let page: Page;
  let mockConnection: CDPConnection;

  beforeEach(() => {
    mockConnection = {
      send: vi.fn().mockImplementation((method: string) => {
        if (method === "Runtime.evaluate") {
          return Promise.resolve({
            result: { value: "<html><body>Test</body></html>" },
          });
        }
        if (method === "DOM.getDocument") {
          return Promise.resolve({
            root: { nodeId: 1 },
          });
        }
        if (method === "DOM.querySelector") {
          return Promise.resolve({
            nodeId: 2,
          });
        }
        if (method === "DOM.getBoxModel") {
          return Promise.resolve({
            model: {
              content: [10, 20, 50, 60],
            },
          });
        }
        if (method === "Page.captureScreenshot") {
          return Promise.resolve({
            data: Buffer.from("fake-image-data").toString("base64"),
          });
        }
        if (method === "Target.closeTarget") {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({});
      }),
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
      close: vi.fn(),
    } as any;

    page = new Page(mockConnection, "target-123");
  });

  describe("event handling", () => {
    it("should delegate on() to connection", () => {
      const handler = vi.fn();
      page.on("Page.loadEventFired", handler);

      expect(mockConnection.on).toHaveBeenCalledWith(
        "Page.loadEventFired",
        handler
      );
    });

    it("should delegate once() to connection", () => {
      const handler = vi.fn();
      page.once("Page.loadEventFired", handler);

      expect(mockConnection.once).toHaveBeenCalledWith(
        "Page.loadEventFired",
        handler
      );
    });
  });

  describe("goto", () => {
    it("should wait for load event when specified", async () => {
      let loadHandler: Function | undefined;
      (mockConnection.once as any).mockImplementation(
        (event: string, handler: Function) => {
          if (event === "Page.loadEventFired") {
            loadHandler = handler;
            setTimeout(() => loadHandler?.(), 10);
          }
        }
      );

      await page.goto("https://example.com", { waitUntil: "load" });

      expect(mockConnection.once).toHaveBeenCalledWith(
        "Page.loadEventFired",
        expect.any(Function)
      );
    });

    it("should wait for domcontentloaded event when specified", async () => {
      let domHandler: Function | undefined;
      (mockConnection.once as any).mockImplementation(
        (event: string, handler: Function) => {
          if (event === "Page.domContentEventFired") {
            domHandler = handler;
            setTimeout(() => domHandler?.(), 10);
          }
        }
      );

      await page.goto("https://example.com", { waitUntil: "domcontentloaded" });

      expect(mockConnection.once).toHaveBeenCalledWith(
        "Page.domContentEventFired",
        expect.any(Function)
      );
    });
  });

  describe("content", () => {
    it("should return page HTML content", async () => {
      const html = await page.content();

      expect(mockConnection.send).toHaveBeenCalledWith("Runtime.evaluate", {
        expression: "document.documentElement.outerHTML",
        returnByValue: true,
        awaitPromise: true,
      });
      expect(html).toBe("<html><body>Test</body></html>");
    });
  });

  describe("screenshot", () => {
    it("should capture a screenshot", async () => {
      const buffer = await page.screenshot();

      expect(mockConnection.send).toHaveBeenCalledWith(
        "Page.captureScreenshot",
        {
          format: "png",
        }
      );
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it("should capture screenshot with custom format", async () => {
      await page.screenshot({ format: "jpeg", quality: 80 });

      expect(mockConnection.send).toHaveBeenCalledWith(
        "Page.captureScreenshot",
        expect.objectContaining({
          format: "jpeg",
          quality: 80,
        })
      );
    });

    it("should save screenshot to file when path is provided", async () => {
      const { writeFile } = await import("fs/promises");

      await page.screenshot({ path: "test.png" });

      expect(writeFile).toHaveBeenCalledWith("test.png", expect.any(Buffer));
    });

    it("should capture screenshot with clip region", async () => {
      const clip = { x: 0, y: 0, width: 100, height: 100, scale: 1 };
      await page.screenshot({ clip });

      expect(mockConnection.send).toHaveBeenCalledWith(
        "Page.captureScreenshot",
        expect.objectContaining({ clip })
      );
    });
  });

  describe("click", () => {
    it("should click an element", async () => {
      await page.click(".button");

      expect(mockConnection.send).toHaveBeenCalledWith("DOM.enable");
      expect(mockConnection.send).toHaveBeenCalledWith("DOM.getDocument");
      expect(mockConnection.send).toHaveBeenCalledWith("DOM.querySelector", {
        nodeId: 1,
        selector: ".button",
      });
      expect(mockConnection.send).toHaveBeenCalledWith("DOM.getBoxModel", {
        nodeId: 2,
      });
      expect(mockConnection.send).toHaveBeenCalledWith(
        "Input.dispatchMouseEvent",
        expect.objectContaining({
          type: "mousePressed",
          button: "left",
          clickCount: 1,
        })
      );
      expect(mockConnection.send).toHaveBeenCalledWith(
        "Input.dispatchMouseEvent",
        expect.objectContaining({
          type: "mouseReleased",
          button: "left",
          clickCount: 1,
        })
      );
    });

    it("should throw error if element not found", async () => {
      (mockConnection.send as any).mockImplementation((method: string) => {
        if (method === "DOM.querySelector") {
          return Promise.resolve({ nodeId: 0 });
        }
        if (method === "DOM.getDocument") {
          return Promise.resolve({ root: { nodeId: 1 } });
        }
        return Promise.resolve({});
      });

      await expect(page.click(".nonexistent")).rejects.toThrow(
        "Element not found: .nonexistent"
      );
    });
  });

  describe("press", () => {
    it("should press a key", async () => {
      await page.press("Enter");

      expect(mockConnection.send).toHaveBeenCalledWith(
        "Input.dispatchKeyEvent",
        expect.objectContaining({
          type: "keyDown",
          key: "Enter",
        })
      );
      expect(mockConnection.send).toHaveBeenCalledWith(
        "Input.dispatchKeyEvent",
        expect.objectContaining({
          type: "keyUp",
          key: "Enter",
        })
      );
    });

    it("should throw error for unknown key", async () => {
      const keycode = (await import("keycode")).default;
      (keycode as any).mockReturnValueOnce(undefined);

      await expect(page.press("InvalidKey")).rejects.toThrow("Invalid key");
    });
  });

  describe("type", () => {
    it("should type text", async () => {
      await page.type("Hello");

      expect(mockConnection.send).toHaveBeenCalledTimes(10);
    });

    it("should type with delay between characters", async () => {
      const startTime = Date.now();
      await page.type("Hi", { delay: 50 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe("close", () => {
    it("should close the page", async () => {
      await page.close();

      expect(mockConnection.send).toHaveBeenCalledWith("Target.closeTarget", {
        targetId: "target-123",
      });
    });
  });
});
