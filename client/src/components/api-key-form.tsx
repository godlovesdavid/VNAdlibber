import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Key, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ApiKeyForm() {
  const { toast } = useToast();
  const [geminiKey, setGeminiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"valid" | "invalid" | "unknown">("unknown");

  // Load saved API key on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem("user_gemini_key");
    if (savedKey) {
      setGeminiKey(savedKey);
      // We'll mark it as valid if it exists, and let the validation check correct if needed
      setKeyStatus("valid");
    }
  }, []);

  // Validate the API key with a test call
  const validateApiKey = async (key: string) => {
    if (!key.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Gemini API key",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
      });

      if (response.ok) {
        setKeyStatus("valid");
        localStorage.setItem("user_gemini_key", key);
        toast({
          title: "Success",
          description: "Your API key has been validated and saved",
        });
        return true;
      } else {
        const error = await response.json();
        setKeyStatus("invalid");
        toast({
          title: "Invalid API Key",
          description: error.message || "Please check your key and try again",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error validating API key:", error);
      setKeyStatus("invalid");
      toast({
        title: "Connection Error",
        description: "Unable to validate your API key. Please try again later.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = async () => {
    const isValid = await validateApiKey(geminiKey);
    if (isValid) {
      // The key is already saved in localStorage in validateApiKey
      toast({
        title: "API Key Saved",
        description: "Your API key has been saved for future use",
      });
    }
  };

  const clearApiKey = () => {
    setGeminiKey("");
    setKeyStatus("unknown");
    localStorage.removeItem("user_gemini_key");
    toast({
      title: "API Key Removed",
      description: "Your API key has been removed from this device",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>API Key Settings</CardTitle>
        <CardDescription>
          Configure your AI service API keys to use for story generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gemini">
          <TabsList className="mb-4">
            <TabsTrigger value="gemini">Google Gemini</TabsTrigger>
          </TabsList>
          
          <TabsContent value="gemini">
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">API Key Required</AlertTitle>
                <AlertDescription className="text-blue-700">
                  You'll need to obtain a Gemini API key from Google to generate stories.
                  <Button 
                    variant="link" 
                    className="p-0 h-auto ml-1"
                    onClick={() => window.open("https://ai.google.dev/tutorials/setup", "_blank")}
                  >
                    Get a key <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </AlertDescription>
              </Alert>
              
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Why do I need my own API key?</AlertTitle>
                <AlertDescription>
                  To make this app available to everyone while controlling costs, we ask users to provide 
                  their own Gemini API key. Google offers generous free credits for new API users, so you can 
                  create multiple stories without any cost.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="gemini-key">Gemini API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="gemini-key"
                    type="password"
                    placeholder="Enter your Gemini API key"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className={
                      keyStatus === "valid" 
                        ? "border-green-500 focus-visible:ring-green-500" 
                        : keyStatus === "invalid"
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                </div>
                {keyStatus === "valid" && (
                  <p className="text-sm text-green-600">✓ API key is valid</p>
                )}
                {keyStatus === "invalid" && (
                  <p className="text-sm text-red-600">× Invalid API key</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={clearApiKey}>
          Clear Key
        </Button>
        <Button onClick={saveApiKey} disabled={isLoading}>
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Validating...
            </>
          ) : (
            <>
              <Key className="mr-2 h-4 w-4" />
              Save Key
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}