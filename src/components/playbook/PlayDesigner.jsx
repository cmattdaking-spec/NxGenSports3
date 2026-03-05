import { useRef, useState, useEffect, useCallback } from "react";
import {
  X, RotateCcw, Undo2, Save, Type, Minus, ArrowRight,
  Circle, Square, Pen, Move, MousePointer2, Trash2
} from "lucide-react";

const PLAYER_TYPES = [
  { label: "O", color: "#3b82f6", type: "offense" },
  { label: "X", color: "#ef4444", type: "defense" },
  { label: "B", color: "#10b981", type: "ball" },
  { label: "Q", color: "#f59e0b", type: "qb" },
  { label: "K", color: "#8b5cf6", type: "kicker" },
];

const TOOLS = [
  { id: "select", icon: MousePointer2, label: "Select / Move" },
  { id: "place", icon: Move, label: "Place Player" },
  { id: "freehand", icon: Pen, label: "Freehand Route" },
  { id: "line", icon: Minus, label: "Straight Line" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Ellipse" },
  { id: "text", icon: Type, label: "Text Label" },
];

const COLORS = ["#ff6b00", "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#ffffff", "#facc15", "#ec4899"];
const LINE_WIDTHS = [1.5, 2.5, 4, 6];

const W = 700, H = 460;

function drawArrow(ctx, x1, y1, x2, y2, color, lw) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hs = lw * 3 + 6;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hs * Math.cos(angle - 0.4), y2 - hs * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - hs * Math.cos(angle + 0.4), y2 - hs * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}

