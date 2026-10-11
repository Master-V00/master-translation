
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '../services/supabaseClient';
import { TermReplacement } from '../types';

// وظيفة تنظيف المفتاح لزيادة الأمان ومنع الأخطاء الناتجة عن المسافات الزائدة
const cleanApiKey = (key: string) => {
  return key.trim().replace(/[\n\r]/g, '');
};

// === مفتاح المستخدم الشخصي (BYOK) ===
// يُحفظ في localStorage من نافذة الترحيب ويُستخدم مباشرة بدون المرور بجدول Supabase
export const USER_KEY_STORAGE = 'user_gemini_api_key';

export const getUserApiKey = (): string | null => {
  try {
    const k = localStorage.getItem(USER_KEY_STORAGE);
    return k && k.trim() ? cleanApiKey(k) : null;
  } catch {
    return null;
  }
};

export const setUserApiKey = (key: string) => {
  try {
    localStorage.setItem(USER_KEY_STORAGE, cleanApiKey(key));
  } catch {
    // storage unavailable: ignore
  }
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
  symbols: string | boolean,
  customTerms: TermReplacement[] = []
) => {
  
  // === إعداد قواعد التنسيق (Prompt Engineering) ===
  let symbolRules = "";
  let customSymbols: Record<string, string> = {};
  let rulesList = "";

  if (typeof symbols === 'string') {
    rulesList = symbols;

    symbolRules = `
    CUSTOM FORMATTING RULES (STRICT):
    You MUST use the exact symbols provided below as prefixes.
    DO NOT wrap the text with the symbol if it is not specified.
    
    ${rulesList}
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

  // === إعداد قواعد المصطلحات الخاصة ===
  let terminologyInstruction = "";
  if (customTerms && customTerms.length > 0) {
    const termRules = customTerms.map(t => `- IF found "${t.original}" (or variations), MUST be translated as "${t.replacement}"`).join('\n');
    terminologyInstruction = `
    CRITICAL TERMINOLOGY REPLACEMENT RULES (HIGHEST PRIORITY):
    You MUST strictly adhere to the following replacement rules during translation.
    If you encounter the "Original Word", replace its translation with the "Replacement Word".
    
    ${termRules}
    
    Check for these specific words and apply the replacements WITHOUT EXCEPTION.
    `;
  }

  const systemPrompt = `
    You are a professional Manga/Manhwa translator and typesetter assistant. 
    Your task is to analyze the provided image (Manga/Manhwa page), extract the text in its original language, and translate it into ${targetLanguage}.

    VISUAL CONTEXT & GENDER PRECISION:
    - CRITICAL: Look at the image to identify the GENDER of the speaker and the listener.
    - Use this visual context to ensure correct grammatical gender agreements.

    ${terminologyInstruction}

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

  // === مفتاح المستخدم أولاً (BYOK): محاولة مباشرة بدون Supabase ===
  // لو المستخدم حط مفتاحه من نافذة الترحيب، نستخدمه على طول ونتجاوز نظام التدوير
  const userKey = getUserApiKey();
  if (userKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: userKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
      const cleanedText = cleanupResultText(rawText);
      const jsonString = extractJsonFromText(cleanedText);
      return JSON.parse(jsonString);
    } catch (e) {
      console.warn("Personal key failed, falling back to shared rotation.", e);
    }
  }

  // === منطق إدارة المفاتيح (Locking & Rotation) ===
  const MAX_RETRIES = 20; // عدد محاولات البحث عن مفتاح
  let currentKeyId: number | null = null;
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // 1. البحث عن مفتاح متاح
      // الشروط: نشط + متاح + انتهى وقت القفل السابق (مر عليه الوقت)
      const nowISO = new Date().toISOString();
      
      const { data: candidates, error: fetchError } = await supabase
        .from('api_keys_status')
        .select('*')
        .eq('is_active', true)
        .eq('status_usage', 'available')
        .lt('status_in_use_until', nowISO) // التأكد أن تاريخ القفل السابق قد مر
        .order('id', { ascending: true })
        .limit(1);

      if (fetchError) throw fetchError;

      if (!candidates || candidates.length === 0) {
        // لا توجد مفاتيح متاحة حالياً، ننتظر قليلاً ثم نعيد المحاولة
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const candidate = candidates[0];
      
      // 2. قفل المفتاح (Locking)
      // نغير الحالة لـ in_use ونضع التاريخ المستقبلي (بعد دقيقة ونصف)
      const lockDurationMs = 90 * 1000; // 1.5 minutes
      const futureLockDate = new Date(Date.now() + lockDurationMs).toISOString();

      const { data: lockedKey, error: lockError } = await supabase
        .from('api_keys_status')
        .update({ 
          status_usage: 'in_use',
          status_in_use_until: futureLockDate 
        })
        .eq('id', candidate.id)
        .eq('status_usage', 'available') // Optimistic Concurrency Check
        .select()
        .single();

      // إذا فشل القفل (ربما أخذه شخص آخر في نفس اللحظة)، نعيد المحاولة
      if (lockError || !lockedKey) {
        continue;
      }

      currentKeyId = lockedKey.id;

      // 3. استخدام المفتاح
      const apiKey = cleanApiKey(lockedKey.key || lockedKey.key_value);
      const modelName = lockedKey.model_type || "gemini-3-flash-preview";

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

      // 4. تحرير المفتاح (Success Unlock)
      // نرجعه لـ available ونحدث التاريخ للوقت الحالي (ليصبح متاحاً فوراً للمحاولة التالية)
      await supabase
        .from('api_keys_status')
        .update({ 
          status_usage: 'available',
          status_in_use_until: new Date().toISOString()
        })
        .eq('id', currentKeyId);

      // معالجة النتيجة وإرجاعها
      const cleanedText = cleanupResultText(rawText);
      const jsonString = extractJsonFromText(cleanedText);
      return JSON.parse(jsonString);

    } catch (error: any) {
      lastError = error;
      const msg = error.message?.toLowerCase() || "";
      const isQuotaError = error.status === 429 || msg.includes("quota") || msg.includes("exhausted") || msg.includes("429");

      if (currentKeyId) {
        if (isQuotaError) {
          console.warn(`Key ID ${currentKeyId} exhausted (Quota). Deactivating...`);
          // 5. تعطيل المفتاح في حالة الكوتا (Error Handling - Quota)
          // نجعله is_active = false
          await supabase
            .from('api_keys_status')
            .update({ 
              is_active: false, // تعطيل المفتاح
              status_usage: 'available', // تحرير القفل لعدم تعليق النظام
              status_in_use_until: new Date().toISOString()
            })
            .eq('id', currentKeyId);
        } else {
          // 6. تحرير المفتاح عند أخطاء أخرى (Network, Parsing, etc.)
          await supabase
            .from('api_keys_status')
            .update({ 
              status_usage: 'available',
              status_in_use_until: new Date().toISOString()
            })
            .eq('id', currentKeyId);
        }
      }

      // إذا كان خطأ كوتا، نحاول فوراً مع مفتاح آخر.
      // إذا كان خطأ آخر، ننتظر قليلاً (Backoff)
      if (!isQuotaError) {
        await new Promise(r => setTimeout(r, 1000));
      }
      
      currentKeyId = null; // Reset for next iteration
    }
  }

  throw lastError || new Error("Failed to translate after multiple attempts (No valid keys or persistent errors).");
};

