import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Users, Zap, Plus, X } from "lucide-react";

const POSITION_METRICS = {
  QB: ["completions", "attempts", "passing_yards", "touchdowns", "interceptions", "grade"],
  RB: ["rushing_yards", "tackles", "grade"],
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

export default function Analytics() {
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({});
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [tab, setTab] = useState("trends");

  useEffect(() => {
    Promise.all([
      base44.entities.Player.list(),
      base44.entities.PlayerStat.list("-week", 200),
    ]).then(([p, s]) => {
      setPlayers(p);
      setStats(s);
      if (p.length > 0) setSelectedPlayer(p[0]);
      setLoading(false);
    });
  }, []);

  const playerStats = stats
    .filter(s => s.player_id === selectedPlayer?.id)
    .sort((a, b) => a.week - b.week);

  const metrics = POSITION_METRICS[selectedPlayer?.position] || ["grade", "snap_count"];

  const radarData = metrics.map(m => {
    const vals = playerStats.map(s => s[m] || 0);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { metric: metricLabel(m), value: Math.min(avg, 100) };
  });

  const saveStats = async () => {
    const data = {
      ...form,
      player_id: selectedPlayer.id,
      player_name: `${selectedPlayer.first_name} ${selectedPlayer.last_name}`,
      position: selectedPlayer.position,
      week: Number(form.week),
    };
    await base44.entities.PlayerStat.create(data);
    const updated = await base44.entities.PlayerStat.list("-week", 200);
    setStats(updated);
    setShowAdd(false);
    setForm({});
  };

  const getAIInsight = async () => {
    if (!selectedPlayer || playerStats.length === 0) return;
    setAiLoading(true);
    setAiInsight("");
    const summary = playerStats.map(s =>
      `Week ${s.week} vs ${s.opponent || "?"}: ${metrics.map(m => `${m}=${s[m] || 0}`).join(", ")}`
    ).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football analytics expert. Analyze this player's performance data and provide 3–4 bullet-point insights, including trends, strengths, weaknesses, and specific coaching recommendations.\n\nPlayer: ${selectedPlayer.first_name} ${selectedPlayer.last_name} (${selectedPlayer.position})\n\nStats by week:\n${summary}`,
    });
    setAiInsight(res);
    setAiLoading(false);
  };

  const COLORS = ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#eab308"];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Player <span className="text-orange-500">Analytics</span></h1>
          <p className="text-gray-500 text-sm">Performance trends & AI insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={getAIInsight} disabled={aiLoading || !selectedPlayer}
            className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 px-3 py-2 rounded-lg text-sm font-medium">
            <Zap className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{aiLoading ? "Analyzing..." : "AI Insight"}</span>
          </button>
          <button onClick={() => { setForm({ week: playerStats.length + 1 }); setShowAdd(true); }}
            disabled={!selectedPlayer}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Log Stats
          </button>
        </div>
      </div>

      {/* Player selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {players.map(p => (
          <button key={p.id}
            onClick={() => { setSelectedPlayer(p); setAiInsight(""); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${selectedPlayer?.id === p.id
              ? "bg-orange-500 border-orange-500 text-white"
              : "bg-[#141414] border-gray-800 text-gray-400 hover:border-orange-500/40 hover:text-white"}`}>
            <span className="text-xs text-white/60">#{p.number}</span>
            {p.first_name} {p.last_name}
            <span className="text-xs opacity-60">{p.position}</span>
          </button>
        ))}
      </div>

      {!selectedPlayer ? (
        <div className="text-center py-20 text-gray-500">Select a player to view analytics</div>
      ) : playerStats.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No stats logged for {selectedPlayer.first_name} yet.</p>
          <button onClick={() => { setForm({ week: 1 }); setShowAdd(true); }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Log First Game Stats</button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-[#141414] border border-gray-800 rounded-lg p-1 w-fit">
            {["trends", "radar", "table"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${tab === t ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* AI Insight */}
          {aiInsight && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 font-medium text-sm">AI Performance Insight</span>
                <button onClick={() => setAiInsight("")} className="ml-auto text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-line">{aiInsight}</p>
            </div>
          )}

          {/* Trend Lines */}
          {tab === "trends" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {metrics.slice(0, 4).map((metric, i) => (
                <div key={metric} className="bg-[#141414] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-white text-sm font-semibold mb-3">{metricLabel(metric)} Over Time</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={playerStats} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="week" tick={{ fill: "#666", fontSize: 11 }} label={{ value: "Week", position: "insideBottom", offset: -2, fill: "#555", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#666", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} labelStyle={{ color: "#aaa" }} itemStyle={{ color: COLORS[i % COLORS.length] }} />
                      <Line type="monotone" dataKey={metric} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ fill: COLORS[i % COLORS.length], r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}

          {/* Radar */}
          {tab === "radar" && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-6 max-w-xl mx-auto">
              <h3 className="text-white text-sm font-semibold mb-4 text-center">Attribute Profile — {selectedPlayer.first_name} {selectedPlayer.last_name}</h3>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "#888", fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          {tab === "table" && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-gray-500 px-4 py-3 font-medium">Week</th>
                      <th className="text-left text-gray-500 px-4 py-3 font-medium">Opponent</th>
                      {metrics.map(m => (
                        <th key={m} className="text-center text-gray-500 px-3 py-3 font-medium whitespace-nowrap">{metricLabel(m)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats.map((s, i) => (
                      <tr key={s.id} className={`border-b border-gray-900 ${i % 2 === 0 ? "bg-[#111]" : ""}`}>
                        <td className="text-white px-4 py-3 font-medium">Wk {s.week}</td>
                        <td className="text-gray-400 px-4 py-3">{s.opponent || "—"}</td>
                        {metrics.map(m => (
                          <td key={m} className="text-center text-gray-300 px-3 py-3">{s[m] ?? "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Log Stats Modal */}
      {showAdd && selectedPlayer && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">Log Stats — {selectedPlayer.first_name} {selectedPlayer.last_name}</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Week *</label>
                  <input type="number" value={form.week || ""} onChange={e => setForm({ ...form, week: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Opponent</label>
                  <input value={form.opponent || ""} onChange={e => setForm({ ...form, opponent: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {metrics.map(m => (
                  <div key={m}>
                    <label className="text-gray-400 text-xs mb-1 block">{metricLabel(m)}</label>
                    <input type="number" value={form[m] || ""} onChange={e => setForm({ ...form, [m]: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={saveStats} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium">Save Stats</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}