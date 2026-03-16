import { useState, useEffect, useRef, useCallback } from "react";
import {
  convertToExcalidrawElements,
  CaptureUpdateAction,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw";
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/excalidraw/types/element/types";
import {
  EXCALIDRAW_SERVER_URL,
  EXCALIDRAW_WS_URL,
} from "@/config/constants";
import {
  convertMermaidToExcalidraw,
  DEFAULT_MERMAID_CONFIG,
} from "@/utils/mermaidConverter";

// ─── Types ────────────────────────────────────────────────────────────────

interface ServerElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string | number;
  label?: { text: string };
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  syncedAt?: string;
  source?: string;
  syncTimestamp?: string;
  boundElements?: any[] | null;
  containerId?: string | null;
  locked?: boolean;
  start?: { id: string };
  end?: { id: string };
  strokeStyle?: string;
  endArrowhead?: string;
  startArrowhead?: string;
  startBinding?: any;
  endBinding?: any;
  points?: any;
  [key: string]: any;
}

interface WebSocketMessage {
  type: string;
  element?: ServerElement;
  elements?: ServerElement[];
  elementId?: string;
  count?: number;
  timestamp?: string;
  source?: string;
  requestId?: string;
  format?: string;
  background?: boolean;
  scrollToContent?: boolean;
  scrollToElementId?: string;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  mermaidDiagram?: string;
  config?: any;
  message?: string;
}

export type SyncStatus = "disconnected" | "connected" | "syncing" | "error";

export type ActivityVariant =
  | "create"
  | "update"
  | "delete"
  | "clear"
  | "viewport"
  | "capture";

