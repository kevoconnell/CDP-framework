import { Browser } from "../src/browser/index.js";

/**
 * Simplified Multiple Targets Example
 *
 * Demonstrates:
 * - Creating multiple pages
 * - Concurrent navigation and data extraction
 * - Managing page lifecycle
 */

async function main() {
  const browser = new Browser();
  await browser.launch({
    headless: true,
  });

  // Create 2 pages
  const [page1, page2] = await Promise.all([
    browser.newPage(),
    browser.newPage(),
  ]);

  console.log(`Created ${await browser.targets().then((t) => t.length)} pages`);

  // Navigate to different URLs concurrently and wait for full load
  await Promise.all([
    page1.goto("https://example.com", { waitUntil: "load" }),
    page2.goto("https://github.com", { waitUntil: "load" }),
  ]);

  // Extract titles concurrently
  const [title1, title2] = await Promise.all([
    page1.evaluate("document.title"),
    page2.evaluate("document.title"),
  ]);

  console.log("Page titles:", { title1, title2 });

  // Close one page and continue with the other
  await page2.close();
  console.log("Closed page 2");

  await new Promise((resolve) => setTimeout(resolve, 100));
  //new pages
  const newPages = await browser.targets();
  console.log("remaining pages:", newPages.map((p) => p.url).join(", "));
  // Navigate remaining page and wait for full load

  console.log("navigating to mozilla.org");
  await page1.goto("https://www.mozilla.org", { waitUntil: "load" });

  const newTitle1 = await page1.evaluate("document.title");

  console.log("New title:", { newTitle1 });

  await browser.close();
  console.log("Done!");
}

// Run the example
main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
