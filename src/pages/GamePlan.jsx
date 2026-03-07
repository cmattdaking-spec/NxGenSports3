import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, Zap, Target, ChevronDown, ChevronUp, Brain, Shield, Swords, Users } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";

const UNITS = ["offense","defense","special_teams"];
const LOCATIONS = ["home","away","neutral"];

export default function GamePlan() {
  const [plans, setPlans] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [plays, setPlays] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTarget, setAiTarget] = useState(null);
  const [nxPlanTarget, setNxPlanTarget] = useState(null);
  const [nxPlanLoading, setNxPlanLoading] = useState(false);
  const [nxPlanResult, setNxPlanResult] = useState(null);

  const load = async () => {
    const [gp, op, pl, pr] = await Promise.all([
      base44.entities.GamePlan.list(),
      base44.entities.Opponent.list(),
      base44.entities.Play.list(),
      base44.entities.Player.list()
    ]);
    setPlans(gp); setOpponents(op); setPlays(pl); setPlayers(pr); setLoading(false);
  };

  const getFilmInsights = async (opponent) => {
    // Find film sessions matching this opponent
    const sessions = await base44.entities.FilmSession.filter({ opponent });
    if (!sessions.length) return null;
    // Get tags from most recent session
    const session = sessions[0];
    const tags = await base44.entities.FilmTag.filter({ session_id: session.id });
    if (!tags.length) return null;
    const successRate = Math.round((tags.filter(t => t.result === "success").length / tags.length) * 100);
    const runTags = tags.filter(t => t.play_type === "run");
    const passTags = tags.filter(t => t.play_type === "pass");
    const flagged = tags.filter(t => t.flagged).map(t => t.notes).filter(Boolean).slice(0, 3);
    const formations = [...new Set(tags.map(t => t.formation).filter(Boolean))].slice(0, 5);
    return {
      session_title: session.title,
      game_date: session.game_date,
      total_plays: tags.length,
      success_rate: successRate,
      run_pass_ratio: `${runTags.length} runs / ${passTags.length} passes`,
      formations_seen: formations,
      flagged_plays: flagged,
    };
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ unit: "offense", status: "draft", location: "home" }); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({...p}); setShowForm(true); };
  const save = async () => {
    if (editing) await base44.entities.GamePlan.update(editing.id, form);
    else await base44.entities.GamePlan.create(form);
    setShowForm(false); load();
  };
  const remove = async (id) => { if (confirm("Delete game plan?")) { await base44.entities.GamePlan.delete(id); load(); } };

  const getAISuggestions = async (plan) => {
    setAiLoading(true); setAiTarget(plan.id);
    const opp = opponents.find(o => o.name === plan.opponent);
    const unitPlays = plays.filter(p => p.unit === plan.unit).slice(0, 20).map(p => p.name).join(", ");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football coordinator for NxDown. Generate a game plan for the ${plan.unit} unit.\n\nOpponent: ${plan.opponent}\nGame Date: ${plan.game_date}\nLocation: ${plan.location}\n${opp ? `\nOpponent:\n- Offensive: ${opp.offensive_tendency || "Unknown"}\n- Defensive: ${opp.defensive_tendency || "Unknown"}\n- Key Players: ${opp.key_players || "Unknown"}\n- Weaknesses: ${opp.weaknesses || "Unknown"}` : ""}\n\nAvailable Plays: ${unitPlays || "None"}\n\nProvide:\n1. Opening Script (5 plays)\n2. Red Zone approach\n3. Third down strategy\n4. Two-minute drill\n5. Key matchups to exploit\n6. Situational adjustments`,
    });
    await base44.entities.GamePlan.update(plan.id, { ai_suggestions: res });
    load(); setAiLoading(false); setAiTarget(null);
  };

  const generateNxGamePlan = async (plan) => {
    setNxPlanLoading(true);
    setNxPlanTarget(plan.id);
    setNxPlanResult(null);
    const opp = opponents.find(o => o.name === plan.opponent);
    const unitPlays = plays.filter(p => p.unit === plan.unit).map(p => `${p.name} (${p.category})`).join(", ");
    const unitPlayers = players.filter(p => p.unit === plan.unit && p.status === "active")
      .map(p => `${p.first_name} ${p.last_name} (${p.position}, Rating: ${p.overall_rating || "N/A"})`).join(", ");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite football AI coordinator for NxDown. Generate a comprehensive, opponent-specific ${plan.unit} game plan.

Game Info:
- Opponent: ${plan.opponent}
- Date: ${plan.game_date}, Location: ${plan.location}
${opp ? `
Opponent Scouting Data:
- Offensive Tendency: ${opp.offensive_tendency || "Unknown"}
- Defensive Tendency: ${opp.defensive_tendency || "Unknown"}
- Key Players: ${opp.key_players || "Unknown"}
- Strengths: ${opp.strengths || "Unknown"}
- Weaknesses: ${opp.weaknesses || "Unknown"}
- Scout Report: ${opp.ai_scout_report ? opp.ai_scout_report.substring(0, 400) : "Not available"}` : ""}

Our Team:
- Active ${plan.unit} Players: ${unitPlayers || "Not specified"}
- Available Plays: ${unitPlays || "Not specified"}

Generate a detailed, opponent-specific game plan JSON.`,
      response_json_schema: {
        type: "object",
        properties: {
          strategy_overview: { type: "string", description: "2-3 sentence overall strategy" },
          offensive_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                concept: { type: "string" },
                rationale: { type: "string" },
                suggested_plays: { type: "array", items: { type: "string" } }
              }
            }
          },
          defensive_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                concept: { type: "string" },
                rationale: { type: "string" },
                adjustments: { type: "array", items: { type: "string" } }
              }
            }
          },
          key_matchups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                matchup: { type: "string" },
                advantage: { type: "string", enum: ["ours", "theirs", "neutral"] },
                recommendation: { type: "string" }
              }
            }
          },
          personnel_adjustments: { type: "array", items: { type: "string" } },
          situational_plays: {
            type: "object",
            properties: {
              red_zone: { type: "array", items: { type: "string" } },
              third_down: { type: "array", items: { type: "string" } },
              two_minute: { type: "array", items: { type: "string" } },
              opening_script: { type: "array", items: { type: "string" } }
            }
          },
          keys_to_victory: { type: "array", items: { type: "string" } }
        }
      }
    });
    setNxPlanResult(res);
    setNxPlanLoading(false);
  };

  const unitColor = { offense: "border-l-blue-500", defense: "border-l-red-500", special_teams: "border-l-purple-500" };
  const statusBadge = { draft: "bg-yellow-500/20 text-yellow-400", final: "bg-green-500/20 text-green-400" };
  const advantageColor = { ours: "text-green-400", theirs: "text-red-400", neutral: "text-yellow-400" };
  const advantageLabel = { ours: "Our Edge", theirs: "Their Edge", neutral: "Neutral" };

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Game <span style={{ color: "var(--color-primary,#f97316)" }}>Plans</span></h1>
          <p className="text-gray-500 text-sm">{plans.length} plans created</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {plans.length === 0 && (
        <div className="text-center py-20">
          <Target className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No game plans yet. Create your first one!</p>
        </div>
      )}

      <div className="space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-[#141414] border-l-4 ${unitColor[plan.unit]} border border-gray-800 rounded-xl overflow-hidden`}>
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-white font-bold">vs. {plan.opponent}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge[plan.status]}`}>{plan.status}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{plan.unit?.replace("_"," ")}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{plan.game_date}</span>
                  {plan.location && <span>· {plan.location}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => generateNxGamePlan(plan)} disabled={nxPlanLoading && nxPlanTarget === plan.id}
                  className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 px-2 py-1.5 rounded-lg text-xs hover:bg-purple-500/20 transition-all">
                  <Brain className={`w-3.5 h-3.5 ${nxPlanLoading && nxPlanTarget === plan.id ? "animate-pulse" : ""}`} />
                  <span className="hidden md:inline">{nxPlanLoading && nxPlanTarget === plan.id ? "Generating..." : "Nx Game Plan"}</span>
                </button>
                <button onClick={() => getAISuggestions(plan)} disabled={aiLoading && aiTarget === plan.id}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all border" style={{ backgroundColor: "var(--color-primary,#f97316)18", borderColor: "var(--color-primary,#f97316)55", color: "var(--color-primary,#f97316)" }}>
                  <Zap className={`w-3.5 h-3.5 ${aiLoading && aiTarget === plan.id ? "animate-pulse" : ""}`} />
                  <span className="hidden md:inline">{aiLoading && aiTarget === plan.id ? "..." : "Nx Assist"}</span>
                </button>
                <button onClick={() => openEdit(plan)} className="text-gray-500 p-1.5 transition-colors" onMouseEnter={e => e.currentTarget.style.color="var(--color-primary,#f97316)"} onMouseLeave={e => e.currentTarget.style.color=""}><Edit className="w-4 h-4" /></button>
                <button onClick={() => remove(plan.id)} className="text-gray-500 hover:text-red-400 p-1.5 transition-colors"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => setExpanded(expanded === plan.id ? null : plan.id)} className="text-gray-500 hover:text-white p-1.5 transition-colors">
                  {expanded === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {expanded === plan.id && (
              <div className="border-t border-gray-800 p-4 space-y-4">
                {plan.key_tendencies && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Key Tendencies</p>
                    <p className="text-gray-300 text-sm">{plan.key_tendencies}</p>
                  </div>
                )}
                {plan.ai_suggestions && (
                  <div className="rounded-lg p-3 border" style={{ backgroundColor: "var(--color-primary,#f97316)15", borderColor: "var(--color-primary,#f97316)35" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5" style={{ color: "var(--color-primary,#f97316)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--color-primary,#f97316)" }}>Nx Game Plan Notes</span>
                    </div>
                    <p className="text-gray-300 text-sm whitespace-pre-line">{plan.ai_suggestions}</p>
                  </div>
                )}
                {plan.notes && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-gray-300 text-sm">{plan.notes}</p>
                  </div>
                )}
                {!plan.key_tendencies && !plan.ai_suggestions && !plan.notes && (
                  <p className="text-gray-600 text-sm">No details yet. Use Nx Game Plan to generate a full strategic breakdown.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nx Game Plan Deep Modal */}
      {nxPlanTarget && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-purple-500/30 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <h2 className="text-white font-bold">Nx Opponent-Specific Game Plan</h2>
                <span className="text-purple-400 text-xs bg-purple-500/20 px-2 py-0.5 rounded-full">AI-Powered</span>
              </div>
              <button onClick={() => { setNxPlanTarget(null); setNxPlanResult(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              {nxPlanLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Nx Intelligence generating opponent-specific game plan...</p>
                  <p className="text-gray-600 text-xs">Analyzing scouting data, team strengths, and play library</p>
                </div>
              ) : nxPlanResult ? (
                <div className="space-y-5">
                  {/* Strategy Overview */}
                  {nxPlanResult.strategy_overview && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                      <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">Strategy Overview</p>
                      <p className="text-white text-sm leading-relaxed">{nxPlanResult.strategy_overview}</p>
                    </div>
                  )}

                  {/* Offensive / Defensive Strategies */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nxPlanResult.offensive_strategies?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Swords className="w-4 h-4 text-orange-400" />
                          <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Offensive Strategies</span>
                        </div>
                        <div className="space-y-2">
                          {nxPlanResult.offensive_strategies.map((s, i) => (
                            <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-orange-500/10">
                              <p className="text-white text-sm font-semibold">{s.concept}</p>
                              <p className="text-gray-400 text-xs mt-0.5">{s.rationale}</p>
                              {s.suggested_plays?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {s.suggested_plays.map((pl, j) => (
                                    <span key={j} className="text-xs bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">{pl}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {nxPlanResult.defensive_strategies?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Defensive Strategies</span>
                        </div>
                        <div className="space-y-2">
                          {nxPlanResult.defensive_strategies.map((s, i) => (
                            <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-blue-500/10">
                              <p className="text-white text-sm font-semibold">{s.concept}</p>
                              <p className="text-gray-400 text-xs mt-0.5">{s.rationale}</p>
                              {s.adjustments?.length > 0 && (
                                <ul className="mt-1.5 space-y-0.5">
                                  {s.adjustments.map((a, j) => (
                                    <li key={j} className="text-blue-300 text-xs">· {a}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Key Matchups */}
                  {nxPlanResult.key_matchups?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider">Key Matchups</span>
                      </div>
                      <div className="space-y-2">
                        {nxPlanResult.key_matchups.map((m, i) => (
                          <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{m.matchup}</p>
                              <p className="text-gray-400 text-xs mt-0.5">{m.recommendation}</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${advantageColor[m.advantage]} bg-current/10`} style={{ backgroundColor: m.advantage === "ours" ? "rgba(34,197,94,0.1)" : m.advantage === "theirs" ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)" }}>
                              {advantageLabel[m.advantage]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personnel Adjustments */}
                  {nxPlanResult.personnel_adjustments?.length > 0 && (
                    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-700">
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Personnel Adjustments</p>
                      <ul className="space-y-1.5">
                        {nxPlanResult.personnel_adjustments.map((a, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-purple-400 mt-0.5">▸</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Situational Plays */}
                  {nxPlanResult.situational_plays && (
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Situational Play Calls</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: "opening_script", label: "Opening Script", color: "border-orange-500/20" },
                          { key: "red_zone", label: "Red Zone", color: "border-red-500/20" },
                          { key: "third_down", label: "3rd Down", color: "border-blue-500/20" },
                          { key: "two_minute", label: "2-Minute Drill", color: "border-green-500/20" },
                        ].map(({ key, label, color }) => (
                          nxPlanResult.situational_plays[key]?.length > 0 && (
                            <div key={key} className={`bg-[#1a1a1a] rounded-lg p-3 border ${color}`}>
                              <p className="text-gray-500 text-xs uppercase mb-2">{label}</p>
                              <ol className="space-y-1">
                                {nxPlanResult.situational_plays[key].map((pl, i) => (
                                  <li key={i} className="text-gray-300 text-xs flex gap-1.5">
                                    <span className="font-bold" style={{ color: "var(--color-primary,#f97316)" }}>{i+1}.</span> {pl}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keys to Victory */}
                  {nxPlanResult.keys_to_victory?.length > 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                      <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Keys to Victory</p>
                      <ul className="space-y-1.5">
                        {nxPlanResult.keys_to_victory.map((k, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">✓</span> {k}
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

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Game Plan" : "New Game Plan"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Opponent *</label>
                  <input value={form.opponent || ""} onChange={e => setForm({...form, opponent: e.target.value})} placeholder="Team name"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Game Date *</label>
                  <input type="date" value={form.game_date || ""} onChange={e => setForm({...form, game_date: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Location</label>
                  <select value={form.location || "home"} onChange={e => setForm({...form, location: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Unit</label>
                  <select value={form.unit || "offense"} onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    {UNITS.map(u => <option key={u} value={u}>{u.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Status</label>
                  <select value={form.status || "draft"} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="draft">Draft</option>
                    <option value="final">Final</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Key Tendencies / Opponent Notes</label>
                <textarea value={form.key_tendencies || ""} onChange={e => setForm({...form, key_tendencies: e.target.value})} rows={3}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Coaching Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
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