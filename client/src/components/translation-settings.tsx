import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { translateInputField } from '@/utils/translation-api';

// Store auto-translate setting in localStorage
const AUTO_TRANSLATE_KEY = 'vn-auto-translate';
const AUTO_TRANSLATE_SOURCE_KEY = 'vn-auto-translate-source';

interface TranslationSettingsProps {
  className?: string;
}

export function TranslationSettings({ className }: TranslationSettingsProps) {
  const { t, i18n } = useTranslation();
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
    const saved = localStorage.getItem(AUTO_TRANSLATE_KEY);
    return saved === 'true';
  });
  
  const [autoTranslateSource, setAutoTranslateSource] = useState<string>(() => {
    const saved = localStorage.getItem(AUTO_TRANSLATE_SOURCE_KEY);
    return saved || 'en';
  });
  
  // Save settings when they change
  useEffect(() => {
    localStorage.setItem(AUTO_TRANSLATE_KEY, autoTranslate.toString());
  }, [autoTranslate]);
  
  useEffect(() => {
    localStorage.setItem(AUTO_TRANSLATE_SOURCE_KEY, autoTranslateSource);
  }, [autoTranslateSource]);
  
  // Set up automatic translation of input fields when language changes
  useEffect(() => {
    if (!autoTranslate) return;
    
    // Don't translate if switching to source language
    if (i18n.language === autoTranslateSource) return;
    
    const handleLanguageChange = async () => {
      try {
        // Find all relevant input fields
        const textInputs = document.querySelectorAll('input[type="text"]:not([data-no-translate])');
        const textareas = document.querySelectorAll('textarea:not([data-no-translate])');
        
        // Translate each input field
        for (const input of [...Array.from(textInputs), ...Array.from(textareas)] as HTMLInputElement[]) {
          if (input.value && input.value.trim() !== '') {
            await translateInputField(input, i18n.language);
          }
        }
      } catch (error) {
        console.error('Error in auto-translation:', error);
      }
    };
    
    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChange);
    
    // Clean up on unmount
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, autoTranslate, autoTranslateSource]);
  
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4">Translation Settings</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Auto-translate Content</h4>
            <p className="text-sm text-muted-foreground">
              Automatically translate your text when changing languages
            </p>
          </div>
          <Switch 
            checked={autoTranslate} 
            onCheckedChange={setAutoTranslate} 
            aria-label="Auto-translate toggle"
          />
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <h4 className="font-medium">Source Language</h4>
          <p className="text-sm text-muted-foreground mb-2">
            The original language your content is written in
          </p>
          
          <Select 
            value={autoTranslateSource} 
            onValueChange={setAutoTranslateSource}
            disabled={!autoTranslate}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select a source language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}