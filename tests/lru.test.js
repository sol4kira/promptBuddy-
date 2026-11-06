import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LRUCache, Node } from "../public/js/lru.js";

describe("Stage B: LRUCache", () => {
  test("Node stores key, value, and null pointers initially", () => {
    const node = new Node("k", "v");
    assert.equal(node.key, "k");
    assert.equal(node.value, "v");
    assert.equal(node.prev, null);
    assert.equal(node.next, null);
  });

  test("LRU capacity 3 full lifecycle as specified", () => {
    const cache = new LRUCache(3);

    // Initial state
    assert.equal(cache.size, 0);
    assert.deepEqual(cache.keys(), []);
    assert.deepEqual(cache.values(), []);

    // Step 1: put 1, put 2, put 3
    const ev1 = cache.put(1, "one");
    assert.equal(ev1, undefined);
    assert.deepEqual(cache.keys(), [1]);
    assert.deepEqual(cache.values(), ["one"]);

    const ev2 = cache.put(2, "two");
    assert.equal(ev2, undefined);
    assert.deepEqual(cache.keys(), [2, 1]);
    assert.deepEqual(cache.values(), ["two", "one"]);

    const ev3 = cache.put(3, "three");
    assert.equal(ev3, undefined);
    assert.deepEqual(cache.keys(), [3, 2, 1]);
    assert.deepEqual(cache.values(), ["three", "two", "one"]);
    assert.equal(cache.size, 3);

    // Step 2: put 2 again with a new value (update in the middle)
    const evUpdate = cache.put(2, "two-updated");
    assert.equal(evUpdate, undefined); // no eviction
    assert.equal(cache.get(2), "two-updated");
    // 2 should now be at the head (newest)
    assert.deepEqual(cache.keys(), [2, 3, 1]);

    // Step 3: get 1 -> moves 1 to head
    const val1 = cache.get(1);
    assert.equal(val1, "one");
    assert.deepEqual(cache.keys(), [1, 2, 3]);

    // Step 4: put 4 -> cache is full, so tail (3) must be evicted and returned
    const evicted = cache.put(4, "four");
    assert.equal(evicted, "three");
    // New order: 4 (newest), then 1, then 2
    assert.deepEqual(cache.keys(), [4, 1, 2]);
    assert.equal(cache.size, 3);

    // Step 5: get 3 returns undefined
    assert.equal(cache.get(3), undefined);
    // Keys order remains unchanged after a miss
    assert.deepEqual(cache.keys(), [4, 1, 2]);

    // Step 6: get of a missing key returns undefined
    assert.equal(cache.get(999), undefined);
  });

  test("has(key) checks presence without altering recency order", () => {
    const cache = new LRUCache(3);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3);
    assert.deepEqual(cache.keys(), ["c", "b", "a"]);

    // Checking "a" with has() must NOT move "a" to head
    assert.equal(cache.has("a"), true);
    assert.equal(cache.has("nonexistent"), false);
    assert.deepEqual(cache.keys(), ["c", "b", "a"]);
  });

  test("deleting the head-most, tail-most, and middle node", () => {
    const cache = new LRUCache(3);
    cache.put("x", 10);
    cache.put("y", 20);
    cache.put("z", 30);
    // Order: ["z", "y", "x"] (head is "z", middle is "y", tail is "x")
    assert.deepEqual(cache.keys(), ["z", "y", "x"]);

    // Delete middle node "y"
    const delMiddle = cache.delete("y");
    assert.equal(delMiddle, true);
    assert.equal(cache.size, 2);
    assert.deepEqual(cache.keys(), ["z", "x"]);
    assert.equal(cache.get("y"), undefined);

    // Delete head-most node "z"
    const delHead = cache.delete("z");
    assert.equal(delHead, true);
    assert.equal(cache.size, 1);
    assert.deepEqual(cache.keys(), ["x"]);

    // Delete tail-most (and only) node "x"
    const delTail = cache.delete("x");
    assert.equal(delTail, true);
    assert.equal(cache.size, 0);
    assert.deepEqual(cache.keys(), []);

    // Deleting a key not in cache returns false
    assert.equal(cache.delete("x"), false);
  });
});
