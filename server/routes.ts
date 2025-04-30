import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertVnProjectSchema, insertVnStorySchema } from "@shared/schema";
import { generateSceneBackgroundImage } from "./image-generator";

// Use Google's Gemini API instead of OpenAI for text generation
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";
const GEMINI_API_KEY = "AIzaSyDE-O9FT4wsie2Cb5SWNUhNVszlQg3dHnU";

// Helper function for Gemini API calls
async function generateWithGemini(
  prompt: string,
  systemPrompt: string | null = null,
  responseFormat = "JSON",
  maxOutputTokens = 8192,
) {
  try {
    const headers = {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    };

    // Add strict JSON formatting instructions
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

Example of CORRECT JSON format:
{
  "property": "value",
  "array": [1, 2, 3],
  "object": {
    "nested": true
  }
}
`;

    // Add the JSON formatting instructions to the prompt
    const enhancedPrompt = `${prompt}\n\n${jsonFormatInstructions}`;

    // Construct the request body
    const requestBody = {
      contents: [
        ...(systemPrompt
          ? [{ role: "model", parts: [{ text: systemPrompt }] }]
          : []),
        { role: "user", parts: [{ text: enhancedPrompt }] },
      ],
      generationConfig: {
        temperature: 0.2, // Lower temperature for stricter adherence to formatting
        topP: 0.9,
        topK: 40,
        maxOutputTokens: maxOutputTokens,
      },
    };

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", errorData);
      throw new Error(
        `Gemini API error: ${errorData.error?.message || "Unknown error"}`,
      );
    }

    const data = await response.json();

    // Extract the text from the response
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      let responseText = data.candidates[0].content.parts[0].text;

      // Clean response text of potential issues
      responseText = cleanResponseText(responseText);

      return responseText;
    } else {
      throw new Error("Unexpected Gemini API response format");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

// Helper function to check for error in AI responses
function checkResponseForError(parsedResponse: any, res: any): boolean {
  // Check for error in the response
  if ("error" in parsedResponse) {
    console.error("AI validation error:", parsedResponse.error);

    // Format the error message for display
    const errorMessage =
      typeof parsedResponse.error === "string"
        ? parsedResponse.error
        : JSON.stringify(parsedResponse.error);

    // Return the error with status 400 and infinite duration for the toast
    res.status(400).json({
      message: errorMessage,
      errorType: "validation_error",
      duration: "infinite", // Signal to the frontend that this error should persist
    });

    return true;
  }

  // For content with other types of validation issues
  if (parsedResponse.validation_issues) {
    console.error("AI validation issues:", parsedResponse.validation_issues);

    res.status(400).json({
      message: Array.isArray(parsedResponse.validation_issues)
        ? parsedResponse.validation_issues.join(", ")
        : String(parsedResponse.validation_issues),
      errorType: "validation_issue",
      duration: "infinite",
    });

    return true;
  }

  return false;
}

// Helper function to clean response text of common issues before parsing
function cleanResponseText(text: string): string {
  // Strip markdown code blocks if present
  if (text.startsWith("```")) {
    // Strip opening code block markers (```json or just ```)
    text = text.replace(/^```(?:json|javascript)?\s*\n/, "");
    // Strip closing code block markers
    text = text.replace(/\n```\s*$/, "");
  }

  // Replace JavaScript string concatenation in JSON with plain text
  // e.g., "name": "Geargrind " + "Cogsworth" becomes "name": "Geargrind Cogsworth"
  text = text.replace(/"([^"]+)" \+ "([^"]+)"/g, '"$1$2"');

  // Remove any JS-style comments
  text = text.replace(/\/\/.*$/gm, "");
  text = text.replace(/\/\*[\s\S]*?\*\//g, "");

  // Fix common JSON syntax errors

  // Fix missing quotes around property names
  text = text.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');

  // Fix trailing commas in arrays and objects
  text = text.replace(/,(\s*[\]}])/g, "$1");

  // Fix missing commas between array elements or object properties
  text = text.replace(/([}\]"'0-9])\s*\n\s*([{\["a-zA-Z0-9_])/g, "$1,\n$2");

  // Ensure proper quoting of string values
  text = text.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,\n\r}])/g, ': "$1"$2');

  // Add missing quotes to property values that look like unquoted strings
  // This could be risky but might help in some cases
  text = text.replace(
    /:\s*([a-zA-Z][a-zA-Z0-9_\s]*[a-zA-Z0-9_])(\s*[,\n\r}])/g,
    ': "$1"$2',
  );

  return text;
}

