import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { translateTextsInternal } from './translation-service';

// Paths to translation files
const TRANSLATION_DIR = path.join(process.cwd(), 'client', 'src', 'translations');
const EN_TRANSLATION_PATH = path.join(TRANSLATION_DIR, 'en.json');
const ES_TRANSLATION_PATH = path.join(TRANSLATION_DIR, 'es.json');
const JA_TRANSLATION_PATH = path.join(TRANSLATION_DIR, 'ja.json');
const ZH_TRANSLATION_PATH = path.join(TRANSLATION_DIR, 'zh.json');
const FR_TRANSLATION_PATH = path.join(TRANSLATION_DIR, 'fr.json');
const DE_TRANSLATION_PATH = path.join(TRANSLATION_DIR, 'de.json');
const PT_TRANSLATION_PATH = path.join(TRANSLATION_DIR, 'pt.json');
const AR_TRANSLATION_PATH = path.join(TRANSLATION_DIR, 'ar.json');

// Helper functions
const readJsonFile = (filePath: string): any => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
};

const writeJsonFile = (filePath: string, data: any): void => {
  try {
    const formattedData = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, formattedData, 'utf8');
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
};

// Flatten a nested object into a single-level object with dot notation keys
const flattenObject = (obj: Record<string, any>, prefix = ''): Record<string, string> => {
  return Object.keys(obj).reduce((acc: Record<string, string>, k) => {
    const pre = prefix.length ? `${prefix}.` : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], `${pre}${k}`));
    } else {
      acc[`${pre}${k}`] = String(obj[k]);
    }
    return acc;
  }, {});
};

// Un-flatten an object with dot notation keys back into a nested object
const unflattenObject = (obj: Record<string, string>): Record<string, any> => {
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
};

// Find missing translations by comparing with the base English translations
const findMissingTranslations = (baseTranslations: any, targetTranslations: any): Record<string, string> => {
  const flatBase = flattenObject(baseTranslations);
  const flatTarget = flattenObject(targetTranslations);
  
  const missing: Record<string, string> = {};
  
  // Find keys that are in base but not in target
  for (const key in flatBase) {
    if (!(key in flatTarget)) {
      missing[key] = flatBase[key];
    }
  }
  
  return missing;
};

// Deep merge two objects
const deepMerge = (target: Record<string, any>, source: Record<string, any>): Record<string, any> => {
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
};

// Handler to clear translations for a specific language
export async function handleClearTranslations(req: Request, res: Response) {
  try {
    const { language } = req.params;
    
    // Validate language parameter
    const supportedLanguages = ['es', 'ja', 'zh', 'fr', 'de', 'pt', 'ar'];
    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({
        error: `Invalid language. Supported languages are: ${supportedLanguages.join(', ')}`
      });
    }
    
    // Determine file path
    let targetPath;
    switch (language) {
      case 'es': targetPath = ES_TRANSLATION_PATH; break;
      case 'ja': targetPath = JA_TRANSLATION_PATH; break;
      case 'zh': targetPath = ZH_TRANSLATION_PATH; break;
      case 'fr': targetPath = FR_TRANSLATION_PATH; break;
      case 'de': targetPath = DE_TRANSLATION_PATH; break;
      case 'pt': targetPath = PT_TRANSLATION_PATH; break;
      case 'ar': targetPath = AR_TRANSLATION_PATH; break;
      default: targetPath = ES_TRANSLATION_PATH; // Fallback (should never happen)
    }
    
    // Check if file exists
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({
        error: `Translation file for ${language} does not exist.`
      });
    }
    
    // Read the current translations to count them
    const currentTranslations = readJsonFile(targetPath);
    const flatCurrent = flattenObject(currentTranslations);
    const translationCount = Object.keys(flatCurrent).length;
    
    // Write an empty object to clear translations
    writeJsonFile(targetPath, {});
    
    // Return success response
    return res.json({
      success: true,
      message: `Successfully cleared all translations for ${language}.`,
      clearedCount: translationCount
    });
    
  } catch (error) {
    console.error('Clear translations error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error clearing translations'
    });
  }
}

