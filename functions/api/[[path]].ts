// Cloudflare Pages Function to handle all API routes
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { vnProjects, vnStories } from '../../../shared/schema';

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