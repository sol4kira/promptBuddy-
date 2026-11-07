import { LRUCache } from "./lru.js";
import { Trie, tokenize } from "./trie.js";
import {
  createEntry,
  createKey,
  loadHistory,
  saveHistory,
  MAX_HISTORY_ENTRIES,
} from "./storage.js";

export const LRU_CAPACITY = 10;

function getEntryText(entry) {
  return `${entry.goal || ""} ${entry.context || ""}`;
}

// Central history store managing persistence, an LRU cache (recent 10), and a prefix trie (all entries) for search.
export class HistoryStore {
  constructor(storage = typeof localStorage !== "undefined" ? localStorage : null) {
    this.storage = storage;

    // Full list of entries (at most 200 items), ordered newest-first by lastUsedAt.
    // This is the single source of truth for the application.
    this.entries = [];

    // Map of id -> Entry for O(1) instant lookup by unique ID.
    this.idMap = new Map();

    // WHY THE LRU CACHE HOLDS ONLY 10 ITEMS:
    // The LRU cache powers the quick "Your Recent Prompts" widget on the sidebar and home view,
    // which only displays 5-10 recent prompts. Keeping capacity at 10 guarantees O(1) recency tracking
    // and automatic eviction of older items from the recents list without unnecessary memory overhead.
    this.lru = new LRUCache(LRU_CAPACITY);

    // WHY THE TRIE INDEXES ALL ENTRIES:
    // The Trie powers global search on the History ("Saved") page. When a user searches for a keyword,
    // they need to find matching prompts across their entire history (all 200 entries), not just the 10
    // most recent ones. Therefore, every entry's goal words are indexed in the Trie.
    this.trie = new Trie();

    // Initialize from storage
    this._initFromStorage();
  }

  // Rebuilds in-memory data structures from persistent storage on startup. Big-O: O(N * T) where N <= 200, T = words per prompt.
  _initFromStorage() {
    this.entries = loadHistory(this.storage) || [];

    // Ensure sorted newest-first by lastUsedAt descending
    this.entries.sort((a, b) => b.lastUsedAt - a.lastUsedAt);

    this.idMap.clear();
    this.trie.clear();

    // 1. Rebuild the idMap and index all entries in the Trie
    for (const entry of this.entries) {
      this.idMap.set(entry.id, entry);
      const tokens = tokenize(getEntryText(entry));
      for (const token of tokens) {
        this.trie.insert(token, entry.id);
      }
    }

    // 2. Rebuild the LRU cache with the 10 most recent entries.
    // Insert from oldest (index 9) to newest (index 0) so the newest ends up at the head of the LRU.
    this._rebuildLRU();
  }

  // Helper that re-populates the LRU cache with the up to 10 most recent entries. Big-O: O(1) (capped at 10).
  _rebuildLRU() {
    this.lru = new LRUCache(LRU_CAPACITY);
    const top10 = this.entries.slice(0, LRU_CAPACITY);
    for (let i = top10.length - 1; i >= 0; i--) {
      this.lru.put(top10[i].key, top10[i]);
    }
  }

  // Adds a prompt or updates recency of an existing one, updating LRU, Trie, and storage. Big-O: O(K + G + N).
  add(fields) {
    const key = createKey(fields);
    const existingIndex = this.entries.findIndex((e) => e.key === key);

    let entry;
    if (existingIndex !== -1) {
      // Prompt already exists: update lastUsedAt and move to front (replaces duplicate)
      entry = this.entries[existingIndex];
      entry.lastUsedAt = Date.now();

      // Splice out and move to front of entries list
      this.entries.splice(existingIndex, 1);
      this.entries.unshift(entry);

      // Refresh in LRU cache (moves node to head)
      this.lru.put(entry.key, entry);
    } else {
      // New prompt: create entry with unique ID and timestamps
      entry = createEntry({ ...fields, key });

      // Add to front of source-of-truth list and idMap
      this.entries.unshift(entry);
      this.idMap.set(entry.id, entry);

      // Add to LRU cache (evicts least recent if over 10)
      this.lru.put(entry.key, entry);

      // Index tokens in Trie
      const tokens = tokenize(getEntryText(entry));
      for (const token of tokens) {
        this.trie.insert(token, entry.id);
      }

      // Enforce the 200-entry global cap:
      // If capacity is exceeded, evict the oldest entry from the tail and remove its tokens from the Trie.
      if (this.entries.length > MAX_HISTORY_ENTRIES) {
        const evicted = this.entries.pop();
        this.idMap.delete(evicted.id);
        this.lru.delete(evicted.key);

        const evictedTokens = tokenize(getEntryText(evicted));
        for (const token of evictedTokens) {
          this.trie.remove(token, evicted.id);
        }
      }
    }

    saveHistory(this.entries, this.storage);
    return entry;
  }

  // Removes an entry by ID from the list, idMap, LRU, Trie, and storage. Big-O: O(N + G).
  remove(id) {
    const entry = this.idMap.get(id);
    if (!entry) return false;

    // Remove from idMap
    this.idMap.delete(id);

    // Remove from entries list
    const index = this.entries.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.entries.splice(index, 1);
    }

    // Remove from LRU and synchronize with remaining entries
    this.lru.delete(entry.key);
    this._rebuildLRU();

    // Remove words from Trie
    const tokens = tokenize(getEntryText(entry));
    for (const token of tokens) {
      this.trie.remove(token, id);
    }

    // Persist changes
    saveHistory(this.entries, this.storage);
    return true;
  }

  // Clears all history entries from memory, LRU, Trie, and storage. Big-O: O(1).
  clear() {
    this.entries = [];
    this.idMap.clear();
    this.lru = new LRUCache(LRU_CAPACITY);
    this.trie.clear();
    saveHistory([], this.storage);
  }

  // Returns the n most recent entries from the LRU cache, newest first. Big-O: O(min(n, 10)).
  recent(n = 5) {
    return this.lru.values().slice(0, n);
  }

  // Returns all history entries sorted by lastUsedAt, newest first. Big-O: O(N).
  all() {
    return [...this.entries];
  }

  // Searches entries whose goal words match all query tokens using prefix search and Set intersection (AND). Big-O: O(Q + T_match + R log R).
  search(query) {
    if (!query || typeof query !== "string" || query.trim() === "") {
      return this.all();
    }

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) {
      return this.all();
    }

    let matchingIds = null;

    // For each token in the search query, query the Trie and intersect candidate ID Sets
    for (const token of queryTokens) {
      const idsForToken = this.trie.searchPrefix(token);
      if (idsForToken.size === 0) {
        // Any token having zero matches means the AND intersection is empty
        return [];
      }

      if (matchingIds === null) {
        matchingIds = new Set(idsForToken);
      } else {
        for (const id of matchingIds) {
          if (!idsForToken.has(id)) {
            matchingIds.delete(id);
          }
        }
        if (matchingIds.size === 0) {
          return [];
        }
      }
    }

    if (!matchingIds || matchingIds.size === 0) {
      return [];
    }

    // Map matched IDs back to full entry objects
    const results = [];
    for (const id of matchingIds) {
      const entry = this.idMap.get(id);
      if (entry) {
        results.push(entry);
      }
    }

    // Sort matching entries newest-used first
    results.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    return results;
  }
}
