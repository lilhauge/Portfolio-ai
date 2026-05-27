import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// ── Storage polyfill ───────────────────────────────────────────────────────────
// Maps Claude's window.storage API → localStorage so data persists on device
window.storage = {
  get: async (key) => {
    const value = localStorage.getItem(key);
    return value ? { key, value } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    return { key, value };
  },
  delete: async (key) => {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
  list: async (prefix) => {
    const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
    return { keys };
  }
};

// Note: API key is now handled server-side in /api/claude.js
// No client-side key needed — set ANTHROPIC_API_KEY in Vercel Environment Variables

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
