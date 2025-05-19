import * as deepl from 'deepl-node';
import enTranslation from '../translations/en.json';

// Type for translation entries
type TranslationEntries = Record<string, any>;

// Interface for translation options
interface TranslateOptions {
  targetLang: deepl.TargetLanguageCode;
  sourceLang?: deepl.SourceLanguageCode;
}

// DeepL API authentication key (will be provided from environment variables)
let translator: deepl.Translator | null = null;

/**
 * Initialize the DeepL translator with API key
 * @param authKey - DeepL API authentication key
 */
export function initTranslator(authKey: string) {
  try {
    translator = new deepl.Translator(authKey);
    return true;
  } catch (error) {
    console.error('Failed to initialize DeepL translator:', error);
    return false;
  }
}

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
 * Translate all missing keys in a translation object
 * @param missingTranslations - Object containing keys that need translation
 * @param options - Translation options
 */
export async function translateMissingKeys(
  missingTranslations: Record<string, string>,
  options: TranslateOptions
): Promise<Record<string, string>> {
  if (!translator) {
    console.error('DeepL translator not initialized');
    return missingTranslations;
  }
  
  try {
    // Prepare texts for translation
    const textsToTranslate = Object.values(missingTranslations);
    
    // Translate all texts at once (more efficient)
    const results = await translator.translateText(
      textsToTranslate,
      options.sourceLang ? (options.sourceLang as deepl.SourceLanguageCode) : null,
      options.targetLang as deepl.TargetLanguageCode
    );
    
    // Create a new object with translated values
    const keys = Object.keys(missingTranslations);
    const translatedObj: Record<string, string> = {};
    
    for (let i = 0; i < keys.length; i++) {
      translatedObj[keys[i]] = results[i].text;
    }
    
    return translatedObj;
  } catch (error) {
    console.error('Error translating texts with DeepL:', error);
    return missingTranslations;
  }
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
 * Auto-translate all missing keys for a specific language
 * @param currentTranslations - Current translations for the target language
 * @param options - Translation options
 */
export async function autoTranslate(
  currentTranslations: TranslationEntries,
  options: TranslateOptions
): Promise<TranslationEntries> {
  // Find keys that need translation
  const missingKeys = findMissingTranslations(currentTranslations);
  
  if (Object.keys(missingKeys).length === 0) {
    console.log(`No missing translations found for ${options.targetLang}`);
    return currentTranslations;
  }
  
  console.log(`Found ${Object.keys(missingKeys).length} missing translations for ${options.targetLang}`);
  
  // Translate missing keys
  const translatedMissing = await translateMissingKeys(missingKeys, options);
  
  // Merge translated keys back into nested structure
  const translatedNested = unflattenObject(translatedMissing);
  
  // Merge with current translations (deep merge)
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