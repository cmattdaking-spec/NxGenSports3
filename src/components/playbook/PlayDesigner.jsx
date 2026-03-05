import { useRef, useState, useEffect } from "react";
import { X, Trash2, RotateCcw } from "lucide-react";

const PLAYER_TYPES = [
  { label: "O", color: "#3b82f6", type: "offense" },
  { label: "X", color: "#ef4444", type: "defense" },
  { label: "B", color: "#10b981", type: "ball" },
];

export default function PlayDesigner({ onClose, onSave }) {
  const canvasRef = useRef(null);
  const [players, setPlayers] = useState([]);
  const [lines, setLines] = useState([]);
  const [mode, setMode] = useState("place"); // place | route | select
  const [selectedType, setSelectedType] = useState(PLAYER_TYPES[0]);
  const [drawing, setDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);
  const [dragging, setDragging] = useState(null);

  const canvasWidth = 700;
  const canvasHeight = 460;

  useEffect(() => { drawAll(); }, [players, lines, currentLine]);

  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Field background
    ctx.fillStyle = "#1a4a1a";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Yard lines
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (canvasWidth / 10) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
    }

    // Line of scrimmage
    ctx.strokeStyle = "rgba(255,255,0,0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(0, canvasHeight * 0.55); ctx.lineTo(canvasWidth, canvasHeight * 0.55); ctx.stroke();
    ctx.setLineDash([]);

    // Draw routes/lines
    lines.forEach(line => {
      if (line.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = line.color || "#ff6b00";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.moveTo(line.points[0].x, line.points[0].y);
      line.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
      // Arrow
      const last = line.points[line.points.length - 1];
      const prev = line.points[line.points.length - 2];
      if (last && prev) {
        const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
        ctx.beginPath();
        ctx.fillStyle = line.color || "#ff6b00";
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(last.x - 10 * Math.cos(angle - 0.4), last.y - 10 * Math.sin(angle - 0.4));
        ctx.lineTo(last.x - 10 * Math.cos(angle + 0.4), last.y - 10 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
      }
    });

    // Current drawing line
    if (currentLine && currentLine.points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#ff6b00";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.moveTo(currentLine.points[0].x, currentLine.points[0].y);
      currentLine.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw players
    players.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, p.x, p.y);
    });
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const touch = e.touches?.[0] || e;
    return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
  };

  const handleMouseDown = (e) => {
    const pos = getPos(e);
    if (mode === "place") {
      setPlayers(prev => [...prev, { id: Date.now(), ...pos, ...selectedType }]);
    } else if (mode === "route") {
      setDrawing(true);
      setCurrentLine({ points: [pos], color: "#ff6b00" });
    } else if (mode === "select") {
      const hit = players.find(p => Math.hypot(p.x - pos.x, p.y - pos.y) < 16);
      if (hit) setDragging(hit.id);
    }
  };

  const handleMouseMove = (e) => {
    const pos = getPos(e);
    if (mode === "route" && drawing && currentLine) {
      setCurrentLine(prev => ({ ...prev, points: [...prev.points, pos] }));
    } else if (mode === "select" && dragging) {
      setPlayers(prev => prev.map(p => p.id === dragging ? { ...p, ...pos } : p));
    }
  };

  const handleMouseUp = () => {
    if (mode === "route" && drawing && currentLine && currentLine.points.length > 2) {
      setLines(prev => [...prev, currentLine]);
    }
    setDrawing(false);
    setCurrentLine(null);
    setDragging(null);
  };

  const clearAll = () => { setPlayers([]); setLines([]); };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    onSave?.(dataUrl);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-3xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white font-bold">Play Designer</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-3 border-b border-gray-800">
          <div className="flex gap-1">
            {["place","route","select"].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${mode === m ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                {m === "place" ? "Place" : m === "route" ? "Draw Route" : "Move"}
              </button>
            ))}
          </div>
          {mode === "place" && (
            <div className="flex gap-1">
              {PLAYER_TYPES.map(t => (
                <button key={t.type} onClick={() => setSelectedType(t)}
                  className={`w-8 h-8 rounded-full text-white text-xs font-bold border-2 transition-all ${selectedType.type === t.type ? "border-white scale-110" : "border-transparent opacity-70"}`}
                  style={{ background: t.color }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={clearAll} className="flex items-center gap-1 text-gray-400 hover:text-red-400 text-xs transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
            <button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
              Save Diagram
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="p-3">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full rounded-lg cursor-crosshair"
            style={{ maxHeight: "400px", touchAction: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          />
        </div>

        <div className="px-4 pb-3 text-gray-600 text-xs">
          Blue = Offense · Red = Defense · Green = Ball carrier · Orange lines = Routes
        </div>
      </div>
    </div>
  );
}