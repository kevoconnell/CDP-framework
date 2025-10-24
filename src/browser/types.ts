import type { Options as ChromeLauncherOptions } from "chrome-launcher";
import type { Protocol } from "devtools-protocol";
import type { Page } from "../page/index.js";

export interface LaunchOptions extends Partial<ChromeLauncherOptions> {
  headless?: boolean;
  windowSize?: {
    width: number;
    height: number;
  };
}

export type Target = Protocol.Target.TargetInfo;

export interface IBrowser {
  launch(options?: LaunchOptions): Promise<void>;
  close(): Promise<void>;
  targets(): Promise<Target[]>;
  newPage(): Promise<Page>;
}
