import React from "react";
import "../styles.css";
import "./coal.css";

export default function OpeningAnimation() {
  return (
    <div className="coal-overlay" role="presentation">
      <div className="coal-center">
        <div className="coal-frame" aria-hidden="true">
          <img src="/icon-512.png" alt="App logo" className="coal-logo-img" />
          <div className="coal-ring" aria-hidden="true"></div>
          <div className="coal-embers" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className={`ember e${i}`}></span>
            ))}
          </div>
        </div>
        <h1 className="coal-title">NotesAI-RNA</h1>
      </div>
    </div>
  );
}
