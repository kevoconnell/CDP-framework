/**
 * Page-specific error classes
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
 * Thrown when an element cannot be found
 */
export class ElementNotFoundError extends CDPError {
  constructor(
    public readonly selector: string,
    public readonly targetId?: string
  ) {
    super(`Element not found: ${selector}`);
  }
}

/**
 * Thrown when JavaScript evaluation fails
 */
export class EvaluationError extends CDPError {
  constructor(
    public readonly script: string,
    public readonly exceptionDetails?: any,
    public readonly targetId?: string
  ) {
    const message = exceptionDetails?.text || "Script evaluation failed";
    super(`${message}\nScript: ${script}`);
  }
}

/**
 * Thrown when a keyboard key is invalid
 */
export class InvalidKeyError extends CDPError {
  constructor(
    public readonly key: string,
    public readonly targetId?: string
  ) {
    super(
      `Invalid key: "${key}". Must be a valid key name (e.g., "Enter", "Escape", "a", "1")`
    );
  }
}

/**
 * Thrown when a screenshot fails
 */
export class ScreenshotError extends CDPError {
  constructor(
    message: string,
    public readonly path?: string,
    public readonly targetId?: string
  ) {
    super(path ? `${message} (path: ${path})` : message);
  }
}

/**
 * Thrown when a navigation fails
 */
export class NavigationError extends CDPError {
  constructor(
    public readonly url: string,
    public readonly error: Error,
    public readonly targetId?: string
  ) {
    super(`Navigation failed: ${url}`);
  }
}
