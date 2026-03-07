import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Plus, X, FileText, CheckCircle, TrendingUp, Shield, Activity, BarChart2, Play, Zap } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import PlayerTrends from "../components/analytics/PlayerTrends";
import PlayerRadar from "../components/analytics/PlayerRadar";
import TeamEfficiency from "../components/analytics/TeamEfficiency";
import InjuryRisk from "../components/analytics/InjuryRisk";
import SeasonReports from "../components/analytics/SeasonReports";
import PostGameWorkflow from "../components/analytics/PostGameWorkflow";

const TABS = [
  { id: "trends", label: "Player Trends", icon: TrendingUp },
  { id: "radar", label: "Radar Profile", icon: Zap },
  { id: "team", label: "Team Efficiency", icon: Shield },
  { id: "injury", label: "Injury Risk", icon: Activity },
  { id: "reports", label: "Reports", icon: BarChart2 },
  { id: "workflow", label: "Post-Game Workflow", icon: Play },
];

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

export default function Analytics() {
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState([]);
  const [games, setGames] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("trends");

  // Log stats modal
  const [showAdd, setShowAdd] = useState(false);
  const [showODK, setShowODK] = useState(false);
  const [form, setForm] = useState({});
  const [odkLoading, setOdkLoading] = useState(false);
  const [odkResult, setOdkResult] = useState(null);
  const [logPlayer, setLogPlayer] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Player.list(),
      base44.entities.PlayerStat.list("-week", 200),
      base44.entities.GameRecord.list(),
      base44.entities.Opponent.list(),
      base44.entities.PlayerHealth.list(),
      base44.entities.WorkoutPlan.list(),
      base44.auth.me(),
    ]).then(([p, s, g, o, h, w, u]) => {
      setPlayers(p);
      setStats(s);
      setGames(g);
      setOpponents(o);
      setHealthRecords(h);
      setWorkouts(w);
      setUser(u);
      setLogPlayer(p[0] || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveStats = async () => {
    if (!logPlayer) return;
    const data = {
      ...form,
      player_id: logPlayer.id,
      player_name: `${logPlayer.first_name} ${logPlayer.last_name}`,
      position: logPlayer.position,
      week: Number(form.week),
    };
    await base44.entities.PlayerStat.create(data);
    const updated = await base44.entities.PlayerStat.list("-week", 200);
    setStats(updated);
    setShowAdd(false);
    setForm({});
  };

  const importODK = async (file) => {
    setOdkLoading(true);
    setOdkResult(null);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          records: {
            type: "array",
            items: {
              type: "object",
              properties: {
                player_name: { type: "string" }, position: { type: "string" }, week: { type: "number" },
                game_date: { type: "string" }, opponent: { type: "string" }, completions: { type: "number" },
                attempts: { type: "number" }, passing_yards: { type: "number" }, rushing_yards: { type: "number" },
                receptions: { type: "number" }, receiving_yards: { type: "number" }, touchdowns: { type: "number" },
                interceptions: { type: "number" }, tackles: { type: "number" }, sacks: { type: "number" },
                forced_fumbles: { type: "number" }, pass_deflections: { type: "number" }, snap_count: { type: "number" }, grade: { type: "number" }
              }
            }
          }
        }
      }
    });
    if (res.status === "success" && res.output?.records?.length > 0) {
      const enriched = res.output.records.map(r => {
        const matched = players.find(p => `${p.first_name} ${p.last_name}`.toLowerCase() === r.player_name?.toLowerCase());
        return { ...r, player_id: matched?.id || "", player_name: r.player_name, position: matched?.position || r.position || "", week: r.week || 1 };
      }).filter(r => r.player_id);
      await base44.entities.PlayerStat.bulkCreate(enriched);
      const updated = await base44.entities.PlayerStat.list("-week", 200);
      setStats(updated);
      setOdkResult({ success: true, count: enriched.length, total: res.output.records.length });
    } else {
      setOdkResult({ success: false, error: res.details || "Could not parse file" });
    }
    setOdkLoading(false);
  };

  const metrics = POSITION_METRICS[logPlayer?.position] || ["grade", "snap_count"];

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Nx<span style={{ color: "var(--color-primary,#f97316)" }}>Analytics</span></h1>
          <p className="text-gray-500 text-sm">Advanced performance intelligence & coaching insights</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => setShowODK(true)}
            className="flex items-center gap-2 bg-[#141414] border border-gray-700 hover:border-gray-500 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium">
            <Upload className="w-4 h-4" />
            <span className="hidden md:inline">ODK Import</span>
          </button>
          <button onClick={() => { setForm({ week: stats.filter(s => s.player_id === logPlayer?.id).length + 1 }); setShowAdd(true); }}
            disabled={!logPlayer}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <Plus className="w-4 h-4" /> Log Stats
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 bg-[#141414] border border-gray-800 rounded-lg p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${tab === id ? "text-white" : "text-gray-400 hover:text-white"}`}
            style={tab === id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "trends" && <PlayerTrends players={players} stats={stats} />}
      {tab === "radar" && <PlayerRadar players={players} stats={stats} />}
      {tab === "team" && <TeamEfficiency players={players} stats={stats} games={games} />}
      {tab === "injury" && <InjuryRisk players={players} stats={stats} healthRecords={healthRecords} workouts={workouts} />}
      {tab === "reports" && <SeasonReports players={players} stats={stats} games={games} opponents={opponents} />}
      {tab === "workflow" && <PostGameWorkflow players={players} stats={stats} games={games} user={user} />}

      {/* Log Stats Modal */}
      {showAdd && logPlayer && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex-1 mr-3">
                <h2 className="text-white font-bold mb-1">Log Game Stats</h2>
                <select value={logPlayer?.id || ""} onChange={e => setLogPlayer(players.find(p => p.id === e.target.value) || null)}
                  className="bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1 rounded text-sm w-full">
                  {players.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.position})</option>)}
                </select>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Week *</label>
                  <input type="number" value={form.week || ""} onChange={e => setForm({ ...form, week: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Opponent</label>
                  <input value={form.opponent || ""} onChange={e => setForm({ ...form, opponent: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {metrics.map(m => (
                  <div key={m}>
                    <label className="text-gray-400 text-xs mb-1 block">{m.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</label>
                    <input type="number" value={form[m] || ""} onChange={e => setForm({ ...form, [m]: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={saveStats} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Save Stats</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ODK Import Modal */}
      {showODK && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h2 className="text-white font-bold">Import ODK Data</h2>
              </div>
              <button onClick={() => { setShowODK(false); setOdkResult(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-gray-400 text-sm">Upload a CSV or Excel export from ODK or any third-party stats platform.</p>
              {odkLoading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Parsing and importing stats...</p>
                </div>
              ) : odkResult ? (
                <div className={`rounded-xl p-4 flex items-start gap-3 ${odkResult.success ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                  {odkResult.success ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-green-400 font-semibold text-sm">Import Successful</p>
                        <p className="text-gray-400 text-xs mt-1">{odkResult.count} of {odkResult.total} records imported.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-red-400 font-semibold text-sm">Import Failed</p>
                        <p className="text-gray-400 text-xs mt-1">{odkResult.error}</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl p-8 cursor-pointer transition-colors">
                  <Upload className="w-8 h-8 text-gray-500 mb-2" />
                  <p className="text-gray-400 text-sm font-medium">Click to upload ODK file</p>
                  <p className="text-gray-600 text-xs mt-1">CSV or Excel (.xlsx)</p>
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files[0] && importODK(e.target.files[0])} />
                </label>
              )}
              <button onClick={() => { setShowODK(false); setOdkResult(null); }} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}