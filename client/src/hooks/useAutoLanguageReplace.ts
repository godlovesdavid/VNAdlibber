import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateTexts } from '@/utils/translation-api';

const useAutoLanguageReplace = (
  autoTranslate: boolean = true, 
  inputTextFields: string[] = [], 
  translationDelay: number = 500
) => {
  const { i18n } = useTranslation();
  
  useEffect(() => {
    // When language changes, find all relevant text fields and translate them
    const handleLanguageChange = async (targetLanguage: string) => {
      if (!autoTranslate || targetLanguage === 'en') return; // Don't translate if auto-translate is off or target is English
      
      try {
        // Get all text fields that need to be replaced
        const fieldsToTranslate = inputTextFields.length > 0 
          ? inputTextFields.map(selector => document.querySelector(selector)) 
          : Array.from(document.querySelectorAll('input[type="text"], textarea'));
        
        // Filter out null elements and get their values
        const elements = fieldsToTranslate.filter(el => el !== null) as HTMLInputElement[] | HTMLTextAreaElement[];
        const texts = elements.map(el => el.value).filter(text => text.trim().length > 0);
        
        if (texts.length === 0) return;
        
        // Translate texts
        const translatedTexts = await translateTexts(texts, targetLanguage);
        
        // Update text fields with translated values
        elements.forEach((el, idx) => {
          if (translatedTexts[idx]) {
            el.value = translatedTexts[idx];
            
            // Also dispatch an input event to update any React state
            const event = new Event('input', { bubbles: true });
            el.dispatchEvent(event);
          }
        });
      } catch (error) {
        console.error('Error auto-translating form fields:', error);
      }
    };
    
    // Debounce function to prevent too many API calls
    let timeout: NodeJS.Timeout;
    
    const languageChangeHandler = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        handleLanguageChange(i18n.language);
      }, translationDelay);
    };
    
    // Subscribe to language changes
    i18n.on('languageChanged', languageChangeHandler);
    
    return () => {
      clearTimeout(timeout);
      i18n.off('languageChanged', languageChangeHandler);
    };
  }, [i18n, autoTranslate, inputTextFields, translationDelay]);
  
  return null;
};

export default useAutoLanguageReplace;