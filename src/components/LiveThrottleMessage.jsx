import React, { useEffect, useState } from "react";
import { getThrottleSecondsFromText } from "../lib/throttle";

export default function LiveThrottleMessage({ message }) {
  const seconds = getThrottleSecondsFromText(message);
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!seconds) return undefined;
    const deadline = Date.now() + seconds * 1000;
    const update = () => {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    };
    const startTimer = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 250);
    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(interval);
    };
  }, [message, seconds]);

  if (!seconds) return message;

  return (
    <span className={`throttle-countdown ${remaining === 0 ? "ready" : ""}`} role="timer" aria-live="polite">
      {remaining > 0 ? (
        <>Too many requests. You can try again in <strong>{remaining}</strong> second{remaining === 1 ? "" : "s"}.</>
      ) : (
        <>The wait is over. You can try again now.</>
      )}
    </span>
  );
}
