import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// ── Anthropic API key ──────────────────────────────────────────────────────────
// In standalone PWA: set VITE_ANTHROPIC_KEY in Vercel environment variables
// In Claude artifact: key is injected automatically, this line is a no-op
window.__ANTHROPIC_KEY__ = import.meta.env.VITE_ANTHROPIC_KEY || null;

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
