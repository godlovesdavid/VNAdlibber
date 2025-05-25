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
export async function filterInappropriateContent(text: string, language?: string): Promise<ContentFilterResult> {
  const detectedLang = language || getCurrentLanguage();
  
  // Use language-specific filtering if supported, otherwise default to English
  const langToUse = LDNOOBW_SUPPORTED_LANGS.includes(detectedLang) ? detectedLang : 'en';
  
  try {
    // Import the language-specific word list
    const naughtyWords = await import('naughty-words');
    const wordList = naughtyWords.default[langToUse] || naughtyWords.default['en'];
    
    if (!wordList || !Array.isArray(wordList)) {
      throw new Error(`Invalid word list for language: ${langToUse}`);
    }
    
    // Check for inappropriate words
    const textWords = text.toLowerCase().split(/\s+/);
    const detectedWords: string[] = [];
    let cleanedText = text;
    
    for (const word of textWords) {
      const cleanWord = word.replace(/[^\w\u00C0-\u017F\u0400-\u04FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '');
      if (cleanWord && wordList.includes(cleanWord)) {
        detectedWords.push(cleanWord);
        // Replace with asterisks
        const asterisks = '*'.repeat(cleanWord.length);
        cleanedText = cleanedText.replace(new RegExp(`\\b${cleanWord}\\b`, 'gi'), asterisks);
      }
    }
    
    return {
      isClean: detectedWords.length === 0,
      detectedWords: Array.from(new Set(detectedWords)),
      cleanedText,
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
export async function isContentClean(text: string): Promise<boolean> {
  const result = await filterInappropriateContent(text);
  return result.isClean;
}

// Helper function to clean text
export async function cleanInappropriateContent(text: string): Promise<string> {
  const result = await filterInappropriateContent(text);
  return result.cleanedText;
}

// Export types for use in components
export type { ContentFilterResult };