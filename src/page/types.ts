import type { Protocol } from "devtools-protocol";
import ProtocolMapping from "devtools-protocol/types/protocol-mapping";

export interface NavigationOptions
  extends Omit<Protocol.Page.NavigateRequest, "url"> {
  /**
   * When to consider navigation succeeded. Defaults to 'load'.
   */
  waitUntil?: "load" | "domcontentloaded";
  /**
   * Maximum navigation time in milliseconds.
   */
  timeout?: number;
}

export interface TypeOptions {
  /**
   * The delay between each character in milliseconds.
   */
  delay?: number;
}
export interface ScreenshotOptions
  extends Protocol.Page.CaptureScreenshotRequest {
  /**
   * The file path to save the screenshot to.
   */

  path?: string;
}

export type EvaluateResult =
  ProtocolMapping.Commands["Runtime.evaluate"]["returnType"]["result"]["value"];

export interface IPage {
  goto(url: string, options?: NavigationOptions): Promise<void>;
  content(): Promise<string>;
  evaluate(script: string): Promise<EvaluateResult>;
  screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  click(selector: string): Promise<void>;
  press(key: string): Promise<void>;
  type(text: string): Promise<void>;
  close(): Promise<void>;
}
