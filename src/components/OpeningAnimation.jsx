import React from "react";
import "../styles.css";
import "./coal.css";

export default function OpeningAnimation() {
  return (
    <div className="coal-overlay" role="presentation">
      <div className="coal-center">
        <div className="coal-logo" aria-hidden="true"></div>
        <h1 className="coal-title">NotesAI-RNA</h1>
      </div>
      <div className="coal-particles" aria-hidden="true">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className={`coal-particle p${i % 8}`}></span>
        ))}
      </div>
    </div>
  );
}
