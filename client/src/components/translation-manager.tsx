import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { autoTranslateLanguage } from '@/utils/translation-api';
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

  // Check if API key is configured in environment
  const checkApiConfig = async () => {
    try {
      // Test the API with a simple translation call
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: ['Hello'],
          targetLang: 'es',
        }),
      });
      
      if (response.ok) {
        setIsInitialized(true);
        return true;
      } else {
        const errorData = await response.json();
        console.error('API test failed:', errorData.error);
        return false;
      }
    } catch (error) {
      console.error('API test error:', error);
      return false;
    }
  };

  // Check API configuration on component mount
  useEffect(() => {
    checkApiConfig();
  }, []);

  // Run auto-translation for a specific language
  const handleAutoTranslate = async (language: string) => {
    if (!isInitialized) {
      toast({
        title: t('common.error'),
        description: 'DeepL translation is not available. Please check server configuration.',
        variant: 'destructive',
      });
      return;
    }

    setTranslating(true);
    setTranslationLog(prev => [...prev, `Starting translation for ${language}...`]);

    try {
      // Get language as typed parameter
      const lang = language as 'es' | 'ja';
      
      // Perform auto-translation using our API utility
      setTranslationLog(prev => [...prev, `Finding missing translations for ${language}...`]);
      const updatedTranslations = await autoTranslateLanguage(lang);
      
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
          Automatically translate missing keys in your application using DeepL
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6 py-2">
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                This tool helps you translate missing keys in your application to different languages using DeepL's translation API. The DeepL API key is securely stored as an environment variable on the server.
              </p>
              
              <p className="text-sm text-gray-700">
                When you click a translation button, it will:
              </p>
              <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1 mt-1">
                <li>Find all untranslated keys in the selected language</li>
                <li>Use DeepL to translate them from English</li>
                <li>Generate a downloadable JSON file with the new translations</li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-4 my-6">
              <Button 
                onClick={() => handleAutoTranslate('es')} 
                disabled={translating || !isInitialized}
                className="w-full h-12"
              >
                {translating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>Translate to Spanish</>
                )}
              </Button>
              
              <Button 
                onClick={() => handleAutoTranslate('ja')} 
                disabled={translating || !isInitialized}
                className="w-full h-12"
              >
                {translating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>Translate to Japanese</>
                )}
              </Button>
            </div>
            
            {isInitialized ? (
              <div className="flex items-center text-sm text-green-600 mt-2">
                <CheckCircle className="mr-2 h-4 w-4" />
                DeepL translation service is ready to use
              </div>
            ) : (
              <div className="flex items-center text-sm text-amber-600 mt-2">
                <AlertCircle className="mr-2 h-4 w-4" />
                DeepL API not available. Please check your server configuration.
              </div>
            )}
          </div>
          
          {/* Translation log */}
          {translationLog.length > 0 && (
            <div>
              <Label>Translation Log</Label>
              <div className="bg-gray-100 p-3 rounded-md h-40 overflow-y-auto mt-1 text-sm">
                {translationLog.map((log, index) => (
                  <div key={index} className="py-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-2">
            <p className="text-sm text-gray-600">
              After downloading the translated JSON file, you'll need to replace the corresponding language file in your project. 
              You can copy the content into <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">client/src/translations/{'{es|ja}'}.json</code>
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t pt-4 flex justify-between">
        <p className="text-xs text-gray-500">
          DeepL Free API allows up to 500,000 characters per month
        </p>
      </CardFooter>
    </Card>
  );
}