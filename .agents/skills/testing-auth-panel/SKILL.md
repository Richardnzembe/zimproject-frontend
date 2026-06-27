---
name: testing-auth-panel
description: Test the NotesAI-RNA auth panel and Google OAuth integration end-to-end. Use when verifying auth UI changes, login flows, status messages, or Google Sign-In behavior.
---

# Testing the Auth Panel

## Environments

- **Production (Netlify):** `https://deluxe-syrniki-e613e6.netlify.app`
- **Preview deploys:** `https://deploy-preview-{PR_NUMBER}--deluxe-syrniki-e613e6.netlify.app`
- **Backend API:** `https://ree-backend.onrender.com` (Django)

Preview deploys are created automatically by Netlify for each PR. Check the PR comments from `netlify[bot]` for the deploy URL.

## Navigation

- The auth panel is at **Account** in the top navigation bar
- If not logged in, clicking Account goes directly to the login form
- If logged in, clicking Account opens a dropdown with "Account options" and "Logout"

## Key Components

- `src/components/AuthPanel.jsx` — Main auth component (login, register, password reset, Google OAuth, PIN management)
- `src/components/Navigation.jsx` — Top nav bar with Account link
- `src/App.jsx` — Routes `activeView === "account"` to `<AuthPanel />`

## Auth Panel Modes

1. **Login** — Username + Password, "Sign in" button
2. **Register** — Username + Password + Email + Confirm password, "Create account" button
3. **Password Reset Request** — Email input, "Send reset link" button
4. **Password Reset Confirm** — UID + Token + New password fields

## What to Test

### Status Messages
- Failed login should show a `<p class="status-message error">` element with red styling
- Successful actions should show `<p class="status-message success">` with green styling
- Switching between modes (login/register/reset) should clear the status message
- The status styling uses explicit `statusType` state, not string matching — verify the CSS class is correct

### Google OAuth
- The Google GSI script (`accounts.google.com/gsi/client`) should NOT be in the HTML `<head>` — it loads dynamically via `loadGsiScript()` only when a client ID is available
- Verify no network requests to `accounts.google.com` on initial page load using:
  ```js
  performance.getEntriesByType('resource').filter(r => r.name.includes('accounts.google.com')).map(r => r.name)
  ```
- The Google button only appears when `googleClientId` is set (from env var or backend config)
- The `.auth-google` container should have `max-width: 100%` and `overflow: hidden` for responsive layout

### CSS Verification
- Use DevTools console to query stylesheet rules:
  ```js
  Array.from(document.styleSheets).flatMap(s => { try { return Array.from(s.cssRules) } catch(e) { return [] } }).filter(r => r.selectorText && r.selectorText.includes('auth-google')).map(r => r.cssText)
  ```

## Known Limitations

- Preview deploys may not have `VITE_GOOGLE_CLIENT_ID` set (since `.env` is gitignored), so the Google Sign-In button might not appear
- The backend (`ree-backend.onrender.com`) may return CORS errors from preview domains — this is expected and doesn't affect UI-only testing
- The backend uses Render free tier and may need time to spin up on first request

## Build & Lint

```bash
npm install
npm run lint    # ESLint — pre-existing errors in dev-dist/ and App.jsx are expected
npm run build   # Vite build — should succeed cleanly
npm run dev     # Local dev server (requires backend for full auth flow)
```

## Devin Secrets Needed

- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID (only needed if testing Google Sign-In button rendering). Not required for testing the lazy loading or CSS fixes.
