import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateInputField } from '@/utils/translation-api';

// Local storage keys
const AUTO_TRANSLATE_KEY = 'vn-auto-translate';
const AUTO_TRANSLATE_SOURCE_KEY = 'vn-auto-translate-source';

/**
 * Custom hook to apply translations to form fields when language changes
 */
export function useGlobalTranslations() {
  const { i18n } = useTranslation();
  
  // Initialize auto-translate from localStorage
  const autoTranslate = localStorage.getItem(AUTO_TRANSLATE_KEY) === 'true';
  const sourceLanguage = localStorage.getItem(AUTO_TRANSLATE_SOURCE_KEY) || 'en';
  
  // Apply translations when language changes
  useEffect(() => {
    if (!autoTranslate) return;
    
    // Don't translate if switching to source language
    if (i18n.language === sourceLanguage) return;
    
    const applyTranslationsToFormFields = async () => {
      try {
        // Find all relevant input fields
        const textInputs = document.querySelectorAll('input[type="text"]:not([data-no-translate])');
        const textareas = document.querySelectorAll('textarea:not([data-no-translate])');
        
        console.log(`Applying translations to ${textInputs.length} inputs and ${textareas.length} textareas`);
        
        // Translate each input field
        for (const input of [...Array.from(textInputs), ...Array.from(textareas)] as HTMLInputElement[]) {
          if (input.value && input.value.trim() !== '') {
            await translateInputField(input, i18n.language);
          }
        }
        
        console.log('Form translations complete');
      } catch (error) {
        console.error('Error translating form fields:', error);
      }
    };
    
    // Apply translations with a slight delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      applyTranslationsToFormFields();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [i18n.language, autoTranslate, sourceLanguage]);
  
  return { 
    currentLanguage: i18n.language,
    autoTranslateEnabled: autoTranslate
  };
}