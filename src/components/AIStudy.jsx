import React, { useState } from "react";
import { getApiBaseUrl, getAuthToken, getAuthUserId, authFetch } from "../lib/api";
import { upsertHistoryItems } from "../db";

const AIStudy = () => {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("general"); // general | study | project
  const [projectMode, setProjectMode] = useState("guided"); // guided | fast
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [details, setDetails] = useState("");
  const [studyTask, setStudyTask] = useState("explain"); // summarize | explain | quiz | simplify
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

    let url = "";
    let body = {};

    if (mode === "general") {
      url = `${getApiBaseUrl()}/api/ai/general/`;
      body = { question };
    } else if (mode === "study") {
      url = `${getApiBaseUrl()}/api/ai/study/`;
      body = { notes: question, task: studyTask };
    } else if (mode === "project") {
      url = `${getApiBaseUrl()}/api/ai/project/`;
      body = {
        mode: projectMode,
        project_name: question,
        subject,
        level,
        details,
      };
    }

    const res = await authFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.detail || "AI request failed");
      return;
    }

    const responseText =
      data.answer || data.result || data.project || JSON.stringify(data, null, 2);
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
  };

  return (
    <div className="card">
      <h2>Notex AI</h2>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <label>
          Mode:
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="general">General</option>
            <option value="study">Study</option>
            <option value="project">Project</option>
          </select>
        </label>

        {mode === "study" && (
          <label>
            Study Task:
            <select value={studyTask} onChange={(e) => setStudyTask(e.target.value)}>
              <option value="explain">Explain</option>
              <option value="summarize">Summarize</option>
              <option value="quiz">Quiz</option>
              <option value="simplify">Simplify</option>
            </select>
          </label>
        )}

        {mode === "project" && (
          <label>
            Project Mode:
            <select value={projectMode} onChange={(e) => setProjectMode(e.target.value)}>
              <option value="guided">Guided</option>
              <option value="fast">Fast</option>
            </select>
          </label>
        )}
      </div>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={
          mode === "project" ? "Project topic (or say 'do everything')" : "Ask a question..."
        }
      />

      {mode === "project" && (
        <>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (e.g., Combined Science, Math, Computer Science)"
          />
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="School level (e.g., ZIMSEC O-Level)"
          />
          <input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Extra details (optional)"
          />
        </>
      )}

      <button onClick={askAI}>Ask AI</button>

      {status && <p>{status}</p>}
      {answer && <p>{answer}</p>}
    </div>
  );
};

export default AIStudy;


