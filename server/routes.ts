import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import { insertVnProjectSchema, insertVnStorySchema } from "@shared/schema";

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

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
      const prompt = `Given
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
        temperature: 1.4,
        frequency_penalty: 0.2,
        presence_penalty: 0.5,
        top_p: 1.0,
        stop: null,
        messages: [
          {
            role: "system",
            content:
              "You are a creative fiction brainstorming assistant specializing in visual novels.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      // Log the generated response for debugging
      console.log("Generated concept:", response.choices[0].message.content);

      // Parse and return the generated concept
      const generatedConcept = JSON.parse(
        response.choices[0].message.content || "{}",
      );
      res.json(generatedConcept);
    } catch (error) {
      console.error("Error generating concept:", error);
      res.status(500).json({ message: "Failed to generate concept" });
    }
  });

  app.post("/api/generate/character", async (req, res) => {
    try {
      const { index, partialCharacter, projectContext } =
        generateCharacterSchema.parse(req.body);

      // Create prompt for the character generation
      const prompt = `Given 
      ${JSON.stringify(projectContext, null, 2)}
        Generate a JSON with one character as structured
        {
          "name": "Character name",
          "role": "Character role",
          "gender": "Character gender",
          "age": "Character age as a string",
          "appearance": "Physical description (<15 words)",
          "personality": Key personality traits and behaviors (<40 words)",
          "goals": "Primary motivations and objectives (<40 words)",
          "relationshipPotential": "(optional) Relationship potential with main protagonist. Lovers must be opposite gender. (<15 words)",
          "conflict": "Their primary internal or external struggle (<40 words)",
        }
      `;

      // Generate character using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        temperature: 1.2,
        frequency_penalty: 0.2,
        presence_penalty: 0.5,
        top_p: 1.0,
        stop: null,
        messages: [
          {
            role: "system",
            content:
              "You are a creative fiction brainstorming assistant specializing in visual novels.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });
      console.log(projectContext);

      // console.log("Generated character:", response.choices[0].message.content);

      // Parse and return the generated character
      const generatedCharacter = JSON.parse(
        response.choices[0].message.content || "{}",
      );
      res.json(generatedCharacter);
    } catch (error) {
      console.error("Error generating character:", error);
      res.status(500).json({ message: "Failed to generate character" });
    }
  });

  app.post("/api/generate/characters-bundle", async (req, res) => {
    try {
      const { characterTemplates, projectContext } =
        generateMultipleCharactersSchema.parse(req.body);

      // Create prompt for the characters bundle generation
      const prompt = `Given
        ${JSON.stringify(projectContext, null, 2)}
        Generate ${characterTemplates.length} characters at once in a JSON array as structured
        [
          {
            "name": "Character 1 name",
            "role": "Character 1 role",
            "gender": "Character 1 gender",
            "age": "Character 1 age as a string",
            "appearance": "Physical description (<15 words)",
            "personality": "Key personality traits and behaviors (<40 words)",
            "goals": "Primary motivations and objectives (<40 words)",
            "relationshipPotential": "(optional) Relationship potential with main protagonist. Lovers must be opposite gender. (<15 words)",
            "conflict": "Their primary internal or external struggle (<40 words)"
          },
          {
            ... additional characters ...
          }
        ]
        Make each character unique with different strengths, flaws, and motivations. Ensure they fit the story concept.
      `;

      // Generate characters bundle using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        temperature: 1.2,
        frequency_penalty: 0.2,
        presence_penalty: 0.5,
        top_p: 1.0,
        stop: null,
        messages: [
          {
            role: "system",
            content:
              "You are a creative fiction brainstorming assistant specializing in visual novels.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      console.log(`Generating ${characterTemplates.length} characters at once`);

      console.log("sending", projectContext);

      // Parse and return the generated characters bundle
      const content = response.choices[0].message.content || "[]";
      let generatedCharacters = [];
      
      try {
        const parsed = JSON.parse(content);
        
        // Handle both array and single object responses
        if (Array.isArray(parsed)) {
          generatedCharacters = parsed;
        } else if (parsed.characters && Array.isArray(parsed.characters)) {
          generatedCharacters = parsed.characters;
        } else if (typeof parsed === 'object') {
          // If we got a single character, wrap it in an array
          generatedCharacters = [parsed];
        }
        
        console.log("Final characters:", generatedCharacters);
      } catch (err) {
        console.error("Error parsing OpenAI response:", err);
        generatedCharacters = [];
      }
      
      // Always return an array
      res.json({ characters: generatedCharacters });

      console.log("got", generatedCharacters);
    } catch (error) {
      console.error("Error generating characters bundle:", error);
      res.status(500).json({ message: "Failed to generate characters bundle" });
    }
  });

  app.post("/api/generate/path", async (req, res) => {
    try {
      const { index, partialPath, projectContext } = generatePathSchema.parse(
        req.body,
      );

      // Create prompt for the path generation
      const prompt = `Given
        ${JSON.stringify(projectContext, null, 2)}
        Generate one plot path/arc in a JSON as structured
        {
          "title": "Path title"}",
          "loveInterest": "(optional) One of the opposite-gender characters otherwise write leave empty"},
          "keyChoices": ["Critical player decision 1", "Critical player decision 2", "Critical player decision 3"],
          "beginning": "Description of how this route begins (< 30 words)",
          "middle": "Description of conflict escalation and unexpected twists (< 30 words)",
          "climax": "Description of the highest tension moment of this path (< 30 words)",
          "goodEnding": "Description of positive resolution (< 20 words)",
          "badEnding": "Description of negative outcome (< 20 words)"
        }
      `;

      // Generate path using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 1.2,
        frequency_penalty: 0.2,
        presence_penalty: 0.5,
        top_p: 1.0,
        stop: null,
        messages: [
          {
            role: "system",
            content:
              "You are a creative fiction brainstorming assistant specializing in visual novels.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      console.log("Sent:", JSON.stringify(projectContext, null, 2));

      // Log the generated response for debugging
      // console.log("Generated path:", response.choices[0].message.content);

      // Parse and return the generated path
      const generatedPath = JSON.parse(
        response.choices[0].message.content || "{}",
      );
      res.json(generatedPath);
    } catch (error) {
      console.error("Error generating path:", error);
      res.status(500).json({ message: "Failed to generate path" });
    }
  });

  app.post("/api/generate/paths-bundle", async (req, res) => {
    try {
      const { pathTemplates, projectContext } =
        generateMultiplePathsSchema.parse(req.body);

      // Create prompt for the paths bundle generation
      const prompt = `Given
        ${JSON.stringify(projectContext, null, 2)}
        Generate ${pathTemplates.length} plot paths/arcs at once in a JSON array as structured
        [
          {
            "title": "Path 1 title",
            "loveInterest": "(optional) One of the opposite-gender characters otherwise leave as null",
            "keyChoices": ["Critical player decision 1", "Critical player decision 2", "Critical player decision 3"],
            "beginning": "Description of how this route begins (< 30 words)",
            "middle": "Description of conflict escalation and unexpected twists (< 30 words)",
            "climax": "Description of the highest tension moment of this path (< 30 words)",
            "goodEnding": "Description of positive resolution (< 20 words)",
            "badEnding": "Description of negative outcome (< 20 words)"
          },
          {
            ... additional paths ...
          }
        ]
        Make each path unique and ensure they offer distinct experiences.
      `;

      // Generate paths bundle using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 1.2,
        frequency_penalty: 0.2,
        presence_penalty: 0.5,
        top_p: 1.0,
        stop: null,
        messages: [
          {
            role: "system",
            content:
              "You are a creative fiction brainstorming assistant specializing in visual novels.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      console.log(`Generating ${pathTemplates.length} paths at once`);

      // Parse and return the generated paths bundle
      const content = response.choices[0].message.content || "[]";
      let generatedPaths = [];
      
      try {
        const parsed = JSON.parse(content);
        
        // Handle both array and single object responses
        if (Array.isArray(parsed)) {
          generatedPaths = parsed;
        } else if (parsed.paths && Array.isArray(parsed.paths)) {
          generatedPaths = parsed.paths;
        } else if (typeof parsed === 'object') {
          // If we got a single path, wrap it in an array
          generatedPaths = [parsed];
        }
        
        console.log("Final paths:", generatedPaths);
      } catch (err) {
        console.error("Error parsing OpenAI response:", err);
        generatedPaths = [];
      }
      
      // Always return an array
      res.json({ paths: generatedPaths });
    } catch (error) {
      console.error("Error generating paths bundle:", error);
      res.status(500).json({ message: "Failed to generate paths bundle" });
    }
  });

  app.post("/api/generate/plot", async (req, res) => {
    try {
      const { projectContext } = generatePlotSchema.parse(req.body);

      // Create prompt for the plot generation
      const prompt = `Given
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

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a creative fiction brainstorming assistant specializing in visual novels.",
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

      // Parse and return the generated plot
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
      const prompt = `Create scenes for Act ${actNumber} of a visual novel with the following context
        ${JSON.stringify(projectContext, null, 2)}
        Create approximately ${scenesCount} scenes for this act following the structure from the plot outline
        Generate a JSON as structured
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
        IMPORTANT
        Make sure scene IDs are sequential and use format "${actNumber}-1", "${actNumber}-2" etc
        Include branching paths based on choices
        Some choices may have conditions that check player relationship values
        The final scene of the act should have choices set to null
        Include meaningful "delta" values for relationships, inventory items or skills
        Make sure the "next" property always points to a valid scene ID
      `;

      // Generate act using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are a creative fiction brainstorming assistant specializing in visual novels.",
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

      // Parse and return the generated act
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
