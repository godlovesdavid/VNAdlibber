import enTranslation from '../translations/en.json';
import esTranslation from '../translations/es.json';
import jaTranslation from '../translations/ja.json';

type TranslationEntries = Record<string, any>;

/**
 * Flatten a nested object into a single-level object with dot notation keys
 * @param obj - The object to flatten
 * @param prefix - Prefix for keys (used in recursion)
 */
export function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  return Object.keys(obj).reduce((acc: Record<string, string>, k) => {
    const pre = prefix.length ? `${prefix}.` : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], `${pre}${k}`));
    } else {
      acc[`${pre}${k}`] = String(obj[k]);
    }
    return acc;
  }, {});
}

/**
 * Un-flatten an object with dot notation keys back into a nested object
 * @param obj - The flattened object
 */
export function unflattenObject(obj: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    const keys = key.split('.');
    let current = result;
    
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (i === keys.length - 1) {
        // Last key, set the value
        current[k] = obj[key];
      } else {
        // Create nested object if it doesn't exist
        current[k] = current[k] || {};
        current = current[k];
      }
    }
  }
  
  return result;
}

/**
 * Find missing translations by comparing with the base English translations
 * @param translations - Current translations in target language
 */
export function findMissingTranslations(translations: TranslationEntries): Record<string, string> {
  const flatEnglish = flattenObject(enTranslation);
  const flatTranslations = flattenObject(translations);
  
  const missing: Record<string, string> = {};
  
  // Find keys that are in English but not in the target language
  for (const key in flatEnglish) {
    if (!(key in flatTranslations)) {
      missing[key] = flatEnglish[key];
    }
  }
  
  return missing;
}

/**
 * Translate texts using the DeepL API via server
 * @param texts - Array of texts to translate
 * @param targetLang - Target language code (e.g., 'es', 'ja')
 * @param sourceLang - Source language code (optional, defaults to 'en')
 */
export async function translateTexts(
  texts: string[],
  targetLang: string,
  sourceLang: string = 'en'
): Promise<string[]> {
  try {
    // Make request to the server endpoint
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        targetLang,
        sourceLang,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Translation request failed');
    }
    
    const data = await response.json();
    return data.translatedTexts;
  } catch (error) {
    console.error('Translation API error:', error);
    throw error;
  }
}

/**
 * Auto-translate all missing keys for a specific language
 * @param language - Target language code ('es' or 'ja')
 */
export async function autoTranslateLanguage(language: 'es' | 'ja'): Promise<TranslationEntries> {
  // Get current translations for target language
  const currentTranslations = language === 'es' ? esTranslation : jaTranslation;
  
  // Find keys that need translation
  const missingKeys = findMissingTranslations(currentTranslations);
  const missingValues = Object.values(missingKeys);
  const missingKeysArray = Object.keys(missingKeys);
  
  if (missingValues.length === 0) {
    console.log(`No missing translations found for ${language}`);
    return currentTranslations;
  }
  
  console.log(`Found ${missingValues.length} missing translations for ${language}`);
  
  // Translate missing values
  const translatedTexts = await translateTexts(missingValues, language);
  
  // Recreate the object with original keys and translated values
  const translatedObj: Record<string, string> = {};
  for (let i = 0; i < missingKeysArray.length; i++) {
    translatedObj[missingKeysArray[i]] = translatedTexts[i];
  }
  
  // Unflatten the object to restore nested structure
  const translatedNested = unflattenObject(translatedObj);
  
  // Return a new object with the translated values merged into the current translations
  return deepMerge(currentTranslations, translatedNested);
}

/**
 * Deep merge two objects
 * @param target - Target object
 * @param source - Source object
 */
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const output = { ...target };
  
  for (const key in source) {
    if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (key in target && typeof target[key] === 'object') {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = { ...source[key] };
      }
    } else {
      output[key] = source[key];
    }
  }
  
  return output;
}