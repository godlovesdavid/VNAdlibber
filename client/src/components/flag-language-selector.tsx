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
import {
  USFlag,
  DEFlag,
  ESFlag,
  FRFlag,
  JPFlag,
  CNFlag,
  PTFlag,
  BRFlag,
  ARFlag
} from '@/components/flags';

interface Language {
  code: string;
  displayCode: string;
  name: string;
  nativeName: string;
  FlagComponent: React.FC;
}

// Language configuration with flag components
const languages: Language[] = [
  { code: 'en', displayCode: 'US', name: 'English', nativeName: 'English', FlagComponent: USFlag },
  { code: 'es', displayCode: 'ES', name: 'Spanish', nativeName: 'Español', FlagComponent: ESFlag },
  { code: 'ja', displayCode: 'JP', name: 'Japanese', nativeName: '日本語', FlagComponent: JPFlag },
  { code: 'zh', displayCode: 'CN', name: 'Chinese', nativeName: '中文', FlagComponent: CNFlag },
  { code: 'fr', displayCode: 'FR', name: 'French', nativeName: 'Français', FlagComponent: FRFlag },
  { code: 'de', displayCode: 'DE', name: 'German', nativeName: 'Deutsch', FlagComponent: DEFlag },
  { code: 'pt', displayCode: 'BR', name: 'Portuguese', nativeName: 'Português', FlagComponent: PTFlag },
  { code: 'ar', displayCode: 'AR', name: 'Arabic', nativeName: 'العربية', FlagComponent: ARFlag }
];

export function FlagLanguageSelector() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  const { FlagComponent } = currentLanguage;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2 h-8 flex items-center gap-2">
          <div className="overflow-hidden border border-gray-200 rounded" style={{ width: '24px', height: '16px' }}>
            <FlagComponent />
          </div>
          <span className="font-medium">{currentLanguage.displayCode}</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((language) => {
          const { FlagComponent } = language;
          
          return (
            <DropdownMenuItem
              key={language.code}
              className={`flex items-center justify-between p-2 ${
                language.code === i18n.language ? 'bg-muted' : ''
              }`}
              onClick={() => changeLanguage(language.code)}
            >
              <div className="flex items-center gap-2">
                <div className="overflow-hidden border border-gray-200 rounded" style={{ width: '24px', height: '16px' }}>
                  <FlagComponent />
                </div>
                <span className="font-medium">{language.displayCode}</span>
              </div>
              <span className="flex-1 ml-3">{language.nativeName}</span>
              {language.code === i18n.language && (
                <Check className="h-4 w-4 text-primary ml-1" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}