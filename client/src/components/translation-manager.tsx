import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isTranslationAvailable } from '@/utils/translation-api';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export function TranslationManager() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationLog, setTranslationLog] = useState<string[]>([]);
  const { toast } = useToast();
  const { t } = useTranslation();
  // Initialize local state for when context is not available
  const [localAutoTranslate, setLocalAutoTranslate] = useState<boolean>(() => {
    const saved = localStorage.getItem('vn-auto-translate');
    return saved === 'true';
  });
  
  const [localSourceLanguage, setLocalSourceLanguage] = useState<string>(() => {
    const saved = localStorage.getItem('vn-auto-translate-source');
    return saved || 'en';
  });

  // Supported languages for translation
  const supportedLanguages = [
    { code: 'es', name: 'Spanish' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ar', name: 'Arabic' },
  ];

  // Check if API key is configured in environment
  const checkApiConfig = async () => {
    try {
      const available = await isTranslationAvailable();
      setIsInitialized(available);
      return available;
    } catch (error) {
      console.error('API availability check error:', error);
      return false;
    }
  };

  // Check API configuration on component mount
  useEffect(() => {
    checkApiConfig();
  }, []);

  // Run translation for all languages
  const handleTranslateAll = async () => {
    if (!isInitialized) {
      toast({
        title: t('common.error'),
        description: 'DeepL translation is not available. Please check server configuration.',
        variant: 'destructive',
      });
      return;
    }

    setTranslating(true);
    setTranslationLog(prev => [...prev, 'Starting translation for all languages...']);

    try {
      // Process each language
      for (const language of supportedLanguages) {
        setTranslationLog(prev => [...prev, `Processing ${language.name} (${language.code})...`]);
        
        // Call auto-translation endpoint for this language
        const response = await fetch(`/api/translate/auto/${language.code}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Translation for ${language.name} failed: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.translatedCount > 0) {
          setTranslationLog(prev => [...prev, `✓ ${language.name}: Added ${data.translatedCount} translations`]);
        } else {
          setTranslationLog(prev => [...prev, `✓ ${language.name}: No new translations needed`]);
        }
      }
      
      setTranslationLog(prev => [...prev, '✓ All translations completed successfully']);
      
      toast({
        title: 'Translation Complete',
        description: 'All languages have been updated with the latest translations.',
      });
    } catch (error) {
      console.error('Multi-language translation error:', error);
      setTranslationLog(prev => [...prev, `Error: ${error instanceof Error ? error.message : String(error)}`]);
      
      toast({
        title: t('common.error'),
        description: 'An error occurred during translation',
        variant: 'destructive',
      });
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{t('translation.manager.header')}</CardTitle>
        <CardDescription>
          {t('translation.manager.description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="bulk" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bulk">{t('translation.manager.bulkTranslateTitle')}</TabsTrigger>
            <TabsTrigger value="settings">{t('translation.manager.settings')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bulk" className="space-y-6 py-4">
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  {t('translation.manager.bulkTranslateDescription')}
                </p>
                
                <p className="text-sm text-gray-700">
                  When you click the translate button, it will:
                </p>
                <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1 mt-1">
                  <li>Find all untranslated keys in each language</li>
                  <li>Use DeepL to translate them from English</li>
                  <li>Automatically update the translation files on the server</li>
                  <li>Make the new translations available immediately</li>
                </ol>
              </div>

              <Button 
                onClick={handleTranslateAll} 
                disabled={translating || !isInitialized}
                className="w-full h-12"
              >
                {translating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('translation.manager.translating')}
                  </>
                ) : (
                  <>{t('translation.manager.translateAll')}</>
                )}
              </Button>
              
              {isInitialized ? (
                <div className="flex items-center text-sm text-green-600 mt-2">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('translation.manager.serviceReady')}
                </div>
              ) : (
                <div className="flex items-center text-sm text-amber-600 mt-2">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {t('translation.manager.serviceUnavailable')}
                </div>
              )}
            </div>
            
            {/* Translation log */}
            {translationLog.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-1">{t('translation.manager.translationLog')}</h3>
                <div className="bg-gray-100 p-3 rounded-md h-48 overflow-y-auto text-sm">
                  {translationLog.map((log, index) => (
                    <div key={index} className="py-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{t('translation.manager.autoTranslate')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('translation.manager.autoTranslateDescription')}
                  </p>
                </div>
                <Switch 
                  checked={localAutoTranslate} 
                  onCheckedChange={(checked) => {
                    setLocalAutoTranslate(checked);
                    localStorage.setItem('vn-auto-translate', checked.toString());
                  }}
                  aria-label="Auto-translate toggle"
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">{t('translation.manager.sourceLanguage')}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('translation.manager.sourceLanguageDescription')}
                </p>
                
                <Select 
                  value={localSourceLanguage} 
                  onValueChange={(value) => {
                    setLocalSourceLanguage(value);
                    localStorage.setItem('vn-auto-translate-source', value);
                  }}
                  disabled={!localAutoTranslate}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder={t('settings.language')} />
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
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="border-t pt-4 flex justify-between">
        <p className="text-xs text-gray-500">
          DeepL Free API allows up to 500,000 characters per month
        </p>
      </CardFooter>
    </Card>
  );
}