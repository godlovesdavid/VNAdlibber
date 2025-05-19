import { translateInputField } from './translation-api';
import i18n from '../i18n';

/**
 * Applies translation to all input fields when changing language
 * This can be used globally to auto-translate content across the app
 * @param targetLang The language code to translate to
 */
export async function translateAllFields(targetLang: string): Promise<void> {
  try {
    // Get settings from localStorage
    const autoTranslate = localStorage.getItem('vn-auto-translate') === 'true';
    const sourceLanguage = localStorage.getItem('vn-auto-translate-source') || 'en';
    
    // Don't translate if auto-translate is disabled or if target is source language
    if (!autoTranslate || targetLang === sourceLanguage) {
      return;
    }
    
    // Find all text inputs and textareas (excluding those with data-no-translate attribute)
    const textInputs = document.querySelectorAll('input[type="text"]:not([data-no-translate])');
    const textareas = document.querySelectorAll('textarea:not([data-no-translate])');
    
    // Translate each input field
    const allInputs = [...Array.from(textInputs), ...Array.from(textareas)] as HTMLInputElement[];
    
    for (const input of allInputs) {
      if (input.value && input.value.trim() !== '') {
        await translateInputField(input, targetLang);
      }
    }
  } catch (error) {
    console.error('Error translating all fields:', error);
  }
}

/**
 * Initialize language handling to work across the application
 * Sets up listeners for language changes to automatically translate content
 */
export function initializeLanguageHandling(): void {
  // Listen for language changes
  i18n.on('languageChanged', (lang: string) => {
    translateAllFields(lang);
  });
  
  // Initialize language from URL parameter if present (e.g., ?lang=es)
  const setLanguageFromURL = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const langParam = params.get('lang');
      
      if (langParam && isValidLanguage(langParam)) {
        i18n.changeLanguage(langParam);
      }
    } catch (error) {
      console.error('Error setting language from URL:', error);
    }
  };
  
  // Set the language from URL when the page loads
  setLanguageFromURL();
}

/**
 * Checks if the given language code is valid
 * @param lang Language code to check
 */
function isValidLanguage(lang: string): boolean {
  const supportedLanguages = ['en', 'es', 'ja', 'zh', 'fr', 'de', 'pt', 'ar'];
  return supportedLanguages.includes(lang);
}