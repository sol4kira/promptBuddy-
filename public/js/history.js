import { HistoryStore } from "./historyStore.js";
import { formatTimeAgo } from "./time.js";

const store = new HistoryStore();

// Toast notification helper
function showToast(message, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

// Toast notification helper with clickable Undo action (6s duration)
function showUndoToast(message, onUndo, duration = 6000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = "";

  const textSpan = document.createElement("span");
  textSpan.textContent = message;

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "toast-undo-btn";
  undoBtn.textContent = "Undo";
  undoBtn.setAttribute("aria-label", "Undo deleting prompt");

  undoBtn.addEventListener("click", () => {
    onUndo();
    toast.classList.remove("show");
    clearTimeout(toast._timer);
  });

  toast.appendChild(textSpan);
  toast.appendChild(undoBtn);
  toast.classList.add("show");

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
    toast.textContent = "";
  }, duration);
}

// Builds the full copyable prompt string matching the generator's buildPrompt format
function buildPromptText(item) {
  let prompt = "";
  if (item.goal) {
    prompt += "Task: " + item.goal + "\n\n";
  } else {
    prompt += "Task: Provide a helpful and comprehensive response.\n\n";
  }

  if (item.context) {
    prompt += "Context: " + item.context + "\n\n";
  }

  const audienceLabel =
    item.audience === "beginner" ? "Beginner" :
    item.audience === "intermediate" ? "Intermediate" :
    item.audience === "advanced" ? "Advanced" : "Expert";
  prompt += `Target Audience: Write the prompt response for an audience level of ${audienceLabel}.\n`;

  if (item.style === "concise") prompt += "Tone & Style: Give a concise and simple answer.\n";
  if (item.style === "example") prompt += "Tone & Style: Provide clear, practical examples while answering.\n";
  if (item.style === "detail") prompt += "Tone & Style: Give a detailed, structured, step-by-step explanation.\n";
  if (item.style === "conversational") prompt += "Tone & Style: Use a friendly, conversational, and accessible tone.\n";
  if (item.style === "academic") prompt += "Tone & Style: Maintain an academic, formal, and rigorously analytical style.\n";

  if (item.length === "short") prompt += "Length: Keep the response small (1 to 3 concise lines/paragraphs).\n";
  if (item.length === "medium") prompt += "Length: Keep the response medium (around 3 to 8 lines/paragraphs).\n";
  if (item.length === "long") prompt += "Length: Provide a comprehensive, in-depth, and detailed answer.\n";

  prompt += "\nGuideline: If any requirement is unclear, ask a targeted clarifying question before answering.";
  return prompt;
}

// Copies text to clipboard with honest fallback reporting
async function copyToClipboard(text) {
  let copied = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
  }

  if (!copied) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      copied = document.execCommand("copy");
      ta.remove();
    } catch {
      copied = false;
    }
  }

  return copied;
}

