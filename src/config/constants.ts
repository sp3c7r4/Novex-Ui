export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:3000";

export const COPILOT_RUNTIME_URL =
  import.meta.env.VITE_COPILOT_RUNTIME_URL || "http://localhost:3000/chat";

export const COPILOT_PUBLIC_API_KEY =
  import.meta.env.VITE_COPILOT_PUBLIC_API_KEY || "";

/** Excalidraw API (integrated into main backend, mounted at /api not /api/v1) */
const BACKEND_ORIGIN = (() => {
  try { return new URL(BACKEND_URL).origin; }
  catch { return BACKEND_URL; }
})();

export const EXCALIDRAW_SERVER_URL =
  import.meta.env.VITE_EXCALIDRAW_SERVER_URL || BACKEND_ORIGIN;

export const EXCALIDRAW_WS_URL =
  import.meta.env.VITE_EXCALIDRAW_WS_URL ||
  `${BACKEND_ORIGIN.replace(/^http/, "ws")}/ws/excalidraw`;
