const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export type VoiceProfile = 
  | 'calm_female_gentle' 
  | 'soothing_male_deep' 
  | 'clear_female_neutral' 
  | 'warm_male_reassuring'
  // | 'uplifting_female_bright' // Potentially too energetic for most meditations
  | 'default';

export interface IntentionAnalysisParameters {
  primaryGoal: string; // e.g., "relaxation", "focus", "sleep", "energy"
  binauralBeatFrequency: number; // e.g., 10 (for Alpha), 4 (for Delta)
  acutonicsFrequency: number; // e.g., 136.10 (Ohm), 210.42 (New Moon)
  ambientNoiseType: 'white' | 'brown' | 'pink' | 'none'; // Type of noise
  meditationTheme: string; // Keywords or a short theme for the script
  suggestedVoiceProfile: VoiceProfile; // New: Suggested voice profile
  rawResponse?: string; // Store the raw LLM response for debugging
}

export async function analyzeIntention(intention: string): Promise<IntentionAnalysisParameters | null> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error("Deepseek API key is not configured.");
    throw new Error("Deepseek API key is missing. Please check your .env file (ensure it's VITE_DEEPSEEK_API_KEY).");
  }

  const systemPrompt = `
You are an expert audio therapist and meditation guide.
Your task is to analyze a user's stated intention and return a JSON object with parameters for generating a personalized audio session.
The JSON object must follow this structure:
{
  "primaryGoal": "string (e.g., relaxation, focus, sleep, energy, creativity, stress relief, insight, spiritual exploration)",
  "binauralBeatFrequency": "number (target beat frequency in Hz. Use ranges: Delta (1-3Hz) for deep sleep; Theta (4-7Hz) for deep relaxation/meditation; Alpha (8-13Hz) for light relaxation/meditation/creativity. Beta (14-30Hz) ONLY for active thinking, problem-solving, or focused wakefulness - AVOID for relaxation/sleep. Gamma (30-45Hz, e.g., 40Hz) for peak awareness, insight, or if the user's intention strongly suggests psychic phenomena, astral travel, or heightened consciousness exploration. Default to Alpha (e.g., 10Hz) if unsure but relaxation is implied.)",
  "acutonicsFrequency": "number (one of these specific Acutonics frequencies: 136.10 for grounding/Ohm, 210.42 for new beginnings/New Moon, 126.22 for vitality/Sun. Choose the most relevant or default to 136.10 if unsure)",
  "ambientNoiseType": "string (choose one: 'white', 'pink', 'brown', or 'none'. Pink/Brown are generally better for relaxation/sleep. Choose 'none' if the intention is very specific and noise might be distracting)",
  "meditationTheme": "string (a concise theme or 2-3 keywords for a guided meditation script, e.g., 'letting go of tension', 'enhancing mental clarity', 'deep restful sleep', 'exploring inner wisdom')",
  "suggestedVoiceProfile": "string (Generally prefer female voices: 'calm_female_gentle', 'clear_female_neutral'. Use 'warm_male_reassuring' or 'soothing_male_deep' only if the intention strongly suggests a male voice is more appropriate (e.g., 'deep male voice for grounding') or for very specific goals like deep sleep induction where a deep male voice might be a better fit. Use 'default' (which maps to a female voice) if unsure. Available: 'calm_female_gentle', 'soothing_male_deep', 'clear_female_neutral', 'warm_male_reassuring', 'default')"
}

Analyze the user's intention and provide the parameters in the specified JSON format.
Only output the JSON object. Do not include any other text, greetings, or explanations.
If the intention is unclear or too vague, try to infer a common goal like 'general relaxation' and provide default parameters.

Example user intention: "I need to sharpen my mind for an upcoming exam and stay awake while studying."
Example JSON output:
{
  "primaryGoal": "focus and wakefulness",
  "binauralBeatFrequency": 18,
  "acutonicsFrequency": 141.27,
  "ambientNoiseType": "white",
  "meditationTheme": "enhancing mental clarity, sustained focus",
  "suggestedVoiceProfile": "clear_female_neutral"
}

Example user intention: "I want to explore my psychic abilities and connect with higher realms."
Example JSON output:
{
  "primaryGoal": "spiritual exploration and insight",
  "binauralBeatFrequency": 40,
  "acutonicsFrequency": 210.42,
  "ambientNoiseType": "pink",
  "meditationTheme": "expanding consciousness, connecting to higher self, intuitive exploration",
  "suggestedVoiceProfile": "calm_female_gentle"
}
`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: intention },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Deepseek API Error (analyzeIntention):', response.status, errorBody);
      throw new Error(`Deepseek API request failed (analyzeIntention) with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
      const content = data.choices[0].message.content;
      try {
        const parsedParams: IntentionAnalysisParameters = JSON.parse(content);
        // Ensure a default voice profile if somehow missing from LLM response
        if (!parsedParams.suggestedVoiceProfile) {
            parsedParams.suggestedVoiceProfile = 'default';
        }
        // Validate voice profile against our defined types, default if invalid
        const validVoiceProfiles: VoiceProfile[] = ['calm_female_gentle', 'soothing_male_deep', 'clear_female_neutral', 'warm_male_reassuring', 'default'];
        if (!validVoiceProfiles.includes(parsedParams.suggestedVoiceProfile)) {
            console.warn(`LLM suggested an invalid voice profile: ${parsedParams.suggestedVoiceProfile}. Defaulting.`);
            parsedParams.suggestedVoiceProfile = 'default';
        }

        parsedParams.rawResponse = content;
        return parsedParams;
      } catch (e) {
        console.error("Failed to parse JSON from Deepseek response (analyzeIntention):", content, e);
        return { 
            primaryGoal: "Error: Could not parse LLM response", 
            binauralBeatFrequency: 10, 
            acutonicsFrequency: 136.10, 
            ambientNoiseType: 'pink', 
            meditationTheme: "general relaxation",
            suggestedVoiceProfile: 'default', // Default voice profile on error
            rawResponse: content 
        };
      }
    } else {
      console.error("Invalid response structure from Deepseek (analyzeIntention):", data);
      return null;
    }
  } catch (error) {
    console.error('Error calling Deepseek API (analyzeIntention):', error);
    throw error;
  }
}

export async function generateMeditationScript(theme: string, originalUserIntention: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error("Deepseek API key is not configured.");
    throw new Error("Deepseek API key is missing. Please check your .env file (ensure it's VITE_DEEPSEEK_API_KEY).");
  }

  const systemPrompt = `
You are an expert meditation scriptwriter.
Your task is to generate a calming guided meditation script. This script must be deeply rooted in the provided "Theme from user's intention" AND the "Original User Intention".
The goal is to make the user feel heard by explicitly incorporating and expanding upon the keywords and sentiments from the theme, AND by echoing any particularly relevant or poignant words/phrases from the "Original User Intention" if they add depth or personalization.
The script should be approximately 3500-4000 words, suitable for a meditation session of around 20-25 minutes, considering a calm speaking pace with pauses.
It should have a clear beginning (e.g., settling in, focusing on breath), middle (exploring the theme, visualization, deepening relaxation related to the theme and original intention), and end (e.g., gentle return to awareness, carrying the theme's positive aspects forward).

CRITICAL INSTRUCTIONS FOR PACING AND TONE:
- Write in short, simple sentences.
- Incorporate natural pauses using the specific XML-like tag: <break time="Xs" /> where X is the duration in seconds (e.g., <break time="1s" />, <break time="1.5s" />, <break time="2s" />). Use these tags frequently to indicate where the speaker should pause.
- DO NOT use ellipses (...) or descriptive text like "(short pause)" or "(pause here)" to indicate pauses. ONLY use the <break time="Xs" /> tag.
- The overall tone should be very calm, gentle, and encourage slow, intentional listening.
- Avoid complex vocabulary or long, run-on sentences.
- The language should be soothing and vivid, directly relating to the theme and original intention.

CRITICAL: The meditation script MUST directly address and weave in the specifics of the theme throughout. If the "Original User Intention" contains specific phrasing that captures the user's state or desire well, try to naturally incorporate or reflect those exact words or phrases. It should feel as though it's responding directly to what the user expressed.

Theme from user's intention (a summary/keywords): "${theme}"
Original User Intention (the user's full raw message): "${originalUserIntention}"

For example, if the theme is "finding peace amidst chaos" and the original intention was "I'm so overwhelmed by work emails and the kids screaming, I just need to find some peace amidst this chaos.", the script could include:
"Acknowledge that feeling of being overwhelmed... perhaps by work, by the sounds around you, the daily pressures. <break time="1s" /> Let those specific thoughts of emails or the day's noises just be. <break time="1.5s" /> We're here to find that island of peace, your center, even when chaos seems to swirl..."

Output only the script text itself. Do not include any other text, greetings, titles, or explanations like "Here is the script:". Just the pure script.
`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat', 
        messages: [
          { role: 'system', content: systemPrompt },
          // No user message needed here as the theme is embedded in the system prompt
        ],
        temperature: 0.7, // Slightly more creative for script writing
        // response_format: { type: "text" } // Expecting plain text
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Deepseek API Error (generateMeditationScript):', response.status, errorBody);
      throw new Error(`Deepseek API request failed (generateMeditationScript) with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
      return data.choices[0].message.content.trim();
    } else {
      console.error("Invalid response structure from Deepseek (generateMeditationScript):", data);
      return null;
    }
  } catch (error)
 {
    console.error('Error calling Deepseek API (generateMeditationScript):', error);
    throw error;
  }
}
