// Doubly linked list node holding a key, a value, and pointer references.
export class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

// Fixed-capacity Least Recently Used (LRU) Cache backed by a Map and a doubly linked list.
export class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // key -> Node

    this.head = new Node(null, null); // dummy, newest side
    this.tail = new Node(null, null); // dummy, oldest side
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  // Unlinks an existing node from its current position in the doubly linked list. Big-O: O(1).
  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  // Inserts a node right after the dummy head (most recently used position). Big-O: O(1).
  _addToHead(node) {
    const first = this.head.next;
    node.prev = this.head;
    node.next = first;
    this.head.next = node;
    first.prev = node;
  }

  // Moves an existing node to the most recently used position (head). Big-O: O(1).
  _moveToHead(node) {
    this._removeNode(node);
    this._addToHead(node);
  }

  // Removes and returns the node right before dummy tail (least recently used position). Big-O: O(1).
  _removeTail() {
    const victim = this.tail.prev;
    this._removeNode(victim);
    return victim;
  }

  // Returns the value for key and marks it as most recently used, or undefined if not found. Big-O: O(1).
  get(key) {
    if (!this.map.has(key)) {
      return undefined;
    }
    const node = this.map.get(key);
    this._moveToHead(node);
    return node.value;
  }

  // Inserts or updates a key-value pair, moving it to head; evicts and returns the LRU value if over capacity. Big-O: O(1).
  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.value = value;
      this._moveToHead(node);
      return undefined;
    }

    const node = new Node(key, value);
    this._addToHead(node);
    this.map.set(key, node);

    if (this.map.size > this.capacity) {
      const victim = this._removeTail();
      this.map.delete(victim.key);
      return victim.value; // Return the evicted entry
    }

    return undefined;
  }

  // Checks whether key exists without altering recency order. Big-O: O(1).
  has(key) {
    return this.map.has(key);
  }

  // Removes a key and its node from the cache, returning true if removed. Big-O: O(1).
  delete(key) {
    if (!this.map.has(key)) {
      return false;
    }
    const node = this.map.get(key);
    this._removeNode(node);
    this.map.delete(key);
    return true;
  }

  // Returns an array of keys ordered from newest (most recent) to oldest (least recent). Big-O: O(K) where K is size.
  keys() {
    const result = [];
    let cur = this.head.next;
    while (cur !== this.tail) {
      result.push(cur.key);
      cur = cur.next;
    }
    return result;
  }

  // Returns an array of values ordered from newest (most recent) to oldest (least recent). Big-O: O(K) where K is size.
  values() {
    const result = [];
    let cur = this.head.next;
    while (cur !== this.tail) {
      result.push(cur.value);
      cur = cur.next;
    }
    return result;
  }

  // Returns the current number of items stored in the cache. Big-O: O(1).
  get size() {
    return this.map.size;
  }
}
