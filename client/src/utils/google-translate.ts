// Simple Google Translate utility using the public translate service
export async function translateToEnglish(text: string): Promise<string> {

  try {
    // Use Google Translate's public endpoint
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Google Translate returns an array structure: [[[translated_text, original_text, ...], ...], ...]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    
    // Fallback to original text if translation parsing fails
    return text;
  } catch (error) {
    console.warn('Translation failed, using original text:', error);
    // Return original text if translation fails
    return text;
  }
}