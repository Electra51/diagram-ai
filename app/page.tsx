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

  // Demo diagrams for quick recruiter-friendly preview
  const demoLoginFlow: DiagramState = {
    nodes: [
      { id: "login", type: "custom", position: { x: 100, y: 80 }, data: { label: "Login", description: "User enters credentials", color: "#06b6d4" } },
      { id: "verify", type: "custom", position: { x: 340, y: 80 }, data: { label: "Verify", description: "Auth service checks credentials", color: "#6366f1" } },
      { id: "dashboard", type: "custom", position: { x: 580, y: 80 }, data: { label: "Dashboard", description: "User landing page", color: "#10b981" } },
    ],
    edges: [
      { id: "e1", source: "login", target: "verify", type: "smoothstep", animated: true },
      { id: "e2", source: "verify", target: "dashboard", type: "smoothstep" },
    ],
  };

  const demoEcommerceFlow: DiagramState = {
    nodes: [
      { id: "browse", type: "custom", position: { x: 80, y: 60 }, data: { label: "Browse", description: "User browses products", color: "#00d4ff" } },
      { id: "cart", type: "custom", position: { x: 300, y: 60 }, data: { label: "Cart", description: "Products added to cart", color: "#f59e0b" } },
      { id: "checkout", type: "custom", position: { x: 520, y: 60 }, data: { label: "Checkout", description: "Payment & address", color: "#ef4444" } },
      { id: "fulfill", type: "custom", position: { x: 740, y: 60 }, data: { label: "Fulfillment", description: "Order processing", color: "#8b5cf6" } },
    ],
    edges: [
      { id: "e3", source: "browse", target: "cart", type: "smoothstep" },
      { id: "e4", source: "cart", target: "checkout", type: "smoothstep" },
      { id: "e5", source: "checkout", target: "fulfill", type: "smoothstep" },
    ],
  };

  const handleLoadDemo = useCallback((which: "login" | "ecom") => {
    if (which === "login") {
      setDiagram(demoLoginFlow);
      setExplanation("Login flow: user submits credentials → auth verifies → dashboard.");
    } else {
      setDiagram(demoEcommerceFlow);
      setExplanation("E-commerce flow: browse → cart → checkout → fulfillment.");
    }
  }, [demoEcommerceFlow, demoLoginFlow]);

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

  const [exportOpen, setExportOpen] = useState(false);

  const menuItemClass = (isDark: boolean) =>
    cn(
      "w-full text-left px-3 py-2 text-sm transition-colors",
      isDark ? "text-[#cbd5e1] hover:bg-[#0f172a]" : "text-[#0f172a] hover:bg-[#f8fafc]",
    );

  const createDiagramImage = useCallback(async (): Promise<string | null> => {
    try {
      const nodes = diagram.nodes || [];
      const edges = diagram.edges || [];
      if (nodes.length === 0) return null;

      const NODE_W = 160;
      const NODE_H = 48;
      const padding = 40;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach((n) => {
        const x = (n.position as any).x ?? 0;
        const y = (n.position as any).y ?? 0;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + NODE_W);
        maxY = Math.max(maxY, y + NODE_H);
      });

      const width = Math.ceil(maxX - minX + padding * 2);
      const height = Math.ceil(maxY - minY + padding * 2);

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(300, width);
      canvas.height = Math.max(200, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // background
      ctx.fillStyle = isDark ? "#020617" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // draw edges
      ctx.strokeStyle = isDark ? "#94a3b8" : "#374151";
      ctx.lineWidth = 2;
      edges.forEach((e) => {
        const src = nodes.find((n) => n.id === e.source);
        const dst = nodes.find((n) => n.id === e.target);
        if (!src || !dst) return;
        const sx = (src.position as any).x - minX + padding + NODE_W / 2;
        const sy = (src.position as any).y - minY + padding + NODE_H / 2;
        const tx = (dst.position as any).x - minX + padding + NODE_W / 2;
        const ty = (dst.position as any).y - minY + padding + NODE_H / 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      });

      // draw nodes
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "14px Inter, system-ui, sans-serif";
      nodes.forEach((n) => {
        const x = (n.position as any).x - minX + padding;
        const y = (n.position as any).y - minY + padding;
        const color = (n.data as any)?.color || (isDark ? "#334155" : "#e6eefc");
        ctx.fillStyle = color;
        roundRect(ctx, x, y, NODE_W, NODE_H, 8, true, false);
        // label
        ctx.fillStyle = isDark ? "#e2e8f0" : "#0f172a";
        const label = (n.data as any)?.label || "Node";
        ctx.fillText(label, x + NODE_W / 2, y + NODE_H / 2);
      });

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [diagram, isDark]);

  const exportAsImage = useCallback(async (type: 'png' | 'jpeg') => {
    const dataUrl = await createDiagramImage();
    if (!dataUrl) {
      setError('Nothing to export');
      return;
    }
    const a = document.createElement('a');
    if (type === 'png') {
      a.href = dataUrl;
      a.download = 'diagram.png';
    } else {
      // convert to jpeg
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = isDark ? '#020617' : '#ffffff';
      ctx.fillRect(0,0,canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      a.href = canvas.toDataURL('image/jpeg', 0.92);
      a.download = 'diagram.jpg';
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [createDiagramImage, isDark]);

  const exportAsPDF = useCallback(async () => {
    const dataUrl = await createDiagramImage();
    if (!dataUrl) {
      setError('Nothing to export');
      return;
    }
    const w = window.open('');
    if (!w) {
      setError('Cannot open window for PDF export');
      return;
    }
    w.document.write(`<img src="${dataUrl}" style="max-width:100%"/>`);
    // let user print to PDF
    setTimeout(() => w.print(), 300);
  }, [createDiagramImage]);

  // helper: rounded rect
  function roundRect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number, fill:boolean, stroke:boolean) {
    if (r === undefined) r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

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
              onClick={() => handleLoadDemo("login")}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium border transition-colors",
                isDark
                  ? "border-[#1e293b] bg-[#0b1220] text-[#cbd5e1] hover:bg-[#111827]"
                  : "border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc]",
              )}
              title="Load Login Flow demo"
            >
              Login Demo
            </button>
            <button
              onClick={() => handleLoadDemo("ecom")}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium border transition-colors",
                isDark
                  ? "border-[#1e293b] bg-[#0b1220] text-[#cbd5e1] hover:bg-[#111827]"
                  : "border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc]",
              )}
              title="Load E-commerce Flow demo"
            >
              E‑com Demo
            </button>
            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                className={cn(
                  "p-2 rounded-full flex items-center justify-center border transition-colors",
                  isDark
                    ? "border-[#1e293b] bg-[#0b1220] text-[#cbd5e1] hover:bg-[#111827]"
                    : "border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc]",
                )}
                title="Export"
                aria-label="Export"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 21H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {exportOpen && (
                <div className={cn(
                  "absolute right-0 mt-2 w-40 rounded-lg shadow-lg z-50",
                  isDark ? "bg-[#0b1220] border border-[#1e293b]" : "bg-white border border-[#e2e8f0]",
                )}>
                  <button onClick={() => { handleExport(); setExportOpen(false); }} className={menuItemClass(isDark)}>Export JSON</button>
                  <button onClick={() => { exportAsImage('png'); setExportOpen(false); }} className={menuItemClass(isDark)}>Export PNG</button>
                  <button onClick={() => { exportAsImage('jpeg'); setExportOpen(false); }} className={menuItemClass(isDark)}>Export JPG</button>
                  <button onClick={() => { exportAsPDF(); setExportOpen(false); }} className={menuItemClass(isDark)}>Export PDF</button>
                </div>
              )}
            </div>
            <button
              onClick={handleImportPick}
              className={cn(
                "p-2 rounded-full flex items-center justify-center border transition-colors",
                isDark
                  ? "border-[#1e293b] bg-[#0b1220] text-[#cbd5e1] hover:bg-[#111827]"
                  : "border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc]",
              )}
              title="Import"
              aria-label="Import"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={handleShare}
              className={cn(
                "p-2 rounded-full flex items-center justify-center border transition-colors",
                isDark
                  ? "border-[#1e293b] bg-[#0b1220] text-[#cbd5e1] hover:bg-[#111827]"
                  : "border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc]",
              )}
              title="Share"
              aria-label="Share"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 6l-4-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
