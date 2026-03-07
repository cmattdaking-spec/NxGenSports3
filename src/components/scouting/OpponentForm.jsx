import { X } from "lucide-react";

export default function OpponentForm({ opponent, onSave, onCancel, loading }) {
  const [form, setForm] = require("react").useState(opponent || { location: "home" });

  const handleSave = () => {
    if (!form.name || !form.game_date) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-white font-bold">{opponent ? "Edit Opponent" : "Add Opponent"}</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-gray-400 text-xs mb-1 block">Team Name *</label><input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" /></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Game Date *</label><input type="date" value={form.game_date || ""} onChange={e => setForm({...form, game_date: e.target.value})} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" /></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Location</label><select value={form.location || "home"} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none"><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Record</label><input value={form.record || ""} onChange={e => setForm({...form, record: e.target.value})} placeholder="e.g. 5-2" className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" /></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Conference</label><input value={form.conference || ""} onChange={e => setForm({...form, conference: e.target.value})} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" /></div>
            <div className="col-span-2"><label className="text-gray-400 text-xs mb-1 block">Hudl Link</label><input value={form.hudl_link || ""} onChange={e => setForm({...form, hudl_link: e.target.value})} placeholder="https://hudl.com/..." className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" /></div>
          </div>
          {[{ label: "Offensive Tendencies", key: "offensive_tendency" }, { label: "Defensive Tendencies", key: "defensive_tendency" }, { label: "Key Players", key: "key_players" }, { label: "Strengths", key: "strengths" }, { label: "Weaknesses", key: "weaknesses" }, { label: "Notes", key: "notes" }].map(({ label, key }) => (
            <div key={key}><label className="text-gray-400 text-xs mb-1 block">{label}</label><textarea value={form[key] || ""} onChange={e => setForm({...form, [key]: e.target.value})} rows={2} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none resize-none" /></div>
          ))}
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} disabled={loading} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={loading || !form.name || !form.game_date} className="flex-1 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>{loading ? "Saving..." : "Save Opponent"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}