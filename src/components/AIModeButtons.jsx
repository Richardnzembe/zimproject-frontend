import React from "react";

export default function AIModeButtons({ onModeSelect }) {
  return (
    <div style={{ display: "flex", gap: "10px", margin: "10px 0" }}>
      <button onClick={() => onModeSelect("study")}>Study Mode</button>
      <button onClick={() => onModeSelect("project")}>Project Mode</button>
      <button onClick={() => onModeSelect("general")}>General Mode</button>
      <button onClick={() => onModeSelect("notes")}>Ask AI on Note</button>
    </div>
  );
}
