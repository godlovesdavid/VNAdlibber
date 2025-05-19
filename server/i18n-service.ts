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

// Handler to auto-translate a specific language
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
    
    // Prepare for translation
    const textsToTranslate = Object.values(missingTranslations);
    
    // Translate the missing texts using our imported function
    // Special case for Arabic to handle DeepL limitations
    const targetLanguage = language === 'ar' ? 'ar' : language;
    const sourceLanguage = language === 'ar' ? 'en-US' : 'en';
    
    const translatedTexts = await translateTextsInternal(
      textsToTranslate,
      targetLanguage,
      sourceLanguage
    );
    
    // Create a flat object with original keys and translated values
    const translatedObj: Record<string, string> = {};
    for (let i = 0; i < missingKeys.length && i < translatedTexts.length; i++) {
      translatedObj[missingKeys[i]] = String(translatedTexts[i] || '');
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