// Find missing translation keys in the codebase and add them to the English translation file
export async function handleScanForMissingKeys(req: Request, res: Response) {
  try {
    // Define search patterns for translation keys with improved accuracy
    // These patterns specifically look for i18next-style translation keys
    // in t() function calls with proper namespacing
    const tFunctionPattern = /t\(['"]([a-zA-Z0-9_]+\.[a-zA-Z0-9_.-]+)['"]\)/g;
    const tContextPattern = /\{\s*t\(['"]([a-zA-Z0-9_]+\.[a-zA-Z0-9_.-]+)['"]\)/g;
    const tComponentPattern = /<[^>]*t\(['"]([a-zA-Z0-9_]+\.[a-zA-Z0-9_.-]+)['"]\)/g;
    
    // Helper function to validate if a key is a proper translation key format
    const isValidTranslationKey = (key: string): boolean => {
      // Must have at least one dot to indicate namespacing
      if (!key.includes('.')) return false;
      
      // Must be properly structured (namespace.key format)
      if (!/^[a-zA-Z0-9]+\.[a-zA-Z0-9._]+$/.test(key)) return false;
      
      // Exclude common false positives
      const invalidKeyPrefixes = [
        'ins.', 'return.', 'input.', 'GET.', 'POST.', 'DELETE.',
        'script.', 'content-type.', 'a.', ':.', 'vnSet', 'vnToggle'
      ];
      
      if (invalidKeyPrefixes.some(prefix => key.startsWith(prefix))) return false;
      
      return true;
    };
    
    // Define client source directory to scan
    const CLIENT_SRC_DIR = path.join(process.cwd(), 'client', 'src');
    
    // Read English translation file
    let enTranslations = readJsonFile(EN_TRANSLATION_PATH);
    const originalFlatTranslations = flattenObject(enTranslations);
    const keysCount = Object.keys(originalFlatTranslations).length;
    
    // Function to scan files in a directory recursively
    const scanDirectory = async (dir: string): Promise<Set<string>> => {
      const keys = new Set<string>();
      
      // Read all files in the directory
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          // Recursively scan subdirectories
          const subDirKeys = await scanDirectory(fullPath);
          subDirKeys.forEach(key => keys.add(key));
        } else if (stats.isFile() && 
                  (fullPath.endsWith('.tsx') || 
                   fullPath.endsWith('.ts') || 
                   fullPath.endsWith('.jsx') || 
                   fullPath.endsWith('.js'))) {
          // Read file content
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Extract translation keys using regex patterns
          let match;
          
          // Find t('key') pattern
          while ((match = tFunctionPattern.exec(content)) !== null) {
            const key = match[1];
            if (key && key.includes('.') && isValidTranslationKey(key)) {
              keys.add(key);
            }
          }
          
          // Reset regex lastIndex
          tFunctionPattern.lastIndex = 0;
          
          // Find { t('key') pattern
          while ((match = tContextPattern.exec(content)) !== null) {
            const key = match[1];
            if (key && key.includes('.') && isValidTranslationKey(key)) {
              keys.add(key);
            }
          }
          
          // Reset regex lastIndex
          tContextPattern.lastIndex = 0;
          
          // Find JSX component with t('key') pattern
          while ((match = tComponentPattern.exec(content)) !== null) {
            const key = match[1];
            if (key && key.includes('.') && isValidTranslationKey(key)) {
              keys.add(key);
            }
          }
          
          // Reset regex lastIndex
          tComponentPattern.lastIndex = 0;
        }
      }
      
      return keys;
    };
    
    // Scan client source directory for translation keys
    const allKeys = await scanDirectory(CLIENT_SRC_DIR);
    console.log(`Found ${allKeys.size} potential translation keys in codebase`);
    
    // Filter out keys that already exist in translations and ensure they are valid keys
    const flatKeys = flattenObject(enTranslations);
    const missingKeys = Array.from(allKeys)
      .filter(key => !flatKeys[key])
      .filter(key => isValidTranslationKey(key));
    
    // If no missing keys, return success
    if (missingKeys.length === 0) {
      return res.json({
        success: true,
        message: 'No missing translation keys found.',
        keysAdded: 0,
        totalKeys: keysCount
      });
    }
    
    // Add missing keys to translations object with empty values
    const updatedTranslations = { ...enTranslations };
    
    for (const key of missingKeys) {
      // Split key by dot notation to create nested structure
      const keyParts = key.split('.');
      let current = updatedTranslations;
      
      // Create or navigate to nested objects
      for (let i = 0; i < keyParts.length - 1; i++) {
        const part = keyParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      // Set value for the last key part (empty string)
      const lastPart = keyParts[keyParts.length - 1];
      current[lastPart] = '';
    }
    
    // Write updated translations back to file
    writeJsonFile(EN_TRANSLATION_PATH, updatedTranslations);
    
    // Return success response
    return res.json({
      success: true,
      message: `Added ${missingKeys.length} missing translation keys to English translations.`,
      keysAdded: missingKeys.length,
      newKeys: missingKeys,
      totalKeys: keysCount + missingKeys.length
    });
    
  } catch (error) {
    console.error('Scan for missing keys error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error scanning for missing translation keys'
    });
  }
}

export async function handleAutoTranslate(req: Request, res: Response) {
  try {
    const { language } = req.params;
    
    // Validate language parameter
    const supportedLanguages = ['es', 'ja', 'zh', 'fr', 'de', 'pt', 'ar'];
    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({
        error: `Invalid language. Supported languages are: ${supportedLanguages.join(', ')}`
      });
    }
    
    // Determine file paths
    let targetPath;
    switch (language) {
      case 'es': targetPath = ES_TRANSLATION_PATH; break;
      case 'ja': targetPath = JA_TRANSLATION_PATH; break;
      case 'zh': targetPath = ZH_TRANSLATION_PATH; break;
      case 'fr': targetPath = FR_TRANSLATION_PATH; break;
      case 'de': targetPath = DE_TRANSLATION_PATH; break;
      case 'pt': targetPath = PT_TRANSLATION_PATH; break;
      case 'ar': targetPath = AR_TRANSLATION_PATH; break;
      default: targetPath = ES_TRANSLATION_PATH; // Fallback (should never happen)
    }
    
    // Create the language file if it doesn't exist
    if (!fs.existsSync(targetPath)) {
      fs.writeFileSync(targetPath, '{}', 'utf8');
    }
    
    // Read translation files
    const baseTranslations = readJsonFile(EN_TRANSLATION_PATH);
    const targetTranslations = readJsonFile(targetPath);
    
    // Find missing translations
    const missingTranslations = findMissingTranslations(baseTranslations, targetTranslations);
    const missingKeys = Object.keys(missingTranslations);
    
    // If no missing translations, return success
    if (missingKeys.length === 0) {
      return res.json({
        success: true,
        message: `No missing translations found for ${language}.`,
        translatedCount: 0
      });
    }
    
    // Prepare for translation - filter out any empty values
    const textsToTranslate = Object.values(missingTranslations)
      .filter(text => typeof text === 'string' && text.trim() !== '');
    
    // If no valid texts to translate, return success
    if (textsToTranslate.length === 0) {
      return res.json({
        success: true,
        message: `No valid texts to translate for ${language}.`,
        translatedCount: 0
      });
    }
    
    // Translate the missing texts using our imported function
    // Simply use the imported translateTextsInternal which now handles Arabic properly
    const translatedTexts = await translateTextsInternal(
      textsToTranslate,
      language,
      'en'
    );
    
    // Create a flat object with original keys and translated values
    const translatedObj: Record<string, string> = {};
    
    // Filter out keys with empty values before translation to match our filtered texts
    const validMissingKeys = missingKeys.filter(key => {
      const value = missingTranslations[key];
      return typeof value === 'string' && value.trim() !== '';
    });
    
    // Now map the valid keys to their translations
    for (let i = 0; i < validMissingKeys.length && i < translatedTexts.length; i++) {
      translatedObj[validMissingKeys[i]] = String(translatedTexts[i] || '');
    }
    
    // Unflatten to restore nested structure
    const translatedNested = unflattenObject(translatedObj);
    
    // Merge with existing translations
    const updatedTranslations = deepMerge(targetTranslations, translatedNested);
    
    // Write back to file
    writeJsonFile(targetPath, updatedTranslations);
    
    // Return success response
    return res.json({
      success: true,
      message: `Successfully translated ${missingKeys.length} missing keys for ${language}.`,
      translatedCount: missingKeys.length,
      updatedTranslations
    });
    
  } catch (error) {
    console.error('Auto-translate error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown translation error'
    });
  }
}