// Standard system prompt for content validation
const standardValidationInstructions =
  "Return a JSON based on the given story context. ";

// Explicit validation system prompt that prevents "looks good" errors
//If story context is plot-conflicting, incoherent, sexually explicit, or offensive, then instead return a JSON with an error key explaining the issue like this: { "error": "Brief description of why the content is invalid." }
const validationSystemPrompt = `You are a strict validation assistant for Visual Novel (VN) project data.

You will receive JSON input containing:
- "basicData": an object containing story theme, tone, and genre
- "conceptData": an object describing the central concept
- "characterData": an object describing characters
- "pathsData": an object describing plot arcs

Your job is to validate the following:
1. Every major character must appear meaningfully in the plot.
2. Each character's "role" and "goals" must logically align with the plot's story.
3. The plot's beginning, middle, climax, and endings must make sense based on the provided characters.

Validation Rules:
- If the data is fully consistent and complete, reply exactly with:
  { "valid": true }
- If there are problems, reply with:
  {
    "valid": false,
    "issues": "list issues here"
  }
  IMPORTANT:
  Do NOT invent missing information.
  Do NOT suggest fixes.
  ONLY report validation status.
`;

// Schema for generation requests
const generateConceptSchema = z.object({
  basicData: z.object({
    theme: z.string(),
    tone: z.string(),
    genre: z.string(),
  }),
});

const generateCharacterSchema = z.object({
  index: z.number(),
  partialCharacter: z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    gender: z.string().optional(),
    age: z.string().optional(),
  }),
  projectContext: z.any(),
});

const generateMultipleCharactersSchema = z.object({
  characterTemplates: z.array(
    z.object({
      name: z.string().optional(),
      role: z.string().optional(),
      gender: z.string().optional(),
      age: z.string().optional(),
    }),
  ),
  projectContext: z.any(),
});

const generatePathSchema = z.object({
  index: z.number(),
  partialPath: z.object({
    title: z.string().optional(),
    loveInterest: z.string().nullable().optional(),
  }),
  projectContext: z.any(),
});

const generateMultiplePathsSchema = z.object({
  pathTemplates: z.array(
    z.object({
      title: z.string().optional(),
      loveInterest: z.string().nullable().optional(),
    }),
  ),
  projectContext: z.any(),
});

const generatePlotSchema = z.object({
  projectContext: z.any(),
});

const generateActSchema = z.object({
  actNumber: z.number(),
  scenesCount: z.number(),
  projectContext: z.any(),
});