// Capitalizes first letter of string
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Main render function for history list using strictly safe DOM creation (never innerHTML with user text)
function renderHistoryList(entries, query = "") {
  const container = document.getElementById("historyList");
  const countElem = document.getElementById("resultsCount");
  const emptyState = document.getElementById("historyEmptyState");
  const emptyTitle = document.getElementById("emptyTitle");
  const emptyDesc = document.getElementById("emptyDesc");
  const clearAllBtn = document.getElementById("clearAllBtn");

  if (!container) return;

  const totalAll = store.all().length;

  // Toggle Clear History button state
  if (clearAllBtn) {
    clearAllBtn.disabled = totalAll === 0;
    clearAllBtn.style.opacity = totalAll === 0 ? "0.45" : "1";
    clearAllBtn.style.pointerEvents = totalAll === 0 ? "none" : "auto";
  }

  // Handle empty states
  if (totalAll === 0) {
    container.innerHTML = "";
    if (countElem) countElem.textContent = "0 saved prompts";
    if (emptyState) {
      emptyState.style.display = "flex";
      if (emptyTitle) emptyTitle.textContent = "No saved prompts yet";
      if (emptyDesc) emptyDesc.textContent = "Generate prompts on the home page to see them saved in your history.";
    }
    return;
  }

  if (entries.length === 0) {
    container.innerHTML = "";
    if (countElem) countElem.textContent = "No matches found";
    if (emptyState) {
      emptyState.style.display = "flex";
      if (emptyTitle) emptyTitle.textContent = "No matching prompts";
      if (emptyDesc) emptyDesc.textContent = `No prompts match your search for "${query}". Try different keywords.`;
    }
    return;
  }

  // Hide empty state and show list
  if (emptyState) emptyState.style.display = "none";
  container.innerHTML = "";

  if (countElem) {
    const noun = entries.length === 1 ? "prompt" : "prompts";
    countElem.textContent = query
      ? `Found ${entries.length} ${noun} matching "${query}"`
      : `Showing ${entries.length} saved ${noun}`;
  }

  // Render each card safely
  entries.forEach((item) => {
    const card = document.createElement("article");
    card.className = "history-card";
    card.setAttribute("role", "listitem");

    // Top meta header (relative time + badges)
    const header = document.createElement("div");
    header.className = "history-card-header";

    const time = document.createElement("span");
    time.className = "history-card-time";
    time.textContent = formatTimeAgo(item.lastUsedAt || item.createdAt);
    header.appendChild(time);

    const badges = document.createElement("div");
    badges.className = "history-badges";

    const styleBadge = document.createElement("span");
    styleBadge.className = "history-badge badge-style";
    styleBadge.textContent = capitalize(item.style || "concise");

    const audienceBadge = document.createElement("span");
    audienceBadge.className = "history-badge badge-audience";
    audienceBadge.textContent = capitalize(item.audience || "beginner");

    const lengthBadge = document.createElement("span");
    lengthBadge.className = "history-badge badge-length";
    lengthBadge.textContent = capitalize(item.length || "short");

    badges.appendChild(styleBadge);
    badges.appendChild(audienceBadge);
    badges.appendChild(lengthBadge);
    header.appendChild(badges);

    // Goal text (safe textContent)
    const goalElem = document.createElement("h3");
    goalElem.className = "history-card-goal";
    goalElem.textContent = item.goal || "Custom prompt request";

    // Context details (if present)
    let contextElem = null;
    if (item.context && item.context.trim().length > 0) {
      contextElem = document.createElement("p");
      contextElem.className = "history-card-context";
      contextElem.textContent = "Context: " + item.context.trim();
    }

    // Actions container
    const actions = document.createElement("div");
    actions.className = "history-card-actions";

    // "Use again" button
    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "btn-history-action btn-use-again";
    useBtn.title = "Load prompt into generator";
    useBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Use again</span>
    `;
    useBtn.addEventListener("click", () => {
      // Navigate to / with hash id so script.js fills form and marks as used
      window.location.href = `/#use-${encodeURIComponent(item.id)}`;
    });

    // "Copy prompt" button
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn-history-action btn-copy-prompt";
    copyBtn.title = "Copy prompt to clipboard";
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      <span>Copy Prompt</span>
    `;
    copyBtn.addEventListener("click", async () => {
      const fullText = buildPromptText(item);
      const success = await copyToClipboard(fullText);
      if (success) {
        showToast("Copied prompt to clipboard!");
      } else {
        showToast("Could not copy to clipboard. Please copy manually.");
      }
    });

    // "Delete" button
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-history-action btn-delete-entry";
    deleteBtn.title = "Delete this prompt";
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      <span>Delete</span>
    `;
    deleteBtn.addEventListener("click", () => {
      const deletedItem = item;
      store.remove(item.id);
      const refreshList = () => {
        const currentQuery = (document.getElementById("historySearchInput")?.value || "").trim();
        renderHistoryList(store.search(currentQuery), currentQuery);
      };
      refreshList();

      showUndoToast("Prompt deleted from history", () => {
        store.add(deletedItem);
        refreshList();
        showToast("Prompt restored");
      }, 6000);
    });

    actions.appendChild(useBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(goalElem);
    if (contextElem) card.appendChild(contextElem);
    card.appendChild(actions);

    container.appendChild(card);
  });
}

