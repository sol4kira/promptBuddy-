// Storage constants
export const STORAGE_KEY = "promptbuddy_history_v2";
export const OLD_STORAGE_KEY = "promptbuddy_recents";
export const MAX_HISTORY_ENTRIES = 200;

// Generates a unique identifier string using crypto.randomUUID() with fallback. Big-O: O(1).
export function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if randomUUID fails in restricted contexts
    }
  }
  return "pb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

export function createKey({ goal = "", context = "", style = "", audience = "", length = "" } = {}) {
  return [goal, context, style, audience, length]
    .map((val) => String(val || "").trim().toLowerCase())
    .join("\u001f");
}

// Normalizes audience value, mapping legacy 'intermid' typo to 'intermediate'. Big-O: O(1).
export function normalizeAudience(audience) {
  const clean = String(audience || "beginner").trim();
  return clean === "intermid" ? "intermediate" : clean;
}

// Creates a history entry conforming exactly to the { id, key, goal, context, style, audience, length, createdAt, lastUsedAt } shape. Big-O: O(N).
export function createEntry(fields = {}) {
  const goal = String(fields.goal || "").trim();
  const context = String(fields.context || "").trim();
  const style = String(fields.style || "concise").trim();
  const audience = normalizeAudience(fields.audience);
  const length = String(fields.length || "short").trim();

  const now = Date.now();
  const key = fields.key || createKey({ goal, context, style, audience, length });
  const id = fields.id || generateId();
  const createdAt = typeof fields.createdAt === "number" && !isNaN(fields.createdAt) ? fields.createdAt : now;
  const lastUsedAt = typeof fields.lastUsedAt === "number" && !isNaN(fields.lastUsedAt) ? fields.lastUsedAt : now;

  return {
    id,
    key,
    goal,
    context,
    style,
    audience,
    length,
    createdAt,
    lastUsedAt,
  };
}

// Migrates legacy entries from promptbuddy_recents to the v2 shape, preserving order by spreading timestamps 1s apart. Big-O: O(N).
export function migrateOldEntries(oldList, migrationTime = Date.now()) {
  if (!Array.isArray(oldList)) return [];

  return oldList.map((item, index) => {
    // Oldest item gets the earliest timestamp, newest (index 0) gets migrationTime
    const spreadTimestamp = migrationTime - index * 1000;
    return createEntry({
      ...item,
      id: item.id || generateId(),
      createdAt: typeof item.createdAt === "number" && !isNaN(item.createdAt) ? item.createdAt : spreadTimestamp,
      lastUsedAt: typeof item.lastUsedAt === "number" && !isNaN(item.lastUsedAt) ? item.lastUsedAt : spreadTimestamp,
    });
  });
}

// Loads history entries from localStorage under promptbuddy_history_v2 with automatic migration from promptbuddy_recents. Big-O: O(N).
export function loadHistory(storage = typeof localStorage !== "undefined" ? localStorage : null) {
  try {
    if (!storage) return [];

    const raw = storage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => createEntry(item)).slice(0, MAX_HISTORY_ENTRIES);
      }
    }

    // First load migration: check for legacy data under old key
    const oldRaw = storage.getItem(OLD_STORAGE_KEY);
    if (oldRaw !== null) {
      const oldParsed = JSON.parse(oldRaw);
      if (Array.isArray(oldParsed) && oldParsed.length > 0) {
        const migrated = migrateOldEntries(oldParsed);
        // Save migrated entries under v2 key while leaving the old key untouched
        saveHistory(migrated, storage);
        return migrated.slice(0, MAX_HISTORY_ENTRIES);
      }
    }
  } catch (err) {
    console.warn("Could not load history from localStorage:", err);
  }
  return [];
}

let hasShownStorageErrorToast = false;

export function resetStorageErrorToastState() {
  hasShownStorageErrorToast = false;
}

function showStorageErrorToast() {
  if (hasShownStorageErrorToast) return;
  if (typeof document === "undefined") return;
  const toast = document.getElementById("toast");
  if (!toast) return;
  hasShownStorageErrorToast = true;
  toast.textContent = "Could not save history to local storage";
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

// Saves history entries to localStorage under promptbuddy_history_v2, dropping items exceeding MAX_HISTORY_ENTRIES (200). Big-O: O(N).
export function saveHistory(entries, storage = typeof localStorage !== "undefined" ? localStorage : null) {
  if (!Array.isArray(entries)) return false;
  try {
    if (!storage) return false;

    // Capping at 200 entries happens right here:
    // entries are ordered newest-used first, so slicing from 0 to 200 retains the 200 most recent
    // and drops any older (least recently used) entries beyond index 199.
    const capped = entries.slice(0, MAX_HISTORY_ENTRIES);
    storage.setItem(STORAGE_KEY, JSON.stringify(capped));
    return true;
  } catch (err) {
    console.warn("Could not save history to localStorage:", err);
    showStorageErrorToast();
    return false;
  }
}
