"use client";

import { DiagramNodeData } from "@/lib/types";
import { memo, useCallback, useState } from "react";
import { Handle, NodeProps, Position } from "reactflow";

// ── Shape renderers ────────────────────────────────────────────────────────────

function RectShape({ color, selected, children }: ShapeProps) {
  return (
    <div
      style={{
        border: `2px solid ${selected ? color : color + "60"}`,
        boxShadow: selected
          ? `0 0 0 1px ${color}40, 0 0 20px ${color}20`
          : "0 4px 24px rgba(0,0,0,0.4)",
        background: `${color}10`,
      }}
      className="relative w-full h-full rounded-xl flex items-center justify-center transition-all duration-200"
    >
      {children}
    </div>
  );
}

function RoundedShape({ color, selected, children }: ShapeProps) {
  return (
    <div
      style={{
        border: `2px solid ${selected ? color : color + "60"}`,
        boxShadow: selected
          ? `0 0 0 1px ${color}40, 0 0 20px ${color}20`
          : "0 4px 24px rgba(0,0,0,0.4)",
        background: `${color}10`,
        borderRadius: "999px",
      }}
      className="relative w-full h-full flex items-center justify-center transition-all duration-200"
    >
      {children}
    </div>
  );
}

function DiamondShape({
  color,
  selected,
  children,
  width,
  height,
}: ShapeProps) {
  const w = width ?? 140;
  const h = height ?? 80;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: w, height: h }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <polygon
          points={`${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`}
          fill={`${color}15`}
          stroke={selected ? color : color + "60"}
          strokeWidth="2"
          style={{
            filter: selected ? `drop-shadow(0 0 8px ${color}40)` : "none",
          }}
        />
      </svg>
      <div className="relative z-10 px-6">{children}</div>
    </div>
  );
}

function CylinderShape({
  color,
  selected,
  children,
  width,
  height,
}: ShapeProps) {
  const w = width ?? 140;
  const h = height ?? 90;
  const rx = w / 2;
  const ry = 12;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: w, height: h }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        {/* body */}
        <rect
          x="2"
          y={ry}
          width={w - 4}
          height={h - ry - 2}
          fill={`${color}10`}
          stroke={selected ? color : color + "60"}
          strokeWidth="2"
        />
        {/* top ellipse */}
        <ellipse
          cx={rx}
          cy={ry}
          rx={rx - 2}
          ry={ry}
          fill={`${color}20`}
          stroke={selected ? color : color + "60"}
          strokeWidth="2"
          style={{
            filter: selected ? `drop-shadow(0 0 6px ${color}40)` : "none",
          }}
        />
        {/* bottom ellipse (just arc) */}
        <ellipse
          cx={rx}
          cy={h - 2}
          rx={rx - 2}
          ry={ry}
          fill={`${color}08`}
          stroke={selected ? color : color + "40"}
          strokeWidth="1.5"
        />
      </svg>
      <div className="relative z-10 mt-3 px-4">{children}</div>
    </div>
  );
}

function HexagonShape({
  color,
  selected,
  children,
  width,
  height,
}: ShapeProps) {
  const w = width ?? 150;
  const h = height ?? 80;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 2;
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: w, height: h }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <polygon
          points={points}
          fill={`${color}12`}
          stroke={selected ? color : color + "60"}
          strokeWidth="2"
          style={{
            filter: selected ? `drop-shadow(0 0 8px ${color}40)` : "none",
          }}
        />
      </svg>
      <div className="relative z-10 px-6">{children}</div>
    </div>
  );
}

function ParallelogramShape({
  color,
  selected,
  children,
  width,
  height,
}: ShapeProps) {
  const w = width ?? 160;
  const h = height ?? 70;
  const skew = 20;
  const points = `${skew},2 ${w - 2},2 ${w - skew - 2},${h - 2} 2,${h - 2}`;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: w, height: h }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <polygon
          points={points}
          fill={`${color}12`}
          stroke={selected ? color : color + "60"}
          strokeWidth="2"
          style={{
            filter: selected ? `drop-shadow(0 0 8px ${color}40)` : "none",
          }}
        />
      </svg>
      <div className="relative z-10 px-8">{children}</div>
    </div>
  );
}

function CircleShape({ color, selected, children, width, height }: ShapeProps) {
  const size = Math.min(width ?? 110, height ?? 110);
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill={`${color}12`}
          stroke={selected ? color : color + "60"}
          strokeWidth="2"
          style={{
            filter: selected ? `drop-shadow(0 0 10px ${color}50)` : "none",
          }}
        />
      </svg>
      <div className="relative z-10 px-3 text-center">{children}</div>
    </div>
  );
}

function TerminatorShape({
  color,
  selected,
  children,
  width,
  height,
}: ShapeProps) {
  const w = width ?? 150;
  const h = height ?? 60;
  const r = h / 2;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: w, height: h }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <rect
          x="2"
          y="2"
          width={w - 4}
          height={h - 4}
          rx={r}
          ry={r}
          fill={`${color}12`}
          stroke={selected ? color : color + "60"}
          strokeWidth="2"
          style={{
            filter: selected ? `drop-shadow(0 0 8px ${color}40)` : "none",
          }}
        />
      </svg>
      <div className="relative z-10 px-6">{children}</div>
    </div>
  );
}

