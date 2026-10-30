// script.js - PromptBuddy Application Logic (Dark Theme & Streamlined UI)

// Utility: Clean whitespace
function cutWhiteSpace(text) {
  return (text || "").trim();
}

// Time formatting helper for relative timestamps
function formatTimeAgo(timestamp) {
  if (!timestamp || typeof timestamp !== "number") return "Recently";
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return "Just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Migration for existing localStorage entries
function migrateRecentPrompts(prompts) {
  let modified = false;
  const now = Date.now();
  const migrated = prompts.map((item, index) => {
    const updated = { ...item };
    if (!updated.id) {
      updated.id = "pb_migrated_" + (now - (prompts.length - index) * 60000) + "_" + index;
      modified = true;
    }
    if (!updated.createdAt || typeof updated.createdAt !== "number") {
      updated.createdAt = now - (prompts.length - index) * 60000;
      modified = true;
    }
    if (updated.audience === "intermid") {
      updated.audience = "intermediate";
      modified = true;
    }
    return updated;
  });

  if (modified) {
    saveRecentPrompts(migrated);
  }
  return migrated;
}

// LocalStorage helpers
function getRecentPrompts() {
  try {
    const saved = localStorage.getItem("promptbuddy_recents");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return migrateRecentPrompts(parsed);
      }
    }
  } catch (e) {
    console.warn("Could not read recent prompts from storage:", e);
  }
  return [];
}

function saveRecentPrompts(prompts) {
  try {
    localStorage.setItem("promptbuddy_recents", JSON.stringify(prompts));
  } catch (e) {
    console.warn("Could not save recent prompts to storage:", e);
  }
}

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

// Update Character Counter
function updateCharCounter() {
  const goalInput = document.getElementById("goal");
  const counter = document.getElementById("charCounter");
  if (!goalInput || !counter) return;
  const count = goalInput.value.length;
  counter.textContent = `${count}/1000`;
}

// Quick Preset Handlers (renamed from applyPresnt to applyPreset)
function applyPreset(name) {
  const goalInput = document.getElementById("goal");
  const contextInput = document.getElementById("context");
  const styleSelect = document.getElementById("style");
  const audienceSelect = document.getElementById("audience");
  const lengthSelect = document.getElementById("length");

  if (name === "Explain") {
    if (goalInput) goalInput.value = "Explain a concept clearly";
    if (contextInput) {
      contextInput.value = "Topic: \nKey points to cover: \nExample to include: ";
    }
    if (styleSelect) styleSelect.value = "detail";
    if (audienceSelect) audienceSelect.value = "beginner";
    if (lengthSelect) lengthSelect.value = "short";
  } else if (name === "Summarize") {
    if (goalInput) goalInput.value = "Summarize the key points and takeaways";
    if (contextInput) {
      contextInput.value = "Paste or enter the notes/article text here.";
    }
    if (styleSelect) styleSelect.value = "concise";
    if (audienceSelect) audienceSelect.value = "beginner";
    if (lengthSelect) lengthSelect.value = "short";
  } else if (name === "WriteCode") {
    if (goalInput) goalInput.value = "Write clean, well-commented code";
    if (contextInput) {
      contextInput.value = "Language: JavaScript\nRequirements: \nExpected Input/Output: ";
    }
    if (styleSelect) styleSelect.value = "example";
    if (audienceSelect) audienceSelect.value = "intermediate";
    if (lengthSelect) lengthSelect.value = "short";
  }

  updateCharCounter();
  showToast(`Applied preset: ${name}`);
  if (goalInput) goalInput.focus();
}

// Dynamic Prompt Templates from Backend API
let loadedTemplates = [];

async function fetchTemplates() {
  const container = document.getElementById("templatesGrid");
  try {
    const res = await fetch("/api/templates");
    if (!res.ok) {
      throw new Error(`Failed to fetch templates: HTTP ${res.status}`);
    }
    const data = await res.json();
    loadedTemplates = data.templates || [];
    renderTemplatesList(loadedTemplates);
  } catch (err) {
    console.error("Error loading templates:", err);
    if (container) {
      container.innerHTML = `
        <div class="templates-error-state" style="grid-column: 1 / -1; text-align: center; padding: 24px 16px; color: var(--text-muted); background: var(--bg-card-subtle); border: 1px dashed var(--border-medium); border-radius: var(--radius-sm);">
          <p style="color: #f87171; font-weight: 500; margin-bottom: 6px;">Failed to load prompt templates.</p>
          <p style="font-size: 12.5px;">Please check your connection and try refreshing the page.</p>
        </div>
      `;
    }
    showToast("⚠️ Could not load prompt templates");
  }
}

