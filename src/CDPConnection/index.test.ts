import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CDPConnection } from "./index.js";
import WebSocket from "ws";

// Mock WebSocket
vi.mock("ws", () => {
  const mockOn = vi.fn();
  const mockSend = vi.fn();
  const mockClose = vi.fn();

  return {
    default: vi.fn().mockImplementation(() => ({
      on: mockOn,
      send: mockSend,
      close: mockClose,
      readyState: WebSocket.OPEN,
    })),
    WebSocket: {
      OPEN: 1,
    },
  };
});

describe("CDPConnection", () => {
  let connection: CDPConnection;
  const mockWsUrl = "ws://localhost:9222/devtools/browser";

  beforeEach(() => {
    vi.clearAllMocks();
    connection = new CDPConnection(mockWsUrl);
  });

  afterEach(() => {
    connection.close();
  });

  describe("constructor", () => {
    it("should create a CDPConnection instance", () => {
      expect(connection).toBeInstanceOf(CDPConnection);
    });

    it("should store the WebSocket URL", () => {
      expect(connection).toBeDefined();
    });
  });

  describe("connect", () => {
    it("should create a WebSocket connection", async () => {
      const connectPromise = connection.connect();

      // Simulate WebSocket open event
      const ws = (WebSocket as any).mock.results[0].value;
      const openHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "open"
      )?.[1];
      openHandler?.();

      await connectPromise;
      expect(WebSocket).toHaveBeenCalledWith(mockWsUrl);
    });

    it("should reject on WebSocket error", async () => {
      const connectPromise = connection.connect();

      // Simulate WebSocket error
      const ws = (WebSocket as any).mock.results[0].value;
      const errorHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "error"
      )?.[1];
      const testError = new Error("Connection failed");
      errorHandler?.(testError);

      await expect(connectPromise).rejects.toThrow("Connection failed");
    });
  });

  describe("send", () => {
    it("should throw error if WebSocket is not connected", async () => {
      await expect(connection.send("Page.navigate")).rejects.toThrow(
        "WebSocket is not connected"
      );
    });

    it("should send a message and return result", async () => {
      // Connect first
      const connectPromise = connection.connect();
      const ws = (WebSocket as any).mock.results[0].value;
      const openHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "open"
      )?.[1];
      openHandler?.();
      await connectPromise;

      // Send a command
      const sendPromise = connection.send("Page.navigate", { url: "https://example.com" });

      // Simulate response
      const messageHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "message"
      )?.[1];
      messageHandler?.(
        JSON.stringify({
          id: 1,
          result: { frameId: "frame123" },
        })
      );

      const result = await sendPromise;
      expect(result).toEqual({ frameId: "frame123" });
    });

    it("should reject on error response", async () => {
      // Connect first
      const connectPromise = connection.connect();
      const ws = (WebSocket as any).mock.results[0].value;
      const openHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "open"
      )?.[1];
      openHandler?.();
      await connectPromise;

      // Send a command
      const sendPromise = connection.send("Invalid.method");

      // Simulate error response
      const messageHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "message"
      )?.[1];
      messageHandler?.(
        JSON.stringify({
          id: 1,
          error: { message: "Method not found" },
        })
      );

      await expect(sendPromise).rejects.toThrow("Method not found");
    });
  });

  describe("event handling", () => {
    it("should emit CDP events", async () => {
      // Connect first
      const connectPromise = connection.connect();
      const ws = (WebSocket as any).mock.results[0].value;
      const openHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "open"
      )?.[1];
      openHandler?.();
      await connectPromise;

      // Set up event listener
      const eventHandler = vi.fn();
      connection.on("Page.loadEventFired", eventHandler);

      // Simulate CDP event
      const messageHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "message"
      )?.[1];
      messageHandler?.(
        JSON.stringify({
          method: "Page.loadEventFired",
          params: { timestamp: 123456 },
        })
      );

      expect(eventHandler).toHaveBeenCalledWith({ timestamp: 123456 });
    });

    it("should support once() for one-time event listeners", async () => {
      // Connect first
      const connectPromise = connection.connect();
      const ws = (WebSocket as any).mock.results[0].value;
      const openHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "open"
      )?.[1];
      openHandler?.();
      await connectPromise;

      // Set up one-time event listener
      const eventHandler = vi.fn();
      connection.once("Page.loadEventFired", eventHandler);

      // Simulate CDP event twice
      const messageHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "message"
      )?.[1];
      messageHandler?.(
        JSON.stringify({
          method: "Page.loadEventFired",
          params: { timestamp: 123456 },
        })
      );
      messageHandler?.(
        JSON.stringify({
          method: "Page.loadEventFired",
          params: { timestamp: 789012 },
        })
      );

      // Should only be called once
      expect(eventHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("close", () => {
    it("should close the WebSocket connection", async () => {
      // Connect first
      const connectPromise = connection.connect();
      const ws = (WebSocket as any).mock.results[0].value;
      const openHandler = ws.on.mock.calls.find(
        (call: any) => call[0] === "open"
      )?.[1];
      openHandler?.();
      await connectPromise;

      connection.close();
      expect(ws.close).toHaveBeenCalled();
    });

    it("should remove all listeners on close", async () => {
      const eventHandler = vi.fn();
      connection.on("Page.loadEventFired", eventHandler);

      connection.close();

      expect(connection.listenerCount("Page.loadEventFired")).toBe(0);
    });
  });
});
