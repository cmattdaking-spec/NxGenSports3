import { useRef, useState, useEffect, useCallback } from "react";
import { Pencil, Square, Circle, ArrowRight, Type, Trash2, Undo2, Download, Palette } from "lucide-react";

const TOOLS = [
  { id: "pen", icon: Pencil, label: "Draw" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "text", icon: Type, label: "Text" },
];

const COLORS = ["#f97316", "#ef4444", "#22c55e", "#3b82f6", "#ffffff", "#fbbf24", "#a855f7", "#000000"];

export default function VideoAnnotationCanvas({ videoRef, visible, onClose }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#f97316");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [history, setHistory] = useState([]);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: "" });
  const ctxRef = useRef(null);
  const lastPos = useRef(null);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    restoreHistory(ctx, history);
  }, [visible]);

  const restoreHistory = (ctx, hist) => {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    hist.forEach(imgData => ctx.putImageData(imgData, 0, 0));
  };

  const saveSnapshot = () => {
    if (!ctxRef.current || !canvasRef.current) return;
    const snap = ctxRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev, snap]);
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    if (!ctxRef.current) return;
    const pos = getPos(e);
    if (tool === "text") {
      setTextInput({ visible: true, x: pos.x, y: pos.y, value: "" });
      return;
    }
    setDrawing(true);
    setStartPos(pos);
    lastPos.current = pos;
    saveSnapshot();
    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = strokeWidth;
    ctxRef.current.fillStyle = color;
    if (tool === "pen") {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing || !ctxRef.current) return;
    const pos = getPos(e);
    const ctx = ctxRef.current;

    if (tool === "pen") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    } else {
      // Restore last snapshot for shape preview
      if (history.length > 0) ctx.putImageData(history[history.length - 1], 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      if (tool === "rect") {
        ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (tool === "circle") {
        const rx = (pos.x - startPos.x) / 2;
        const ry = (pos.y - startPos.y) / 2;
        ctx.ellipse(startPos.x + rx, startPos.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === "arrow") {
        drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y);
      }
    }
  };

  const drawArrow = (ctx, x1, y1, x2, y2) => {
    const headLen = 15;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const endDraw = (e) => {
    e.preventDefault();
    setDrawing(false);
  };

  const commitText = () => {
    if (!ctxRef.current || !textInput.value) {
      setTextInput({ visible: false, x: 0, y: 0, value: "" });
      return;
    }
    const ctx = ctxRef.current;
    saveSnapshot();
    ctx.fillStyle = color;
    ctx.font = `${strokeWidth * 5 + 10}px sans-serif`;
    ctx.fillText(textInput.value, textInput.x, textInput.y);
    setHistory(prev => {
      const snap = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      return [...prev, snap];
    });
    setTextInput({ visible: false, x: 0, y: 0, value: "" });
  };

  const undo = () => {
    if (history.length === 0) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    restoreHistory(ctxRef.current, newHistory);
  };

  const clear = () => {
    if (!ctxRef.current || !canvasRef.current) return;
    ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory([]);
  };

  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "annotation.png";
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-30" style={{ pointerEvents: "all" }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: tool === "text" ? "text" : "crosshair", touchAction: "none" }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
      />

      {/* Text input overlay */}
      {textInput.visible && (
        <input
          autoFocus
          value={textInput.value}
          onChange={e => setTextInput(t => ({ ...t, value: e.target.value }))}
          onKeyDown={e => e.key === "Enter" && commitText()}
          onBlur={commitText}
          style={{
            position: "absolute", left: textInput.x, top: textInput.y - 20,
            background: "transparent", border: "none", outline: "none",
            color, fontSize: strokeWidth * 5 + 10, fontWeight: "bold",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)", minWidth: 100,
          }}
        />
      )}

      {/* Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur-md border border-gray-700 rounded-2xl px-3 py-2 shadow-2xl">
        {/* Tools */}
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${tool === t.id ? "text-white" : "text-gray-400 hover:text-white"}`}
            style={tool === t.id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
            <t.icon className="w-4 h-4" />
          </button>
        ))}

        <div className="w-px h-6 bg-gray-700 mx-1" />

        {/* Colors */}
        <div className="flex gap-1">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full transition-all border-2 ${color === c ? "border-white scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="w-px h-6 bg-gray-700 mx-1" />

        {/* Stroke width */}
        <input type="range" min="1" max="8" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))}
          className="w-16 accent-orange-500" />

        <div className="w-px h-6 bg-gray-700 mx-1" />

        {/* Actions */}
        <button onClick={undo} title="Undo" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-white/10">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={clear} title="Clear" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 transition-all hover:bg-white/10">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={download} title="Save annotation" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-green-400 transition-all hover:bg-white/10">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={onClose}
          className="px-3 py-1 rounded-lg text-xs font-semibold text-white ml-1 transition-all hover:opacity-80"
          style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          Done
        </button>
      </div>
    </div>
  );
}