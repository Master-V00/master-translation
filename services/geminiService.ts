
import { GoogleGenAI, Schema, Type } from "@google/genai";

// Gather all available API keys from environment variables
// Supports individual variables (API_KEY, API_KEY_2...) and comma-separated lists
const getApiKeys = () => {
  const keys: string[] = [
    process.env.API_KEY,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5,
  ]
  .filter((k): k is string => !!k && k.trim().length > 0)
  .flatMap(k => k.split(',').map(s => s.trim()))
  .filter(k => k.length > 0);

  // Remove duplicates
  return [...new Set(keys)];
};

const apiKeys = getApiKeys();
let currentKeyIndex = 0;

const getAIClient = () => {
  if (apiKeys.length === 0) {
    throw new Error("No API keys found. Please set API_KEY in your environment.");
  }
  return new GoogleGenAI({ apiKey: apiKeys[currentKeyIndex] });
};

const rotateKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  console.log(`Switching API key to index ${currentKeyIndex}`);
};

// Define the response schema to ensure we get separated extracted and translated text
const translationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    extracted: {
      type: Type.STRING,
      description: "The raw text extracted from the image in the original language (Korean/Chinese/Japanese).",
    },
    translated: {
      type: Type.STRING,
      description: "The translated text formatted with the specific symbols requested.",
    },
  },
  required: ["extracted", "translated"],
};

export const translateMangaPage = async (
  base64Image: string, 
  mimeType: string, 
  targetLanguage: string, 
  useSymbols: boolean,
  customSymbols?: Record<string, string>
) => {
  
  let symbolRules = '';

  if (customSymbols && Object.keys(customSymbols).length > 0) {
    // Generate rules from custom symbols map
    const rulesList = Object.entries(customSymbols)
      .map(([symbol, desc]) => `   ${symbol} [Text] -> ${desc}`)
      .join('\n');

    symbolRules = `
    CUSTOM FORMATTING RULES (STRICT):
    You MUST use the exact symbols provided below as prefixes.
    DO NOT wrap the text with the symbol if it is not specified.
    
    ${rulesList}
    
    Examples of usage based on your provided keys:
    ${Object.keys(customSymbols)[0] || 'Example'}: Hello World
    `;
  } else {
    // Default Rules
    symbolRules = `
    CRITICAL FORMATTING RULES FOR TRANSLATION:
    You must use the exact symbols below as PREFIXES. 
    DO NOT wrap the text with the symbol. 
    DO NOT add closing quotation marks if the symbol is a quote.
    
    1. "": [Text] -> Normal Speech. 
       - CORRECT: "": Hello there.
       - WRONG: "Hello there."
    
    2. (): [Text] -> Thoughts. 
       - Includes standard thought bubbles AND "Sun-shaped" / "Spiky" bubbles.
       - CORRECT: (): I can't believe it.
    
    3. :: [Text] -> Shout / Scream.
       - CORRECT: :: RUN AWAY!
    
    4. []: [Text] -> Boxes (Square narration boxes).
       - CORRECT: []: Meanwhile...
    
    5. OT: [Text] -> Outside Text (Narration floating on background, titles).
    
    6. ST: [Text] -> Small Text (Muttering, sighs).
    
    7. SFX: [Text] -> Sound Effects.
    
    8. <>: [Text] -> System (Game windows).
    
    9. //: [Text] -> Connected Bubbles.
       - Example:
         "": Wait a minute,
         //: did you just say that?
    `;
  }

  const plainRules = `
    FORMATTING RULES:
    - Do NOT use specific prefixes like "":, ():, [], etc.
    - Just provide the translated text.
    `;

  const formattingInstruction = useSymbols ? symbolRules : plainRules;

  const systemPrompt = `
    You are a professional Manga/Manhwa translator and typesetter assistant. 
    Your task is to analyze the provided image (Manga/Manhwa page), extract the text in its original language, and translate it into ${targetLanguage}.

    VISUAL CONTEXT & GENDER PRECISION:
    - CRITICAL: Look at the image to identify the GENDER of the speaker and the listener.
    - Use this visual context to ensure correct grammatical gender agreements.

    TRANSLATION STYLE:
    - GENERAL: Do not change the original meaning of the text.
    
    - IF TARGET IS ENGLISH: 
       1. NATURAL & CASUAL.
       2. Use contractions (I'm, don't).
       3. Nuance (uh..., haha, oops).

    ${formattingInstruction}
    
    CRITICAL TEXT PROCESSING RULES:
    1. SINGLE LINE PER BUBBLE: If text inside a bubble is split, join it.
    2. SEPARATION: Add a DOUBLE LINE BREAK (\n\n) between every distinct bubble/segment.

    OUTPUT REQUIREMENT:
    - Return a JSON object.
    - 'extracted': The raw text.
    - 'translated': The ${targetLanguage} translation.
    `;

  // Try loop for API key rotation
  let lastError: any;
  const maxAttempts = Math.max(1, apiKeys.length);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const ai = getAIClient();
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: translationSchema,
          temperature: 0.3, 
        },
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            {
              text: `Extract and translate to ${targetLanguage}. Ensure NO newlines inside a single bubble text.`,
            },
          ],
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");

      return JSON.parse(text);

    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed with key index ${currentKeyIndex}:`, error);
      lastError = error;

      const isQuotaError = 
        error.status === 429 || 
        error.status === 503 ||
        (error.message && (
          error.message.includes("429") || 
          error.message.includes("Quota") || 
          error.message.includes("quota") ||
          error.message.includes("exhausted")
        ));

      if (isQuotaError && apiKeys.length > 1) {
        console.warn("Quota exhausted for current key. Rotating key...");
        rotateKey();
        continue; // Retry with next key
      }
      throw error;
    }
  }
  
  throw lastError;
};
