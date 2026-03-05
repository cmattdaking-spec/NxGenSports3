import { useRef, useEffect, useState, useCallback } from "react";
import { X, Play, Pause, RotateCcw } from "lucide-react";

// Parse diagram_data (base64 image) or generate a default animated diagram from play metadata
export default function PlayDiagramViewer({ play, onClose }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  const W = 700, H = 420;

  // Build route paths from play category
  const getRoutes = (category) => {
    const LOS = H * 0.62; // line of scrimmage y
    const isDefense = play.unit === "defense";

    if (isDefense) {
      return [
        { x: W * 0.5, y: LOS - 20, path: [{ x: W * 0.5, y: LOS - 80 }], color: "#ef4444", label: "MLB" },
        { x: W * 0.3, y: LOS - 20, path: [{ x: W * 0.35, y: LOS - 90 }, { x: W * 0.2, y: LOS - 60 }], color: "#ef4444", label: "DE" },
        { x: W * 0.7, y: LOS - 20, path: [{ x: W * 0.65, y: LOS - 90 }, { x: W * 0.8, y: LOS - 60 }], color: "#ef4444", label: "DE" },
      ];
    }

    const base = [
      { x: W * 0.5, y: LOS, path: [{ x: W * 0.5, y: LOS - 40 }, { x: W * 0.5, y: LOS - 80 }], color: "#3b82f6", label: "QB" },
    ];

    if (category === "run") {
      return [...base,
        { x: W * 0.5, y: LOS + 30, path: [{ x: W * 0.45, y: LOS - 30 }, { x: W * 0.35, y: LOS - 100 }], color: "#10b981", label: "RB" },
        { x: W * 0.3, y: LOS, path: [{ x: W * 0.25, y: LOS - 60 }], color: "#3b82f6", label: "WR" },
        { x: W * 0.7, y: LOS, path: [{ x: W * 0.75, y: LOS - 60 }], color: "#3b82f6", label: "WR" },
      ];
    }
    if (category === "pass" || category === "play_action") {
      return [...base,
        { x: W * 0.5, y: LOS + 30, path: [{ x: W * 0.5, y: LOS + 10 }, { x: W * 0.55, y: LOS - 20 }], color: "#10b981", label: "RB" },
        { x: W * 0.2, y: LOS, path: [{ x: W * 0.1, y: LOS - 60 }, { x: W * 0.25, y: LOS - 130 }], color: "#3b82f6", label: "WR" },
        { x: W * 0.8, y: LOS, path: [{ x: W * 0.9, y: LOS - 60 }, { x: W * 0.75, y: LOS - 130 }], color: "#3b82f6", label: "WR" },
        { x: W * 0.65, y: LOS + 5, path: [{ x: W * 0.7, y: LOS - 50 }, { x: W * 0.6, y: LOS - 110 }], color: "#3b82f6", label: "TE" },
      ];
    }
    if (category === "screen") {
      return [...base,
        { x: W * 0.5, y: LOS + 30, path: [{ x: W * 0.35, y: LOS + 20 }, { x: W * 0.15, y: LOS - 40 }], color: "#10b981", label: "RB" },
        { x: W * 0.2, y: LOS, path: [{ x: W * 0.1, y: LOS - 80 }], color: "#3b82f6", label: "WR" },
        { x: W * 0.8, y: LOS, path: [{ x: W * 0.85, y: LOS - 80 }], color: "#3b82f6", label: "WR" },
      ];
    }
    return base;
  };

  const drawFrame = useCallback((t) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    const LOS = H * 0.62;

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
    ctx.strokeStyle = "rgba(255,220,0,0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.beginPath(); ctx.moveTo(0, LOS); ctx.lineTo(W, LOS); ctx.stroke();
    ctx.setLineDash([]);

    // OL blocks
    const olPositions = [W*0.37, W*0.43, W*0.5, W*0.57, W*0.63];
    olPositions.forEach(ox => {
      ctx.fillStyle = "#2563eb";
      ctx.beginPath(); ctx.rect(ox - 8, LOS - 10, 16, 20); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1; ctx.stroke();
    });

    if (play.diagram_data && play.diagram_data.startsWith("data:")) {
      // Show saved diagram image
      const img = new Image();
      img.src = play.diagram_data;
      img.onload = () => ctx.drawImage(img, 0, 0, W, H);
      return;
    }

    const routes = getRoutes(play.category);

    routes.forEach(player => {
      const allPoints = [{ x: player.x, y: player.y }, ...player.path];

      // Draw route trail up to progress t
      if (allPoints.length >= 2) {
        const totalSegs = allPoints.length - 1;
        const tTotal = t * totalSegs;
        ctx.beginPath();
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.moveTo(allPoints[0].x, allPoints[0].y);

        for (let s = 0; s < totalSegs; s++) {
          const segT = Math.min(1, Math.max(0, tTotal - s));
          const nx = allPoints[s].x + (allPoints[s + 1].x - allPoints[s].x) * segT;
          const ny = allPoints[s].y + (allPoints[s + 1].y - allPoints[s].y) * segT;
          ctx.lineTo(nx, ny);
        }
        ctx.stroke();

        // Arrowhead at tip
        if (t > 0.1) {
          const tTotal2 = Math.min(totalSegs - 0.01, t * totalSegs);
          const si = Math.floor(tTotal2);
          const sf = tTotal2 - si;
          const p1 = allPoints[Math.min(si, totalSegs - 1)];
          const p2 = allPoints[Math.min(si + 1, totalSegs)];
          const cx2 = p1.x + (p2.x - p1.x) * sf;
          const cy2 = p1.y + (p2.y - p1.y) * sf;
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          ctx.beginPath();
          ctx.fillStyle = player.color;
          ctx.moveTo(cx2, cy2);
          ctx.lineTo(cx2 - 10 * Math.cos(angle - 0.4), cy2 - 10 * Math.sin(angle - 0.4));
          ctx.lineTo(cx2 - 10 * Math.cos(angle + 0.4), cy2 - 10 * Math.sin(angle + 0.4));
          ctx.closePath(); ctx.fill();
        }
      }

      // Player dot
      ctx.beginPath();
      ctx.arc(player.x, player.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(player.label, player.x, player.y);
    });
  }, [play]);

  useEffect(() => { drawFrame(0); }, [drawFrame]);

  useEffect(() => {
    if (!playing) { cancelAnimationFrame(animFrameRef.current); return; }
    const speed = 0.004;
    const animate = () => {
      progressRef.current = Math.min(1, progressRef.current + speed);
      setProgress(progressRef.current);
      drawFrame(progressRef.current);
      if (progressRef.current < 1) animFrameRef.current = requestAnimationFrame(animate);
      else setPlaying(false);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playing, drawFrame]);

  const reset = () => {
    setPlaying(false);
    progressRef.current = 0;
    setProgress(0);
    drawFrame(0);
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-3xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold">{play.name}</h2>
            <p className="text-gray-500 text-xs">{play.formation} · {play.category?.replace("_"," ")} · {play.unit}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-3">
          <canvas ref={canvasRef} width={W} height={H}
            className="w-full rounded-lg" style={{ maxHeight: 380 }} />
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-1">
          <div className="w-full h-1 bg-gray-800 rounded-full">
            <div className="h-1 bg-orange-500 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setPlaying(p => !p)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {playing ? "Pause" : "Animate"}
          </button>
          <button onClick={reset} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800">
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="ml-auto text-gray-600 text-xs">
            Blue = Offense · Red = Defense · Green = Ball carrier
          </div>
        </div>

        {play.description && (
          <div className="px-4 pb-4">
            <p className="text-gray-400 text-sm bg-gray-900 rounded-lg p-3">{play.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}