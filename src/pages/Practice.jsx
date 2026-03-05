import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, Zap, ClipboardList, ChevronDown, ChevronUp, Clock } from "lucide-react";

const STATUS_COLOR = { draft: "bg-yellow-500/20 text-yellow-400", active: "bg-blue-500/20 text-blue-400", completed: "bg-green-500/20 text-green-400" };

export default function Practice() {
  const [plans, setPlans] = useState([]);
  const [players, setPlayers] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ periods: [] });
  const [expanded, setExpanded] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTarget, setAiTarget] = useState(null);

  const load = async () => {
    const [pr, pl, h] = await Promise.all([
      base44.entities.PracticePlan.list("-date"),
      base44.entities.Player.list(),
      base44.entities.PlayerHealth.list()
    ]);
    setPlans(pr); setPlayers(pl); setHealthRecords(h); setLoading(false);
  };
  useEffect(() => { load(); }, []);

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
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football coaching AI. Generate a detailed practice plan for a high school/college football team.\n\nPractice Focus: ${plan.focus || "General"}\nTotal Duration: ${plan.duration_minutes || 120} minutes\nDate: ${plan.date}\n\n${injuredPlayers ? `Injured/Out Players: ${injuredPlayers}` : ""}\n${limitedPlayers ? `Limited Players: ${limitedPlayers}` : ""}\n\nCreate a period-by-period practice schedule with:\n1. Individual periods (time in minutes, group, drill name, coaching points)\n2. Include warm-up, individual periods, group periods, team periods, and cool-down\n3. Note any health accommodations for limited players\n4. Suggest specific drills for each period that match the focus area\n\nBe specific and practical for a high school/college program.`,
    });
    await base44.entities.PracticePlan.update(plan.id, { ai_suggestions: res });
    load(); setAiLoading(false); setAiTarget(null);
  };

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Practice <span className="text-orange-500">Plans</span></h1>
          <p className="text-gray-500 text-sm">{plans.length} plans</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Practice
        </button>
      </div>

      {plans.length === 0 && !loading && (
        <div className="text-center py-20">
          <ClipboardList className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No practice plans yet. Create your first one!</p>
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
                <button onClick={() => getAISuggestions(plan)} disabled={aiLoading && aiTarget === plan.id}
                  className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2 py-1.5 rounded-lg text-xs hover:bg-orange-500/20 transition-all">
                  <Zap className={`w-3.5 h-3.5 ${aiLoading && aiTarget === plan.id ? "animate-pulse" : ""}`} />
                  <span className="hidden md:inline">{aiLoading && aiTarget === plan.id ? "..." : "AI Plan"}</span>
                </button>
                <button onClick={() => openEdit(plan)} className="text-gray-500 hover:text-orange-500 p-1.5"><Edit className="w-4 h-4" /></button>
                <button onClick={() => remove(plan.id)} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
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
                          <div className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded flex-shrink-0">{period.duration}m</div>
                          <div>
                            <p className="text-white text-sm font-medium">{period.name || "Period"}</p>
                            {period.drill && <p className="text-gray-400 text-xs mt-0.5">{period.drill}</p>}
                            {period.unit && <span className="text-xs text-orange-400">{period.unit}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {plan.ai_suggestions && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-orange-400 text-xs font-medium">AI Practice Plan</span>
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

      {/* Modal */}
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

              {/* Periods */}
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
                <button onClick={save} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium">Save Plan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}