"use client";

import PromptPanel from "@/components/PromptPanel";
import {
  DiagramMode,
  DiagramState,
  GenerateResponse,
  HistoryItem,
} from "@/lib/types";
import { cn, generateId, sanitizeDiagram } from "@/lib/utils";
import { AlertCircle, PanelLeft, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";

// Dynamically import DiagramEditor to avoid SSR issues with React Flow
const DiagramEditor = dynamic(() => import("@/components/DiagramEditor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#1e1e2e] border-t-[#00d4ff] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[12px] text-[#3a3a50] font-mono">
          Loading canvas...
        </p>
      </div>
    </div>
  ),
});

const EMPTY_DIAGRAM: DiagramState = { nodes: [], edges: [] };

export default function HomePage() {
  const [diagram, setDiagram] = useState<DiagramState>(EMPTY_DIAGRAM);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | undefined>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const importInputRef = useRef<HTMLInputElement>(null);

  const diagramJson = useMemo(
    () => JSON.stringify({ nodes: diagram.nodes, edges: diagram.edges }, null, 2),
    [diagram],
  );

  const handleGenerate = useCallback(
    async (
      prompt: string,
      mode: DiagramMode,
      existingDiagram?: DiagramState,
    ) => {
      setIsGenerating(true);
      setError(null);
      setExplanation(undefined);

      try {
        const res = await fetch("/api/generate-diagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, mode, existingDiagram }),
        });

        const data: GenerateResponse = await res.json();

        if (!data.success || !data.diagram) {
          setError(data.error || "Failed to generate diagram");
          return;
        }

        setDiagram(data.diagram);
        setExplanation(data.explanation);

        // Add to history
        setHistory((prev) => [
          {
            id: generateId(),
            prompt,
            mode,
            timestamp: new Date(),
            diagram: data.diagram!,
          },
          ...prev.slice(0, 19), // Keep last 20
        ]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Network error. Try again.",
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  const handleRestoreHistory = useCallback((item: HistoryItem) => {
    setDiagram(item.diagram);
    setExplanation(undefined);
    setError(null);
  }, []);

  const handleDiagramChange = useCallback((updated: DiagramState) => {
    setDiagram(updated);
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([diagramJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [diagramJson]);

  const handleImportPick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async () => {
    const file = importInputRef.current?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const sanitized = sanitizeDiagram(parsed);
      if (!sanitized) {
        setError("Import failed: invalid diagram JSON format.");
        return;
      }
      setDiagram(sanitized);
      setError(null);
      setExplanation(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(diagramJson);
      setError(null);
    } catch {
      setError("Share failed: could not copy to clipboard.");
    }
  }, [diagramJson]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f3f4f6]">
      {/* Left panel */}
      <div
        className={cn(
          "shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          panelOpen ? "w-[320px]" : "w-0",
        )}
      >
        <div className="w-[320px] h-full">
          <PromptPanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            history={history}
            onRestoreHistory={handleRestoreHistory}
            currentDiagram={diagram}
            onChangeDiagram={setDiagram}
            explanation={explanation}
          />
        </div>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb] bg-white z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPanelOpen((p) => !p)}
              className="
                w-8 h-8 rounded-lg flex items-center justify-center
                text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6]
                transition-all duration-200
              "
              title="Toggle panel"
            >
              <PanelLeft size={16} />
            </button>
            <div className="h-4 w-px bg-[#e5e7eb]" />
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono text-[#6b7280]">
                {diagram.nodes.length} nodes
              </span>
              <span className="text-[12px] font-mono text-[#9ca3af]">·</span>
              <span className="text-[12px] font-mono text-[#6b7280]">
                {diagram.edges.length} edges
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-full text-xs font-medium border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] transition-colors"
              title="Export diagram JSON"
            >
              Export
            </button>
            <button
              onClick={handleImportPick}
              className="px-4 py-2 rounded-full text-xs font-medium border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] transition-colors"
              title="Import diagram JSON"
            >
              Import
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-full text-xs font-medium border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] transition-colors"
              title="Copy diagram JSON to clipboard"
            >
              Share
            </button>
            {isGenerating && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827] text-white animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[11px] font-mono">
                  Generating...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-[#3d1515] border border-[#5a1f1f] flex items-center gap-3 animate-slide-up z-10">
            <AlertCircle size={14} className="text-[#f87171] shrink-0" />
            <p className="text-[12px] text-[#f87171] font-mono flex-1">
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="text-[#f87171] hover:text-[#fca5a5] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          <DiagramEditor
            diagram={diagram}
            onDiagramChange={handleDiagramChange}
          />
        </div>
      </div>
    </div>
  );
}