function renderTemplatesList(templates) {
  const container = document.getElementById("templatesGrid");
  if (!container) return;

  container.innerHTML = "";
  if (!templates || templates.length === 0) {
    container.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">No templates available.</p>`;
    return;
  }

  templates.forEach((t) => {
    const card = document.createElement("div");
    card.className = "template-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const tag = document.createElement("div");
    tag.className = "template-tag";
    tag.textContent = t.category || "";

    const title = document.createElement("h4");
    title.textContent = t.title || "";

    const desc = document.createElement("p");
    desc.textContent = t.description || "";

    card.appendChild(tag);
    card.appendChild(title);
    card.appendChild(desc);

    card.addEventListener("click", () => selectTemplate(t.id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectTemplate(t.id);
      }
    });

    container.appendChild(card);
  });
}

function selectTemplate(templateId) {
  const t = loadedTemplates.find((item) => item.id === templateId);
  if (!t) return;

  const goalInput = document.getElementById("goal");
  const contextInput = document.getElementById("context");
  const styleSelect = document.getElementById("style");
  const audienceSelect = document.getElementById("audience");
  const lengthSelect = document.getElementById("length");

  if (goalInput) goalInput.value = t.goal;
  if (contextInput) contextInput.value = t.context || "";
  if (styleSelect) styleSelect.value = t.style;
  if (audienceSelect) audienceSelect.value = t.audience;
  if (lengthSelect) lengthSelect.value = t.length;

  updateCharCounter();

  // Close modal
  const modal = document.getElementById("templatesModal");
  if (modal) closeModal(modal);

  showToast("Template applied to form!");
  if (goalInput) goalInput.focus();
}

// Build Prompt String
function buildPrompt() {
  const goalInput = document.getElementById("goal");
  const contextInput = document.getElementById("context");
  const styleSelect = document.getElementById("style");
  const audienceSelect = document.getElementById("audience");
  const lengthSelect = document.getElementById("length");

  const goal = cutWhiteSpace(goalInput ? goalInput.value : "");
  const context = cutWhiteSpace(contextInput ? contextInput.value : "");
  const style = styleSelect ? styleSelect.value : "concise";
  const audience = audienceSelect ? audienceSelect.value : "beginner";
  const length = lengthSelect ? lengthSelect.value : "short";

  let prompt = "";
  if (goal) {
    prompt += "Task: " + goal + "\n\n";
  } else {
    prompt += "Task: Provide a helpful and comprehensive response.\n\n";
  }

  if (context) {
    prompt += "Context: " + context + "\n\n";
  }

  const audienceLabel =
    audience === "beginner" ? "Beginner" :
    audience === "intermediate" ? "Intermediate" :
    audience === "advanced" ? "Advanced" : "Expert";
  prompt += `Target Audience: Write the prompt response for an audience level of ${audienceLabel}.\n`;

  if (style === "concise") prompt += "Tone & Style: Give a concise and simple answer.\n";
  if (style === "example") prompt += "Tone & Style: Provide clear, practical examples while answering.\n";
  if (style === "detail") prompt += "Tone & Style: Give a detailed, structured, step-by-step explanation.\n";
  if (style === "conversational") prompt += "Tone & Style: Use a friendly, conversational, and accessible tone.\n";
  if (style === "academic") prompt += "Tone & Style: Maintain an academic, formal, and rigorously analytical style.\n";

  if (length === "short") prompt += "Length: Keep the response small (1 to 3 concise lines/paragraphs).\n";
  if (length === "medium") prompt += "Length: Keep the response medium (around 3 to 8 lines/paragraphs).\n";
  if (length === "long") prompt += "Length: Provide a comprehensive, in-depth, and detailed answer.\n";

  prompt += "\nGuideline: If any requirement is unclear, ask a targeted clarifying question before answering.";

  return prompt;
}

// Remove a prompt from recent prompts by ID (not array index)
function removeRecentPrompt(id) {
  const recents = getRecentPrompts();
  const filtered = recents.filter((item) => item.id !== id);
  if (filtered.length !== recents.length) {
    saveRecentPrompts(filtered);
    renderRecentPrompts();

    // Re-render saved modal list if it's currently open
    const savedModal = document.getElementById("savedPromptsModal");
    if (savedModal && savedModal.classList.contains("open")) {
      renderSavedModalList();
    }

    showToast("🗑️ Prompt removed from recents");
  }
}

