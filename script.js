// script.js - PromptBuddy Application Logic (Dark Theme & Streamlined UI)

// Utility: Clean whitespace
function cutWhiteSpace(text) {
  return (text || "").trim();
}

// Recent prompts: Empty at first as requested (LRU/tier to be integrated later)
const DEFAULT_RECENT_PROMPTS = [];

// LocalStorage helpers
function getRecentPrompts() {
  try {
    const saved = localStorage.getItem("promptbuddy_recents");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read recent prompts from storage:", e);
  }
  return DEFAULT_RECENT_PROMPTS;
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

// Quick Preset Handlers
function applyPresnt(name) {
  const goalInput = document.getElementById("goal");
  const contextInput = document.getElementById("context");
  const styleSelect = document.getElementById("style");
  const audienceSelect = document.getElementById("audience");
  const lengthSelect = document.getElementById("length");

  if (name === "Explain") {
    goalInput.value = "Explain a concept clearly";
    if (contextInput) {
      contextInput.value = "Topic: \nKey points to cover: \nExample to include: ";
    }
    styleSelect.value = "detail";
    audienceSelect.value = "beginner";
    lengthSelect.value = "short";
  } else if (name === "Summarize") {
    goalInput.value = "Summarize the key points and takeaways";
    if (contextInput) {
      contextInput.value = "Paste or enter the notes/article text here.";
    }
    styleSelect.value = "concise";
    audienceSelect.value = "beginner";
    lengthSelect.value = "short";
  } else if (name === "WriteCode") {
    goalInput.value = "Write clean, well-commented code";
    if (contextInput) {
      contextInput.value = "Language: JavaScript\nRequirements: \nExpected Input/Output: ";
    }
    styleSelect.value = "example";
    audienceSelect.value = "intermid";
    lengthSelect.value = "short";
  }

  updateCharCounter();
  showToast(`Applied preset: ${name}`);
  goalInput.focus();
}

// Pre-packaged Templates
const TEMPLATES = {
  codeReview: {
    goal: "Review this code for bugs, efficiency, and edge cases",
    context: "Language: JavaScript / TypeScript\nPriority: Performance and Clean Code patterns",
    style: "detail",
    audience: "advanced",
    length: "medium"
  },
  studyGuide: {
    goal: "Create an active-recall study guide with practice questions",
    context: "Subject / Topic: \nKey formulas or definitions to test: ",
    style: "example",
    audience: "beginner",
    length: "medium"
  },
  literatureSummary: {
    goal: "Summarize this research paper into key hypotheses, methodology, and conclusions",
    context: "Paper Title: \nMain arguments: \nLimitations noted: ",
    style: "concise",
    audience: "advanced",
    length: "medium"
  },
  stepByStep: {
    goal: "Break down the following problem into progressive step-by-step milestones",
    context: "Problem description: \nCurrent blockers: ",
    style: "detail",
    audience: "beginner",
    length: "long"
  }
};

function selectTemplate(templateKey) {
  const t = TEMPLATES[templateKey];
  if (!t) return;

  const goalInput = document.getElementById("goal");
  const contextInput = document.getElementById("context");
  const styleSelect = document.getElementById("style");
  const audienceSelect = document.getElementById("audience");
  const lengthSelect = document.getElementById("length");

  goalInput.value = t.goal;
  if (contextInput) contextInput.value = t.context;
  styleSelect.value = t.style;
  audienceSelect.value = t.audience;
  lengthSelect.value = t.length;

  updateCharCounter();

  // Close modal
  const modal = document.getElementById("templatesModal");
  if (modal) modal.classList.remove("open");

  showToast("Template applied to form!");
  goalInput.focus();
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
    audience === "intermid" ? "Intermediate" :
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

// Remove a prompt from recent prompts list
function removeRecentPrompt(index) {
  const recents = getRecentPrompts();
  if (index >= 0 && index < recents.length) {
    recents.splice(index, 1);
    saveRecentPrompts(recents);
    renderRecentPrompts();

    // If saved modal is currently open, re-render it too
    const savedModal = document.getElementById("savedPromptsModal");
    if (savedModal && savedModal.classList.contains("open")) {
      renderSavedModalList();
    }

    showToast("🗑️ Prompt removed from recents");
  }
}

// Render Recent Prompts list in sidebar (Empty initially)
function renderRecentPrompts() {
  const listContainer = document.getElementById("recentPromptsList");
  if (!listContainer) return;

  const recents = getRecentPrompts();
  listContainer.innerHTML = "";

  if (recents.length === 0) {
    listContainer.innerHTML = `<div class="recent-empty-state">No recent prompts yet. Generate a prompt to see it here!</div>`;
    return;
  }

  recents.slice(0, 5).forEach((item, index) => {
    const el = document.createElement("div");
    el.className = "recent-item";
    el.setAttribute("role", "listitem");
    el.innerHTML = `
      <svg class="doc-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <div class="recent-info" title="Click to load: ${item.goal}">
        <div class="recent-name">${item.goal}</div>
        <div class="recent-time">${item.time || "Recently"}</div>
      </div>
      <div class="recent-actions" role="group" aria-label="Prompt actions">
        <button type="button" class="recent-btn recent-load-btn" title="Load prompt into generator">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Load</span>
        </button>
        <button type="button" class="recent-btn recent-remove-btn" title="Remove prompt">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          <span>Remove</span>
        </button>
      </div>
      <svg class="chevron-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    `;

    // Clicking the item text loads it
    el.querySelector(".recent-info").addEventListener("click", () => {
      loadSamplePrompt(item.goal, item.style, item.audience, item.length, item.context);
    });

    // Clicking Load button
    el.querySelector(".recent-load-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      loadSamplePrompt(item.goal, item.style, item.audience, item.length, item.context);
    });

    // Clicking Remove button
    el.querySelector(".recent-remove-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      removeRecentPrompt(index);
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
  if (contextInput && context) contextInput.value = context;
  if (styleSelect) styleSelect.value = style;
  if (audienceSelect) audienceSelect.value = audience;
  if (lengthSelect) lengthSelect.value = length;

  updateCharCounter();
  showToast("Prompt loaded into editor");
  goalInput.scrollIntoView({ behavior: "smooth", block: "center" });
  goalInput.focus();
}

// Mobile Bottom Nav Helper: Focus Generator
function focusGenerator() {
  const goalInput = document.getElementById("goal");
  if (goalInput) {
    goalInput.scrollIntoView({ behavior: "smooth", block: "center" });
    goalInput.focus();
  }
}

// Send prompt silently to backend
async function sendPromptToBackend(p) {
  const endpoints = [
    "/save-prompt",
    "https://promptbuddy-46lk.onrender.com/save-prompt"
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      if (response.ok) {
        console.log(`✅ Prompt successfully saved to ${endpoint}`);
        return true;
      }
    } catch (err) {
      // Fallback
    }
  }
  return false;
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  const goalInput = document.getElementById("goal");
  const generateBtn = document.getElementById("generates");
  const copyBtn = document.getElementById("copy");
  const copyBtnText = document.getElementById("copyBtnText");
  const outputElem = document.getElementById("output");

  // Character counter listener
  if (goalInput) {
    goalInput.addEventListener("input", updateCharCounter);
    updateCharCounter();
  }

  // Generate Prompt click handler
  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      const p = buildPrompt();
      if (outputElem) {
        outputElem.textContent = p;
      }

      // Add to Recent Prompts dynamically
      const goalVal = cutWhiteSpace(goalInput ? goalInput.value : "") || "Custom prompt request";
      const recents = getRecentPrompts();
      recents.unshift({
        goal: goalVal,
        style: document.getElementById("style")?.value || "concise",
        audience: document.getElementById("audience")?.value || "beginner",
        length: document.getElementById("length")?.value || "short",
        context: document.getElementById("context")?.value || "",
        time: "Just now"
      });
      saveRecentPrompts(recents.slice(0, 10));
      renderRecentPrompts();

      // Show toast
      showToast("✨ Prompt generated successfully!");

      // Scroll output into view if on mobile
      if (window.innerWidth < 768 && outputElem) {
        outputElem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      // Send to backend
      sendPromptToBackend(p);
    });
  }

  // Copy Prompt click handler
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
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
        } catch (e) {
          copied = false;
        }
      }

      // Fallback
      if (!copied) {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          copied = true;
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
        alert("Prompt copied!");
      }
    });
  }

  // Templates Modal Handlers
  const viewTemplatesBtn = document.getElementById("viewTemplatesBtn");
  const templatesModal = document.getElementById("templatesModal");
  const closeTemplatesModal = document.getElementById("closeTemplatesModal");

  const openTemplatesModal = () => {
    if (templatesModal) templatesModal.classList.add("open");
  };

  const closeTemplatesModalFn = () => {
    if (templatesModal) templatesModal.classList.remove("open");
  };

  if (viewTemplatesBtn) viewTemplatesBtn.addEventListener("click", openTemplatesModal);
  if (closeTemplatesModal) closeTemplatesModal.addEventListener("click", closeTemplatesModalFn);

  // Saved Prompts Modal Handlers
  const navSavedLink = document.getElementById("navSavedLink");
  const mobileSavedTab = document.getElementById("mobileSavedTab");
  const viewAllRecentBtn = document.getElementById("viewAllRecentBtn");
  const savedPromptsModal = document.getElementById("savedPromptsModal");
  const closeSavedModal = document.getElementById("closeSavedModal");
  const savedModalList = document.getElementById("savedModalList");

  function renderSavedModalList() {
    if (!savedModalList) return;
    const recents = getRecentPrompts();
    savedModalList.innerHTML = "";
    if (recents.length === 0) {
      savedModalList.innerHTML = "<p style='color:var(--text-muted); padding:16px; text-align:center;'>No saved prompts yet. Generate prompts to see them here!</p>";
    } else {
      recents.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "recent-item";
        row.innerHTML = `
          <svg class="doc-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div class="recent-info">
            <div class="recent-name">${item.goal}</div>
            <div class="recent-time">${item.time || "Saved"} • Tone: ${item.style || "concise"}</div>
          </div>
          <div class="recent-actions" style="opacity:1; pointer-events:auto; transform:none;">
            <button type="button" class="recent-btn recent-load-btn" title="Load prompt">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Load</span>
            </button>
            <button type="button" class="recent-btn recent-remove-btn" title="Remove prompt">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span>Remove</span>
            </button>
          </div>
        `;
        row.querySelector(".recent-info").addEventListener("click", () => {
          loadSamplePrompt(item.goal, item.style, item.audience, item.length, item.context);
          if (savedPromptsModal) savedPromptsModal.classList.remove("open");
        });
        row.querySelector(".recent-load-btn").addEventListener("click", () => {
          loadSamplePrompt(item.goal, item.style, item.audience, item.length, item.context);
          if (savedPromptsModal) savedPromptsModal.classList.remove("open");
        });
        row.querySelector(".recent-remove-btn").addEventListener("click", () => {
          removeRecentPrompt(index);
        });
        savedModalList.appendChild(row);
      });
    }
  }

  const openSavedModal = () => {
    if (!savedPromptsModal) return;
    renderSavedModalList();
    savedPromptsModal.classList.add("open");
  };

  if (navSavedLink) {
    navSavedLink.addEventListener("click", (e) => {
      e.preventDefault();
      openSavedModal();
    });
  }
  if (mobileSavedTab) {
    mobileSavedTab.addEventListener("click", openSavedModal);
  }
  if (viewAllRecentBtn) {
    viewAllRecentBtn.addEventListener("click", openSavedModal);
  }
  if (closeSavedModal) {
    closeSavedModal.addEventListener("click", () => {
      if (savedPromptsModal) savedPromptsModal.classList.remove("open");
    });
  }

  // Close modals on backdrop click
  window.addEventListener("click", (e) => {
    if (e.target === templatesModal) templatesModal.classList.remove("open");
    if (e.target === savedPromptsModal) savedPromptsModal.classList.remove("open");
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

  // Initial render of recent prompts (Starts empty)
  renderRecentPrompts();
});
