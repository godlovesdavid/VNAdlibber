import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface Language {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

const countries = {
  en: 'US',
  es: 'ES',
  ja: 'JP',
  zh: 'CN',
  fr: 'FR',
  de: 'DE',
  pt: 'PT',
  ar: 'SA'
};

const languages: Language[] = [
  { code: 'en', name: 'English', flag: countries.en, nativeName: 'English' },
  { code: 'es', name: 'Spanish', flag: countries.es, nativeName: 'Español' },
  { code: 'ja', name: 'Japanese', flag: countries.ja, nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', flag: countries.zh, nativeName: '中文' },
  { code: 'fr', name: 'French', flag: countries.fr, nativeName: 'Français' },
  { code: 'de', name: 'German', flag: countries.de, nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', flag: countries.pt, nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', flag: countries.ar, nativeName: 'العربية' }
];

export function LanguageMenu() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  // Display the country code as a flag indicator
  const renderFlag = (countryCode: string) => (
    <span className="text-xs font-medium text-muted-foreground w-6 inline-block">{countryCode}</span>
  );
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2 h-8 flex items-center gap-1.5">
          {renderFlag(currentLanguage.flag)}
          <span className="font-medium">{currentLanguage.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className={`flex items-center gap-2 text-sm cursor-pointer ${
              language.code === i18n.language ? 'bg-muted' : ''
            }`}
            onClick={() => changeLanguage(language.code)}
          >
            <div className="flex items-center min-w-[60px]">
              {renderFlag(language.flag)}
              <span className="text-xs font-medium">{language.code.toUpperCase()}</span>
            </div>
            <span className="flex-1">{language.nativeName}</span>
            {language.code === i18n.language && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}