import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, X, Check, Calendar, Dumbbell, Trophy } from "lucide-react";

const SPORT_LABELS = {
  football:"Football", basketball:"Basketball", baseball:"Baseball", softball:"Softball",
  soccer:"Soccer", volleyball:"Volleyball", boxing:"Boxing", golf:"Golf",
  tennis:"Tennis", wrestling:"Wrestling", cross_country:"Cross Country", track:"Track", lacrosse:"Lacrosse"
};
const ALL_SPORTS = Object.keys(SPORT_LABELS);

const BLANK_GAME = { type: "game", sport: "football", opponent: "", game_date: "", location: "home", notes: "" };
const BLANK_PRACTICE = { type: "practice", sport: "football", title: "", date: "", focus: "", duration_minutes: 90, notes: "" };

export default function ADScheduleTab({ opponents, practicePlans, onRefresh }) {
  const [sportFilter, setSportFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("game");
  const [form, setForm] = useState(BLANK_GAME);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Merge games and practices into unified timeline
  const allEvents = [
    ...opponents.map(o => ({ ...o, type: "game", date: o.game_date, label: `vs. ${o.name}` })),
    ...practicePlans.map(p => ({ ...p, type: "practice", label: p.title })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const filtered = allEvents.filter(e => sportFilter === "all" || e.sport === sportFilter);

  const saveAdd = async () => {
    setSaving(true);
    if (form.type === "game") {
      await base44.entities.Opponent.create({ name: form.opponent, game_date: form.date || form.game_date, location: form.location, sport: form.sport, notes: form.notes });
    } else {
      await base44.entities.PracticePlan.create({ title: form.title, date: form.date, focus: form.focus, duration_minutes: form.duration_minutes, sport: form.sport, notes: form.notes });
    }
    setSaving(false);
    setShowAdd(false);
    setForm(BLANK_GAME);
    onRefresh();
  };

  const saveEdit = async () => {
    setSaving(true);
    if (editForm.type === "game") {
      await base44.entities.Opponent.update(editForm.id, { name: editForm.name, game_date: editForm.game_date, location: editForm.location, sport: editForm.sport, notes: editForm.notes });
    } else {
      await base44.entities.PracticePlan.update(editForm.id, { title: editForm.title, date: editForm.date, focus: editForm.focus, duration_minutes: editForm.duration_minutes, sport: editForm.sport, notes: editForm.notes });
    }
    setSaving(false);
    setEditingId(null);
    onRefresh();
  };

  const deleteEvent = async (event) => {
    if (event.type === "game") await base44.entities.Opponent.delete(event.id);
    else await base44.entities.PracticePlan.delete(event.id);
    setConfirmDelete(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-white font-bold text-lg">Full Schedule ({filtered.length} events)</h2>
        <div className="flex gap-2 flex-wrap">
          <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
            className="bg-[#141414] border border-gray-700 rounded-xl px-3 py-1.5 text-white text-sm outline-none">
            <option value="all">All Sports</option>
            {ALL_SPORTS.map(s => <option key={s} value={s}>{SPORT_LABELS[s]}</option>)}
          </select>
          <button onClick={() => { setShowAdd(true); setAddType("practice"); setForm({...BLANK_PRACTICE}); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-all">
            <Plus className="w-4 h-4" /> Practice
          </button>
          <button onClick={() => { setShowAdd(true); setAddType("game"); setForm({...BLANK_GAME}); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-all">
            <Plus className="w-4 h-4" /> Game
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowAdd(false)}>
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Add {addType === "game" ? "Game" : "Practice"}</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Sport</label>
                  <select value={form.sport} onChange={e => setForm({...form, sport: e.target.value})}
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none">
                    {ALL_SPORTS.map(s => <option key={s} value={s}>{SPORT_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Date</label>
                  <input type="date" value={form.date || form.game_date} onChange={e => setForm({...form, date: e.target.value, game_date: e.target.value})}
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                </div>
              </div>
              {addType === "game" ? (
                <>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Opponent</label>
                    <input value={form.opponent} onChange={e => setForm({...form, opponent: e.target.value})}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none" placeholder="Opponent name" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Location</label>
                    <select value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none">
                      <option value="home">Home</option>
                      <option value="away">Away</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Title</label>
                    <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none" placeholder="Practice title" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Focus</label>
                      <input value={form.focus} onChange={e => setForm({...form, focus: e.target.value})}
                        className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none" placeholder="e.g. Red zone" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Duration (min)</label>
                      <input type="number" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value)})}
                        className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none resize-none" />
              </div>
              <button onClick={saveAdd} disabled={saving}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition-all disabled:opacity-50">
                {saving ? "Saving…" : "Add to Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl divide-y divide-gray-800">
        {filtered.length === 0 && <p className="text-gray-500 text-sm px-5 py-8 text-center">No events scheduled.</p>}
        {filtered.map(event => (
          <div key={`${event.type}-${event.id}`} className="px-4 py-3">
            {editingId === event.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Date</label>
                    <input type="date" value={editForm.date || editForm.game_date}
                      onChange={e => setEditForm({...editForm, date: e.target.value, game_date: e.target.value})}
                      className="w-full bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
                  </div>
                  {event.type === "game" ? (
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Opponent</label>
                      <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
                    </div>
                  ) : (
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Title</label>
                      <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}
                        className="w-full bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 text-xs">Cancel</button>
                  <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-xs disabled:opacity-50">
                    {saving ? "…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${event.type === "game" ? "bg-cyan-500/20" : "bg-purple-500/20"}`}>
                    {event.type === "game" ? <Trophy className="w-4 h-4 text-cyan-400" /> : <Dumbbell className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{event.label}</p>
                    <p className="text-gray-500 text-xs">
                      {event.date} · <span className="capitalize">{SPORT_LABELS[event.sport] || event.sport}</span>
                      {event.type === "game" && event.location && ` · ${event.location}`}
                      {event.type === "practice" && event.duration_minutes && ` · ${event.duration_minutes}min`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingId(event.id); setEditForm({...event}); }}
                    className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {confirmDelete === event.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => deleteEvent(event)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded-lg">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(event.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}