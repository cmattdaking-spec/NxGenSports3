import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, Zap, Target, ChevronDown, ChevronUp } from "lucide-react";

const UNITS = ["offense","defense","special_teams"];
const LOCATIONS = ["home","away","neutral"];

export default function GamePlan() {
  const [plans, setPlans] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTarget, setAiTarget] = useState(null);

  const load = async () => {
    const [gp, op, pl] = await Promise.all([
      base44.entities.GamePlan.list(),
      base44.entities.Opponent.list(),
      base44.entities.Play.list()
    ]);
    setPlans(gp); setOpponents(op); setPlays(pl); setLoading(false);
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
      prompt: `You are a football coordinator AI assistant. Generate a comprehensive game plan for the ${plan.unit} unit.\n\nOpponent: ${plan.opponent}\nGame Date: ${plan.game_date}\nLocation: ${plan.location}\n${opp ? `\nOpponent Tendencies:\n- Offensive: ${opp.offensive_tendency || "Unknown"}\n- Defensive: ${opp.defensive_tendency || "Unknown"}\n- Key Players: ${opp.key_players || "Unknown"}\n- Strengths: ${opp.strengths || "Unknown"}\n- Weaknesses: ${opp.weaknesses || "Unknown"}` : ""}\n\nAvailable Plays: ${unitPlays || "None specified"}\n\nProvide:\n1. Opening Script (5 plays)\n2. Red Zone approach\n3. Third down strategy\n4. Two-minute drill suggestions\n5. Key matchups to exploit\n6. Situational adjustments`,
    });
    await base44.entities.GamePlan.update(plan.id, { ai_suggestions: res });
    load(); setAiLoading(false); setAiTarget(null);
  };

  const unitColor = { offense: "border-l-blue-500", defense: "border-l-red-500", special_teams: "border-l-purple-500" };
  const statusBadge = { draft: "bg-yellow-500/20 text-yellow-400", final: "bg-green-500/20 text-green-400" };

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Game <span className="text-orange-500">Plans</span></h1>
          <p className="text-gray-500 text-sm">{plans.length} plans created</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {plans.length === 0 && !loading && (
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
                <button onClick={() => getAISuggestions(plan)} disabled={aiLoading && aiTarget === plan.id}
                  className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2 py-1.5 rounded-lg text-xs hover:bg-orange-500/20 transition-all">
                  <Zap className={`w-3.5 h-3.5 ${aiLoading && aiTarget === plan.id ? "animate-pulse" : ""}`} />
                  <span className="hidden md:inline">{aiLoading && aiTarget === plan.id ? "..." : "AI Plan"}</span>
                </button>
                <button onClick={() => openEdit(plan)} className="text-gray-500 hover:text-orange-500 p-1.5 transition-colors"><Edit className="w-4 h-4" /></button>
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
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-orange-400 text-xs font-medium">AI Game Plan</span>
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
                  <p className="text-gray-600 text-sm">No details yet. Use AI to generate a game plan.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

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
                <button onClick={save} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium">Save Plan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}