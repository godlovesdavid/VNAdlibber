import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();
// Increase the limit to handle image data (up to 200KB)
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ limit: '200kb', extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error("SERVER ERROR:", {
      status,
      message,
      stack: err.stack,
      details: err
    });
    
    log(`ERROR: ${status} - ${message}`);
    
    // Include detailed error information for client debugging
    const errorDetails = {
      message,
      technicalDetails: err.message,
      rootCause: err.cause?.message || err.stack?.split('\n')[0] || message,
      originalError: err.originalError?.message || null,
      // If there's a more detailed error inside the base error, include it
      nestedError: err.error?.message || null
    };
    
    res.status(status).json(errorDetails);
    // Don't rethrow the error as it will crash the server
    // throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Schedule a job to clean up expired shared stories
    // Default expiration is 30 days of inactivity
    const EXPIRATION_DAYS = 30;
    const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run once daily
    
    // Initial cleanup on server start
    runExpiredLinkCleanup();
    
    // Schedule regular cleanups
    setInterval(runExpiredLinkCleanup, CLEANUP_INTERVAL_MS);
    
    async function runExpiredLinkCleanup() {
      try {
        const deletedCount = await storage.deleteExpiredStories(EXPIRATION_DAYS);
        if (deletedCount > 0) {
          log(`Cleaned up ${deletedCount} expired shared ${deletedCount === 1 ? 'story' : 'stories'} (inactive for over ${EXPIRATION_DAYS} days)`);
        }
      } catch (error) {
        console.error('Error during expired link cleanup:', error);
      }
    }
  });
})();
