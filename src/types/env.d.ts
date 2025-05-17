// This file makes TypeScript aware of the .env variables
// that are exposed to the client via Vite (prefixed with VITE_)

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_API_KEY: string;
  readonly VITE_ELEVENLABS_API_KEY: string; // Ensure this is VITE_ prefixed in your .env
  // Add other environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
