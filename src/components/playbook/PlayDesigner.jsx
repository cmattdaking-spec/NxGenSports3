import { useRef, useState, useEffect, useCallback } from "react";
import {
  X, RotateCcw, Undo2, Save, Type, Minus, ArrowRight,
  Circle, Square, Pen, Move, MousePointer2, Trash2, Play,
  ChevronDown, Users, Flag
} from "lucide-react";
import { useTeamLanguage } from "@/components/playbook/useTeamLanguage";

// ─── Game Format Configs ──────────────────────────────────────────────────────
const GAME_FORMATS = [
  { id: "11man",   label: "11-Man",    players: 11, hasHashes: true,  hashRatio: 0.28, endzoneYards: 10 },
  { id: "12man",   label: "12-Man",    players: 12, hasHashes: true,  hashRatio: 0.28, endzoneYards: 10 },
  { id: "8man",    label: "8-Man",     players: 8,  hasHashes: false, hashRatio: 0,    endzoneYards: 10 },
  { id: "7on7",    label: "7-on-7",    players: 7,  hasHashes: false, hashRatio: 0,    endzoneYards: 10 },
  { id: "flag",    label: "Flag",      players: 5,  hasHashes: false, hashRatio: 0,    endzoneYards: 10 },
];

const PLAYER_TYPES = [
  { label: "QB",  color: "#f59e0b", type: "qb",      shape: "circle" },
  { label: "O",   color: "#3b82f6", type: "offense",  shape: "circle" },
  { label: "C",   color: "#6366f1", type: "center",   shape: "square" },
  { label: "X",   color: "#ef4444", type: "defense",  shape: "circle" },
  { label: "LB",  color: "#f97316", type: "lb",       shape: "circle" },
  { label: "DB",  color: "#ec4899", type: "db",       shape: "circle" },
  { label: "⚽",  color: "#10b981", type: "ball",     shape: "diamond" },
];

const TOOLS = [
  { id: "select",   icon: MousePointer2, label: "Select/Move" },
  { id: "place",    icon: Move,          label: "Place Player" },
  { id: "freehand", icon: Pen,           label: "Freehand Route" },
  { id: "arrow",    icon: ArrowRight,    label: "Arrow Route" },
  { id: "line",     icon: Minus,         label: "Straight Line" },
  { id: "rect",     icon: Square,        label: "Zone Box" },
  { id: "circle",   icon: Circle,        label: "Zone Circle" },
  { id: "text",     icon: Type,          label: "Text Label" },
];

const ROUTE_COLORS = ["#ff6b00","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899","#ffffff","#facc15"];
const LINE_WIDTHS = [1.5, 2.5, 4, 6];

const W = 800, H = 520;
// Field layout: endzone top, playing field, endzone bottom
const EZ_H = 52;   // endzone height in canvas px
const FIELD_H = H - 2 * EZ_H;
const LOS_Y = EZ_H + FIELD_H * 0.62; // line of scrimmage

function drawArrowHead(ctx, x1, y1, x2, y2, color, lw) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hs = Math.max(lw * 3.5, 10);
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hs * Math.cos(angle - 0.42), y2 - hs * Math.sin(angle - 0.42));
  ctx.lineTo(x2 - hs * Math.cos(angle + 0.42), y2 - hs * Math.sin(angle + 0.42));
  ctx.closePath();
  ctx.fill();
}

