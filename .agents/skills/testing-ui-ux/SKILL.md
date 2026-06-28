---
name: testing-ui-ux
description: Test the NotesAI-RNA AI Chat and Notes UI/UX end-to-end. Use when verifying UI redesign changes, responsive layout, dark mode, welcome screen, composer, or notes grid.
---

# Testing UI/UX — AI Chat & Notes

## Environments

- **Production (Netlify):** `https://deluxe-syrniki-e613e6.netlify.app`
- **Preview deploys:** `https://deploy-preview-{PR_NUMBER}--deluxe-syrniki-e613e6.netlify.app`
- **Backend API:** `https://ree-backend.onrender.com` (Django)

Preview deploys are created automatically by Netlify for each PR. Check the PR comments from `netlify[bot]` for the deploy URL.

## Navigation

- **AI Chat:** Click "NotesAI" in the top navigation bar. This renders the full-screen AI Chat component with sidebar.
- **Notes:** Click "Notes" in the top navigation bar. This renders the Notes component with form, list, and reading views.
- **Within AI Chat sidebar:** Footer nav has Home, Notes, Shares, Account, Logout buttons (`.sidebar-nav-item` class).

## Key Components

- `src/components/AIChat.jsx` — AI chat with sidebar, welcome screen, messages, composer
- `src/components/Notes.jsx` — Notes form, list (grid), reading view
- `src/styles.css` — Centralized design system with CSS custom properties

## AI Chat Welcome Screen

The welcome screen appears when `isNewChat` is true — which happens when:
1. A draft session exists with only 1 "welcome" message
2. **Trigger it by clicking "New chat" in the sidebar**

If you navigate to AI Chat and see a blank area, click "New chat" button to create a new draft session and trigger the welcome screen.

### CSS Classes to Verify
- `.ai-welcome` — Container with max-width 680px, centered
- `.ai-welcome-icon` — 72px gradient rounded icon
- `.ai-welcome-title` — "How can I help you today?" (2rem desktop, 1.5rem mobile)
- `.ai-welcome-subtitle` — Description text
- `.ai-welcome-mode-btn` — Pill-shaped mode selectors (General, Deep Research, Writing)
- `.ai-welcome-mode-btn.active` — Active mode (green background)
- `.ai-suggestion-chip` — Suggestion buttons (stacked vertically at <=540px)

### Suggestion Chip Interaction
Clicking a chip sets the textarea value and focuses the input:
- "Explain a concept" → "Explain the concept of photosynthesis"
- "Create a study plan" → "Help me write a study plan for my exams"
- "Summarize notes" → "Summarize the key points of my notes"

## Composer Styling

- `.ai-composer-inner` — `border-radius: 24px`, focus glow on `:focus-within`
- `.ai-send-button` — `border-radius: 50%` (circular), `.active` when input has text
- Textarea auto-grows with content

## Sidebar Styling

- `.sidebar-nav-item` — CSS class on all 5 footer nav buttons
- `.sidebar-nav-logout` — Additional class on Logout, `color: #f87171` (red)
- `.ai-header-toggle` — Sidebar toggle button (36x36 square)
- Mobile: sidebar opens as overlay with `.ai-sidebar-overlay.show`

## Notes Grid Layout

- `.notes-list` — `display: grid` with `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`
- `.note-card` — Cards with hover lift effect and gradient top-bar
- `.note-card-badge` — Category pill badge (`border-radius: 20px`)
- `.notes-form-heading` — "Create New Note" heading
- `.notes-ai-launch-btn` — Green "NotesAI-RNA AI" button
- `.search-filter-container` — Search input with `:focus-within` glow

**Note:** To test note cards and badges, you need saved notes. Without login, only the empty state ("No notes yet") is visible.

## Responsive Breakpoints

### @media (max-width: 720px)
- `.ai-welcome-title` font-size: 1.5rem (24px)
- `.notes-list` grid-template-columns: 1fr (single column)
- Composer goes edge-to-edge

### @media (max-width: 540px)
- `.ai-welcome-suggestions` flex-direction: column
- `.ai-suggestion-chip` width: 100%, text-align: center

### Testing Responsive Layout
Use DevTools device emulation (Ctrl+Shift+M) to toggle responsive mode. Set width to 375px to test mobile layout. Use the console to verify computed styles:
```js
getComputedStyle(document.querySelector('.ai-welcome-title')).fontSize  // should be 24px at 375px
getComputedStyle(document.querySelector('.ai-welcome-suggestions')).flexDirection  // should be "column" at <=540px
```

## Dark Mode

Toggle dark mode using the sun/moon button in the AI Chat header or the top nav bar.

### What to Verify
- `document.documentElement.getAttribute('data-theme')` should be `'dark'`
- All new elements should use CSS variables (`--text-primary`, `--surface-color`, `--border-color`), not hardcoded colors
- No white backgrounds bleeding through on new elements
- Verify with:
```js
getComputedStyle(document.querySelector('.ai-welcome-title')).color  // should be light (e.g. rgb(229, 231, 235))
getComputedStyle(document.querySelector('.ai-suggestion-chip')).backgroundColor  // should be dark
```

## Useful Console Queries

```js
// Verify welcome screen elements
[document.querySelectorAll('.ai-welcome-mode-btn').length, document.querySelector('.ai-welcome-mode-btn.active')?.textContent, document.querySelectorAll('.ai-suggestion-chip').length]

// Verify composer
getComputedStyle(document.querySelector('.ai-composer-inner')).borderRadius  // "24px"

// Verify sidebar nav
[document.querySelectorAll('.sidebar-nav-item').length, getComputedStyle(document.querySelector('.sidebar-nav-logout')).color]

// Verify notes grid
getComputedStyle(document.querySelector('.notes-list')).display  // "grid"
```

## Known Limitations

- Preview deploys may have CORS errors from the backend — this is expected and doesn't affect UI rendering
- Note card badges can only be tested with saved notes (requires login)
- The backend on Render free tier may need time to spin up
- The welcome screen only appears when a "New Chat" is created — navigating to AI Chat without clicking "New chat" may show a blank messages area

## Build & Lint

```bash
npm install
npm run lint    # ESLint
npm run build   # Vite build — should succeed cleanly
```

## Devin Secrets Needed

None required for UI/UX testing. All visual tests can be run on the preview deploy without authentication.
