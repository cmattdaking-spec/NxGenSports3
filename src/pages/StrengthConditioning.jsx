import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, Zap, Brain, Dumbbell, ChevronDown, ChevronUp, AlertTriangle, Flame, Star, Target, TrendingUp } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";

const TYPES = ["strength","conditioning","speed","agility","recovery","full_body","position_specific"];
const INTENSITIES = ["low","moderate","high","max"];
const LEVELS = ["All","Varsity","JV","Freshman"];

const INTENSITY_COLOR = {
  low: "bg-green-500/20 text-green-400",
  moderate: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  max: "bg-red-500/20 text-red-400"
};

const TYPE_COLOR = {
  strength: "bg-blue-500/20 text-blue-400",
  conditioning: "bg-orange-500/20 text-orange-400",
  speed: "bg-yellow-500/20 text-yellow-400",
  agility: "bg-teal-500/20 text-teal-400",
  recovery: "bg-green-500/20 text-green-400",
  full_body: "bg-red-500/20 text-red-400",
  position_specific: "bg-cyan-500/20 text-cyan-400"
};

const POSITIONS = ["QB","RB","FB","WR","TE","LT","LG","C","RG","RT","DE","DT","NT","OLB","MLB","ILB","CB","SS","FS","K","P","LS"];

// HC and Trainer only see load alerts
const LOAD_ALERT_ROLES = ["head_coach","admin","trainer","strength_conditioning_coordinator"];

