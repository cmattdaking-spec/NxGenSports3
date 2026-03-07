import { useState } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ArrowUp, ArrowDown, Minus, Target, Users, Zap, X, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";

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
const COLORS = ["var(--color-primary,#f97316)", "#3b82f6", "#10b981", "#a855f7", "#eab308"];

export default function PlayerTrends({ players, stats }) {
  const [selectedPlayer, setSelectedPlayer] = useState(players[0] || null);
  const [comparePlayer, setComparePlayer] = useState(null);
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem("nxdown_player_goals");
    return saved ? JSON.parse(saved) : {};
  });
  const [showGoals, setShowGoals] = useState(false);
  const [goalForm, setGoalForm] = useState({});
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [predictInsight, setPredictInsight] = useState("");
  const [predictLoading, setPredictLoading] = useState(false);

  const playerStats = stats.filter(s => s.player_id === selectedPlayer?.id).sort((a, b) => a.week - b.week);
  const compareStats = comparePlayer ? stats.filter(s => s.player_id === comparePlayer.id).sort((a, b) => a.week - b.week) : [];
  const metrics = POSITION_METRICS[selectedPlayer?.position] || ["grade", "snap_count"];
  const playerGoals = selectedPlayer ? goals[selectedPlayer.id] : null;

  const getAvg = (metric, statArr = playerStats) => {
    const vals = statArr.map(s => s[metric] || 0).filter(v => v > 0);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  };

  const getTrend = (metric) => {
    if (playerStats.length < 2) return null;
    const last = playerStats[playerStats.length - 1][metric] || 0;
    const prev = playerStats[playerStats.length - 2][metric] || 0;
    if (last > prev) return "up";
    if (last < prev) return "down";
    return "flat";
  };

  const TrendIcon = ({ metric }) => {
    const t = getTrend(metric);
    if (t === "up") return <ArrowUp className="w-3 h-3 text-green-400" />;
    if (t === "down") return <ArrowDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  const saveGoals = () => {
    const updated = { ...goals, [selectedPlayer.id]: goalForm };
    setGoals(updated);
    localStorage.setItem("nxdown_player_goals", JSON.stringify(updated));
    setShowGoals(false);
  };

  const getAIInsight = async () => {
    if (!selectedPlayer || playerStats.length === 0) return;
    setAiLoading(true);
    setAiInsight("");
    const summary = playerStats.map(s => `Week ${s.week} vs ${s.opponent || "?"}: ${metrics.map(m => `${m}=${s[m] || 0}`).join(", ")}`).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football analytics expert. Analyze this player's performance data:\nPlayer: ${selectedPlayer.first_name} ${selectedPlayer.last_name} (${selectedPlayer.position})\nGoals: ${JSON.stringify(playerGoals || {})}\nStats:\n${summary}\n\nProvide: 1. Key trends 2. Strengths 3. Areas to improve 4. Coaching recommendations. Be specific and data-driven.`,
    });
    setAiInsight(res);
    setAiLoading(false);
  };

  const getPrediction = async () => {
    if (!selectedPlayer || playerStats.length < 2) return;
    setPredictLoading(true);
    setPredictInsight("");
    const summary = playerStats.map(s => `Week ${s.week}: ${metrics.map(m => `${m}=${s[m] || 0}`).join(", ")}`).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a predictive football analytics model. Based on this player's historical weekly stats, predict their NEXT game performance.\nPlayer: ${selectedPlayer.first_name} ${selectedPlayer.last_name} (${selectedPlayer.position})\nHistorical data:\n${summary}\n\nProvide:\n1. Predicted stat ranges for next game (specific numbers)\n2. Confidence level for each prediction\n3. Key factors driving the prediction\n4. Risk factors that could affect performance\n\nBe specific with numbers and brief explanations.`,
    });
    setPredictInsight(res);
    setPredictLoading(false);
  };

  if (!selectedPlayer) return <div className="text-center py-20 text-gray-500">No players found.</div>;

  return (
    <div>
      {/* Player selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {players.map(p => (
          <button key={p.id} onClick={() => { setSelectedPlayer(p); setAiInsight(""); setPredictInsight(""); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${selectedPlayer?.id === p.id ? "text-white" : "bg-[#141414] border-gray-800 text-gray-400 hover:text-white"}`}
            style={selectedPlayer?.id === p.id ? { backgroundColor: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)" } : {}}>
            <span className="text-xs opacity-60">#{p.number}</span>
            {p.first_name} {p.last_name}
            <span className="text-xs opacity-60">{p.position}</span>
          </button>
        ))}
      </div>

      {/* Compare + Goals + Actions */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-gray-500 text-xs">Compare:</span>
          <select value={comparePlayer?.id || ""} onChange={e => setComparePlayer(players.find(p => p.id === e.target.value) || null)}
            className="bg-[#141414] border border-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
            <option value="">None</option>
            {players.filter(p => p.id !== selectedPlayer?.id).map(p => (
              <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.position})</option>
            ))}
          </select>
        </div>
        <button onClick={() => { setGoalForm(playerGoals || {}); setShowGoals(true); }}
          className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 rounded-lg">
          <Target className="w-3.5 h-3.5" /> {playerGoals ? "Edit Goals" : "Set Goals"}
        </button>
        <button onClick={getAIInsight} disabled={aiLoading}
          className="flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg"
          style={{ color: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)4d", backgroundColor: "var(--color-primary,#f97316)1a" }}>
          <Zap className={`w-3.5 h-3.5 ${aiLoading ? "animate-pulse" : ""}`} />
          {aiLoading ? "Analyzing..." : "Nx Insight"}
        </button>
        <button onClick={getPrediction} disabled={predictLoading}
          className="flex items-center gap-1.5 text-xs border border-purple-500/30 bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg">
          <TrendingUp className={`w-3.5 h-3.5 ${predictLoading ? "animate-pulse" : ""}`} />
          {predictLoading ? "Predicting..." : "Predict Next Game"}
        </button>
      </div>

      {playerStats.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No stats logged for {selectedPlayer.first_name} yet.</div>
      ) : (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {metrics.slice(0, 4).map((m) => {
              const avg = getAvg(m);
              const goal = playerGoals?.[m];
              const pct = goal && avg !== "—" ? Math.min((parseFloat(avg) / parseFloat(goal)) * 100, 100) : null;
              return (
                <div key={m} className="bg-[#141414] border border-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-500 text-xs">{metricLabel(m)}</span>
                    <TrendIcon metric={m} />
                  </div>
                  <p className="text-xl font-black text-white">{avg}</p>
                  <p className="text-gray-600 text-xs">avg / game</p>
                  {comparePlayer && <p className="text-blue-400 text-xs mt-1">vs {getAvg(m, compareStats)}</p>}
                  {pct !== null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-600">Goal: {goal}</span>
                        <span className="text-green-400">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI Insight */}
          {aiInsight && (
            <div className="rounded-xl p-4 mb-4 border" style={{ backgroundColor: "var(--color-primary,#f97316)1a", borderColor: "var(--color-primary,#f97316)4d" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
                  <span className="font-medium text-sm" style={{ color: "var(--color-primary,#f97316)" }}>Nx Performance Insight</span>
                </div>
                <button onClick={() => setAiInsight("")} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-line">{aiInsight}</p>
            </div>
          )}

          {/* Predictive Insight */}
          {predictInsight && (
            <div className="rounded-xl p-4 mb-4 border border-purple-500/30 bg-purple-500/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-sm text-purple-400">Predictive Next-Game Projection</span>
                </div>
                <button onClick={() => setPredictInsight("")} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-line">{predictInsight}</p>
            </div>
          )}

          {/* Trend charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {metrics.slice(0, 4).map((metric, i) => {
              const chartData = playerStats.map(s => ({
                week: `Wk ${s.week}`,
                [selectedPlayer.first_name]: s[metric] || 0,
                ...(comparePlayer ? { [comparePlayer.first_name]: compareStats.find(c => c.week === s.week)?.[metric] || 0 } : {})
              }));
              return (
                <div key={metric} className="bg-[#141414] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-white text-sm font-semibold mb-3 flex items-center justify-between">
                    {metricLabel(metric)} Over Time <TrendIcon metric={metric} />
                  </h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="week" tick={{ fill: "#666", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#666", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                      <Line type="monotone" dataKey={selectedPlayer.first_name} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      {comparePlayer && <Line type="monotone" dataKey={comparePlayer.first_name} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />}
                      {comparePlayer && <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Goals Modal */}
      {showGoals && selectedPlayer && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">Set Goals — {selectedPlayer.first_name} {selectedPlayer.last_name}</h2>
              <button onClick={() => setShowGoals(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {metrics.map(m => (
                  <div key={m}>
                    <label className="text-gray-400 text-xs mb-1 block">{metricLabel(m)} goal</label>
                    <input type="number" value={goalForm[m] || ""} onChange={e => setGoalForm(f => ({ ...f, [m]: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowGoals(false)} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={saveGoals} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Save Goals</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}