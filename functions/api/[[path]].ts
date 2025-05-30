// Cloudflare Pages Function to handle all API routes
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { vnProjects, vnStories } from '../../shared/schema';

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

  // Initialize database connection
  let db;
  try {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    db = drizzle({ client: pool });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Database connection failed' }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
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

  // GET /api/projects - List all projects
  if (url.pathname === '/api/projects' && request.method === 'GET') {
    try {
      const projects = await db.select().from(vnProjects);
      return new Response(
        JSON.stringify(projects),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch projects' }),
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

  // POST /api/projects - Create or update project
  if (url.pathname === '/api/projects' && request.method === 'POST') {
    try {
      const projectData = await request.json();
      
      // If project has an ID, update it
      if (projectData.id) {
        const dataToUpdate = {
          ...projectData,
          characterPortraitsData: projectData.characterPortraitsData || {},
        };

        const [updatedProject] = await db
          .update(vnProjects)
          .set(dataToUpdate)
          .where(eq(vnProjects.id, projectData.id))
          .returning();

        return new Response(
          JSON.stringify(updatedProject),
          { 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      // Otherwise create a new project
      const dataToCreate = {
        ...projectData,
        characterPortraitsData: projectData.characterPortraitsData || {},
      };

      const [newProject] = await db
        .insert(vnProjects)
        .values(dataToCreate)
        .returning();

      return new Response(
        JSON.stringify(newProject),
        { 
          status: 201,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to save project' }),
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

  // GET /api/projects/:id - Get specific project
  if (url.pathname.startsWith('/api/projects/') && request.method === 'GET') {
    try {
      const id = parseInt(url.pathname.split('/')[3]);
      const [project] = await db
        .select()
        .from(vnProjects)
        .where(eq(vnProjects.id, id));

      if (!project) {
        return new Response(
          JSON.stringify({ error: 'Project not found' }),
          { 
            status: 404,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      return new Response(
        JSON.stringify(project),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch project' }),
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

  // POST /api/generate/concept - Generate story concept
  if (url.pathname === '/api/generate/concept' && request.method === 'POST') {
    try {
      if (!env.GEMINI_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
          { 
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      const { basicData } = await request.json();
      const { theme, tone, genre, setting } = basicData;

      const prompt = `Write a visual novel concept of a ${tone} ${genre} about ${theme} set in ${setting}.
        Return in this JSON format:
        {
          "title": "Captivating and unique title",
          "tagline": "Brief, memorable catchphrase",
          "premise": "Detailed premise describing the world, main conflict, and core story without specific character names"
        }`;

      const response = await generateWithGemini(prompt, env.GEMINI_API_KEY);
      
      return new Response(
        JSON.stringify(response),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate concept' }),
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