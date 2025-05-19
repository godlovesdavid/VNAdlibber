import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initTranslator, autoTranslate } from '@/utils/deepl-translator';
import esTranslation from '../translations/es.json';
import jaTranslation from '../translations/ja.json';
import { useTranslation } from 'react-i18next';

export function TranslationManager() {
  const [apiKey, setApiKey] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationLog, setTranslationLog] = useState<string[]>([]);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  // Try to get saved API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('deepl_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      // Try to initialize with saved key
      if (initTranslator(savedKey)) {
        setIsInitialized(true);
      }
    }
  }, []);

  // Initialize the DeepL translator with the provided API key
  const handleInitialize = () => {
    if (!apiKey) {
      toast({
        title: t('common.error'),
        description: 'Please enter a DeepL API key',
        variant: 'destructive',
      });
      return;
    }

    if (initTranslator(apiKey)) {
      setIsInitialized(true);
      localStorage.setItem('deepl_api_key', apiKey);
      toast({
        title: t('common.success'),
        description: 'DeepL translator initialized successfully',
      });
    } else {
      toast({
        title: t('common.error'),
        description: 'Failed to initialize DeepL translator. Please check your API key.',
        variant: 'destructive',
      });
    }
  };

  // Run auto-translation for a specific language
  const handleAutoTranslate = async (language: string) => {
    if (!isInitialized) {
      toast({
        title: t('common.error'),
        description: 'Please initialize the DeepL translator first',
        variant: 'destructive',
      });
      return;
    }

    setTranslating(true);
    setTranslationLog(prev => [...prev, `Starting translation for ${language}...`]);

    try {
      // Get current translations for target language
      const currentTranslations = language === 'es' ? esTranslation : jaTranslation;
      
      // Map language code to DeepL language code
      const targetLang = language === 'es' ? 'es' : 'ja';
      
      // Perform auto-translation
      const updatedTranslations = await autoTranslate(currentTranslations, { 
        targetLang: targetLang as any,
        sourceLang: 'en' as any
      });
      
      // Log results
      setTranslationLog(prev => [...prev, `Completed translation for ${language}`]);
      
      // Ask user to download the JSON file
      const jsonStr = JSON.stringify(updatedTranslations, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${language}-translation.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: t('common.success'),
        description: `Translation for ${language} completed. Don't forget to update your translation files.`,
      });
    } catch (error) {
      console.error('Auto-translation error:', error);
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
        <CardTitle>Translation Manager</CardTitle>
        <CardDescription>
          Manage translations for your application using DeepL automatic translation
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="translate">Auto-Translate</TabsTrigger>
          </TabsList>
          
          {/* Setup Tab */}
          <TabsContent value="setup">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">DeepL API Key</Label>
                <div className="flex space-x-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your DeepL API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <Button onClick={handleInitialize}>
                    {isInitialized ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Initialized
                      </>
                    ) : (
                      'Initialize'
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm text-gray-500">
                  Get a free DeepL API key by signing up at{' '}
                  <a 
                    href="https://www.deepl.com/pro#developer" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    https://www.deepl.com/pro#developer
                  </a>
                </p>
              </div>
            </div>
          </TabsContent>
          
          {/* Translate Tab */}
          <TabsContent value="translate">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleAutoTranslate('es')} 
                  disabled={translating || !isInitialized}
                  className="w-full"
                >
                  {translating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>Translate to Spanish</>
                  )}
                </Button>
                
                <Button 
                  onClick={() => handleAutoTranslate('ja')} 
                  disabled={translating || !isInitialized}
                  className="w-full"
                >
                  {translating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>Translate to Japanese</>
                  )}
                </Button>
              </div>
              
              {/* Translation log */}
              {translationLog.length > 0 && (
                <div className="mt-4">
                  <Label>Translation Log</Label>
                  <div className="bg-gray-100 p-3 rounded-md h-32 overflow-y-auto mt-1 text-sm">
                    {translationLog.map((log, index) => (
                      <div key={index} className="py-1">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {isInitialized ? (
                <div className="flex items-center text-sm text-green-600 mt-2">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  DeepL translator is initialized and ready
                </div>
              ) : (
                <div className="flex items-center text-sm text-amber-600 mt-2">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Please initialize the DeepL translator in the Setup tab first
                </div>
              )}
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