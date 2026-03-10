import { useState, useEffect } from "react";
import { useSport } from "@/components/SportContext";
import { getSportConfig } from "@/components/SportConfig";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, Activity, AlertTriangle, CheckCircle, Clock, Brain, ShieldAlert, Flame } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import MedicalTab from "../components/health/MedicalTab";
import TrainerDashboard from "../components/health/TrainerDashboard";
import PerformanceTab from "../components/health/PerformanceTab";

const AVAILABILITY = ["full","limited","out","day_to_day"];
const LOAD_ALERT_ROLES = ["head_coach","admin","trainer","strength_conditioning_coordinator"];
const AVAILABILITY_CONFIG = {
  full: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle, label: "Full" },
  limited: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock, label: "Limited" },
  out: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle, label: "Out" },
  day_to_day: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: Clock, label: "Day-to-Day" },
};
const RISK_COLOR = { Low: "text-green-400 bg-green-500/20 border-green-500/30", Medium: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30", High: "text-red-400 bg-red-500/20 border-red-500/30", Critical: "text-red-500 bg-red-600/20 border-red-600/30" };

export default function PlayerHealth() {
  const { activeSport } = useSport();
  const sportCfg = getSportConfig(activeSport);
  const [records, setRecords] = useState([]);
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loadAlerts, setLoadAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [filterAvail, setFilterAvail] = useState("all");
  const [user, setUser] = useState(null);
  const [riskReport, setRiskReport] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [tab, setTab] = useState("health");

  const load = async () => {
    const [r, p, s, w] = await Promise.all([
      base44.entities.PlayerHealth.list("-date"),
      base44.entities.Player.filter({ sport: activeSport }),
      base44.entities.PlayerStat.list("-week", 100),
      base44.entities.WorkoutPlan.filter({ sport: activeSport }, "-date", 60)
    ]);
    setRecords(r); setPlayers(p); setStats(s); setWorkouts(w); setLoading(false);
    // Compute S&C load alerts
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentHigh = w.filter(wk => new Date(wk.date) >= sevenDaysAgo && (wk.intensity === "high" || wk.intensity === "max") && wk.status === "completed");
    if (recentHigh.length >= 3) {
      setLoadAlerts([{ message: `${recentHigh.length} high-intensity S&C sessions in the last 7 days — players may be fatigued. Consider scheduling recovery workouts.` }]);
    }
  };
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); load(); }, [activeSport]);

  const canEdit = user && user.coaching_role !== "athletic_director" && user.role !== "athletic_director";
  const canSeeLoadAlerts = user && (LOAD_ALERT_ROLES.includes(user.coaching_role) || user.role === "admin");

  // Granular permission gate — trainers + HC/AD always get access; others need explicit grant
  const ALWAYS_MEDICAL = ["head_coach","associate_head_coach","athletic_director","trainer","strength_conditioning_coordinator"];
  const hasMedicalAccess = user && (ALWAYS_MEDICAL.includes(user.coaching_role) || user.can_view_medical === true || user.role === "admin");

  if (user && !hasMedicalAccess) return (
    <div className="bg-[#0a0a0a] min-h-full flex items-center justify-center">
      <div className="text-center">
        <Activity className="w-12 h-12 mx-auto mb-3 text-gray-700" />
        <p className="text-white font-semibold">Access Restricted</p>
        <p className="text-gray-500 text-sm mt-1">Medical data access must be granted by your Head Coach or Athletic Director.</p>
      </div>
    </div>
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ availability: "full", cleared_to_play: true, date: new Date().toISOString().split("T")[0] });
    setShowForm(true);
  };
  const openEdit = (r) => { setEditing(r); setForm({...r}); setShowForm(true); };
  const save = async () => {
    if (editing) await base44.entities.PlayerHealth.update(editing.id, form);
    else await base44.entities.PlayerHealth.create(form);
    setShowForm(false); load();
  };
  const remove = async (id) => { if (confirm("Delete health record?")) { await base44.entities.PlayerHealth.delete(id); load(); } };

  const handlePlayerSelect = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) setForm(f => ({ ...f, player_id: playerId, player_name: `${player.first_name} ${player.last_name}` }));
  };

  const generateInjuryRiskReport = async () => {
    setRiskLoading(true);
    setRiskReport(null);
    setShowRiskModal(true);

    // Build per-player health context
    const latestByPlayer = {};
    records.forEach(r => {
      if (!latestByPlayer[r.player_id] || new Date(r.date) > new Date(latestByPlayer[r.player_id].date))
        latestByPlayer[r.player_id] = r;
    });

    const playerContext = players.map(p => {
      const health = latestByPlayer[p.id];
      const playerStats = stats.filter(s => s.player_id === p.id).sort((a,b) => b.week - a.week).slice(0, 4);
      const avgGrade = playerStats.length ? (playerStats.reduce((sum, s) => sum + (s.grade || 0), 0) / playerStats.length).toFixed(1) : "N/A";
      const avgSnaps = playerStats.length ? (playerStats.reduce((sum, s) => sum + (s.snap_count || 0), 0) / playerStats.length).toFixed(0) : "N/A";
      return `${p.first_name} ${p.last_name} (${p.position}, ${p.year || "Unknown year"}, Weight: ${p.weight || "?"}lbs) — Status: ${p.status}, Availability: ${health?.availability || "unknown"}, Current Injury: ${health?.injury_type || "none"}, Avg Grade: ${avgGrade}, Avg Snaps: ${avgSnaps}, Prior injuries: ${records.filter(r => r.player_id === p.id && r.injury_type).length}`;
    }).join("\n");

    const sportName = activeSport.replace(/_/g, " ");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite sports medicine and performance AI for ${sportName}. Analyze the following player data and generate a comprehensive injury risk assessment and load management report. Consider sport-specific common injuries and demands for ${sportName}.

Players:
${playerContext}

Provide a detailed risk analysis for each at-risk player, load management recommendations, and sport-specific preventative protocols.`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_team_risk: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
          summary: { type: "string" },
          at_risk_players: {
            type: "array",
            items: {
              type: "object",
              properties: {
                player_name: { type: "string" },
                position: { type: "string" },
                risk_level: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
                risk_factors: { type: "array", items: { type: "string" } },
                load_management: { type: "string" },
                preventative_exercises: { type: "array", items: { type: "string" } },
                return_to_play_notes: { type: "string" }
              }
            }
          },
          team_recommendations: { type: "array", items: { type: "string" } },
          high_priority_actions: { type: "array", items: { type: "string" } }
        }
      }
    });
    setRiskReport(res);
    setRiskLoading(false);
  };

  const filtered = records.filter(r => filterAvail === "all" || r.availability === filterAvail);

  const latestByPlayer = {};
  records.forEach(r => {
    if (!latestByPlayer[r.player_id] || new Date(r.date) > new Date(latestByPlayer[r.player_id].date))
      latestByPlayer[r.player_id] = r;
  });

  const availStats = AVAILABILITY.reduce((acc, a) => {
    acc[a] = Object.values(latestByPlayer).filter(r => r.availability === a).length;
    return acc;
  }, {});

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#141414] border border-gray-800 rounded-lg p-1 w-fit">
        {[{ id: "health", label: "Health Records" }, { id: "dashboard", label: "Trainer Dashboard" }, { id: "performance", label: "Performance" }, { id: "medical", label: "Medical / Concussion" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t.id ? "text-white" : "text-gray-400 hover:text-white"}`}
            style={tab === t.id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "medical" && <MedicalTab players={players} />}

      {tab === "performance" && (
        <div className="mt-2">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-white">Player <span style={{ color: "var(--color-primary,#f97316)" }}>Performance</span></h1>
            <p className="text-gray-500 text-sm">Metrics over time, training load vs performance, health correlations</p>
          </div>
          <PerformanceTab stats={stats} records={records} players={players} />
        </div>
      )}

      {tab === "dashboard" && (
        <div className="mt-2">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-white">Trainer <span style={{ color: "var(--color-primary,#f97316)" }}>Dashboard</span></h1>
            <p className="text-gray-500 text-sm">Health analytics and load management overview</p>
          </div>
          <TrainerDashboard records={records} players={players} workouts={workouts} />
        </div>
      )}

      {tab === "health" && <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Player <span style={{ color: "var(--color-primary,#f97316)" }}>Health</span></h1>
          <p className="text-gray-500 text-sm">{records.length} health records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateInjuryRiskReport} disabled={riskLoading}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm font-medium transition-all">
            <Brain className={`w-4 h-4 ${riskLoading ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{riskLoading ? "Analyzing..." : "Nx Risk Analysis"}</span>
          </button>
          {canEdit && (
            <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              <Plus className="w-4 h-4" /> Log Health
            </button>
          )}
        </div>
      </div>

      {/* S&C Load Alerts - HC/Trainer only */}
      {canSeeLoadAlerts && loadAlerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {loadAlerts.map((alert, i) => (
            <div key={i} className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-400 text-sm font-semibold">S&C High Load Alert</p>
                <p className="text-gray-300 text-sm mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {AVAILABILITY.map(a => {
          const cfg = AVAILABILITY_CONFIG[a];
          const Icon = cfg.icon;
          return (
            <button key={a} onClick={() => setFilterAvail(filterAvail === a ? "all" : a)}
              className={`p-4 rounded-xl border transition-all ${filterAvail === a ? cfg.color : "bg-[#141414] border-gray-800 text-gray-400"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{cfg.label}</span>
              </div>
              <p className="text-2xl font-black">{availStats[a] || 0}</p>
            </button>
          );
        })}
      </div>

      {/* Health Records */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Player</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Date</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Availability</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Injury</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Est. Return</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Cleared</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-10">No health records found</td></tr>
              ) : filtered.map(r => {
                const cfg = AVAILABILITY_CONFIG[r.availability];
                const Icon = cfg?.icon || Activity;
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{r.player_name}</p>
                      {r.reported_by && <p className="text-gray-500 text-xs">by {r.reported_by}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit border ${cfg?.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.injury_type ? (
                        <div>
                          <p className="text-gray-300 text-sm">{r.injury_type}</p>
                          {r.injury_location && <p className="text-gray-500 text-xs">{r.injury_location}</p>}
                        </div>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{r.estimated_return || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.cleared_to_play ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {r.cleared_to_play ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openEdit(r)} className="text-gray-500 transition-colors" onMouseEnter={e => e.currentTarget.style.color="var(--color-primary,#f97316)"} onMouseLeave={e => e.currentTarget.style.color=""}><Edit className="w-4 h-4" /></button>
                          <button onClick={() => remove(r.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nx Injury Risk Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-red-500/30 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h2 className="text-white font-bold">Nx Injury Risk Analysis</h2>
                <span className="text-red-400 text-xs bg-red-500/20 px-2 py-0.5 rounded-full">AI-Powered</span>
              </div>
              <button onClick={() => { setShowRiskModal(false); setRiskReport(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              {riskLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Nx Intelligence analyzing player health data, training loads, and performance metrics...</p>
                </div>
              ) : riskReport ? (
                <div className="space-y-5">
                  {/* Team Risk */}
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">Team Risk Level:</span>
                    <span className={`text-sm font-bold px-3 py-0.5 rounded-full border ${RISK_COLOR[riskReport.overall_team_risk]}`}>
                      {riskReport.overall_team_risk}
                    </span>
                  </div>

                  {riskReport.summary && (
                    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-700">
                      <p className="text-gray-300 text-sm leading-relaxed">{riskReport.summary}</p>
                    </div>
                  )}

                  {/* High Priority Actions */}
                  {riskReport.high_priority_actions?.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                      <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">High Priority Actions</p>
                      <ul className="space-y-1.5">
                        {riskReport.high_priority_actions.map((a, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" /> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* At-Risk Players */}
                  {riskReport.at_risk_players?.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Player Risk Profiles</p>
                      <div className="space-y-3">
                        {riskReport.at_risk_players.map((p, i) => (
                          <div key={i} className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-white font-semibold">{p.player_name}</p>
                                <p className="text-gray-500 text-xs">{p.position}</p>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RISK_COLOR[p.risk_level]}`}>
                                {p.risk_level} Risk
                              </span>
                            </div>
                            {p.risk_factors?.length > 0 && (
                              <div className="mb-3">
                                <p className="text-gray-500 text-xs uppercase mb-1">Risk Factors</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {p.risk_factors.map((f, j) => (
                                    <span key={j} className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded">{f}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {p.load_management && (
                              <div className="mb-3">
                                <p className="text-gray-500 text-xs uppercase mb-1">Load Management</p>
                                <p className="text-gray-300 text-sm">{p.load_management}</p>
                              </div>
                            )}
                            {p.preventative_exercises?.length > 0 && (
                              <div className="mb-2">
                                <p className="text-gray-500 text-xs uppercase mb-1">Preventative Exercises</p>
                                <ul className="space-y-0.5">
                                  {p.preventative_exercises.map((e, j) => (
                                    <li key={j} className="text-green-300 text-xs flex items-start gap-1.5">
                                      <span className="text-green-500 mt-0.5">·</span> {e}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {p.return_to_play_notes && (
                              <p className="text-blue-300 text-xs italic">↳ {p.return_to_play_notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Team Recommendations */}
                  {riskReport.team_recommendations?.length > 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                      <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Team-Wide Recommendations</p>
                      <ul className="space-y-1.5">
                        {riskReport.team_recommendations.map((r, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">✓</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      </>}

      {/* Log/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Health Record" : "Log Health Status"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Player *</label>
                  <select value={form.player_id || ""} onChange={e => handlePlayerSelect(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="">Select player...</option>
                    {players.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.position})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Date</label>
                  <input type="date" value={form.date || ""} onChange={e => setForm({...form, date: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Availability *</label>
                  <select value={form.availability || "full"} onChange={e => setForm({...form, availability: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    {AVAILABILITY.map(a => <option key={a} value={a}>{a.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Injury Type</label>
                  <select value={form.injury_type || ""} onChange={e => setForm({...form, injury_type: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="">Select or type below...</option>
                    {sportCfg.injuryTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Body Location</label>
                  <input value={form.injury_location || ""} onChange={e => setForm({...form, injury_location: e.target.value})} placeholder="e.g. Left Hamstring"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Est. Return Date</label>
                  <input type="date" value={form.estimated_return || ""} onChange={e => setForm({...form, estimated_return: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Cleared to Play</label>
                  <select value={form.cleared_to_play ? "yes" : "no"} onChange={e => setForm({...form, cleared_to_play: e.target.value === "yes"})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Reported By</label>
                  <input value={form.reported_by || ""} onChange={e => setForm({...form, reported_by: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Diagnosis</label>
                <textarea value={form.diagnosis || ""} onChange={e => setForm({...form, diagnosis: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Treatment Plan</label>
                <textarea value={form.treatment || ""} onChange={e => setForm({...form, treatment: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={save} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Save Record</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}