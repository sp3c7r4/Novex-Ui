import {
  parseMermaidToExcalidraw,
  type MermaidConfig,
} from "@excalidraw/mermaid-to-excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types/types";

export type { MermaidConfig };

export interface MermaidConversionResult {
  elements: readonly ExcalidrawElement[];
  files?: BinaryFiles;
  error?: string;
}

/**
 * Converts a Mermaid diagram definition to Excalidraw elements.
 * Must run in the browser (needs DOM access).
 */
export async function convertMermaidToExcalidraw(
  definition: string,
  config?: MermaidConfig,
): Promise<MermaidConversionResult> {
  try {
    const result = await parseMermaidToExcalidraw(definition, config);
    return { elements: result.elements, files: result.files };
  } catch (error) {
    console.error("[MermaidConverter] Error:", error);
    return {
      elements: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const DEFAULT_MERMAID_CONFIG: MermaidConfig = {
  startOnLoad: false,
  flowchart: { curve: "linear" },
  themeVariables: { fontSize: "20px" },
  maxEdges: 500,
  maxTextSize: 50000,
};

