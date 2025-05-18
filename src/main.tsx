import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { fal } from "@fal-ai/client";

const falApiKey = import.meta.env.VITE_FAL_API_KEY;

if (falApiKey) {
  fal.config({
    credentials: falApiKey
  });
} else {
  console.error("Fal.ai API key (VITE_FAL_API_KEY) is not configured. TTS via Fal.ai will fail.");
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
