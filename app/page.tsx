"use client";

import PromptPanel from "@/components/PromptPanel";
import {
  DiagramMode,
  DiagramState,
  GenerateResponse,
  HistoryItem,
} from "@/lib/types";
import { cn, generateId, sanitizeDiagram } from "@/lib/utils";
import { AlertCircle, MoonStar, PanelLeft, SunMedium, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";

type ThemeMode = "light" | "dark";

// Dynamically import DiagramEditor to avoid SSR issues with React Flow
const DiagramEditor = dynamic(() => import("@/components/DiagramEditor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#1e1e2e] border-t-[#00d4ff] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[12px] text-[#3a3a50] font-mono">Loading canvas...</p>
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
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [summaryCopied, setSummaryCopied] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === "dark";

  const diagramJson = useMemo(
    () => JSON.stringify({ nodes: diagram.nodes, edges: diagram.edges }, null, 2),
    [diagram],
  );

  const summaryText = useMemo(() => {
    const nodeCount = diagram.nodes.length;
    const edgeCount = diagram.edges.length;
    const base =
      explanation?.trim() ||
      `This workflow contains ${nodeCount} nodes and ${edgeCount} connections.`;
    return `Recruiter-ready summary: ${base}`;
  }, [diagram.nodes.length, diagram.edges.length, explanation]);

  const handleGenerate = useCallback(
    async (prompt: string, existingDiagram?: DiagramState) => {
      const mode: DiagramMode = "user";
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

        setHistory((prev) => [
          {
            id: generateId(),
            prompt,
            mode,
            timestamp: new Date(),
            diagram: data.diagram!,
          },
          ...prev.slice(0, 19),
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

  const handleCopySummary = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setSummaryCopied(true);
      setError(null);
      window.setTimeout(() => setSummaryCopied(false), 1600);
    } catch {
      setError("Summary copy failed.");
    }
  }, [summaryText]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    setSummaryCopied(false);
  }, []);

  return (
    <div
      className={cn(
        "flex h-screen w-screen overflow-hidden transition-colors duration-300",
        isDark ? "bg-[#060816] text-[#f8fafc]" : "bg-[#f8fafc] text-[#0f172a]",
      )}
    >
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
            theme={theme}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div
          className={cn(
            "flex items-center justify-between px-4 py-3 border-b z-10 backdrop-blur",
            isDark
              ? "border-[#1e293b] bg-[#0f172a]/95 text-[#f8fafc]"
              : "border-[#e2e8f0] bg-white/90 text-[#0f172a]",
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPanelOpen((p) => !p)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                isDark
                  ? "text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#111827]"
                  : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]",
              )}
              title="Toggle panel"
            >
              <PanelLeft size={16} />
            </button>
            <div className={cn("h-4 w-px", isDark ? "bg-[#1e293b]" : "bg-[#e2e8f0]")} />
            <div className="flex items-center gap-2">
              <span className={cn("text-[12px] font-mono", isDark ? "text-[#94a3b8]" : "text-[#475569]")}>
                {diagram.nodes.length} nodes
              </span>
              <span className={cn("text-[12px] font-mono", isDark ? "text-[#64748b]" : "text-[#94a3b8]")}>
                ·
              </span>
              <span className={cn("text-[12px] font-mono", isDark ? "text-[#94a3b8]" : "text-[#475569]")}>
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
              onClick={handleToggleTheme}
              className={cn(
                "w-9 h-9 rounded-full border flex items-center justify-center transition-colors",
                isDark
                  ? "border-[#1e293b] bg-[#111827] hover:bg-[#172033] text-[#f8fafc]"
                  : "border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-[#0f172a]",
              )}
              title="Toggle theme"
            >
              {isDark ? <SunMedium size={14} /> : <MoonStar size={14} />}
            </button>
            <button
              onClick={handleExport}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium border transition-colors",
                isDark
                  ? "border-[#1e293b] bg-[#111827] hover:bg-[#172033] text-[#f8fafc]"
                  : "border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-[#0f172a]",
              )}
              title="Export diagram JSON"
            >
              Export
            </button>
            <button
              onClick={handleImportPick}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium border transition-colors",
                isDark
                  ? "border-[#1e293b] bg-[#111827] hover:bg-[#172033] text-[#f8fafc]"
                  : "border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-[#0f172a]",
              )}
              title="Import diagram JSON"
            >
              Import
            </button>
            <button
              onClick={handleShare}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium border transition-colors",
                isDark
                  ? "border-[#1e293b] bg-[#111827] hover:bg-[#172033] text-[#f8fafc]"
                  : "border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-[#0f172a]",
              )}
              title="Copy diagram JSON to clipboard"
            >
              Share
            </button>
            {explanation && (
              <button
                onClick={handleCopySummary}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium border transition-colors",
                  isDark
                    ? "border-[#1e293b] bg-[#0f172a] hover:bg-[#172033] text-[#38bdf8]"
                    : "border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb]",
                )}
                title="Copy recruiter-ready summary"
              >
                {summaryCopied ? "Copied" : "Summary"}
              </button>
            )}
            {isGenerating && (
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg animate-fade-in",
                  isDark ? "bg-[#111827] text-white" : "bg-[#0f172a] text-white",
                )}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[11px] font-mono">Generating...</span>
              </div>
            )}
          </div>
        </div>

        {explanation && (
          <div
            className={cn(
              "mx-4 mt-3 rounded-2xl border p-4 shadow-sm",
              isDark
                ? "border-[#1e293b] bg-[#0f172a]/90"
                : "border-[#e2e8f0] bg-white/95",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={cn(
                    "text-[10px] uppercase tracking-[0.3em] font-semibold",
                    isDark ? "text-[#38bdf8]" : "text-[#2563eb]",
                  )}
                >
                  Recruiter-ready summary
                </p>
                <p
                  className={cn(
                    "text-sm leading-6 mt-2",
                    isDark ? "text-[#cbd5e1]" : "text-[#334155]",
                  )}
                >
                  {explanation}
                </p>
              </div>
              <button
                onClick={handleCopySummary}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors",
                  isDark
                    ? "border-[#1e293b] bg-[#111827] text-[#f8fafc] hover:bg-[#172033]"
                    : "border-[#cbd5e1] bg-white text-[#0f172a] hover:bg-[#f8fafc]",
                )}
              >
                {summaryCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-[#3d1515] border border-[#5a1f1f] flex items-center gap-3 animate-slide-up z-10">
            <AlertCircle size={14} className="text-[#f87171] shrink-0" />
            <p className="text-[12px] text-[#f87171] font-mono flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-[#f87171] hover:text-[#fca5a5] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex-1 relative">
          <DiagramEditor diagram={diagram} onDiagramChange={handleDiagramChange} theme={theme} />
        </div>
      </div>
    </div>
  );
}
