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
  const [scanning, setScanning] = useState(false);
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

  // Handle clearing all translations
  const handleClearAllTranslations = async (e?: React.MouseEvent) => {
    // Prevent default form submission if triggered by a form
    if (e) {
      e.preventDefault();
    }
    
    // Confirm with the user before proceeding
    if (!window.confirm(t('translation.manager.confirmClear', 'Are you sure you want to clear all translations? This will remove all translated text except for English and cannot be undone.'))) {
      return;
    }
    
    setTranslating(true);
    setTranslationLog(prev => [...prev, 'Starting to clear all translations...']);
    
    try {
      // Process each language
      for (const language of supportedLanguages) {
        setTranslationLog(prev => [...prev, `Clearing translations for ${language.name} (${language.code})...`]);
        
        // Call clear translations endpoint for this language
        const response = await fetch(`/api/translate/clear/${language.code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-No-Refresh': 'true'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Clearing translations for ${language.name} failed: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        setTranslationLog(prev => [...prev, `✓ ${language.name}: Cleared ${data.clearedCount || 'all'} translations`]);
      }
      
      setTranslationLog(prev => [...prev, '✓ All translations have been cleared successfully']);
      
      toast({
        title: 'Translations Cleared',
        description: 'All translations have been cleared. You can now retranslate everything.',
      });
    } catch (error) {
      console.error('Clearing translations error:', error);
      setTranslationLog(prev => [...prev, `Error: ${error instanceof Error ? error.message : String(error)}`]);
      
      toast({
        title: t('common.error'),
        description: 'An error occurred while clearing translations',
        variant: 'destructive',
      });
    } finally {
      setTranslating(false);
    }
  };

  // Handle scanning for missing translation keys
  const handleScanForMissingKeys = async (e?: React.MouseEvent) => {
    // Prevent default form submission if triggered by a form
    if (e) {
      e.preventDefault();
    }
    
    setScanning(true);
    setTranslationLog(prev => [...prev, 'Starting to scan codebase for missing translation keys...']);
    
    try {
      // Call scan endpoint
      const response = await fetch('/api/translate/scan', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-No-Refresh': 'true'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Scanning for missing keys failed: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.keysAdded > 0) {
        setTranslationLog(prev => [...prev, `✓ Found and added ${data.keysAdded} missing translation keys to English translations file.`]);
        
        // List the new keys that were found
        if (data.newKeys && data.newKeys.length > 0) {
          setTranslationLog(prev => [...prev, 'New keys found:']);
          data.newKeys.forEach((key: string) => {
            setTranslationLog(prev => [...prev, `  - ${key}`]);
          });
        }
        
        toast({
          title: 'Missing Keys Found',
          description: `Found and added ${data.keysAdded} missing translation keys.`,
        });
      } else {
        setTranslationLog(prev => [...prev, '✓ No missing translation keys found in codebase.']);
        
        toast({
          title: 'No Missing Keys',
          description: 'No missing translation keys were found in the codebase.',
        });
      }
      
      setTranslationLog(prev => [...prev, `✓ Total translation keys: ${data.totalKeys}`]);
      
    } catch (error) {
      console.error('Scanning for missing keys error:', error);
      setTranslationLog(prev => [...prev, `Error: ${error instanceof Error ? error.message : String(error)}`]);
      
      toast({
        title: t('common.error'),
        description: 'An error occurred while scanning for missing translation keys',
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  // Run translation for all languages
  const handleTranslateAll = async (e?: React.MouseEvent) => {
    // Prevent default form submission if this was triggered by a form
    if (e) {
      e.preventDefault();
    }
    
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
        console.log(`/api/translate/auto/${language.code}`)
        // Call auto-translation endpoint for this language
        const response = await fetch(`/api/translate/auto/${language.code}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add a custom header to prevent page reload
            'X-No-Refresh': 'true'
          }
        });
        
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

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleTranslateAll} 
                  disabled={translating || scanning || !isInitialized}
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    onClick={handleScanForMissingKeys}
                    disabled={scanning || translating}
                    variant="outline"
                    className="w-full"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('translation.manager.scanning', 'Scanning...')}
                      </>
                    ) : (
                      <>{t('translation.manager.scanMissingKeys', 'Scan for Missing Keys')}</>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleClearAllTranslations} 
                    disabled={translating || scanning}
                    variant="destructive"
                    className="w-full"
                  >
                    {t('translation.manager.clearAllTranslations', 'Clear All Translations')}
                  </Button>
                </div>
              </div>
              
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