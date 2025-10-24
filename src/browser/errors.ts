/**
 * Browser-specific error classes
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
 * Thrown when browser is not launched or connection is lost
 */
export class BrowserNotConnectedError extends CDPError {
  constructor(operation?: string) {
    const message = operation
      ? `Cannot ${operation}: Browser is not connected. Did you call browser.launch()?`
      : "Browser is not connected";
    super(message);
  }
}

/**
 * Thrown when browser launch fails
 */
export class BrowserLaunchError extends CDPError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(`Failed to launch browser: ${message}`);
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Thrown when target (page/tab) is closed or not found
 */
export class TargetClosedError extends CDPError {
  constructor(public readonly targetId: string) {
    super(`Target has been closed: ${targetId}`);
  }
}
