import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Edit, Trash2, X, Zap, BookOpen } from "lucide-react";
import PlayDesigner from "../components/playbook/PlayDesigner";

const CATEGORIES = ["run","pass","screen","play_action","blitz","coverage","zone","man","punt","kick","return"];
const UNITS = ["offense","defense","special_teams"];
const catColor = { run: "bg-green-500/20 text-green-400", pass: "bg-blue-500/20 text-blue-400", screen: "bg-cyan-500/20 text-cyan-400", play_action: "bg-purple-500/20 text-purple-400", blitz: "bg-red-500/20 text-red-400", coverage: "bg-yellow-500/20 text-yellow-400", zone: "bg-orange-500/20 text-orange-400", man: "bg-pink-500/20 text-pink-400", punt: "bg-gray-500/20 text-gray-400", kick: "bg-gray-500/20 text-gray-400", return: "bg-indigo-500/20 text-indigo-400" };

export default function Playbook() {
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [viewPlay, setViewPlay] = useState(null);

  const load = () => base44.entities.Play.list().then(d => { setPlays(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = plays.filter(p => {
    const match = p.name?.toLowerCase().includes(search.toLowerCase()) || p.formation?.toLowerCase().includes(search.toLowerCase());
    const matchUnit = filterUnit === "all" || p.unit === filterUnit;
    const matchCat = filterCat === "all" || p.category === filterCat;
    return match && matchUnit && matchCat;
  });

  const openAdd = () => { setEditing(null); setForm({ unit: "offense", category: "run" }); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({...p}); setShowForm(true); };

  const save = async () => {
    if (editing) await base44.entities.Play.update(editing.id, form);
    else await base44.entities.Play.create(form);
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (confirm("Delete play?")) { await base44.entities.Play.delete(id); load(); }
  };

  const getAISuggestions = async () => {
    setAiLoading(true);
    setAiSuggestions("");
    const existing = plays.map(p => `${p.name} (${p.category}, ${p.unit})`).join(", ");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football offensive/defensive coordinator AI. Based on a high school/college football team, suggest 5 highly effective plays that would complement their existing playbook.\n\nExisting plays: ${existing || "None yet"}\n\nProvide play suggestions with:\n- Play name\n- Formation\n- Category (run/pass/screen/play_action/blitz/coverage/zone/man)\n- Brief description\n- Best down & distance situation\n\nFormat clearly and be specific.`,
    });
    setAiSuggestions(res);
    setAiLoading(false);
  };

  const groups = UNITS.reduce((acc, u) => {
    acc[u] = filtered.filter(p => p.unit === u);
    return acc;
  }, {});

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Play<span className="text-orange-500">book</span></h1>
          <p className="text-gray-500 text-sm">{plays.length} plays in library</p>
        </div>
        <div className="flex gap-2">
          <button onClick={getAISuggestions} disabled={aiLoading}
            className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 px-3 py-2 rounded-lg text-sm font-medium transition-all">
            <Zap className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{aiLoading ? "Thinking..." : "AI Suggest"}</span>
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Play
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plays..."
            className="w-full bg-[#141414] border border-gray-800 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
          className="bg-[#141414] border border-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
          <option value="all">All Units</option>
          {UNITS.map(u => <option key={u} value={u}>{u.replace("_"," ")}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-[#141414] border border-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
          <option value="all">All Types</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_"," ")}</option>)}
        </select>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-orange-400 font-medium text-sm">AI Play Suggestions</span>
            <button onClick={() => setAiSuggestions("")} className="ml-auto text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-gray-300 text-sm whitespace-pre-line">{aiSuggestions}</p>
        </div>
      )}

      {/* Plays by Unit */}
      <div className="space-y-6">
        {UNITS.map(u => {
          if (filterUnit !== "all" && filterUnit !== u) return null;
          const unitPlays = groups[u] || [];
          if (unitPlays.length === 0 && filterUnit === "all") return null;
          return (
            <div key={u}>
              <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${u === "offense" ? "bg-blue-500" : u === "defense" ? "bg-red-500" : "bg-purple-500"}`} />
                {u.replace("_"," ")}
                <span className="text-gray-600 font-normal">({unitPlays.length})</span>
              </h2>
              {unitPlays.length === 0 ? (
                <p className="text-gray-600 text-sm">No plays yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unitPlays.map(p => (
                    <div key={p.id} className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-orange-500/30 transition-all group">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-bold">{p.name}</p>
                          {p.formation && <p className="text-gray-500 text-xs mt-0.5">{p.formation}</p>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(p)} className="text-gray-500 hover:text-orange-500 p-1"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => remove(p.id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${catColor[p.category] || "bg-gray-500/20 text-gray-400"}`}>{p.category?.replace("_"," ")}</span>
                        {p.down_distance && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{p.down_distance}</span>}
                        {p.ai_suggested && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 flex items-center gap-1"><Zap className="w-2.5 h-2.5" />AI</span>}
                      </div>
                      {p.description && <p className="text-gray-500 text-xs mt-2 line-clamp-2">{p.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {plays.length === 0 && !loading && (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No plays yet. Add your first play or use AI suggestions.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Play" : "Add Play"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Play Name *</label>
                  <input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Unit *</label>
                  <select value={form.unit || "offense"} onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    {UNITS.map(u => <option key={u} value={u}>{u.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Category *</label>
                  <select value={form.category || "run"} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Formation</label>
                  <input value={form.formation || ""} onChange={e => setForm({...form, formation: e.target.value})} placeholder="e.g. Shotgun 11 Personnel"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Down & Distance</label>
                  <input value={form.down_distance || ""} onChange={e => setForm({...form, down_distance: e.target.value})} placeholder="e.g. 3rd & Short"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Field Zone</label>
                  <input value={form.field_zone || ""} onChange={e => setForm({...form, field_zone: e.target.value})} placeholder="e.g. Red Zone"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Personnel</label>
                  <input value={form.personnel || ""} onChange={e => setForm({...form, personnel: e.target.value})} placeholder="e.g. 11 Personnel"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Description</label>
                <textarea value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} rows={3} placeholder="Describe the play, routes, blocking assignments..."
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Coaching Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={save} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium">Save Play</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}