import { filter, removeWords, addWords } from 'naughty-words';

// LDNOOBW (Language Detection No Obscenity or Bad Words) Content Filter
// Using the official naughty-words library from LDNOOBW repository

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

// Main content filtering function using naughty-words LDNOOBW library
export function filterInappropriateContent(text: string, language?: string): ContentFilterResult {
  const detectedLang = language || getCurrentLanguage();
  
  // Filter the text using naughty-words
  const filteredResult = filter(text);
  
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
    language: detectedLang
  };
}

// Helper function to check if text is clean
export function isContentClean(text: string): boolean {
  return filter(text) === text;
}

// Helper function to clean text
export function cleanInappropriateContent(text: string): string {
  return filter(text);
}

// Export types for use in components
export type { ContentFilterResult };