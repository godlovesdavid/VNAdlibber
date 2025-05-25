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
    // const naughtyWords = await import('naughty-words');
    // const wordList = naughtyWords.default[langToUse] || naughtyWords.default['en'];

    // if (!wordList || !Array.isArray(wordList)) {
    //   throw new Error(`Invalid word list for language: ${langToUse}`);
    // }
    const wordList = ["2 girls 1 cup", "bunghole"]
    // Check for inappropriate words and phrases using regex
    const detectedWords: string[] = [];
    let cleanedText = text;
    const textLower = text.toLowerCase();
    console.log(wordList)
    console.log(text)
    for (const badWord of wordList) {
      if (!badWord || typeof badWord !== 'string') continue;

      // Escape special regex characters in the bad word
      const escapedBadWord = badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Create regex to match the word/phrase with word boundaries (for single words) or anywhere (for phrases)
      const isPhrase = badWord.includes(' ');
      const regexPattern = isPhrase 
        ? new RegExp(escapedBadWord, 'gi')  // Phrases can appear anywhere
        : new RegExp(`\\b${escapedBadWord}\\b`, 'gi');  // Single words need word boundaries

      if (regexPattern.test(textLower)) {
        detectedWords.push(badWord);

        // Replace with asterisks
        const asterisks = '*'.repeat(badWord.length);
        cleanedText = cleanedText.replace(regexPattern, asterisks);
      }
    }
    console.log(detectedWords + ' ' + (detectedWords.length == 0))
    
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