function DocumentShape({
  color,
  selected,
  children,
  width,
  height,
}: ShapeProps) {
  const w = width ?? 160;
  const h = height ?? 80;
  const wave = 12;
  const d = `M2,2 H${w - 2} V${h - wave} Q${w * 0.75},${h + wave} ${w / 2},${h - wave} Q${w * 0.25},${h - wave * 3} 2,${h - wave} Z`;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: w, height: h }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <path
          d={d}
          fill={`${color}12`}
          stroke={selected ? color : color + "60"}
          strokeWidth="2"
          style={{
            filter: selected ? `drop-shadow(0 0 8px ${color}40)` : "none",
          }}
        />
      </svg>
      <div className="relative z-10 px-5 -mt-2">{children}</div>
    </div>
  );
}

// ── Shape type map ─────────────────────────────────────────────────────────────

export type ShapeType =
  | "rectangle"
  | "rounded"
  | "diamond"
  | "cylinder"
  | "hexagon"
  | "parallelogram"
  | "circle"
  | "terminator"
  | "document"
  | "process"
  | "start"
  | "end"
  | "decision"
  | "database"
  | "api"
  | "user"
  | "service"
  | "default";

type ShapeProps = {
  color: string;
  selected: boolean;
  children: React.ReactNode;
  width?: number;
  height?: number;
};

// Map node data.type → shape component
const SHAPE_MAP: Record<string, (props: ShapeProps) => React.ReactElement> = {
  rectangle: RectShape,
  process: RectShape,
  service: RectShape,
  default: RectShape,
  rounded: RoundedShape,
  diamond: DiamondShape,
  decision: DiamondShape,
  cylinder: CylinderShape,
  database: CylinderShape,
  hexagon: HexagonShape,
  api: HexagonShape,
  parallelogram: ParallelogramShape,
  circle: CircleShape,
  user: CircleShape,
  terminator: TerminatorShape,
  start: TerminatorShape,
  end: TerminatorShape,
  document: DocumentShape,
};

const NODE_ICONS: Record<string, string> = {
  start: "▶",
  end: "■",
  process: "▣",
  rectangle: "▣",
  decision: "◆",
  diamond: "◆",
  database: "⬡",
  cylinder: "⬡",
  api: "⬢",
  hexagon: "⬢",
  user: "◯",
  circle: "◯",
  service: "▤",
  terminator: "⬭",
  document: "≡",
  parallelogram: "▱",
  rounded: "▢",
  default: "▪",
};

// ── Main Node component ────────────────────────────────────────────────────────

function CustomNodeComponent({
  id,
  data,
  selected,
}: NodeProps<DiagramNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);

  const { label, description, onUpdate } = data;
  const accentColor = data.color || "#00d4ff";
  const shapeType = data.type || "rectangle";
  const ShapeComponent = SHAPE_MAP[shapeType] || RectShape;
  const icon = NODE_ICONS[shapeType] || "▪";

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditValue(label);
  }, [label]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== label) {
      onUpdate?.(id, { label: editValue.trim() });
    }
  }, [editValue, label, id, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleBlur();
      if (e.key === "Escape") {
        setIsEditing(false);
        setEditValue(label);
      }
    },
    [handleBlur, label],
  );

  const innerContent = (
    <div
      className="flex flex-col items-center justify-center gap-1 select-none"
      onDoubleClick={handleDoubleClick}
    >
      <span style={{ color: accentColor }} className="text-sm leading-none">
        {icon}
      </span>
      {isEditing ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-center text-[12px] font-semibold bg-transparent border border-[#2a2a40] rounded-md px-2 py-1 outline-none focus:border-[#00d4ff40]"
          style={{ color: "#e2e2f0", maxWidth: 140 }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-[12px] font-semibold text-[#e2e2f0] text-center leading-tight px-1 max-w-[140px] break-words">
          {label}
        </span>
      )}
      {description && !isEditing && (
        <span className="text-[9px] text-[#55556a] text-center leading-tight max-w-[140px] truncate">
          {description}
        </span>
      )}
    </div>
  );

  return (
    <div className="relative group cursor-pointer" style={{ minWidth: 80 }}>
      {/* All 4 handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ borderColor: accentColor, background: "#111118", zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ borderColor: accentColor, background: "#111118", zIndex: 10 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ borderColor: accentColor, background: "#111118", zIndex: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ borderColor: accentColor, background: "#111118", zIndex: 10 }}
      />

      <ShapeComponent color={accentColor} selected={!!selected}>
        {innerContent}
      </ShapeComponent>

      {/* Double-click hint on hover */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="text-[9px] text-[#3a3a50] font-mono whitespace-nowrap">
          double-click to edit
        </span>
      </div>
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);

export const nodeTypes = {
  custom: CustomNode,
};