export interface CanvasActivity {
  id: string;
  message: string;
  variant: ActivityVariant;
  timestamp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Strip server-only metadata so Excalidraw doesn't choke. */
function cleanElement(el: ServerElement): Record<string, any> {
  const {
    createdAt,
    updatedAt,
    version,
    syncedAt,
    source,
    syncTimestamp,
    ...clean
  } = el;
  return clean;
}

/** Fix broken binding refs (missing targets). */
function fixBindings(
  elements: Record<string, any>[],
): Record<string, any>[] {
  const ids = new Set(elements.map((e) => e.id!));

  return elements.map((el) => {
    const fixed = { ...el };

    if (Array.isArray(fixed.boundElements)) {
      fixed.boundElements = fixed.boundElements.filter(
        (b: any) => b?.id && b?.type && ids.has(b.id),
      );
      if ((fixed.boundElements as any[]).length === 0)
        fixed.boundElements = null;
    } else if (fixed.boundElements) {
      fixed.boundElements = null;
    }

    if (fixed.containerId && !ids.has(fixed.containerId)) {
      fixed.containerId = null;
    }

    return fixed;
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useExcalidrawSync() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  // Bumped to force the WS useEffect to re-run on reconnect
  const [wsEpoch, setWsEpoch] = useState(0);

  // ── Activity feed — real-time tool progress ────────────────────────
  const [activities, setActivities] = useState<CanvasActivity[]>([]);

  const addActivity = useCallback(
    (message: string, variant: ActivityVariant = "create") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setActivities((prev) => [
        ...prev.slice(-7),
        { id, message, variant, timestamp: Date.now() },
      ]);
      setTimeout(() => {
        setActivities((prev) => prev.filter((a) => a.id !== id));
      }, 4000);
    },
    [],
  );

  // ── Imperative API setter (pass to <Excalidraw excalidrawAPI={…}>) ──
  const onAPIReady = useCallback((api: ExcalidrawImperativeAPI) => {
    console.log("[ExcalidrawSync] ✅ Excalidraw API ready");
    setExcalidrawAPI(api);
  }, []);

  // ── Load existing elements from REST ───────────────────────────────
  const loadExistingElements = useCallback(
    async (api: ExcalidrawImperativeAPI) => {
      try {
        const res = await fetch(`${EXCALIDRAW_SERVER_URL}/api/elements`);
        const json = await res.json();
        if (json.success && json.elements?.length) {
          const cleaned = json.elements.map(cleanElement);
          const validated = fixBindings(cleaned);
          const converted = convertToExcalidrawElements(validated, {
            regenerateIds: false,
          });
          api.updateScene({
            elements: converted,
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          });
          console.log(
            `[ExcalidrawSync] Loaded ${converted.length} elements via REST`,
          );
        } else {
          console.log("[ExcalidrawSync] No existing elements to load");
        }
      } catch (err) {
        console.error("[ExcalidrawSync] Failed to load elements:", err);
      }
    },
    [],
  );

  // ── WebSocket message handler ─────────────────────────────────────
  // Mirrors the reference implementation's handleWebSocketMessage pattern
  const handleWebSocketMessage = useCallback(
    async (data: WebSocketMessage, api: ExcalidrawImperativeAPI) => {
      try {
        // Get current scene elements from the API
        const currentElements = api.getSceneElements();
        console.log(
          `[ExcalidrawSync] WS message: ${data.type}, current elements: ${currentElements.length}`,
        );

        switch (data.type) {
          /* ── Initial load ──────────────────────────────────────── */
          case "initial_elements": {
            if (data.elements && data.elements.length > 0) {
              const cleaned = data.elements.map(cleanElement);
              const validated = fixBindings(cleaned);
              const converted = convertToExcalidrawElements(validated, {
                regenerateIds: false,
              });
              api.updateScene({
                elements: converted,
                captureUpdate: CaptureUpdateAction.IMMEDIATELY,
              });
              console.log(
                `[ExcalidrawSync] Initial: ${converted.length} elements`,
              );
            }
            break;
          }

          /* ── Single element created ──────────────────────────── */
          case "element_created": {
            if (!data.element) break;
            const cleanedNew = cleanElement(data.element);
            const hasBindings =
              (cleanedNew as any).start || (cleanedNew as any).end;

            try {
              let finalElements: readonly ExcalidrawElement[];

              if (hasBindings) {
                const allElements = [
                  ...currentElements,
                  cleanedNew,
                ] as any[];
                finalElements = convertToExcalidrawElements(allElements, {
                  regenerateIds: false,
                }) as unknown as ExcalidrawElement[];
              } else {
                const newEl = convertToExcalidrawElements(
                  [cleanedNew],
                  { regenerateIds: false },
                );
                finalElements = [
                  ...currentElements,
                  ...newEl,
                ] as unknown as ExcalidrawElement[];
              }

              api.updateScene({
                elements: finalElements,
                captureUpdate: CaptureUpdateAction.IMMEDIATELY,
              });
              const label =
                cleanedNew.text ||
                (cleanedNew as any).label?.text ||
                "";
              addActivity(
                `Drawing ${cleanedNew.type}${label ? ` "${label}"` : ""}`,
                "create",
              );
            } catch (convErr) {
              console.error(
                "[ExcalidrawSync] Element conversion error — falling back to REST:",
                convErr,
              );
              await loadExistingElements(api);
            }
            break;
          }

          /* ── Element updated ─────────────────────────────────── */
          case "element_updated": {
            if (!data.element) break;
            const cleanedUpdated = cleanElement(data.element);
            const converted = convertToExcalidrawElements(
              [cleanedUpdated],
              { regenerateIds: false },
            )[0];
            const updatedElements = currentElements.map((el) =>
              el.id === data.element!.id ? converted : el,
            );
            api.updateScene({
              elements: updatedElements,
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
            const updLabel =
              cleanedUpdated.text ||
              (cleanedUpdated as any).label?.text ||
              data.element.id;
            addActivity(`Updating ${cleanedUpdated.type} "${updLabel}"`, "update");
            break;
          }

          /* ── Element deleted ─────────────────────────────────── */
          case "element_deleted": {
            if (!data.elementId) break;
            const filtered = currentElements.filter(
              (el) => el.id !== data.elementId,
            );
            api.updateScene({
              elements: filtered,
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
            addActivity(`Removed element "${data.elementId}"`, "delete");
            break;
          }

          /* ── Batch create ──────────────────────────────────────── */
          case "elements_batch_created": {
            if (!data.elements?.length) break;
            const cleanedBatch = data.elements.map(cleanElement);
            const validatedBatch = fixBindings(cleanedBatch);
            const hasBoundArrows = validatedBatch.some(
              (el: any) => el.start || el.end,
            );

            try {
              let finalElements: readonly ExcalidrawElement[];

              if (hasBoundArrows) {
                const allElements = [
                  ...currentElements,
                  ...validatedBatch,
                ] as any[];
                finalElements = convertToExcalidrawElements(allElements, {
                  regenerateIds: false,
                }) as unknown as ExcalidrawElement[];
              } else {
                const batchConverted = convertToExcalidrawElements(
                  validatedBatch,
                  { regenerateIds: false },
                );
                finalElements = [
                  ...currentElements,
                  ...batchConverted,
                ] as unknown as ExcalidrawElement[];
              }

              console.log(
                `[ExcalidrawSync] Batch: converted ${validatedBatch.length} skeletons → ${finalElements.length} elements`,
              );

              if (finalElements.length > 0) {
                api.updateScene({
                  elements: finalElements,
                  captureUpdate: CaptureUpdateAction.IMMEDIATELY,
                });
              } else {
                console.warn(
                  "[ExcalidrawSync] convertToExcalidrawElements returned empty — falling back to REST reload",
                );
                await loadExistingElements(api);
              }
            } catch (convErr) {
              console.error(
                "[ExcalidrawSync] Batch conversion error — falling back to REST reload:",
                convErr,
              );
              await loadExistingElements(api);
            }
            break;
          }

          /* ── Canvas cleared ────────────────────────────────────── */
          case "canvas_cleared": {
            console.log("[ExcalidrawSync] Canvas cleared by server");
            api.updateScene({
              elements: [],
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
            addActivity("Canvas cleared", "clear");
            break;
          }

          /* ── Image export (MCP asks frontend to render) ────────── */
          case "export_image_request": {
            if (!data.requestId) break;
            addActivity("Capturing screenshot", "capture");
            try {
              const els = api.getSceneElements();
              const appState = api.getAppState();
              const files = api.getFiles();

              if (data.format === "svg") {
                const { exportToSvg } = await import(
                  "@excalidraw/excalidraw"
                );
                const svg = await exportToSvg({
                  elements: els,
                  appState: {
                    ...appState,
                    exportBackground: data.background !== false,
                  },
                  files,
                });
                const svgStr = new XMLSerializer().serializeToString(svg);
                await fetch(
                  `${EXCALIDRAW_SERVER_URL}/api/export/image/result`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      requestId: data.requestId,
                      format: "svg",
                      data: svgStr,
                    }),
                  },
                );
              } else {
                const { exportToBlob } = await import(
                  "@excalidraw/excalidraw"
                );
                const blob = await exportToBlob({
                  elements: els,
                  appState: {
                    ...appState,
                    exportBackground: data.background !== false,
                  },
                  files,
                  mimeType: "image/png",
                });
                const reader = new FileReader();
                reader.onload = async () => {
                  const b64 = (reader.result as string)?.split(",")[1];
                  if (b64) {
                    await fetch(
                      `${EXCALIDRAW_SERVER_URL}/api/export/image/result`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          requestId: data.requestId,
                          format: "png",
                          data: b64,
                        }),
                      },
                    );
                  }
                };
                reader.readAsDataURL(blob);
              }
            } catch (err) {
              console.error("[ExcalidrawSync] Export failed:", err);
              await fetch(
                `${EXCALIDRAW_SERVER_URL}/api/export/image/result`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    requestId: data.requestId,
                    error: (err as Error).message,
                  }),
                },
              ).catch(() => {});
            }
            break;
          }

          /* ── Viewport control ──────────────────────────────────── */
          case "set_viewport": {
            if (!data.requestId) break;
            addActivity("Fitting diagram to view", "viewport");
            try {
              if (data.scrollToContent) {
                const els = api.getSceneElements();
                if (els.length)
                  api.scrollToContent(els, {
                    fitToViewport: true,
                    animate: true,
                  });
              } else if (data.scrollToElementId) {
                const target = api
                  .getSceneElements()
                  .find((e) => e.id === data.scrollToElementId);
                if (target)
                  api.scrollToContent([target], {
                    fitToViewport: false,
                    animate: true,
                  });
              } else {
                const appState: any = {};
                if (data.zoom !== undefined)
                  appState.zoom = { value: data.zoom };
                if (data.offsetX !== undefined)
                  appState.scrollX = data.offsetX;
                if (data.offsetY !== undefined)
                  appState.scrollY = data.offsetY;
                if (Object.keys(appState).length)
                  api.updateScene({ appState });
              }

              await fetch(`${EXCALIDRAW_SERVER_URL}/api/viewport/result`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  requestId: data.requestId,
                  success: true,
                  message: "Viewport updated",
                }),
              });
            } catch (err) {
              await fetch(`${EXCALIDRAW_SERVER_URL}/api/viewport/result`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  requestId: data.requestId,
                  error: (err as Error).message,
                }),
              }).catch(() => {});
            }
            break;
          }

          /* ── Mermaid conversion ─────────────────────────────── */
          case "mermaid_convert": {
            if (!data.mermaidDiagram) break;
            try {
              const result = await convertMermaidToExcalidraw(
                data.mermaidDiagram,
                data.config || DEFAULT_MERMAID_CONFIG,
              );
              if (result.error) {
                console.error(
                  "[ExcalidrawSync] Mermaid conversion error:",
                  result.error,
                );
                break;
              }
              if (result.elements.length) {
                const converted = convertToExcalidrawElements(
                  result.elements as any,
                  { regenerateIds: false },
                );
                api.updateScene({
                  elements: converted,
                  captureUpdate: CaptureUpdateAction.IMMEDIATELY,
                });
                if (result.files) {
                  api.addFiles(Object.values(result.files));
                }
                // Sync back to backend
                const els = api
                  .getSceneElements()
                  .filter((e) => !e.isDeleted);
                await fetch(
                  `${EXCALIDRAW_SERVER_URL}/api/elements/sync`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      elements: els,
                      timestamp: new Date().toISOString(),
                    }),
                  },
                ).catch(() => {});
              }
            } catch (err) {
              console.error(
                "[ExcalidrawSync] Mermaid conversion error:",
                err,
              );
            }
            break;
          }

          /* ── Tool progress (activity feed only) ──────────────── */
          case "tool_progress": {
            if (data.message) {
              addActivity(data.message, "create");
            }
            break;
          }

          /* ── Sync confirmations ────────────────────────────────── */
          case "elements_synced":
          case "sync_status":
            break;

          default:
            console.log(
              "[ExcalidrawSync] Unknown message type:",
              data.type,
            );
        }
      } catch (err) {
        console.error(
          "[ExcalidrawSync] Error handling message:",
          err,
          data,
        );
      }
    },
    [loadExistingElements, addActivity],
  );

  // ── WebSocket lifecycle ────────────────────────────────────────────
  useEffect(() => {
    if (!excalidrawAPI) return;

    console.log("[ExcalidrawSync] Connecting WebSocket to", EXCALIDRAW_WS_URL);

    // Load existing elements via REST first
    loadExistingElements(excalidrawAPI);

    // Connect WebSocket
    const ws = new WebSocket(EXCALIDRAW_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setSyncStatus("connected");
      console.log("[ExcalidrawSync] ✅ WebSocket connected");

      // Re-fetch elements after WS connects (in case initial_elements was empty)
      setTimeout(() => loadExistingElements(excalidrawAPI), 200);
    };

    ws.onmessage = (evt: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(evt.data);
        handleWebSocketMessage(data, excalidrawAPI);
      } catch (err) {
        console.error("[ExcalidrawSync] Bad WS message:", err);
      }
    };

    ws.onclose = (evt: CloseEvent) => {
      setSyncStatus("disconnected");
      wsRef.current = null;
      console.log("[ExcalidrawSync] WebSocket closed:", evt.code, evt.reason);

      // Auto-reconnect unless clean close
      if (evt.code !== 1000) {
        reconnectTimer.current = setTimeout(() => {
          console.log("[ExcalidrawSync] Reconnecting...");
          // Bump epoch to force the useEffect to re-run
          setWsEpoch((e) => e + 1);
        }, 3000);
      }
    };

    ws.onerror = () => {
      console.error("[ExcalidrawSync] WebSocket error");
      setSyncStatus("error");
    };

    return () => {
      clearTimeout(reconnectTimer.current);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000);
      }
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excalidrawAPI, handleWebSocketMessage, loadExistingElements, wsEpoch]);

  // ── Sync local elements to backend (manual push) ──────────────────
  const syncToBackend = useCallback(async () => {
    if (!excalidrawAPI) return;
    setSyncStatus("syncing");
    try {
      const els = excalidrawAPI
        .getSceneElements()
        .filter((e) => !e.isDeleted);
      await fetch(`${EXCALIDRAW_SERVER_URL}/api/elements/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elements: els,
          timestamp: new Date().toISOString(),
        }),
      });
      setSyncStatus("connected");
    } catch {
      setSyncStatus("error");
    }
  }, [excalidrawAPI]);

  // ── Clear canvas (both local + backend) ───────────────────────────
  const clearCanvas = useCallback(async () => {
    if (!excalidrawAPI) return;
    try {
      await fetch(`${EXCALIDRAW_SERVER_URL}/api/elements/clear`, {
        method: "DELETE",
      });
    } catch {
      // Still clear frontend
    }
    excalidrawAPI.updateScene({
      elements: [],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  }, [excalidrawAPI]);

  return {
    /** Pass to `<Excalidraw excalidrawAPI={onAPIReady}>` */
    onAPIReady,
    excalidrawAPI,
    syncStatus,
    syncToBackend,
    clearCanvas,
    /** Real-time tool activity feed for canvas overlay */
    activities,
  };
}