/**
 * دالة تصميم الأغلفة (Cover Design)
 * تم تعديلها لتجلب المفتاح من جدول api_messages وتستخدم OpenRouter
 */
export const generateCoverDesign = async (
  base64Image: string,
  mimeType: string,
  customTitle: string,
  targetLanguage: string
): Promise<string> => {
  try {
    // 1. جلب مفتاح OpenRouter من جدول api_messages
    const { data: apiData, error: fetchError } = await supabase
      .from('api_messages')
      .select('api')
      .eq('id', 1)
      .maybeSingle();

    if (fetchError || !apiData?.api) {
      throw new Error("Failed to fetch API key from api_messages table");
    }

    const apiKey = apiData.api.trim();

    const prompt = `
      You are an expert manga typesetter and graphic designer.
      Your task is to REDESIGN the title of this manga cover.
      
      INSTRUCTIONS:
      1. Identify the main title text in the image (usually large, styled text).
      2. REMOVE the original title completely (inpainting).
      3. INSERT the new title: "${customTitle ? customTitle : `(Translate the original title to ${targetLanguage})`}".
      4. STYLE MATCHING: The new title MUST match the original title's typography, color, 3D effects, shadows, and overall aesthetic.
      5. Cleanliness: Ensure the background behind the removed text is reconstructed seamlessly.
      
      Return ONLY the image.
    `;

    // 2. استدعاء OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Master Translation",
      },
      body: JSON.stringify({
        "model": "google/gemini-2.5-flash-image-preview",
        "messages": [
          {
            "role": "user",
            "content": [
              { "type": "text", "text": prompt },
              { "type": "image_url", "image_url": { "url": `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error?.message || "OpenRouter API request failed");
    }

    const data = await response.json();
    
    // 3. استخراج الصورة من الرد
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("Empty response from AI");

    // بعض النماذج قد تعيد الصورة كـ Markdown أو كـ URL مباشر أو Base64
    // سنحاول استخراج رابط البيانات إذا كان موجوداً
    const dataUriMatch = content.match(/data:image\/[a-zA-Z]*;base64,[^\s\)]*/);
    if (dataUriMatch) {
      return dataUriMatch[0];
    }

    // إذا لم يكن Data URI، نفترض أن الـ content نفسه هو الرابط أو يحتوي عليه
    if (content.includes('http')) {
      const urlMatch = content.match(/https?:\/\/[^\s\)]+/);
      if (urlMatch) return urlMatch[0];
    }

    throw new Error("No image generated in response content");

  } catch (error: any) {
    console.error("Cover Design Error:", error);
    throw error;
  }
};
