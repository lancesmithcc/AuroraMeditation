# Project Tasks

## Phase 1: Core Meditation Generation

- [ ] **Setup ElevenLabs API Integration:**
    - [x] Create a module to interact with the ElevenLabs API (`src/lib/elevenLabsApi.ts`).
    - [x] Implement function to synthesize speech from text.
    - [x] Securely manage API key using environment variables.
- [ ] **Implement Caching for Generated Audio:**
    - [x] Design a caching mechanism (e.g., localStorage or IndexedDB) to store generated MP3s.
    - [x] Key cache entries by the input text (or a hash of it) and voice profile.
    - [x] Implement logic to check cache before calling ElevenLabs API.
    - [x] Save new audio to cache after generation.
- [ ] **User Interface for Meditation Generation:**
    - [x] Create a Svelte component for users to input their meditation intention/text.
    - [x] Allow users to select a voice profile.
    - [x] Display a loading state while audio is being generated/fetched.
    - [x] Provide an audio player to play the generated meditation.
- [x] **Send Generated MP3 and Intention to Webhook:**
    - [x] After MP3 is generated and cached, send the intention (text) and MP3 data to the specified n8n webhook.
    - [x] Handle potential errors during webhook submission.

## Phase 2: Advanced Features & Refinements

- [ ] **Background Music Integration:**
    - [ ] Research and select royalty-free background music options.
    - [ ] Implement functionality to layer selected background music with the generated speech.
    - [ ] Allow users to choose or upload their own background music (optional).
- [ ] **User Accounts & Saved Meditations:**
    - [ ] Implement user authentication.
    - [ ] Allow users to save their favorite generated meditations to their profile.
- [ ] **Error Handling and Resilience:**
    - [ ] Implement comprehensive error handling across the application.
    - [ ] Provide clear feedback to users in case of API errors or other issues.
- [ ] **Deployment:**
    - [ ] Choose a deployment platform (e.g., Vercel, Netlify).
    - [ ] Configure build process and deploy the application.

## Refactoring & Code Quality
- [ ] Periodically review and refactor code to maintain modularity and readability.
- [ ] Ensure efficient state management.
- [ ] Write unit/integration tests for critical components.

# Meditation App Tasks

## Phase 1: Webhook Audio Enhancement

- [x] Modify `sendToWebhook` to accept `IntentionAnalysisParameters` and `AudioContext`.
- [x] In `sendToWebhook`, call `renderFullAudioMix` to generate the complete audio.
- [x] In `sendToWebhook`, convert the rendered `AudioBuffer` to an MP3 `Blob` using `audioBufferToMp3`.
- [x] In `sendToWebhook`, convert the MP3 `Blob` to an `ArrayBuffer`. (This step is implicitly handled by `FormData` when appending a `Blob`)
- [x] In `sendToWebhook`, send the complete MP3 `Blob` to the webhook (FormData handles conversion).
- [x] Update the call to `sendToWebhook` in `handleIntentionSubmit` to pass the new parameters.
- [ ] Test the webhook functionality to ensure the full audio mix is received.

## Phase 2: Webhook Test Page

- [x] Refactor audio processing utilities (`renderFullAudioMix`, `audioBufferToMp3`, `createReverbImpulseResponse`, related constants) from `App.tsx` into a new file (e.g., `src/audio/audioProcessing.ts`).
- [x] Refactor `sendToWebhook` function and `N8N_WEBHOOK_URL` from `App.tsx` into a new file (e.g., `src/lib/webhookUtils.ts`).
- [x] Update `App.tsx` to import and use these refactored utilities.
- [x] Install `react-router-dom`.
- [x] Modify `src/main.tsx` to set up `BrowserRouter`.
- [x] Create `src/pages/WebhookTestPage.tsx`.
- [x] Implement mock data generation (intention, voice audio buffer) in `WebhookTestPage.tsx`.
- [x] Implement a trigger (e.g., button) in `WebhookTestPage.tsx` to call the refactored `sendToWebhook` with mock data.
- [x] Modify `App.tsx` to define routes for `/` (main app) and `/test` (webhook test page).
- [ ] Test the `/test` page and confirm mock data is sent to the webhook.