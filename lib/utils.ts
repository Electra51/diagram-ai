// Helpers
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DiagramState } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function sanitizeDiagram(raw: unknown): DiagramState | null {
  try {
    const data = raw as DiagramState;
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return null;

    const nodes = data.nodes.map((n, i) => ({
      id: n.id || `node-${i}`,
      type: n.type || "custom",
      position: {
        x: typeof n.position?.x === "number" ? n.position.x : i * 200,
        y: typeof n.position?.y === "number" ? n.position.y : 100,
      },
      data: {
        label: n.data?.label || "Node",
        description: n.data?.description || "",
        color: n.data?.color || "#00d4ff",
        type: n.data?.type || "default",
      },
    }));

    const edges = data.edges.map((e, i) => ({
      id: e.id || `edge-${i}`,
      source: e.source,
      target: e.target,
      label: e.label || "",
      type: e.type || "smoothstep",
      animated: e.animated ?? false,
      style: { stroke: "#3a3a50", strokeWidth: 2 },
      labelStyle: { fill: "#8888aa", fontSize: 11 },
      labelBgStyle: { fill: "#16161f", fillOpacity: 0.9 },
    }));

    return { nodes, edges };
  } catch {
    return null;
  }
}

export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
