import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Language {
  code: string;
  countryCode: string;
  name: string;
}

// Simple language configuration
const languages: Language[] = [
  { code: 'en', countryCode: 'US', name: 'English' },
  { code: 'es', countryCode: 'ES', name: 'Español' },
  { code: 'ja', countryCode: 'JP', name: '日本語' },
  { code: 'zh', countryCode: 'CN', name: '中文' },
  { code: 'fr', countryCode: 'FR', name: 'Français' },
  { code: 'de', countryCode: 'DE', name: 'Deutsch' },
  { code: 'pt', countryCode: 'BR', name: 'Português' },
  { code: 'ar', countryCode: 'AR', name: 'العربية' },
  { code: 'hi', countryCode: 'IN', name: 'हिन्दी' },
  { code: 'ru', countryCode: 'RU', name: 'Русский' },
  { code: 'bn', countryCode: 'BD', name: 'বাংলা' },
  { code: 'id', countryCode: 'ID', name: 'Indonesia' }
];

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

// Flag styles by country code
const flagStyles: Record<string, React.CSSProperties> = {
  US: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 5"><rect width="10" height="5" fill="%23b22234"/><path d="M0,0.4h10 M0,1.2h10 M0,2.0h10 M0,2.8h10 M0,3.6h10 M0,4.4h10" stroke="%23fff" stroke-width="0.5"/><rect width="4" height="2.8" fill="%233c3b6e"/></svg>\') no-repeat center/cover',
  },
  DE: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3"><rect width="5" height="3" y="0" x="0" fill="%23000"/><rect width="5" height="2" y="1" x="0" fill="%23D00"/><rect width="5" height="1" y="2" x="0" fill="%23FFCE00"/></svg>\') no-repeat center/cover',
  },
  ES: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="%23c60b1e"/><rect width="3" height="1" fill="%23ffc400"/></svg>\') no-repeat center/cover',
  },
  FR: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="1" height="2" fill="%23002654"/><rect width="1" height="2" x="1" fill="%23fff"/><rect width="1" height="2" x="2" fill="%23ce1126"/></svg>\') no-repeat center/cover',
  },
  JP: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="%23fff"/><circle fill="%23bc002d" cx="1.5" cy="1" r="0.6"/></svg>\') no-repeat center/cover',
  },
  CN: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="%23de2910"/></svg>\') no-repeat center/cover',
  },
  BR: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="%23009c3b"/><path d="M0.15,1 1.5,1.8 2.85,1 1.5,0.2z" fill="%23ffdf00"/></svg>\') no-repeat center/cover',
  },
  AR: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="%23006C35"/><path d="M1.5,0.8 C1.2,0.8 1,1 1,1.2 C1,1.4 1.2,1.6 1.5,1.6 C1.8,1.6 2,1.4 2,1.2 C2,1 1.8,0.8 1.5,0.8 z" fill="%23fff"/><path d="M1.8,0.5 C1.7,0.55 1.6,0.6 1.5,0.6 C1.4,0.6 1.3,0.55 1.2,0.5 L1.4,0.7 L1.5,0.4 L1.6,0.7 z" fill="%23fff"/></svg>\') no-repeat center/cover',
  },
  IN: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="%23ff9933"/><rect width="3" height="0.67" y="0.67" fill="%23fff"/><rect width="3" height="0.67" y="1.33" fill="%23138808"/><circle cx="1.5" cy="1" r="0.2" fill="%23000080"/></svg>\') no-repeat center/cover',
  },
  RU: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="%23fff"/><rect width="3" height="0.67" fill="%230039a6"/><rect width="3" height="0.67" y="1.33" fill="%23d52b1e"/></svg>\') no-repeat center/cover',
  },
  BD: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="%23006a4e"/><circle cx="1.2" cy="1" r="0.4" fill="%23f42a41"/></svg>\') no-repeat center/cover',
  },
  ID: {
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="%23ce1126"/><rect width="3" height="1" fill="%23fff"/></svg>\') no-repeat center/cover',
  }
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
        <div style={{...flagContainerStyle, ...(flagStyles[language.countryCode] || {})}}></div>
        <span className="font-medium text-xs">{language.countryCode}</span>
      </DropdownMenuItem>
    );
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-0.5 px-1 py-1">
          <div style={{...flagContainerStyle, ...(flagStyles[currentLanguage.countryCode] || {})}}></div>
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