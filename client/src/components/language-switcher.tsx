import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (value: string) => {
    i18n.changeLanguage(value);
  };
  
  return (
    <div className="language-switcher">
      <Select 
        value={i18n.language} 
        onValueChange={changeLanguage}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="ja">日本語</SelectItem>
          <SelectItem value="es">Español</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// Alternative compact version for navbar
export function CompactLanguageSwitcher() {
  const { i18n } = useTranslation();
  
  return (
    <div className="flex space-x-1">
      <Button 
        variant={i18n.language === 'en' ? 'default' : 'ghost'} 
        size="sm"
        onClick={() => i18n.changeLanguage('en')}
        className="w-8 h-8 p-0"
      >
        EN
      </Button>
      <Button 
        variant={i18n.language === 'ja' ? 'default' : 'ghost'} 
        size="sm"
        onClick={() => i18n.changeLanguage('ja')}
        className="w-8 h-8 p-0"
      >
        JP
      </Button>
      <Button 
        variant={i18n.language === 'es' ? 'default' : 'ghost'} 
        size="sm"
        onClick={() => i18n.changeLanguage('es')}
        className="w-8 h-8 p-0"
      >
        ES
      </Button>
    </div>
  );
}