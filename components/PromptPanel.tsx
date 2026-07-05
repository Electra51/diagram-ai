// Left panel with prompt input
"use client";

import { DiagramState, HistoryItem } from "@/lib/types";
import { cn, formatTimestamp, sanitizeDiagram } from "@/lib/utils";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { KeyboardEvent, useCallback, useMemo, useRef, useState } from "react";

const EXAMPLE_PROMPTS: string[] = [
  "Login → Verify credentials → Dashboard",
  "User → API Gateway → Backend → Database",
  "Order placed → Payment → Fulfillment → Delivery",
  "React component lifecycle: mount, update, unmount",
];

interface PromptPanelProps {
  onGenerate: (prompt: string, existingDiagram?: DiagramState) => Promise<void>;
  isGenerating: boolean;
  history: HistoryItem[];
  onRestoreHistory: (item: HistoryItem) => void;
  currentDiagram: DiagramState;
  onChangeDiagram: (diagram: DiagramState) => void;
  explanation?: string;
  theme: "light" | "dark";
}

export default function PromptPanel({
  onGenerate,
  isGenerating,
  history,
  onRestoreHistory,
  currentDiagram,
  onChangeDiagram,
  explanation,
  theme,
}: PromptPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"prompt" | "code">("prompt");
  const [codeText, setCodeText] = useState("");
  const [codeDirty, setCodeDirty] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDark = theme === "dark";
  const panelSurface = isDark
    ? "bg-[#111118] border-[#1e1e2e] text-[#e2e2f0]"
    : "bg-white border-[#e2e8f0] text-[#0f172a]";
  const panelBorder = isDark ? "border-[#1e1e2e]" : "border-[#e2e8f0]";
  const panelMuted = isDark ? "text-[#55556a]" : "text-[#64748b]";
  const panelSecondary = isDark ? "text-[#8888aa]" : "text-[#475569]";
  const panelAccent = isDark ? "text-[#00d4ff]" : "text-[#2563eb]";
  const inputClasses = cn(
    "w-full resize-none rounded-xl px-4 py-3 pr-12 text-[13px] font-mono leading-relaxed",
    isDark
      ? "bg-[#16161f] border border-[#1e1e2e] text-[#e2e2f0] placeholder:text-[#3a3a50]"
      : "bg-white border border-[#cbd5e1] text-[#0f172a] placeholder:text-[#64748b]",
    "focus:outline-none focus:border-[#00d4ff40] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
  );
  const sectionCard = cn(
    "rounded-2xl border shadow-sm",
    isDark
      ? "border-[#1e1e2e] bg-[#16161f]/90 shadow-[0_12px_30px_rgba(2,6,23,0.22)]"
      : "border-[#e2e8f0] bg-[#f8fafc] shadow-[0_10px_24px_rgba(15,23,42,0.06)]",
  );

  const diagramJson = useMemo(
    () =>
      JSON.stringify(
        { nodes: currentDiagram.nodes, edges: currentDiagram.edges },
        null,
        2,
      ),
    [currentDiagram],
  );

  const codeValue = activeTab === "code" && !codeDirty ? diagramJson : codeText;

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    const p = prompt.trim();
    setPrompt("");
    await onGenerate(
      p,
      currentDiagram.nodes.length > 0 ? currentDiagram : undefined,
    );
  }, [prompt, isGenerating, onGenerate, currentDiagram]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const insertExample = useCallback((example: string) => {
    setPrompt(example);
    textareaRef.current?.focus();
  }, []);

  const handleApplyCode = useCallback(() => {
    setCodeError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(codeText);
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }

    const sanitized = sanitizeDiagram(parsed);
    if (!sanitized) {
      setCodeError(
        "JSON is valid, but diagram shape is invalid (needs nodes[] and edges[]).",
      );
      return;
    }
    onChangeDiagram(sanitized);
  }, [codeText, onChangeDiagram]);

  return (
    <div className={cn("flex flex-col h-full border-r", panelSurface, panelBorder)}>
      <div className={cn("px-5 pt-5 pb-4 border-b", panelBorder)}>
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className={cn(
              "w-7 h-7 rounded-lg border flex items-center justify-center",
              isDark
                ? "bg-[#00d4ff15] border-[#00d4ff30]"
                : "bg-[#eff6ff] border-[#bfdbfe]",
            )}
          >
            <Sparkles size={14} className={panelAccent} />
          </div>
          <span
            className={cn(
              "font-display text-sm font-bold tracking-wider uppercase",
              isDark ? "text-[#e2e2f0]" : "text-[#0f172a]",
            )}
          >
            DiagramAI
          </span>
        </div>
        <p className={cn("text-[11px] font-mono", panelMuted)}>Powered by Groq</p>
      </div>

      <div className={cn("px-5 py-3 border-b", panelBorder)}>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("prompt")}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-200",
              activeTab === "prompt"
                ? isDark
                  ? "bg-[#16161f] border-[#2a2a40] text-[#e2e2f0]"
                  : "bg-[#eff6ff] border-[#93c5fd] text-[#0f172a]"
                : isDark
                  ? "bg-transparent border-[#1e1e2e] text-[#55556a] hover:border-[#2a2a40] hover:text-[#8888aa]"
                  : "bg-transparent border-[#e2e8f0] text-[#64748b] hover:border-[#93c5fd] hover:text-[#2563eb]",
            )}
          >
            Prompt
          </button>
          <button
            onClick={() => {
              setActiveTab("code");
              setCodeText(diagramJson);
              setCodeDirty(false);
              setCodeError(null);
            }}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-200",
              activeTab === "code"
                ? isDark
                  ? "bg-[#16161f] border-[#2a2a40] text-[#e2e2f0]"
                  : "bg-[#eff6ff] border-[#93c5fd] text-[#0f172a]"
                : isDark
                  ? "bg-transparent border-[#1e1e2e] text-[#55556a] hover:border-[#2a2a40] hover:text-[#8888aa]"
                  : "bg-transparent border-[#e2e8f0] text-[#64748b] hover:border-[#93c5fd] hover:text-[#2563eb]",
            )}
          >
            Code
          </button>
        </div>
      </div>

      {activeTab === "prompt" && (
        <div className={cn("px-4 py-4 border-b", panelBorder)}>
          <div className={cn("relative p-3 rounded-2xl border", sectionCard)}>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe nodes and connections..."
              rows={4}
              disabled={isGenerating}
              className={inputClasses}
            />
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGenerating}
              className={cn(
                "absolute bottom-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                prompt.trim() && !isGenerating
                  ? isDark
                    ? "bg-[#00d4ff] text-[#0a0a0f] hover:bg-[#00bbee] shadow-[0_0_12px_rgba(0,212,255,0.3)]"
                    : "bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-[0_0_12px_rgba(37,99,235,0.2)]"
                  : isDark
                    ? "bg-[#1e1e2e] text-[#3a3a50] cursor-not-allowed"
                    : "bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed",
              )}
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
          <p className={cn("text-[10px] mt-2 font-mono", isDark ? "text-[#2a2a40]" : "text-[#94a3b8]")}>
            Ctrl/⌘ + Enter to generate
            {currentDiagram.nodes.length > 0 && (
              <span className={cn("ml-2", isDark ? "text-[#7c3aed]" : "text-[#7c3aed]")}>
                · will update existing diagram
              </span>
            )}
          </p>
        </div>
      )}

      {activeTab === "code" && (
        <div className={cn("px-4 py-4 border-b", panelBorder)}>
          <div className={cn("p-3 rounded-2xl border", sectionCard)}>
            <div className="flex items-center justify-between mb-2">
              <p className={cn("text-[10px] font-mono uppercase tracking-widest", panelMuted)}>
                Diagram JSON
              </p>
              <button
                onClick={handleApplyCode}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                  isDark
                    ? "bg-[#00d4ff] text-[#0a0a0f] hover:bg-[#00bbee]"
                    : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]",
                )}
                title="Apply JSON to canvas"
              >
                Apply
              </button>
            </div>
            <textarea
              value={codeValue}
              onChange={(e) => {
                setCodeDirty(true);
                setCodeText(e.target.value);
              }}
              spellCheck={false}
              rows={10}
              className={cn(
                "w-full resize-none rounded-xl px-4 py-3 text-[12px] font-mono leading-relaxed",
                isDark
                  ? "bg-[#0f0f16] border border-[#1e1e2e] text-[#e2e2f0] placeholder:text-[#3a3a50]"
                  : "bg-[#f8fafc] border border-[#cbd5e1] text-[#0f172a] placeholder:text-[#64748b]",
                "focus:outline-none focus:border-[#00d4ff40] transition-colors duration-200",
              )}
            />
            {codeError && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-[#3d1515] border border-[#5a1f1f]">
                <p className="text-[11px] text-[#f87171] font-mono">{codeError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 py-3 space-y-3">
          {isGenerating && (
            <div className={cn("px-4 py-3 rounded-2xl border animate-fade-in", sectionCard)}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]"
                      style={{
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-[#00d4ff] font-mono">Generating...</span>
              </div>
            </div>
          )}

          {explanation && !isGenerating && (
            <div className={cn("px-4 py-3 rounded-2xl border animate-slide-up", sectionCard)}>
              <p className={cn("text-[10px] uppercase tracking-widest font-mono mb-1.5", panelMuted)}>
                AI Explanation
              </p>
              <p className={cn("text-[12px] leading-relaxed", panelSecondary)}>
                {explanation}
              </p>
            </div>
          )}

          {activeTab === "prompt" && (
            <div className={cn("px-4 py-3 rounded-2xl border", sectionCard)}>
              <p className={cn("text-[10px] font-mono uppercase tracking-widest mb-2.5", panelMuted)}>
                Examples
              </p>
              <div className="flex flex-col gap-1.5">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => insertExample(ex)}
                    className={cn(
                      "text-left text-[11px] px-3 py-2 rounded-lg transition-all duration-150 flex items-center gap-2 group",
                      isDark
                        ? "text-[#55556a] bg-[#16161f] border border-transparent hover:border-[#1e1e2e] hover:text-[#8888aa]"
                        : "text-[#64748b] bg-[#f8fafc] border border-transparent hover:border-[#cbd5e1] hover:text-[#2563eb]",
                    )}
                  >
                    <ChevronRight
                      size={10}
                      className={cn(
                        "shrink-0 transition-colors",
                        isDark ? "text-[#3a3a50] group-hover:text-[#00d4ff]" : "text-[#94a3b8] group-hover:text-[#2563eb]",
                      )}
                    />
                    <span className="truncate">{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className={cn("px-4 py-3 rounded-2xl border", sectionCard)}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  "flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest mb-3 transition-colors w-full",
                  panelMuted,
                )}
              >
                <Clock size={10} />
                History ({history.length})
                <ChevronRight
                  size={10}
                  className={cn("ml-auto transition-transform", showHistory && "rotate-90")}
                />
              </button>
              {showHistory && (
                <div className="flex flex-col gap-2 animate-fade-in">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onRestoreHistory(item)}
                      className={cn(
                        "text-left px-3 py-2.5 rounded-lg transition-all group",
                        isDark
                          ? "bg-[#16161f] border border-[#1e1e2e] hover:border-[#2a2a40]"
                          : "bg-white border border-[#e2e8f0] hover:border-[#cbd5e1]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-[11px] truncate transition-colors",
                            isDark ? "text-[#8888aa] group-hover:text-[#e2e2f0]" : "text-[#475569] group-hover:text-[#0f172a]",
                          )}
                        >
                          {item.prompt}
                        </p>
                        <RotateCcw
                          size={10}
                          className={cn(
                            "shrink-0 mt-0.5 transition-colors",
                            isDark ? "text-[#3a3a50] group-hover:text-[#00d4ff]" : "text-[#94a3b8] group-hover:text-[#2563eb]",
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[9px] font-mono", panelMuted)}>
                          {formatTimestamp(item.timestamp)}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-mono px-1.5 py-0.5 rounded",
                            item.mode === "agent"
                              ? isDark
                                ? "bg-[#7c3aed15] text-[#7c3aed]"
                                : "bg-[#ede9fe] text-[#7c3aed]"
                              : isDark
                                ? "bg-[#00d4ff10] text-[#00d4ff]"
                                : "bg-[#dbeafe] text-[#2563eb]",
                          )}
                        >
                          {item.mode}
                        </span>
                        <span className={cn("text-[9px] font-mono", panelMuted)}>
                          {item.diagram.nodes.length} nodes
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={cn("px-5 py-3 border-t bg-transparent", panelBorder)}>
        <div className="flex items-start gap-2">
          <AlertCircle size={11} className={cn("mt-0.5 shrink-0", panelMuted)} />
          <p className={cn("text-[10px] leading-relaxed", panelMuted)}>
            Using Gemini free tier. May have rate limits. Backend integration pending.
          </p>
        </div>
      </div>
    </div>
  );
}
