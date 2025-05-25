import * as profanity from 'profanity';

// LDNOOBW (Language Detection No Obscenity or Bad Words) Content Filter
// Using the profanity library with multilingual LDNOOBW word lists

interface ContentFilterResult {
  isClean: boolean;
  detectedWords: string[];
  cleanedText: string;
  language: string;
}

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

// Main content filtering function using profanity library with LDNOOBW
export function filterInappropriateContent(text: string, language?: string): ContentFilterResult {
  const detectedLang = language || getCurrentLanguage();
  
  // Check if text contains profanity
  const hasProfanity = profanity.exists(text);
  
  // Get cleaned text
  const cleanedText = profanity.purify(text)[0];
  
  // Extract detected words from the library
  const detectedWords: string[] = [];
  if (hasProfanity) {
    // Get the words that were detected
    const words = profanity.purify(text)[1];
    detectedWords.push(...words);
  }
  
  return {
    isClean: !hasProfanity,
    detectedWords: Array.from(new Set(detectedWords)), // Remove duplicates
    cleanedText,
    language: detectedLang
  };
}

// Helper function to check if text is clean
export function isContentClean(text: string): boolean {
  return !profanity.exists(text);
}

// Helper function to clean text
export function cleanInappropriateContent(text: string): string {
  return profanity.purify(text)[0];
}

// Export types for use in components
export type { ContentFilterResult };