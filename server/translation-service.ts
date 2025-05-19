import * as deepl from 'deepl-node';
import { Request, Response } from 'express';

// Initialize DeepL translator with API key from environment variables
const translator = new deepl.Translator(process.env.DEEPL_API_KEY || '');

interface TranslationRequest {
  texts: string[];
  targetLang: string;
  sourceLang?: string;
}

// Version that can be called programmatically without using request/response objects
export async function translateTextsInternal(
  texts: string[],
  targetLang: string,
  sourceLang?: string
): Promise<string[]> {
  try {
    // Validate input data
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      throw new Error('Invalid input: texts should be a non-empty array');
    }
    
    if (!targetLang) {
      throw new Error('Invalid input: targetLang is required');
    }
    
    // Special handling for Arabic as target language with DeepL
    if (targetLang.toLowerCase() === 'ar') {
      // For Arabic, always use 'EN-US' as source to avoid errors
      const results = await translator.translateText(
        texts,
        'EN-US' as deepl.SourceLanguageCode,
        'AR' as deepl.TargetLanguageCode
      );
      
      // Extract translated text from results
      return results.map(result => result.text);
    }
    
    // For other languages, use the normal mapping but handle source language carefully
    const mappedTargetLang = mapToDeeplLangCode(targetLang);
    
    // Default to English as source if not specified
    // This is important because DeepL has strict requirements for source language codes
    const safeSourceLang = sourceLang || 'en';
    
    // Always use EN-US as source to avoid DeepL errors
    // Translate texts
    const results = await translator.translateText(
      texts,
      'EN-US' as deepl.SourceLanguageCode,
      mappedTargetLang as deepl.TargetLanguageCode
    );
    
    // Extract translated text from results
    return results.map(result => result.text);
  } catch (error) {
    console.error('DeepL translation error:', error);
    throw error;
  }
}

// API endpoint version that uses request/response
export async function translateTexts(req: Request, res: Response, directInput?: TranslationRequest) {
  try {
    // Use either direct input or request body
    const data = directInput || req.body as TranslationRequest;
    const { texts, targetLang, sourceLang } = data;
    
    // If direct input is provided, just do the translation and return the results
    if (directInput) {
      try {
        const results = await translateTextsInternal(texts, targetLang, sourceLang);
        return results;
      } catch (error) {
        throw error;
      }
    }
    
    // Request validation for API endpoint use
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid input: texts should be a non-empty array' 
      });
    }
    
    if (!targetLang) {
      return res.status(400).json({ 
        error: 'Invalid input: targetLang is required' 
      });
    }
    
    // Translate texts using the internal function
    try {
      const translatedTexts = await translateTextsInternal(texts, targetLang, sourceLang);
      
      // Return translated texts
      return res.json({ translatedTexts });
    } catch (error) {
      console.error('Translation error in endpoint:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown translation error' 
      });
    }
  } catch (error) {
    console.error('DeepL translation error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown translation error' 
    });
  }
}

// Helper to map ISO language codes to DeepL language codes
function mapToDeeplLangCode(langCode: string): string {
  // Convert to lowercase for consistent handling
  const code = langCode.toLowerCase();
  
  // Special case mappings
  const langMap: Record<string, string> = {
    'en': 'EN-US',   // Default to American English
    'de': 'DE',      // German
    'fr': 'FR',      // French
    'es': 'ES',      // Spanish
    'it': 'IT',      // Italian
    'nl': 'NL',      // Dutch
    'pl': 'PL',      // Polish
    'pt': 'PT-PT',   // Portuguese (Portugal)
    'pt-br': 'PT-BR', // Portuguese (Brazil)
    'ru': 'RU',      // Russian
    'ja': 'JA',      // Japanese
    'zh': 'ZH',      // Chinese
  };
  
  // Special case for Arabic which is not supported by DeepL as source language
  if (code === 'ar') {
    return 'EN-US'; // Use English as source when Arabic is specified
  }
  
  return langMap[code] || 'EN-US'; // Default to English for unsupported languages
}