function drawField(ctx, format) {
  const fmt = GAME_FORMATS.find(f => f.id === format) || GAME_FORMATS[0];
  
  // ── Background ──
  ctx.fillStyle = "#1a5c1a";
  ctx.fillRect(0, 0, W, H);

  // ── Endzones ──
  const ezGrad1 = ctx.createLinearGradient(0, 0, 0, EZ_H);
  ezGrad1.addColorStop(0, "#0f3d0f");
  ezGrad1.addColorStop(1, "#1a5c1a");
  ctx.fillStyle = ezGrad1;
  ctx.fillRect(0, 0, W, EZ_H);

  const ezGrad2 = ctx.createLinearGradient(0, H - EZ_H, 0, H);
  ezGrad2.addColorStop(0, "#1a5c1a");
  ezGrad2.addColorStop(1, "#0f3d0f");
  ctx.fillStyle = ezGrad2;
  ctx.fillRect(0, H - EZ_H, W, EZ_H);

  // Alternating grass stripes
  const stripeCount = 10;
  const stripeH = FIELD_H / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(0, EZ_H + i * stripeH, W, stripeH);
    }
  }

  // ── Goal Lines ──
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, EZ_H); ctx.lineTo(W, EZ_H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H - EZ_H); ctx.lineTo(W, H - EZ_H); ctx.stroke();

  // ── Yard Lines (every 5 yards = FIELD_H/20 px) ──
  const yardSpacing = FIELD_H / 20; // 20 sections = 100 yards
  for (let yard = 1; yard <= 19; yard++) {
    const y = EZ_H + yard * yardSpacing;
    const isTenYard = yard % 2 === 0;
    ctx.strokeStyle = isTenYard ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)";
    ctx.lineWidth = isTenYard ? 1.5 : 0.8;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // ── Hash Marks (11-man & 12-man only) ──
  if (fmt.hasHashes) {
    const hashInset = W * fmt.hashRatio;   // left hash x
    const hashOutset = W * (1 - fmt.hashRatio); // right hash x
    const hashLen = 10;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.2;
    for (let yard = 1; yard <= 19; yard++) {
      const y = EZ_H + yard * yardSpacing;
      // Left hash
      ctx.beginPath(); ctx.moveTo(hashInset - hashLen/2, y); ctx.lineTo(hashInset + hashLen/2, y); ctx.stroke();
      // Right hash
      ctx.beginPath(); ctx.moveTo(hashOutset - hashLen/2, y); ctx.lineTo(hashOutset + hashLen/2, y); ctx.stroke();
    }
    // Mid-field hash tick marks (between 5yd lines)
    for (let yard = 0; yard <= 20; yard++) {
      const y = EZ_H + yard * yardSpacing;
      const tickLen = 5;
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(hashInset - tickLen/2, y); ctx.lineTo(hashInset + tickLen/2, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hashOutset - tickLen/2, y); ctx.lineTo(hashOutset + tickLen/2, y); ctx.stroke();
    }
  }

  // ── Sideline borders ──
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // ── Yard Numbers ──
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Numbers: 10, 20, 30, 40, 50, 40, 30, 20, 10 from top endzone down
  const yardLabels = [10, 20, 30, 40, 50, 40, 30, 20, 10];
  yardLabels.forEach((num, idx) => {
    const y = EZ_H + (idx * 2 + 2) * yardSpacing;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    // Left number
    ctx.save(); ctx.translate(22, y); ctx.fillText(num, 0, 0); ctx.restore();
    // Right number (rotated 180°)
    ctx.save(); ctx.translate(W - 22, y); ctx.rotate(Math.PI); ctx.fillText(num, 0, 0); ctx.restore();
  });

  // ── Endzone text ──
  ctx.save();
  ctx.font = "bold 18px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("END ZONE", W / 2, EZ_H / 2);
  ctx.fillText("END ZONE", W / 2, H - EZ_H / 2);
  ctx.restore();

  // ── 50 Yard Center Circle ──
  const midY = EZ_H + FIELD_H / 2;
  ctx.beginPath();
  ctx.arc(W / 2, midY, 28, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── LOS (Line of Scrimmage) ──
  ctx.strokeStyle = "rgba(255,220,0,0.75)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  ctx.beginPath(); ctx.moveTo(0, LOS_Y); ctx.lineTo(W, LOS_Y); ctx.stroke();
  ctx.setLineDash([]);

  // LOS label
  ctx.font = "bold 9px monospace";
  ctx.fillStyle = "rgba(255,220,0,0.7)";
  ctx.textAlign = "left";
  ctx.fillText("LOS", 4, LOS_Y - 4);
}

