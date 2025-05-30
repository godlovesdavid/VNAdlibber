// Cloudflare Pages Function to handle all API routes

export const onRequest = async (context: any) => {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (url.pathname === '/api/health') {
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: 'cloudflare-pages'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }

  // POST /api/generate/concept - Generate story concept
  if (url.pathname === '/api/generate/concept' && request.method === 'POST') {
    try {
      console.log('Concept generation request received');
      console.log('Has GEMINI_API_KEY:', !!env.GEMINI_API_KEY);
      
      if (!env.GEMINI_API_KEY) {
        console.log('GEMINI_API_KEY missing');
        return new Response(
          JSON.stringify({ 
            error: 'GEMINI_API_KEY not configured',
            debug: 'Environment variable missing'
          }),
          { 
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      console.log('Parsing request body...');
      const { basicData } = await request.json();
      const { theme, tone, genre, setting } = basicData;
      console.log('Request data:', { theme, tone, genre, setting });

      const prompt = `Write a visual novel concept of a ${tone} ${genre} about ${theme} set in ${setting}.
        Return in this JSON format:
        {
          "title": "Captivating and unique title",
          "tagline": "Brief, memorable catchphrase", 
          "premise": "Detailed premise describing the world, main conflict, and core story without specific character names"
        }`;

      // Call Gemini API directly
      const headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      };

      const jsonInstructions = `
STRICT JSON FORMATTING RULES:
1. Return ONLY valid JSON without any explanatory text or markdown.
2. All property names must be in double quotes.
3. String values must use double quotes, not single quotes.
4. No trailing commas in arrays or objects.`;

      const enhancedPrompt = prompt + "\n\n" + jsonInstructions;

      const requestBody = {
        contents: [
          { role: "user", parts: [{ text: enhancedPrompt }] },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7,
        },
      };

      console.log('Making Gemini API call...');
      const apiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent",
        {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        }
      );

      console.log('Gemini API response status:', apiResponse.status);
      
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.log('Gemini API error response:', errorText);
        throw new Error(`Gemini API error: ${apiResponse.status} - ${errorText}`);
      }

      console.log('Parsing Gemini response...');
      const data = await apiResponse.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        console.log('No text in Gemini response:', JSON.stringify(data));
        throw new Error("No response from Gemini API");
      }

      console.log('Parsing result JSON...');
      const result = JSON.parse(text);
      console.log('Success! Generated concept:', result.title);
      
      return new Response(
        JSON.stringify(result),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate concept',
          details: error.message 
        }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  }

  // Default response for unhandled routes
  return new Response(
    JSON.stringify({ 
      error: 'Route not implemented yet',
      path: url.pathname,
      method: request.method
    }),
    { 
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
};

// Helper function for Gemini API calls
async function generateWithGemini(prompt: string, apiKey: string) {
  const headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };

  const jsonFormatInstructions = `
STRICT JSON FORMATTING RULES:
1. Return ONLY valid JSON without any explanatory text or markdown.
2. All property names must be in double quotes.
3. String values must use double quotes, not single quotes.
4. No trailing commas in arrays or objects.
5. No JavaScript-style comments in JSON.
6. Escape all quotes within strings.
7. Validate your JSON structure before returning it.
8. Do not include markdown code blocks in your response.
9. Every object property name must be quoted.
10. Use value null instead of string "null"

Example of CORRECT JSON format:
{
  "property": "value",
  "array": [1, 2, 3],
  "object": {
    "nested": true
  }
}`;

  const enhancedPrompt = prompt + "\n\n" + jsonFormatInstructions;

  const requestBody = {
    contents: [
      { role: "user", parts: [{ text: enhancedPrompt }] },
    ],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.7,
    },
  };

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent",
    {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error("No response from Gemini API");
  }

  return JSON.parse(text);
}