// Render Saved Prompts Modal List (Declared at module scope to fix Scope Bug)
function renderSavedModalList() {
  const savedModalList = document.getElementById("savedModalList");
  if (!savedModalList) return;

  const recents = getRecentPrompts();
  savedModalList.innerHTML = "";

  if (recents.length === 0) {
    const emptyP = document.createElement("p");
    emptyP.style.cssText = "color:var(--text-muted); padding:16px; text-align:center;";
    emptyP.textContent = "No saved prompts yet. Generate prompts to see them here!";
    savedModalList.appendChild(emptyP);
    return;
  }

  recents.forEach((item) => {
    const row = document.createElement("div");
    row.className = "recent-item";

    // Doc icon
    const docSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    docSvg.setAttribute("class", "doc-icon");
    docSvg.setAttribute("viewBox", "0 0 24 24");
    docSvg.setAttribute("width", "16");
    docSvg.setAttribute("height", "16");
    docSvg.setAttribute("fill", "none");
    docSvg.setAttribute("stroke", "currentColor");
    docSvg.setAttribute("stroke-width", "2");
    docSvg.innerHTML = `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>`;

    // Info container with safe textContent and title attribute assignment
    const info = document.createElement("div");
    info.className = "recent-info";
    info.title = `Click to load: ${item.goal}`;

    const name = document.createElement("div");
    name.className = "recent-name";
    name.textContent = item.goal;

    const time = document.createElement("div");
    time.className = "recent-time";
    time.textContent = `${formatTimeAgo(item.createdAt)} • Tone: ${item.style || "concise"}`;

    info.appendChild(name);
    info.appendChild(time);

    // Actions container
    const actions = document.createElement("div");
    actions.className = "recent-actions";
    actions.style.cssText = "opacity:1; pointer-events:auto; transform:none;";

    // Load button
    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "recent-btn recent-load-btn";
    loadBtn.title = "Load prompt";
    loadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Load</span>
    `;

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "recent-btn recent-remove-btn";
    removeBtn.title = "Remove prompt";
    removeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      <span>Remove</span>
    `;

    actions.appendChild(loadBtn);
    actions.appendChild(removeBtn);

    row.appendChild(docSvg);
    row.appendChild(info);
    row.appendChild(actions);

    info.addEventListener("click", () => {
      loadSamplePrompt(item.goal, item.style, item.audience, item.length, item.context);
      const savedModal = document.getElementById("savedPromptsModal");
      if (savedModal) closeModal(savedModal);
    });

    loadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      loadSamplePrompt(item.goal, item.style, item.audience, item.length, item.context);
      const savedModal = document.getElementById("savedPromptsModal");
      if (savedModal) closeModal(savedModal);
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeRecentPrompt(item.id);
    });

    savedModalList.appendChild(row);
  });
}

// Render Recent Prompts list in sidebar with safe DOM creation
function renderRecentPrompts() {
  const listContainer = document.getElementById("recentPromptsList");
  if (!listContainer) return;

  const recents = getRecentPrompts();
  listContainer.innerHTML = "";

  if (recents.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "recent-empty-state";
    emptyDiv.textContent = "No recent prompts yet. Generate a prompt to see it here!";
    listContainer.appendChild(emptyDiv);
    return;
  }

  recents.slice(0, 5).forEach((item) => {
    const el = document.createElement("div");
    el.className = "recent-item";
    el.setAttribute("role", "listitem");

    // Doc icon
    const docSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    docSvg.setAttribute("class", "doc-icon");
    docSvg.setAttribute("viewBox", "0 0 24 24");
    docSvg.setAttribute("width", "16");
    docSvg.setAttribute("height", "16");
    docSvg.setAttribute("fill", "none");
    docSvg.setAttribute("stroke", "currentColor");
    docSvg.setAttribute("stroke-width", "2");
    docSvg.innerHTML = `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`;

    // Safe info text and title assignment
    const info = document.createElement("div");
    info.className = "recent-info";
    info.title = `Click to load: ${item.goal}`;

    const name = document.createElement("div");
    name.className = "recent-name";
    name.textContent = item.goal;

    const time = document.createElement("div");
    time.className = "recent-time";
    time.textContent = formatTimeAgo(item.createdAt);

    info.appendChild(name);
    info.appendChild(time);

    // Actions
    const actions = document.createElement("div");
    actions.className = "recent-actions";
    actions.setAttribute("role", "group");
    actions.setAttribute("aria-label", "Prompt actions");

    // Load button
    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "recent-btn recent-load-btn";
    loadBtn.title = "Load prompt into generator";
    loadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Load</span>
    `;

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "recent-btn recent-remove-btn";
    removeBtn.title = "Remove prompt";
    removeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      <span>Remove</span>
    `;

    actions.appendChild(loadBtn);
    actions.appendChild(removeBtn);

    // Chevron icon
    const chevronSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevronSvg.setAttribute("class", "chevron-icon");
    chevronSvg.setAttribute("viewBox", "0 0 24 24");
    chevronSvg.setAttribute("width", "14");
    chevronSvg.setAttribute("height", "14");
    chevronSvg.setAttribute("fill", "none");
    chevronSvg.setAttribute("stroke", "currentColor");
    chevronSvg.setAttribute("stroke-width", "2");
    chevronSvg.innerHTML = `<polyline points="9 18 15 12 9 6"/>`;

    el.appendChild(docSvg);
    el.appendChild(info);
    el.appendChild(actions);
    el.appendChild(chevronSvg);

    info.addEventListener("click", () => {
      loadSamplePrompt(item.goal, item.style, item.audience, item.length, item.context);
    });

    loadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      loadSamplePrompt(item.goal, item.style, item.audience, item.length, item.context);
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeRecentPrompt(item.id);
    });

    listContainer.appendChild(el);
  });
}

