import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { Shield, Zap, TrendingUp, TrendingDown, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function TeamEfficiency({ players, stats, games }) {
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Aggregate offensive stats by week
  const offensivePlayers = players.filter(p => ["QB","RB","WR","TE","FB"].includes(p.position));
  const defensivePlayers = players.filter(p => ["DE","DT","NT","OLB","MLB","ILB","CB","SS","FS","LB"].includes(p.position));

  const offPlayerIds = new Set(offensivePlayers.map(p => p.id));
  const defPlayerIds = new Set(defensivePlayers.map(p => p.id));

  // Get all unique weeks
  const weeks = [...new Set(stats.map(s => s.week))].sort((a, b) => a - b);

  const weeklyData = weeks.map(week => {
    const weekStats = stats.filter(s => s.week === week);
    const offStats = weekStats.filter(s => offPlayerIds.has(s.player_id));
    const defStats = weekStats.filter(s => defPlayerIds.has(s.player_id));

    const totalPassYards = offStats.reduce((sum, s) => sum + (s.passing_yards || 0), 0);
    const totalRushYards = offStats.reduce((sum, s) => sum + (s.rushing_yards || 0), 0);
    const totalRecYards = offStats.reduce((sum, s) => sum + (s.receiving_yards || 0), 0);
    const offTDs = offStats.reduce((sum, s) => sum + (s.touchdowns || 0), 0);
    const defTackles = defStats.reduce((sum, s) => sum + (s.tackles || 0), 0);
    const defSacks = defStats.reduce((sum, s) => sum + (s.sacks || 0), 0);
    const defTDs = defStats.reduce((sum, s) => sum + (s.touchdowns || 0), 0);
    const snapCount = offStats.reduce((sum, s) => sum + (s.snap_count || 0), 0) || 1;

    const game = games?.find(g => {
      const gWeek = g.game_date ? new Date(g.game_date).getWeek?.() : null;
      return g.status === "final";
    });

    return {
      week: `Wk ${week}`,
      passingYards: totalPassYards,
      rushingYards: totalRushYards,
      offTDs,
      defTackles,
      defSacks,
      defTDs,
      totalOffYards: totalPassYards + totalRushYards + totalRecYards,
      yardsPerPlay: snapCount > 1 ? ((totalPassYards + totalRushYards) / snapCount).toFixed(1) : 0,
    };
  });

  // Season totals
  const seasonOff = {
    totalYards: weeklyData.reduce((s, w) => s + w.totalOffYards, 0),
    totalTDs: weeklyData.reduce((s, w) => s + w.offTDs, 0),
    avgYPG: weeklyData.length ? (weeklyData.reduce((s, w) => s + w.totalOffYards, 0) / weeklyData.length).toFixed(0) : 0,
  };
  const seasonDef = {
    totalTackles: weeklyData.reduce((s, w) => s + w.defTackles, 0),
    totalSacks: weeklyData.reduce((s, w) => s + w.defSacks, 0),
    totalDefTDs: weeklyData.reduce((s, w) => s + w.defTDs, 0),
  };

  const getAIReport = async () => {
    setAiLoading(true);
    setAiReport("");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football strategy analyst. Analyze this team's offensive and defensive efficiency over the season:\n\nWeekly Data:\n${JSON.stringify(weeklyData, null, 2)}\n\nSeason Totals:\nOffense: ${JSON.stringify(seasonOff)}\nDefense: ${JSON.stringify(seasonDef)}\n\nProvide:\n1. Offensive efficiency grade (A-F) with reasoning\n2. Defensive efficiency grade (A-F) with reasoning\n3. Key trends (2-3 bullet points each side)\n4. Strategic recommendations for improvement\n5. Best and worst performing weeks and why\n\nBe specific, data-driven, and concise.`,
    });
    setAiReport(res);
    setAiLoading(false);
  };

  if (weeks.length === 0) {
    return (
      <div className="text-center py-20">
        <Shield className="w-12 h-12 text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500">No game stats available for team efficiency analysis.</p>
        <p className="text-gray-600 text-sm mt-1">Log player stats in the Player Trends tab first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Season summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Off. Yards", value: seasonOff.totalYards.toLocaleString(), color: "var(--color-primary,#f97316)", icon: TrendingUp },
          { label: "Avg Yards/Game", value: seasonOff.avgYPG, color: "var(--color-primary,#f97316)", icon: TrendingUp },
          { label: "Offensive TDs", value: seasonOff.totalTDs, color: "#10b981", icon: TrendingUp },
          { label: "Total Tackles", value: seasonDef.totalTackles, color: "#3b82f6", icon: Shield },
          { label: "Total Sacks", value: seasonDef.totalSacks, color: "#a855f7", icon: Shield },
          { label: "Defensive TDs", value: seasonDef.totalDefTDs, color: "#eab308", icon: TrendingDown },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-[#141414] border border-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-gray-500 text-xs">{label}</span>
            </div>
            <p className="text-xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* AI Efficiency Report */}
      <div className="flex justify-end">
        <button onClick={getAIReport} disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
          style={{ color: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)4d", backgroundColor: "var(--color-primary,#f97316)1a" }}>
          <Zap className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} />
          {aiLoading ? "Analyzing Strategy..." : "AI Strategy Analysis"}
        </button>
      </div>

      {aiReport && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: "var(--color-primary,#f97316)1a", borderColor: "var(--color-primary,#f97316)4d" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
              <span className="font-medium text-sm" style={{ color: "var(--color-primary,#f97316)" }}>Strategy Efficiency Report</span>
            </div>
            <button onClick={() => setAiReport("")} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-gray-300 text-sm whitespace-pre-line">{aiReport}</p>
        </div>
      )}

      {/* Offense chart */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
        <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
          Offensive Yards by Week
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeklyData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="week" tick={{ fill: "#666", fontSize: 11 }} />
            <YAxis tick={{ fill: "#666", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />
            <Bar dataKey="passingYards" name="Passing Yards" fill="var(--color-primary,#f97316)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="rushingYards" name="Rushing Yards" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Defense chart */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
        <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          Defensive Production by Week
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weeklyData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="week" tick={{ fill: "#666", fontSize: 11 }} />
            <YAxis tick={{ fill: "#666", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />
            <Line type="monotone" dataKey="defTackles" name="Tackles" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="defSacks" name="Sacks" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}