/**
 * Larry Birdle Example - Basketball Player Guessing Game
 *
 * Larry Birdle is a Wordle-like game where you guess NBA players.
 * The agent will strategically guess players and use the color-coded
 * feedback to narrow down the correct answer.
 */

import { Browser, Agent } from "../src/index.js";

async function main() {
  //make a new browser
  const browser = new Browser();
  await browser.launch();
  const agent = new Agent({ model: "gpt-5-mini", browser });

  console.log("=".repeat(70));
  console.log("🏀 LARRY BIRDLE - NBA PLAYER GUESSING GAME");
  console.log("=".repeat(70));

  const result = await agent.run(
    `Play Larry Birdle at https://larrybirdle.com/

GAME RULES:
- This is like Wordle but for NFL players
- You have 8 guesses to identify the mystery NFL player
- After each guess, you get color-coded clues:
  * GREEN = Exact match (correct attribute)
  * YELLOW = Close/Partial match (e.g., similar age, conference, position)
  * GRAY/RED = Wrong (doesn't match)

STRATEGY:
1. Navigate to https://larrybirdle.com, just wait for DOMContentLoaded
2. Click on the Play button and scroll to the input field
3. Examine the page structure using get_content() to find:
   - The player search input field
   - The guess submission mechanism
   - The results/feedback area

4. FIRST GUESS - Use a well-known current player to get baseline info:
   - Type "LeBron James" (covers many attributes)
   - Submit the guess
   - Wait 1 second for results
   - Use evaluate() to read the color-coded feedback

5. ANALYZE FEEDBACK:
   - Read all the colored squares/indicators
   - Note which attributes are:
     * GREEN (exact match)
     * YELLOW (close)
     * GRAY/RED (wrong)
   - Use WebSearchTool to search for more information if needed.


10. WINNING:
    - When you guess correctly, all attributes will be GREEN
    - The game will show a success message
    - Report your winning player and number of guesses

EXECUTION PLAN:
- Guess 1: LeBron James (baseline)
- Analyze feedback carefully
- Use evaluate() to check game state after each guess
- Report progress after each attempt

IMPORTANT:
- Wait 1-2 seconds between guesses for page updates
- Use evaluate() to read the feedback colors accurately
- Think strategically - each guess should narrow down possibilities

Report your thought process and what clues you're using for each guess.`,
    { maxTurns: 75 } // Allow plenty of turns for 8 guesses + analysis
  );

  console.log("\n" + "=".repeat(70));
  console.log("GAME RESULTS:");
  console.log("=".repeat(70));
  console.log(result.finalOutput);

  // Keep browser open to see final result
  console.log(
    "\n💡 Browser will stay open for 10 seconds so you can see the result..."
  );
  await new Promise((resolve) => setTimeout(resolve, 10000));

  await agent.getBrowser().close();
  console.log("\n✅ Larry Birdle session complete!");
}

main().catch(console.error);