function renderElement(ctx, el, selectedId) {
  ctx.save();
  const c = el.color || "#ff6b00";
  const lw = el.lineWidth || 2.5;

  if (el.type === "player") {
    const r = 15;
    const isSelected = selectedId === el.id;

    // Glow for selected
    if (isSelected) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = el.pColor;
    }

    if (el.shape === "square") {
      // Center (square)
      ctx.fillStyle = el.pColor;
      ctx.fillRect(el.x - r, el.y - r, r * 2, r * 2);
      ctx.strokeStyle = isSelected ? "#fff" : "rgba(255,255,255,0.3)";
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeRect(el.x - r, el.y - r, r * 2, r * 2);
    } else if (el.shape === "diamond") {
      // Ball
      ctx.beginPath();
      ctx.moveTo(el.x, el.y - r);
      ctx.lineTo(el.x + r, el.y);
      ctx.lineTo(el.x, el.y + r);
      ctx.lineTo(el.x - r, el.y);
      ctx.closePath();
      ctx.fillStyle = el.pColor;
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#fff" : "rgba(255,255,255,0.3)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(el.x, el.y, r, 0, Math.PI * 2);
      ctx.fillStyle = el.pColor;
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#fff" : "rgba(255,255,255,0.3)";
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${el.label.length > 2 ? "9" : "11"}px monospace`;
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
    const last = el.points[el.points.length - 1];
    const prev = el.points[Math.max(0, el.points.length - 4)];
    drawArrowHead(ctx, prev.x, prev.y, last.x, last.y, c, lw);

  } else if (el.type === "line") {
    ctx.beginPath();
    ctx.strokeStyle = c; ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2);
    ctx.stroke();

  } else if (el.type === "arrow") {
    ctx.beginPath();
    ctx.strokeStyle = c; ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2);
    ctx.stroke();
    drawArrowHead(ctx, el.x1, el.y1, el.x2, el.y2, c, lw);

  } else if (el.type === "rect") {
    ctx.strokeStyle = c; ctx.lineWidth = lw;
    ctx.fillStyle = c + "22";
    ctx.fillRect(el.x, el.y, el.w, el.h);
    ctx.strokeRect(el.x, el.y, el.w, el.h);

  } else if (el.type === "circle") {
    ctx.beginPath();
    ctx.strokeStyle = c; ctx.lineWidth = lw;
    ctx.fillStyle = c + "22";
    ctx.ellipse(el.cx, el.cy, Math.abs(el.rx), Math.abs(el.ry), 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

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
}

// Animate play: draw routes sequentially
function animatePlay(canvas, elements, format, onDone) {
  const routes = elements.filter(e => ["freehand","arrow","line"].includes(e.type));
  const players = elements.filter(e => e.type === "player");
  const others = elements.filter(e => !["freehand","arrow","line","player"].includes(e.type));

  let routeIdx = 0;
  let progress = 0;
  const STEPS = 35;
  let raf;

  const step = () => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    drawField(ctx, format);
    others.forEach(e => renderElement(ctx, e, null));
    players.forEach(e => renderElement(ctx, e, null));

    // Draw completed routes
    for (let i = 0; i < routeIdx; i++) {
      renderElement(ctx, routes[i], null);
    }

    // Draw current route partially
    if (routeIdx < routes.length) {
      const cur = routes[routeIdx];
      const t = progress / STEPS;

      if (cur.type === "freehand" && cur.points?.length > 1) {
        const total = cur.points.length;
        const drawTo = Math.floor(t * total);
        const partial = { ...cur, points: cur.points.slice(0, Math.max(2, drawTo)) };
        renderElement(ctx, partial, null);
      } else if (cur.type === "arrow" || cur.type === "line") {
        const partial = {
          ...cur,
          x2: cur.x1 + (cur.x2 - cur.x1) * t,
          y2: cur.y1 + (cur.y2 - cur.y1) * t,
        };
        renderElement(ctx, partial, null);
      }

      progress++;
      if (progress > STEPS) { progress = 0; routeIdx++; }
      raf = requestAnimationFrame(step);
    } else {
      elements.forEach(e => renderElement(ctx, e, null));
      onDone?.();
    }
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export default function PlayDesigner({ onClose, onSave, initialData, playName }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("place");
  const [selectedType, setSelectedType] = useState(PLAYER_TYPES[0]);
  const [color, setColor] = useState("#ff6b00");
  const [lineWidth, setLineWidth] = useState(2.5);
  const [format, setFormat] = useState("11man");
  const [elements, setElements] = useState(initialData?.elements || []);
  const [history, setHistory] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentEl, setCurrentEl] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: "" });
  const [animating, setAnimating] = useState(false);
  const cancelAnim = useRef(null);

  const redraw = useCallback((els = elements, cur = currentEl, selId = selectedId) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    drawField(ctx, format);
    els.forEach(el => renderElement(ctx, el, selId));
    if (cur) renderElement(ctx, cur, null);
  }, [elements, currentEl, selectedId, format]);

  useEffect(() => { redraw(); }, [redraw]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return {
      x: (touch.clientX - rect.left) * (W / rect.width),
      y: (touch.clientY - rect.top) * (H / rect.height),
    };
  };

  const pushHistory = (els) => setHistory(h => [...h.slice(-40), els]);

  const onMouseDown = (e) => {
    if (animating) return;
    e.preventDefault();
    const pos = getPos(e);

    if (tool === "text") {
      setTextInput({ visible: true, x: pos.x, y: pos.y, value: "" });
      return;
    }

    if (tool === "select") {
      const hit = [...elements].reverse().find(el => {
        if (el.type === "player") return Math.hypot(el.x - pos.x, el.y - pos.y) < 18;
        if (el.type === "text") return pos.x >= el.x && pos.x <= el.x + 140 && pos.y >= el.y && pos.y <= el.y + 22;
        return false;
      });
      if (hit) { setDraggingId(hit.id); setSelectedId(hit.id); }
      else setSelectedId(null);
      return;
    }

    if (tool === "place") {
      pushHistory(elements);
      const el = {
        id: Date.now(), type: "player",
        x: pos.x, y: pos.y,
        label: selectedType.label,
        pColor: selectedType.color,
        shape: selectedType.shape,
      };
      setElements(prev => [...prev, el]);
      return;
    }

    setDrawing(true);
    setStartPos(pos);
    if (tool === "freehand") setCurrentEl({ id: Date.now(), type: "freehand", points: [pos], color, lineWidth });
    else if (tool === "line") setCurrentEl({ id: Date.now(), type: "line", x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, color, lineWidth });
    else if (tool === "arrow") setCurrentEl({ id: Date.now(), type: "arrow", x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, color, lineWidth });
    else if (tool === "rect") setCurrentEl({ id: Date.now(), type: "rect", x: pos.x, y: pos.y, w: 0, h: 0, color, lineWidth });
    else if (tool === "circle") setCurrentEl({ id: Date.now(), type: "circle", cx: pos.x, cy: pos.y, rx: 0, ry: 0, color, lineWidth });
  };

  const onMouseMove = (e) => {
    if (animating) return;
    const pos = getPos(e);
    if (tool === "select" && draggingId) {
      setElements(prev => prev.map(el =>
        el.id === draggingId
          ? el.type === "player" || el.type === "text" ? { ...el, x: pos.x, y: pos.y } : el
          : el
      ));
      return;
    }
    if (!drawing || !currentEl) return;
    if (tool === "freehand") setCurrentEl(prev => ({ ...prev, points: [...prev.points, pos] }));
    else if (tool === "line" || tool === "arrow") setCurrentEl(prev => ({ ...prev, x2: pos.x, y2: pos.y }));
    else if (tool === "rect" && startPos) setCurrentEl(prev => ({ ...prev, w: pos.x - startPos.x, h: pos.y - startPos.y }));
    else if (tool === "circle" && startPos) setCurrentEl(prev => ({ ...prev, rx: Math.abs(pos.x - startPos.x) / 2, ry: Math.abs(pos.y - startPos.y) / 2, cx: (startPos.x + pos.x) / 2, cy: (startPos.y + pos.y) / 2 }));
  };

  const onMouseUp = () => {
    if (animating) return;
    if (draggingId) { setDraggingId(null); return; }
    if (!drawing || !currentEl) return;
    pushHistory(elements);
    setElements(prev => [...prev, currentEl]);
    setCurrentEl(null); setDrawing(false); setStartPos(null);
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

  const runAnimation = () => {
    if (animating) {
      cancelAnim.current?.();
      setAnimating(false);
      redraw();
      return;
    }
    setAnimating(true);
    cancelAnim.current = animatePlay(canvasRef.current, elements, format, () => setAnimating(false));
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    onSave?.({ dataUrl, elements, format });
    onClose?.();
  };

  const canvasContainerRef = useRef(null);
  const getTextInputPos = () => {
    const canvas = canvasRef.current;
    if (!canvas) return { left: 0, top: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      left: rect.left + (textInput.x / W) * rect.width,
      top: rect.top + (textInput.y / H) * rect.height,
    };
  };

  const fmt = GAME_FORMATS.find(f => f.id === format) || GAME_FORMATS[0];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2">
      <div className="bg-[#111] border border-gray-700 rounded-2xl w-full flex flex-col shadow-2xl" style={{ maxWidth: 980, maxHeight: "97vh" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Flag className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm leading-none">Play Designer</h2>
              {playName && <p className="text-gray-500 text-xs mt-0.5">{playName}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Game Format */}
            <div className="relative">
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="bg-[#1e1e1e] border border-gray-700 text-gray-300 text-xs px-2 py-1.5 rounded-lg outline-none appearance-none pr-6 cursor-pointer hover:border-orange-500 transition-colors"
              >
                {GAME_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 text-gray-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button onClick={runAnimation} title={animating ? "Stop" : "Animate Play"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${animating ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"}`}>
              <Play className="w-3.5 h-3.5" />
              {animating ? "Stop" : "Preview"}
            </button>

            <button onClick={undo} title="Undo" disabled={!history.length}
              className="text-gray-400 hover:text-white disabled:opacity-30 p-1.5 rounded-lg hover:bg-gray-800 transition-all">
              <Undo2 className="w-4 h-4" />
            </button>
            {selectedId && (
              <button onClick={deleteSelected} title="Delete selected"
                className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={clearAll} title="Clear all"
              className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition-all">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-lg">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Left Toolbar ── */}
          <div className="w-14 flex flex-col items-center gap-1 py-2 border-r border-gray-800 bg-[#0d0d0d] flex-shrink-0 overflow-y-auto">
            <p className="text-gray-600 text-[9px] uppercase tracking-wider mb-1">Tools</p>
            {TOOLS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${tool === t.id ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}>
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}

            <div className="border-t border-gray-800 w-9 my-1.5" />
            <p className="text-gray-600 text-[9px] uppercase tracking-wider mb-1">Color</p>
            {ROUTE_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${color === c ? "border-white scale-110" : "border-transparent opacity-70"}`}
                style={{ background: c }} />
            ))}

            <div className="border-t border-gray-800 w-9 my-1.5" />
            <p className="text-gray-600 text-[9px] uppercase tracking-wider mb-1">Width</p>
            {LINE_WIDTHS.map(lw => (
              <button key={lw} onClick={() => setLineWidth(lw)}
                className={`w-10 h-7 flex items-center justify-center rounded-lg transition-all ${lineWidth === lw ? "bg-orange-500/25 border border-orange-500/50" : "hover:bg-gray-800"}`}>
                <div className="rounded-full bg-white" style={{ width: 22, height: lw }} />
              </button>
            ))}
          </div>

          {/* ── Canvas Column ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Player type bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-[#0f0f0f] flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5 mr-1">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-500 text-xs">Players:</span>
              </div>
              {PLAYER_TYPES.map(t => (
                <button key={t.type} onClick={() => { setSelectedType(t); setTool("place"); }}
                  title={t.label}
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-white text-xs font-bold transition-all border-2 ${selectedType.type === t.type && tool === "place" ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-90 hover:scale-105"}`}
                  style={{ background: t.color }}>
                  {t.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1 text-gray-600 text-xs">
                <span className="hidden md:inline">{fmt.label} · {fmt.players} players</span>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-2 bg-[#0a0a0a] overflow-hidden flex items-center justify-center" ref={canvasContainerRef}>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="rounded-lg shadow-2xl"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  cursor: tool === "select" ? "default" : tool === "text" ? "text" : "crosshair",
                  touchAction: "none",
                  transition: "box-shadow 0.2s",
                  boxShadow: animating ? "0 0 0 2px #22c55e66" : undefined,
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onTouchStart={onMouseDown}
                onTouchMove={onMouseMove}
                onTouchEnd={onMouseUp}
              />

              {textInput.visible && (() => {
                const { left, top } = getTextInputPos();
                return (
                  <div className="fixed z-[70]" style={{ left, top }}>
                    <input
                      autoFocus
                      value={textInput.value}
                      onChange={e => setTextInput(p => ({ ...p, value: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") commitText(); if (e.key === "Escape") setTextInput({ visible: false }); }}
                      onBlur={commitText}
                      placeholder="Type label..."
                      className="bg-[#111] border border-orange-500 text-white px-2 py-1 text-sm rounded-lg outline-none shadow-xl"
                      style={{ color, minWidth: 130 }}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Footer legend */}
            <div className="px-3 py-1.5 border-t border-gray-800 flex flex-wrap gap-x-4 gap-y-1 text-gray-600 text-xs flex-shrink-0">
              <span>🟦 O = Offense</span>
              <span>🟥 X = Defense</span>
              <span>🟩 ⚽ = Ball</span>
              <span>⬛ C = Center</span>
              <span className="ml-auto text-gray-700">Click player to select · Delete to remove</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}