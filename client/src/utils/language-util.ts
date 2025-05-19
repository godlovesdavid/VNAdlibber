import i18next from 'i18next';
import { translateText } from './translation-api';

/**
 * Check if the given language code is a valid supported language
 * @param langCode The language code to validate
 * @returns Boolean indicating if the language is supported
 */
export function isValidLanguage(langCode: string): boolean {
  const supportedLanguages = ['en', 'es', 'ja', 'zh', 'fr', 'de', 'pt', 'ar'];
  return supportedLanguages.includes(langCode);
}

/**
 * Auto-translate all input fields in the current form
 * @param targetLang Target language code (e.g. 'es', 'fr')
 */
export async function translateAllFields(targetLang: string): Promise<void> {
  try {
    // Check if auto-translate is enabled in settings
    const autoTranslate = localStorage.getItem('vn-auto-translate') === 'true';
    const sourceLanguage = localStorage.getItem('vn-auto-translate-source') || 'en';
    
    if (!autoTranslate || targetLang === sourceLanguage) {
      return; // Don't translate if auto-translate is disabled or target is source language
    }
    
    // Find all text inputs and textareas (excluding those with data-no-translate attribute)
    const textInputs = document.querySelectorAll('input[type="text"]:not([data-no-translate])');
    const textareas = document.querySelectorAll('textarea:not([data-no-translate])');
    
    // Translate each input field
    const allInputs = [...Array.from(textInputs), ...Array.from(textareas)] as HTMLInputElement[];
    
    for (const input of allInputs) {
      if (input.value && input.value.trim() !== '') {
        // Translate the value
        const translatedValue = await translateText(input.value, targetLang, sourceLanguage);
        
        // Update the input value
        input.value = translatedValue;
        
        // Dispatch input event to trigger React state updates
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
    }
  } catch (error) {
    console.error('Error auto-translating fields:', error);
  }
}