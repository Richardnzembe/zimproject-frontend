import React from "react";

export default function NoteCard({ note, onAIAction }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: "10px", marginBottom: "10px" }}>
      <h3>{note.title}</h3>
      <p><strong>Subject:</strong> {note.subject} | <strong>Tags:</strong> {note.tags.join(", ")}</p>
      <p>{note.content.substring(0, 100)}...</p>

      <div style={{ marginTop: "10px", display: "flex", gap: "5px" }}>
        <button onClick={() => onAIAction("summarize", note)}>Summarize</button>
        <button onClick={() => onAIAction("explain", note)}>Explain</button>
        <button onClick={() => onAIAction("understandable", note)}>Make Understandable</button>
      </div>
    </div>
  );
}
