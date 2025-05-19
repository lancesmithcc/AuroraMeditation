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