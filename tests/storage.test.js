import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  OLD_STORAGE_KEY,
  MAX_HISTORY_ENTRIES,
  generateId,
  createKey,
  createEntry,
  migrateOldEntries,
  loadHistory,
  saveHistory,
  resetStorageErrorToastState,
} from "../public/js/storage.js";

// Mock localStorage implementation for Node test environment
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
    get _store() {
      return store;
    },
  };
}

describe("Stage A: Storage & Entry Shape", () => {
  test("createKey produces normalized identical fingerprints", () => {
    const key1 = createKey({
      goal: "  Build a website  ",
      context: "React, Vite\n",
      style: "DETAIL",
      audience: "Beginner ",
      length: "Short",
    });

    const key2 = createKey({
      goal: "build a website",
      context: "react, vite",
      style: "detail",
      audience: "beginner",
      length: "short",
    });

    assert.equal(key1, key2);
    assert.ok(key1.includes("build a website"));
  });

  test("createEntry produces the exact required shape with timestamps and id", () => {
    const entry = createEntry({
      goal: "Write a test",
      context: "Node.js",
      style: "concise",
      audience: "intermid", // check typo fix
      length: "short",
    });

    assert.ok(typeof entry.id === "string" && entry.id.length > 0);
    assert.ok(typeof entry.key === "string" && entry.key.length > 0);
    assert.equal(entry.goal, "Write a test");
    assert.equal(entry.context, "Node.js");
    assert.equal(entry.style, "concise");
    assert.equal(entry.audience, "intermediate"); // mapped from intermid
    assert.equal(entry.length, "short");
    assert.ok(typeof entry.createdAt === "number" && entry.createdAt > 0);
    assert.ok(typeof entry.lastUsedAt === "number" && entry.lastUsedAt > 0);
  });

  test("migrateOldEntries migrates old shape, fixes 'intermid', spreads timestamps 1s apart", () => {
    const oldEntries = [
      { goal: "First", audience: "intermid", style: "concise", length: "short" },
      { goal: "Second", audience: "advanced", style: "detail", length: "long" },
      { goal: "Third", audience: "beginner", style: "example", length: "medium" },
    ];

    const fixedNow = 1700000000000;
    const migrated = migrateOldEntries(oldEntries, fixedNow);

    assert.equal(migrated.length, 3);
    assert.equal(migrated[0].goal, "First");
    assert.equal(migrated[0].audience, "intermediate");
    assert.equal(migrated[0].createdAt, fixedNow);
    assert.equal(migrated[0].lastUsedAt, fixedNow);

    // Second entry is 1000ms earlier
    assert.equal(migrated[1].createdAt, fixedNow - 1000);
    assert.equal(migrated[1].lastUsedAt, fixedNow - 1000);

    // Third entry is 2000ms earlier
    assert.equal(migrated[2].createdAt, fixedNow - 2000);
    assert.equal(migrated[2].lastUsedAt, fixedNow - 2000);

    // Preserves order: index 0 (newest) > index 1 > index 2
    assert.ok(migrated[0].lastUsedAt > migrated[1].lastUsedAt);
    assert.ok(migrated[1].lastUsedAt > migrated[2].lastUsedAt);
  });

  test("loadHistory performs migration on first load and leaves old key untouched", () => {
    const oldData = [
      { goal: "Old prompt 1", audience: "intermid" },
      { goal: "Old prompt 2", audience: "expert" },
    ];
    const mockStorage = createMockStorage({
      [OLD_STORAGE_KEY]: JSON.stringify(oldData),
    });

    // Ensure v2 does not exist yet
    assert.equal(mockStorage.getItem(STORAGE_KEY), null);

    const loaded = loadHistory(mockStorage);

    // Migrated data returned
    assert.equal(loaded.length, 2);
    assert.equal(loaded[0].goal, "Old prompt 1");
    assert.equal(loaded[0].audience, "intermediate");

    // v2 key now written in storage
    assert.ok(mockStorage.getItem(STORAGE_KEY) !== null);

    // Old key is UNTOUCHED
    assert.equal(mockStorage.getItem(OLD_STORAGE_KEY), JSON.stringify(oldData));
  });

  test("saveHistory caps storage at 200 entries and drops least recent", () => {
    const mockStorage = createMockStorage();
    const manyEntries = [];

    // Create 250 entries, where index 0 is newest (timestamp 250) down to index 249 (timestamp 1)
    for (let i = 0; i < 250; i++) {
      manyEntries.push(
        createEntry({
          goal: `Prompt #${i}`,
          createdAt: 250 - i,
          lastUsedAt: 250 - i,
        })
      );
    }

    assert.equal(manyEntries.length, 250);

    saveHistory(manyEntries, mockStorage);

    const savedRaw = mockStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(savedRaw);

    assert.equal(parsed.length, MAX_HISTORY_ENTRIES);
    // index 0 is kept
    assert.equal(parsed[0].goal, "Prompt #0");
    // index 199 is the 200th item kept
    assert.equal(parsed[199].goal, "Prompt #199");
    // items from 200 onwards were dropped (least recently used)
    const has200 = parsed.some((item) => item.goal === "Prompt #200");
    assert.equal(has200, false);
  });

  test("handles storage throwing an error safely without crashing", () => {
    const brokenStorage = {
      getItem() {
        throw new Error("QuotaExceeded or SecurityError in private browsing");
      },
      setItem() {
        throw new Error("QuotaExceeded");
      },
    };

    const loaded = loadHistory(brokenStorage);
    assert.deepEqual(loaded, []);

    const saved = saveHistory([{ goal: "test" }], brokenStorage);
    assert.equal(saved, false);
  });

  test("shows a one-time toast when saving to storage fails", () => {
    resetStorageErrorToastState();
    let toastShownCount = 0;
    const mockToast = {
      classList: {
        add(cls) {
          if (cls === "show") toastShownCount++;
        },
        remove() {},
      },
      textContent: "",
    };

    globalThis.document = {
      getElementById(id) {
        return id === "toast" ? mockToast : null;
      },
    };

    try {
      const failingStorage = {
        setItem() {
          throw new Error("QuotaExceeded");
        },
      };

      const firstResult = saveHistory([{ goal: "1" }], failingStorage);
      assert.equal(firstResult, false);
      assert.equal(toastShownCount, 1);
      assert.equal(mockToast.textContent, "Could not save history to local storage");

      // Second failure should NOT trigger another toast (one-time)
      const secondResult = saveHistory([{ goal: "2" }], failingStorage);
      assert.equal(secondResult, false);
      assert.equal(toastShownCount, 1);
    } finally {
      delete globalThis.document;
      resetStorageErrorToastState();
    }
  });
});
