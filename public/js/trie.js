// Pure tokenizing helper that lowercases, splits on non-alphanumeric chars, drops tokens < 2 chars, and deduplicates. Big-O: O(N).
export function tokenize(text) {
  if (!text || typeof text !== "string") return [];
  const rawTokens = text.toLowerCase().split(/[^a-z0-9]+/);
  const unique = new Set();
  for (const token of rawTokens) {
    if (token.length >= 2) {
      unique.add(token);
    }
  }
  return Array.from(unique);
}

// Node in a prefix tree storing child character mappings and entry IDs for complete words.
export class TrieNode {
  constructor() {
    this.children = new Map(); // letter -> TrieNode
    this.isEnd = false;        // true if a stored word finishes here
    this.entryIds = new Set(); // Set of entry IDs containing this word
  }
}

// Prefix tree (Trie) indexing words and mapping them to sets of history entry IDs.
export class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  // Inserts a word and associates it with an entry ID at the terminal node. Big-O: O(L) where L is word length.
  insert(word, id) {
    if (!word || typeof word !== "string") return;
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch);
    }
    node.isEnd = true;
    if (id) {
      node.entryIds.add(id);
    }
  }

  // Traverses descendant nodes collecting all entry IDs from terminal nodes. Big-O: O(M) where M is descendant nodes.
  _collectIds(node, results) {
    if (node.isEnd) {
      for (const id of node.entryIds) {
        results.add(id);
      }
    }
    for (const child of node.children.values()) {
      this._collectIds(child, results);
    }
  }

  // Returns a Set of entry IDs matching the given prefix; returns an empty Set for empty/missing prefixes. Big-O: O(P + M).
  searchPrefix(prefix) {
    if (!prefix || typeof prefix !== "string" || prefix.trim() === "") {
      return new Set();
    }
    const p = prefix.trim().toLowerCase();
    let node = this.root;
    for (const ch of p) {
      if (!node.children.has(ch)) {
        return new Set();
      }
      node = node.children.get(ch);
    }
    const results = new Set();
    this._collectIds(node, results);
    return results;
  }

  // Helper for recursive removal of an ID and automatic pruning of dead branches. Big-O: O(L).
  _removeHelper(node, word, id, depth) {
    if (!node) return false;

    if (depth === word.length) {
      if (!node.isEnd) return false;
      const deleted = node.entryIds.delete(id);
      if (node.entryIds.size === 0) {
        node.isEnd = false;
      }
      return deleted;
    }

    const ch = word[depth];
    const child = node.children.get(ch);
    if (!child) return false;

    const deleted = this._removeHelper(child, word, id, depth + 1);

    // Prune branch if child has no further children and is no longer an end for any word
    if (deleted && child.children.size === 0 && !child.isEnd) {
      node.children.delete(ch);
    }

    return deleted;
  }

  // Removes an entry ID from a word's terminal node and prunes any empty branches. Big-O: O(L).
  remove(word, id) {
    if (!word || typeof word !== "string" || !id) return false;
    return this._removeHelper(this.root, word.toLowerCase(), id, 0);
  }

  // Clears the entire trie by resetting the root node. Big-O: O(1).
  clear() {
    this.root = new TrieNode();
  }
}
