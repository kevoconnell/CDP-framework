import { Browser } from "../src";

// Helper function to extract team data
const extractTeamData = (html: string) => {
  const nameMatch = html.match(
    /<span class="nfl-c-game-strip-v2__team-fullname">\s*(.*?)\s*<\/span>/
  );
  const recordMatch = html.match(
    /<span class="nfl-c-game-strip-v2__team-record">\s*([\d-]+)\s*<\/span>/
  );
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    record: recordMatch ? recordMatch[1] : null,
  };
};

const browser = new Browser();
//note: headless mode is not supported for this example, because google directs us to the sorry page
await browser.launch({ headless: false });

const page = await browser.newPage();

page.on("Page.frameNavigated", (params) => {
  // Only non about:blank frames
  if (!params.frame.parentId && params.frame.url !== "about:blank") {
    console.log("Frame navigated:", params.frame.url);
  }
});

const loadPromise = new Promise<void>((resolve) => {
  page.once("Page.loadEventFired", () => resolve());
});

// Navigate to Google
await page.goto("https://www.google.com");

console.log("Navigated to Google");

// Wait for the page to fully load
await loadPromise;

// Wait for Google's scripts to finish initializing
await new Promise((resolve) => setTimeout(resolve, 1500));

// Click on the search input to focus it
await page.click('textarea[name="q"]');

console.log("Focused search input");

// Wait a moment after clicking
await new Promise((resolve) => setTimeout(resolve, 200));

await page.type("Chicago Bears", { delay: 100 });

console.log("Typed search query: Chicago Bears");

await page.press("Enter");

console.log("Pressed Enter to search!");

// Wait for search results to load
await new Promise((resolve) => setTimeout(resolve, 3000));

console.log("Search results loaded");

// Click on the first search result
// Google's first organic result is typically in a div with class 'g'
await page.evaluate(`
  const firstResult = document.querySelector('div#search h3');
  if (firstResult) {
    firstResult.click();
  }
`);

console.log("Clicked first search result!");

await new Promise<void>((resolve) => {
  page.once("Page.loadEventFired", async () => {
    // Extract title from HTML
    console.log("Page title:", await page.evaluate("document.title"));
    await page.screenshot({ path: "bears-game-screenshot.png" });

    //note: in the future, we can use a getAttribute() methods to get the HTML of what we need
    //for the sake of time - just using evaluate() for now
    const awayTeamHTML = await page.evaluate(
      `document.querySelector('.nfl-c-game-strip-v2__team-info--away').outerHTML`
    );
    const homeTeamHTML = await page.evaluate(
      `document.querySelector('.nfl-c-game-strip-v2__team-info--home').outerHTML`
    );

    //note: in the future, we can use a getByText() + textContent method to get the text of what we need
    if (awayTeamHTML && homeTeamHTML) {
      const awayTeam = extractTeamData(awayTeamHTML);
      const homeTeam = extractTeamData(homeTeamHTML);

      // Determine which team is the Bears
      const bearsTeam = awayTeam.name?.includes("Bears")
        ? awayTeam
        : homeTeam.name?.includes("Bears")
          ? homeTeam
          : null;
      const opponentTeam = awayTeam.name?.includes("Bears")
        ? homeTeam
        : homeTeam.name?.includes("Bears")
          ? awayTeam
          : null;

      if (bearsTeam && opponentTeam) {
        console.log("\n=== Game Information ===");
        console.log(`Chicago Bears Record: ${bearsTeam.record}`);
        console.log(`Opponent: ${opponentTeam.name}`);
        console.log(`${opponentTeam.name} Record: ${opponentTeam.record}`);
        console.log(
          `Location: ${awayTeam.name?.includes("Bears") ? "Away" : "Home"}`
        );
        console.log("========================\n");
      } else {
        console.log("Could not extract all game information");
      }
    } else {
      console.log("Could not find game information elements");
    }

    resolve();
  });
});

await browser.close();
