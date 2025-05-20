import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { translateAllFields } from '@/utils/language-util';

/**
 * Hook to handle language switching throughout the application
 * Provides functions to change language and auto-translate content
 */
export function useLanguageSwitcher() {
  const { i18n } = useTranslation();
  
  // Switch language and optionally auto-translate content
  const switchLanguage = useCallback(async (language: string) => {
    // Change language in i18next
    await i18n.changeLanguage(language);
    
    // Auto-translate form fields if enabled
    // await translateAllFields(language);
    
    // Store the selected language in localStorage
    localStorage.setItem('i18nextLng', language);
    
    return true;
  }, [i18n]);
  
  return {
    currentLanguage: i18n.language,
    switchLanguage,
  };
}