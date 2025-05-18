import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { fal } from "@fal-ai/client";

const falApiKey = import.meta.env.VITE_FAL_API_KEY;

// TEMPORARY DEBUGGING: Log the key
console.log("Attempting to configure Fal.ai with key:", falApiKey ? "Key loaded (see next log)" : "Key NOT loaded");
if (falApiKey) {
  console.log("VITE_FAL_API_KEY:", falApiKey); // BE CAREFUL WITH THIS LOG
}

if (falApiKey) {
  fal.config({
    credentials: falApiKey
  });
  console.log("Fal.ai config called with credentials.");
} else {
  console.error("Fal.ai API key (VITE_FAL_API_KEY) is not configured. TTS via Fal.ai will fail.");
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
