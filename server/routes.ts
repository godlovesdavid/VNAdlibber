import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import { insertVnProjectSchema, insertVnStorySchema } from "@shared/schema";

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

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

      // Generate concept using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        // temperature: 1.2,
        // frequency_penalty: 0.2,
        // presence_penalty: 0.5,
        // top_p: 1.0,
        stop: null,
        messages: [
          {
            role: "system",
            content: "You're a VN brainstormer",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      // Log the generated response for debugging
      console.log("Generated concept:", response.choices[0].message.content);

      // Parse the generated concept
      const generatedConcept = JSON.parse(
        response.choices[0].message.content || "{}",
      );

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

  // Unified validation endpoint for all content types
  app.post("/api/validate", async (req, res) => {
    try {
      const { projectContext, contentType } = req.body;

      // Create prompt for validation based on content type
      const validationPrompt = `Please validate this story context for a visual novel ${contentType}:
        ${JSON.stringify(projectContext, null, 2)}
      `;
      console.log(validationPrompt);

      // Log validation request details
      console.log(`${contentType.toUpperCase()} validation request received`);

      // Validate using OpenAI with explicit validation system prompt
      const validationResponse = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        temperature: 0.0,
        presence_penalty: 0.0,
        frequency_penalty: 0.0,
        top_p: 1.0,
        messages: [
          {
            role: "system",
            content: validationSystemPrompt,
          },
          { role: "user", content: validationPrompt },
        ],
        response_format: { type: "json_object" },
      });

      console.log(
        `${contentType.toUpperCase()} validation result:`,
        validationResponse.choices[0].message.content,
      );

      // Parse validation response
      const validationResult = JSON.parse(
        validationResponse.choices[0].message.content || "{}",
      );

      // If validation failed, return the error
      if (!validationResult.valid)
        return res.status(400).json({ message: validationResult.issues });

      // If validation passed, return success
      res.json(validationResult);
    } catch (error) {
      console.error("Error validating content:", error);
      res.status(500).json({ message: "Failed to validate content" });
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

      // Generate characters using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        // temperature: 0.4,
        // frequency_penalty: 0.1,
        // presence_penalty: 0,
        // top_p: 0.9,
        messages: [
          {
            role: "system",
            content: "You're a VN brainstormer",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      console.log(`Generating ${indices.length} characters at once`);
      console.log("Got:", response.choices[0].message.content);

      // Parse response
      if (response.choices[0].message.content == "{}") throw "Empty response";
      const parsed = JSON.parse(response.choices[0].message.content || "{}");

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

      // Generate paths using OpenAI WITHOUT validation instruction
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        // temperature: 0.4,
        // frequency_penalty: 0.1,
        // presence_penalty: 0,
        // top_p: 0.9,
        messages: [
          {
            role: "system",
            content: "You're a VN brainstormer",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      console.log(`Generating ${indices.length} paths at once`);
      console.log("Got:", response.choices[0].message.content);

      // Parse
      if (response.choices[0].message.content == "{}") throw "Empty response";
      const parsed = JSON.parse(response.choices[0].message.content || "{}");

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

      // Generate plot using OpenAI WITHOUT validation instruction
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You're a VN brainstormer",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      // Log the generated response for debugging
      console.log(
        "Generated plot outline:",
        response.choices[0].message.content,
      );

      // Parse the generated plot
      const generatedPlot = JSON.parse(
        response.choices[0].message.content || "{}",
      );

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
      const prompt = `Given the following story context:
        ${JSON.stringify(projectContext, null, 2)}
        Create approximately ${scenesCount} scenes for Act ${actNumber} of the plot outline.
        Return a JSON as structured:
        {
          "meta": {
            "theme": "theme from context",
            "relationshipVars": ["character1", "character2", "etc"]
          },
          "scenes": [
            {
              "id": "${actNumber}-1",
              "setting": "Name of the location",
              "bg": "Detailed background description for image generation",
              "dialogue": [
                ["Character Name", "Dialogue text"],
                ["Another Character", "Response text"]
                ["Another Character", "Response text"]
              ],
              "choices": [
                {
                  "id": "choice1",
                  "text": "Choice text displayed to player",
                  "delta": {"relationshipVar": 1},
                  "next": "${actNumber}-2a"
                },
                {
                  "id": "choice2",
                  "text": "Alternative choice text",
                  "delta": {"relationshipVar": -1},
                  "next": "${actNumber}-2b"
                }
              ]
            },
            ... more scenes ...
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
        Note:
        -Make sure scene IDs are sequential and use format <Act#>-<Scene#>.
        -Include branching paths based on choices.
        -Some choices may have conditions that check player relationship values.
        -The final scene of the act should have choices set to null.
        -Include meaningful "delta" values for relationships, inventory items or skills.
        -Pack each scene with ample dialogue to express the story.
        -Ensure emotional depth: highlight subtle inner conflicts, irony, longing, and unresolved tension.
        -Use of a narrator is encouraged to explain the scene or provide context.
      `;
      console.log("Act generation prompt:", prompt);

      // Generate act using OpenAI WITHOUT validation instruction
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        // temperature: 0.4,
        // frequency_penalty: 0.1,
        // presence_penalty: 0,
        // top_p: 0.9,
        max_tokens: 16384,
        messages: [
          {
            role: "system",
            content: "You're a VN brainstormer",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      // Log the generated response for debugging
      console.log(
        `Generated Act ${actNumber}:`,
        response.choices[0].message.content?.substring(0, 200) + "...",
      );

      // Parse the generated act
      const generatedAct = JSON.parse(
        response.choices[0].message.content || "{}",
      );

      res.json(generatedAct);
    } catch (error) {
      console.error("Error generating act:", error);
      res.status(500).json({ message: "Failed to generate act" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
