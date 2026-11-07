# PromptBuddy

> **Craft clear, structured, and high-impact AI prompts for study, research, and development.**

[![Live Demo](https://img.shields.io/badge/promptbuddy-eight.vercel.app-10b981?style=for-the-badge&logo=promptbuddy&logoColor=white)](promptbuddy-eight.vercel.app/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Tests](https://img.shields.io/badge/Tests-26%20Passing-10b981?style=for-the-badge&logo=github-actions&logoColor=white)](#testing)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)

---

## Overview

**PromptBuddy** is a fast, lightweight, and privacy-first prompt engineering workbench. It eliminates the trial-and-error of crafting prompts by structuring user goals, context, tone, audience level, and response length into proven directives optimized for LLMs like ChatGPT, Claude, and Gemini.

PromptBuddy is built with **zero external frontend dependencies** and features a custom client-side search and caching engine powered by **LRU Cache** and **Trie** data structures implemented from scratch.

**Live Application:** ([promptbuddy-eight.vercel.app/](https://promptbuddy-eight.vercel.app/))

---

## Key Features

### 1. Guided Prompt Synthesis
- **Structured Fields**: Turn rough concepts into battle-tested prompts with task descriptions, background context, target audience, style, and length constraints.
- **Quick Presets**: Instant one-click templates for **Explain**, **Summarize**, and **Write Code**.
- **Interactive Templates Modal**: Browse curated, domain-specific prompt templates fetched dynamically from the Express backend API.

### 2. Client-Side History & Custom Search Engine
- **Privacy First**: All generated prompts and search history remain 100% on the user's device via `localStorage`.
- **Custom LRU Cache**: Tracks prompt recency in $O(1)$ time with an automatic 200-entry capacity limit to prevent storage quota exhaustion.
- **Trie Prefix Search**: Instant, sub-millisecond keyword and prefix search across past prompts with multi-token boolean `AND` intersections.
- **Dedicated History Hub (`/history.html`)**: Search, preview, copy, or reload any previous prompt back into the editor with one click.

### 3. Thoughtful UX & Accessibility
- **Non-Destructive "New Prompt"**: Clean one-click form reset with an in-memory snapshot and a 6-second **Undo Toast** to recover cleared work.
- **Screen Reader Friendly**: Proper heading hierarchy with visually-hidden `<h1>`, live region status announcements (`aria-live="polite"`), and full keyboard navigation (focus traps, Escape to close, focus return).
- **Responsive Mobile Experience**: Clean 3-tab bottom bar (`Generate`, `Templates`, `History`), $\ge 44\text{px}$ touch targets, and safe-area inset padding for phones down to $360\text{px}$.
- **WCAG AA Compliant**: High-contrast dark theme ($5.8:1$ body contrast, $14.5:1$ heading contrast).

---

## Computer Science & Data Structures

PromptBuddy implements its core search and cache layer in pure JavaScript without external libraries:

```
                  ┌──────────────────────────────────────────────┐
                  │                 HistoryStore                 │
                  └──────┬────────────────────┬───────────┬──────┘
                         │                    │           │
                         ▼                    ▼           ▼
               ┌──────────────────┐ ┌───────────────┐ ┌───────────────┐
               │  Array (Storage) │ │   LRUCache    │ │     Trie      │
               │  Source of Truth │ │ Doubly-Linked │ │  Prefix Tree  │
               │ (up to 200 items)│ │   List + Map  │ │  Token Index  │
               └──────────────────┘ └───────────────┘ └───────────────┘
```

### 1. LRU Cache (`public/js/lru.js`)
- Combines a **Doubly-Linked List** with a **Map** for constant-time updates.
- **$O(1)$ Operations**: `get()`, `put()`, `delete()`, and `has()`.
- Used to render the "Recent Prompts" sidebar widget (most recent 10 items) and enforce the 200-entry storage eviction cap.

### 2. Trie Search Engine (`public/js/trie.js`)
- Tree structure where each node represents a character; leaves store Sets of prompt IDs.
- **$O(L)$ Token Indexing**: Where $L$ is token length. Words under 2 characters or non-alphanumeric symbols are sanitized.
- **Prefix Matching & Multi-Term Search**: Performs set intersections across token results to provide immediate multi-word `AND` search without scanning the entire history array.
- **Recursive Branch Pruning**: Automatically prunes orphaned nodes when entries are deleted.

---

## Project Structure

```text
promptBuddy-/
├── public/                       # Frontend static assets
│   ├── favicon.svg               # Brand icon
│   ├── index.html                # Main prompt generator application
│   ├── history.html              # Dedicated prompt history & search page
│   ├── 404.html                  # Custom 404 error page
│   ├── style.css                 # Responsive stylesheet & design system
│   ├── script.js                 # Main generator controller & DOM bindings
│   └── js/                       # ES modules
│       ├── lru.js                # Custom Doubly-Linked List LRU Cache
│       ├── trie.js               # Custom Prefix Tree & tokenizer
│       ├── storage.js            # LocalStorage persistence & migration
│       ├── historyStore.js       # Unified history orchestrator
│       └── time.js               # Relative timestamp formatter ("2m ago")
├── src/                          # Express backend
│   ├── app.js                    # Express app configuration & middleware
│   ├── server.js                 # HTTP server entrypoint
│   ├── routes/
│   │   └── templates.js          # REST API endpoints for templates
│   └── services/
│       └── templateService.js    # In-memory template data store
├── tests/                        # Automated test suite (Node Test Runner)
│   ├── storage.test.js           # Storage normalization & migration tests
│   ├── lru.test.js               # LRU Cache lifecycle & edge cases
│   ├── trie.test.js              # Trie prefix search & pruning tests
│   ├── historyStore.test.js      # Store integration & search tests
│   └── server.test.js            # Express routing & static asset tests
├── package.json                  # Project metadata & scripts
└── README.md                     # Project documentation
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher)
- npm (comes bundled with Node.js)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sol4kira/promptBuddy-.git
   cd promptBuddy-
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. For development with auto-reload:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## Testing

PromptBuddy uses Node.js's built-in native test runner (`node:test` and `node:assert/strict`) — no heavy testing dependencies like Jest or Mocha are required.

Run the full automated test suite:
```bash
npm test
```

### Test Coverage Overview (26 Tests across 6 Suites)
- **Stage A (Storage)**: Fingerprint hashing, v1-to-v2 schema migrations, storage error handling, and 200-item LRU caps.
- **Stage B (Data Structures)**: Node pointer integrity, LRU eviction cycles, Trie tokenization, prefix search, and branch pruning.
- **Stage C (History Store)**: Deduplication, recency order, multi-token `AND` queries, and storage rebuilds.
- **Stage D/E/F/G (Server & UI)**: HTTP 200 routing, API responses, 404 handling, navigation markup, and responsive UI structure.

---

## API Reference

### `GET /api/templates`
Returns the full array of available prompt templates.

**Response `200 OK`**:
```json
[
  {
    "id": "code-review",
    "title": "Comprehensive Code Review",
    "category": "Coding",
    "description": "Analyze code for security, performance, and best practices.",
    "goal": "Review the following code for bugs, edge cases, and architectural improvements.",
    "style": "detail",
    "audience": "advanced",
    "length": "long"
  }
]
```

### `GET /api/templates/:id`
Returns a specific template by its unique identifier.

---

## Browser Support

- Chrome / Chromium-based browsers (Edge, Brave, Opera)
- Firefox
- Safari (iOS & macOS)
- Fully responsive across mobile ($360\text{px}$+), tablet, and desktop viewports.

---

## Author

**Kirubel Solomon**  
- GitHub: [@sol4kira](https://github.com/sol4kira)  
- Live Project:  ([promptbuddy-eight.vercel.app/](https://promptbuddy-eight.vercel.app/))
---

## License

This project is licensed under the [ISC License](LICENSE).
