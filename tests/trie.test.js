import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Trie, tokenize } from "../public/js/trie.js";

describe("Stage B: tokenize helper", () => {
  test("lowercases, splits on non-alphanumeric, drops <2 chars, and deduplicates", () => {
    const text = "Explain, EXPLAIN! A quick 100-word summary of JavaScript & C++ code.";
    const tokens = tokenize(text);

    // "explain" appears twice with different casing and punctuation -> deduplicated to 1
    // "a" has length 1 -> dropped
    // "100", "word", "summary", "of", "javascript", "code" are >= 2
    assert.deepEqual(tokens, [
      "explain",
      "quick",
      "100",
      "word",
      "summary",
      "of",
      "javascript",
      "code",
    ]);
  });

  test("handles empty string, null, or undefined gracefully", () => {
    assert.deepEqual(tokenize(""), []);
    assert.deepEqual(tokenize(null), []);
    assert.deepEqual(tokenize(undefined), []);
  });
});

describe("Stage B: Trie", () => {
  test("insert car, card, care, cat and search prefixes", () => {
    const trie = new Trie();

    trie.insert("car", "id-car");
    trie.insert("card", "id-card");
    trie.insert("care", "id-care");
    trie.insert("cat", "id-cat");

    // Prefix "car" matches "car", "card", "care" -> 3 ids
    const carMatch = trie.searchPrefix("car");
    assert.equal(carMatch.size, 3);
    assert.ok(carMatch.has("id-car"));
    assert.ok(carMatch.has("id-card"));
    assert.ok(carMatch.has("id-care"));
    assert.ok(!carMatch.has("id-cat"));

    // Prefix "ca" matches all 4
    const caMatch = trie.searchPrefix("ca");
    assert.equal(caMatch.size, 4);
    assert.ok(caMatch.has("id-car"));
    assert.ok(caMatch.has("id-card"));
    assert.ok(caMatch.has("id-care"));
    assert.ok(caMatch.has("id-cat"));

    // Prefix "z" returns none (empty set)
    const zMatch = trie.searchPrefix("z");
    assert.equal(zMatch.size, 0);

    // Case-insensitive query "CAR" works same as "car"
    const upperCarMatch = trie.searchPrefix("CAR");
    assert.equal(upperCarMatch.size, 3);
    assert.ok(upperCarMatch.has("id-car"));
    assert.ok(upperCarMatch.has("id-card"));
    assert.ok(upperCarMatch.has("id-care"));

    // Empty prefix returns empty set (not all entries)
    const emptyMatch = trie.searchPrefix("");
    assert.equal(emptyMatch.size, 0);
  });

  test("a word with two ids returns both, and removing one id returns the other", () => {
    const trie = new Trie();

    // Two prompts sharing the word "summary"
    trie.insert("summary", "prompt-1");
    trie.insert("summary", "prompt-2");

    const both = trie.searchPrefix("summary");
    assert.equal(both.size, 2);
    assert.ok(both.has("prompt-1"));
    assert.ok(both.has("prompt-2"));

    // Remove one id
    const removed1 = trie.remove("summary", "prompt-1");
    assert.equal(removed1, true);

    // Now only prompt-2 remains
    const remaining = trie.searchPrefix("summary");
    assert.equal(remaining.size, 1);
    assert.ok(remaining.has("prompt-2"));
    assert.ok(!remaining.has("prompt-1"));

    // Remove the remaining id -> word no longer matches
    const removed2 = trie.remove("summary", "prompt-2");
    assert.equal(removed2, true);
    assert.equal(trie.searchPrefix("summary").size, 0);

    // Removing nonexistent word or id returns false
    assert.equal(trie.remove("summary", "prompt-2"), false);
    assert.equal(trie.remove("unknown", "any-id"), false);
  });

  test("clear() empties the trie", () => {
    const trie = new Trie();
    trie.insert("algorithm", "id-algo");
    assert.equal(trie.searchPrefix("algo").size, 1);

    trie.clear();
    assert.equal(trie.searchPrefix("algo").size, 0);
  });
});
