import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertVnStorySchema } from "@shared/schema";
import { generateSceneBackgroundImage } from "./image-generator";
import { jsonrepair } from "jsonrepair";
import rateLimit from "express-rate-limit";

// Use Google's Gemini API instead of OpenAI for text generation
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";
const GEMINI_API_URL_PRO =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent";

// Get API key from environment variable or use fallback for development
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDE-O9FT4wsie2Cb5SWNUhNVszlQg3dHnU";

// Helper function for Gemini API calls
async function generateWithGemini(
  prompt: string,
  systemPrompt: string | null = null,
  responseFormat = "JSON",
  maxOutputTokens = 4096, // Reduced from 8192 to optimize throughput and capacity
  isPro = false,
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
    // Add the JSON formatting instructions to the prompt
    const enhancedPrompt = prompt + "\n\n" + jsonFormatInstructions; //
    console.log(enhancedPrompt);

    // Construct the request body
    const requestBody = {
      contents: [
        ...(systemPrompt
          ? [{ role: "model", parts: [{ text: systemPrompt }] }]
          : []),
        { role: "user", parts: [{ text: enhancedPrompt }] },
      ],
      generationConfig: {
        // temperature: 0.2,
        // topP: 0.9,
        // topK: 40,
        maxOutputTokens: maxOutputTokens,
      },
    };

    const response = await fetch(isPro ? GEMINI_API_URL_PRO : GEMINI_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.log(response);
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

      // Strip markdown code blocks if present
      if (responseText.startsWith("```")) {
        // Strip opening code block markers (```json or just ```)
        responseText = responseText.replace(
          /^```(?:json|javascript)?\s*\n/,
          "",
        );
        // Strip closing code block markers
        responseText = responseText.replace(/\n```\s*$/, "");
      }
      try {
        // Use jsonrepair to fix any JSON formatting issues
        console.log(responseText);
        responseText = jsonrepair(responseText);
        // console.log(responseText);
      } catch (repairError) {
        console.error("jsonrepair failed:", repairError);
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
    setting: z.string(),
  }),
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
    name: z.string(),
    image_prompt: z.string(),
  }),
  imageType: z.enum(["background", "character"]).default("background"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure rate limiters
  const aiGenerationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 10, // 10 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many AI generation requests, please try again later.",
      errorType: "rate_limit_exceeded"
    }
  });
  
  const imageLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minute window
    max: 5, // 5 requests per 2 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many image generation requests, please try again later.",
      errorType: "rate_limit_exceeded"
    }
  });
  
  // Apply rate limiters to AI generation endpoints
  app.use(["/api/generate/concept", "/api/generate/plot", "/api/generate/path", "/api/generate/character", "/api/generate/act"], aiGenerationLimiter);
  app.use("/api/generate/image", imageLimiter);

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
      // Create prompt for the concept generation - directly matching our expected format
      const prompt = `Given this visual novel story context:
        Theme: ${basicData.theme}
        Tone: ${basicData.tone}
        Genre: ${basicData.genre}
        Setting: ${basicData.setting}
        
        Create a compelling visual novel concept based on these elements.
        Return in this exact JSON format:
        {
          "title": "Captivating and unique title",
          "tagline": "Brief, memorable catchphrase",
          "premise": "Detailed premise describing the world, main conflict, and core story without specific character names"
        }
        
        Make the concept original, emotionally resonant, and aligned with the specified theme, tone and genre.
        Avoid clichés and create something players haven't experienced before.
      `;

      // Use Gemini to generate the concept
      const systemPrompt =
        "You're a visual novel brainstormer with wildly creative ideas";
      const responseContent = await generateWithGemini(prompt, systemPrompt);
      const generatedConcept = JSON.parse(responseContent || "{}");
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

      console.log(`Generating ${indices.length} characters`);

      // Create prompt for the character generation - {name: {...}} format
      const prompt = `Given this story context:
        ${JSON.stringify(projectContext, null, 2)}
        Generate ${indices.length} detailed character${indices.length > 1 ? "s" : ""} for a visual novel in JSON format.

        Return in this exact format where the character's name is the key:
        {
          "Character Name": {
            "role": "${indices.length == 1 && indices[0] == 0 ? "Main Protagonist" : "Role in story (antagonist, mentor, etc.)"}",
            "occupation": "Job or daily activity",
            "gender": "Gender identity",
            "age": "Age as a string",
            "appearance": "Detailed physical description",
            "personality": "Key traits, behaviors, and quirks",
            "goals": "Primary motivations and objectives",
            "relationshipPotential": ${indices.length == 1 && indices[0] == 0 ? "null" : '"Potential relationship dynamic with protagonist"'}, 
            "conflict": "Main personal struggle or challenge"
          }${indices.length > 1 ? "," : ""}
          ${indices.length > 1 ? '\n  "Another Character Name": { ... },' : ""}
          ${indices.length > 1 ? '\n  "Third Character Name": { ... }' : ""}
        }
        
        Make characters feel realistic, complex, and memorable with distinct personalities.
        ${indices.length > 1 ? "Make the first character the main protagonist." : ""}
        Keep all characters consistent with the story's theme, tone, and genre.
      `;

      // Generate characters using Gemini
      const systemPrompt =
        "You're a visual novel brainstormer with wildly creative ideas";
      const responseContent = await generateWithGemini(prompt, systemPrompt);

      console.log("Raw response from Gemini:", responseContent);

      // Try to parse response
      try {
        if (responseContent === "{}") throw new Error("Empty response");

        // Try to repair JSON if needed
        let fixedContent = responseContent;
        try {
          if (responseContent.includes("(Leave blank)")) {
            // Replace (Leave blank) with null value
            fixedContent = responseContent.replace(
              /"\(Leave blank\)"/g,
              "null",
            );
          }
        } catch (repairError) {
          console.error("Could not repair JSON:", repairError);
          fixedContent = responseContent; // Fall back to original
        }

        // Parse the response
        const parsed = JSON.parse(fixedContent);
        console.log("Parsed character data:", parsed);

        // Now we're expecting an object with character names as keys
        // No format conversion needed - returning the object directly
        res.json(parsed);
      } catch (e) {
        console.error("Problem parsing character JSON:", e);
        console.error("Problematic content:", responseContent);
        res.status(500).json({
          message: "Failed to parse character data from AI response",
        });
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

      // Create prompt for the path generation - {title: {...}} format
      const prompt = `Given this story context:
        ${JSON.stringify(projectContext, null, 2)}
        
        Generate exactly ${indices.length} story path${indices.length > 1 ? "s" : ""} for a visual novel in JSON format.
        Each path represents a different storyline or route the player can follow.
        
        Return in this exact format where the path title is the key:
        {
          "Path Title": {
            "loveInterest": ${pathTemplates[0]?.loveInterest ? `"${pathTemplates[0].loveInterest}"` : "null"},
            "keyChoices": "Major decision points separated by commas",
            "beginning": "How this story path begins",
            "middle": "Mid-story conflicts and developments",
            "climax": "The most intense moment in this path",
            "goodEnding": "Positive resolution if player makes good choices",
            "badEnding": "Negative outcome if player makes poor choices"
          }${indices.length > 1 ? "," : ""}
          ${indices.length > 1 ? '\n  "Another Path Title": { ... },' : ""}
          ${indices.length > 1 ? '\n  "Third Path Title": { ... }' : ""}
        }
        
        Make each path distinct and compelling, with different story arcs, challenges, and themes.
        Use descriptive and thematic titles as the keys (e.g. 'Path of Redemption', 'Journey of Discovery').
        Ensure paths align with the overall story context and character relationships.
      `;

      // Generate paths using Gemini
      const systemPrompt =
        "You're a visual novel brainstormer with wildly creative ideas";
      const responseContent = await generateWithGemini(prompt, systemPrompt);

      // Try to parse response
      try {
        if (responseContent === "{}") throw new Error("Empty response");
        const parsed = JSON.parse(responseContent);
        // Return the direct object from the response
        res.json(parsed);
      } catch (e) {
        console.error("Problematic JSON:", e);
      }
    } catch (error) {
      console.error("Error generating paths:", error);
      res.status(500).json({ message: "Failed to generate paths" });
    }
  });

  app.post("/api/generate/plot", async (req, res) => {
    try {
      const { projectContext } = generatePlotSchema.parse(req.body);

      // Create prompt for the plot generation - directly matching our expected format
      const prompt = `Given this story context:
        ${JSON.stringify(projectContext, null, 2)}
        Return a JSON object with 5 acts (act1 through act5). Format as follows:
        {
          "act1": {
            "title": "Act 1 Title",
            "summary": "Brief overview of Act 1",
            "events": ["Event 1", "Event 2", "Event 3", "Event 4", "Event 5"],
            "arcsActivated": ["Include route titles from pathsData"],
            "arcIntersections": ["Intersection 1", "Intersection 2"],
            "playerChoices": ["Choice 1 - Consequences", "Choice 2 - Consequences"]
          },
          "act2": {/* same structure as act1 */},
          "act3": {/* same structure as act1 */},
          "act4": {/* same structure as act1 */},
          "act5": {/* same structure as act1 */}
        }
        
        Make the 5 acts follow this structure: Introduction, Rising Action, Midpoint Twist, Escalating Conflict, Resolution/Endings.
        Be descriptive and imaginative about events to create a rich visual novel story.
      `;

      // Generate plot using Gemini
      const systemPrompt =
        "You're a visual novel brainstormer with wildly creative ideas";
      const responseContent = await generateWithGemini(prompt, systemPrompt);

      // Try to parse response
      try {
        if (responseContent === "{}") throw new Error("Empty response");
        const generatedPlot = JSON.parse(responseContent);
        res.json(generatedPlot);
      } catch (e) {
        console.error("Problematic JSON:", e);
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

      // Create prompt for the act generation - simplified {scene1: {...}} format
      const prompt = `You are tasked with creating scenes for Act ${actNumber} based on this story context:
        ${JSON.stringify(projectContext, null, 2)}
        
        Generate a visual novel act structure in JSON with the exact format below:
        {
          "scene1": {
            "setting": "location name (with optionally time of day)",
            "image_prompt": "Detailed visual description for AI image generation",
            "dialogue": [
              ["Narrator", "Descriptive text about the scene"],
              ["Character Name", "Character dialogue"],
              ["Another Character", "Response dialogue"]
            ],
            "choices": [
              {
                "text": "Choice option text",
                "description": "(optional) Brief explanation of consequences",
                "delta": {"characterName": 1, "anotherCharacter": -1},
                "next": "scene1a"
              },
              {
                "text": "Alternative choice",
                "delta": {"characterName": -1},
                "next": "scene2"
              }
            ]
          }
        }

        Important guidelines:
        - Do not generate any other act except Act ${actNumber}.
        - Create approximately ${scenesCount} scenes for Act ${actNumber}, or more if necessary to convey Act ${actNumber}.
        - Include branching paths based on 2-4 choices. Choices that continue the dialogue conversation in the same scene are marked with a letter e.g. scene1b (although they are technically different scenes).
        - Final scene of act should have choices set to null value. Otherwise, ensure the scene has a choice that connects to another valid scene name.
        - Relationships, inventory items, or skills can be added or subtracted by "delta" values.
        - Pack each scene with ample dialogue to express the story (5-15+ lines). Be inventive and creative about event details, while ensuring consistency with the plot outline.
        - Use of a narrator is encouraged to explain the scene or provide context.
        - The protagonist may think in parentheses.
        - Unknown characters are named "???" until revealed.
        - "image_prompt" is only required when visiting the setting for the first time.
        - Maintain the given tone (${projectContext.basicData.tone}) consistent with the story context.
        - You may optionally include [emotion] or [action] tags before dialogue when it enhances the scene.
        - If a choice increases or decreases a relationship, reflect it subtly in the dialogue tone.
        - For conditional choices, use this format:
           {
             "text": "Try to convince guard",
             "condition": {"guardRelationship": 2},
             "next": "scene5",
             "failNext": "scene6"
           }
        
        Make it engaging!
      `;

      // Generate act using Gemini
      const systemPrompt =
        "You're a visual novel brainstormer with wildly creative ideas";

      const responseContent = await generateWithGemini(
        prompt,
        systemPrompt,
        "JSON",
        65536,
        // true,
      );

      res.json(JSON.parse(responseContent));
    } catch (e) {
      console.error("Error generating act:", e);
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

      const { scene, imageType, optimizeForMobile } = req.body;

      // Parse with the schema, but allow forceReal and optimizeForMobile to pass through
      generateImageSchema.parse({ scene, imageType });

      // Check if we should use optimized image settings (smaller/cheaper)
      const useOptimizedSettings = optimizeForMobile === true;

      if (imageType === "background") {
        try {
          console.log(
            "Calling RunPod with API key:",
            process.env.RUNPOD_API_KEY ? "Present (hidden)" : "Missing",
          );

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
            scene.name,
            scene.image_prompt,
          );

          // No environment variables to reset since we've removed DALL-E
          console.log(
            `Background image generated for scene ${scene.name}:`,
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
