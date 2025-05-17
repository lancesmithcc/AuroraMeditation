# Binaural Beats and Guided Meditation Generator - Tasks

## Phase 1: Core Setup & UI Foundation

- [x] **Project Initialization & Configuration**
    - [x] Initialize Vite + React + TS + Shadcn project.
    - [x] Configure `.env` with API keys.
    - [x] Update `.bolt/prompt` with assistant instructions.
- [x] **Global Styling & Theme**
    - [x] Integrate Google Jost font.
    - [x] Implement dark mode as the default theme (enhancing existing).
    - [x] Create animating dark aurora background.
    - [x] Define global styles for UI elements (3px border, 33px corner radius, aurora color to black).
- [x] **Basic Application Layout (`App.tsx`)**
    - [x] Set up main application container.
    - [x] Integrate aurora background.
    - [x] Create placeholder sections for:
        - [x] Intention Selection (Now a chat interface)
        - [x] Generation Controls (To be driven by intention analysis)
        - [x] Audio Player (Status display for now)
- [x] **Component Styling**
    - [x] Adapt Shadcn components or create custom components/classes to match the specified UI style (border, radius).
- [x] **Simplified Chat Interface**
    - [x] Redesign UI to be a simple chat interface asking "What is your intention?".
    - [x] Implement chat input and basic message display structure in `App.tsx`.
    - [x] Add loading indicators for API calls.

## Phase 2: Core Functionality - Audio Generation & Intention Analysis

- [x] **Web Audio API Integration**
    - [x] Implement Binaural Beat Generator module.
        - [x] Create `BinauralBeatPlayer` class in `src/audio/binauralBeats.ts`.
        - [x] Implement methods for setup, play, stop, and volume control.
    - [x] Implement White Noise Generator module.
        - [x] Create `WhiteNoisePlayer` class in `src/audio/whiteNoise.ts`.
        - [x] Implement methods for setup, play, stop, volume, and basic filter control.
- [x] **Deepseek API Integration for Intention Analysis**
    - [x] Create utility function (`src/lib/deepseekApi.ts`) to call Deepseek API.
    - [x] Develop prompts for analyzing user intentions and returning structured parameters (JSON).
    - [x] Integrate `analyzeIntention` into `App.tsx`'s `handleIntentionSubmit`.
    - [x] Display analysis status (thinking, success, error) in chat.
- [x] **Programmatic Audio Generation based on Analysis**
    - [x] Use parameters from Deepseek to configure and play Binaural Beats.
        - [x] Determine base frequency (e.g., fixed, or from Acutonics).
        - [x] Set beat frequency from `analysisParams.binauralBeatFrequency`.
    - [x] Use parameters from Deepseek to configure and play Ambient Noise.
        - [x] Map `analysisParams.ambientNoiseType` to `WhiteNoisePlayer` settings.
        - [x] Use `analysisParams.acutonicsFrequency` to anchor/filter noise.
- [x] **Audio Playback Controls**
    - [x] Play/Pause/Stop functionality for generated audio (individual players and meditation audio now have stop logic).
    - [ ] Master volume control (optional).

## Phase 3: Guided Meditation Feature

- [x] **Deepseek API for Script Generation**
    - [x] Develop prompts for generating meditation scripts based on `analysisParams.meditationTheme`.
    - [x] UI for triggering script generation (automatic after intention analysis).
    - [x] Display generated script (optional, or for debugging - currently not displayed to user).
- [x] **ElevenLabs API Integration**
    - [x] Create utility function to call ElevenLabs API for TTS.
    - [x] Convert generated script to speech.
    - [x] Handle API responses and errors.
- [x] **Meditation Playback & Download**
    - [x] Integrate generated speech into the audio player.
    - [x] Implement download functionality for the audio file.

## Phase 4: UI/UX Refinement & Polish

- [x] **Visual Feedback & Loading States**
    - [x] Implement loading indicators for API calls (initial version done, refined for multi-step process).
    - [x] Provide clear feedback to the user for all states.
- [ ] **Responsiveness & Accessibility**
    - [ ] Ensure the application is responsive across different screen sizes.
    - [ ] Implement accessibility best practices.
- [x] **Error Handling**
    - [x] Basic error handling for API calls (initial version done, expanded for new API calls).
    - [x] Gracefully handle API errors, audio generation issues, etc.

## Phase 5: Progressive Web App (PWA) Implementation

- [x] **PWA Configuration**
    - [x] Install and configure vite-plugin-pwa.
    - [x] Create manifest file with appropriate settings.
    - [x] Add PWA meta tags to index.html.
- [x] **Icon Generation**
    - [x] Create spiral-themed icons for various sizes (16x16 to 512x512).
    - [x] Generate appropriate maskable icons.
    - [x] Create Apple touch icon (180x180).
- [x] **Offline Functionality**
    - [x] Configure service worker for offline support.
    - [x] Implement caching strategies for app assets.
    - [x] Implement caching strategies for audio files and API responses.

## Phase 6: Testing & Deployment (Future)

- [ ] **Thorough Testing**
    - [ ] Test all functionalities across different browsers.
    - [ ] User acceptance testing.
- [ ] **Build & Deployment**
    - [ ] Prepare for deployment (e.g., Netlify, Vercel).

## Notes & Research
- Acutonics Frequencies: Ohm (~136.10 Hz), New Moon (~210.42 Hz), Sun (~126.22 Hz), and others added.
- Deepseek Prompt Engineering: Prompts for intention analysis and script generation created.
- ElevenLabs Voice Selection: Default voice 'Rachel' (21m00Tcm4TlvDq8ikWAM) used.
```
