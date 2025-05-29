// Cloudflare Pages Function to handle all API routes
import type { PagesFunction } from '@cloudflare/workers-types';

// This will handle all /api/* routes
export const onRequest: PagesFunction = async (context) => {
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

  // Basic health check
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

  // For now, return a placeholder response
  // You'll need to migrate your Express routes here
  return new Response(
    JSON.stringify({ 
      error: 'API endpoint not implemented yet',
      path: url.pathname
    }),
    { 
      status: 501,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
};