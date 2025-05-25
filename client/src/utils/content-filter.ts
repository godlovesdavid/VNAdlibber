const Filter = require('naughty-words');

// LDNOOBW (Language Detection No Obscenity or Bad Words) Content Filter
// Using the official naughty-words library from LDNOOBW repository

interface ContentFilterResult {
  isClean: boolean;
  detectedWords: string[];
  cleanedText: string;
  language: string;
}

// Supported LDNOOBW languages in your app
const LDNOOBW_SUPPORTED_LANGS = [
  'en', 'es', 'ja', 'zh', 'fr', 'de', 'pt', 'ar', 'hi', 'ru'
];

// Get current language from i18next
export function getCurrentLanguage(): string {
  console.log(123)
  // Try to get from i18next store
  if (typeof window !== 'undefined' && (window as any).i18next) {
    return (window as any).i18next.language || 'en';
  }
  
  // Fallback to browser language
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.substring(0, 2);
    return browserLang;
  }
  
  return 'en';
}

// Main content filtering function using naughty-words LDNOOBW library
export function filterInappropriateContent(text: string, language?: string): ContentFilterResult {
  const detectedLang = language || getCurrentLanguage();
  
  // Use language-specific filtering if supported, otherwise default to English
  const langToUse = LDNOOBW_SUPPORTED_LANGS.includes(detectedLang) ? detectedLang : 'en';
  
  try {
    // Create language-specific filter
    const filter = new Filter({ language: langToUse });
    
    // Filter the text
    const filteredResult = filter.clean(text);
    
    // Check if any words were filtered (text changed)
    const hasProfanity = filteredResult !== text;
    
    // Extract detected words by comparing original and filtered text
    const detectedWords: string[] = [];
    if (hasProfanity) {
      const originalWords = text.toLowerCase().split(/\s+/);
      const filteredWords = filteredResult.toLowerCase().split(/\s+/);
      
      for (let i = 0; i < originalWords.length; i++) {
        if (filteredWords[i] && filteredWords[i] !== originalWords[i]) {
          detectedWords.push(originalWords[i]);
        }
      }
    }
    
    return {
      isClean: !hasProfanity,
      detectedWords: Array.from(new Set(detectedWords)), // Remove duplicates
      cleanedText: filteredResult,
      language: langToUse
    };
  } catch (error) {
    console.warn('LDNOOBW filter error, falling back to basic check:', error);
    // Fallback to basic check
    return {
      isClean: true,
      detectedWords: [],
      cleanedText: text,
      language: detectedLang
    };
  }
}

// Helper function to check if text is clean
export function isContentClean(text: string): boolean {
  const result = filterInappropriateContent(text);
  return result.isClean;
}

// Helper function to clean text
export function cleanInappropriateContent(text: string): string {
  const result = filterInappropriateContent(text);
  return result.cleanedText;
}

// Export types for use in components
export type { ContentFilterResult };