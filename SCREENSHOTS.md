# Screenshots with the Agent

## The Problem

Screenshots are **too large** to be included in tool responses. When the agent calls the `screenshot` tool and receives a base64-encoded image back, it exceeds the context window and causes this error:

```
400 Your input exceeds the context window of this model
```

## The Solution

**DO NOT have the agent take screenshots via tools for visual analysis.**

Instead, use one of these approaches:

### Approach 1: HTML Analysis (Recommended)

The agent should use HTML content instead of screenshots:

```typescript
const agent = new Agent({ page });

await agent.run(
  `Navigate to https://example.com
   Use get_content() to see the HTML structure.
   Find the main heading and any links.`
);
```

**Tools the agent should use:**
- `get_content()` - Get full HTML to analyze structure
- `evaluate()` - Execute JavaScript to extract specific data
- `click()`, `type()`, `press()` - Interact with elements using CSS selectors

### Approach 2: Save Screenshots to Disk

If you need to save screenshots for later analysis:

```typescript
await agent.run(
  `Navigate to https://example.com
   Save a screenshot to ./screenshots/example.png`
);
```

The `screenshot` tool will save the image to disk, but won't return it to the agent.

### Approach 3: User-Provided Screenshots (Future)

In the future, users can provide screenshots when calling the agent:

```typescript
// This would allow passing a screenshot to the agent
// But it must be done at call-time, not via tools
await agent.run(
  "Analyze this page and tell me what you see",
  {
    includeScreenshot: true  // Takes screenshot and includes it in the prompt
  }
);
```

## Why This Happens

1. **Screenshots are large**: Even compressed JPEGs can be 50-200KB
2. **Base64 encoding increases size**: ~33% larger than binary
3. **Token limits**: Images use many tokens in the context window
4. **Tool responses are in context**: When a tool returns data, it stays in the conversation history

## Best Practices

### ✅ DO:
- Use `get_content()` to analyze HTML
- Use `evaluate()` to extract data
- Save screenshots to disk when needed
- Use CSS selectors to interact with elements

### ❌ DON'T:
- Have the agent take screenshots for visual analysis
- Return large base64 data in tool responses
- Expect the agent to "see" screenshots taken via tools

## Example: Correct Usage

```typescript
import { Browser, Agent } from 'cdp-browser-framework';

const browser = new Browser();
await browser.launch();
const page = await browser.newPage();

const agent = new Agent({ page });

// ✅ Correct: Use HTML analysis
const result = await agent.run(
  `Navigate to https://github.com/trending
   Get the page content.
   Extract the top 5 trending repository names.`
);

console.log(result.finalOutput);

await browser.close();
```

## Summary

- **Screenshots via tools = ❌** (causes context window errors)
- **HTML analysis via tools = ✅** (efficient and works great)
- **Save screenshots to disk = ✅** (for external use)
- **Future: Screenshot in agent.run() = ✅** (when implemented correctly)