export default function StrengthConditioning() {
  const [plans, setPlans] = useState([]);
  const [players, setPlayers] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [loadAlerts, setLoadAlerts] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [activeTab, setActiveTab] = useState("sc");
  // Development state
  const [devStats, setDevStats] = useState([]);
  const [devHealth, setDevHealth] = useState([]);
  const [devPractices, setDevPractices] = useState([]);
  const [devSelectedPlayer, setDevSelectedPlayer] = useState(null);
  const [devPlan, setDevPlan] = useState(null);
  const [devLoading, setDevLoading] = useState(false);
  const [teamReport, setTeamReport] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", type: "strength", level: "All", intensity: "moderate",
    duration_minutes: 60, date: new Date().toISOString().split("T")[0],
    status: "planned", exercises: [], target_positions: [], player_ids: [], load_score: 5
  });

  const load = async () => {
    const [p, pl, h] = await Promise.all([
      base44.entities.WorkoutPlan.list("-date", 100),
      base44.entities.Player.list(),
      base44.entities.PlayerHealth.list("-date", 50)
    ]);
    setPlans(p); setPlayers(pl); setHealthRecords(h);
    setLoading(false);
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
    Promise.all([
      base44.entities.PlayerStat.list("-week", 200),
      base44.entities.PlayerHealth.list("-date", 100),
      base44.entities.PracticePlan.list("-date", 20),
    ]).then(([st, hr, pr]) => { setDevStats(st); setDevHealth(hr); setDevPractices(pr); });
  }, []);

  // Compute load alerts once we have data
  useEffect(() => {
    if (!user || !LOAD_ALERT_ROLES.includes(user.role)) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentHighLoad = plans.filter(p => {
      const d = new Date(p.date);
      return d >= sevenDaysAgo && (p.intensity === "high" || p.intensity === "max") && p.status === "completed";
    });
    if (recentHighLoad.length >= 3) {
      setLoadAlerts([{ type: "team", message: `Heavy training week detected: ${recentHighLoad.length} high-intensity sessions in 7 days. Consider a recovery session.` }]);
    }
  }, [plans, user]);

  const canEdit = user?.role !== "athletic_director";

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", type: "strength", level: "All", intensity: "moderate", duration_minutes: 60, date: new Date().toISOString().split("T")[0], status: "planned", exercises: [], target_positions: [], player_ids: [], load_score: 5 });
    setShowForm(true);
  };

  const openEdit = (plan) => { setEditing(plan); setForm({ ...plan }); setShowForm(true); };

  const save = async () => {
    if (editing) await base44.entities.WorkoutPlan.update(editing.id, form);
    else await base44.entities.WorkoutPlan.create(form);
    setShowForm(false); load();
  };

  const remove = async (id) => {
    if (confirm("Delete workout plan?")) { await base44.entities.WorkoutPlan.delete(id); load(); }
  };

  const addExercise = () => setForm(f => ({ ...f, exercises: [...(f.exercises || []), { name: "", sets: 3, reps: "10", weight: "", rest_seconds: 60, notes: "" }] }));
  const updateExercise = (i, key, val) => setForm(f => {
    const ex = [...(f.exercises || [])]; ex[i] = { ...ex[i], [key]: val }; return { ...f, exercises: ex };
  });
  const removeExercise = (i) => setForm(f => ({ ...f, exercises: (f.exercises || []).filter((_, idx) => idx !== i) }));

  const generateAIPlan = async () => {
    setAiLoading(true); setAiPlan(null); setShowAiModal(true);
    const playerSummary = players.slice(0, 30).map(p => `${p.first_name} ${p.last_name} (${p.position}, ${p.year || "?"}yr, Weight: ${p.weight || "?"}lbs, Strength: ${p.strength || "N/A"}, Speed: ${p.speed || "N/A"})`).join("\n");
    const recentLoads = plans.filter(p => p.status === "completed").slice(0, 5).map(p => `${p.name} (${p.type}, ${p.intensity} intensity, ${p.date})`).join(", ");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite Strength & Conditioning coach for a football team using NxDown. Generate a comprehensive weekly workout plan for the team.

Team Players (sample):
${playerSummary}

Recent completed workouts: ${recentLoads || "None"}

Generate a 5-day workout week plan with specific exercises, sets, reps, and coaching cues. Consider player development, position-specific needs, and progressive overload principles.`,
      response_json_schema: {
        type: "object",
        properties: {
          plan_name: { type: "string" },
          weekly_theme: { type: "string" },
          coaching_notes: { type: "string" },
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                focus: { type: "string" },
                type: { type: "string" },
                intensity: { type: "string" },
                duration_minutes: { type: "number" },
                load_score: { type: "number" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      sets: { type: "number" },
                      reps: { type: "string" },
                      weight: { type: "string" },
                      rest_seconds: { type: "number" },
                      notes: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    setAiPlan(res); setAiLoading(false);
  };

  const saveAIDay = async (day) => {
    const date = new Date();
    const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
    await base44.entities.WorkoutPlan.create({
      name: `${aiPlan.plan_name} - ${day.day}`,
      type: day.type || "full_body",
      intensity: day.intensity || "moderate",
      duration_minutes: day.duration_minutes || 60,
      date: new Date().toISOString().split("T")[0],
      status: "planned",
      exercises: day.exercises || [],
      load_score: day.load_score || 5,
      ai_generated: true,
      notes: day.focus,
      level: "All"
    });
    load();
  };

  const generateDevPlan = async (player) => {
    setDevSelectedPlayer(player);
    setDevLoading(true); setDevPlan(null);
    const pStats = devStats.filter(s => s.player_id === player.id).sort((a,b) => b.week - a.week);
    const latestHealth = devHealth.filter(h => h.player_id === player.id).sort((a,b) => new Date(b.date) - new Date(a.date));
    const avgGrade = pStats.length ? (pStats.reduce((s,r) => s + (r.grade||0),0)/pStats.length).toFixed(1) : "N/A";
    const injuries = latestHealth.filter(h => h.injury_type).map(h => h.injury_type).join(", ") || "None";
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite player development AI for NxDown football. Generate a comprehensive development plan for:
Name: ${player.first_name} ${player.last_name}, Position: ${player.position}, Year: ${player.year || "?"}, Weight: ${player.weight || "?"}lbs
Rating: ${player.overall_rating || "N/A"}/100, Speed: ${player.speed || "N/A"}, Strength: ${player.strength || "N/A"}, Agility: ${player.agility || "N/A"}
Avg Grade: ${avgGrade}, Recent Injuries: ${injuries}, Status: ${player.status}`,
      response_json_schema: {
        type: "object",
        properties: {
          potential_rating: { type: "string", enum: ["Elite","High","Medium","Developing"] },
          injury_risk_level: { type: "string", enum: ["Low","Medium","High"] },
          overall_assessment: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          areas_to_improve: { type: "array", items: { type: "string" } },
          short_term_goals: { type: "array", items: { type: "object", properties: { goal: { type: "string" }, timeline: { type: "string" } } } },
          training_program: { type: "object", properties: { weekly_focus: { type: "string" }, skill_drills: { type: "array", items: { type: "string" } }, load_recommendation: { type: "string" } } },
          career_projection: { type: "string" }
        }
      }
    });
    setDevPlan(res); setDevLoading(false);
  };

  const generateTeamReport = async () => {
    setTeamLoading(true); setTeamReport(null);
    const playerData = players.slice(0,30).map(p => {
      const pStats = devStats.filter(s => s.player_id === p.id);
      const avgGrade = pStats.length ? (pStats.reduce((sum,s) => sum+(s.grade||0),0)/pStats.length).toFixed(1) : 0;
      return `${p.first_name} ${p.last_name}: ${p.position} (${p.year}), Rating: ${p.overall_rating||"N/A"}, Avg Grade: ${avgGrade}, Status: ${p.status}`;
    }).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite talent scout AI for NxDown football. Analyze the roster and identify top prospects and development needs.\n\nPlayers:\n${playerData}`,
      response_json_schema: {
        type: "object",
        properties: {
          team_summary: { type: "string" },
          future_stars: { type: "array", items: { type: "object", properties: { player_name: { type: "string" }, position: { type: "string" }, reason: { type: "string" }, potential: { type: "string" } } } },
          depth_concerns: { type: "array", items: { type: "string" } },
          team_development_priorities: { type: "array", items: { type: "string" } }
        }
      }
    });
    setTeamReport(res); setTeamLoading(false);
  };

  const POTENTIAL_COLOR = { Elite: "text-yellow-400", High: "text-orange-400", Medium: "text-blue-400", Developing: "text-gray-400" };
  const RISK_COLOR = { Low: "text-green-400 bg-green-500/20", Medium: "text-yellow-400 bg-yellow-500/20", High: "text-red-400 bg-red-500/20" };

  const filtered = plans.filter(p => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterLevel !== "all" && p.level !== filterLevel && p.level !== "All") return false;
    return true;
  });

  const canSeeLoadAlerts = user && LOAD_ALERT_ROLES.includes(user.role);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-white">Strength & <span style={{ color: "var(--color-primary,#f97316)" }}>Conditioning</span></h1>
          <p className="text-gray-500 text-sm">{plans.length} workout plans</p>
        </div>
        {activeTab === "sc" && (
          <div className="flex gap-2">
            <button onClick={generateAIPlan} disabled={aiLoading}
              className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 text-teal-400 px-3 py-2 rounded-lg text-sm font-medium transition-all">
              <Brain className="w-4 h-4" />
              <span className="hidden md:inline">Nx S&C AI</span>
            </button>
            {canEdit && (
              <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                <Plus className="w-4 h-4" /> New Plan
              </button>
            )}
          </div>
        )}
        {activeTab === "development" && (
          <button onClick={generateTeamReport} disabled={teamLoading}
            className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-400 px-3 py-2 rounded-lg text-sm font-medium transition-all">
            <Star className={`w-4 h-4 ${teamLoading ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{teamLoading ? "Analyzing..." : "Team Prospect Report"}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#141414] border border-gray-800 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab("sc")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "sc" ? "text-white" : "text-gray-400 hover:text-white"}`}
          style={activeTab === "sc" ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
          <Dumbbell className="w-4 h-4" /> S&C Plans
        </button>
        <button onClick={() => setActiveTab("development")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "development" ? "text-white" : "text-gray-400 hover:text-white"}`}
          style={activeTab === "development" ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
          <TrendingUp className="w-4 h-4" /> Development
        </button>
      </div>

      {activeTab === "development" && (
        <div>
          {/* Team Report */}
          {(teamLoading || teamReport) && (
            <div className="bg-[#141414] border border-yellow-500/20 rounded-xl mb-6 overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-semibold text-sm">Nx Team Prospect Report</span>
              </div>
              {teamLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-sm">Analyzing entire roster...</p>
                </div>
              ) : teamReport && (
                <div className="p-4 space-y-4">
                  <p className="text-gray-300 text-sm">{teamReport.team_summary}</p>
                  {teamReport.future_stars?.length > 0 && (
                    <div>
                      <p className="text-yellow-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Star className="w-3 h-3" /> Future Stars</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {teamReport.future_stars.map((s, i) => (
                          <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-yellow-500/10">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold text-sm">{s.player_name}</span>
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">{s.position}</span>
                              <span className={`text-xs ml-auto ${POTENTIAL_COLOR[s.potential] || "text-gray-400"}`}>{s.potential}</span>
                            </div>
                            <p className="text-gray-400 text-xs mt-1">{s.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {teamReport.depth_concerns?.length > 0 && (
                    <div>
                      <p className="text-red-400 text-xs uppercase tracking-wider mb-2">Depth Concerns</p>
                      {teamReport.depth_concerns.map((c, i) => (
                        <p key={i} className="text-gray-400 text-sm flex items-start gap-2"><span className="text-red-400 mt-0.5">·</span>{c}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Player Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map(player => {
              const pStats = devStats.filter(s => s.player_id === player.id);
              const avgGrade = pStats.length ? (pStats.reduce((sum,s) => sum+(s.grade||0),0)/pStats.length).toFixed(1) : null;
              const latestHealth = devHealth.filter(h => h.player_id === player.id)[0];
              const isSelected = devSelectedPlayer?.id === player.id;
              return (
                <div key={player.id} className={`bg-[#141414] border rounded-xl overflow-hidden transition-all ${isSelected ? "border-orange-500/50" : "border-gray-800 hover:border-gray-700"}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
                          {player.first_name?.[0]}{player.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{player.first_name} {player.last_name}</p>
                          <p className="text-gray-500 text-xs">{player.position} · {player.year || "—"}</p>
                        </div>
                      </div>
                      {player.overall_rating && (
                        <div className="text-right">
                          <p className="text-orange-400 font-black text-lg">{player.overall_rating}</p>
                          <p className="text-gray-600 text-xs">Rating</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {avgGrade && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Avg Grade: {avgGrade}</span>}
                      {latestHealth && <span className={`text-xs px-2 py-0.5 rounded ${latestHealth.availability === "full" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>{latestHealth.availability}</span>}
                    </div>
                    <button onClick={() => generateDevPlan(player)} disabled={devLoading && isSelected}
                      className="w-full flex items-center justify-center gap-2 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-400 py-2 rounded-lg text-xs font-medium transition-all">
                      <Brain className={`w-3.5 h-3.5 ${devLoading && isSelected ? "animate-pulse" : ""}`} />
                      {devLoading && isSelected ? "Generating Plan..." : "Nx Development Plan"}
                    </button>
                  </div>
                  {isSelected && devPlan && !devLoading && (
                    <div className="border-t border-gray-800 p-4 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${POTENTIAL_COLOR[devPlan.potential_rating]} bg-yellow-500/10`}>{devPlan.potential_rating} Potential</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_COLOR[devPlan.injury_risk_level]}`}>{devPlan.injury_risk_level} Injury Risk</span>
                      </div>
                      <p className="text-gray-300 text-xs">{devPlan.overall_assessment}</p>
                      {devPlan.short_term_goals?.length > 0 && (
                        <div>
                          <p className="text-orange-400 text-xs uppercase tracking-wider mb-1.5">Short-Term Goals</p>
                          {devPlan.short_term_goals.map((g, i) => (
                            <div key={i} className="flex items-start gap-2 mb-1.5">
                              <Target className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-gray-300 text-xs">{g.goal}</p>
                                <p className="text-gray-500 text-xs">{g.timeline}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {devPlan.training_program && (
                        <div className="bg-[#1a1a1a] rounded-lg p-3">
                          <p className="text-blue-400 text-xs uppercase mb-2">Training Program</p>
                          {devPlan.training_program.weekly_focus && <p className="text-gray-400 text-xs mb-2">{devPlan.training_program.weekly_focus}</p>}
                          {devPlan.training_program.skill_drills?.slice(0,3).map((d,i) => (
                            <p key={i} className="text-gray-300 text-xs flex gap-1.5"><span className="text-blue-400">·</span>{d}</p>
                          ))}
                          {devPlan.training_program.load_recommendation && (
                            <p className="text-yellow-400 text-xs mt-2 italic">{devPlan.training_program.load_recommendation}</p>
                          )}
                        </div>
                      )}
                      {devPlan.career_projection && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                          <p className="text-green-400 text-xs uppercase mb-1">Career Projection</p>
                          <p className="text-gray-300 text-xs">{devPlan.career_projection}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "sc" && <>
      {/* Load Alerts - HC/Trainer only */}
      {canSeeLoadAlerts && loadAlerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {loadAlerts.map((alert, i) => (
            <div key={i} className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
              <Flame className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-400 text-sm font-semibold">High Training Load Alert</p>
                <p className="text-gray-300 text-sm mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-[#141414] border border-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm">
          <option value="all">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t.replace("_"," ")}</option>)}
        </select>
        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
          className="bg-[#141414] border border-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm">
          <option value="all">All Levels</option>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Plans List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Dumbbell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No workout plans yet. Create one or use Nx S&C AI.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(plan => (
            <div key={plan.id} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-white font-bold">{plan.name}</h3>
                    {plan.ai_generated && <span className="text-xs px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400">AI</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR[plan.type] || "bg-gray-500/20 text-gray-400"}`}>{plan.type?.replace("_"," ")}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${INTENSITY_COLOR[plan.intensity] || ""}`}>{plan.intensity}</span>
                    {plan.level && plan.level !== "All" && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{plan.level}</span>}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                    <span>{plan.date}</span>
                    {plan.duration_minutes && <span>· {plan.duration_minutes} min</span>}
                    {plan.load_score && <span className="flex items-center gap-1">· Load: <span className={plan.load_score >= 8 ? "text-red-400" : plan.load_score >= 5 ? "text-yellow-400" : "text-green-400"}>{plan.load_score}/10</span></span>}
                    <span className={plan.status === "completed" ? "text-green-400" : plan.status === "cancelled" ? "text-red-400" : "text-gray-500"}>· {plan.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canEdit && <button onClick={() => openEdit(plan)} className="text-gray-500 p-1.5" onMouseEnter={e => e.currentTarget.style.color="var(--color-primary,#f97316)"} onMouseLeave={e => e.currentTarget.style.color=""}><Edit className="w-4 h-4" /></button>}
                  {canEdit && <button onClick={() => remove(plan.id)} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>}
                  <button onClick={() => setExpanded(expanded === plan.id ? null : plan.id)} className="text-gray-500 hover:text-white p-1.5">
                    {expanded === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {expanded === plan.id && (
                <div className="border-t border-gray-800 p-4 space-y-3">
                  {plan.notes && <p className="text-gray-400 text-sm">{plan.notes}</p>}
                  {plan.exercises?.length > 0 && (
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Exercises</p>
                      <div className="space-y-2">
                        {plan.exercises.map((ex, i) => (
                          <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>{i+1}</div>
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{ex.name}</p>
                              <p className="text-gray-400 text-xs mt-0.5">
                                {ex.sets && `${ex.sets} sets`}{ex.reps && ` × ${ex.reps}`}{ex.weight && ` @ ${ex.weight}`}{ex.rest_seconds && ` · ${ex.rest_seconds}s rest`}
                              </p>
                              {ex.notes && <p className="text-gray-600 text-xs mt-0.5 italic">{ex.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {plan.target_positions?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-gray-500 text-xs">Positions:</span>
                      {plan.target_positions.map(pos => (
                        <span key={pos} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{pos}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "sc" && null /* end sc tab */}

      {/* Nx S&C AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-teal-500/30 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-teal-400" />
                <h2 className="text-white font-bold">Nx S&C Weekly Plan</h2>
                <span className="text-teal-400 text-xs bg-teal-500/20 px-2 py-0.5 rounded-full">AI-Powered</span>
              </div>
              <button onClick={() => { setShowAiModal(false); setAiPlan(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Nx is generating your S&C program...</p>
                </div>
              ) : aiPlan ? (
                <div className="space-y-5">
                  <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
                    <h3 className="text-white font-bold text-lg">{aiPlan.plan_name}</h3>
                    <p className="text-teal-300 text-sm italic mt-1">"{aiPlan.weekly_theme}"</p>
                    {aiPlan.coaching_notes && <p className="text-gray-400 text-sm mt-2">{aiPlan.coaching_notes}</p>}
                  </div>
                  {aiPlan.days?.map((day, i) => (
                    <div key={i} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-white font-bold">{day.day}</span>
                          <span className="text-gray-500 text-sm ml-2">— {day.focus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${INTENSITY_COLOR[day.intensity] || ""}`}>{day.intensity}</span>
                          <span className="text-xs text-gray-500">{day.duration_minutes}min</span>
                          {canEdit && (
                            <button onClick={() => saveAIDay(day)} className="text-xs px-3 py-1 rounded-lg text-white" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                              Save
                            </button>
                          )}
                        </div>
                      </div>
                      {day.exercises?.slice(0,4).map((ex, j) => (
                        <div key={j} className="text-gray-400 text-xs py-1 border-b border-gray-800/50 last:border-0">
                          <span className="text-white font-medium">{ex.name}</span> — {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}` : ""}
                        </div>
                      ))}
                      {day.exercises?.length > 4 && <p className="text-gray-600 text-xs mt-1">+{day.exercises.length - 4} more exercises</p>}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Workout Plan" : "New Workout Plan"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Plan Name *</label>
                  <input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Type</label>
                  <select value={form.type || "strength"} onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm">
                    {TYPES.map(t => <option key={t} value={t}>{t.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Intensity</label>
                  <select value={form.intensity || "moderate"} onChange={e => setForm({...form, intensity: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm">
                    {INTENSITIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Level</label>
                  <select value={form.level || "All"} onChange={e => setForm({...form, level: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm">
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Date</label>
                  <input type="date" value={form.date || ""} onChange={e => setForm({...form, date: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Duration (min)</label>
                  <input type="number" value={form.duration_minutes || ""} onChange={e => setForm({...form, duration_minutes: +e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Load Score (1-10)</label>
                  <input type="number" min="1" max="10" value={form.load_score || 5} onChange={e => setForm({...form, load_score: +e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Status</label>
                  <select value={form.status || "planned"} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm">
                    <option value="planned">Planned</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Target Positions */}
              <div>
                <label className="text-gray-400 text-xs mb-2 block">Target Positions (leave empty for all)</label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map(pos => (
                    <button key={pos} type="button"
                      onClick={() => {
                        const curr = form.target_positions || [];
                        setForm({...form, target_positions: curr.includes(pos) ? curr.filter(p => p !== pos) : [...curr, pos]});
                      }}
                      className={`text-xs px-2 py-1 rounded-lg border transition-all ${(form.target_positions || []).includes(pos) ? "text-white border-transparent" : "bg-[#1a1a1a] border-gray-700 text-gray-400"}`}
                      style={(form.target_positions || []).includes(pos) ? { backgroundColor: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)" } : {}}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercises */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 text-xs uppercase tracking-wider">Exercises</label>
                  <button onClick={addExercise} className="text-xs flex items-center gap-1" style={{ color: "var(--color-primary,#f97316)" }}>
                    <Plus className="w-3 h-3" /> Add Exercise
                  </button>
                </div>
                <div className="space-y-2">
                  {(form.exercises || []).map((ex, i) => (
                    <div key={i} className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <input value={ex.name || ""} onChange={e => updateExercise(i, "name", e.target.value)} placeholder="Exercise name"
                          className="flex-1 bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs" />
                        <button onClick={() => removeExercise(i)} className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <input type="number" value={ex.sets || ""} onChange={e => updateExercise(i, "sets", +e.target.value)} placeholder="Sets"
                          className="bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs" />
                        <input value={ex.reps || ""} onChange={e => updateExercise(i, "reps", e.target.value)} placeholder="Reps"
                          className="bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs" />
                        <input value={ex.weight || ""} onChange={e => updateExercise(i, "weight", e.target.value)} placeholder="Weight"
                          className="bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs" />
                        <input type="number" value={ex.rest_seconds || ""} onChange={e => updateExercise(i, "rest_seconds", +e.target.value)} placeholder="Rest(s)"
                          className="bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={save} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Save Plan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}