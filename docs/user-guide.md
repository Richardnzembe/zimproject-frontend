# User guide

NotesAI-RNA brings study notes, task planning, AI help, and collaboration into one workspace. You can open the web app in a supported browser or use its Android app where it has been built and published.

## Getting started

1. Open the application.
2. Choose **Account** to sign in or create an account. Google sign-in is shown when it has been configured for the deployment.
3. After signing in, use the main navigation to open Home, Notes, Tasks, NotesAI, Shares, Notifications, or Troubleshooting.

An internet connection and an available backend are needed for sign-in, AI responses, sharing, and server synchronization. Notes and tasks also use local browser storage so local changes can be kept while temporarily offline.

## Home

Home is the app’s in-product landing screen. It provides shortcuts to Notes, Tasks, and NotesAI, plus study tips and a rotating motivation message. An invite notice may appear when there are shared items awaiting attention.

## Notes

Use Notes to organize study material. Depending on the fields presented in the editor, a note can include a title, subject, category, tags, and formatted content.

- Create a note, then save it to your workspace.
- Use search and subject filters to find notes.
- Open a note to read or edit it; confirm before deleting when prompted.
- Use the note’s AI actions to request a summary, explanation, or questions.
- Create a share link and choose the permission offered by the app. A read link is for viewing; collaboration access requires sign-in.

Notes are stored locally in IndexedDB and synchronized with the server when connectivity is available. A pending or sync status indicates that a change has not yet finished syncing.

## Tasks

Use Tasks to record study work and deadlines. Tasks support a title, description, due date, priority, and completion status.

- Create or edit a task and set a due date or priority when useful.
- Mark tasks complete when finished; use the available filters to focus on active or completed tasks.
- Share a task using its share controls when collaboration is needed.

Tasks are also cached locally and synchronized when the app can reach the API.

## NotesAI

NotesAI offers three chat modes:

- **General** for everyday questions and quick help.
- **Deep Research** for structured analysis and detailed exploration.
- **Writing** for drafting, rewriting, and polishing text.

Start a conversation by entering a prompt. Chat sessions can be revisited, renamed, or deleted using the session controls. The assistant can make mistakes; check important facts against reliable sources. You can import text from an image using the image-to-text control, then review the extracted text before using it.

A model selector may be available. The deployment’s server configuration and any account-specific key settings determine which models can respond. AI use requires an available AI backend and may be subject to service limits.

## Shares and collaboration

Share links can be used for notes, tasks, and chat sessions. A link may allow read-only access or collaboration, according to its permission. Owners can review share links, manage members, or revoke access from the share controls.

A shared link opens the shared item directly. If an invitation requires an account, sign in and return to the link to accept or continue. Treat share URLs as access links and only send them to intended recipients.

## Notifications

Open Notifications to review available study reminders and share-related activity. Use the page controls to mark notifications as read or clear them. Browser notifications are optional and depend on browser permission and support.

## Account and preferences

The Account area supports the authentication and account-management options provided by the deployment, such as password reset, password changes, and account deletion. Account deletion is permanent; review the confirmation before proceeding.

The account settings can also expose an optional OpenRouter key setting. The interface uses a device PIN to guard access to that key form. The PIN is stored as a hash in this browser; it is separate from your account password and is not a substitute for device security. Theme and cookie preferences are also managed in the app.

## Troubleshooting

Open **Troubleshooting** from navigation to browse help topics. Help topics use a `#help/<topic>` fragment; closing help returns to the app.

Common checks:

- If sign-in or data loading fails, confirm internet access and check that the app’s API service is available.
- If a note or task shows pending sync, reconnect and allow synchronization to retry.
- If an AI request fails, retry after checking connectivity and any displayed wait message.
- If a share cannot be opened, check that the link is current and that you have accepted any invitation.
- Never send your password, recovery links, or private API keys to support contacts.
