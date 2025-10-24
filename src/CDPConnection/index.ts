import WebSocket from "ws";
import { EventEmitter } from "events";
import type { ProtocolMapping } from "devtools-protocol/types/protocol-mapping.js";
import { ConnectionError, ProtocolError } from "./errors.js";

export interface ICDPConnection {
  send(method: string, params?: any): Promise<any>;
  on<K extends keyof ProtocolMapping.Events>(
    event: K,
    handler: (...args: ProtocolMapping.Events[K]) => void
  ): this;
  off<K extends keyof ProtocolMapping.Events>(
    event: K,
    handler: (...args: ProtocolMapping.Events[K]) => void
  ): this;
  once<K extends keyof ProtocolMapping.Events>(
    event: K,
    handler: (...args: ProtocolMapping.Events[K]) => void
  ): this;
}

export class CDPConnection extends EventEmitter implements ICDPConnection {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingMessages = new Map<
    number,
    { resolve: Function; reject: Function }
  >();

  constructor(private wsUrl: string) {
    super();
  }

  /**
   * @name on
   * @description Registers an event listener for Chrome DevTools Protocol events.
   *
   * @param event - CDP event name to listen for (e.g., `"Page.loadEventFired"`).
   * @param handler - Callback invoked with the event payload.
   * @returns {CDPConnection} this
   *
   * @example
   * ```typescript
   * connection.on("Page.loadEventFired", (event) => {
   *   console.log("Page loaded");
   * });
   * ```
   */
  on<K extends keyof ProtocolMapping.Events>(
    event: keyof ProtocolMapping.Events,
    handler: (...args: ProtocolMapping.Events[K]) => void
  ): this {
    return super.on(event, handler) as this;
  }

  /**
   * @name off
   * @description Removes a previously registered CDP event listener.
   *
   * @param event - CDP event name to stop listening for.
   * @param handler - Exact callback instance originally passed to `on`.
   * @returns {CDPConnection} this
   *
   * @example
   * ```typescript
   * const handler = () => console.log("Page loaded");
   * connection.on("Page.loadEventFired", handler);
   * connection.off("Page.loadEventFired", handler);
   * ```
   */
  off<K extends keyof ProtocolMapping.Events>(
    event: keyof ProtocolMapping.Events,
    handler: (...args: ProtocolMapping.Events[K]) => void
  ): this {
    return super.off(event, handler) as this;
  }

  /**
   * @name once
   * @description Registers a one-time event listener for Chrome DevTools Protocol events.
   *
   * @param event - CDP event name to listen for (e.g., `"Page.loadEventFired"`).
   * @param handler - Callback invoked with the event payload.
   * @returns {CDPConnection} this
   *
   * @example
   * ```typescript
   * connection.once("Page.loadEventFired", (event) => {
   *   console.log("Page loaded");
   * });
   * ```
   */
  once<K extends keyof ProtocolMapping.Events>(
    event: keyof ProtocolMapping.Events,
    handler: (...args: ProtocolMapping.Events[K]) => void
  ): this {
    return super.once(event, handler) as this;
  }

  /**
   * @name connect
   * @description Connects to the Chrome DevTools Protocol.
   *
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await connection.connect();
   * ```
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on("open", () => {
        resolve();
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());

        if (message.id !== undefined) {
          const pending = this.pendingMessages.get(message.id);
          if (pending) {
            this.pendingMessages.delete(message.id);
            if (message.error) {
              pending.reject(
                new ProtocolError(
                  message.method || "unknown",
                  message.error.message,
                  message.error.code
                )
              );
            } else {
              pending.resolve(message.result);
            }
          }
        } else if (message.method) {
          this.emit(message.method, message.params);
        }
      });

      this.ws.on("error", (error) => {
        reject(new ConnectionError(error.message, this.wsUrl));
      });

      this.ws.on("close", () => {
        this.emit("disconnected");
      });
    });
  }

  /**
   * @name send
   * @description Sends a message to the Chrome DevTools Protocol.
   *
   * @param method - The method to send.
   * @param params - The parameters to send.
   * @returns {Promise<any>}
   *
   * @example
   * ```typescript
   * const result = await connection.send("Page.loadEventFired", { timestamp: 123456 });
   * console.log(result);
   * ```
   */
  async send(method: string, params?: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const id = ++this.messageId;
    const message = { id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(message));
    });
  }

  /**
   * @name close
   * @description Closes the connection to the Chrome DevTools Protocol.
   *
   * @returns {void}
   *
   * @example
   * ```typescript
   * await connection.close();
   * ```
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.removeAllListeners();
      resolve();
    });
  }
}