const generateImageSchema = z.object({
  scene: z.object({
    id: z.string(),
    bg: z.string(),
  }),
  theme: z.string().optional(),
  imageType: z.enum(["background", "character"]).default("background"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Project CRUD operations
  // OpenAI endpoint has been removed in favor of RunPod

  // Test RunPod API connectivity
  app.get("/api/test/runpod", async (req, res) => {
    try {
      console.log("Testing RunPod API connectivity...");

      const endpointId = process.env.RUNPOD_ENDPOINT_ID || "sdxl";
      const apiKey = process.env.RUNPOD_API_KEY;

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message:
            "RunPod API key is missing. Please add RUNPOD_API_KEY to your environment variables.",
        });
      }

      try {
        // Test the RunPod API by checking endpoint health
        const healthCheckUrl = `https://api.runpod.ai/v2/${endpointId}/health`;
        console.log(`Checking RunPod endpoint health: ${endpointId}`);

        const response = await fetch(healthCheckUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return res.json({
            success: true,
            message: "RunPod API connection successful",
            response: data,
            endpoint: endpointId,
          });
        } else {
          const errorText = await response.text();
          return res.status(response.status).json({
            success: false,
            message: `RunPod API error: ${response.status} ${response.statusText}`,
            response: errorText,
            endpoint: endpointId,
          });
        }
      } catch (apiError) {
        console.error("RunPod API error:", apiError);
        return res.status(500).json({
          success: false,
          message:
            apiError instanceof Error
              ? apiError.message
              : "Unknown RunPod API error",
        });
      }
    } catch (error) {
      console.error("Error testing RunPod API:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // DALL-E endpoint has been removed in favor of RunPod

  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = req.body;

      // If project has an ID, update it
      if (projectData.id) {
        const updatedProject = await storage.updateProject(
          projectData.id,
          projectData,
        );
        return res.json(updatedProject);
      }

      // Otherwise create a new project
      const newProject = await storage.createProject(projectData);
      res.status(201).json(newProject);
    } catch (error) {
      console.error("Error saving project:", error);
      res.status(500).json({ message: "Failed to save project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // VN Story CRUD operations
  app.get("/api/stories", async (req, res) => {
    try {
      const stories = await storage.getStories();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  app.post("/api/stories", async (req, res) => {
    try {
      const storyData = insertVnStorySchema.parse(req.body);
      const newStory = await storage.createStory(storyData);
      res.status(201).json(newStory);
    } catch (error) {
      console.error("Error saving story:", error);
      res.status(500).json({ message: "Failed to save story" });
    }
  });

  // Unified validation endpoint for all content types
  app.post("/api/validate", async (req, res) => {
    try {
      const { projectContext, contentType } = req.body;

      // Create prompt for validation based on content type
      const validationPrompt = `Please validate this story context for a visual novel ${contentType}:
        ${JSON.stringify(projectContext, null, 2)}
        
        If the data is valid, respond with:
        { "valid": true }
        
        If there are problems, respond with:
        {
          "valid": false,
          "issues": "list issues here"
        }
        
        If story context is plot-conflicting, incoherent, sexually explicit, or offensive, then respond with a JSON with an error key explaining the issue like this: 
        { "error": "Brief description of why the content is invalid." }
      `;

      // Log validation request details
      console.log(`${contentType.toUpperCase()} validation request received`);

      // Validate using Gemini
      const responseContent = await generateWithGemini(
        validationPrompt,
        validationSystemPrompt,
      );

      console.log(
        `${contentType.toUpperCase()} validation result:`,
        responseContent,
      );

      // Parse validation response
      const validationResult = JSON.parse(responseContent || "{}");

      // Use the standard error checking function for validation errors
      if (checkResponseForError(validationResult, res)) {
        return;
      }

      // If validation failed and we have issues, return them with infinite duration
      if (!validationResult.valid && validationResult.issues) {
        return res.status(400).json({
          message: validationResult.issues,
          errorType: "validation_issue",
          duration: "infinite",
        });
      }

      // If validation passed, return success
      res.json(validationResult);
    } catch (error) {
      console.error("Error validating content:", error);
      res.status(500).json({ message: "Failed to validate content" });
    }
  });

  // AI Generation endpoints
  app.post("/api/generate/concept", async (req, res) => {
    try {
      const { basicData } = generateConceptSchema.parse(req.body);

      // Create prompt for the concept generation
      const prompt = `Given this VN story context:
        Theme: ${basicData.theme}
        Tone: ${basicData.tone}
        Genre: ${basicData.genre}
        Return a story concept in a JSON as structured:
        {
          "title": "Intriguing title",
          "tagline": "Very short & memorable catchphrase (<10 words and no period)",
          "premise": "Premise & main conflict. Don't name names (designed later)"
        }
        Be wildly imaginative, original, and surprising — but keep it emotionally resonant.
      `;
      console.log("Concept generation prompt:", prompt);

      // Use Gemini to generate the concept
      const systemPrompt =
        "You're a visual novel brainstormer with wildly creative ideas";
      const responseContent = await generateWithGemini(prompt, systemPrompt);

      console.log("Generated concept:", responseContent);

      // Parse the generated concept
      const generatedConcept = JSON.parse(responseContent || "{}");

      // Check if the response contains an error and return early if it does
      if (checkResponseForError(generatedConcept, res)) {
        return;
      }

      res.json(generatedConcept);
    } catch (error) {
      console.error("Error generating concept:", error);
      res.status(500).json({ message: "Failed to generate concept" });
    }
  });

  // Character generation endpoint
  app.post("/api/generate/character", async (req, res) => {
    try {
      const { characterTemplates, projectContext } = req.body;

      // Create indices array based on the number of templates
      const indices = Array.from(
        { length: characterTemplates.length },
        (_, i) => i,
      );

      // Create prompt for the character generation
      const prompt = `Given this story context:
        ${JSON.stringify(projectContext, null, 2)}
        Return exactly ${indices.length} character${indices.length > 1 ? "s" : ""} as a JSON:
        ${
          indices.length > 1
            ? `
        {
          "characters":
          [`
            : ""
        }
            {
              "name": "Memorable name",
              "role": "${indices.length == 1 && indices[0] == 0 ? "Main Protagonist" : "Story role e.g. antagonist"}",
              "occupation": "Can be unemployed",
              "gender": "Can be robot/AI",
              "age": "Age as a string",
              "appearance": "Physical description",
              "personality": "Key personality traits and behaviors",
              "goals": "Primary motivations and objectives",
              "relationshipPotential": "${indices.length == 1 && indices[0] == 0 ? "(Leave blank)" : "Relationship potential with main protagonist. Lovers must be opposite gender."}",
              "conflict": "Their primary internal or external struggle"
            } ${
              indices.length > 1
                ? `
          ]
        }`
                : ""
            }
        ${
          indices.length == 1
            ? ""
            : `
        Ensure unique characters with varying strengths, flaws, and motivations, and fit story concept. 
        Character one is the main protagonist.`
        }
      `;
      console.log("Generating character prompt:", prompt);

      // Generate characters using Gemini
      const systemPrompt =
        "You're a wildly imaginative and slightly crazy film brainstormer creating characters for a visual novel";
      const responseContent = await generateWithGemini(prompt, systemPrompt);

      console.log(`Generating ${indices.length} characters at once`);
      console.log("Got:", responseContent);

      // Try to parse response
      try {
        if (responseContent === "{}") throw new Error("Empty response");

        console.log("Cleaned response:", responseContent);
        const parsed = JSON.parse(responseContent);

        // Check if the response contains an error and return early if it does
        if (checkResponseForError(parsed, res)) {
          return;
        }

        // Return array of characters directly (not wrapped in an object)
        res.json("characters" in parsed ? parsed.characters : [parsed]);
      } catch (parseError: any) {
        console.error("JSON parse error:", parseError);
        console.error("Problematic JSON:", responseContent);
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }
    } catch (error) {
      console.error("Error generating characters:", error);
      res.status(500).json({
        message: "Failed to generate characters",
      });
    }
  });

  // Path generation endpoint - renamed from paths to path
  app.post("/api/generate/path", async (req, res) => {
    try {
      const { pathTemplates, projectContext } = req.body;

      // Create indices array based on the number of templates
      const indices = Array.from({ length: pathTemplates.length }, (_, i) => i);

      // Create prompt for the path generation
      const prompt = `Given this story context:
        ${JSON.stringify(projectContext, null, 2)}
        Generate exactly ${indices.length} plot arc${indices.length > 1 ? "s" : ""} as a JSON:
        {
          "paths":
          [
            {
              "title": "Path title",
              "loveInterest": "(optional) One of the opposite-gender characters otherwise leave as null",
              "keyChoices": "Comma-separated choices that alter the course of story",
              "beginning": "Description of how this route begins",
              "middle": "Description of conflict escalation and unexpected twists",
              "climax": "Description of the highest tension moment of this path",
              "goodEnding": "Description of positive resolution",
              "badEnding": "Description of negative outcome"
            }
          ]
        }
      `;
      console.log("Generating paths prompt:", prompt);

      // Generate paths using Gemini
      const systemPrompt =
        "You're a visual novel brainstormer creating plot paths";
      const responseContent = await generateWithGemini(prompt, systemPrompt);

      console.log(`Generating ${indices.length} paths at once`);
      console.log("Got:", responseContent);

      // Try to parse response
      try {
        if (responseContent === "{}") throw new Error("Empty response");

        console.log("Cleaned response:", responseContent);
        const parsed = JSON.parse(responseContent);

        // Check if the response contains an error and return early if it does
        if (checkResponseForError(parsed, res)) {
          return;
        }

        // Return array of paths directly (not wrapped in an object)
        res.json(parsed.paths);
      } catch (parseError: any) {
        console.error("JSON parse error:", parseError);
        console.error("Problematic JSON:", responseContent);
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }
    } catch (error) {
      console.error("Error generating paths:", error);
      res.status(500).json({ message: "Failed to generate paths" });
    }
  });

  app.post("/api/generate/plot", async (req, res) => {
    try {
      const { projectContext } = generatePlotSchema.parse(req.body);

      // Create prompt for the plot generation
      const prompt = `Given this story context:
        ${JSON.stringify(projectContext, null, 2)}
        Return a master plot outline in a JSON as structured:
        {
          "plotOutline": {
            "act1": {
              "title": "Act 1 Title",
              "summary": "Brief overview of Act 1",
              "events": ["Event 1", "Event 2", "Event 3", "Event 4", "Event 5"],
              "arcsActivated": ["route1", "route2"],
              "arcIntersections": ["Intersection 1", "Intersection 2"],
              "playerChoices": ["Choice 1 - Consequences", "Choice 2 - Consequences"]
            },
            "act2": {...},
            "act3": {...},
            "act4": {...},
            "act5": {...}
          }
        }
        Structure the plot into 5 acts: Introduction, Rising Action, Midpoint Twist, Escalating Conflict, Resolution/Endings.
        Be descriptive and inventive about events in order to flesh out the story.
      `;
      console.log("Plot generation prompt:", prompt);

      // Generate plot using Gemini
      const systemPrompt =
        "You're a visual novel brainstormer creating a comprehensive plot outline";
      const responseContent = await generateWithGemini(prompt, systemPrompt);

      // Log the generated response for debugging
      console.log("Generated plot outline:", responseContent);

      // Try to parse response
      try {
        if (responseContent === "{}") throw new Error("Empty response");

        console.log("Cleaned response:", responseContent);
        const generatedPlot = JSON.parse(responseContent);

        // Check if the response contains an error and return early if it does
        if (checkResponseForError(generatedPlot, res)) {
          return;
        }

        res.json(generatedPlot);
      } catch (parseError: any) {
        console.error("JSON parse error:", parseError);
        console.error("Problematic JSON:", responseContent);
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }
    } catch (error) {
      console.error("Error generating plot:", error);
      res.status(500).json({ message: "Failed to generate plot" });
    }
  });

  app.post("/api/generate/act", async (req, res) => {
    try {
      const { actNumber, scenesCount, projectContext } =
        generateActSchema.parse(req.body);

      // Create prompt for the act generation
      const prompt = `You are tasked with bringing this story to life:
        ${JSON.stringify(projectContext, null, 2)}
        Create scenes for Act ${actNumber} of the plot outline and return a JSON as structured:
        {
          "scenes": [
            {
              "id": "Act ${actNumber} Scene 1",
              "setting": "Name of the location",
              "bg": "Detailed background description for image generation",
              "dialogue": [
                ["Narrator", "text"]
                ["Character Name", "text"],
                ["Another Character", "text"]
              ],
              "choices": [
                {
                  "id": "choice1",
                  "text": "Choice text displayed to player",
                  "description": "Optional: brief description of choice consequences",
                  "delta": {"character1": 1, "character2": -1},
                  "next": "Act ${actNumber} Scene 1a"
                },
                {
                  "id": "choice2",
                  "text": "Alternative choice text",
                  "delta": {"character2": 1},
                  "next": "Act ${actNumber} Scene 1b"
                }
                {
                  "id": "choice3",
                  "text": "Alternative choice text",
                  "next": "Act ${actNumber} Scene 2"
                }
              ]
            }
          ]
        }
        Instructions:
        - Do not generate any other act except Act ${actNumber}.
        - Create approximately ${scenesCount} scenes for Act ${actNumber}, or more if necessary to convey Act ${actNumber}.
        - Include branching paths based on 2-4 choices. Choices may continue the dialogue conversation in the same scene and are marked with a letter e.g. Act ${actNumber} Scene 1b.
        - Final scene of act should have choices set to null. Otherwise, ensure the scene connects to another scene.
        - Relationships, inventory items, or skills can be added or subtracted by "delta" values.
        - Pack each scene with ample dialogue to express the story (5-15+ lines). Be inventive and creative about event details, while ensuring consistency with the plot outline.
        - Use of a narrator is encouraged to explain the scene or provide context.
        - The protagonist may think in parentheses.
        - Unknown characters are named "???" until revealed.
        - "bg" value is used for AI image generation prompts and is only required when the setting is visited the first time.
        - Maintain the given tone (${projectContext.basicData.tone}) consistent with the story context.
        - You may optionally include [emotion] or [action] tags before dialogue when it enhances the scene.
        - If a choice increases or decreases a relationship, reflect it subtly in the dialogue tone.
        - Some choices may succeed or fail based on condition of relationship values, items, or skills. To do this, add a "condition" value in the choice (see below).
        Here is a sample scene that blocks paths based on relationship requirements. Player tries to enter the engine room, but cannot due to his relationship value with Bruno being less than 2. If player has at least 2 points with Bruno, they proceed to the "failNext" scene 2-5a. Otherwise, they proceed to "next" scene 2-5b. 
        {
          "id": "Act 2 Scene 5",
          "setting": "Engine Room",
          "bg":"dimly lit engine room, flickering valves, massive pressure dials, creaking pipes overhead"
          "dialogue": [
          ["Bruno", "Only someone I trust can see this."]
          ],
          "choices": [
          {
            "id": "enter_room",
            "text": "Try to enter the engine room",
            "condition": { "bruno": 2 },
            "next": "Act 2 Scene 5a",
            "failNext": "Act 2 Scene 5b" 
          },
          {
            "id": "ask_trust",
            "text": "Ask how to earn his trust",
            "next": "Act 2 Scene 5c"
          }
          ]
        },
        {
          "id": "Act 2 Scene 5b",
          "bg": "door blocked",
          "dialogue": [
          ["Bruno", "Not yet. You're not ready."]
          ]
        }
      `;
      console.log("Act generation prompt:", prompt);

      // Generate act using Gemini
      const systemPrompt =
        "You're a visual novel brainstormer creating detailed scenes with dialogue and choices";
      // Set longer maxOutputTokens for act generation which requires more tokens
      const responseContent = await generateWithGemini(
        prompt,
        systemPrompt,
        "JSON",
        8192,
      );

      // Log the generated response for debugging
      console.log(`Generated Act ${actNumber}:`, responseContent);

      // Try to parse response
      try {
        if (responseContent === "{}") throw new Error("Empty response");

        // Try standard JSON parsing first
        let generatedAct;
        try {
          generatedAct = JSON.parse(responseContent);
        } catch (initialParseError) {
          console.log(
            "Initial JSON parse failed, attempting more aggressive cleanup...",
          );

          // More aggressive cleanup for complex Act data
          let cleanedContent = responseContent;

          // Try to isolate just the scenes array if we can find the pattern
          const scenesMatch = cleanedContent.match(
            /\{\s*"scenes"\s*:\s*\[[\s\S]*\]\s*\}/,
          );
          if (scenesMatch) {
            cleanedContent = scenesMatch[0];
            console.log("Found scenes block, isolating it...");
          }

          // Additional fix for common issues in the act JSON
          // Fix missing commas in arrays between objects
          cleanedContent = cleanedContent.replace(/}(\s*){/g, "},\n{");

          // Fix missing commas between dialogue array elements
          cleanedContent = cleanedContent.replace(/\](\s*)\[/g, "],\n[");

          // Fix any trailing commas before closing brackets
          cleanedContent = cleanedContent.replace(/,(\s*[\]}])/g, "$1");

          // Special fix for the bg property missing quotes
          // cleanedContent = cleanedContent.replace(
          //   /"bg":([^,"\{\}\[\]]*),/g,
          //   '"bg":"$1",',
          // );

          console.log(
            "Applied aggressive cleanup, attempting to parse again...",
          );
          generatedAct = JSON.parse(cleanedContent);
        }

        // Check if the response contains an error and return early if it does
        if (checkResponseForError(generatedAct, res)) {
          return;
        }
        res.json(generatedAct);
      } catch (parseError: any) {
        console.error("JSON parse error:", parseError);
        console.error(
          "Problematic JSON (first 200 chars):",
          responseContent.substring(0, 200) + "...",
        );
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }
    } catch (error) {
      console.error("Error generating act:", error);
      res.status(500).json({ message: "Failed to generate act" });
    }
  });

  // Image generation endpoint
  app.post("/api/generate/image", async (req, res) => {
    try {
      console.log("Image generation endpoint called with body:", req.body);

      // Check if RunPod API key is configured
      if (!process.env.RUNPOD_API_KEY) {
        console.error("RunPod API key is missing");
        return res.status(401).json({
          error:
            "RunPod API key is missing. Please add the RUNPOD_API_KEY secret in your environment variables.",
        });
      }

      const { scene, theme, imageType, forceReal, optimizeForMobile } =
        req.body;

      // Parse with the schema, but allow forceReal and optimizeForMobile to pass through
      generateImageSchema.parse({ scene, theme, imageType });

      // We no longer need to check for forceReal since we always use RunPod now

      // Check if we should use optimized image settings (smaller/cheaper)
      const useOptimizedSettings = optimizeForMobile === true;

      console.log(
        `Image generation request received for scene: ${scene.id}, bg: "${scene.bg}", theme: "${theme || "none"}", type: ${imageType}, optimizeForMobile: ${useOptimizedSettings}`,
      );

      if (imageType === "background") {
        try {
          console.log(
            "Calling RunPod SDXL API with API key:",
            process.env.RUNPOD_API_KEY ? "Present (hidden)" : "Missing",
          );

          // We're now using RunPod's SDXL endpoint for image generation
          console.log("🎨 USING RUNPOD AI - SDXL credits will be consumed");

          // Make sure we have the required API key
          if (!process.env.RUNPOD_API_KEY) {
            console.error("❌ RUNPOD_API_KEY is missing");
            return res.status(500).json({
              error: "RUNPOD_API_KEY is required for image generation",
            });
          }

          // Check if endpoint ID is specified (optional)
          const endpointId = process.env.RUNPOD_ENDPOINT_ID;
          if (endpointId) {
            console.log(`- Using RunPod endpoint ID: ${endpointId}`);
          } else {
            console.log("- Using default RunPod SDXL endpoint");
          }

          const result = await generateSceneBackgroundImage(
            scene.id,
            scene.bg,
            theme,
          );

          // No environment variables to reset since we've removed DALL-E

          console.log(
            `Background image generated for scene ${scene.id}:`,
            result.url ? "Success (URL hidden for privacy)" : "No URL returned",
          );

          // Log the actual URL for debugging (truncated for data URLs)
          if (result.url) {
            const logUrl = result.url.startsWith("data:")
              ? `${result.url.substring(0, 30)}...`
              : result.url;
            console.log(`🎨 RUNPOD AI IMAGE: ${logUrl}`);
          }

          // Include optimization information in the response
          res.json({
            ...result,
            isOptimized: useOptimizedSettings,
          });
        } catch (generateError) {
          console.error("Error generating image with RunPod:", generateError);

          const errorMessage =
            generateError instanceof Error
              ? generateError.message
              : "Unknown error during image generation";

          console.log("Returning error to client:", errorMessage);

          res.status(500).json({
            error: errorMessage.includes("RunPod API")
              ? "Error connecting to RunPod API. Please check your API key and endpoint ID."
              : errorMessage,
          });
        }
      } else {
        // Future extension point for character images
        console.log(
          "Character image generation requested but not implemented yet",
        );
        res
          .status(400)
          .json({ error: "Character image generation not implemented yet" });
      }
    } catch (error) {
      console.error("Error processing image generation request:", error);
      res
        .status(500)
        .json({ error: "Failed to process image generation request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
