
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '../services/supabaseClient';

// وظيفة تنظيف المفتاح لزيادة الأمان ومنع الأخطاء الناتجة عن المسافات الزائدة
const cleanApiKey = (key: string) => {
  return key.trim().replace(/[\n\r]/g, '');
};

const cleanupResultText = (s: string) => {
  if (!s || typeof s !== 'string') return '';
  // إزالة أسوار Markdown والكلمات الزائدة
  return s.replace(/```json/gi, '').replace(/```/g, '').replace(/^s*Response:\s*/i, '').trim();
};

const extractJsonFromText = (s: string) => {
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('NO_JSON_IN_RESPONSE');
  return s.slice(start, end + 1);
};

/**
 * تعريف هيكل البيانات (JSON Schema) لضمان استلام رد منظم
 */
const translationSchema = {
  type: Type.OBJECT,
  properties: {
    extracted: { 
      type: Type.STRING,
      description: "The raw text extracted from the image in its original language." 
    },
    translated: { 
      type: Type.STRING,
      description: "The translated text formatted with the specific symbols requested." 
    },
  },
  required: ["extracted", "translated"],
};

/**
 * الدالة الأساسية لترجمة صفحة مانجا/مانهوا
 */
export const translateMangaPage = async (
  base64Image: string, 
  mimeType: string, 
  targetLanguage: string, 
  symbols: string | boolean 
) => {
  
  // === إعداد قواعد التنسيق (Prompt Engineering) ===
  let symbolRules = "";
  let customSymbols: Record<string, string> = {};
  let rulesList = "";

  if (typeof symbols === 'string') {
    try {
      customSymbols = JSON.parse(symbols);
      rulesList = Object.entries(customSymbols)
        .map(([k, v]) => `${k} [Text] -> ${v}`)
        .join('\n    ');
    } catch (e) {
      console.error("Error parsing symbols", e);
    }

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

  const formattingInstruction = (symbols !== false) ? symbolRules : plainRules;

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

  // === منطق البحث التسلسلي عن المفاتيح (Sequential Key Search) ===
  
  // 1. جلب جميع المفاتيح النشطة من قاعدة البيانات مرتبة
  const { data: keys, error: fetchError } = await supabase
    .from('api_keys_status')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true });

  if (fetchError) throw new Error(`Failed to fetch keys: ${fetchError.message}`);
  if (!keys || keys.length === 0) throw new Error("No active API keys found in database.");

  let lastError: any = null;

  // 2. المحاولة مع كل مفتاح بالتسلسل
  for (const keyData of keys) {
    try {
      // تنظيف المفتاح
      const apiKey = cleanApiKey(keyData.key || keyData.key_value);
      
      // استخدام اسم الموديل من قاعدة البيانات، أو الافتراضي إذا لم يوجد
      const modelName = keyData.model_type || "gemini-2.5-flash"; 

      // تهيئة المكتبة محلياً (Direct Client-Side)
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          role: "user",
          parts: [
            { inlineData: { data: base64Image, mimeType: mimeType } },
            { text: `Extract and translate to ${targetLanguage}.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: translationSchema,
          temperature: 0.3,
          systemInstruction: systemPrompt,
        },
      });

      const rawText = response.text;
      if (!rawText) throw new Error("Empty response from AI");

      // تنظيف واستخراج الـ JSON
      const cleanedText = cleanupResultText(rawText);
      const jsonString = extractJsonFromText(cleanedText);
      return JSON.parse(jsonString);

    } catch (error: any) {
      console.warn(`Key ID ${keyData.id} (${keyData.model_type}) failed:`, error.message);
      lastError = error;

      // إذا كان الخطأ بسبب الحظر (Rate Limit)، يمكننا فقط تخطيه وتجربة المفتاح التالي
      // لا نقوم بتعقيد الأمور بحجز أو قفل المفاتيح كما طلبت (Light Protection)
      continue;
    }
  }

  // إذا فشلت كل المفاتيح
  throw lastError || new Error("All API keys failed to generate content.");
};
