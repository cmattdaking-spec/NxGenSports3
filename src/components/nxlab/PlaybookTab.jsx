import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSport } from "@/components/SportContext";
import { getSportConfig } from "@/components/SportConfig";
import { Plus, Search, Edit, Trash2, X, Zap, BookOpen, Eye, Pen, Brain, Lock } from "lucide-react";
import usePullToRefresh, { PullIndicator } from "@/components/hooks/usePullToRefresh";
import PlayDesigner from "@/components/playbook/PlayDesigner";
import PlayDiagramViewer from "@/components/playbook/PlayDiagramViewer";
import NxPlayAI from "@/components/playbook/NxPlayAI";

const CAN_CREATE = ["admin","head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach"];

export default function PlaybookTab({ user }) {
  const { activeSport } = useSport();
  const cfg = getSportConfig(activeSport);
  const [plays, setPlays] = useState([]);
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);
  const [designerPlay, setDesignerPlay] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [diagramPlay, setDiagramPlay] = useState(null);
  const [opponents, setOpponents] = useState([]);
  const [showNxPlayAI, setShowNxPlayAI] = useState(false);

  const load = () => Promise.all([
    base44.entities.Play.filter({ sport: activeSport }),
    base44.entities.Opponent.filter({ sport: activeSport })
  ]).then(([p, o]) => { setPlays(p); setOpponents(o); });

  useEffect(() => { load(); }, [activeSport]);

  const { refreshing, pullDelta, handlers: pullHandlers } = usePullToRefresh(load);

  const role = user?.coaching_role || user?.role || "viewer";
  const canCreate = CAN_CREATE.includes(role) || user?.role === "admin";
  const canEditPlay = (p) => canCreate && (role !== "position_coach" || p.created_by === user?.email);

  const filtered = plays.filter(p => {
    if (p.is_private && p.created_by !== user?.email && role === "position_coach") return false;
    return (p.name?.toLowerCase().includes(search.toLowerCase()) || p.formation?.toLowerCase().includes(search.toLowerCase())) &&
      (filterUnit === "all" || p.unit === filterUnit) &&
      (filterCat === "all" || p.category === filterCat);
  });

  const groups = cfg.units.reduce((acc, u) => { acc[u] = filtered.filter(p => p.unit === u); return acc; }, {});

  const openAdd = () => { setEditing(null); setForm({ unit: cfg.units[0], category: cfg.playCategories[0], is_private: false, sport: activeSport }); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({...p}); setShowForm(true); };

  const save = async () => {
    setShowForm(false);
    if (editing) {
      setPlays(prev => prev.map(p => p.id === editing.id ? { ...p, ...form } : p));
      await base44.entities.Play.update(editing.id, form);
    } else {
      const tempId = `temp_${Date.now()}`;
      setPlays(prev => [...prev, { ...form, id: tempId, sport: activeSport }]);
      const np = await base44.entities.Play.create({ ...form, sport: activeSport });
      setPlays(prev => prev.map(p => p.id === tempId ? np : p));
      setDesignerPlay(np);
      setShowDesigner(true);
    }
  };

  const remove = async (id) => {
    if (confirm("Delete play?")) {
      setPlays(prev => prev.filter(p => p.id !== id));
      await base44.entities.Play.delete(id);
    }
  };

  const getAISuggestions = async () => {
    setAiLoading(true); setAiSuggestions("");
    const existing = plays.map(p => `${p.name} (${p.category}, ${p.unit})`).join(", ");
    const res = await base44.integrations.Core.InvokeLLM({ prompt: cfg.aiPlaybookContext(existing) });
    setAiSuggestions(res); setAiLoading(false);
  };

  const inp = "w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)]";

  return (
    <div className="p-4 md:p-6" {...pullHandlers}>
      <PullIndicator delta={pullDelta} refreshing={refreshing} />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">{cfg.termPlaybook.slice(0,2)}<span style={{ color: "var(--color-primary,#f97316)" }}>{cfg.termPlaybook.slice(2)}</span></h1>
          <p className="text-gray-500 text-sm">{plays.length} {cfg.termPlay.toLowerCase()}s</p>
        </div>
        <div className="flex gap-2">
          {canCreate && <button onClick={() => setShowNxPlayAI(true)} className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 px-3 py-2 rounded-lg text-sm font-medium"><Brain className="w-4 h-4" /><span className="hidden md:inline">NxPlay AI</span></button>}
          {canCreate && <button onClick={getAISuggestions} disabled={aiLoading} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border" style={{ backgroundColor: "var(--color-primary,#f97316)18", borderColor: "var(--color-primary,#f97316)55", color: "var(--color-primary,#f97316)" }}><Zap className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} /><span className="hidden md:inline">NxPlay</span></button>}
          {canCreate && <button onClick={() => { setDesignerPlay(null); setShowDesigner(true); }} className="flex items-center gap-2 bg-teal-600/20 border border-teal-500/30 text-teal-300 px-3 py-2 rounded-lg text-sm"><Pen className="w-4 h-4" /><span className="hidden md:inline">Designer</span></button>}
          {canCreate && <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}><Plus className="w-4 h-4" /> Add {cfg.termPlay}</button>}
        </div>
      </div>

      {aiSuggestions && (
        <div className="rounded-xl p-4 mb-6 border" style={{ backgroundColor: "var(--color-primary,#f97316)15", borderColor: "var(--color-primary,#f97316)40" }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
            <span className="font-medium text-sm" style={{ color: "var(--color-primary,#f97316)" }}>NxPlay Suggestions</span>
            <button onClick={() => setAiSuggestions("")} className="ml-auto text-gray-500"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-gray-300 text-sm whitespace-pre-line">{aiSuggestions}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${cfg.termPlay.toLowerCase()}s...`} className="w-full bg-[#141414] border border-gray-800 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none" />
        </div>
        <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="bg-[#141414] border border-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm">
          <option value="all">All Units</option>
          {cfg.units.map(u => <option key={u} value={u}>{cfg.unitLabels[u] || u.replace("_"," ")}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-[#141414] border border-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm">
          <option value="all">All Types</option>
          {cfg.playCategories.map(c => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
        </select>
      </div>

      <div className="space-y-6">
        {cfg.units.map(u => {
          if (filterUnit !== "all" && filterUnit !== u) return null;
          const unitPlays = groups[u] || [];
          if (unitPlays.length === 0 && filterUnit === "all") return null;
          return (
            <div key={u}>
              <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${u === "offense" ? "bg-blue-500" : u === "defense" ? "bg-red-500" : "bg-purple-500"}`} />
                {cfg.unitLabels[u] || u.replace("_"," ")} <span className="text-gray-600 font-normal">({unitPlays.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unitPlays.map(p => (
                  <div key={p.id} className="bg-[#141414] border border-gray-800 rounded-xl p-4 group" onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-primary,#f97316)55"} onMouseLeave={e => e.currentTarget.style.borderColor = ""}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold">{p.name}</p>
                          {p.is_private && <Lock className="w-3 h-3 text-teal-400" />}
                        </div>
                        {p.formation && <p className="text-gray-500 text-xs mt-0.5">{p.formation}</p>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDiagramPlay(p)} className="text-gray-500 hover:text-blue-400 p-1"><Eye className="w-3.5 h-3.5" /></button>
                        {canEditPlay(p) && <button onClick={() => { setDesignerPlay(p); setShowDesigner(true); }} className="text-gray-500 hover:text-teal-400 p-1"><Pen className="w-3.5 h-3.5" /></button>}
                        {canEditPlay(p) && <button onClick={() => openEdit(p)} className="text-gray-500 p-1" onMouseEnter={e => e.currentTarget.style.color="var(--color-primary,#f97316)"} onMouseLeave={e => e.currentTarget.style.color=""}><Edit className="w-3.5 h-3.5" /></button>}
                        {canEditPlay(p) && <button onClick={() => remove(p.id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.playCategoryColors[p.category] || "bg-gray-500/20 text-gray-400"}`}>{p.category?.replace(/_/g," ")}</span>
                      {p.ai_suggested && <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: "var(--color-primary,#f97316)25", color: "var(--color-primary,#f97316)" }}><Zap className="w-2.5 h-2.5" />Nx</span>}
                    </div>
                    {p.description && <p className="text-gray-500 text-xs mt-2 line-clamp-2">{p.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {plays.length === 0 && <div className="text-center py-20"><BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No plays yet. Add your first play or use AI suggestions.</p></div>}

      {showNxPlayAI && <NxPlayAI plays={plays} opponents={opponents} onClose={() => setShowNxPlayAI(false)} onSavePlay={() => { load(); setShowNxPlayAI(false); }} onOpenDesigner={({ play, elements }) => { setShowNxPlayAI(false); setDesignerPlay({ ...play, _designerElements: elements }); setShowDesigner(true); }} />}
      {diagramPlay && <PlayDiagramViewer play={diagramPlay} onClose={() => setDiagramPlay(null)} />}
      {showDesigner && (
        <PlayDesigner
          onClose={() => { setShowDesigner(false); setDesignerPlay(null); }}
          initialData={designerPlay ? { elements: designerPlay._designerElements || [] } : undefined}
          playName={designerPlay?.name}
          onSave={async ({ dataUrl, elements, format }) => {
            if (designerPlay?.id) await base44.entities.Play.update(designerPlay.id, { diagram_data: dataUrl, diagram_format: format });
            else await base44.entities.Play.create({ name: designerPlay?.name || "Untitled", unit: designerPlay?.unit || cfg.units[0], category: designerPlay?.category || cfg.playCategories[0], diagram_data: dataUrl, diagram_format: format, sport: activeSport });
            load();
          }}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? `Edit ${cfg.termPlay}` : `Add ${cfg.termPlay}`}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Name *</label>
                <input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Unit *</label>
                  <select value={form.unit || cfg.units[0]} onChange={e => setForm({...form, unit: e.target.value})} className={inp}>
                    {cfg.units.map(u => <option key={u} value={u}>{cfg.unitLabels[u] || u.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Category *</label>
                  <select value={form.category || cfg.playCategories[0]} onChange={e => setForm({...form, category: e.target.value})} className={inp}>
                    {cfg.playCategories.map(c => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Description</label>
                <textarea value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} rows={3} className={inp + " resize-none"} />
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                <Lock className="w-4 h-4 text-teal-400" />
                <div className="flex-1"><p className="text-white text-sm font-medium">Private</p><p className="text-gray-500 text-xs">Only visible to you</p></div>
                <button type="button" onClick={() => setForm(f => ({ ...f, is_private: !f.is_private }))} className={`w-10 h-6 rounded-full transition-colors ${form.is_private ? "bg-teal-500" : "bg-gray-700"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${form.is_private ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={save} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}