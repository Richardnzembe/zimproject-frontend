import React, { useState } from "react";
import Tesseract from "tesseract.js";

const ImageToText = ({ onExtract, variant = "full", showStatus = true, className = "" }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setStatus("");
    setProgress(0);

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const pct = Math.round(m.progress * 100);
            setProgress(pct);
            setStatus(`Extracting text... ${pct}%`);
          } else {
            setStatus(m.status);
          }
        },
      });

      setStatus("Text extracted successfully!");
      onExtract(result.data.text);
    } catch (err) {
      setStatus("Failed to extract text. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isCompact = variant === "icon";

  return (
    <div className={`image-import ${isCompact ? "compact" : ""} ${className}`.trim()}>
      <label
        className={`image-import-btn ${isCompact ? "compact" : ""} ${loading ? "loading" : ""}`}
        style={{ cursor: loading ? "not-allowed" : "pointer" }}
        aria-label={isCompact ? "Import image" : undefined}
        title={isCompact ? "Import image" : undefined}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleImage}
          disabled={loading}
          style={{ display: "none" }}
        />
        {isCompact ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="3" width="18" height="14" rx="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <path d="M21 15l-5-5L5 21"></path>
            </svg>
            {loading ? "Processing..." : "Import from Image"}
          </>
        )}
      </label>

      {showStatus && status && (
        <span className={`image-import-status ${status.includes("Failed") ? "error" : ""}`}>
          {status}
        </span>
      )}
    </div>
  );
};

export default ImageToText;
