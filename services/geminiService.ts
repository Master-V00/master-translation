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

export const translateMangaPage = async (base64Image: string, mimeType: string, targetLanguage: string, useSymbols: boolean) => {
  const symbolRules = `
    CRITICAL FORMATTING RULES FOR TRANSLATION:
    You must use the exact symbols below as PREFIXES. 
    DO NOT wrap the text with the symbol. 
    DO NOT add closing quotation marks if the symbol is a quote.
    
    1. "": [Text] -> Normal Speech. 
       - CORRECT: "": Hello there.
       - WRONG: "Hello there."
    
    2. (): [Text] -> Thoughts. 
       - Includes standard thought bubbles AND "Sun-shaped" / "Spiky" bubbles (often internal shock or realization).
       - CORRECT: (): I can't believe it.
       - WRONG: (I can't believe it)
    
    3. :: [Text] -> Shout / Scream.
       - CORRECT: :: RUN AWAY!
       - WRONG: ::RUN AWAY!::
    
    4. []: [Text] -> Boxes (Square narration boxes).
       - CORRECT: []: Meanwhile...
    
    5. OT: [Text] -> Outside Text (Narration floating on background, titles).
    
    6. ST: [Text] -> Small Text. 
       - RESTRICTION: ONLY use this for character muttering, breathing (sigh), or literal small text written next to a character.
       - DO NOT use this for Sound Effects.
    
    7. SFX: [Text] -> Sound Effects.
       - REQUIREMENT: ANY sound effect (Boom, Crash, Whoosh), regardless of size, MUST use SFX. Do not use ST for sounds.
    
    8. <>: [Text] -> System (Game windows, notifications).
    
    9. //: [Text] -> Connected Bubbles.
       - Use this when a sentence is split across multiple bubbles visually connected (e.g., by a tail).
       - The FIRST bubble gets the normal symbol (e.g., "":).
       - The SECOND/THIRD bubbles get //:
       - Example:
         "": Wait a minute,
         //: did you just say that?
    `;

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
    - CRITICAL: Look at the image to identify the GENDER of the speaker and the listener (based on appearance, clothing, etc.).
    - Use this visual context to ensure correct grammatical gender agreements, pronouns, and forms of address in the translation. This is extremely important for languages like Arabic, French, and German.

    TRANSLATION STYLE:
    - GENERAL: Do not change the original meaning of the text. Do not add words that are not in the source.
    
    - IF TARGET IS ENGLISH: 
       1. NATURAL & CASUAL: Translate into natural, smooth daily conversation typical of Manga/Manhwa. Avoid stiff, robotic, or overly literal translations.
       2. CONTRACTIONS: You MUST use contractions to facilitate reading flow (e.g., use "I'm" instead of "I am", "don't" instead of "do not", "it's" instead of "it is").
       3. NUANCE: Capture small expressions, interjections, and feelings naturally (e.g., "uh...", "haha", "oops", "tsk") as they appear in the flow of speech.
       4. STRICT ACCURACY: Maintain strict accuracy with pronouns and gender, but ensure the vocabulary is simple and accessible.

    ${formattingInstruction}
    
    CRITICAL TEXT PROCESSING RULES:
    1. SINGLE LINE PER BUBBLE: If the text inside a SINGLE bubble is split into multiple lines in the image, you MUST join them into a single line in the output.
       - Image: "Hello\nWorld" -> Output: "": Hello World
       - Do NOT output: "": Hello\nWorld
    
    2. SEPARATION: Add a DOUBLE LINE BREAK (\n\n) between every distinct bubble/segment.

    OUTPUT REQUIREMENT:
    - Return a JSON object.
    - 'extracted': The raw text in the source language.
    - 'translated': The ${targetLanguage} translation applying the formatting rules above.
    `;

  // Try loop for API key rotation
  let lastError: any;
  
  // We try at most as many times as we have keys to avoid infinite loops if all fail,
  // or a fixed number of retries. Here we iterate through all available keys if needed.
  // We use a simple counter to break, but the rotation is global.
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
              text: `Extract and translate to ${targetLanguage}. Ensure NO newlines inside a single bubble text. Use strict formatting rules.`,
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

      // Check for quota/rate limit errors
      const isQuotaError = 
        error.status === 429 || 
        error.status === 503 ||
        (error.message && (
          error.message.includes("429") || 
          error.message.includes("Quota") || 
          error.message.includes("quota") ||
          error.message.includes("exhausted") ||
          error.message.includes("Resource has been exhausted")
        ));

      if (isQuotaError && apiKeys.length > 1) {
        console.warn("Quota exhausted for current key. Rotating key...");
        rotateKey();
        continue; // Retry with next key
      }

      // If it's not a quota error, or we ran out of keys, throw the error
      throw error;
    }
  }
  
  throw lastError;
};