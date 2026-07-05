// React Flow canvas
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  EdgeChange,
  MiniMap,
  Node,
  NodeChange,
  Panel,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

import { DiagramEdge, DiagramNode, DiagramNodeData, DiagramState } from "@/lib/types";
import { generateId } from "@/lib/utils";
import {
  Hexagon,
  LayoutGrid,
  SquarePlus,
  Trash2,
  ZoomIn,
} from "lucide-react";
import { nodeTypes } from "./nodes/CustomNode";

interface DiagramEditorProps {
  diagram: DiagramState;
  onDiagramChange: (diagram: DiagramState) => void;
  theme: "light" | "dark";
}

function DiagramEditorInner({ diagram, onDiagramChange, theme }: DiagramEditorProps) {
  const [nodes, setNodes] = useNodesState<DiagramNode["data"]>(diagram.nodes);
  const [edges, setEdges] = useEdgesState(diagram.edges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const applyingExternalRef = useRef(false);
  const isDark = theme === "dark";

  // Sync local state when diagram prop changes (AI generation / history restore / code apply)
  useEffect(() => {
    applyingExternalRef.current = true;
    setNodes(diagram.nodes as Node[]);
    setEdges(diagram.edges);
    // allow one render cycle before re-enabling outward sync
    queueMicrotask(() => {
      applyingExternalRef.current = false;
    });
  }, [diagram, setNodes, setEdges]);

  // Sync outward to parent AFTER render. This avoids "setState during render"
  // from ReactFlow emitting changes during its own render/measure phase.
  useEffect(() => {
    if (applyingExternalRef.current) return;
    // Strip runtime-only function props before persisting upstream.
    const cleanedNodes = (nodes as DiagramNode[]).map((n) => {
      const rest = { ...(n.data ?? {}) } as DiagramNodeData;
      delete (rest as Partial<DiagramNodeData>).onUpdate;
      return { ...n, data: rest };
    });
    onDiagramChange({
      nodes: cleanedNodes as DiagramNode[],
      edges: edges as DiagramEdge[],
    });
  }, [nodes, edges, onDiagramChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `edge-${generateId()}`,
        type: "smoothstep",
        style: { stroke: "#3a3a50", strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((current) => applyNodeChanges(changes, current));
    },
    [setNodes],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((current) => applyEdgeChanges(changes, current));
    },
    [setEdges],
  );

  const updateNodeData = useCallback(
    (id: string, patch: Partial<DiagramNodeData>) => {
      setNodes((current) =>
        current.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
        ),
      );
    },
    [setNodes],
  );

  const nodesForRender = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onUpdate: updateNodeData,
        },
      })),
    [nodes, updateNodeData],
  );

  const addNode = useCallback(() => {
    const newNode: Node = {
      id: `node-${generateId()}`,
      type: "custom",
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        label: "New Node",
        description: "",
        color: "#6366f1",
        type: "default",
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const addTypedNode = useCallback(
    (type: DiagramNodeData["type"], label: string, color: string) => {
      const newNode: Node = {
        id: `node-${generateId()}`,
        type: "custom",
        position: {
          x: Math.random() * 420 + 120,
          y: Math.random() * 320 + 120,
        },
        data: {
          label,
          description: "",
          color,
          type: type ?? "default",
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const clearDiagram = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  return (
    <div
      ref={reactFlowWrapper}
      className={`w-full h-full transition-colors duration-300 ${isDark ? "bg-[#060816]" : "bg-[#f8fafc]"}`}
    >
      <ReactFlow
        nodes={nodesForRender}
        edges={edges}
        style={{ background: isDark ? "#020617" : "#f8fafc" }}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#2a2a40", strokeWidth: 2 },
          labelStyle: { fill: "#8888aa", fontSize: 11 },
          labelBgStyle: { fill: "#16161f", fillOpacity: 0.9 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color={isDark ? "#1e293b" : "#cbd5e1"}
        />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="bottom-6! right-6!"
        />
        <MiniMap
          position="bottom-left"
          className="bottom-6! left-6!"
          nodeColor={(n) => n.data?.color || "#6b7280"}
          maskColor={isDark ? "rgba(2, 6, 23, 0.75)" : "rgba(248, 250, 252, 0.85)"}
          style={{ width: 140, height: 90 }}
        />

        {/* Right-side shape palette (like screenshot) */}
        <Panel position="top-right">
          <div
            className={`mt-24 mr-3 rounded-xl border p-2 w-[132px] shadow-sm ${isDark ? "border-[#1e293b] bg-[#0f172a]" : "border-[#e5e7eb] bg-white"}`}
          >
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { t: "rectangle", l: "Process", c: "#00d4ff", icon: <LayoutGrid size={14} /> },
                { t: "rounded", l: "Screen", c: "#6366f1", icon: <div className="w-3.5 h-3 rounded-sm border border-[#9ca3af]" /> },
                { t: "diamond", l: "Decision", c: "#f59e0b", icon: <div className="w-3 h-3 rotate-45 border border-[#9ca3af]" /> },
                { t: "circle", l: "User", c: "#f97316", icon: <div className="w-3.5 h-3.5 rounded-full border border-[#9ca3af]" /> },
                { t: "cylinder", l: "DB", c: "#8b5cf6", icon: <div className="w-3.5 h-3 border border-[#9ca3af] rounded-full" /> },
                { t: "hexagon", l: "API", c: "#ec4899", icon: <Hexagon size={14} /> },
                {
                  t: "parallelogram",
                  l: "I/O",
                  c: "#06b6d4",
                  icon: <div className="w-3.5 h-3 border border-[#9ca3af] -skew-x-12" />,
                },
                { t: "document", l: "Doc", c: "#84cc16", icon: <div className="w-3.5 h-3 border border-[#9ca3af] rounded-sm" /> },
              ].map((s) => (
                <button
                  key={s.t}
                  onClick={() => addTypedNode(s.t as DiagramNodeData["type"], s.l, s.c)}
                  title={s.l}
                  className={`w-7 h-7 rounded-md border flex items-center justify-center ${isDark ? "border-[#1e293b] bg-[#111827] hover:bg-[#172033] text-[#cbd5e1]" : "border-[#e5e7eb] bg-white hover:bg-[#f9fafb] hover:border-[#d1d5db] text-[#4b5563]"}`}
                >
                  {s.icon}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                onClick={addNode}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border ${isDark ? "border-[#1e293b] bg-[#111827] hover:bg-[#172033] text-[#f8fafc]" : "border-[#e5e7eb] bg-white hover:bg-[#f9fafb] text-[#0f172a]"}`}
                title="Add generic node"
              >
                <span className="inline-flex items-center gap-1">
                  <SquarePlus size={13} /> Add
                </span>
              </button>
              <button
                onClick={clearDiagram}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border ${isDark ? "border-[#1e293b] bg-[#111827] hover:bg-[#172033] text-[#ef4444]" : "border-[#e5e7eb] bg-white hover:bg-[#fef2f2] hover:border-[#fecaca] text-[#ef4444]"}`}
                title="Clear diagram"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </Panel>

        {/* Empty state */}
        {nodes.length === 0 && (
          <Panel position="top-center">
            <div className="mt-32 text-center animate-fade-in pointer-events-none">
              <div className="text-6xl mb-4 opacity-20">⬡</div>
              <p className={`text-sm font-medium ${isDark ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                Generate a diagram with the prompt panel
              </p>
              <p className={`text-xs mt-1 ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                or click &ldquo;Add Node&rdquo; to start manually
              </p>
            </div>
          </Panel>
        )}

        {/* Keyboard hint */}
        {nodes.length > 0 && (
          <Panel position="top-center">
            <div className={`flex items-center gap-3 text-[10px] font-mono ${isDark ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
              <span className="flex items-center gap-1">
                <kbd className={`px-1 py-0.5 border rounded text-[9px] ${isDark ? "bg-[#111827] border-[#1e293b]" : "bg-white border-[#e5e7eb]"}`}>
                  Double-click
                </kbd>
                edit label
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <kbd className={`px-1 py-0.5 border rounded text-[9px] ${isDark ? "bg-[#111827] border-[#1e293b]" : "bg-white border-[#e5e7eb]"}`}>
                  Del
                </kbd>
                remove
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <ZoomIn size={10} />
                drag handles to connect
              </span>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export default function DiagramEditor(props: DiagramEditorProps) {
  return (
    <ReactFlowProvider>
      <DiagramEditorInner {...props} />
    </ReactFlowProvider>
  );
}
