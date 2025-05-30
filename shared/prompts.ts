// Shared prompts and configurations for both local and production

export const JSON_FORMAT_INSTRUCTIONS = `
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
}
`;

export const GEMINI_CONFIG = {
  LITE_MODEL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent",
  PRO_MODEL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent",
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4096,
  PRO_MAX_TOKENS: 8192
};

export const PROMPTS = {
  CONCEPT: (theme: string, tone: string, genre: string, setting: string) => 
    `Write a visual novel concept of a ${tone} ${genre} about ${theme} set in ${setting}.
        Return in this JSON format:
        {
          "title": "Captivating and unique title",
          "tagline": "Brief, memorable catchphrase",
          "premise": "Detailed premise describing the world, main conflict, and core story without specific character names"
        }`,

  PLOT: (projectContext: any) => 
    `Based on this visual novel concept, create a detailed plot outline. Focus on the overarching narrative structure, major story beats, and character development arcs.

Title: ${projectContext.title}
Premise: ${projectContext.premise}
Genre: ${projectContext.genre}
Tone: ${projectContext.tone}
Theme: ${projectContext.theme}
Setting: ${projectContext.setting}

Create a comprehensive plot that explores the theme through compelling conflicts and character growth. Return in this JSON format:
{
  "plotSummary": "A detailed overview of the complete story from beginning to end",
  "acts": [
    {
      "title": "Act title that reflects the dramatic progression",
      "description": "What happens in this act and its significance to the overall story",
      "themes": ["key themes explored in this act"]
    }
  ],
  "climax": "Description of the story's climactic moment",
  "resolution": "How the story concludes and themes are resolved"
}`
};