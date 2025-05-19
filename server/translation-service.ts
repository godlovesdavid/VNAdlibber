import * as deepl from 'deepl-node';
import { Request, Response } from 'express';

// Initialize DeepL translator with API key from environment variables
const translator = new deepl.Translator(process.env.DEEPL_API_KEY || '');

interface TranslationRequest {
  texts: string[];
  targetLang: string;
  sourceLang?: string;
}

export async function translateTexts(req: Request, res: Response) {
  try {
    const { texts, targetLang, sourceLang } = req.body as TranslationRequest;
    
    // Validate input data
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
    
    // Map to DeepL language codes
    const mappedTargetLang = mapToDeeplLangCode(targetLang);
    const mappedSourceLang = sourceLang ? mapToDeeplLangCode(sourceLang) : null;
    
    // Translate texts
    const results = await translator.translateText(
      texts,
      mappedSourceLang as deepl.SourceLanguageCode | null,
      mappedTargetLang as deepl.TargetLanguageCode
    );
    
    // Extract translated text from results
    const translatedTexts = results.map(result => result.text);
    
    // Return translated texts
    return res.json({ translatedTexts });
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
  
  return langMap[code] || code.toUpperCase();
}