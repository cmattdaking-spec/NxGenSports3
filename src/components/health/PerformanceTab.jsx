import { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

const DARK_TOOLTIP = {
  contentStyle: { backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#aaa" },
  itemStyle: { color: "#fff" },
};

export default function PerformanceTab({ stats, records, players }) {
  // Build per-player weekly grade trend (top 8 most active players)
  const playerGradeTrends = useMemo(() => {
    const byPlayer = {};
    stats.forEach(s => {
      if (!byPlayer[s.player_id]) byPlayer[s.player_id] = { name: s.player_name, data: [] };
      byPlayer[s.player_id].data.push({ week: s.week, grade: s.grade || 0, snaps: s.snap_count || 0 });
    });
    return Object.values(byPlayer)
      .filter(p => p.data.length >= 2)
      .sort((a, b) => b.data.length - a.data.length)
      .slice(0, 6)
      .map(p => ({ ...p, data: p.data.sort((a, b) => a.week - b.week) }));
  }, [stats]);

  // Team average grade by week
  const teamGradeByWeek = useMemo(() => {
    const byWeek = {};
    stats.forEach(s => {
      if (!byWeek[s.week]) byWeek[s.week] = { week: s.week, grades: [], snaps: [] };
      if (s.grade) byWeek[s.week].grades.push(s.grade);
      if (s.snap_count) byWeek[s.week].snaps.push(s.snap_count);
    });
    return Object.values(byWeek)
      .sort((a, b) => a.week - b.week)
      .map(w => ({
        week: `Wk ${w.week}`,
        avgGrade: w.grades.length ? +(w.grades.reduce((s, v) => s + v, 0) / w.grades.length).toFixed(1) : null,
        avgSnaps: w.snaps.length ? +(w.snaps.reduce((s, v) => s + v, 0) / w.snaps.length).toFixed(0) : null,
      }));
  }, [stats]);

  // Health status vs performance correlation — scatter per player
  const healthVsPerformance = useMemo(() => {
    return players.map(p => {
      const playerStats = stats.filter(s => s.player_id === p.id);
      const playerRecords = records.filter(r => r.player_id === p.id);
      if (!playerStats.length) return null;
      const avgGrade = playerStats.reduce((s, v) => s + (v.grade || 0), 0) / playerStats.length;
      const injuryCount = playerRecords.filter(r => r.availability !== "full").length;
      return {
        name: `${p.first_name} ${p.last_name}`,
        position: p.position,
        avgGrade: +avgGrade.toFixed(1),
        injuryEvents: injuryCount,
        snaps: playerStats.reduce((s, v) => s + (v.snap_count || 0), 0),
      };
    }).filter(Boolean);
  }, [players, stats, records]);

  // Top performers
  const topPerformers = useMemo(() => {
    return [...healthVsPerformance]
      .sort((a, b) => b.avgGrade - a.avgGrade)
      .slice(0, 5);
  }, [healthVsPerformance]);

  // Trend indicator per player (last 3 weeks vs previous 3)
  const trends = useMemo(() => {
    const result = {};
    playerGradeTrends.forEach(p => {
      const d = p.data;
      if (d.length < 4) { result[p.name] = "stable"; return; }
      const recent = d.slice(-3).reduce((s, v) => s + v.grade, 0) / 3;
      const prev = d.slice(-6, -3).reduce((s, v) => s + v.grade, 0) / Math.max(d.slice(-6, -3).length, 1);
      result[p.name] = recent > prev + 2 ? "up" : recent < prev - 2 ? "down" : "stable";
    });
    return result;
  }, [playerGradeTrends]);

  const COLORS = ["#f97316","#3b82f6","#10b981","#a855f7","#ec4899","#eab308"];

  if (!stats.length) return (
    <div className="text-center py-20 text-gray-600">
      <Activity className="w-10 h-10 mx-auto mb-2 opacity-20" />
      <p className="font-semibold text-gray-500">No performance data yet</p>
      <p className="text-sm mt-1">Log player stats to see performance analytics</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Performers */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {topPerformers.map((p, i) => (
          <div key={p.name} className="bg-[#141414] border border-gray-800 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
              <span className="text-yellow-500 font-bold">#{i + 1}</span>
              <span>{p.position}</span>
            </div>
            <p className="text-white text-xs font-semibold truncate">{p.name}</p>
            <p className="text-2xl font-black mt-1" style={{ color: "var(--color-primary,#f97316)" }}>{p.avgGrade}</p>
            <p className="text-gray-600 text-xs">avg grade</p>
          </div>
        ))}
      </div>

      {/* Team Grade Trend */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 text-sm">Team Average Grade by Week</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={teamGradeByWeek}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="week" stroke="#555" tick={{ fontSize: 11 }} />
            <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={[60, 100]} />
            <Tooltip {...DARK_TOOLTIP} />
            <Line type="monotone" dataKey="avgGrade" name="Avg Grade" stroke="var(--color-primary,#f97316)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--color-primary,#f97316)" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Individual Grade Trends */}
      {playerGradeTrends.length > 0 && (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">Individual Player Grade Trends</h3>
            <div className="flex gap-3">
              {playerGradeTrends.slice(0, 4).map((p, i) => (
                <div key={p.name} className="flex items-center gap-1">
                  {trends[p.name] === "up" ? <TrendingUp className="w-3 h-3 text-green-400" /> :
                   trends[p.name] === "down" ? <TrendingDown className="w-3 h-3 text-red-400" /> :
                   <Minus className="w-3 h-3 text-gray-500" />}
                  <span className="text-gray-400 text-xs hidden md:inline">{p.name.split(" ")[1]}</span>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="week" stroke="#555" tick={{ fontSize: 11 }} type="number" label={{ value: "Week", position: "insideBottom", fill: "#555", fontSize: 11 }} />
              <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={[50, 100]} />
              <Tooltip {...DARK_TOOLTIP} />
              {playerGradeTrends.map((p, i) => (
                <Line key={p.name} data={p.data} type="monotone" dataKey="grade" name={p.name}
                  stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Training Load vs Performance */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-1 text-sm">Training Load vs Performance</h3>
        <p className="text-gray-500 text-xs mb-4">Avg snaps (load proxy) vs avg grade per week</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={teamGradeByWeek}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="week" stroke="#555" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#555" tick={{ fontSize: 11 }} domain={[60, 100]} />
            <YAxis yAxisId="right" orientation="right" stroke="#555" tick={{ fontSize: 11 }} />
            <Tooltip {...DARK_TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#aaa" }} />
            <Bar yAxisId="left" dataKey="avgGrade" name="Avg Grade" fill="var(--color-primary,#f97316)" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="avgSnaps" name="Avg Snaps" fill="#3b82f6" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Health vs Performance Table */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-white font-semibold text-sm">Health Impact on Performance</h3>
          <p className="text-gray-500 text-xs">Correlation between health events and player grades</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 text-xs px-4 py-3">Player</th>
                <th className="text-left text-gray-500 text-xs px-4 py-3">Pos</th>
                <th className="text-left text-gray-500 text-xs px-4 py-3">Avg Grade</th>
                <th className="text-left text-gray-500 text-xs px-4 py-3">Total Snaps</th>
                <th className="text-left text-gray-500 text-xs px-4 py-3">Health Events</th>
                <th className="text-left text-gray-500 text-xs px-4 py-3">Trend</th>
              </tr>
            </thead>
            <tbody>
              {healthVsPerformance.sort((a, b) => b.avgGrade - a.avgGrade).map(p => (
                <tr key={p.name} className="border-b border-gray-800/50 hover:bg-white/2">
                  <td className="px-4 py-3 text-white font-medium text-sm">{p.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{p.position}</td>
                  <td className="px-4 py-3">
                    <span className={`font-black text-sm ${p.avgGrade >= 80 ? "text-green-400" : p.avgGrade >= 70 ? "text-yellow-400" : "text-red-400"}`}>
                      {p.avgGrade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{p.snaps}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.injuryEvents === 0 ? "bg-green-500/20 text-green-400" : p.injuryEvents <= 2 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                      {p.injuryEvents} events
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {trends[p.name] === "up" ? <TrendingUp className="w-4 h-4 text-green-400" /> :
                     trends[p.name] === "down" ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                     <Minus className="w-4 h-4 text-gray-500" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}