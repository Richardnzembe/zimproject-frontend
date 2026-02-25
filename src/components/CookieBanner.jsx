import { useState } from "react";
import { setCookie } from "../lib/cookies";

const COOKIE_CONSENT_KEY = "smart_notes_cookie_consent";

function getInitialConsent() {
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (stored) return stored;
  return "";
}

export default function CookieBanner() {
  const [consent, setConsent] = useState(getInitialConsent);

  if (consent) return null;

  const accept = (value) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
    setCookie(COOKIE_CONSENT_KEY, value, { days: 180, sameSite: "Lax" });
    setConsent(value);
  };

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie preferences">
      <p>
        We use cookies for secure sign-in and core app functionality.
      </p>
      <div className="cookie-banner-actions">
        <button className="button-secondary" type="button" onClick={() => accept("essential")}>
          Essential only
        </button>
        <button type="button" onClick={() => accept("all")}>
          Accept all
        </button>
      </div>
    </div>
  );
}
