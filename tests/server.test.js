import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

describe("Stage D, E, F: Server Routing & UX Navigation", () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test("GET / returns 200 and index.html with Stage E New prompt button & Stage F nav", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("PromptBuddy"));
    assert.ok(text.includes('src="/script.js"'));

    // Stage E: New prompt button
    assert.ok(text.includes('id="newPromptBtn"'));
    assert.ok(text.includes("New prompt"));

    // Stage F: Desktop nav on /
    assert.ok(text.includes('href="/" class="brand-logo"'));
    assert.ok(text.includes('href="/" class="nav-item" aria-current="page" id="navGenerateLink">Generate</a>'));
    assert.ok(text.includes('id="navTemplatesBtn">Templates</button>'));
    assert.ok(text.includes('href="/history.html" class="nav-item" id="navHistoryLink">History</a>'));
    assert.ok(!text.includes('id="navHomeLink"'));

    // Stage F: Mobile bottom bar on /
    assert.ok(text.includes('id="mobileGenerateTab" aria-current="page"'));
    assert.ok(text.includes('id="mobileTemplatesTab"'));
    assert.ok(text.includes('id="mobileHistoryTab"'));
    assert.ok(!text.includes('id="mobileHomeTab"'));
    assert.ok(!text.includes('id="mobileSavedTab"'));
  });

  test("GET /history.html returns 200 and history.html with Stage F nav & History naming", async () => {
    const res = await fetch(`${baseUrl}/history.html`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("<title>Prompt History - PromptBuddy</title>"));
    assert.ok(text.includes('class="history-title">Prompt History</h1>'));
    assert.ok(text.includes('src="/js/history.js"'));

    // Stage F: Desktop nav on /history.html
    assert.ok(text.includes('href="/" class="brand-logo"'));
    assert.ok(text.includes('href="/" class="nav-item" id="navGenerateLink">Generate</a>'));
    assert.ok(text.includes('id="navTemplatesBtn">Templates</button>'));
    assert.ok(text.includes('href="/history.html" class="nav-item" aria-current="page" id="navHistoryLink">History</a>'));

    // Stage F: Mobile bottom bar on /history.html
    assert.ok(text.includes('id="mobileGenerateTab"'));
    assert.ok(text.includes('id="mobileTemplatesTab"'));
    assert.ok(text.includes('id="mobileHistoryTab" aria-current="page"'));

    // Stage F: Templates modal present on history.html
    assert.ok(text.includes('id="templatesModal"'));
  });

  test("GET /favicon.svg returns 200", async () => {
    const res = await fetch(`${baseUrl}/favicon.svg`);
    assert.equal(res.status, 200);
  });

  test("GET /nonexistent returns 404 with 404.html", async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    assert.equal(res.status, 404);
    const text = await res.text();
    assert.ok(text.includes("404 ERROR") || text.includes("Page Not Found"));
  });
});
