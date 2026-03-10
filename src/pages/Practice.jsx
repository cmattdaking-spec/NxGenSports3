import { useState, useEffect, useContext } from "react";
import { useSportConfig } from "@/components/SportConfig";
import { SportContext } from "@/components/SportContext";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, Zap, ClipboardList, ChevronDown, ChevronUp, Clock, Brain, Sparkles } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";

const STATUS_COLOR = { draft: "bg-yellow-500/20 text-yellow-400", active: "bg-blue-500/20 text-blue-400", completed: "bg-green-500/20 text-green-400" };

const PRACTICE_EDIT_ROLES = ["admin","head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach"];

export default function Practice() {
  const { activeSport } = useContext(SportContext);
  const cfg = useSportConfig(activeSport);
  const [plans, setPlans] = useState([]);
  const [players, setPlayers] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ periods: [] });
  const [expanded, setExpanded] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTarget, setAiTarget] = useState(null);
  const [showNxGenerator, setShowNxGenerator] = useState(false);
  const [genForm, setGenForm] = useState({ duration_minutes: 120, focus: "", opponent_id: "" });
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState(null);

  const load = async () => {
    const [pr, pl, h, op] = await Promise.all([
      base44.entities.PracticePlan.list("-date"),
      base44.entities.Player.list(),
      base44.entities.PlayerHealth.list(),
      base44.entities.Opponent.list("-game_date")
    ]);
    setPlans(pr); setPlayers(pl); setHealthRecords(h); setOpponents(op); setLoading(false);
  };
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); load(); }, []);

  const canEdit = user && (user.role === "admin" || PRACTICE_EDIT_ROLES.includes(user.coaching_role) || PRACTICE_EDIT_ROLES.includes(user.role));

  const openAdd = () => {
    setEditing(null);
    setForm({ title: "", date: "", focus: "", duration_minutes: 120, status: "draft", periods: [] });
    setShowForm(true);
  };
  const openEdit = (p) => { setEditing(p); setForm({...p, periods: p.periods || []}); setShowForm(true); };
  const save = async () => {
    if (editing) await base44.entities.PracticePlan.update(editing.id, form);
    else await base44.entities.PracticePlan.create(form);
    setShowForm(false); load();
  };
  const remove = async (id) => { if (confirm("Delete practice plan?")) { await base44.entities.PracticePlan.delete(id); load(); } };

  const addPeriod = () => setForm(f => ({ ...f, periods: [...(f.periods || []), { name: "", duration: 10, unit: "team", drill: "", notes: "" }] }));
  const updatePeriod = (i, field, val) => setForm(f => {
    const periods = [...(f.periods || [])];
    periods[i] = { ...periods[i], [field]: val };
    return { ...f, periods };
  });
  const removePeriod = (i) => setForm(f => ({ ...f, periods: f.periods.filter((_, idx) => idx !== i) }));

  const getAISuggestions = async (plan) => {
    setAiLoading(true); setAiTarget(plan.id);
    const injuredPlayers = players.filter(p => p.status === "injured").map(p => `${p.first_name} ${p.last_name}`).join(", ");
    const limitedPlayers = healthRecords.filter(h => h.availability === "limited").map(h => h.player_name).join(", ");
    const opCtx = injuredPlayers ? `Injured/Out: ${injuredPlayers}\nLimited: ${limitedPlayers || "None"}` : "";
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: cfg.aiPracticeContext(plan.focus, opCtx) + `\n\nTotal Duration: ${plan.duration_minutes || 120} minutes\nDate: ${plan.date}\n\nCreate a period-by-period schedule with specific drill names, coaching points, and health accommodations.`,
    });
    await base44.entities.PracticePlan.update(plan.id, { ai_suggestions: res });
    load(); setAiLoading(false); setAiTarget(null);
  };

  const generateNxPlan = async () => {
    setGenLoading(true);
    setGenResult(null);
    const injuredPlayers = players.filter(p => p.status === "injured").map(p => `${p.first_name} ${p.last_name} (${p.position})`).join(", ");
    const limitedPlayers = healthRecords.filter(h => h.availability === "limited").map(h => `${h.player_name}`).join(", ");
    const opponent = opponents.find(o => o.id === genForm.opponent_id);
    const upcomingOpponents = opponents.filter(o => new Date(o.game_date) >= new Date()).slice(0, 3);

    const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an elite ${cfg.aiPersona}. Generate a complete, tailored practice session.

Team Status:
- Total Players: ${players.length}
- Injured/Out: ${injuredPlayers || "None"}
- Limited Players: ${limitedPlayers || "None"}
- Practice Duration: ${genForm.duration_minutes} minutes
- Focus Area: ${genForm.focus || "General preparation"}

${opponent ? `Upcoming Opponent: ${opponent.name} (${opponent.game_date}, ${opponent.location})
Offensive Tendency: ${opponent.offensive_tendency || "Unknown"}
Defensive Tendency: ${opponent.defensive_tendency || "Unknown"}
Key Players: ${opponent.key_players || "Unknown"}
Weaknesses: ${opponent.weaknesses || "Unknown"}` : `Upcoming Games: ${upcomingOpponents.map(o => o.name + " on " + o.game_date).join(", ") || "None scheduled"}`}

Generate a complete, structured practice plan with specific drills, focus areas, and timing. Optimize for the opponent and team needs.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          focus: { type: "string" },
          coaching_theme: { type: "string", description: "One key message for the day" },
          periods: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                duration: { type: "number" },
                unit: { type: "string" },
                drill: { type: "string" },
                coaching_points: { type: "array", items: { type: "string" } },
                notes: { type: "string" }
              }
            }
          },
          opponent_prep_notes: { type: "string" },
          health_accommodations: { type: "string" },
          total_minutes: { type: "number" }
        }
      }
    });
    setGenResult(res);
    setGenLoading(false);
  };

  const saveGeneratedPlan = async () => {
    if (!genResult) return;
    const today = new Date().toISOString().split("T")[0];
    await base44.entities.PracticePlan.create({
      title: genResult.title || "Nx Generated Practice",
      focus: genResult.focus || genForm.focus,
      date: today,
      duration_minutes: genResult.total_minutes || genForm.duration_minutes,
      status: "draft",
      periods: genResult.periods || [],
      ai_suggestions: `Coaching Theme: ${genResult.coaching_theme || ""}\n\n${genResult.opponent_prep_notes ? "Opponent Prep: " + genResult.opponent_prep_notes : ""}\n\n${genResult.health_accommodations ? "Health Notes: " + genResult.health_accommodations : ""}`.trim(),
      notes: genResult.coaching_theme || ""
    });
    setShowNxGenerator(false);
    setGenResult(null);
    load();
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{cfg.brand === "NxBucket" ? "Practice" : "Practice"} <span style={{ color: "var(--color-primary,#f97316)" }}>Plans</span></h1>
          <p className="text-gray-500 text-sm">{plans.length} plans</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={() => { setGenForm({ duration_minutes: 120, focus: "", opponent_id: "" }); setGenResult(null); setShowNxGenerator(true); }}
              className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 text-teal-400 px-3 py-2 rounded-lg text-sm font-medium transition-all">
              <Brain className="w-4 h-4" />
              <span className="hidden md:inline">Nx Generator</span>
            </button>
          )}
          {canEdit && (
            <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              <Plus className="w-4 h-4" /> New Practice
            </button>
          )}
        </div>
      </div>

      {plans.length === 0 && (
        <div className="text-center py-20">
          <ClipboardList className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No practice plans yet.</p>
          {canEdit && (
            <button onClick={() => { setGenForm({ duration_minutes: 120, focus: "", opponent_id: "" }); setGenResult(null); setShowNxGenerator(true); }}
              className="text-white px-5 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              Try Nx Generator
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-white font-bold">{plan.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[plan.status]}`}>{plan.status}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                  <span>{plan.date}</span>
                  {plan.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{plan.duration_minutes} min</span>}
                  {plan.focus && <span>· {plan.focus}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {canEdit && (
                  <button onClick={() => getAISuggestions(plan)} disabled={aiLoading && aiTarget === plan.id}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all border" style={{ backgroundColor: "var(--color-primary,#f97316)18", borderColor: "var(--color-primary,#f97316)55", color: "var(--color-primary,#f97316)" }}>
                    <Zap className={`w-3.5 h-3.5 ${aiLoading && aiTarget === plan.id ? "animate-pulse" : ""}`} />
                    <span className="hidden md:inline">{aiLoading && aiTarget === plan.id ? "..." : "Nx Improve"}</span>
                  </button>
                )}
                {canEdit && <button onClick={() => openEdit(plan)} className="text-gray-500 p-1.5" onMouseEnter={e => e.currentTarget.style.color="var(--color-primary,#f97316)"} onMouseLeave={e => e.currentTarget.style.color=""}><Edit className="w-4 h-4" /></button>}
                {canEdit && <button onClick={() => remove(plan.id)} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>}
                <button onClick={() => setExpanded(expanded === plan.id ? null : plan.id)} className="text-gray-500 hover:text-white p-1.5">
                  {expanded === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {expanded === plan.id && (
              <div className="border-t border-gray-800 p-4 space-y-4">
                {plan.periods?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Practice Schedule</p>
                    <div className="space-y-2">
                      {plan.periods.map((period, i) => (
                        <div key={i} className="flex items-start gap-3 bg-[#1a1a1a] rounded-lg p-3">
                          <div className="text-white text-xs font-bold px-2 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>{period.duration}m</div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{period.name || "Period"}</p>
                            {period.drill && <p className="text-gray-400 text-xs mt-0.5">{period.drill}</p>}
                            {period.unit && <span className="text-xs" style={{ color: "var(--color-primary,#f97316)" }}>{period.unit}</span>}
                            {period.coaching_points?.length > 0 && (
                              <ul className="mt-1 space-y-0.5">
                                {period.coaching_points.map((pt, j) => (
                                  <li key={j} className="text-gray-500 text-xs">· {pt}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {plan.ai_suggestions && (
                  <div className="rounded-lg p-3 border" style={{ backgroundColor: "var(--color-primary,#f97316)15", borderColor: "var(--color-primary,#f97316)35" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5" style={{ color: "var(--color-primary,#f97316)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--color-primary,#f97316)" }}>Nx Practice Notes</span>
                    </div>
                    <p className="text-gray-300 text-sm whitespace-pre-line">{plan.ai_suggestions}</p>
                  </div>
                )}
                {plan.notes && <p className="text-gray-400 text-sm">{plan.notes}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nx Generator Modal */}
      {showNxGenerator && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-teal-500/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-teal-400" />
                <h2 className="text-white font-bold">Nx Practice Generator</h2>
                <span className="text-teal-400 text-xs bg-teal-500/20 px-2 py-0.5 rounded-full">AI-Powered</span>
              </div>
              <button onClick={() => { setShowNxGenerator(false); setGenResult(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {!genResult ? (
                <>
                  <p className="text-gray-500 text-sm">Nx Intelligence will analyze your team's needs, health status, and upcoming opponents to generate an optimized practice plan.</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Duration (minutes)</label>
                      <input type="number" value={genForm.duration_minutes} onChange={e => setGenForm(f => ({ ...f, duration_minutes: +e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Opponent to Prepare For</label>
                      <select value={genForm.opponent_id} onChange={e => setGenForm(f => ({ ...f, opponent_id: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none">
                        <option value="">Auto-detect next game</option>
                        {opponents.filter(o => new Date(o.game_date) >= new Date()).map(o => (
                          <option key={o.id} value={o.id}>{o.name} ({o.game_date})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-gray-400 text-xs mb-1 block">Additional Focus / Theme</label>
                      <input value={genForm.focus} onChange={e => setGenForm(f => ({ ...f, focus: e.target.value }))}
                        placeholder={cfg.practiceFocusPlaceholder || "e.g. Focus area for today's practice..."}
                        className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" />
                    </div>
                  </div>

                  {/* Team Status Preview */}
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Nx will consider</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-black text-white">{players.length}</p>
                        <p className="text-gray-500 text-xs">Total Players</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-red-400">{players.filter(p => p.status === "injured").length}</p>
                        <p className="text-gray-500 text-xs">Injured Out</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-yellow-400">{healthRecords.filter(h => h.availability === "limited").length}</p>
                        <p className="text-gray-500 text-xs">Limited</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setShowNxGenerator(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm">Cancel</button>
                    <button onClick={generateNxPlan} disabled={genLoading}
                      className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium">
                      {genLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate with Nx AI
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-teal-400" />
                      <h3 className="text-white font-bold text-lg">{genResult.title}</h3>
                    </div>
                    <p className="text-teal-300 text-sm italic">"{genResult.coaching_theme}"</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-400">
                      <span>{genResult.total_minutes} min</span>
                      <span>·</span>
                      <span>{genResult.focus}</span>
                    </div>
                  </div>

                  {genResult.periods?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-gray-500 text-xs uppercase tracking-wider">Generated Schedule ({genResult.periods.length} periods)</p>
                      {genResult.periods.map((p, i) => (
                        <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-800">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-teal-600 text-white text-xs font-bold px-2 py-0.5 rounded">{p.duration}m</span>
                            <span className="text-white text-sm font-medium">{p.name}</span>
                            {p.unit && <span className="text-teal-400 text-xs ml-auto">{p.unit}</span>}
                          </div>
                          {p.drill && <p className="text-gray-400 text-xs">{p.drill}</p>}
                          {p.coaching_points?.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {p.coaching_points.map((pt, j) => (
                                <li key={j} className="text-gray-500 text-xs flex items-start gap-1">
                                   <span className="text-teal-400 mt-0.5">·</span> {pt}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {genResult.opponent_prep_notes && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                      <p className="text-orange-400 text-xs font-semibold uppercase mb-1">Opponent Prep Notes</p>
                      <p className="text-gray-300 text-sm">{genResult.opponent_prep_notes}</p>
                    </div>
                  )}
                  {genResult.health_accommodations && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <p className="text-blue-400 text-xs font-semibold uppercase mb-1">Health Accommodations</p>
                      <p className="text-gray-300 text-sm">{genResult.health_accommodations}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setGenResult(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm">Regenerate</button>
                    <button onClick={saveGeneratedPlan} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium">
                      Save Practice Plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Practice Plan" : "New Practice Plan"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Title *</label>
                  <input value={form.title || ""} onChange={e => setForm({...form, title: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Date *</label>
                  <input type="date" value={form.date || ""} onChange={e => setForm({...form, date: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Duration (min)</label>
                  <input type="number" value={form.duration_minutes || ""} onChange={e => setForm({...form, duration_minutes: +e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Focus / Theme</label>
                  <input value={form.focus || ""} onChange={e => setForm({...form, focus: e.target.value})} placeholder="e.g. Red Zone Offense, Pass Rush"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Status</label>
                  <select value={form.status || "draft"} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 text-xs uppercase tracking-wider">Practice Periods</label>
                  <button onClick={addPeriod} className="text-orange-500 hover:text-orange-400 text-xs flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Period
                  </button>
                </div>
                <div className="space-y-2">
                  {(form.periods || []).map((period, i) => (
                    <div key={i} className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input value={period.name || ""} onChange={e => updatePeriod(i, "name", e.target.value)} placeholder="Period name"
                            className="col-span-2 bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs focus:outline-none focus:border-orange-500" />
                          <input type="number" value={period.duration || ""} onChange={e => updatePeriod(i, "duration", +e.target.value)} placeholder="Min"
                            className="bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs focus:outline-none focus:border-orange-500" />
                        </div>
                        <button onClick={() => removePeriod(i)} className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      <input value={period.drill || ""} onChange={e => updatePeriod(i, "drill", e.target.value)} placeholder="Drill / Activity"
                        className="w-full bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs focus:outline-none focus:border-orange-500" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
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