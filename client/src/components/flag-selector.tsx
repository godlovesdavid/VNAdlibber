import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {Language, languages} from "@/components/translation-manager"

// CSS styles for flags container
const flagContainerStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: '3px',
  overflow: 'hidden',
  width: '20px',
  height: '14px',
  marginRight: '2px',
  display: 'inline-block'
};


export function FlagSelector() {
  const { i18n } = useTranslation();
  
  const changeLanguage = async (langCode: string) => {
    // Change language in i18next
    await i18n.changeLanguage(langCode);
    
    // Special handling for form translations - ensure this happens on all pages
    try {
      // Auto-translate form fields if setting is enabled
      const autoTranslate = localStorage.getItem('vn-auto-translate') === 'true';
      const sourceLanguage = localStorage.getItem('vn-auto-translate-source') || 'en';
      
      if (autoTranslate && langCode !== sourceLanguage) {
        console.log(`Translating form fields to ${langCode}...`);
        
        // Find all text inputs and textareas (excluding those with data-no-translate attribute)
        const textInputs = document.querySelectorAll('input[type="text"]:not([data-no-translate])');
        const textareas = document.querySelectorAll('textarea:not([data-no-translate])');
        
        // Import translation function dynamically to avoid circular dependencies
        const { translateText } = await import('@/utils/translation-api');
        
        // Translate each input field
        const allInputs = [...Array.from(textInputs), ...Array.from(textareas)] as HTMLInputElement[];
        
        for (const input of allInputs) {
          if (input.value && input.value.trim() !== '') {
            try {
              // Translate the field value
              const translatedValue = await translateText(input.value, langCode, sourceLanguage);
              
              // Update the input value
              input.value = translatedValue;
              
              // Dispatch input event to trigger React state updates
              const event = new Event('input', { bubbles: true });
              input.dispatchEvent(event);
            } catch (fieldError) {
              console.error(`Error translating field to ${langCode}:`, fieldError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in language change handler:', error);
    }
  };
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  // Language selector item with flag and country code
  const LangOption = ({ language }: { language: Language }) => {
    const isSelected = language.code === i18n.language;
    
    return (
      <DropdownMenuItem
        key={language.code}
        className={`flex  ${isSelected ? 'bg-muted' : ''} gap-1`}
        onClick={() => changeLanguage(language.code)}
      >
        <div style={{...flagContainerStyle, ...(language.flagStyle || {})}}></div>
        <span className="font-medium text-xs">{language.countryCode}</span>
      </DropdownMenuItem>
    );
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-0.5 px-1 py-1">
          <div style={{...flagContainerStyle, ...(currentLanguage.flagStyle || {})}}></div>
          <span className="font-medium text-sm">{currentLanguage.countryCode}</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="p-0"
        style={{
          width: '60px',
          minWidth: '60px',
          maxWidth: '60px',
        }}>
        {languages.map((language) => (
          <LangOption key={language.code} language={language} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}