// Left panel with prompt input
"use client";

import { DiagramMode, DiagramState, HistoryItem } from "@/lib/types";
import { cn, formatTimestamp, sanitizeDiagram } from "@/lib/utils";
import {
  AlertCircle,
  Bot,
  ChevronRight,
  Clock,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { KeyboardEvent, useCallback, useMemo, useRef, useState } from "react";

const EXAMPLE_PROMPTS: Record<DiagramMode, string[]> = {
  user: [
    "Login → Verify credentials → Dashboard",
    "User → API Gateway → Backend → Database",
    "Order placed → Payment → Fulfillment → Delivery",
    "React component lifecycle: mount, update, unmount",
  ],
  agent: [
    "E-commerce checkout flow with error handling",
    "Microservices architecture for a social media app",
    "CI/CD pipeline for a Node.js application",
    "JWT authentication system",
  ],
};

interface PromptPanelProps {
  onGenerate: (
    prompt: string,
    mode: DiagramMode,
    existingDiagram?: DiagramState,
  ) => Promise<void>;
  isGenerating: boolean;
  history: HistoryItem[];
  onRestoreHistory: (item: HistoryItem) => void;
  currentDiagram: DiagramState;
  onChangeDiagram: (diagram: DiagramState) => void;
  explanation?: string;
}

export default function PromptPanel({
  onGenerate,
  isGenerating,
  history,
  onRestoreHistory,
  currentDiagram,
  onChangeDiagram,
  explanation,
}: PromptPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<DiagramMode>("user");
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"prompt" | "code">("prompt");
  const [codeText, setCodeText] = useState("");
  const [codeDirty, setCodeDirty] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const diagramJson = useMemo(
    () => JSON.stringify({ nodes: currentDiagram.nodes, edges: currentDiagram.edges }, null, 2),
    [currentDiagram],
  );

  const codeValue = activeTab === "code" && !codeDirty ? diagramJson : codeText;

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    const p = prompt.trim();
    setPrompt("");
    await onGenerate(
      p,
      mode,
      currentDiagram.nodes.length > 0 ? currentDiagram : undefined,
    );
  }, [prompt, mode, isGenerating, onGenerate, currentDiagram]);

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
      setCodeError("JSON is valid, but diagram shape is invalid (needs nodes[] and edges[]).");
      return;
    }
    onChangeDiagram(sanitized);
  }, [codeText, onChangeDiagram]);

  return (
    <div className="flex flex-col h-full bg-[#111118] border-r border-[#1e1e2e]">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-[#00d4ff15] border border-[#00d4ff30] flex items-center justify-center">
            <Sparkles size={14} className="text-[#00d4ff]" />
          </div>
          <span className="font-display text-sm font-bold tracking-wider text-[#e2e2f0] uppercase">
            DiagramAI
          </span>
        </div>
        <p className="text-[11px] text-[#55556a] font-mono">
          Powered by Groq
        </p>
      </div>

      {/* Tabs */}
      <div className="px-5 py-3 border-b border-[#1e1e2e]">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("prompt")}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-200",
              activeTab === "prompt"
                ? "bg-[#16161f] border-[#2a2a40] text-[#e2e2f0]"
                : "bg-transparent border-[#1e1e2e] text-[#55556a] hover:border-[#2a2a40] hover:text-[#8888aa]",
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
                ? "bg-[#16161f] border-[#2a2a40] text-[#e2e2f0]"
                : "bg-transparent border-[#1e1e2e] text-[#55556a] hover:border-[#2a2a40] hover:text-[#8888aa]",
            )}
          >
            Code
          </button>
        </div>
      </div>

      {/* Mode Toggle */}
      {activeTab === "prompt" && (
        <div className="px-5 py-4 border-b border-[#1e1e2e]">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[#55556a] mb-2.5">
          Generation Mode
        </p>
        <div className="flex gap-2">
          {(["user", "agent"] as DiagramMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 border",
                mode === m
                  ? m === "agent"
                    ? "bg-[#7c3aed20] border-[#7c3aed50] text-[#a78bfa]"
                    : "bg-[#00d4ff15] border-[#00d4ff40] text-[#00d4ff]"
                  : "bg-transparent border-[#1e1e2e] text-[#55556a] hover:border-[#2a2a40] hover:text-[#8888aa]",
              )}
            >
              {m === "agent" ? <Bot size={13} /> : <User size={13} />}
              {m === "user" ? "User" : "Agent"}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#3a3a50] mt-2 leading-relaxed">
          {mode === "agent"
            ? "AI adds smart nodes, error flows & best practices automatically"
            : "Generates exactly what you describe — precise and literal"}
        </p>
        </div>
      )}

      {/* Prompt Input */}
      {activeTab === "prompt" && (
        <div className="px-5 py-4 border-b border-[#1e1e2e]">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "agent"
                ? "Describe a system or process..."
                : "Describe nodes and connections..."
            }
            rows={4}
            disabled={isGenerating}
            className={cn(
              "w-full resize-none rounded-xl px-4 py-3 pr-12 text-[13px]",
              "bg-[#16161f] border border-[#1e1e2e] text-[#e2e2f0]",
              "placeholder:text-[#3a3a50] font-mono leading-relaxed",
              "focus:outline-none focus:border-[#00d4ff40] transition-colors duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className={cn(
              "absolute bottom-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center",
              "transition-all duration-200",
              prompt.trim() && !isGenerating
                ? "bg-[#00d4ff] text-[#0a0a0f] hover:bg-[#00bbee] shadow-[0_0_12px_rgba(0,212,255,0.3)]"
                : "bg-[#1e1e2e] text-[#3a3a50] cursor-not-allowed",
            )}
          >
            {isGenerating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-[#2a2a40] mt-2 font-mono">
          Ctrl/⌘ + Enter to generate
          {currentDiagram.nodes.length > 0 && (
            <span className="ml-2 text-[#7c3aed]">
              · will update existing diagram
            </span>
          )}
        </p>
        </div>
      )}

      {/* Code editor */}
      {activeTab === "code" && (
        <div className="px-5 py-4 border-b border-[#1e1e2e]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#55556a]">
              Diagram JSON
            </p>
            <button
              onClick={handleApplyCode}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#00d4ff] text-[#0a0a0f] hover:bg-[#00bbee] transition-colors"
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
              "w-full resize-none rounded-xl px-4 py-3 text-[12px]",
              "bg-[#0f0f16] border border-[#1e1e2e] text-[#e2e2f0]",
              "placeholder:text-[#3a3a50] font-mono leading-relaxed",
              "focus:outline-none focus:border-[#00d4ff40] transition-colors duration-200",
            )}
          />
          {codeError && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-[#3d1515] border border-[#5a1f1f]">
              <p className="text-[11px] text-[#f87171] font-mono">{codeError}</p>
            </div>
          )}
        </div>
      )}

      {/* Generating indicator */}
      {isGenerating && (
        <div className="mx-5 my-3 px-4 py-3 rounded-xl bg-[#00d4ff08] border border-[#00d4ff20] animate-fade-in">
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
            <span className="text-[11px] text-[#00d4ff] font-mono">
              Generating...
            </span>
          </div>
        </div>
      )}

      {/* AI Explanation */}
      {explanation && !isGenerating && (
        <div className="mx-5 my-3 px-4 py-3 rounded-xl bg-[#16161f] border border-[#1e1e2e] animate-slide-up">
          <p className="text-[10px] uppercase tracking-widest text-[#55556a] font-mono mb-1.5">
            AI Explanation
          </p>
          <p className="text-[12px] text-[#8888aa] leading-relaxed">
            {explanation}
          </p>
        </div>
      )}

      {/* Example prompts */}
      {activeTab === "prompt" && (
        <div className="px-5 py-4 border-b border-[#1e1e2e]">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[#55556a] mb-2.5">
          Examples
        </p>
        <div className="flex flex-col gap-1.5">
          {EXAMPLE_PROMPTS[mode].map((ex, i) => (
            <button
              key={i}
              onClick={() => insertExample(ex)}
              className="
                text-left text-[11px] text-[#55556a] px-3 py-2 rounded-lg
                bg-[#16161f] border border-transparent
                hover:border-[#1e1e2e] hover:text-[#8888aa]
                transition-all duration-150 flex items-center gap-2 group
              "
            >
              <ChevronRight
                size={10}
                className="flex-shrink-0 text-[#3a3a50] group-hover:text-[#00d4ff] transition-colors"
              />
              <span className="truncate">{ex}</span>
            </button>
          ))}
        </div>
        </div>
      )}

      {/* History */}
      <div className="flex-1 overflow-y-auto">
        {history.length > 0 && (
          <div className="px-5 py-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#55556a] mb-3 hover:text-[#8888aa] transition-colors w-full"
            >
              <Clock size={10} />
              History ({history.length})
              <ChevronRight
                size={10}
                className={cn(
                  "ml-auto transition-transform",
                  showHistory && "rotate-90",
                )}
              />
            </button>
            {showHistory && (
              <div className="flex flex-col gap-2 animate-fade-in">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onRestoreHistory(item)}
                    className="
                      text-left px-3 py-2.5 rounded-lg
                      bg-[#16161f] border border-[#1e1e2e]
                      hover:border-[#2a2a40] transition-all group
                    "
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] text-[#8888aa] truncate group-hover:text-[#e2e2f0] transition-colors">
                        {item.prompt}
                      </p>
                      <RotateCcw
                        size={10}
                        className="flex-shrink-0 text-[#3a3a50] group-hover:text-[#00d4ff] mt-0.5"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono text-[#3a3a50]">
                        {formatTimestamp(item.timestamp)}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-mono px-1.5 py-0.5 rounded",
                          item.mode === "agent"
                            ? "bg-[#7c3aed15] text-[#7c3aed]"
                            : "bg-[#00d4ff10] text-[#00d4ff]",
                        )}
                      >
                        {item.mode}
                      </span>
                      <span className="text-[9px] font-mono text-[#2a2a40]">
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

      {/* Footer warning */}
      <div className="px-5 py-3 border-t border-[#1e1e2e]">
        <div className="flex items-start gap-2">
          <AlertCircle
            size={11}
            className="text-[#3a3a50] mt-0.5 flex-shrink-0"
          />
          <p className="text-[10px] text-[#3a3a50] leading-relaxed">
            Using Gemini free tier. May have rate limits. Backend integration
            pending.
          </p>
        </div>
      </div>
    </div>
  );
}
