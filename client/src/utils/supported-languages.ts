
export interface Language {
  code: string;
  countryCode: string;
  name: string;
}

// Simple language configuration
export const languages: Language[] = [
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

export const supportedLanguages = languages.filter(lang => 
  ['es', 'ja', 'zh', 'fr', 'de', 'pt', 'ar'].includes(lang.code)
);