// Load a selected prompt into the form
function loadSamplePrompt(goalText, style = "detail", audience = "beginner", length = "short", context = "") {
  const goalInput = document.getElementById("goal");
  const contextInput = document.getElementById("context");
  const styleSelect = document.getElementById("style");
  const audienceSelect = document.getElementById("audience");
  const lengthSelect = document.getElementById("length");

  if (goalInput) goalInput.value = goalText;
  if (contextInput) contextInput.value = context || "";
  if (styleSelect) styleSelect.value = style;
  if (audienceSelect) audienceSelect.value = audience;
  if (lengthSelect) lengthSelect.value = length;

  updateCharCounter();
  showToast("Prompt loaded into editor");
  if (goalInput) {
    goalInput.scrollIntoView({ behavior: "smooth", block: "center" });
    goalInput.focus();
  }
}

// Mobile Bottom Nav Helper: Focus Generator
function focusGenerator() {
  const goalInput = document.getElementById("goal");
  if (goalInput) {
    goalInput.scrollIntoView({ behavior: "smooth", block: "center" });
    goalInput.focus();
  }
}

// Accessible Modal Helper Functions
let lastFocusedElement = null;

function openModal(modal, triggerElement) {
  if (!modal) return;
  lastFocusedElement = triggerElement || document.activeElement;
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("open");

  // Focus close button inside the modal
  const closeBtn = modal.querySelector(".modal-close-btn");
  if (closeBtn) {
    closeBtn.focus();
  }
}

