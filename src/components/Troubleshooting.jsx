import { useEffect, useRef } from "react";

const topics = [
  {
    id: "data", title: "I cannot see my notes or AI history",
    reason: "Your connection may be interrupted, your session may have expired, or you may be signed in to a different account.",
    steps: ["Refresh the page after saving any work you have open.", "Check your internet connection. If your work is synced, log out and log in again.", "Make sure you are using the same account you used to create your notes or AI conversations. Work saved only on another device may not appear until it has synced."],
  },
  {
    id: "login", title: "I cannot log in",
    reason: "Your username or password may be incorrect, or the sign-in service may be temporarily unavailable.",
    steps: ["Check your internet connection, then carefully re-enter your username and password. Check capitalization and accidental spaces.", "If available, try Continue with Google using the same email you registered with. If this opens a different account, return to your original sign-in method.", "Use the password recovery option with your registered email if you have forgotten your password. If sign-in still fails, wait a little and try again."],
  },
  {
    id: "application", title: "The application is not working",
    reason: "A connection problem, an outdated cached version, or a temporary service issue may stop the app from responding.",
    steps: ["Check your connection, save any open work, and refresh the page.", "Close the application completely, then reopen it.", "If the problem continues, clear cached files for the app in your browser or device settings. Avoid clearing app storage or site data unless your work is backed up.", "As a last resort, uninstall and reinstall the installed app. First sync or copy any important notes and conversations: clearing data or reinstalling can remove work stored only on this device."],
  },
  {
    id: "sharing", title: "A share or collaboration link says access is not allowed",
    reason: "You may be signed in to the wrong account, your invitation may still need accepting, or the owner may have changed access.",
    steps: ["Log in to the account the owner invited, then open the original share link again.", "Ask the owner to check the Share Control Panel and add your exact username with the correct permission.", "If you see Accept Invite, accept the invitation to continue.", "If access still fails, ask the owner to confirm that sharing is still enabled and send you a current link."],
  },
  {
    id: "username", title: "I cannot add someone: user not found",
    reason: "The username may be misspelled, contain extra spaces, or belong to an account that has not been created yet.",
    steps: ["Ask your friend or colleague for their exact account username, rather than their display name.", "Check every character and remove accidental spaces. For example, richard06 is different from richard 06.", "Make sure they have registered an account, then try adding them again in the Share Control Panel."],
  },
  {
    id: "navigation", title: "The app closes when I navigate",
    reason: "Your phone or browser Back button may leave the app or return to the previous website.",
    steps: ["Use the app’s own navigation buttons, such as Home, Notes, and NotesAI, to move between sections.", "If you accidentally leave the app, reopen it and return to the section you were using.", "For more room when editing notes or managing shared content, try a computer or a device with a larger screen.", "If the app closes without pressing Back, follow the steps under The application is not working."],
  },
  {
    id: "ai", title: "An AI request failed",
    reason: "You may be offline, the service may be busy, or you may have reached a temporary request limit.",
    steps: ["Check your internet connection and make sure you are signed in.", "If a countdown appears, wait until it finishes before trying again.", "Use Retry on the failed message. If requests keep failing, wait a little and try again. For missing conversations, see I cannot see my notes or AI history."],
  },
];

export default function Troubleshooting({ topic, onClose }) {
  const heading = useRef(null);
  useEffect(() => {
    const target = document.getElementById(`help-${topic}`) || heading.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: "start" });
  }, [topic]);

  return (
    <main className="troubleshooting-page">
      <button type="button" className="button-secondary" onClick={onClose}>← Back to app</button>
      <header className="troubleshooting-header">
        <p className="troubleshooting-eyebrow">NotesAI-RNA help</p>
        <h1 ref={heading} tabIndex={-1}>Troubleshooting</h1>
        <p>Find possible reasons for a problem and follow the steps to get back to your work.</p>
      </header>
      <nav className="troubleshooting-topics" aria-label="Troubleshooting topics">
        {topics.map(item => <a key={item.id} href={`#help/${item.id}`}>{item.title}</a>)}
      </nav>
      <div className="troubleshooting-sections">
        {topics.map(item => (
          <section className="panel-card troubleshooting-section" key={item.id} aria-labelledby={`help-${item.id}`}>
            <h2 id={`help-${item.id}`} tabIndex={-1}>{item.title}</h2>
            <p><strong>Possible reason: </strong>{item.reason}</p>
            <ol>{item.steps.map(step => <li key={step}>{step}</li>)}</ol>
          </section>
        ))}
      </div>
      <p className="troubleshooting-footer">Still having trouble? Keep the exact error message and the steps that caused it so you can describe the issue when asking for help. Never share your password or recovery codes.</p>
    </main>
  );
}
