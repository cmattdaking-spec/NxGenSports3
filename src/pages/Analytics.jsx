import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Zap, Plus, X, Users, Target, ArrowUp, ArrowDown, Minus, Upload, FileText, CheckCircle } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";

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

export default function Analytics() {
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [comparePlayer, setComparePlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({});
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [tab, setTab] = useState("trends");
  const [goals, setGoals] = useState({});
  const [showGoals, setShowGoals] = useState(false);
  const [goalForm, setGoalForm] = useState({});
  const [showODK, setShowODK] = useState(false);
  const [odkLoading, setOdkLoading] = useState(false);
  const [odkResult, setOdkResult] = useState(null);

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
    // Load saved goals
    const saved = localStorage.getItem("nxdown_player_goals");
    if (saved) setGoals(JSON.parse(saved));
  }, []);

  const playerStats = stats
    .filter(s => s.player_id === selectedPlayer?.id)
    .sort((a, b) => a.week - b.week);

  const compareStats = comparePlayer
    ? stats.filter(s => s.player_id === comparePlayer?.id).sort((a, b) => a.week - b.week)
    : [];

  const metrics = POSITION_METRICS[selectedPlayer?.position] || ["grade", "snap_count"];

  const radarData = metrics.map(m => {
    const vals = playerStats.map(s => s[m] || 0);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const compareVals = compareStats.map(s => s[m] || 0);
    const compareAvg = compareVals.length ? compareVals.reduce((a, b) => a + b, 0) / compareVals.length : 0;
    return { metric: metricLabel(m), value: Math.min(avg, 100), compare: Math.min(compareAvg, 100) };
  });

  // Trend: compare last 2 weeks
  const getTrend = (metric) => {
    if (playerStats.length < 2) return null;
    const last = playerStats[playerStats.length - 1][metric] || 0;
    const prev = playerStats[playerStats.length - 2][metric] || 0;
    if (last > prev) return "up";
    if (last < prev) return "down";
    return "flat";
  };

  // Average for metric
  const getAvg = (metric, statArr = playerStats) => {
    const vals = statArr.map(s => s[metric] || 0).filter(v => v > 0);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  };

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
    const playerGoals = goals[selectedPlayer.id];
    const goalsStr = playerGoals ? `Player Goals: ${JSON.stringify(playerGoals)}` : "";
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football analytics expert for the NxDown platform. Analyze this player's performance data and provide:\n1. Key performance trends (improving/declining stats)\n2. Strengths based on data\n3. Areas needing improvement\n4. Specific coaching recommendations\n5. Progress toward goals (if provided)\n\nPlayer: ${selectedPlayer.first_name} ${selectedPlayer.last_name} (${selectedPlayer.position})\n${goalsStr}\n\nStats by week:\n${summary}\n\nBe specific, data-driven, and actionable.`,
    });
    setAiInsight(res);
    setAiLoading(false);
  };



  const saveGoals = () => {
    const updated = { ...goals, [selectedPlayer.id]: goalForm };
    setGoals(updated);
    localStorage.setItem("nxdown_player_goals", JSON.stringify(updated));
    setShowGoals(false);
  };

  const playerGoals = selectedPlayer ? goals[selectedPlayer.id] : null;

  const TrendIcon = ({ metric }) => {
    const t = getTrend(metric);
    if (t === "up") return <ArrowUp className="w-3 h-3 text-green-400" />;
    if (t === "down") return <ArrowDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Nx <span style={{ color: "var(--color-primary,#f97316)" }}>Analytics</span></h1>
          <p className="text-gray-500 text-sm">Performance trends, comparisons & Nx insights</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={getAIInsight} disabled={aiLoading || !selectedPlayer}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border"
            style={{ backgroundColor: "var(--color-primary,#f97316)1a", borderColor: "var(--color-primary,#f97316)4d", color: "var(--color-primary,#f97316)" }}>
            <Zap className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{aiLoading ? "Analyzing..." : "Nx Insight"}</span>
          </button>
          <button onClick={() => { setForm({ week: playerStats.length + 1 }); setShowAdd(true); }}
            disabled={!selectedPlayer}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <Plus className="w-4 h-4" /> Log Stats
          </button>
        </div>
      </div>

      {/* Player selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {players.map(p => (
          <button key={p.id}
            onClick={() => { setSelectedPlayer(p); setAiInsight(""); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${selectedPlayer?.id === p.id
              ? "text-white"
              : "bg-[#141414] border-gray-800 text-gray-400 hover:text-white"}`}
            style={selectedPlayer?.id === p.id ? { backgroundColor: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)" } : {}}>
            <span className="text-xs opacity-60">#{p.number}</span>
            {p.first_name} {p.last_name}
            <span className="text-xs opacity-60">{p.position}</span>
          </button>
        ))}
      </div>

      {/* Compare + Goals bar */}
      {selectedPlayer && playerStats.length > 0 && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-xs">Compare with:</span>
            <select
              value={comparePlayer?.id || ""}
              onChange={e => setComparePlayer(players.find(p => p.id === e.target.value) || null)}
              className="bg-[#141414] border border-gray-700 text-gray-300 px-2 py-1 rounded text-xs focus:outline-none focus:border-orange-500">
              <option value="">None</option>
              {players.filter(p => p.id !== selectedPlayer?.id).map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.position})</option>
              ))}
            </select>
          </div>
          <button onClick={() => { setGoalForm(playerGoals || {}); setShowGoals(true); }}
            className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-all">
            <Target className="w-3.5 h-3.5" /> {playerGoals ? "Edit Goals" : "Set Goals"}
          </button>
          {playerGoals && (
            <div className="flex gap-2 flex-wrap">
              {Object.entries(playerGoals).slice(0, 3).map(([k, v]) => (
                <span key={k} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  {metricLabel(k)}: {v}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedPlayer ? (
        <div className="text-center py-20 text-gray-500">Select a player to view analytics</div>
      ) : playerStats.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No stats logged for {selectedPlayer.first_name} yet.</p>
          <button onClick={() => { setForm({ week: 1 }); setShowAdd(true); }}
            className="text-white px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Log First Game Stats</button>
        </div>
      ) : (
        <>
          {/* Quick stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {metrics.slice(0, 4).map((m, i) => {
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
                  {comparePlayer && (
                    <p className="text-blue-400 text-xs mt-1">vs {getAvg(m, compareStats)}</p>
                  )}
                  {pct !== null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-600">Goal: {goal}</span>
                        <span className="text-green-400">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-[#141414] border border-gray-800 rounded-lg p-1 w-fit overflow-x-auto">
            {["trends", "radar", "table"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all whitespace-nowrap ${tab === t ? "text-white" : "text-gray-400 hover:text-white"}`}
                style={tab === t ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
                {t}
              </button>
            ))}
          </div>

          {/* AI Insight */}
          {aiInsight && (
            <div className="rounded-xl p-4 mb-5 border" style={{ backgroundColor: "var(--color-primary,#f97316)1a", borderColor: "var(--color-primary,#f97316)4d" }}>
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

          {/* Trends */}
          {tab === "trends" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {metrics.slice(0, 4).map((metric, i) => {
                const chartData = playerStats.map(s => ({
                  week: `Wk ${s.week}`,
                  [selectedPlayer.first_name]: s[metric] || 0,
                  ...(comparePlayer ? {
                    [comparePlayer.first_name]: compareStats.find(c => c.week === s.week)?.[metric] || 0
                  } : {})
                }));
                return (
                  <div key={metric} className="bg-[#141414] border border-gray-800 rounded-xl p-4">
                    <h3 className="text-white text-sm font-semibold mb-3 flex items-center justify-between">
                      {metricLabel(metric)} Over Time
                      <TrendIcon metric={metric} />
                    </h3>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="week" tick={{ fill: "#666", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#666", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} labelStyle={{ color: "#aaa" }} />
                        <Line type="monotone" dataKey={selectedPlayer.first_name} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ fill: COLORS[i % COLORS.length], r: 4 }} activeDot={{ r: 6 }} />
                        {comparePlayer && (
                          <Line type="monotone" dataKey={comparePlayer.first_name} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" dot={{ fill: "#3b82f6", r: 3 }} />
                        )}
                        {comparePlayer && <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          )}

          {/* Radar */}
          {tab === "radar" && (
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
                  {comparePlayer && (
                    <Radar name={comparePlayer.first_name} dataKey="compare" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                  )}
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                  {comparePlayer && <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />}
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
                        <th key={m} className="text-center text-gray-500 px-3 py-3 font-medium whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {metricLabel(m)}
                            {playerGoals?.[m] && <span className="text-blue-400 text-xs">/{playerGoals[m]}</span>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats.map((s, i) => (
                      <tr key={s.id} className={`border-b border-gray-900 ${i % 2 === 0 ? "bg-[#111]" : ""}`}>
                        <td className="text-white px-4 py-3 font-medium">Wk {s.week}</td>
                        <td className="text-gray-400 px-4 py-3">{s.opponent || "—"}</td>
                        {metrics.map(m => {
                          const val = s[m];
                          const goal = playerGoals?.[m];
                          const meetsGoal = goal && val >= parseFloat(goal);
                          return (
                            <td key={m} className={`text-center px-3 py-3 ${meetsGoal ? "text-green-400 font-semibold" : "text-gray-300"}`}>
                              {val ?? "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Averages row */}
                    <tr className="border-t border-gray-700 bg-[#0d0d0d]">
                      <td colSpan={2} className="px-4 py-3 font-semibold text-xs uppercase" style={{ color: "var(--color-primary,#f97316)" }}>Season Avg</td>
                      {metrics.map(m => (
                        <td key={m} className="text-center font-bold px-3 py-3 text-sm" style={{ color: "var(--color-primary,#f97316)" }}>{getAvg(m)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}


        </>
      )}

      {/* Set Goals Modal */}
      {showGoals && selectedPlayer && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">Set Goals — {selectedPlayer.first_name} {selectedPlayer.last_name}</h2>
              <button onClick={() => setShowGoals(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-gray-500 text-xs">Set per-game target values to track progress</p>
              <div className="grid grid-cols-2 gap-3">
                {metrics.map(m => (
                  <div key={m}>
                    <label className="text-gray-400 text-xs mb-1 block">{metricLabel(m)} goal</label>
                    <input type="number" value={goalForm[m] || ""} onChange={e => setGoalForm(f => ({ ...f, [m]: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowGoals(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={saveGoals} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">Save Goals</button>
              </div>
            </div>
          </div>
        </div>
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
                <button onClick={saveStats} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Save Stats</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}