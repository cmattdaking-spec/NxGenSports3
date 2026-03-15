import { useState, useEffect, useContext } from "react";
import { useSportConfig } from "@/components/SportConfig";
import { SportContext } from "@/components/SportContext";
import { base44 } from "@/api/base44Client";
import {
  Target, Plus, Edit, Trash2, X, ChevronDown, ChevronUp,
  Calendar, MapPin, Shield, Zap, BookOpen, Brain, CheckCircle, Clock, Lock
} from "lucide-react";
import NxPlanAI from "../components/gameplan/NxPlanAI";
import LoadingScreen from "../components/LoadingScreen";

const STATUS_CFG = {
  draft: { label: "Draft", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  final: { label: "Final", color: "bg-green-500/20 text-green-400 border-green-500/30" },
};

export default function GamePlan() {
  const { activeSport } = useContext(SportContext);
  const cfg = useSportConfig(activeSport);
  const [plans, setPlans] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [players, setPlayers] = useState([]);
  const [plays, setPlays] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("plans");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [selectedOpponent, setSelectedOpponent] = useState(null);

  const load = async () => {
    const [gp, op, pl, py, u] = await Promise.all([
      base44.entities.GamePlan.list("-game_date"),
      base44.entities.Opponent.list("game_date"),
      base44.entities.Player.list(),
      base44.entities.Play.list(),
      base44.auth.me().catch(() => null),
    ]);
    setPlans(gp); setOpponents(op); setPlayers(pl); setPlays(py); setUser(u);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const EDIT_ROLES = ["head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach"];
  const canEdit = user && (user.role === "admin" || EDIT_ROLES.includes(user.coaching_role) || (user.is_associate_head_coach));

  const UNITS = cfg.units;

  const openAdd = () => {
    setEditing(null);
    setForm({ unit: cfg.units[0], status: "draft", scripted_plays: [], red_zone_plays: [], third_down_plays: [], two_minute_plays: [], opening_script: [] });
    setShowForm(true);
  };

  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setShowForm(true); };

  const save = async () => {
    setSaving(true);
    if (editing) await base44.entities.GamePlan.update(editing.id, form);
    else await base44.entities.GamePlan.create(form);
    setShowForm(false);
    setSaving(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this game plan?")) return;
    await base44.entities.GamePlan.delete(id);
    setPlans(p => p.filter(x => x.id !== id));
  };

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const playsByUnit = (plan) => cfg.gamePlanSections
    .map(sec => ({ label: sec.label, items: plan[sec.key], color: sec.color }))
    .filter(s => s.items?.length > 0);

  if (loading) return <LoadingScreen />;

  const isAD = user?.coaching_role === "athletic_director";

  if (isAD) {
    return (
      <div className="bg-[#0a0a0a] min-h-full flex items-center justify-center">
        <div className="text-center text-gray-500 max-w-sm px-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-white font-bold text-lg">Game Plan Access Restricted</p>
          <p className="text-gray-500 text-sm mt-1">
            Game plans are managed by coaching staff. Athletic Directors can review outcomes via reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-full">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 md:px-8 py-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-white">Nx<span style={{ color: "var(--color-primary,#f97316)" }}>Plan</span></h1>
            <p className="text-gray-500 text-sm mt-1">AI-powered game planning · {plans.length} plans</p>
          </div>
          {canEdit && tab === "plans" && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              <Plus className="w-4 h-4" /> New Plan
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-[#141414] border border-gray-800 rounded-lg p-1 w-fit">
          {[{ id: "plans", label: "Game Plans" }, { id: "ai", label: "NxPlan AI" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t.id ? "text-white" : "text-gray-400 hover:text-white"}`}
              style={tab === t.id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
              {t.id === "ai" && <Brain className="w-3.5 h-3.5 inline mr-1.5" />}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* AI Tab */}
        {tab === "ai" && (
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Generate plan for opponent</label>
              <select value={selectedOpponent?.id || ""}
                onChange={e => setSelectedOpponent(opponents.find(o => o.id === e.target.value) || null)}
                className="bg-[#141414] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none w-full md:w-80">
                <option value="">Select upcoming opponent...</option>
                {opponents.map(o => <option key={o.id} value={o.id}>{o.name} – {o.game_date}</option>)}
              </select>
            </div>
            <NxPlanAI
              opponent={selectedOpponent}
              players={players}
              plays={plays}
              onSave={() => { load(); setTab("plans"); }}
            />
          </div>
        )}

        {/* Plans Tab */}
        {tab === "plans" && (
          <div className="space-y-4">
            {plans.length === 0 ? (
              <div className="text-center py-20 text-gray-600">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-gray-500">No game plans yet</p>
                <p className="text-sm mt-1">Create a plan manually or use NxPlan AI</p>
                <button onClick={() => setTab("ai")} className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                  <Brain className="w-4 h-4 inline mr-1" /> Try NxPlan AI
                </button>
              </div>
            ) : plans.map(plan => {
              const sections = playsByUnit(plan);
              const isOpen = expanded[plan.id];
              return (
                <div key={plan.id} className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all">
                  <div className="px-5 py-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-white font-bold text-lg">vs. {plan.opponent}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CFG[plan.status]?.color || STATUS_CFG.draft.color}`}>
                          {STATUS_CFG[plan.status]?.label || "Draft"}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-300 capitalize">
                          {plan.unit?.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-gray-500 text-xs flex-wrap">
                        {plan.game_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {plan.game_date}
                          </span>
                        )}
                        {plan.location && (
                          <span className="flex items-center gap-1 capitalize">
                            <MapPin className="w-3 h-3" /> {plan.location}
                          </span>
                        )}
                        {sections.length > 0 && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {sections.reduce((s, sec) => s + (sec.items?.length || 0), 0)} plays
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canEdit && (
                        <>
                          <button onClick={() => openEdit(plan)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-all">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => remove(plan.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button onClick={() => toggleExpand(plan.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-all">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                      {plan.key_tendencies && (
                        <div>
                          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Key Tendencies</p>
                          <p className="text-gray-300 text-sm leading-relaxed">{plan.key_tendencies}</p>
                        </div>
                      )}
                      {plan.ai_suggestions && (
                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                          <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-1">NxPlan AI Summary</p>
                          <p className="text-gray-300 text-sm leading-relaxed">{plan.ai_suggestions}</p>
                        </div>
                      )}
                      {sections.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sections.map(sec => (
                            <div key={sec.label} className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-3">
                              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${sec.color}`}>{sec.label}</p>
                              <ol className="space-y-1">
                                {sec.items.slice(0, 8).map((play, i) => (
                                  <li key={i} className="text-gray-300 text-xs flex items-start gap-1.5">
                                    <span className={`font-bold flex-shrink-0 ${sec.color}`}>{i + 1}.</span> {play}
                                  </li>
                                ))}
                                {sec.items.length > 8 && <li className="text-gray-600 text-xs">+{sec.items.length - 8} more</li>}
                              </ol>
                            </div>
                          ))}
                        </div>
                      )}
                      {plan.notes && (
                        <div>
                          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Notes / Adjustments</p>
                          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{plan.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-[#141414] z-10">
              <h2 className="text-white font-bold">{editing ? "Edit Game Plan" : "New Game Plan"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Opponent *</label>
                  <input value={form.opponent || ""} onChange={e => setForm({ ...form, opponent: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Game Date *</label>
                  <input type="date" value={form.game_date || ""} onChange={e => setForm({ ...form, game_date: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Unit *</label>
                  <select value={form.unit || cfg.units[0]} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none">
                    {UNITS.map(u => <option key={u} value={u}>{cfg.unitLabels[u] || u.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Location</label>
                  <select value={form.location || "home"} onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none">
                    {["home", "away", "neutral"].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Status</label>
                  <select value={form.status || "draft"} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none">
                    <option value="draft">Draft</option>
                    <option value="final">Final</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">{cfg.gamePlanKeyTendenciesLabel}</label>
                <textarea rows={2} value={form.key_tendencies || ""} onChange={e => setForm({ ...form, key_tendencies: e.target.value })}
                  placeholder="Opponent's key tendencies and how to attack them..."
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
              </div>

              {cfg.gamePlanSections.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-gray-400 text-xs mb-1 block">{label} (one per line)</label>
                  <textarea rows={3} value={(form[key] || []).join("\n")} onChange={e => setForm({ ...form, [key]: e.target.value.split("\n").filter(Boolean) })}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
                </div>
              ))}

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                <textarea rows={3} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 text-gray-300 py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={save} disabled={saving || !form.opponent || !form.game_date}
                  className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                  {saving ? "Saving..." : editing ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}