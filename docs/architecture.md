# Architecture and development

## Overview

NotesAI-RNA is a React 19 single-page application built with Vite 7. This repository is the frontend; account, cloud data, AI, and sharing operations depend on a separately deployed HTTP API. The app also uses Capacitor to package the web frontend for Android.

## Runtime structure

- `index.html` provides the document shell, app metadata, and React mount point.
- `src/main.jsx` initializes and renders the application.
- `src/App.jsx` initializes authentication and manages the active view, shared-resource links, help topics, global request feedback, and app shell.
- `src/components/` contains the feature screens and reusable interface elements.
- `src/lib/` contains API, auth, notifications, sharing, browser helpers, and formatting utilities.
- `src/db.js` provides IndexedDB storage helpers.
- `vite.config.js` configures React, PWA manifest generation, and service-worker registration.
- `android/` contains the Capacitor Android wrapper project.

The frontend selects primary views with React state rather than a routing library. The AI chat is lazy-loaded. Share links are detected from the `share` query parameter, password reset confirmation from `uid` and `token`, and troubleshooting topics from the URL hash.

## Feature ownership

| Area | Main components / modules | Purpose |
|---|---|---|
| Application shell | `App.jsx`, `Navigation.jsx` | View selection, auth changes, navigation |
| Home | `Home.jsx` | Welcome content and shortcuts |
| Authentication | `AuthPanel.jsx`, `api.js` | Registration, sign-in, token lifecycle, account actions |
| Notes | `Notes.jsx`, `db.js` | Note editing, local cache, AI note actions, sharing |
| Tasks | `Tasks.jsx`, `db.js` | Task editing, due dates, local cache, sharing |
| AI chat | `AIChat.jsx`, `constants.js`, `ImageToText.jsx` | Chat modes, history, model selection, image OCR |
| Sharing | `SharedAccess.jsx`, `ShareControlPanel.jsx`, `sharing.js` | Shared links, invites, membership, permissions |
| Notifications | `NotificationsPage.jsx`, `NotificationCenter.jsx`, `notifications.js` | Notification feed and browser notifications |
| Preferences | `ThemeToggle.jsx`, `CookieBanner.jsx` | Theme and cookie-consent preferences |
| Help | `Troubleshooting.jsx` | In-app troubleshooting topics |

## API configuration and expectations

The API base URL is resolved in `src/lib/api.js` from `VITE_API_URL`, then `VITE_API_BASE_URL`. In development it defaults to `http://localhost:8000`. Configure one of these variables in the frontend build environment to point at the backend origin. Production API origins should use HTTPS.

The frontend calls API namespaces including:

- `/api/auth/` for sign-in, registration, Google auth, refresh, profile, and password/account actions.
- `/api/notes/` and `/api/tasks/` for note and task data.
- `/api/ai/` for chat, note actions, history, and user AI key settings.
- `/api/share/` for share links, invites, members, and shared item access.

The backend must support the request formats and endpoints used by the corresponding frontend modules. For credentialed cross-origin requests, configure CORS, cookies, and CSRF to match the deployed origins. Google sign-in accepts an optional frontend `VITE_GOOGLE_CLIENT_ID`; if it is unset, the frontend can request the client ID from `/api/auth/google/config/`.

Do not put private OpenRouter or other provider credentials in `VITE_*` variables. The optional user key is submitted to the backend through the account interface. Provider keys and server AI settings must be managed by the backend.

## Authentication and request lifecycle

`src/lib/api.js` centralizes API URL selection, bearer auth headers, refresh behavior, CSRF/cookie compatibility, and authenticated fetch requests. It stores session data in browser storage and mirrors supported values to cookies for compatibility with the backend’s auth flow. Auth state changes are announced through an `auth-changed` browser event so views can reload or reset user-scoped data.

Application components use `authFetch` for authenticated API calls. Network activity events are surfaced by the app shell after a short delay so quick requests do not cause unnecessary loading overlays.

## Local data and synchronization

`src/db.js` initializes IndexedDB database `smart-notes-db` (schema version 4) with stores for notes, tasks, AI history, note drafts, and legacy project data. Notes and tasks are cached by user and track local/server/client identifiers and sync state. The notes and tasks views save local changes and use the sync helpers in `src/lib/hooks.js` to retry work when the app initializes, connectivity returns, or the relevant data view is active.

AI history is also cached locally. Server availability is still required for new AI responses and server-backed collaboration. Clearing site data can remove local cached records and unsynced edits; allow pending changes to sync before clearing browser storage.

## PWA and Android

The Vite PWA plugin creates the web manifest and service worker. The configured app uses automatic updates, root scope, and root start URL. Static hosting should provide SPA fallback behavior for the root app entry and app query links.

Capacitor configuration uses app ID `com.notesairna.app`, app name `NotesAI-RNA`, and `dist` as the web directory. `npm run android:prepare` builds the web bundle and syncs native assets. Android tooling is required to build and run the native project.

## Local development

```bash
npm install
npm run dev
```

Optional local `.env` example:

```dotenv
VITE_API_URL=http://localhost:8000
# Optional; API configuration may also supply this value.
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Available scripts:

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build production assets into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with coverage |
| `npm run android:prepare` | Build and sync Capacitor Android assets |
| `npm run android:open` | Open the Android project in Android Studio |

`npm run start-all` assumes a sibling `zimproject_backend` checkout with a Django `manage.py`; it is a local convenience script and does not install or configure that backend.

## Security and privacy notes

- Use HTTPS in production and configure the backend to allow only expected frontend origins.
- Do not commit `.env` files containing credentials or private keys.
- Treat share URLs as access links. Configure the backend to enforce each link’s permission and membership.
- Browser storage is scoped to the local browser profile. Signing out or clearing browser data does not replace backend account security.
- The device PIN protects access to the key settings UI on that browser; it is not server-side authentication or an encryption boundary for the account.
- Rich note and chat content should continue to be sanitized before rendering as HTML.
