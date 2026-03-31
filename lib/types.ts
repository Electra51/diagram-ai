// TypeScript interfaces
import { Edge, Node } from "reactflow";

export type DiagramMode = "user" | "agent";

export type DiagramNodeData = {
  label: string;
  description?: string;
  type?: string;
  color?: string;
  /**
   * Runtime-only hook injected by the editor (not persisted).
   * Lets nodes update their own data while keeping the diagram state in sync.
   */
  onUpdate?: (id: string, patch: Partial<Omit<DiagramNodeData, "onUpdate">>) => void;
};

export type DiagramNode = Node<DiagramNodeData>;
export type DiagramEdge = Edge;

export type DiagramState = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

export type GenerateRequest = {
  prompt: string;
  mode: DiagramMode;
  existingDiagram?: DiagramState;
};

export type GenerateResponse = {
  success: boolean;
  diagram?: DiagramState;
  explanation?: string;
  error?: string;
};

export type NodeStyle = {
  background: string;
  border: string;
  color: string;
  borderRadius: string;
  fontSize: string;
  padding: string;
};

export type HistoryItem = {
  id: string;
  prompt: string;
  mode: DiagramMode;
  timestamp: Date;
  diagram: DiagramState;
};
