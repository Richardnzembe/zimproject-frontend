import React, { useState } from "react";
import AIModeButtons from "../components/AIModeButtons";
import NoteCard from "../components/NoteCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { getApiBaseUrl, getAuthHeaders, getAuthToken } from "../lib/api";

export default function NotesPage() {
  const [notes, setNotes] = useState([
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

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/ai/notes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ note_content: note.content, action })
      });
      const data = await res.json();
      setAIResult(data.updated_note);
    } catch (err) {
      console.error(err);
      setAIResult("Error contacting AI");
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

    try {
      const body = { notes: "Example note content" }; // For Study/Project/General mode you can customize
      let url = "";

      if (mode === "study") url = `${getApiBaseUrl()}/api/ai/study/`;
      else if (mode === "project") url = `${getApiBaseUrl()}/api/ai/project/`;
      else if (mode === "general") url = `${getApiBaseUrl()}/api/ai/general/`;
      else return;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      setAIResult(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      setAIResult("Error contacting AI");
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
          <pre>{aiResult}</pre>
        </div>
      )}

      {notes.map(note => (
        <NoteCard key={note.id} note={note} onAIAction={handleAIAction} />
      ))}
    </div>
  );
}
