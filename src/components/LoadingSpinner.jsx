import React from "react";

export default function LoadingSpinner() {
  return (
    <div style={{ textAlign: "center", margin: "20px" }}>
      <div className="loader">Loading...</div>
      <style>
        {`
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
        `}
      </style>
    </div>
  );
}
