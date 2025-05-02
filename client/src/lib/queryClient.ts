import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Helper for determining API URL prefix based on current environment
 */
function getApiBaseUrl(): string {
  // Use the base URL from where the app is running
  const isLocalDevServer = window.location.port === '3000' || window.location.port === '5173';
  
  if (isLocalDevServer) {
    return 'http://localhost:5000';
  }
  
  // When deployed, the frontend and backend are on the same origin
  return '';
}

/**
 * Helper to throw meaningful errors from API responses
 */
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    // Try to parse as JSON first
    let errorResponse: any;
    let errorMessage: string;
    
    try {
      // Clone the response before trying to read it
      const clonedRes = res.clone();
      errorResponse = await clonedRes.json();
      
      // Extract error message with fallbacks
      errorMessage = errorResponse.error || errorResponse.message || errorResponse.error_message || JSON.stringify(errorResponse);
    } catch (e) {
      // If JSON parsing fails, use text instead
      const text = await res.text() || res.statusText;
      errorMessage = text;
    }
    
    const error: any = new Error(`${res.status}: ${errorMessage}`);
    error.status = res.status;
    error.response = res.clone(); // Make response available for further processing
    error.data = errorResponse;
    
    // Pass through special error properties for toast handler
    if (errorResponse) {
      // Infinite duration for critical validation errors
      if (errorResponse.duration === 'infinite') {
        error.duration = Infinity;
      } else if (errorResponse.duration) {
        error.duration = errorResponse.duration;
      }
      
      // Pass error type for specialized handling
      if (errorResponse.errorType) {
        error.errorType = errorResponse.errorType;
      }
    }
    
    throw error;
  }
}

/**
 * Generic API request function
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  signal?: AbortSignal | undefined,
): Promise<Response> {
  try {
    // Ensure we use the correct API base URL
    const baseUrl = getApiBaseUrl();
    const fullUrl = url.startsWith('/api/') ? `${baseUrl}${url}` : url;
    
    console.log(`API Request: ${method} ${fullUrl}`, data);
    
    const res = await fetch(fullUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal
    });
    
    console.log(`API Response status: ${res.status}`);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request Error (${method} ${url}):`, error);
    throw error;
  }
}

/**
 * Types for query handling
 */
type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Query function to use with TanStack Query
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Ensure we use the correct API base URL
      const baseUrl = getApiBaseUrl();
      let url = queryKey[0] as string;
      
      // Add API base URL if this is an API request
      if (url.startsWith('/api/')) {
        url = `${baseUrl}${url}`;
      }
      
      console.log('Fetching from URL:', url);
      
      const res = await fetch(url, {
        credentials: "include",
      });
      
      console.log('Query response status:', res.status);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log('Query data:', data);
      return data;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  };

/**
 * Create the query client for the application
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
