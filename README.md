# NotesAI-RNA

NotesAI-RNA is a study workspace for organizing notes and tasks, working with an AI study assistant, and collaborating through shared resources. This repository contains the React frontend and Android wrapper configuration. It connects to a separately deployed API service for accounts, cloud data, AI requests, and collaboration.

## Product areas

- **Home** — an in-app welcome screen with shortcuts to Notes, Tasks, and NotesAI, plus rotating study tips.
- **Notes** — create, edit, find, organize, and share study notes. Ask the AI to summarize, explain, or generate questions from a note.
- **Tasks** — manage study tasks, due dates, priorities, and completion status.
- **NotesAI** — ask questions in General, Deep Research, or Writing mode; keep chat sessions and share them when needed. Image-to-text import uses Tesseract.js.
- **Shares** — review and manage share links for notes, tasks, and chat sessions.
- **Notifications** — view and manage study reminders and sharing notifications.
- **Account** — sign in or register, manage account preferences, and configure supported AI settings.
- **Help** — open the in-app troubleshooting guide.

The Home view is the app’s in-product landing screen. `index.html` is the Vite document shell that mounts the React application; it is not a separate static marketing website.

## Documentation

- [User guide](docs/user-guide.md) — account setup, navigation, and feature instructions.
- [Landing pages and entry points](docs/landing-pages.md) — how the app opens and handles shared links, password reset links, and help topics.
- [Architecture and development](docs/architecture.md) — frontend structure, data flow, local storage, API configuration, and development commands.

## Run locally

Requirements: Node.js and npm. The API backend must also be available for account, server-backed data, AI, and sharing features.

```bash
npm install
npm run dev
```

The development frontend uses `http://localhost:8000` as its default API base URL. Set `VITE_API_URL` or `VITE_API_BASE_URL` in a local `.env` file to point to another API origin. Do not commit credentials or private API keys. Google sign-in can use `VITE_GOOGLE_CLIENT_ID`; the app can also request the Google client ID from the API configuration endpoint.

Useful commands:

```bash
npm run build       # Create the production bundle in dist/
npm run preview     # Preview the production bundle locally
npm run lint        # Run ESLint
npm test            # Run Vitest once
npm run test:watch  # Run Vitest in watch mode
```

## Android wrapper

The project uses Capacitor. The app ID is `com.notesairna.app`, the display name is `NotesAI-RNA`, and the web bundle directory is `dist`.

```bash
npm run android:prepare  # Build the web app and sync Capacitor Android files
npm run android:open     # Open the Android project in Android Studio
```

Android development also requires the Android SDK and a compatible Java/Gradle setup.

## Deployment notes

- Serve the built `dist/` files from a static host and configure the API origin with `VITE_API_URL` or `VITE_API_BASE_URL` at build time.
- Use HTTPS for production frontend and API origins. Configure the API’s CORS, credentials, cookie, and CSRF rules for the deployed frontend origin.
- The Vite PWA plugin provides the manifest and service worker; the app is configured to use automatic service worker updates.
- Configure the static host to serve `index.html` for the app entry path and direct app URLs used by the deployment. The frontend currently uses state-based view navigation rather than a full routing library.
- AI model access and server-side API credentials belong on the backend. Never place private provider secrets in frontend environment variables.

## Project structure

```text
src/
  components/    App views and feature components
  lib/           API, sharing, notification, formatting, and browser helpers
  App.jsx        App shell and view selection
  db.js          IndexedDB data helpers
  main.jsx       React entry point
public/          PWA icons and static assets
android/         Capacitor Android project
docs/           Product and developer documentation
```

## Contributions

Keep user-facing changes consistent with the existing responsive app shell and accessible controls. Update the relevant guide when a feature or workflow changes. Before opening a change for review, run the checks relevant to that change, such as `npm run lint`, `npm test`, and `npm run build`.
