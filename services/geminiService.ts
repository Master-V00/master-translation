import { GoogleGenAI, Schema, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      description: "The English translation formatted with the specific symbols requested.",
    },
  },
  required: ["extracted", "translated"],
};

export const translateMangaPage = async (base64Image: string, mimeType: string) => {
  try {
    const systemPrompt = `
    You are a professional Manga/Manhwa translator and typesetter assistant. 
    Your task is to analyze the provided image (Manga/Manhwa page), extract the text in its original language, and translate it into English.

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
    
    CRITICAL TEXT PROCESSING RULES:
    1. SINGLE LINE PER BUBBLE: If the text inside a SINGLE bubble is split into multiple lines in the image, you MUST join them into a single line in the output.
       - Image: "Hello\nWorld" -> Output: "": Hello World
       - Do NOT output: "": Hello\nWorld
    
    2. SEPARATION: Add a DOUBLE LINE BREAK (\n\n) between every distinct bubble/segment.

    OUTPUT REQUIREMENT:
    - Return a JSON object.
    - 'extracted': The raw text in the source language.
    - 'translated': The English text applying the strict prefix rules above.
    `;

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
            text: "Extract and translate. Ensure NO newlines inside a single bubble text. Use strict prefix formatting.",
          },
        ],
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
};