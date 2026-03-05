import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, Zap, Crosshair, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

export default function Scouting() {
  const [opponents, setOpponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTarget, setAiTarget] = useState(null);

  const load = () => base44.entities.Opponent.list("-game_date").then(d => { setOpponents(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ location: "home" }); setShowForm(true); };
  const openEdit = (o) => { setEditing(o); setForm({...o}); setShowForm(true); };
  const save = async () => {
    if (editing) await base44.entities.Opponent.update(editing.id, form);
    else await base44.entities.Opponent.create(form);
    setShowForm(false); load();
  };
  const remove = async (id) => { if (confirm("Delete opponent?")) { await base44.entities.Opponent.delete(id); load(); } };

  const getScoutReport = async (opp) => {
    setAiLoading(true); setAiTarget(opp.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football scouting AI assistant. Generate a comprehensive scouting report for an upcoming opponent.\n\nOpponent: ${opp.name}\nRecord: ${opp.record || "Unknown"}\nConference: ${opp.conference || "Unknown"}\nGame Date: ${opp.game_date}\nLocation: ${opp.location}\n\nKnown Information:\n- Offensive Tendency: ${opp.offensive_tendency || "Unknown"}\n- Defensive Tendency: ${opp.defensive_tendency || "Unknown"}\n- Key Players: ${opp.key_players || "Unknown"}\n- Strengths: ${opp.strengths || "Unknown"}\n- Weaknesses: ${opp.weaknesses || "Unknown"}\n\nUsing your knowledge of football schemes and the information provided, generate:\n1. Offensive Tendencies & Formation Analysis\n2. Defensive Scheme & Coverage Analysis\n3. Key Players to Watch\n4. Exploitable Weaknesses\n5. Recommended Game Plan Adjustments\n6. Key Matchups\n7. Special Teams Analysis\n\nBe specific, tactical, and practical for high school/college level.`,
      add_context_from_internet: true
    });
    await base44.entities.Opponent.update(opp.id, { ai_scout_report: res });
    load(); setAiLoading(false); setAiTarget(null);
  };

  const locationBadge = { home: "bg-green-500/20 text-green-400", away: "bg-red-500/20 text-red-400", neutral: "bg-yellow-500/20 text-yellow-400" };

  const upcoming = opponents.filter(o => new Date(o.game_date) >= new Date());
  const past = opponents.filter(o => new Date(o.game_date) < new Date());

  const renderOpponent = (opp) => (
    <div key={opp.id} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-white font-bold">{opp.name}</h3>
            {opp.record && <span className="text-gray-500 text-sm">({opp.record})</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full ${locationBadge[opp.location]}`}>{opp.location}</span>
          </div>
          <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
            <span>{opp.game_date}</span>
            {opp.conference && <span>· {opp.conference}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {opp.hudl_link && (
            <a href={opp.hudl_link} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-1.5 rounded-lg text-xs hover:bg-blue-500/20 transition-all">
              <ExternalLink className="w-3.5 h-3.5" /> Hudl
            </a>
          )}
          <button onClick={() => getScoutReport(opp)} disabled={aiLoading && aiTarget === opp.id}
            className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2 py-1.5 rounded-lg text-xs hover:bg-orange-500/20 transition-all">
            <Zap className={`w-3.5 h-3.5 ${aiLoading && aiTarget === opp.id ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{aiLoading && aiTarget === opp.id ? "Scouting..." : "AI Scout"}</span>
          </button>
          <button onClick={() => openEdit(opp)} className="text-gray-500 hover:text-orange-500 p-1.5"><Edit className="w-4 h-4" /></button>
          <button onClick={() => remove(opp.id)} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
          <button onClick={() => setExpanded(expanded === opp.id ? null : opp.id)} className="text-gray-500 hover:text-white p-1.5">
            {expanded === opp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded === opp.id && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {[
            { label: "Offensive Tendency", val: opp.offensive_tendency },
            { label: "Defensive Tendency", val: opp.defensive_tendency },
            { label: "Key Players", val: opp.key_players },
            { label: "Strengths", val: opp.strengths },
            { label: "Weaknesses", val: opp.weaknesses },
            { label: "Notes", val: opp.notes },
          ].filter(item => item.val).map(({ label, val }) => (
            <div key={label}>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</p>
              <p className="text-gray-300 text-sm">{val}</p>
            </div>
          ))}
          {opp.ai_scout_report && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-orange-400 text-xs font-medium">AI Scouting Report</span>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-line">{opp.ai_scout_report}</p>
            </div>
          )}
          {!opp.offensive_tendency && !opp.ai_scout_report && (
            <p className="text-gray-600 text-sm">No scout data yet. Use AI Scout to generate a report.</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Opponent <span className="text-orange-500">Scouting</span></h1>
          <p className="text-gray-500 text-sm">{opponents.length} opponents</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Opponent
        </button>
      </div>

      {opponents.length === 0 && !loading && (
        <div className="text-center py-20">
          <Crosshair className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No opponents yet. Add your schedule!</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Upcoming Games</h2>
          <div className="space-y-3">{upcoming.map(renderOpponent)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Past Games</h2>
          <div className="space-y-3 opacity-70">{past.map(renderOpponent)}</div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Opponent" : "Add Opponent"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Team Name *</label>
                  <input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})}
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
                    <option value="home">Home</option>
                    <option value="away">Away</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Record</label>
                  <input value={form.record || ""} onChange={e => setForm({...form, record: e.target.value})} placeholder="e.g. 5-2"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Conference</label>
                  <input value={form.conference || ""} onChange={e => setForm({...form, conference: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Hudl Link</label>
                  <input value={form.hudl_link || ""} onChange={e => setForm({...form, hudl_link: e.target.value})} placeholder="https://hudl.com/..."
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              {[
                { label: "Offensive Tendencies", key: "offensive_tendency" },
                { label: "Defensive Tendencies", key: "defensive_tendency" },
                { label: "Key Players", key: "key_players" },
                { label: "Strengths", key: "strengths" },
                { label: "Weaknesses", key: "weaknesses" },
                { label: "Notes", key: "notes" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                  <textarea value={form[key] || ""} onChange={e => setForm({...form, [key]: e.target.value})} rows={2}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={save} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium">Save Opponent</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}