/**
 * Utility functions for text translation
 */

/**
 * Translates an array of texts to the target language
 * @param texts Array of text strings to translate
 * @param targetLang Target language code (e.g., 'es', 'fr', 'ja')
 * @param sourceLang Optional source language code, will be auto-detected if not provided
 * @returns Promise with array of translated texts
 */
export async function translateTexts(
  texts: string[], 
  targetLang: string, 
  sourceLang?: string
): Promise<string[]> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        targetLang,
        sourceLang
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.translatedTexts || [];
  } catch (error) {
    console.error('Translation API error:', error);
    return texts; // Return original texts on error
  }
}

/**
 * Translates a single text to the target language
 * @param text Text to translate
 * @param targetLang Target language code (e.g., 'es', 'fr', 'ja')
 * @param sourceLang Optional source language code
 * @returns Promise with translated text
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string> {
  const results = await translateTexts([text], targetLang, sourceLang);
  return results[0] || text;
}

/**
 * Auto-translate input field value
 * @param element Input or textarea element
 * @param targetLang Target language code
 */
export async function translateInputField(
  element: HTMLInputElement | HTMLTextAreaElement,
  targetLang: string
): Promise<void> {
  try {
    if (!element || !element.value || element.value.trim() === '') return;
    
    const translated = await translateText(element.value, targetLang);
    
    // Update element value
    element.value = translated;
    
    // Trigger input event to update React state
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  } catch (error) {
    console.error('Error translating input field:', error);
  }
}

/**
 * Checks if DeepL API is configured and available
 * @returns Promise resolving to boolean indicating if translation is available
 */
export async function isTranslationAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/translate/status');
    if (!response.ok) return false;
    const data = await response.json();
    return data.available === true;
  } catch (error) {
    console.error('Error checking translation availability:', error);
    return false;
  }
}

/**
 * Automatically translates missing keys for a specific language
 * @param targetLang The language code to generate translations for
 * @returns Promise with the updated translations object
 */
export async function autoTranslateLanguage(
  targetLang: 'es' | 'ja' | 'zh' | 'fr' | 'de' | 'pt' | 'ar'
): Promise<Record<string, any>> {
  try {
    const response = await fetch(`/api/translate/auto/${targetLang}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Auto-translation failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.translations || {};
  } catch (error) {
    console.error('Auto-translation API error:', error);
    throw error; // Re-throw to allow caller to handle the error
  }
}