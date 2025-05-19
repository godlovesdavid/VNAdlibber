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