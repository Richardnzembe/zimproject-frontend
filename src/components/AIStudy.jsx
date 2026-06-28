import React, { useState } from "react";
import { getApiBaseUrl, getAuthToken, getAuthUserId, authFetch } from "../lib/api";
import { upsertHistoryItems } from "../db";
import { CHAT_MODES, MODE_ENDPOINTS } from "../lib/constants";

const AIStudy = () => {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("general");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("");

  const askAI = async () => {
    const token = getAuthToken();
    if (!token) {
      setStatus("Please login first.");
      return;
    }

    setStatus("");
    setAnswer("");

    const url = `${getApiBaseUrl()}${MODE_ENDPOINTS[mode] || MODE_ENDPOINTS.general}`;
    const body = { question };

    try {
      const res = await authFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(data?.detail || `AI request failed (${res.status})`);
        return;
      }

      const responseText = data?.answer || data?.result || JSON.stringify(data, null, 2);
      setAnswer(responseText);

      const userId = getAuthUserId();
      if (userId) {
        await upsertHistoryItems([
          {
            local_id: crypto.randomUUID(),
            user_id: userId,
            mode,
            input_data: body,
            response_text: responseText,
            created_at: new Date().toISOString(),
            local_only: true,
          },
        ]);
      }
    } catch (err) {
      console.error("AI request failed:", err);
      setStatus("Failed to contact AI. Please check your connection and try again.");
    }
  };

  return (
    <div className="card">
      <h2>NotesAI-RNA AI</h2>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <label>
          Filter:
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            {CHAT_MODES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
      />

      <button onClick={askAI}>Ask AI</button>

      {status && <p>{status}</p>}
      {answer && <p>{answer}</p>}
    </div>
  );
};

export default AIStudy;
