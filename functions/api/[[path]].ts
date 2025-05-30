// Cloudflare Pages Function to handle all API routes
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

  // Placeholder for your migrated API routes
  return new Response(
    JSON.stringify({ 
      error: 'Endpoint migration in progress',
      path: url.pathname,
      method: request.method
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