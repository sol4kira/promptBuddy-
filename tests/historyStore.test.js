import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { HistoryStore } from "../public/js/historyStore.js";
import { STORAGE_KEY } from "../public/js/storage.js";

// Helper creating an in-memory mock storage
function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe("Stage C: HistoryStore", () => {
  test("add creates entries, indexes in LRU & Trie, and avoids duplicates", () => {
    const storage = createMockStorage();
    const store = new HistoryStore(storage);

    // 1. Add first entry
    const e1 = store.add({
      goal: "Explain quantum computing",
      context: "Physics",
      style: "detail",
      audience: "beginner",
      length: "short",
    });

    assert.equal(store.all().length, 1);
    assert.equal(store.recent(5).length, 1);
    assert.equal(store.recent(5)[0].goal, "Explain quantum computing");

    // Check trie indexing
    const searchQuantum = store.search("quantum");
    assert.equal(searchQuantum.length, 1);
    assert.equal(searchQuantum[0].id, e1.id);

    // 2. Add second entry
    const e2 = store.add({
      goal: "Write JavaScript code for sorting",
      context: "",
      style: "example",
      audience: "intermediate",
      length: "medium",
    });

    assert.equal(store.all().length, 2);
    // e2 was added most recently, so recent() should have e2 first, then e1
    assert.equal(store.recent(5)[0].id, e2.id);
    assert.equal(store.recent(5)[1].id, e1.id);

    // 3. Add identical to e1 (duplicate check)
    const e1Duplicate = store.add({
      goal: "Explain quantum computing",
      context: "Physics",
      style: "detail",
      audience: "beginner",
      length: "short",
    });

    // Length should STILL be 2 (not duplicated)
    assert.equal(store.all().length, 2);
    // Should have updated existing entry
    assert.equal(e1Duplicate.id, e1.id);
    // e1 should now be at the FRONT because it was re-used
    assert.equal(store.recent(5)[0].id, e1.id);
    assert.equal(store.recent(5)[1].id, e2.id);
  });

  test("recent(n) returns at most 10 from LRU, newest first", () => {
    const storage = createMockStorage();
    const store = new HistoryStore(storage);

    // Add 12 distinct prompts
    for (let i = 1; i <= 12; i++) {
      store.add({
        goal: `Prompt number ${i}`,
        style: "concise",
      });
    }

    assert.equal(store.all().length, 12);

    // LRU capacity is 10, so recent() can never return more than 10
    const recentsAll = store.recent(20);
    assert.equal(recentsAll.length, 10);

    // Newest prompt (12) must be first
    assert.equal(recentsAll[0].goal, "Prompt number 12");
    // Oldest prompt still in LRU is 3 (1 and 2 were evicted from the 10-item recents cache)
    assert.equal(recentsAll[9].goal, "Prompt number 3");

    // recent(5) returns top 5
    assert.equal(store.recent(5).length, 5);
    assert.equal(store.recent(5)[0].goal, "Prompt number 12");
  });

  test("search performs prefix matching and AND intersections", () => {
    const storage = createMockStorage();
    const store = new HistoryStore(storage);

    store.add({ goal: "Explain recursion in Python", style: "detail" });
    store.add({ goal: "Explain quantum physics", style: "detail" });
    store.add({ goal: "Write clean Python code", style: "example" });

    // Empty query returns all 3
    assert.equal(store.search("").length, 3);
    assert.equal(store.search("   ").length, 3);

    // Prefix search "exp" should match both "Explain..." prompts
    const expMatches = store.search("exp");
    assert.equal(expMatches.length, 2);
    assert.ok(expMatches.some((e) => e.goal === "Explain recursion in Python"));
    assert.ok(expMatches.some((e) => e.goal === "Explain quantum physics"));

    // Multi-token AND search: "exp py" should only match "Explain recursion in Python"
    const expPyMatches = store.search("exp py");
    assert.equal(expPyMatches.length, 1);
    assert.equal(expPyMatches[0].goal, "Explain recursion in Python");

    // Token matching nothing returns empty array
    assert.equal(store.search("nonexistent").length, 0);
    assert.equal(store.search("python nonexistent").length, 0);
  });

  test("remove(id) cleans up from entries, idMap, LRU, Trie, and storage", () => {
    const storage = createMockStorage();
    const store = new HistoryStore(storage);

    const entry1 = store.add({ goal: "First unique keyword xylophone", style: "concise" });
    const entry2 = store.add({ goal: "Second unique keyword zither", style: "detail" });

    assert.equal(store.search("xylophone").length, 1);

    // Remove entry 1
    const removed = store.remove(entry1.id);
    assert.equal(removed, true);
    assert.equal(store.all().length, 1);
    assert.equal(store.recent(5).length, 1);

    // Trie must no longer return entry1 for "xylophone"
    assert.equal(store.search("xylophone").length, 0);
    // Entry 2 is still found
    assert.equal(store.search("zither").length, 1);

    // Storage should also reflect the deletion
    const rawStorage = storage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(rawStorage);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].id, entry2.id);

    // Removing nonexistent ID returns false
    assert.equal(store.remove("invalid-id"), false);
  });

  test("clear resets memory, LRU, Trie, and storage", () => {
    const storage = createMockStorage();
    const store = new HistoryStore(storage);

    store.add({ goal: "Prompt one", style: "concise" });
    store.add({ goal: "Prompt two", style: "detail" });
    assert.equal(store.all().length, 2);

    store.clear();

    assert.equal(store.all().length, 0);
    assert.equal(store.recent(5).length, 0);
    assert.equal(store.search("prompt").length, 0);

    const rawStorage = storage.getItem(STORAGE_KEY);
    assert.equal(rawStorage, "[]");
  });

  test("rebuilds Trie and LRU correctly on startup from existing storage", () => {
    const storage = createMockStorage();

    // 1. First store instance creates data
    const store1 = new HistoryStore(storage);
    store1.add({ goal: "Alpha testing", style: "concise" });
    store1.add({ goal: "Beta testing", style: "detail" });
    store1.add({ goal: "Gamma testing", style: "example" });

    // 2. Second store instance initializes from the same storage
    const store2 = new HistoryStore(storage);

    assert.equal(store2.all().length, 3);
    assert.equal(store2.recent(5).length, 3);
    assert.equal(store2.recent(5)[0].goal, "Gamma testing");

    // Trie is rebuilt and works immediately
    const betaMatches = store2.search("beta");
    assert.equal(betaMatches.length, 1);
    assert.equal(betaMatches[0].goal, "Beta testing");

    const testingMatches = store2.search("testing");
    assert.equal(testingMatches.length, 3);
  });

  test("capping at 200 entries evicts oldest from entries and removes from Trie", () => {
    const storage = createMockStorage();
    const store = new HistoryStore(storage);

    // Add first entry with a unique word to verify eviction from Trie
    store.add({ goal: "FirstEntry uniqueEvictMeToken", style: "concise" });

    // Add 200 more entries to exceed the 200 cap (total = 201)
    for (let i = 1; i <= 200; i++) {
      store.add({
        goal: `GoalItem_${i} otherWord_${i}`,
        style: "concise",
      });
    }

    // Total must be capped at 200
    assert.equal(store.all().length, 200);

    // The first entry was the least recently used, so it was evicted from entries and the Trie
    assert.equal(store.search("uniqueEvictMeToken").length, 0);
    // Recent entry is present
    assert.equal(store.search("otherWord_200").length, 1);
  });
});
