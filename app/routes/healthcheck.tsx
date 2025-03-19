import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { usePGliteStore } from "~/stores/pglite-store";

/**
 * Health check endpoint for Docker and monitoring systems
 * Returns:
 * - 200 OK if the application is healthy
 * - 503 Service Unavailable if there are issues
 */
export async function loader({ request }: LoaderFunctionArgs) {
  // Get basic system health
  const health: {
    uptime: number;
    timestamp: number;
    status: string;
    services: Record<string, string>;
  } = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: "healthy",
    services: {
      app: "ok"
    }
  };

  // Basic checks
  try {
    // Check if the application is serving requests
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    // Add PGlite status if available in this context
    if (typeof window !== "undefined") {
      const pgliteState = usePGliteStore.getState();
      health.services.pglite = pgliteState.isInitialized ? "ok" : "not_initialized";
    }

    // Return healthy status
    return json(health, { status: 200 });
  } catch (error) {
    console.error("Health check failed:", error);
    return json(
      { 
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      }, 
      { status: 503 }
    );
  }
} 