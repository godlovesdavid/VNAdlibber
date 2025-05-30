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
    `Write a visual novel concept of a ${tone.replace(/_/g, " ")} ${genre.replace(/_/g, " ")} about ${theme.replace(/_/g, " ")} set in ${setting.replace(/_/g, " ")}.
        Return in this JSON format:
        {
          "title": "Captivating and unique title",
          "tagline": "Brief, memorable catchphrase",
          "premise": "Detailed premise describing the world, main conflict, and core story without specific character names"
        }`,

  PLOT: (projectContext: any) => 
    `Given this story context:
        ${JSON.stringify(projectContext, null, 2)}
        Return a JSON object with 5 acts (act1 through act5). Format as follows:
        {
          "act1": {
            "title": "Act 1 Title",
            "summary": "Brief overview of Act 1",
            "events": ["Event 1", "Event 2", "Event 3", "Event 4", "Event 5"],
            ${
              Object.keys(projectContext.pathsData).length == 1
                ? ""
                : `"arcsActivated": ["Include route titles from pathsData"],
            "arcIntersections": ["Intersection 1", "Intersection 2"],`
            }
            "playerChoices": ["Choice 1 - Consequences", "Choice 2 - Consequences"]
          },
          "act2": {/* same structure as act1 */},
          "act3": {/* same structure as act1 */},
          "act4": {/* same structure as act1 */},
          "act5": {/* same structure as act1 */}
        }

        Make the 5 acts follow this structure: Introduction, Rising Action, Midpoint Twist, Escalating Conflict, Resolution/Endings.
        Be descriptive and imaginative about events to create a rich visual novel story.`,

  CHARACTER: (projectContext: any, pathTitle: string) => 
    `Create unique characters for this visual novel story. Context:
    ${JSON.stringify(projectContext, null, 2)}
    
    Current path: ${pathTitle}
    
    Create a diverse cast of characters that drives the story forward. Return in this JSON format:
    {
      "mainCharacter": {
        "name": "Character Name",
        "age": "Character Age",
        "description": "Detailed character background and personality",
        "motivation": "What drives this character",
        "role": "protagonist"
      },
      "supportingCharacters": [
        {
          "name": "Character Name",
          "age": "Character Age", 
          "description": "Character background and personality",
          "motivation": "What drives this character",
          "role": "supporting character role"
        }
      ]
    }`
};