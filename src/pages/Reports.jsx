import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSport } from "@/components/SportContext";
import { getSportConfig } from "@/components/SportConfig";
import { BarChart2, Activity, GraduationCap, TrendingUp, AlertTriangle, Brain } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import LoadingScreen from "../components/LoadingScreen";
import AIProgramReport from "../components/reports/AIProgramReport";

const TABS = [
  { id: "ai_report",   label: "AI Report",           icon: Brain },
  { id: "performance", label: "Performance Trends",  icon: TrendingUp },
  { id: "health",      label: "Health & Injuries",   icon: Activity },
  { id: "academic",    label: "Academic Compliance", icon: GraduationCap },
];

const AVAIL_COLORS = { full: "#22c55e", limited: "#f59e0b", out: "#ef4444", day_to_day: "#f97316" };

const TooltipStyle = { contentStyle: { backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff", fontSize: 12 } };

export default function Reports() {
  const { activeSport } = useSport();
  const sportCfg = getSportConfig(activeSport);
  const [tab, setTab] = useState("ai_report");
  const [metrics, setMetrics] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.PerformanceMetric.list("-game_date", 200),
      base44.entities.PlayerHealth.list("-date", 200),
      base44.entities.Player.filter({ sport: activeSport }),
    ]).then(([met, health, pls]) => {
      setMetrics(met); setHealthRecords(health); setPlayers(pls); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  // ── Performance data ──────────────────────────────────────────────────────
  const playerNames = [...new Set(metrics.map(m => m.player_name).filter(Boolean))];
  const filteredMetrics = selectedPlayer === "all" ? metrics : metrics.filter(m => m.player_name === selectedPlayer);
  const trendData = filteredMetrics
    .filter(m => m.game_date)
    .sort((a, b) => new Date(a.game_date) - new Date(b.game_date))
    .map(m => ({ date: m.game_date?.slice(5), grade: m.play_grade, speed: m.top_speed_mph, snaps: m.snap_count }));

  // ── Health data ───────────────────────────────────────────────────────────
  const latestByPlayer = {};
  healthRecords.forEach(r => {
    if (!latestByPlayer[r.player_id] || new Date(r.date) > new Date(latestByPlayer[r.player_id].date))
      latestByPlayer[r.player_id] = r;
  });
  const currentHealth = Object.values(latestByPlayer);
  const availCounts = ["full", "limited", "day_to_day", "out"].map(a => ({
    name: a.replace("_", " "), value: currentHealth.filter(r => r.availability === a).length, color: AVAIL_COLORS[a]
  }));
  const injuryTypeMap = {};
  currentHealth.filter(r => r.injury_type).forEach(r => { injuryTypeMap[r.injury_type] = (injuryTypeMap[r.injury_type] || 0) + 1; });
  const injuryData = Object.entries(injuryTypeMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  const currentInjured = currentHealth.filter(r => r.availability !== "full" && r.injury_type);

  // ── Academic data ─────────────────────────────────────────────────────────
  const eligibleCount = players.filter(p => p.academic_eligible !== false).length;
  const ineligibleCount = players.filter(p => p.academic_eligible === false).length;
  const gpaRanges = [
    { name: "4.0+", count: players.filter(p => p.gpa >= 4.0).length, risk: false },
    { name: "3.5-3.9", count: players.filter(p => p.gpa >= 3.5 && p.gpa < 4.0).length, risk: false },
    { name: "3.0-3.4", count: players.filter(p => p.gpa >= 3.0 && p.gpa < 3.5).length, risk: false },
    { name: "2.5-2.9", count: players.filter(p => p.gpa >= 2.5 && p.gpa < 3.0).length, risk: false },
    { name: "2.0-2.4", count: players.filter(p => p.gpa >= 2.0 && p.gpa < 2.5).length, risk: true },
    { name: "<2.0",    count: players.filter(p => p.gpa > 0 && p.gpa < 2.0).length, risk: true },
    { name: "No GPA",  count: players.filter(p => !p.gpa).length, risk: false },
  ];
  const atRiskPlayers = players.filter(p => p.academic_eligible === false || (p.gpa && p.gpa < 2.0));

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#f97316)22" }}>
          <BarChart2 className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white capitalize">{activeSport.replace(/_/g," ")} <span style={{ color: "var(--color-primary,#f97316)" }}>Reports</span></h1>
          <p className="text-gray-500 text-sm">Performance trends, health summaries, compliance tracking</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#141414] border border-gray-800 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t.id ? "text-white" : "text-gray-400 hover:text-white"}`}
            style={tab === t.id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
            <t.icon className="w-4 h-4" /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── AI Program Report ── */}
      {tab === "ai_report" && <AIProgramReport />}

      {/* ── Performance Trends ── */}
      {tab === "performance" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}
              className="bg-[#141414] border border-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none">
              <option value="all">All Players</option>
              {playerNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <p className="text-gray-500 text-xs">{filteredMetrics.length} data points</p>
          </div>

          {trendData.filter(d => d.grade).length > 0 ? (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Play Grade Over Time</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData.filter(d => d.grade)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip {...TooltipStyle} />
                  <Line type="monotone" dataKey="grade" stroke="var(--color-primary,#f97316)" strokeWidth={2} dot={{ r: 3 }} name="Play Grade" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-12 text-center">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500 text-sm">No performance metrics logged yet.</p>
              <p className="text-gray-600 text-xs mt-1">Log metrics in Performance Analytics to see trends here.</p>
            </div>
          )}

          {trendData.filter(d => d.speed).length > 0 && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Top Speed (mph) Over Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData.filter(d => d.speed)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip {...TooltipStyle} />
                  <Line type="monotone" dataKey="speed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Top Speed" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Health & Injuries ── */}
      {tab === "health" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availCounts.map(a => (
              <div key={a.name} className="bg-[#141414] border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs capitalize mb-1">{a.name}</p>
                <p className="text-3xl font-black" style={{ color: a.color }}>{a.value}</p>
              </div>
            ))}
          </div>

          {injuryData.length > 0 && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Injury Type Frequency</h3>
              <ResponsiveContainer width="100%" height={Math.max(160, injuryData.length * 35)}>
                <BarChart data={injuryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} width={130} />
                  <Tooltip {...TooltipStyle} />
                  <Bar dataKey="count" fill="var(--color-primary,#f97316)" radius={[0, 4, 4, 0]} name="Players" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {currentInjured.length > 0 ? (
            <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-white font-semibold text-sm">Currently Injured / Limited ({currentInjured.length})</h3>
              </div>
              <div className="divide-y divide-gray-800/50">
                {currentInjured.map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" }}>
                      {r.player_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{r.player_name}</p>
                      <p className="text-gray-500 text-xs">{r.injury_type}{r.injury_location ? ` · ${r.injury_location}` : ""}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.availability === "out" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {r.availability.replace("_", " ")}
                      </span>
                      {r.estimated_return && <p className="text-gray-600 text-xs mt-0.5">Return: {r.estimated_return}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 text-center">
              <p className="text-green-400 font-semibold">All players at full availability</p>
            </div>
          )}
        </div>
      )}

      {/* ── Academic Compliance ── */}
      {tab === "academic" && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#141414] border border-green-500/20 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">Eligible</p>
              <p className="text-3xl font-black text-green-400">{eligibleCount}</p>
            </div>
            <div className="bg-[#141414] border border-red-500/20 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">Ineligible</p>
              <p className="text-3xl font-black text-red-400">{ineligibleCount}</p>
            </div>
            <div className="bg-[#141414] border border-yellow-500/20 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">At Risk</p>
              <p className="text-3xl font-black text-yellow-400">{atRiskPlayers.length}</p>
            </div>
          </div>

          <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">GPA Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gpaRanges}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Tooltip {...TooltipStyle} />
                <Bar dataKey="count" name="Players" radius={[4, 4, 0, 0]}>
                  {gpaRanges.map((entry, i) => (
                    <Cell key={i} fill={entry.name === "<2.0" ? "#ef4444" : entry.name === "2.0-2.4" ? "#f97316" : "var(--color-primary,#3b82f6)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {atRiskPlayers.length > 0 && (
            <div className="bg-[#141414] border border-yellow-500/20 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <h3 className="text-white font-semibold text-sm">At-Risk Players ({atRiskPlayers.length})</h3>
              </div>
              <div className="divide-y divide-gray-800/50">
                {atRiskPlayers.map(p => (
                  <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#f59e0b22", color: "#f59e0b" }}>
                      {p.first_name?.[0]}{p.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{p.first_name} {p.last_name}</p>
                      <p className="text-gray-500 text-xs">{p.position} · {p.year || "—"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {p.gpa ? <p className="text-white text-sm font-bold">{p.gpa.toFixed(2)} GPA</p> : null}
                      {p.academic_eligible === false && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Ineligible</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}