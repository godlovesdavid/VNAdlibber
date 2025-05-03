import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Try to parse as JSON first
    let errorResponse;
    let errorMessage;
    
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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  signal?: AbortSignal | undefined,
): Promise<Response> {
  try {
    console.log(`API Request: ${method} ${url}`, data);
    
    const res = await fetch(url, {
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

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

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
