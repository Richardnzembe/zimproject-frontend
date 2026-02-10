import React, { useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const Charts = ({ 
  projects = [], 
  history = [], 
  title = "Project Summary", 
  customTitle,
  onDeleteAll,
  showActions = false,
  onContinueChart,
  onTitleChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(customTitle || title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chartType, setChartType] = useState("mode");

  let labels = [];
  let values = [];
  let label = "# of Projects";

  if (history.length) {
    if (chartType === "date") {
      // Group by date (last 7 days)
      const dateCount = {};
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString();
        dateCount[dateStr] = 0;
      }
      
      history.forEach((item) => {
        if (item.created_at) {
          const itemDate = new Date(item.created_at).toLocaleDateString();
          if (dateCount.hasOwnProperty(itemDate)) {
            dateCount[itemDate]++;
          }
        }
      });
      
      labels = Object.keys(dateCount);
      values = Object.values(dateCount);
      label = "Requests by Date (Last 7 Days)";
    } else {
      const modeCount = {};
      history.forEach((item) => {
        const key = item.mode || "unknown";
        modeCount[key] = (modeCount[key] || 0) + 1;
      });
      labels = Object.keys(modeCount);
      values = Object.values(modeCount);
      label = "Requests by Mode";
    }
  } else {
    const subjectsCount = {};
    projects.forEach((p) => {
      subjectsCount[p.subject] = (subjectsCount[p.subject] || 0) + 1;
    });
    labels = Object.keys(subjectsCount);
    values = Object.values(subjectsCount);
  }

  const handleTitleSave = () => {
    setIsEditing(false);
    if (onTitleChange) {
      onTitleChange(newTitle);
    }
  };

  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        backgroundColor: "rgba(16, 163, 127, 0.7)",
        borderColor: "rgba(16, 163, 127, 1)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: false,
        text: label,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  if (!labels.length) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          {isEditing ? (
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              autoFocus
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                padding: "6px 10px",
                border: "1px solid var(--primary-color)",
                borderRadius: "var(--radius-sm)",
                maxWidth: "300px",
              }}
            />
          ) : (
            <h2 style={{ cursor: "pointer", margin: 0 }} onClick={() => setIsEditing(true)}>
              {customTitle || title}
            </h2>
          )}
          <div className="chart-controls">
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
            >
              <option value="mode">By Mode</option>
              <option value="date">By Date</option>
            </select>
            <button
              className="button-ghost"
              onClick={() => setIsEditing(true)}
              style={{ padding: "6px 10px" }}
            >
              <EditIcon /> Rename
            </button>
            {showActions && (
              <button
                className="button-danger"
                onClick={() => setShowDeleteConfirm(true)}
                style={{ padding: "6px 12px" }}
              >
                <TrashIcon /> Delete All
              </button>
            )}
          </div>
        </div>

        {showDeleteConfirm && (
          <div style={{ marginTop: "16px", padding: "16px", background: "#fef3c7", borderRadius: "var(--radius-md)", border: "1px solid #fde68a" }}>
            <p style={{ margin: "0 0 12px 0", color: "#92400e", fontSize: "0.875rem" }}>
              <strong>Warning:</strong> This will permanently delete all your AI chat history. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="button-danger"
                onClick={() => {
                  onDeleteAll();
                  setShowDeleteConfirm(false);
                }}
              >
                Confirm Delete
              </button>
              <button
                className="button-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          <p>No data yet. Start a chat to see statistics.</p>
        </div>
      </div>
    );
  }

  const displayTitle = customTitle || newTitle || title;

  return (
    <div className="chart-container">
      <div className="chart-header">
        {isEditing ? (
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
            autoFocus
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              padding: "6px 10px",
              border: "1px solid var(--primary-color)",
              borderRadius: "var(--radius-sm)",
              maxWidth: "300px",
            }}
          />
        ) : (
          <h2 style={{ cursor: "pointer", margin: 0 }} onClick={() => setIsEditing(true)}>
            {displayTitle}
          </h2>
        )}
        <div className="chart-controls">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="mode">By Mode</option>
            <option value="date">By Date</option>
          </select>
          <button
            className="button-ghost"
            onClick={() => setIsEditing(true)}
            style={{ padding: "6px 10px" }}
          >
            <EditIcon /> Rename
          </button>
        </div>
      </div>

      <Bar data={data} options={options} />

      {showActions && onDeleteAll && history.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <button
            className="button-danger"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ padding: "8px 16px" }}
          >
            <TrashIcon /> Delete All History
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div style={{ marginTop: "16px", padding: "16px", background: "#fef3c7", borderRadius: "var(--radius-md)", border: "1px solid #fde68a" }}>
          <p style={{ margin: "0 0 12px 0", color: "#92400e", fontSize: "0.875rem" }}>
            <strong>Warning:</strong> This will permanently delete all your AI chat history. This action cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              className="button-danger"
              onClick={() => {
                onDeleteAll();
                setShowDeleteConfirm(false);
              }}
            >
              Confirm Delete
            </button>
            <button
              className="button-secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Charts;
