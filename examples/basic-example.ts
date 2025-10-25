import { Browser } from "../src";

const browser = new Browser();
await browser.launch({ headless: true });

const page = await browser.newPage();
await page.goto("https://example.com");

const content = await page.content();
console.log("Page content:", content);
console.log("Page title:", await page.evaluate("document.title"));

await page.screenshot({ path: "screenshot.png" });

await page.close();
await browser.close();
