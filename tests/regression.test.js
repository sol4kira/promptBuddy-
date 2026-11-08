import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import app from "../src/app.js";
import { chromium } from "playwright";

describe("Stage P0 Regression Tests", () => {
  let server;
  let baseUrl;
  let browser;

  async function launchBrowser() {
    try {
      return await chromium.launch({ headless: true });
    } catch {
      if (process.platform === "win32") {
        try {
          return await chromium.launch({ channel: "msedge", headless: true });
        } catch {
          return await chromium.launch({ channel: "chrome", headless: true });
        }
      }
      throw new Error("Could not launch Chromium or Edge browser");
    }
  }

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
    browser = await launchBrowser();
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ITEM 2 / Contract: API contract for /api/templates
  test("API contract: GET /api/templates returns an object with templates array", async () => {
    const res = await fetch(`${baseUrl}/api/templates`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body && typeof body === "object", "Response body should be an object");
    assert.ok(Array.isArray(body.templates), "body.templates should be an Array");
    assert.ok(body.templates.length > 0, "body.templates should not be empty");
  });

  // ITEM 3: Empty goal field validation (H1)
  test("H1: Empty goal is not generated or saved to history, displays inline error, and clears on typing", async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

      // Goal is initially empty
      const goalInput = page.locator("#goal");
      await assert.equal(await goalInput.inputValue(), "");

      // Click generate with empty goal
      await page.click("#generates");

      // Verify inline error is visible and linked
      const goalError = page.locator("#goalError");
      assert.ok(await goalError.isVisible(), "Inline error should be visible on empty goal");
      assert.equal(await goalInput.getAttribute("aria-invalid"), "true");
      assert.equal(await goalInput.getAttribute("aria-describedby"), "goalError");

      // Verify output did not change
      const outputText = await page.textContent("#output");
      assert.equal(outputText.trim(), "Your Prompt Will be here.");

      // Verify no history entry was added
      const emptyRecents = page.locator(".recent-empty-state");
      assert.ok(await emptyRecents.isVisible(), "Recent prompts should remain empty");

      // Start typing into goal
      await goalInput.type("Write an essay on photosynthesis");

      // Verify error state cleared
      assert.ok(!(await goalError.isVisible()), "Inline error should hide when typing");
      assert.equal(await goalInput.getAttribute("aria-invalid"), null);

      // Now generate with valid goal
      await page.click("#generates");
      const generatedText = await page.textContent("#output");
      assert.ok(generatedText.includes("Write an essay on photosynthesis"));

      // Verify it was saved to recents
      const recentItems = page.locator(".recent-item");
      assert.equal(await recentItems.count(), 1);
    } finally {
      await page.close();
    }
  });

  // ITEM 1: Stale prompt copy invalidation (C1)
  test("C1: Changing form via preset or inputs invalidates generated output and prevents stale copy", async () => {
    const context = await browser.newContext();
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const page = await context.newPage();

    try {
      await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

      // 1. Generate Prompt A
      await page.fill("#goal", "Original Prompt A");
      await page.click("#generates");
      const initialOutput = await page.textContent("#output");
      assert.ok(initialOutput.includes("Original Prompt A"));

      // 2. Apply a preset ("Explain")
      await page.click('button[data-preset="Explain"]');

      // Verify output area reset
      const resetOutput = await page.textContent("#output");
      assert.equal(resetOutput.trim(), "Your Prompt Will be here.");

      // 3. Attempt to copy - must show generate first toast and NOT copy Prompt A
      await page.click("#copy");
      const toastText = await page.textContent("#toast");
      assert.ok(toastText.includes("Please generate a prompt first!"));

      // Read clipboard
      const clipboardText = await page.evaluate(async () => {
        try {
          return await navigator.clipboard.readText();
        } catch {
          return null;
        }
      });
      if (clipboardText) {
        assert.ok(!clipboardText.includes("Original Prompt A"), "Clipboard should not contain stale Prompt A");
      }

      // 4. Generate Prompt B
      await page.fill("#goal", "Updated Prompt B");
      await page.click("#generates");
      const updatedOutput = await page.textContent("#output");
      assert.ok(updatedOutput.includes("Updated Prompt B"));

      // Copy Prompt B
      await page.click("#copy");
      const copiedClipboard = await page.evaluate(async () => {
        return await navigator.clipboard.readText();
      });
      assert.ok(copiedClipboard.includes("Updated Prompt B"), "Clipboard should contain Prompt B");
    } finally {
      await context.close();
    }
  });

  // ITEM 2: History page templates modal (C2)
  test("C2: History page Templates modal fetches and renders templates correctly", async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${baseUrl}/history.html`, { waitUntil: "domcontentloaded" });

      // Open templates modal from desktop nav
      await page.click("#navTemplatesBtn");

      // Wait for template cards to render
      await page.waitForSelector(".template-card");
      const cards = page.locator("#templatesGrid .template-card");
      const count = await cards.count();
      assert.equal(count, 4, "Should display 4 template cards on history page");

      // Verify error state is not displayed
      const errorState = page.locator(".templates-error-state");
      assert.equal(await errorState.count(), 0);
    } finally {
      await page.close();
    }
  });

  // ITEM 4: Templates modal focus trap, aria-modal, background inert, and 44x44 close button (H2)
  test("H2: Modal has aria-modal, traps focus, inerts background, and has >=44px close button", async () => {
    for (const url of [`${baseUrl}/`, `${baseUrl}/history.html`]) {
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Click nav templates button to open
        const navBtn = page.locator("#navTemplatesBtn");
        await navBtn.click();

        // Verify close button size in CSS >= 44x44
        const closeBtn = page.locator("#closeTemplatesModal");
        const box = await closeBtn.boundingBox();
        assert.ok(box && box.width >= 44, `Close button width on ${url} is ${box?.width}px, expected >= 44px`);
        assert.ok(box && box.height >= 44, `Close button height on ${url} is ${box?.height}px, expected >= 44px`);

        const modal = page.locator("#templatesModal");
        assert.equal(await modal.getAttribute("aria-modal"), "true", "Modal should have aria-modal=true");

        // Wait for cards
        await page.waitForSelector(".template-card");

        // Background elements should have inert
        const headerInert = await page.locator(".app-header").getAttribute("inert");
        assert.notEqual(headerInert, null, "App header should be inert while modal is open");

        // Close button should be initially focused
        await page.waitForFunction(() => {
          return document.activeElement && document.activeElement.id === "closeTemplatesModal";
        });

        // Test Shift+Tab wrapping to last template card
        await page.keyboard.down("Shift");
        await page.keyboard.press("Tab");
        await page.keyboard.up("Shift");

        const activeIsCard = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll("#templatesGrid .template-card"));
          return document.activeElement === cards[cards.length - 1];
        });
        assert.ok(activeIsCard, "Shift+Tab from first element should wrap to last template card");

        // Test Tab wrapping from last card back to close button
        await page.keyboard.press("Tab");
        const activeIsClose = await page.evaluate(() => {
          return document.activeElement && document.activeElement.id === "closeTemplatesModal";
        });
        assert.ok(activeIsClose, "Tab from last template card should wrap back to close button");

        // Test Esc closes modal and returns focus to opening trigger
        await page.keyboard.press("Escape");
        assert.ok(!(await modal.isVisible()), "Esc should close modal");

        // Header inert should be removed
        const headerInertClosed = await page.locator(".app-header").getAttribute("inert");
        assert.equal(headerInertClosed, null, "App header inert should be removed after close");

        // Focus should be restored to navTemplatesBtn
        const activeIsNav = await page.evaluate(() => {
          return document.activeElement && document.activeElement.id === "navTemplatesBtn";
        });
        assert.ok(activeIsNav, "Focus should return to trigger element after modal close");
      } finally {
        await page.close();
      }
    }
  });

  // ITEM 2 (P2 / M9): Contrast, heading, and ARIA budget test using Playwright + axe
  test("M9: Accessibility audit satisfies contrast, heading, and ARIA budgets (0 violations)", async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

      const axePath = path.resolve("node_modules/axe-core/axe.min.js");
      if (fs.existsSync(axePath)) {
        const axeSource = fs.readFileSync(axePath, "utf8");
        await page.evaluate(axeSource);

        const results = await page.evaluate(async () => {
          return await axe.run({
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa"],
            },
          });
        });

        const budgets = { contrast: 0, heading: 0, aria: 0 };

        const contrastViolations = results.violations.filter((v) => v.id.includes("color-contrast"));
        const headingViolations = results.violations.filter((v) => v.id.includes("heading") || v.id.includes("structure"));
        const ariaViolations = results.violations.filter(
          (v) =>
            v.id.includes("aria") ||
            v.id.includes("role") ||
            v.id.includes("button-name") ||
            v.id.includes("link-name") ||
            v.id.includes("listitem")
        );

        assert.equal(contrastViolations.length, budgets.contrast, `Contrast budget exceeded: found ${contrastViolations.length} violations`);
        assert.equal(headingViolations.length, budgets.heading, `Heading budget exceeded: found ${headingViolations.length} violations`);
        assert.equal(ariaViolations.length, budgets.aria, `ARIA budget exceeded: found ${ariaViolations.length} violations`);
      }

      // Playwright-native DOM budget checks for heading hierarchy and ARIA roles
      const domAudit = await page.evaluate(() => {
        const errors = { contrast: [], heading: [], aria: [] };

        // 1. Heading hierarchy check
        const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
        let maxLevelSeen = 0;
        headings.forEach((h) => {
          const level = parseInt(h.tagName.substring(1), 10);
          if (maxLevelSeen > 0 && level > maxLevelSeen + 1) {
            errors.heading.push(`Skipped heading level: from h${maxLevelSeen} to h${level}`);
          }
          maxLevelSeen = level;
          if (!h.textContent.trim()) {
            errors.heading.push(`Empty heading: <${h.tagName}> has no text`);
          }
        });

        // 2. ARIA interactive & modal checks
        const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
        buttons.forEach((b) => {
          const hasName = b.innerText.trim() || b.getAttribute("aria-label") || b.getAttribute("aria-labelledby") || b.getAttribute("title");
          if (!hasName) {
            errors.aria.push(`Button missing accessible name: ${b.outerHTML.substring(0, 50)}`);
          }
        });

        const dialog = document.querySelector(".modal-backdrop");
        if (dialog) {
          if (dialog.getAttribute("role") !== "dialog") errors.aria.push("Modal missing role='dialog'");
          if (dialog.getAttribute("aria-modal") !== "true") errors.aria.push("Modal missing aria-modal='true'");
        }

        return errors;
      });

      assert.equal(domAudit.heading.length, 0, `Heading DOM budget exceeded: ${domAudit.heading.join("; ")}`);
      assert.equal(domAudit.aria.length, 0, `ARIA DOM budget exceeded: ${domAudit.aria.join("; ")}`);
    } finally {
      await page.close();
    }
  });
});
