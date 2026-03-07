import { useState } from "react";
import { FileText, Download, Zap, X, Calendar, Users, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";

const REPORT_TYPES = [
  { id: "season", label: "Full Season Report", icon: Trophy, desc: "Complete season summary with all stats, trends, and grades" },
  { id: "game", label: "Game-by-Game Breakdown", icon: Calendar, desc: "Week-by-week performance analysis with opponent context" },
  { id: "position", label: "Position Group Report", icon: Users, desc: "Deep dive by position group — QB, RB, WR, OL, DL, LB, DB" },
];

export default function SeasonReports({ players, stats, games, opponents }) {
  const [selectedReport, setSelectedReport] = useState("season");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [positionGroup, setPositionGroup] = useState("QB");

  const POSITIONS = ["QB", "RB", "WR", "TE", "OL", "DE", "DT", "LB", "CB", "S", "K"];

  const generateReport = async () => {
    setLoading(true);
    setReport("");

    const allWeeks = [...new Set(stats.map(s => s.week))].sort((a, b) => a - b);
    const playerMap = {};
    players.forEach(p => { playerMap[p.id] = p; });

    // Build condensed season summary
    const playerSummaries = players.map(player => {
      const pStats = stats.filter(s => s.player_id === player.id).sort((a, b) => a.week - b.week);
      if (pStats.length === 0) return null;
      const totals = {};
      ["passing_yards","rushing_yards","receiving_yards","touchdowns","interceptions","tackles","sacks","receptions","snap_count","grade"].forEach(m => {
        totals[m] = pStats.reduce((sum, s) => sum + (s[m] || 0), 0);
      });
      totals.avg_grade = pStats.length ? (pStats.reduce((sum, s) => sum + (s.grade || 0), 0) / pStats.filter(s => s.grade).length || 0).toFixed(1) : "N/A";
      totals.games = pStats.length;
      return { name: `${player.first_name} ${player.last_name}`, position: player.position, year: player.year, ...totals };
    }).filter(Boolean);

    const opponentList = opponents?.map(o => `${o.name} (${o.game_date})`).join(", ") || "Unknown schedule";

    let prompt = "";

    if (selectedReport === "season") {
      prompt = `You are a football analytics expert generating a comprehensive season report for a coaching staff.\n\nSeason Schedule: ${opponentList}\n\nPlayer Season Stats:\n${JSON.stringify(playerSummaries, null, 2)}\n\nGenerate a full season report including:\n1. Executive Summary (3-4 sentences)\n2. Offensive Unit Grade & Analysis (top performers, season stats)\n3. Defensive Unit Grade & Analysis\n4. Special Teams Summary\n5. Individual Player Awards (MVP, Most Improved, Best Defender, etc.) with justification\n6. Season Highlights and Low Points\n7. Offseason Priorities and Recruiting Needs\n\nFormat professionally as if printing for program records.`;
    } else if (selectedReport === "game") {
      const weekSummaries = allWeeks.map(week => {
        const weekStats = stats.filter(s => s.week === week);
        const opponent = weekStats[0]?.opponent || `Week ${week} Opponent`;
        const game = games?.find(g => g.status === "final");
        const topPlayers = weekStats.sort((a, b) => (b.grade || 0) - (a.grade || 0)).slice(0, 3)
          .map(s => `${s.player_name} (${s.position}): ${Object.entries(s).filter(([k,v]) => ["passing_yards","rushing_yards","receiving_yards","touchdowns","tackles","sacks"].includes(k) && v > 0).map(([k,v]) => `${k}=${v}`).join(", ")}`);
        return { week, opponent, topPlayers, playerCount: weekStats.length };
      });
      prompt = `You are a football analytics expert. Generate a detailed game-by-game breakdown report.\n\nWeekly Game Data:\n${JSON.stringify(weekSummaries, null, 2)}\n\nFor each week provide:\n- Offensive performance summary\n- Defensive performance summary\n- Key performers and standout plays\n- Team grade for that game (A-F)\n- One key takeaway for coaching\n\nFormat as a professional game log document.`;
    } else if (selectedReport === "position") {
      const groupPlayers = playerSummaries.filter(p => {
        if (positionGroup === "OL") return ["LT","LG","C","RG","RT"].includes(p.position);
        if (positionGroup === "LB") return ["LB","OLB","MLB","ILB"].includes(p.position);
        if (positionGroup === "S") return ["SS","FS"].includes(p.position);
        return p.position === positionGroup;
      });
      prompt = `You are a position coach analyst. Generate a detailed ${positionGroup} position group report.\n\nPlayers:\n${JSON.stringify(groupPlayers, null, 2)}\n\nProvide:\n1. Group overall grade (A-F)\n2. Individual player analysis (strengths, weaknesses, development areas)\n3. Depth chart recommendation\n4. Scheme fit assessment\n5. Recruiting priorities for this group\n6. Key stats leaders and records\n\nFormat as a position coach reference document.`;
    }

    const res = await base44.integrations.Core.InvokeLLM({ prompt });
    setReport(res);
    setLoading(false);
  };

  const downloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([report], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `NxDown_${selectedReport}_report_${new Date().toLocaleDateString().replace(/\//g, "-")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-5">
      {/* Report type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {REPORT_TYPES.map(({ id, label, icon: Icon, desc }) => (
          <button key={id} onClick={() => { setSelectedReport(id); setReport(""); }}
            className={`text-left p-4 rounded-xl border transition-all ${selectedReport === id
              ? "text-white"
              : "bg-[#141414] border-gray-800 text-gray-400 hover:text-white hover:border-gray-600"}`}
            style={selectedReport === id ? { backgroundColor: "var(--color-primary,#f97316)22", borderColor: "var(--color-primary,#f97316)66" } : {}}>
            <Icon className="w-5 h-5 mb-2" style={selectedReport === id ? { color: "var(--color-primary,#f97316)" } : {}} />
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-gray-500 text-xs mt-1">{desc}</p>
          </button>
        ))}
      </div>

      {/* Position group selector */}
      {selectedReport === "position" && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-gray-500 text-sm">Position Group:</span>
          {POSITIONS.map(pos => (
            <button key={pos} onClick={() => setPositionGroup(pos)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${positionGroup === pos ? "text-white" : "bg-[#141414] border-gray-800 text-gray-400 hover:text-white"}`}
              style={positionGroup === pos ? { backgroundColor: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)" } : {}}>
              {pos}
            </button>
          ))}
        </div>
      )}

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <button onClick={generateReport} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          <Zap className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
          {loading ? "Generating Report..." : "Generate Report"}
        </button>
        {report && (
          <button onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-all">
            <Download className="w-4 h-4" />
            Download .txt
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-primary,#f97316)44", borderTopColor: "var(--color-primary,#f97316)" }} />
          <p className="text-gray-400">Generating your report with AI...</p>
        </div>
      )}

      {/* Report output */}
      {report && !loading && (
        <div className="bg-[#141414] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800" style={{ backgroundColor: "var(--color-primary,#f97316)11" }}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
              <span className="font-semibold text-sm" style={{ color: "var(--color-primary,#f97316)" }}>
                {REPORT_TYPES.find(r => r.id === selectedReport)?.label}
              </span>
            </div>
            <button onClick={() => setReport("")} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{report}</pre>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl">
          <FileText className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Select a report type and click Generate</p>
          <p className="text-gray-600 text-sm mt-1">AI will analyze all player stats and game data</p>
        </div>
      )}
    </div>
  );
}