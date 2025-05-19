import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, Globe } from "lucide-react";

interface Language {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' }
];

export function LanguageDropdown() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="px-3 font-medium">
          {currentLanguage.code.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className={`flex items-center gap-2 text-sm cursor-pointer ${
              language.code === i18n.language ? 'bg-muted' : ''
            }`}
            onClick={() => changeLanguage(language.code)}
          >
            <span className="w-8 text-left text-xs font-medium">{language.code.toUpperCase()}</span>
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

export function MobileLanguageDropdown() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2 font-medium h-8">
          {currentLanguage.code.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className={`flex items-center gap-2 text-sm cursor-pointer ${
              language.code === i18n.language ? 'bg-muted' : ''
            }`}
            onClick={() => changeLanguage(language.code)}
          >
            <span className="w-8 text-left text-xs font-medium">{language.code.toUpperCase()}</span>
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