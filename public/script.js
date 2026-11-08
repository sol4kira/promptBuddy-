import { HistoryStore } from "./js/historyStore.js";
import { formatTimeAgo } from "./js/time.js";

// Initialize the central history store
const store = new HistoryStore();

// Utility: Clean whitespace
function cutWhiteSpace(text) {
  return (text || "").trim();
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
  undoBtn.setAttribute("aria-label", "Undo clearing form");

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

// Update Character Counter
function updateCharCounter() {
  const goalInput = document.getElementById("goal");
  const counter = document.getElementById("charCounter");
  if (!goalInput || !counter) return;
  const count = goalInput.value.length;
  counter.textContent = `${count}/1000`;
}

// Track valid generated prompt state
let hasGeneratedPrompt = false;

// Reset output state when form changes
function resetGeneratedState() {
  hasGeneratedPrompt = false;
  const outputElem = document.getElementById("output");
  const outputBadge = document.getElementById("outputBadge");
  const copyBtnText = document.getElementById("copyBtnText");

  if (outputElem) outputElem.textContent = "Your Prompt Will be here.";
  if (outputBadge) outputBadge.textContent = "Draft";
  if (copyBtnText) copyBtnText.textContent = "Copy Prompt";
}

// Clear goal field validation error state
function clearGoalError() {
  const goalInput = document.getElementById("goal");
  const goalError = document.getElementById("goalError");
  if (goalInput) {
    goalInput.removeAttribute("aria-invalid");
    goalInput.removeAttribute("aria-describedby");
  }
  if (goalError) {
    goalError.style.display = "none";
  }
}

// Quick Preset Handlers
function applyPreset(name) {
  resetGeneratedState();
  clearGoalError();
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
    showToast("Could not load prompt templates");
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
  resetGeneratedState();
  clearGoalError();
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

// Build Prompt String (preserved exactly)
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

// Remove a prompt from recent prompts by ID
function removeRecentPrompt(id) {
  const removed = store.remove(id);
  if (removed) {
    renderRecentPrompts();
    showToast("Prompt removed from recents");
  }
}

// Render Recent Prompts list in sidebar using the LRU cache (store.recent(5))
function renderRecentPrompts() {
  const listContainer = document.getElementById("recentPromptsList");
  if (!listContainer) return;

  const recents = store.recent(5);
  listContainer.innerHTML = "";

  if (recents.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "recent-empty-state";
    emptyDiv.setAttribute("role", "listitem");
    emptyDiv.textContent = "No recent prompts yet. Generate a prompt to see it here!";
    listContainer.appendChild(emptyDiv);
    return;
  }

  recents.forEach((item) => {
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
    time.textContent = formatTimeAgo(item.lastUsedAt || item.createdAt);

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
  resetGeneratedState();
  clearGoalError();
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

// Nav Helper: Focus Generator
function focusGenerator() {
  const goalInput = document.getElementById("goal");
  if (goalInput) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    goalInput.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
    goalInput.focus();
  }
}

// Accessible Modal Helper Functions
let lastFocusedElement = null;

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

function openModal(modal, triggerElement) {
  if (!modal) return;
  lastFocusedElement = triggerElement || document.activeElement;
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  setBackgroundInert(true);

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
  document.body.style.overflow = "";
  setBackgroundInert(false);

  // Restore focus to opening trigger
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

// Handle "Use again" URL hash from history.html (#use=<id> or #use-<id>)
function handleUseAgainHash() {
  const hash = window.location.hash;
  if (!hash || !hash.includes("use")) return;

  const match = hash.match(/^#use[-=](.+)$/);
  if (!match) return;

  const id = decodeURIComponent(match[1]);
  const entry = store.idMap.get(id);
  if (entry) {
    // Fill the generator without auto-generating
    loadSamplePrompt(entry.goal, entry.style, entry.audience, entry.length, entry.context);
    // Remove hash immediately with history.replaceState so a page refresh does not refill
    history.replaceState(null, "", window.location.pathname);
    showToast("Prompt loaded into editor");
  }
}

// Handle template deep-link (#template=<id> or #template-<id>)
function handleTemplateHash() {
  const hash = window.location.hash;
  if (!hash || !hash.includes("template")) return;

  const match = hash.match(/^#template[-=](.+)$/);
  if (!match) return;

  const templateId = decodeURIComponent(match[1]);
  const applyFoundTemplate = () => {
    selectTemplate(templateId);
    history.replaceState(null, "", window.location.pathname);
  };

  if (loadedTemplates.length === 0) {
    fetchTemplates().then(applyFoundTemplate);
  } else {
    applyFoundTemplate();
  }
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  const goalInput = document.getElementById("goal");
  const contextInput = document.getElementById("context");
  const contextAccordion = document.getElementById("contextAccordion");
  const styleSelect = document.getElementById("style");
  const audienceSelect = document.getElementById("audience");
  const lengthSelect = document.getElementById("length");
  const generateBtn = document.getElementById("generates");
  const newPromptBtn = document.getElementById("newPromptBtn");
  const copyBtn = document.getElementById("copy");
  const copyBtnText = document.getElementById("copyBtnText");
  const outputElem = document.getElementById("output");
  const outputBadge = document.getElementById("outputBadge");

  // In-memory snapshot for "New prompt" Undo functionality
  let undoSnapshot = null;
  let undoTimer = null;

  // Form input listeners to reset generated state and counter
  if (goalInput) {
    goalInput.addEventListener("input", () => {
      clearGoalError();
      updateCharCounter();
      resetGeneratedState();
    });
    updateCharCounter();
  }
  if (contextInput) {
    contextInput.addEventListener("input", resetGeneratedState);
  }
  if (styleSelect) {
    styleSelect.addEventListener("change", resetGeneratedState);
  }
  if (audienceSelect) {
    audienceSelect.addEventListener("change", resetGeneratedState);
  }
  if (lengthSelect) {
    lengthSelect.addEventListener("change", resetGeneratedState);
  }

  // "New prompt" button click handler
  if (newPromptBtn) {
    newPromptBtn.addEventListener("click", () => {
      // 1. Capture in-memory snapshot before clearing
      undoSnapshot = {
        goal: goalInput ? goalInput.value : "",
        context: contextInput ? contextInput.value : "",
        style: styleSelect ? styleSelect.value : "concise",
        audience: audienceSelect ? audienceSelect.value : "beginner",
        length: lengthSelect ? lengthSelect.value : "short",
        output: outputElem ? outputElem.textContent : "",
        hasGeneratedPrompt,
        accordionOpen: contextAccordion ? contextAccordion.open : false,
      };

      // 2. Clear goal and context, reset character counter
      if (goalInput) goalInput.value = "";
      if (contextInput) contextInput.value = "";
      updateCharCounter();

      // 3. Collapse context accordion
      if (contextAccordion) contextAccordion.open = false;

      // 4. Reset output area to placeholder state
      resetGeneratedState();
      clearGoalError();

      // 5. Keep the user's dropdown choices (style, audience, length) intact

      // 6. Remove any lingering #use... from URL
      if (window.location.hash.includes("use")) {
        history.replaceState(null, "", window.location.pathname);
      }

      // 7. Move focus to goal textarea and scroll into view (respecting prefers-reduced-motion)
      if (goalInput) {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        goalInput.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "center",
        });
        goalInput.focus();
      }

      // 8. Show Undo toast for 6 seconds
      clearTimeout(undoTimer);
      showUndoToast(
        "Form cleared",
        () => {
          if (!undoSnapshot) return;
          if (goalInput) goalInput.value = undoSnapshot.goal;
          if (contextInput) contextInput.value = undoSnapshot.context;
          if (styleSelect) styleSelect.value = undoSnapshot.style;
          if (audienceSelect) audienceSelect.value = undoSnapshot.audience;
          if (lengthSelect) lengthSelect.value = undoSnapshot.length;
          if (contextAccordion) contextAccordion.open = undoSnapshot.accordionOpen;
          if (outputElem) outputElem.textContent = undoSnapshot.output;
          if (copyBtnText) copyBtnText.textContent = "Copy Prompt";
          hasGeneratedPrompt = undoSnapshot.hasGeneratedPrompt;
          if (outputBadge) outputBadge.textContent = hasGeneratedPrompt ? "Generated" : "Draft";
          updateCharCounter();
          undoSnapshot = null;
          showToast("Restored prompt");
        },
        6000
      );

      // Discard snapshot when toast expires
      undoTimer = setTimeout(() => {
        undoSnapshot = null;
      }, 6000);
    });
  }

  // Preset buttons (replaces inline onclick attributes)
  document.querySelectorAll(".preset-btn[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyPreset(btn.getAttribute("data-preset"));
    });
  });

  // Mobile Bottom Bar Tabs click handlers
  const mobileGenerateTab = document.getElementById("mobileGenerateTab");
  if (mobileGenerateTab) {
    mobileGenerateTab.addEventListener("click", (e) => {
      e.preventDefault();
      focusGenerator();
    });
  }

  // Generate Prompt click handler with store.add()
  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      const rawGoal = goalInput ? goalInput.value : "";
      if (!rawGoal.trim()) {
        if (goalInput) {
          goalInput.setAttribute("aria-invalid", "true");
          goalInput.setAttribute("aria-describedby", "goalError");
          goalInput.focus();
        }
        const goalError = document.getElementById("goalError");
        if (goalError) {
          goalError.style.display = "block";
        }
        return;
      }
      clearGoalError();

      const p = buildPrompt();
      if (outputElem) {
        outputElem.textContent = p;
        hasGeneratedPrompt = true;
      }
      if (outputBadge) {
        outputBadge.textContent = "Generated";
      }

      // Read current form values
      const goalVal = cutWhiteSpace(goalInput.value);
      const styleVal = document.getElementById("style")?.value || "concise";
      const audienceVal = document.getElementById("audience")?.value || "beginner";
      const lengthVal = document.getElementById("length")?.value || "short";
      const contextVal = document.getElementById("context")?.value || "";

      // Add to HistoryStore (handles deduplication, LRU update, Trie indexing, and storage)
      store.add({
        goal: goalVal,
        style: styleVal,
        audience: audienceVal,
        length: lengthVal,
        context: contextVal,
      });

      renderRecentPrompts();
      showToast("Prompt generated successfully!");

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
      if (!text || text === "Your Prompt Will be here.") {
        showToast("Please generate a prompt first!");
        return;
      }

      let copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch {
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
        } catch {
          copied = false;
        }
      }

      if (copied) {
        if (copyBtnText) copyBtnText.textContent = "Copied!";
        showToast("Copied prompt to clipboard!");
        setTimeout(() => {
          if (copyBtnText) copyBtnText.textContent = "Copy Prompt";
        }, 2200);
      } else {
        showToast("Could not copy prompt to clipboard. Please copy manually.");
      }
    });
  }

  // Templates Modal Handlers (opened from header nav button or mobile bottom tab)
  const navTemplatesBtn = document.getElementById("navTemplatesBtn");
  const mobileTemplatesTab = document.getElementById("mobileTemplatesTab");
  const templatesModal = document.getElementById("templatesModal");
  const closeTemplatesModal = document.getElementById("closeTemplatesModal");

  function triggerOpenTemplates(triggerBtn) {
    if (loadedTemplates.length === 0) {
      fetchTemplates();
    }
    openModal(templatesModal, triggerBtn);
  }

  if (navTemplatesBtn) {
    navTemplatesBtn.addEventListener("click", () => triggerOpenTemplates(navTemplatesBtn));
  }
  if (mobileTemplatesTab) {
    mobileTemplatesTab.addEventListener("click", () => triggerOpenTemplates(mobileTemplatesTab));
  }

  if (closeTemplatesModal) {
    closeTemplatesModal.addEventListener("click", () => {
      closeModal(templatesModal);
    });
  }

  // Sidebar "View All" button -> opens history page
  const viewAllRecentBtn = document.getElementById("viewAllRecentBtn");
  if (viewAllRecentBtn) {
    viewAllRecentBtn.addEventListener("click", () => {
      window.location.href = "/history.html";
    });
  }

  // Close modals on backdrop click
  window.addEventListener("click", (e) => {
    if (e.target === templatesModal) {
      closeModal(templatesModal);
    }
  });

  // Close modals on Escape key press and trap Tab focus inside open modal
  window.addEventListener("keydown", (e) => {
    const openModalElem = document.querySelector(".modal-backdrop.open");
    if (!openModalElem) return;

    if (e.key === "Escape") {
      closeModal(openModalElem);
    } else if (e.key === "Tab") {
      trapModalFocus(openModalElem, e);
    }
  });

  // Header Generate link handler (smooth scroll to editor and focus)
  const navGenerateLink = document.getElementById("navGenerateLink");
  if (navGenerateLink) {
    navGenerateLink.addEventListener("click", (e) => {
      e.preventDefault();
      focusGenerator();
    });
  }

  window.addEventListener("hashchange", () => {
    if (window.location.hash) {
      handleUseAgainHash();
      handleTemplateHash();
    }
  });

  // Dynamic copyright year
  const footerYear = document.getElementById("footerYear");
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }


  // Initial render of recent prompts from LRU cache
  renderRecentPrompts();

  // Check if loaded with #use-<id> or #template-<id>
  handleUseAgainHash();
  handleTemplateHash();
});
