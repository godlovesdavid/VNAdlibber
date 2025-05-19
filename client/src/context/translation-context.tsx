import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateInputField } from '@/utils/translation-api';

// Local storage keys
const AUTO_TRANSLATE_KEY = 'vn-auto-translate';
const AUTO_TRANSLATE_SOURCE_KEY = 'vn-auto-translate-source';

interface TranslationContextType {
  // Auto-translation settings
  autoTranslate: boolean;
  setAutoTranslate: (value: boolean) => void;
  sourceLanguage: string;
  setSourceLanguage: (lang: string) => void;
  
  // Translate all form fields
  translateAllFields: (targetLang?: string) => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  
  // Initialize state from localStorage
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
    const saved = localStorage.getItem(AUTO_TRANSLATE_KEY);
    return saved === 'true';
  });
  
  const [sourceLanguage, setSourceLanguage] = useState<string>(() => {
    const saved = localStorage.getItem(AUTO_TRANSLATE_SOURCE_KEY);
    return saved || 'en';
  });
  
  // Save settings when they change
  useEffect(() => {
    localStorage.setItem(AUTO_TRANSLATE_KEY, autoTranslate.toString());
  }, [autoTranslate]);
  
  useEffect(() => {
    localStorage.setItem(AUTO_TRANSLATE_SOURCE_KEY, sourceLanguage);
  }, [sourceLanguage]);
  
  // Translate all text fields in the form
  const translateAllFields = async (targetLang?: string) => {
    const lang = targetLang || i18n.language;
    
    if (!autoTranslate || lang === sourceLanguage) {
      return; // Don't translate if auto-translate is off or target is source language
    }
    
    try {
      // Find all relevant input fields
      const textInputs = document.querySelectorAll('input[type="text"]:not([data-no-translate])');
      const textareas = document.querySelectorAll('textarea:not([data-no-translate])');
      
      // Translate each input field
      for (const input of [...Array.from(textInputs), ...Array.from(textareas)] as HTMLInputElement[]) {
        if (input.value && input.value.trim() !== '') {
          await translateInputField(input, lang);
        }
      }
    } catch (error) {
      console.error('Error in translateAllFields:', error);
    }
  };
  
  // Watch for language changes to trigger translation
  useEffect(() => {
    if (!autoTranslate) return;
    
    const handleLanguageChange = async (lang: string) => {
      if (lang === sourceLanguage) return;
      await translateAllFields(lang);
    };
    
    // Subscribe to language changes
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, autoTranslate, sourceLanguage]);
  
  const contextValue: TranslationContextType = {
    autoTranslate,
    setAutoTranslate,
    sourceLanguage,
    setSourceLanguage,
    translateAllFields
  };
  
  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
};

// Hook to use the translation context
export const useTranslationContext = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslationContext must be used within a TranslationProvider');
  }
  return context;
};