/**
 * LibreTranslate API integration for translating character prompts
 * Uses libretranslate.com public API with language detection
 */

const LIBRETRANSLATE_API_URL = 'https://libretranslate.com/translate';
const DETECT_API_URL = 'https://libretranslate.com/detect';

interface TranslateResponse {
  translatedText: string;
}

interface DetectResponse {
  confidence: number;
  language: string;
}

/**
 * Detect the language of a given text
 */
export async function detectLanguage(text: string): Promise<string> {
  try {
    const response = await fetch(DETECT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text
      })
    });

    if (!response.ok) {
      throw new Error(`Language detection failed: ${response.status}`);
    }

    const result: DetectResponse[] = await response.json();
    
    // Return the most confident detection
    if (result && result.length > 0) {
      return result[0].language;
    }
    
    // Default to English if detection fails
    return 'en';
  } catch (error) {
    console.warn('Language detection failed, defaulting to English:', error);
    return 'en';
  }
}

/**
 * Translate text to English using LibreTranslate
 */
export async function translateToEnglish(text: string, sourceLanguage?: string): Promise<string> {
  try {
    // If no source language provided, detect it first
    const sourceLang = sourceLanguage || await detectLanguage(text);
    
    // If already English, return as-is
    if (sourceLang === 'en') {
      return text;
    }

    const response = await fetch(LIBRETRANSLATE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: 'en',
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const result: TranslateResponse = await response.json();
    return result.translatedText;
  } catch (error) {
    console.warn('Translation failed, using original text:', error);
    // Return original text if translation fails
    return text;
  }
}

/**
 * Smart translation function that only translates if needed
 * Includes simple English detection to avoid unnecessary API calls
 */
export async function smartTranslateToEnglish(text: string): Promise<string> {
  // Quick check for obvious English patterns to save API calls
  const englishWords = ['the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'a', 'an'];
  const textLower = text.toLowerCase();
  const englishWordCount = englishWords.filter(word => textLower.includes(` ${word} `) || textLower.startsWith(`${word} `) || textLower.endsWith(` ${word}`)).length;
  
  // If text contains multiple English words, likely already English
  if (englishWordCount >= 2) {
    return text;
  }
  
  // For short texts (names, etc.), don't translate
  if (text.trim().split(' ').length <= 2) {
    return text;
  }
  
  // Otherwise, detect and translate if needed
  return await translateToEnglish(text);
}