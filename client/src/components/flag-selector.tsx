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
  { code: 'ar', countryCode: 'AR', name: 'العربية' }
];

// CSS styles for flags container
const flagContainerStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: '4px',
  overflow: 'hidden',
  width: '30px',
  height: '20px',
  marginRight: '8px',
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
    background: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="%23fff"/></svg>\') no-repeat center/cover',
  }
};

export function FlagSelector() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  // Language selector item with flag and country code
  const LangOption = ({ language }: { language: Language }) => {
    const isSelected = language.code === i18n.language;
    
    return (
      <DropdownMenuItem
        key={language.code}
        className={`flex items-center p-2 ${isSelected ? 'bg-muted' : ''}`}
        onClick={() => changeLanguage(language.code)}
      >
        <div style={{...flagContainerStyle, ...(flagStyles[language.countryCode] || {})}}></div>
        <span className="font-medium">{language.countryCode}</span>
      </DropdownMenuItem>
    );
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2">
          <div style={{...flagContainerStyle, ...(flagStyles[currentLanguage.countryCode] || {})}}></div>
          <span className="font-medium">{currentLanguage.countryCode}</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-36">
        {languages.map((language) => (
          <LangOption key={language.code} language={language} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}