/**
 * CDPConnection-specific error classes
 */

/**
 * Base error class for all CDP Browser Framework errors
 */
export class CDPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when WebSocket connection fails
 */
export class ConnectionError extends CDPError {
  constructor(
    message: string,
    public readonly wsUrl?: string
  ) {
    super(wsUrl ? `${message} (${wsUrl})` : message);
  }
}

/**
 * Thrown when a CDP protocol method fails
 */
export class ProtocolError extends CDPError {
  constructor(
    public readonly method: string,
    public readonly errorMessage: string,
    public readonly code?: number
  ) {
    super(
      `CDP Protocol Error [${method}]: ${errorMessage}${code ? ` (code: ${code})` : ""}`
    );
  }
}
