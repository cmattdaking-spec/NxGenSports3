import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Plus, X, Save, Trophy } from "lucide-react";

const EVENT_TYPES = ["Touchdown","Field Goal","Safety","Turnover","Big Play","Penalty","Injury","Timeout","Key Stop","2-Pt Conv"];

export default function GameLogger({ opponent, onSaved }) {
  const [form, setForm] = useState({
    our_score: opponent.our_score ?? "",
    their_score: opponent.their_score ?? "",
    game_notes: opponent.game_notes || "",
    key_events: opponent.key_events || [],
  });
  const [newEvent, setNewEvent] = useState({ quarter: 1, event_type: "Touchdown", description: "" });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const addEvent = () => {
    if (!newEvent.description.trim()) return;
    setForm(f => ({ ...f, key_events: [...f.key_events, { ...newEvent }] }));
    setNewEvent({ quarter: 1, event_type: "Touchdown", description: "" });
  };

  const removeEvent = (idx) => setForm(f => ({ ...f, key_events: f.key_events.filter((_, i) => i !== idx) }));

  const save = async () => {
    setSaving(true);
    const ourScore = form.our_score !== "" ? +form.our_score : undefined;
    const theirScore = form.their_score !== "" ? +form.their_score : undefined;
    let gameResult = "";
    if (ourScore !== undefined && theirScore !== undefined) {
      gameResult = ourScore > theirScore ? "W" : ourScore < theirScore ? "L" : "T";
    }
    await base44.entities.Opponent.update(opponent.id, {
      our_score: ourScore,
      their_score: theirScore,
      game_result: gameResult,
      key_events: form.key_events,
      game_notes: form.game_notes,
    });
    setSaving(false);
    onSaved?.();
    setOpen(false);
  };

  const isPast = new Date(opponent.game_date) < new Date();
  const resultColor = { W: "text-green-400 bg-green-500/20", L: "text-red-400 bg-red-500/20", T: "text-yellow-400 bg-yellow-500/20" };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {opponent.game_result && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${resultColor[opponent.game_result] || ""}`}>
            {opponent.game_result} {opponent.our_score}–{opponent.their_score}
          </span>
        )}
        {isPast && (
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all">
            <ClipboardList className="w-3 h-3" />
            {opponent.game_result ? "Edit Game Log" : "Log Game"}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 bg-[#1a1a1a] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-green-400" />
              <p className="text-white text-sm font-semibold">Game Log — vs {opponent.name}</p>
              <span className="text-gray-500 text-xs">{opponent.game_date}</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-300"><X className="w-3.5 h-3.5" /></button>
          </div>

          <div className="p-4 space-y-4">
            {/* Score */}
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Final Score</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-gray-500 text-xs block mb-1">Our Score</label>
                  <input type="number" min="0" value={form.our_score} onChange={e => setForm(f => ({...f, our_score: e.target.value}))}
                    className="w-full bg-[#141414] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm text-center font-bold focus:outline-none focus:border-green-500" />
                </div>
                <span className="text-gray-500 text-xl font-bold">—</span>
                <div className="flex-1">
                  <label className="text-gray-500 text-xs block mb-1">Their Score</label>
                  <input type="number" min="0" value={form.their_score} onChange={e => setForm(f => ({...f, their_score: e.target.value}))}
                    className="w-full bg-[#141414] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm text-center font-bold focus:outline-none focus:border-red-500" />
                </div>
                {form.our_score !== "" && form.their_score !== "" && (
                  <div className={`px-3 py-2 rounded-lg text-sm font-bold ${+form.our_score > +form.their_score ? "bg-green-500/20 text-green-400" : +form.our_score < +form.their_score ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {+form.our_score > +form.their_score ? "WIN" : +form.our_score < +form.their_score ? "LOSS" : "TIE"}
                  </div>
                )}
              </div>
            </div>

            {/* Key Events */}
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Key Events</p>
              <div className="flex gap-2 flex-wrap mb-2">
                <select value={newEvent.quarter} onChange={e => setNewEvent(p => ({...p, quarter: +e.target.value}))}
                  className="bg-[#141414] border border-gray-700 text-white px-2 py-1.5 rounded-lg text-xs outline-none w-20">
                  {[1,2,3,4,"OT"].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
                <select value={newEvent.event_type} onChange={e => setNewEvent(p => ({...p, event_type: e.target.value}))}
                  className="bg-[#141414] border border-gray-700 text-white px-2 py-1.5 rounded-lg text-xs outline-none">
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={newEvent.description} onChange={e => setNewEvent(p => ({...p, description: e.target.value}))}
                  onKeyDown={e => e.key === "Enter" && addEvent()}
                  placeholder="Describe the event..."
                  className="flex-1 bg-[#141414] border border-gray-700 text-white px-2 py-1.5 rounded-lg text-xs outline-none min-w-32" />
                <button onClick={addEvent} className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {form.key_events.length === 0 ? (
                  <p className="text-gray-600 text-xs">No events logged yet.</p>
                ) : form.key_events.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#141414] rounded-lg px-2.5 py-1.5">
                    <span className="text-xs bg-gray-800 text-gray-400 px-1.5 rounded font-mono">Q{ev.quarter}</span>
                    <span className="text-xs text-[var(--color-primary,#f97316)] font-medium">{ev.event_type}</span>
                    <span className="text-gray-300 text-xs flex-1">{ev.description}</span>
                    <button onClick={() => removeEvent(i)} className="text-gray-600 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Post-game notes */}
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Post-Game Notes & Takeaways</label>
              <textarea value={form.game_notes} onChange={e => setForm(f => ({...f, game_notes: e.target.value}))} rows={3}
                className="w-full bg-[#141414] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)] resize-none" />
            </div>

            <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Game Log"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}