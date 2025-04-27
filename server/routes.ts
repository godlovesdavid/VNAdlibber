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
  'You\'re a VN brainstormer. Please generate content based on the given prompt. However, if the story context provided is plot-conflicting, incoherent, sexually explicit, offensive, or has irrelevant characters, or is otherwise difficult to generate content from, return a JSON instead with an error key explaining the issue like: { "error": "Brief description of why the content is invalid." }';

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
      const prompt = `Given this story context:
        Theme: ${basicData.theme}
        Tone: ${basicData.tone}
        Genre: ${basicData.genre}
        Generate a story concept in a JSON as structured
        {
          "title": "Intriguing title",
          "tagline": "Very short & memorable catchphrase (<10 words and no period)",
          "premise": "Premise & main conflict in < 50 words. Don't name names (designed later)"
        }
        Be wildly imaginative, original, and surprising — but keep it emotionally resonant.
      `;

      // Generate concept using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 1.0,
        frequency_penalty: 0.2,
        presence_penalty: 0.5,
        top_p: 1.0,
        stop: null,
        messages: [
          // {
          //   role: "system",
          //   content: standardValidationInstructions,
          // },
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

  app.post("/api/generate/characters", async (req, res) => {
    try {
      const { indices, characterTemplates, projectContext } = req.body;

      // Create prompt for the character generation
      const prompt = `Given this story context:
        ${JSON.stringify(projectContext, null, 2)}
        Generate exactly ${indices.length} character${indices.length > 1 ? "s" : ""} as a JSON:
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
              "appearance": "Physical description (<15 words)",
              "personality": "Key personality traits and behaviors (<40 words)",
              "goals": "Primary motivations and objectives (<40 words)",
              "relationshipPotential": "${indices.length == 1 && indices[0] == 0 ? "(Leave blank)" : "Relationship potential with main protagonist. Lovers must be opposite gender. (<15 words)"}",
              "conflict": "Their primary internal or external struggle (<40 words)"
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
        Ensure unique characters with varying strengths, flaws, and motivations, and fit story concept
        Character one is the main protagonist`
        }
      `;
      console.log("Prompt:", prompt);
      // Generate characters using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        temperature: 1.0,
        frequency_penalty: 0.1,
        presence_penalty: 0.2,
        top_p: 1.0,
        messages: [
          // {
          //   role: "system",
          //   content: standardValidationInstructions,
          // },
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

      // Return array of characters
      res.json("characters" in parsed ? parsed.characters : [parsed]);
    } catch (error) {
      console.error("Error generating characters:", error);
      res.status(500).json({
        message: "Failed to generate characters for whatever reason.",
      });
    }
  });

  // For backward compatibility, redirecting old endpoints to new unified one
  app.post("/api/generate/character", async (req, res) => {
    try {
      const { index, partialCharacter, projectContext } = req.body;

      // Redirect to the unified endpoint
      const response = await fetch(
        `${req.protocol}://${req.get("host")}/api/generate/characters`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            indices: [index],
            characterTemplates: [partialCharacter],
            projectContext,
          }),
        },
      );

      const characters = await response.json();
      // Return just the first character for backward compatibility
      res.json(characters[0]);
    } catch (error) {
      console.error("Error in character redirect:", error);
      res.status(500).json({ message: "Failed to generate character" });
    }
  });

  app.post("/api/generate/characters-bundle", async (req, res) => {
    try {
      const { characterTemplates, projectContext } = req.body;

      // Create indices array based on the number of templates
      const indices = Array.from(
        { length: characterTemplates.length },
        (_, i) => i,
      );

      // Redirect to the unified endpoint
      const response = await fetch(
        `${req.protocol}://${req.get("host")}/api/generate/characters`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            indices,
            characterTemplates,
            projectContext,
          }),
        },
      );

      const characters = await response.json();
      // Wrap in characters object for backward compatibility
      res.json({ characters });
    } catch (error) {
      console.error("Error in characters-bundle redirect:", error);
      res.status(500).json({ message: "Failed to generate characters bundle" });
    }
  });

  app.post("/api/generate/paths", async (req, res) => {
    try {
      const { indices, pathTemplates, projectContext } = req.body;

      // Create prompt for the path generation
      const prompt = `Given this story context:
        ${JSON.stringify(projectContext, null, 2)}
        Generate exactly ${indices.length} plot arc${indices.length > 1 ? "s" : ""} as JSON:
        {
          "paths":
          [
            {
              "title": "Path title",
              "loveInterest": "(optional) One of the opposite-gender characters otherwise leave as null",
              "keyChoices": "Comma-separated choices that alter the course of story",
              "beginning": "Description of how this route begins (< 30 words)",
              "middle": "Description of conflict escalation and unexpected twists (< 30 words)",
              "climax": "Description of the highest tension moment of this path (< 30 words)",
              "goodEnding": "Description of positive resolution (< 20 words)",
              "badEnding": "Description of negative outcome (< 20 words)"
            }
          ]
        }
        Ensure unique + distinct paths
      `;
      console.log("Prompt:", prompt);

      // Generate paths using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        temperature: 1.0,
        frequency_penalty: 0.1,
        presence_penalty: 0.2,
        top_p: 1.0,
        messages: [
          {
            role: "system",
            content: standardValidationInstructions,
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

      // Check if the response contains an error and return early if it does
      if (checkResponseForError(parsed, res)) {
        return;
      }

      // Return array of paths (not wrapped in an object)
      res.json(parsed.paths);
    } catch (error) {
      console.error("Error generating paths:", error);
      res.status(500).json({ message: "Failed to generate paths" });
    }
  });

  // For backward compatibility, redirecting old endpoints to new unified one
  app.post("/api/generate/path", async (req, res) => {
    try {
      const { index, partialPath, projectContext } = req.body;

      // Redirect to the unified endpoint
      const response = await fetch(
        `${req.protocol}://${req.get("host")}/api/generate/paths`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            indices: [index],
            pathTemplates: [partialPath],
            projectContext,
          }),
        },
      );

      const paths = await response.json();
      // Return just the first path for backward compatibility
      res.json(paths[0]);
    } catch (error) {
      console.error("Error in path redirect:", error);
      res.status(500).json({ message: "Failed to generate path" });
    }
  });

  app.post("/api/generate/paths-bundle", async (req, res) => {
    try {
      const { pathTemplates, projectContext } = req.body;

      // Create indices array based on the number of templates
      const indices = Array.from({ length: pathTemplates.length }, (_, i) => i);

      // Redirect to the unified endpoint
      const response = await fetch(
        `${req.protocol}://${req.get("host")}/api/generate/paths`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            indices,
            pathTemplates,
            projectContext,
          }),
        },
      );

      const paths = await response.json();
      // Wrap in paths object for backward compatibility
      res.json({ paths });
    } catch (error) {
      console.error("Error in paths-bundle redirect:", error);
      res.status(500).json({ message: "Failed to generate paths bundle" });
    }
  });

  app.post("/api/generate/plot", async (req, res) => {
    try {
      const { projectContext } = generatePlotSchema.parse(req.body);

      // Create prompt for the plot generation
      const prompt = `Given this story context:
        ${JSON.stringify(projectContext, null, 2)}
        Generate the master plot outline in a JSON as structured
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
        Structure the plot into 5 acts: Introduction, Rising Action, Midpoint Twist, Escalating Conflict, Resolution/Endings
      `;
      console.log("Prompt:", prompt);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: standardValidationInstructions,
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

      // Check if the response contains an error and return early if it does
      if (checkResponseForError(generatedPlot, res)) {
        return;
      }

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
      const prompt = `Create scenes for Act ${actNumber} of a visual novel with the following context:
        ${JSON.stringify(projectContext, null, 2)}
        Create approximately ${scenesCount} scenes for this act following the structure from the plot outline:
        Generate a JSON as structured:
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
              ],
              "choices": [
                {
                  "id": "choice1",
                  "text": "Choice text displayed to player",
                  "delta": {"relationshipVar": 1},
                  "next": "${actNumber}-2a" //can also be 
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
        IMPORTANT
        -Make sure scene IDs are sequential and use format "${actNumber}-1", "${actNumber}-2" etc.
        -Include branching paths based on choices.
        -Some choices may have conditions that check player relationship values.
        -The final scene of the act should have choices set to null.
        -Include meaningful "delta" values for relationships, inventory items or skills.
        -Make sure the "next" property always points to a valid scene ID.
        -Review for plot conflicts, incoherence, or offensive content before finalizing.
      `;
      console.log("Prompt:", prompt);

      // Generate act using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: standardValidationInstructions,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 32768,
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

      // Check if the response contains an error and return early if it does
      if (checkResponseForError(generatedAct, res)) {
        return;
      }

      res.json(generatedAct);
    } catch (error) {
      console.error("Error generating act:", error);
      res.status(500).json({ message: "Failed to generate act" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
