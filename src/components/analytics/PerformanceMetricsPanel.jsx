import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Zap, Loader2, Activity, TrendingUp } from "lucide-react";

const METRIC_CATEGORIES = [
  { id: "film_grade", label: "Film Grades" },
  { id: "speed", label: "Speed / GPS" },
  { id: "efficiency", label: "Efficiency" },
];

export default function PerformanceMetricsPanel({ metrics, players }) {
  const [category, setCategory] = useState("film_grade");
  const [selectedPlayer, setSelectedPlayer] = useState("all");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const filtered = metrics.filter(m => {
    if (m.category !== category && category !== "all") {
      // loosely group – include if any metric for the category is present
    }
    if (selectedPlayer !== "all" && m.player_name !== selectedPlayer) return false;
    return true;
  });

  // Build radar data for film grades
  const radarData = (() => {
    if (category !== "film_grade") return [];
    const byPlayer = {};
    filtered.forEach(m => {
      if (!byPlayer[m.player_name]) byPlayer[m.player_name] = { name: m.player_name, play: 0, effort: 0, assignment: 0, technique: 0, count: 0 };
      const p = byPlayer[m.player_name];
      if (m.play_grade) { p.play += m.play_grade; p.count++; }
      if (m.effort_grade) p.effort += m.effort_grade;
      if (m.assignment_grade) p.assignment += m.assignment_grade;
      if (m.technique_grade) p.technique += m.technique_grade;
    });
    return Object.values(byPlayer).map(p => ({
      name: p.name,
      "Play Grade": p.count ? Math.round(p.play / p.count) : 0,
      "Effort": p.count ? Math.round(p.effort / p.count) : 0,
      "Assignment": p.count ? Math.round(p.assignment / p.count) : 0,
      "Technique": p.count ? Math.round(p.technique / p.count) : 0,
    }));
  })();

  // Build bar chart for speed
  const speedData = (() => {
    if (category !== "speed") return [];
    const byPlayer = {};
    filtered.forEach(m => {
      if (!byPlayer[m.player_name]) byPlayer[m.player_name] = { name: m.player_name, topSpeed: 0, avgSpeed: 0, count: 0 };
      const p = byPlayer[m.player_name];
      if (m.top_speed_mph) { p.topSpeed = Math.max(p.topSpeed, m.top_speed_mph); }
      if (m.avg_speed_mph) { p.avgSpeed += m.avg_speed_mph; p.count++; }
    });
    return Object.values(byPlayer).map(p => ({
      name: p.name.split(" ").pop(),
      "Top Speed": p.topSpeed,
      "Avg Speed": p.count ? Math.round((p.avgSpeed / p.count) * 10) / 10 : 0,
    }));
  })();

  // Trend line (play grades over time)
  const trendData = (() => {
    const byDate = {};
    metrics.filter(m => m.play_grade).forEach(m => {
      const d = m.game_date || "Unknown";
      if (!byDate[d]) byDate[d] = { date: d, total: 0, count: 0 };
      byDate[d].total += m.play_grade;
      byDate[d].count++;
    });
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ date: d.date.slice(5), avgGrade: Math.round(d.total / d.count) }));
  })();

  // Unique players list
  const uniquePlayers = [...new Set(metrics.map(m => m.player_name))].filter(Boolean);

  const runAIAnalysis = async () => {
    setAiLoading(true);
    setShowAI(true);
    setAiAnalysis("");
    const subset = filtered.slice(0, 50);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite sports performance analyst. Analyze these ${category.replace(/_/g, " ")} metrics for a football team.\n\nMetrics Data:\n${JSON.stringify(subset, null, 2)}\n\nProvide:\n1. PERFORMANCE SUMMARY — overall team/player performance level\n2. STANDOUT PERFORMERS — top performers and why\n3. IMPROVEMENT AREAS — players/areas needing development\n4. COACHING RECOMMENDATIONS — specific, actionable steps\n5. BENCHMARKS — how these numbers compare to typical HS/college standards\n\nBe specific, cite names and numbers, write for coaching staff.`,
    });
    setAiAnalysis(res);
    setAiLoading(false);
  };

  const chartColor = "var(--color-primary,#f97316)";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-gray-800 rounded-lg p-1">
          {METRIC_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${category === c.id ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              style={category === c.id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
              {c.label}
            </button>
          ))}
        </div>

        <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}
          className="bg-[#1a1a1a] border border-gray-700 text-white px-3 py-1.5 rounded-lg text-xs">
          <option value="all">All Players</option>
          {uniquePlayers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <button onClick={runAIAnalysis} disabled={aiLoading || !metrics.length}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40"
          style={{ color: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)4d", backgroundColor: "var(--color-primary,#f97316)1a" }}>
          <Zap className={`w-3.5 h-3.5 ${aiLoading ? "animate-pulse" : ""}`} />
          AI Performance Analysis
        </button>
      </div>

      {metrics.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Activity className="w-10 h-10 text-gray-800" />
          <p className="text-gray-500 text-sm">No metrics data yet</p>
          <p className="text-gray-600 text-xs">Import data from the Import tab or log metrics manually</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Film Grades Radar */}
          {category === "film_grade" && radarData.length > 0 && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-3">Grade Breakdown by Player</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={radarData} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={v => v.split(" ").pop()} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                  <Bar dataKey="Play Grade" fill="var(--color-primary,#f97316)" radius={[3,3,0,0]} />
                  <Bar dataKey="Effort" fill="#3b82f6" radius={[3,3,0,0]} />
                  <Bar dataKey="Assignment" fill="#22c55e" radius={[3,3,0,0]} />
                  <Bar dataKey="Technique" fill="#a855f7" radius={[3,3,0,0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Speed Chart */}
          {category === "speed" && speedData.length > 0 && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-3">Speed Metrics by Player (mph)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={speedData} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                  <Bar dataKey="Top Speed" fill="var(--color-primary,#f97316)" radius={[3,3,0,0]} />
                  <Bar dataKey="Avg Speed" fill="#3b82f6" radius={[3,3,0,0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Grade Trend Line */}
          {trendData.length > 1 && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
                Team Grade Trend
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                  <Line type="monotone" dataKey="avgGrade" stroke="var(--color-primary,#f97316)" strokeWidth={2} dot={{ fill: "var(--color-primary,#f97316)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Player stats table */}
          <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 lg:col-span-2">
            <p className="text-white text-sm font-semibold mb-3">Metrics Detail</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-2 pr-3">Player</th>
                    <th className="text-left py-2 pr-3">Date</th>
                    <th className="text-right py-2 pr-3">Play Grade</th>
                    <th className="text-right py-2 pr-3">Effort</th>
                    <th className="text-right py-2 pr-3">Assignment</th>
                    <th className="text-right py-2 pr-3">Top Speed</th>
                    <th className="text-right py-2">EPA</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 25).map(m => (
                    <tr key={m.id} className="border-b border-gray-800/50 hover:bg-white/5">
                      <td className="py-2 pr-3 text-white font-medium">{m.player_name}</td>
                      <td className="py-2 pr-3 text-gray-500">{m.game_date ? m.game_date.slice(5) : "—"}</td>
                      <td className="py-2 pr-3 text-right">
                        {m.play_grade != null ? (
                          <span className={`font-bold ${m.play_grade >= 75 ? "text-green-400" : m.play_grade >= 55 ? "text-yellow-400" : "text-red-400"}`}>
                            {m.play_grade}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right text-gray-400">{m.effort_grade ?? "—"}</td>
                      <td className="py-2 pr-3 text-right text-gray-400">{m.assignment_grade ?? "—"}</td>
                      <td className="py-2 pr-3 text-right text-gray-400">{m.top_speed_mph ? `${m.top_speed_mph} mph` : "—"}</td>
                      <td className="py-2 text-right">
                        {m.epa != null ? (
                          <span className={m.epa > 0 ? "text-green-400" : "text-red-400"}>{m.epa > 0 ? "+" : ""}{m.epa}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis panel */}
      {showAI && (
        <div className="bg-[#141414] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800"
            style={{ backgroundColor: "var(--color-primary,#f97316)11" }}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
              <span className="font-semibold text-sm" style={{ color: "var(--color-primary,#f97316)" }}>AI Performance Analysis</span>
            </div>
            <button onClick={() => setShowAI(false)} className="text-gray-500 hover:text-white text-xs">Close</button>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {aiLoading ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--color-primary,#f97316)" }} />
                <p className="text-gray-400 text-sm">Analyzing performance data...</p>
              </div>
            ) : (
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiAnalysis}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}