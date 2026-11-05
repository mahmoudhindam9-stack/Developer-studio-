import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { ToastViewport } from "./hooks/use-toast";

// Ignore Vite HMR WebSocket connection errors in preview iframe
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = String(event.reason?.message || event.reason || "");
    if (msg.includes("WebSocket") || msg.includes("vite") || msg.includes("ws:")) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <ToastViewport />
  </React.StrictMode>,
);
