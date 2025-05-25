import { useTranslation } from 'react-i18next';
import { profanity } from 'profanity';

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

// Main content filtering function using bad-words library
export function filterInappropriateContent(text: string, language?: string): ContentFilterResult {
  const detectedLang = language || getCurrentLanguage();
  
  // Initialize the filter
  const filter = new Filter();
  
  // Check if text contains profanity
  const hasProfanity = filter.isProfane(text);
  
  // Get cleaned text
  const cleanedText = filter.clean(text);
  
  // Extract detected words by comparing original and cleaned text
  const detectedWords: string[] = [];
  if (hasProfanity) {
    // Simple approach: find words that were replaced with asterisks
    const originalWords = text.toLowerCase().split(/\s+/);
    const cleanedWords = cleanedText.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < originalWords.length; i++) {
      if (cleanedWords[i] && cleanedWords[i].includes('*') && !originalWords[i].includes('*')) {
        detectedWords.push(originalWords[i]);
      }
    }
  }
  
  return {
    isClean: !hasProfanity,
    detectedWords: [...new Set(detectedWords)], // Remove duplicates
    cleanedText,
    language: detectedLang
  };
}

// Helper function to check if text is clean
export function isContentClean(text: string): boolean {
  const filter = new Filter();
  return !filter.isProfane(text);
}

// Helper function to clean text
export function cleanInappropriateContent(text: string): string {
  const filter = new Filter();
  return filter.clean(text);
}

// Export types for use in components
export type { ContentFilterResult };