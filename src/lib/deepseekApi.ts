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
  "primaryGoal": "string (e.g., relaxation, focus, sleep, energy, creativity, stress relief)",
  "binauralBeatFrequency": "number (target beat frequency in Hz, e.g., 4 for sleep, 7 for deep relaxation, 10 for light relaxation/meditation, 15 for focus, 25 for problem solving)",
  "acutonicsFrequency": "number (one of these specific Acutonics frequencies: 136.10 for grounding/Ohm, 210.42 for new beginnings/New Moon, 126.22 for vitality/Sun. Choose the most relevant or default to 136.10 if unsure)",
  "ambientNoiseType": "string (choose one: 'white', 'pink', 'brown', or 'none'. Pink/Brown are generally better for relaxation/sleep than pure white. Choose 'none' if the intention is very specific and noise might be distracting, e.g. pure focus on a task)",
  "meditationTheme": "string (a concise theme or 2-3 keywords for a guided meditation script, e.g., 'letting go of tension', 'enhancing mental clarity', 'deep restful sleep')",
  "suggestedVoiceProfile": "string (choose one: 'calm_female_gentle', 'soothing_male_deep', 'clear_female_neutral', 'warm_male_reassuring', or 'default'. Select based on the primaryGoal and overall tone. E.g., 'sleep' might get 'soothing_male_deep', 'focus' might get 'clear_female_neutral', general relaxation 'calm_female_gentle'. Use 'default' if unsure or for very general intentions.)"
}

Analyze the user's intention and provide the parameters in the specified JSON format.
Only output the JSON object. Do not include any other text, greetings, or explanations.
If the intention is unclear or too vague to determine specific parameters, try to infer a common goal like 'general relaxation' and provide default parameters, including 'default' for suggestedVoiceProfile.
Example user intention: "I want to relax and de-stress after a long day."
Example JSON output:
{
  "primaryGoal": "stress relief",
  "binauralBeatFrequency": 8,
  "acutonicsFrequency": 136.10,
  "ambientNoiseType": "pink",
  "meditationTheme": "releasing daily stress, finding calm",
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

export async function generateMeditationScript(theme: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error("Deepseek API key is not configured.");
    throw new Error("Deepseek API key is missing. Please check your .env file (ensure it's VITE_DEEPSEEK_API_KEY).");
  }

  const systemPrompt = `
You are an expert meditation scriptwriter.
Your task is to generate a short, calming guided meditation script based on the following theme.
The script should be approximately 150-250 words.
It should have a clear beginning (e.g., settling in, focusing on breath), middle (exploring the theme, visualization), and end (e.g., gentle return to awareness, carrying peace forward).

CRITICAL INSTRUCTIONS FOR PACING AND TONE:
- Write in short, simple sentences.
- Incorporate natural pauses using the specific XML-like tag: <break time="Xs" /> where X is the duration in seconds (e.g., <break time="1s" />, <break time="1.5s" />, <break time="2s" />). Use these tags frequently to indicate where the speaker should pause.
- DO NOT use ellipses (...) or descriptive text like "(short pause)" or "(pause here)" to indicate pauses. ONLY use the <break time="Xs" /> tag.
- The overall tone should be very calm, gentle, and encourage slow, intentional listening.
- Avoid complex vocabulary or long, run-on sentences.
- The language should be soothing and vivid.

Focus primarily on the provided theme.
Output only the script text itself. Do not include any other text, greetings, titles, or explanations like "Here is the script:". Just the pure script.

Theme: "${theme}"

Example of desired pacing and style using the correct pause tag:
"Begin by finding a comfortable position. <break time="1s" /> Settle in. <break time="1.5s" /> Close your eyes gently. <break time="1s" /> Notice your breath. <break time="0.5s" /> Inhale deeply. <break time="1s" /> and exhale slowly. <break time="1.5s" /> Feel the tension leaving your body. <break time="1s" /> with each breath out. <break time="2s" />"
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
