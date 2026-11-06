import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

describe("Stage D: Server Static Routing", () => {
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

  test("GET / returns 200 and index.html", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("PromptBuddy"));
    assert.ok(text.includes('src="/script.js"'));
  });

  test("GET /history.html returns 200 and history.html", async () => {
    const res = await fetch(`${baseUrl}/history.html`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("Saved Prompts"));
    assert.ok(text.includes('src="/js/history.js"'));
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