function closeModal(modal) {
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
  modal.classList.remove("open");

  // Restore focus to opening trigger
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  const goalInput = document.getElementById("goal");
  const generateBtn = document.getElementById("generates");
  const copyBtn = document.getElementById("copy");
  const copyBtnText = document.getElementById("copyBtnText");
  const outputElem = document.getElementById("output");

  // State variable tracking whether a prompt was generated (replaces placeholder string check)
  let hasGeneratedPrompt = false;

  // Character counter listener
  if (goalInput) {
    goalInput.addEventListener("input", updateCharCounter);
    updateCharCounter();
  }

  // Generate Prompt click handler
  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      const p = buildPrompt();
      if (outputElem) {
        outputElem.textContent = p;
        hasGeneratedPrompt = true;
      }

      // Read current form values
      const goalVal = cutWhiteSpace(goalInput ? goalInput.value : "") || "Custom prompt request";
      const styleVal = document.getElementById("style")?.value || "concise";
      const audienceVal = document.getElementById("audience")?.value || "beginner";
      const lengthVal = document.getElementById("length")?.value || "short";
      const contextVal = document.getElementById("context")?.value || "";

      const recents = getRecentPrompts();

      // Duplicate check: if identical prompt exists, move it to the front
      const existingIndex = recents.findIndex(
        (item) =>
          item.goal === goalVal &&
          item.style === styleVal &&
          item.audience === audienceVal &&
          item.length === lengthVal &&
          (item.context || "") === contextVal
      );

      let entryToSave;
      if (existingIndex !== -1) {
        entryToSave = recents.splice(existingIndex, 1)[0];
        entryToSave.createdAt = Date.now();
      } else {
        entryToSave = {
          id: "pb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
          createdAt: Date.now(),
          goal: goalVal,
          style: styleVal,
          audience: audienceVal,
          length: lengthVal,
          context: contextVal
        };
      }

      recents.unshift(entryToSave);
      saveRecentPrompts(recents.slice(0, 10));
      renderRecentPrompts();

      showToast("✨ Prompt generated successfully!");

      if (window.innerWidth < 768 && outputElem) {
        outputElem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  // Copy Prompt click handler with honest reporting and state variable
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      if (!hasGeneratedPrompt) {
        showToast("Please generate a prompt first!");
        return;
      }

      const text = outputElem ? outputElem.textContent : "";
      if (!text) {
        showToast("Please generate a prompt first!");
        return;
      }

      let copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (e) {
          copied = false;
        }
      }

      // Fallback
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
        } catch (e) {
          copied = false;
        }
      }

      if (copied) {
        if (copyBtnText) copyBtnText.textContent = "Copied!";
        showToast("✓ Copied prompt to clipboard!");
        setTimeout(() => {
          if (copyBtnText) copyBtnText.textContent = "Copy Prompt";
        }, 2200);
      } else {
        showToast("❌ Could not copy prompt to clipboard. Please copy manually.");
      }
    });
  }

  // Templates Modal Handlers
  const viewTemplatesBtn = document.getElementById("viewTemplatesBtn");
  const templatesModal = document.getElementById("templatesModal");
  const closeTemplatesModal = document.getElementById("closeTemplatesModal");

  if (viewTemplatesBtn) {
    viewTemplatesBtn.addEventListener("click", () => {
      if (loadedTemplates.length === 0) {
        fetchTemplates();
      }
      openModal(templatesModal, viewTemplatesBtn);
    });
  }

  if (closeTemplatesModal) {
    closeTemplatesModal.addEventListener("click", () => {
      closeModal(templatesModal);
    });
  }

  // Saved Prompts Modal Handlers
  const navSavedLink = document.getElementById("navSavedLink");
  const mobileSavedTab = document.getElementById("mobileSavedTab");
  const viewAllRecentBtn = document.getElementById("viewAllRecentBtn");
  const savedPromptsModal = document.getElementById("savedPromptsModal");
  const closeSavedModal = document.getElementById("closeSavedModal");

  const openSavedModalFn = (trigger) => {
    if (!savedPromptsModal) return;
    renderSavedModalList();
    openModal(savedPromptsModal, trigger);
    updateNavActiveState("#saved");
  };

  if (navSavedLink) {
    navSavedLink.addEventListener("click", (e) => {
      e.preventDefault();
      openSavedModalFn(navSavedLink);
    });
  }

  if (mobileSavedTab) {
    mobileSavedTab.addEventListener("click", () => {
      openSavedModalFn(mobileSavedTab);
    });
  }

  if (viewAllRecentBtn) {
    viewAllRecentBtn.addEventListener("click", () => {
      openSavedModalFn(viewAllRecentBtn);
    });
  }

  if (closeSavedModal) {
    closeSavedModal.addEventListener("click", () => {
      closeModal(savedPromptsModal);
      updateNavActiveState(window.location.hash || "#generate");
    });
  }

  // Close modals on backdrop click
  window.addEventListener("click", (e) => {
    if (e.target === templatesModal) {
      closeModal(templatesModal);
    }
    if (e.target === savedPromptsModal) {
      closeModal(savedPromptsModal);
      updateNavActiveState(window.location.hash || "#generate");
    }
  });

  // Close modals on Escape key press
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModalElem = document.querySelector(".modal-backdrop.open");
      if (openModalElem) {
        closeModal(openModalElem);
        updateNavActiveState(window.location.hash || "#generate");
      }
    }
  });

  // Navigation Active Pill Updates
  function updateNavActiveState(hash) {
    const navItems = document.querySelectorAll(".desktop-nav .nav-item");
    navItems.forEach((item) => {
      if (
        (hash === "#home" && item.id === "navHomeLink") ||
        (hash === "#generate" && item.id === "navGenerateLink") ||
        (hash === "#saved" && item.id === "navSavedLink")
      ) {
        item.classList.add("nav-pill-active");
      } else {
        item.classList.remove("nav-pill-active");
      }
    });
  }

  const navHomeLink = document.getElementById("navHomeLink");
  const navGenerateLink = document.getElementById("navGenerateLink");

  if (navHomeLink) {
    navHomeLink.addEventListener("click", () => {
      updateNavActiveState("#home");
    });
  }

  if (navGenerateLink) {
    navGenerateLink.addEventListener("click", () => {
      updateNavActiveState("#generate");
      focusGenerator();
    });
  }

  window.addEventListener("hashchange", () => {
    if (window.location.hash) {
      updateNavActiveState(window.location.hash);
    }
  });

  // Mobile Bottom Bar Tabs click state
  document.querySelectorAll(".bottom-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".bottom-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });

  // Dynamic copyright year
  const footerYear = document.getElementById("footerYear");
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  // Load templates from API
  fetchTemplates();

  // Initial render of recent prompts
  renderRecentPrompts();
});
