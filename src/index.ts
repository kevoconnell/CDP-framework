export { Browser } from "./browser/index.js";
export { Page } from "./page/index.js";
export { CDPConnection } from "./CDPConnection/index.js";

// Export types from their respective modules
export type { IBrowser, LaunchOptions, Target } from "./browser/types.js";
export type {
  IPage,
  NavigationOptions,
  ScreenshotOptions,
} from "./page/types.js";
export type { ICDPConnection } from "./CDPConnection/types.js";
