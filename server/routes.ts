import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertVnProjectSchema, insertVnStorySchema } from "@shared/schema";

// Use Google's Gemini API instead of OpenAI
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
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

    // Construct the request body
    const requestBody = {
      contents: [
        ...(systemPrompt
          ? [{ role: "model", parts: [{ text: systemPrompt }] }]
          : []),
        { role: "user", parts: [{ text: prompt }] },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        topK: 64,
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
      
      // Clean response text of markdown code blocks if present
      if (responseText.startsWith("```")) {
        // Strip opening code block markers (```json or just ```)
        responseText = responseText.replace(/^```(?:json|javascript)?\s*\n/, "");
        // Strip closing code block markers
        responseText = responseText.replace(/\n```\s*$/, "");
      }
      
      return responseText;
    } else {
      throw new Error("Unexpected Gemini API response format");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

// Helper function to check for error in OpenAI responses
function checkResponseForError(parsedResponse: any, res: any): boolean {
  if ("error" in parsedResponse) {
    console.error("AI validation error:", parsedResponse.error);
    res.status(400).json({ message: parsedResponse.error });
    return true;
  }
  return false;
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Project CRUD operations
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

      // If validation failed, return the error
      if (!validationResult.valid && validationResult.issues) {
        return res.status(400).json({ message: validationResult.issues });
      }

      // If there's an explicit error, return it
      if (validationResult.error) {
        return res.status(400).json({ message: validationResult.error });
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
      const systemPrompt = "You're a wildly imaginative and slightly crazy film brainstormer creating characters for a visual novel";
      const responseContent = await generateWithGemini(prompt, systemPrompt);
      
      console.log(`Generating ${indices.length} characters at once`);
      console.log("Got:", responseContent);

      // Parse response
      if (responseContent === "{}") throw "Empty response";
      const parsed = JSON.parse(responseContent || "{}");

      // Check if the response contains an error and return early if it does
      if (checkResponseForError(parsed, res)) {
        return;
      }

      // Return array of characters directly (not wrapped in an object)
      res.json("characters" in parsed ? parsed.characters : [parsed]);
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
      const systemPrompt = "You're a visual novel brainstormer creating plot paths";
      const responseContent = await generateWithGemini(prompt, systemPrompt);
      
      console.log(`Generating ${indices.length} paths at once`);
      console.log("Got:", responseContent);

      // Parse
      if (responseContent === "{}") throw "Empty response";
      const parsed = JSON.parse(responseContent || "{}");

      // Return array of paths directly (not wrapped in an object)
      res.json(parsed.paths);
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
      const systemPrompt = "You're a visual novel brainstormer creating a comprehensive plot outline";
      const responseContent = await generateWithGemini(prompt, systemPrompt);
      
      // Log the generated response for debugging
      console.log("Generated plot outline:", responseContent);

      // Parse the generated plot
      const generatedPlot = JSON.parse(responseContent || "{}");

      res.json(generatedPlot);
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
        Create approximately ${scenesCount} scenes for Act ${actNumber} of the plot outline.
        Return a JSON as structured:
        {
          "scenes": [
            {
              "id": "${actNumber}-1",
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
                  "next": "${actNumber}-1a"
                },
                {
                  "id": "choice2",
                  "text": "Alternative choice text",
                  "delta": {"character2": 1},
                  "next": "${actNumber}-1b"
                }
                {
                  "id": "choice3",
                  "text": "Alternative choice text",
                  "next": "${actNumber}-2"
                }
              ]
            },
            {
              "id": "${actNumber}-final",
              "setting": "Final location",
              "dialogue": [
                ["Character", "Final dialogue for this act"]
              ],
              "choices": null
            }
          ]
        }
        Notes:
        - Scene ids have format <Act#>-<Scene#>. 
        - Include branching paths based on 2-4 choices. Choices that don't take you to another scene have letters e.g. <Act#>-<Scene#>b, where they continue the dialogue conversation.
        - Final scene of act should have choices set to null.
        - Relationships, inventory items, or skills can be added or subtracted by "delta" values.
        - Pack each scene with ample dialogue to express the story (5-15+ lines). Be inventive about event details, while ensuring consistency with the plot outline.
        - Use of a narrator is encouraged to explain the scene or provide context.
        - Main protagonist may think in parentheses.
        - Unknown characters are named "???" until revealed.
        - Maintain the given tone (${projectContext.basicData.tone}) consistent with the story context.
        - You may optionally include [emotion] or [action] tags before dialogue when it enhances the scene.
        - If a choice increases or decreases a relationship, reflect it subtly in the dialogue tone.
        - Some choices may succeed or fail based on condition of relationship values, items, or skills. To do this, add a "condition" value in the choice (see below).
        Here is a sample scene that blocks paths based on relationship requirements. Player tries to enter the engine room, but cannot due to his relationship value with Bruno being less than 2. If player has at least 2 points with Bruno, they proceed to the "failNext" scene 2-5a. Otherwise, they proceed to "next" scene 2-5b. 
        {
          "id": "2-5",
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
            "next": "2-5a",
            "failNext": "2-5b" 
          },
          {
            "id": "ask_trust",
            "text": "Ask how to earn his trust",
            "next": "2-5c"
          }
          ]
        },
        {
          "id": "2-5b",
          "bg": "door blocked",
          "dialogue": [
          ["Bruno", "Not yet. You're not ready."]
          ]
        }
      `;
      console.log("Act generation prompt:", prompt);

      // Generate act using Gemini
      const systemPrompt = "You're a visual novel brainstormer creating detailed scenes with dialogue and choices";
      // Set longer maxOutputTokens for act generation which requires more tokens
      const responseContent = await generateWithGemini(prompt, systemPrompt, "JSON", 16384);
      
      // Log the generated response for debugging
      console.log(
        `Generated Act ${actNumber}:`,
        responseContent?.substring(0, 200) + "..."
      );

      // Parse the generated act
      const generatedAct = JSON.parse(responseContent || "{}");

      res.json(generatedAct);
    } catch (error) {
      console.error("Error generating act:", error);
      res.status(500).json({ message: "Failed to generate act" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
