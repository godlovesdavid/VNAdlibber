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

const generatePathSchema = z.object({
  index: z.number(),
  partialPath: z.object({
    title: z.string().optional(),
    loveInterest: z.string().nullable().optional(),
  }),
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
        const updatedProject = await storage.updateProject(projectData.id, projectData);
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
      const prompt = `
        Create a visual novel concept with the following parameters:
        - Theme: ${basicData.theme}
        - Tone: ${basicData.tone}
        - Genre: ${basicData.genre}
        
        Please generate a JSON object with the following structure:
        {
          "title": "A memorable and fitting title for the visual novel",
          "tagline": "A single sentence that captures the essence of the story",
          "premise": "A few sentences describing the premise, setting, main characters, and central conflict"
        }
      `;
      
      // Generate concept using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a visual novel writer assistant. You create compelling concepts for visual novels."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Log the generated response for debugging
      console.log("Generated concept:", response.choices[0].message.content);
      
      // Parse and return the generated concept
      const generatedConcept = JSON.parse(response.choices[0].message.content || "{}");
      res.json(generatedConcept);
    } catch (error) {
      console.error("Error generating concept:", error);
      res.status(500).json({ message: "Failed to generate concept" });
    }
  });
  
  app.post("/api/generate/character", async (req, res) => {
    try {
      const { index, partialCharacter, projectContext } = generateCharacterSchema.parse(req.body);
      
      // Create prompt for the character generation
      const prompt = `
        Create a detailed character for a visual novel with the following parameters:
        ${JSON.stringify(projectContext, null, 2)}
        
        Partial character information:
        ${JSON.stringify(partialCharacter, null, 2)}
        
        This is character #${index + 1} in the story.
        
        Please generate a JSON object with the following structure:
        {
          "name": "${partialCharacter.name || "Character name"}",
          "role": "${partialCharacter.role || "Character role"}",
          "gender": "${partialCharacter.gender || "Character gender"}",
          "age": "${partialCharacter.age || "Character age"}",
          "appearance": "Detailed physical description",
          "personality": "Key personality traits and behaviors",
          "goals": "Primary motivations and objectives",
          "relationshipPotential": "How they might connect with the protagonist",
          "conflict": "Their primary internal or external struggle"
        }
      `;
      
      // Generate character using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a visual novel character designer. You create rich, multi-dimensional characters for visual novels."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Log the generated response for debugging
      console.log("Generated character:", response.choices[0].message.content);
      
      // Parse and return the generated character
      const generatedCharacter = JSON.parse(response.choices[0].message.content || "{}");
      res.json(generatedCharacter);
    } catch (error) {
      console.error("Error generating character:", error);
      res.status(500).json({ message: "Failed to generate character" });
    }
  });
  
  app.post("/api/generate/path", async (req, res) => {
    try {
      const { index, partialPath, projectContext } = generatePathSchema.parse(req.body);
      
      // Create prompt for the path generation
      const prompt = `
        Create a detailed story path for a visual novel with the following parameters:
        ${JSON.stringify(projectContext, null, 2)}
        
        Partial path information:
        ${JSON.stringify(partialPath, null, 2)}
        
        This is path #${index + 1} in the story.
        
        Please generate a JSON object with the following structure:
        {
          "title": "${partialPath.title || "Path title"}",
          "loveInterest": ${partialPath.loveInterest ? `"${partialPath.loveInterest}"` : "null"},
          "keyChoices": ["Critical player decision 1", "Critical player decision 2", "Critical player decision 3"],
          "beginning": "Description of how this route begins",
          "middle": "Description of conflict escalation and unexpected twists",
          "climax": "Description of the highest tension moment of this path",
          "goodEnding": "Description of positive resolution",
          "badEnding": "Description of negative outcome"
        }
      `;
      
      // Generate path using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a visual novel narrative designer. You create engaging story paths with branching narratives."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Log the generated response for debugging
      console.log("Generated path:", response.choices[0].message.content);
      
      // Parse and return the generated path
      const generatedPath = JSON.parse(response.choices[0].message.content || "{}");
      res.json(generatedPath);
    } catch (error) {
      console.error("Error generating path:", error);
      res.status(500).json({ message: "Failed to generate path" });
    }
  });
  
  app.post("/api/generate/plot", async (req, res) => {
    try {
      const { projectContext } = generatePlotSchema.parse(req.body);
      
      // Create prompt for the plot generation
      const prompt = `
        Create a master plot outline for a visual novel with the following parameters:
        ${JSON.stringify(projectContext, null, 2)}
        
        Structure the plot into 5 acts: Introduction, Rising Action, Midpoint Twist, Escalating Conflicts, and Resolution/Endings.
        
        Please generate a JSON object with the following structure:
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
            "act2": { ... similar structure ... },
            "act3": { ... similar structure ... },
            "act4": { ... similar structure ... },
            "act5": { ... similar structure ... }
          }
        }
      `;
      
      // Generate plot using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a visual novel plot designer. You create cohesive, engaging plot outlines that weave together characters and narrative paths."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Log the generated response for debugging
      console.log("Generated plot outline:", response.choices[0].message.content);
      
      // Parse and return the generated plot
      const generatedPlot = JSON.parse(response.choices[0].message.content || "{}");
      res.json(generatedPlot);
    } catch (error) {
      console.error("Error generating plot:", error);
      res.status(500).json({ message: "Failed to generate plot" });
    }
  });
  
  app.post("/api/generate/act", async (req, res) => {
    try {
      const { actNumber, scenesCount, projectContext } = generateActSchema.parse(req.body);
      
      // Create prompt for the act generation
      const prompt = `
        Create scenes for Act ${actNumber} of a visual novel with the following context:
        ${JSON.stringify(projectContext, null, 2)}
        
        Generate ${scenesCount} scenes for this act following the structure from the plot outline.
        
        Please generate a JSON object with the following structure:
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
        
        IMPORTANT:
        1. Make sure scene IDs are sequential and use format "${actNumber}-1", "${actNumber}-2", etc.
        2. Include branching paths based on choices.
        3. Some choices may have conditions that check player relationship values.
        4. The final scene of the act should have choices set to null.
        5. Include meaningful "delta" values for relationships, inventory items or skills.
        6. Make sure the "next" property always points to a valid scene ID.
      `;
      
      // Generate act using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a visual novel scene writer. You create branching narrative scenes with dialogue and player choices."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Log the generated response for debugging
      console.log(`Generated Act ${actNumber}:`, response.choices[0].message.content?.substring(0, 200) + "...");
      
      // Parse and return the generated act
      const generatedAct = JSON.parse(response.choices[0].message.content || "{}");
      res.json(generatedAct);
    } catch (error) {
      console.error("Error generating act:", error);
      res.status(500).json({ message: "Failed to generate act" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