export default function PlayDesigner({ onClose, onSave, initialData }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("place");
  const [selectedType, setSelectedType] = useState(PLAYER_TYPES[0]);
  const [color, setColor] = useState("#ff6b00");
  const [lineWidth, setLineWidth] = useState(2.5);
  const [elements, setElements] = useState(initialData?.elements || []);
  const [history, setHistory] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentEl, setCurrentEl] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: "" });

  const redraw = useCallback((els = elements, cur = currentEl) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // Field
    ctx.fillStyle = "#1a4a1a";
    ctx.fillRect(0, 0, W, H);

    // Yard lines
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (W / 10) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // LOS
    ctx.strokeStyle = "rgba(255,220,0,0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.beginPath(); ctx.moveTo(0, H * 0.6); ctx.lineTo(W, H * 0.6); ctx.stroke();
    ctx.setLineDash([]);

    const renderEl = (el) => {
      ctx.save();
      const c = el.color || "#ff6b00";
      const lw = el.lineWidth || 2.5;

      if (el.type === "player") {
        ctx.beginPath();
        ctx.arc(el.x, el.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = el.pColor;
        ctx.fill();
        ctx.strokeStyle = selectedId === el.id ? "#fff" : "rgba(255,255,255,0.25)";
        ctx.lineWidth = selectedId === el.id ? 2.5 : 1.5;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.label, el.x, el.y);
      } else if (el.type === "freehand" && el.points?.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = c; ctx.lineWidth = lw;
        ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.moveTo(el.points[0].x, el.points[0].y);
        el.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        // arrow tip
        const last = el.points[el.points.length - 1];
        const prev = el.points[el.points.length - 2];
        const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
        const hs = lw * 3 + 5;
        ctx.beginPath();
        ctx.fillStyle = c;
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(last.x - hs * Math.cos(angle - 0.4), last.y - hs * Math.sin(angle - 0.4));
        ctx.lineTo(last.x - hs * Math.cos(angle + 0.4), last.y - hs * Math.sin(angle + 0.4));
        ctx.closePath(); ctx.fill();
      } else if (el.type === "line") {
        ctx.beginPath();
        ctx.strokeStyle = c; ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
      } else if (el.type === "arrow") {
        drawArrow(ctx, el.x1, el.y1, el.x2, el.y2, c, lw);
      } else if (el.type === "rect") {
        ctx.strokeStyle = c; ctx.lineWidth = lw;
        ctx.strokeRect(el.x, el.y, el.w, el.h);
      } else if (el.type === "circle") {
        ctx.beginPath();
        ctx.strokeStyle = c; ctx.lineWidth = lw;
        ctx.ellipse(el.cx, el.cy, Math.abs(el.rx), Math.abs(el.ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === "text") {
        ctx.fillStyle = c;
        ctx.font = `bold ${el.fontSize || 16}px sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(el.text, el.x, el.y);
        if (selectedId === el.id) {
          const m = ctx.measureText(el.text);
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 2]);
          ctx.strokeRect(el.x - 2, el.y - 2, m.width + 4, (el.fontSize || 16) + 4);
          ctx.setLineDash([]);
        }
      }
      ctx.restore();
    };

    els.forEach(renderEl);
    if (cur) renderEl(cur);
  }, [elements, currentEl, selectedId]);

  useEffect(() => { redraw(); }, [redraw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return {
      x: (touch.clientX - rect.left) * (W / rect.width),
      y: (touch.clientY - rect.top) * (H / rect.height),
    };
  };

  const pushHistory = (els) => setHistory(h => [...h.slice(-30), els]);

  const onMouseDown = (e) => {
    const pos = getPos(e);

    if (tool === "text") {
      setTextInput({ visible: true, x: pos.x, y: pos.y, value: "" });
      return;
    }

    if (tool === "select") {
      // find topmost element
      const hit = [...elements].reverse().find(el => {
        if (el.type === "player") return Math.hypot(el.x - pos.x, el.y - pos.y) < 16;
        if (el.type === "text") return pos.x >= el.x && pos.x <= el.x + 120 && pos.y >= el.y && pos.y <= el.y + 20;
        return false;
      });
      if (hit) { setDraggingId(hit.id); setSelectedId(hit.id); }
      else setSelectedId(null);
      return;
    }

    if (tool === "place") {
      pushHistory(elements);
      const el = { id: Date.now(), type: "player", x: pos.x, y: pos.y, label: selectedType.label, pColor: selectedType.color };
      setElements(prev => [...prev, el]);
      return;
    }

    setDrawing(true);
    setStartPos(pos);

    if (tool === "freehand") {
      setCurrentEl({ id: Date.now(), type: "freehand", points: [pos], color, lineWidth });
    } else if (tool === "line") {
      setCurrentEl({ id: Date.now(), type: "line", x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, color, lineWidth });
    } else if (tool === "arrow") {
      setCurrentEl({ id: Date.now(), type: "arrow", x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, color, lineWidth });
    } else if (tool === "rect") {
      setCurrentEl({ id: Date.now(), type: "rect", x: pos.x, y: pos.y, w: 0, h: 0, color, lineWidth });
    } else if (tool === "circle") {
      setCurrentEl({ id: Date.now(), type: "circle", cx: pos.x, cy: pos.y, rx: 0, ry: 0, color, lineWidth });
    }
  };

  const onMouseMove = (e) => {
    const pos = getPos(e);

    if (tool === "select" && draggingId) {
      setElements(prev => prev.map(el =>
        el.id === draggingId
          ? (el.type === "player" ? { ...el, x: pos.x, y: pos.y }
            : el.type === "text" ? { ...el, x: pos.x, y: pos.y }
              : el)
          : el
      ));
      return;
    }

    if (!drawing || !currentEl) return;

    if (tool === "freehand") {
      setCurrentEl(prev => ({ ...prev, points: [...prev.points, pos] }));
    } else if (tool === "line" || tool === "arrow") {
      setCurrentEl(prev => ({ ...prev, x2: pos.x, y2: pos.y }));
    } else if (tool === "rect" && startPos) {
      setCurrentEl(prev => ({ ...prev, w: pos.x - startPos.x, h: pos.y - startPos.y }));
    } else if (tool === "circle" && startPos) {
      setCurrentEl(prev => ({ ...prev, rx: (pos.x - startPos.x) / 2, ry: (pos.y - startPos.y) / 2, cx: (startPos.x + pos.x) / 2, cy: (startPos.y + pos.y) / 2 }));
    }
  };

  const onMouseUp = () => {
    if (draggingId) { setDraggingId(null); return; }
    if (!drawing || !currentEl) return;
    pushHistory(elements);
    setElements(prev => [...prev, currentEl]);
    setCurrentEl(null);
    setDrawing(false);
    setStartPos(null);
  };

  const commitText = () => {
    if (textInput.value.trim()) {
      pushHistory(elements);
      setElements(prev => [...prev, { id: Date.now(), type: "text", x: textInput.x, y: textInput.y, text: textInput.value.trim(), color, fontSize: 16 }]);
    }
    setTextInput({ visible: false, x: 0, y: 0, value: "" });
  };

  const undo = () => {
    if (!history.length) return;
    setElements(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory(elements);
    setElements(prev => prev.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  const clearAll = () => { pushHistory(elements); setElements([]); setSelectedId(null); };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    onSave?.({ dataUrl, elements });
    onClose?.();
  };

  const canvasPos = (el) => {
    const canvas = canvasRef.current;
    if (!canvas) return { left: 0, top: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      left: rect.left + (textInput.x / W) * rect.width,
      top: rect.top + (textInput.y / H) * rect.height,
    };
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-2 md:p-4">
      <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-4xl flex flex-col" style={{ maxHeight: "96vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-white font-bold text-sm">Play Designer</h2>
          <div className="flex items-center gap-2">
            <button onClick={undo} title="Undo" disabled={!history.length}
              className="text-gray-400 hover:text-white disabled:opacity-30 p-1.5 rounded hover:bg-gray-800">
              <Undo2 className="w-4 h-4" />
            </button>
            {selectedId && (
              <button onClick={deleteSelected} title="Delete selected"
                className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-gray-800">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={clearAll} title="Clear all"
              className="text-gray-400 hover:text-red-400 p-1.5 rounded hover:bg-gray-800">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-12 flex flex-col items-center gap-1 py-3 border-r border-gray-800 bg-[#0f0f0f] flex-shrink-0">
            {TOOLS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${tool === t.id ? "bg-orange-500 text-white" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}>
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}

            <div className="border-t border-gray-800 w-8 my-1" />

            {/* Color swatches */}
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} title={c}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`}
                style={{ background: c }} />
            ))}

            <div className="border-t border-gray-800 w-8 my-1" />

            {/* Line widths */}
            {LINE_WIDTHS.map(lw => (
              <button key={lw} onClick={() => setLineWidth(lw)} title={`${lw}px`}
                className={`w-9 h-6 flex items-center justify-center rounded transition-all ${lineWidth === lw ? "bg-orange-500/30" : "hover:bg-gray-800"}`}>
                <div className="rounded-full bg-white" style={{ width: 20, height: lw }} />
              </button>
            ))}
          </div>

          {/* Canvas area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Player type bar (only when place tool active) */}
            {tool === "place" && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-[#111]">
                <span className="text-gray-500 text-xs">Player:</span>
                {PLAYER_TYPES.map(t => (
                  <button key={t.type} onClick={() => setSelectedType(t)}
                    className={`w-8 h-8 rounded-full text-white text-xs font-bold border-2 transition-all ${selectedType.type === t.type ? "border-white scale-110" : "border-transparent opacity-60"}`}
                    style={{ background: t.pColor || t.color }}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 p-2">
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="w-full h-full rounded-lg"
                style={{ cursor: tool === "select" ? "default" : tool === "text" ? "text" : "crosshair", touchAction: "none" }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onTouchStart={onMouseDown}
                onTouchMove={onMouseMove}
                onTouchEnd={onMouseUp}
              />

              {/* Floating text input */}
              {textInput.visible && (() => {
                const { left, top } = canvasPos();
                return (
                  <div className="fixed z-[60]" style={{ left, top }}>
                    <input
                      autoFocus
                      value={textInput.value}
                      onChange={e => setTextInput(p => ({ ...p, value: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") commitText(); if (e.key === "Escape") setTextInput({ visible: false }); }}
                      onBlur={commitText}
                      placeholder="Type text..."
                      className="bg-[#111] border border-orange-500 text-white px-2 py-1 text-sm rounded outline-none shadow-lg"
                      style={{ color, minWidth: 120 }}
                    />
                  </div>
                );
              })()}
            </div>

            <div className="px-3 pb-2 text-gray-700 text-xs flex gap-4">
              <span>O = Offense</span><span>X = Defense</span><span>B = Ball</span>
              <span className="ml-auto">Click element + Delete icon to remove</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}