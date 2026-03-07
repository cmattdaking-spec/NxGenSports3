import { useState } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users } from "lucide-react";

const POSITION_METRICS = {
  QB: ["completions", "attempts", "passing_yards", "touchdowns", "interceptions", "grade"],
  RB: ["rushing_yards", "touchdowns", "tackles", "grade"],
  WR: ["receptions", "receiving_yards", "touchdowns", "grade"],
  TE: ["receptions", "receiving_yards", "touchdowns", "grade"],
  LB: ["tackles", "sacks", "forced_fumbles", "pass_deflections", "grade"],
  OLB: ["tackles", "sacks", "forced_fumbles", "grade"],
  MLB: ["tackles", "sacks", "forced_fumbles", "grade"],
  ILB: ["tackles", "sacks", "forced_fumbles", "grade"],
  CB: ["tackles", "pass_deflections", "grade"],
  SS: ["tackles", "pass_deflections", "sacks", "grade"],
  FS: ["tackles", "pass_deflections", "grade"],
  DE: ["tackles", "sacks", "forced_fumbles", "grade"],
  DT: ["tackles", "sacks", "grade"],
};
const metricLabel = (m) => m.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export default function PlayerRadar({ players, stats }) {
  const [selectedPlayer, setSelectedPlayer] = useState(players[0] || null);
  const [comparePlayer, setComparePlayer] = useState(null);

  const playerStats = stats.filter(s => s.player_id === selectedPlayer?.id);
  const compareStats = comparePlayer ? stats.filter(s => s.player_id === comparePlayer.id) : [];
  const metrics = POSITION_METRICS[selectedPlayer?.position] || ["grade", "snap_count"];

  const getAvg = (metric, statArr) => {
    const vals = statArr.map(s => s[metric] || 0).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const radarData = metrics.map(m => ({
    metric: metricLabel(m),
    value: Math.min(getAvg(m, playerStats), 100),
    compare: Math.min(getAvg(m, compareStats), 100),
  }));

  if (!selectedPlayer) return <div className="text-center py-20 text-gray-500">No players available.</div>;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {players.map(p => (
          <button key={p.id} onClick={() => setSelectedPlayer(p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${selectedPlayer?.id === p.id ? "text-white" : "bg-[#141414] border-gray-800 text-gray-400 hover:text-white"}`}
            style={selectedPlayer?.id === p.id ? { backgroundColor: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)" } : {}}>
            <span className="text-xs opacity-60">#{p.number}</span>
            {p.first_name} {p.last_name}
            <span className="text-xs opacity-60">{p.position}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-5">
        <Users className="w-4 h-4 text-gray-500" />
        <span className="text-gray-500 text-xs">Compare with:</span>
        <select value={comparePlayer?.id || ""} onChange={e => setComparePlayer(players.find(p => p.id === e.target.value) || null)}
          className="bg-[#141414] border border-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
          <option value="">None</option>
          {players.filter(p => p.id !== selectedPlayer?.id).map(p => (
            <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.position})</option>
          ))}
        </select>
      </div>
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-6 max-w-xl mx-auto">
        <h3 className="text-white text-sm font-semibold mb-4 text-center">
          Attribute Profile — {selectedPlayer.first_name} {selectedPlayer.last_name}
          {comparePlayer && ` vs ${comparePlayer.first_name} ${comparePlayer.last_name}`}
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#333" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#888", fontSize: 11 }} />
            <Radar name={selectedPlayer.first_name} dataKey="value" stroke="var(--color-primary,#f97316)" fill="var(--color-primary,#f97316)" fillOpacity={0.25} strokeWidth={2} />
            {comparePlayer && <Radar name={comparePlayer.first_name} dataKey="compare" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />}
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
            {comparePlayer && <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}