import React, { useState } from "react";
import LiveThrottleMessage from "./LiveThrottleMessage";
import AIModeButtons from "../components/AIModeButtons";
import NoteCard from "../components/NoteCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { getApiBaseUrl, getAuthToken, authFetch } from "../lib/api";

export default function NotesPage() {
  const [notes] = useState([
    { id: 1, title: "Biology Notes", subject: "Biology", tags: ["cells"], content: "Cells are the basic unit of life..." },
    { id: 2, title: "History Notes", subject: "History", tags: ["WW2"], content: "World War II started in 1939..." }
  ]);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAIResult] = useState("");

  const handleAIAction = async (action, note) => {
    const token = getAuthToken();
    if (!token) {
      setAIResult("Please login first.");
      return;
    }

    setLoading(true);
    setAIResult("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      let res;
      try {
        res = await authFetch(`${getApiBaseUrl()}/api/ai/notes/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ note_content: note.content, action }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAIResult(data?.error || data?.detail || `AI request failed (${res.status})`);
      } else {
        setAIResult(data?.updated_note || "No response from AI.");
      }
    } catch (err) {
      console.error(err);
      if (err?.name === "AbortError") {
        setAIResult("Request timed out. The server may be waking up \u2014 please try again.");
      } else {
        setAIResult("Could not reach the AI service. Check your connection and try again.");
      }
    }

    setLoading(false);
  };

  const handleModeSelect = async (mode) => {
    const token = getAuthToken();
    if (!token) {
      setAIResult("Please login first.");
      return;
    }

    setLoading(true);
    setAIResult("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const body = { question: "Example note content" };
      let url = "";

      if (mode === "research") url = `${getApiBaseUrl()}/api/ai/research/`;
      else if (mode === "writing") url = `${getApiBaseUrl()}/api/ai/writing/`;
      else if (mode === "general") url = `${getApiBaseUrl()}/api/ai/general/`;
      else return;

      let res;
      try {
        res = await authFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAIResult(data?.error || data?.detail || `AI request failed (${res.status})`);
      } else {
        setAIResult(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error(err);
      if (err?.name === "AbortError") {
        setAIResult("Request timed out. The server may be waking up \u2014 please try again.");
      } else {
        setAIResult("Could not reach the AI service. Check your connection and try again.");
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>My Notes</h1>

      <AIModeButtons onModeSelect={handleModeSelect} />

      {loading && <LoadingSpinner />}

      {aiResult && (
        <div style={{ margin: "20px 0", padding: "10px", border: "1px solid #3498db", backgroundColor: "#f0f8ff" }}>
          <h3>AI Result:</h3>
          <pre><LiveThrottleMessage message={aiResult} /></pre>
        </div>
      )}

      {notes.map(note => (
        <NoteCard key={note.id} note={note} onAIAction={handleAIAction} />
      ))}
    </div>
  );
}