// Initialize History Page
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("historySearchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  // Initial render of all saved prompts
  renderHistoryList(store.all(), "");

  // Debounced search handler (~150ms debounce)
  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value;

      // Show/hide clear search button
      if (clearSearchBtn) {
        clearSearchBtn.style.display = query.length > 0 ? "block" : "none";
      }

      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const results = store.search(query);
        renderHistoryList(results, query.trim());
      }, 150);
    });
  }

  // Clear search button
  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      clearSearchBtn.style.display = "none";
      searchInput.focus();
      renderHistoryList(store.all(), "");
    });
  }

  // Clear all history with confirmation
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Are you sure you want to clear your entire prompt history? This action cannot be undone."
      );
      if (confirmed) {
        store.clear();
        if (searchInput) searchInput.value = "";
        if (clearSearchBtn) clearSearchBtn.style.display = "none";
        renderHistoryList([], "");
        showToast("All prompt history cleared");
      }
    });
  }

  // Templates Modal support on History Page
  const navTemplatesBtn = document.getElementById("navTemplatesBtn");
  const mobileTemplatesTab = document.getElementById("mobileTemplatesTab");
  const templatesModal = document.getElementById("templatesModal");
  const closeTemplatesModal = document.getElementById("closeTemplatesModal");
  const templatesGrid = document.getElementById("templatesGrid");

  let lastFocusedElement = null;
  let loadedTemplates = [];

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) {
        throw new Error(`Failed to fetch templates: HTTP ${res.status}`);
      }
      const data = await res.json();
      loadedTemplates = data.templates || [];
      renderTemplatesGrid(loadedTemplates);
    } catch (err) {
      console.error("Error loading templates:", err);
      if (templatesGrid) {
        templatesGrid.innerHTML = `
          <div class="templates-error-state" style="grid-column: 1 / -1; text-align: center; padding: 24px 16px; color: var(--text-muted); background: var(--bg-card-subtle); border: 1px dashed var(--border-medium); border-radius: var(--radius-sm);">
            <p style="color: #f87171; font-weight: 500; margin-bottom: 6px;">Failed to load prompt templates.</p>
            <p style="font-size: 12.5px;">Please check your connection and try refreshing the page.</p>
          </div>
        `;
      }
      showToast("Could not load prompt templates");
    }
  }

  function setBackgroundInert(inert) {
    const elements = document.querySelectorAll("header, main, footer, .mobile-bottom-bar");
    elements.forEach((el) => {
      if (inert) {
        el.setAttribute("inert", "");
      } else {
        el.removeAttribute("inert");
      }
    });
  }

  function trapModalFocus(modal, e) {
    if (e.key !== "Tab") return;

    const focusable = modal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || !modal.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !modal.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function openTemplatesModal(trigger) {
    if (!templatesModal) return;
    lastFocusedElement = trigger || document.activeElement;
    templatesModal.setAttribute("aria-hidden", "false");
    templatesModal.classList.add("open");
    document.body.style.overflow = "hidden";
    setBackgroundInert(true);

    if (loadedTemplates.length === 0) {
      fetchTemplates();
    }

    if (closeTemplatesModal) {
      closeTemplatesModal.focus();
    }
  }

  function closeTemplatesModalFunc() {
    if (!templatesModal) return;
    templatesModal.setAttribute("aria-hidden", "true");
    templatesModal.classList.remove("open");
    document.body.style.overflow = "";
    setBackgroundInert(false);
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  function renderTemplatesGrid(templates) {
    if (!templatesGrid) return;
    templatesGrid.innerHTML = "";
    if (!templates || templates.length === 0) {
      templatesGrid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">No templates available.</p>`;
      return;
    }
    templates.forEach((t) => {
      const card = document.createElement("div");
      card.className = "template-card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");

      const tag = document.createElement("span");
      tag.className = "template-tag";
      tag.textContent = t.category || "General";

      const title = document.createElement("h4");
      title.textContent = t.title || "";

      const desc = document.createElement("p");
      desc.textContent = t.description || "";

      card.appendChild(tag);
      card.appendChild(title);
      card.appendChild(desc);

      const selectAndRedirect = () => {
        window.location.href = `/#template=${t.id}`;
      };

      card.addEventListener("click", selectAndRedirect);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectAndRedirect();
        }
      });

      templatesGrid.appendChild(card);
    });
  }

  if (navTemplatesBtn) {
    navTemplatesBtn.addEventListener("click", () => openTemplatesModal(navTemplatesBtn));
  }
  if (mobileTemplatesTab) {
    mobileTemplatesTab.addEventListener("click", () => openTemplatesModal(mobileTemplatesTab));
  }
  if (closeTemplatesModal) {
    closeTemplatesModal.addEventListener("click", closeTemplatesModalFunc);
  }
  window.addEventListener("click", (e) => {
    if (e.target === templatesModal) {
      closeTemplatesModalFunc();
    }
  });
  window.addEventListener("keydown", (e) => {
    if (templatesModal && templatesModal.classList.contains("open")) {
      if (e.key === "Escape") {
        closeTemplatesModalFunc();
      } else if (e.key === "Tab") {
        trapModalFocus(templatesModal, e);
      }
    }
  });

  // Dynamic copyright year
  const footerYear = document.getElementById("footerYear");
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
});
