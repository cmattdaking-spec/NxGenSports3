import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X } from "lucide-react";

export default function AddMetricForm({ players, onSaved, onClose }) {
  const [form, setForm] = useState({
    player_name: "", game_date: "", opponent: "", category: "film_grade",
    metric_source: "manual", play_grade: "", effort_grade: "", assignment_grade: "",
    technique_grade: "", top_speed_mph: "", avg_speed_mph: "", distance_covered_yards: "",
    snap_count: "", epa: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.player_name || !form.game_date) return;
    setSaving(true);
    const payload = { ...form };
    // Convert numeric strings to numbers
    ["play_grade","effort_grade","assignment_grade","technique_grade","top_speed_mph","avg_speed_mph","distance_covered_yards","snap_count","epa"]
      .forEach(k => { if (payload[k] !== "") payload[k] = parseFloat(payload[k]); else delete payload[k]; });
    await base44.entities.PerformanceMetric.create(payload);
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-semibold text-sm">Log Performance Metric</p>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-500 text-xs block mb-1">Player *</label>
            <input value={form.player_name} onChange={e => set("player_name", e.target.value)}
              list="player-names" placeholder="Player name"
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" />
            <datalist id="player-names">{players.map(p => <option key={p.id} value={`${p.first_name} ${p.last_name}`} />)}</datalist>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Game Date *</label>
            <input type="date" value={form.game_date} onChange={e => set("game_date", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" />
          </div>
        </div>
        <div>
          <label className="text-gray-500 text-xs block mb-1">Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm">
            <option value="film_grade">Film Grade</option>
            <option value="speed">Speed / GPS</option>
            <option value="efficiency">Efficiency</option>
            <option value="biometric">Biometric</option>
          </select>
        </div>
        <div>
          <label className="text-gray-500 text-xs block mb-1">Source</label>
          <select value={form.metric_source} onChange={e => set("metric_source", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm">
            <option value="manual">Manual</option>
            <option value="hudl">Hudl</option>
            <option value="odk">ODK</option>
            <option value="catapult">Catapult</option>
            <option value="imported">Imported</option>
          </select>
        </div>

        {(form.category === "film_grade") && <>
          <div><label className="text-gray-500 text-xs block mb-1">Play Grade (0-100)</label>
            <input type="number" min="0" max="100" value={form.play_grade} onChange={e => set("play_grade", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" /></div>
          <div><label className="text-gray-500 text-xs block mb-1">Effort Grade</label>
            <input type="number" min="0" max="100" value={form.effort_grade} onChange={e => set("effort_grade", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" /></div>
          <div><label className="text-gray-500 text-xs block mb-1">Assignment Grade</label>
            <input type="number" min="0" max="100" value={form.assignment_grade} onChange={e => set("assignment_grade", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" /></div>
          <div><label className="text-gray-500 text-xs block mb-1">Technique Grade</label>
            <input type="number" min="0" max="100" value={form.technique_grade} onChange={e => set("technique_grade", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" /></div>
          <div><label className="text-gray-500 text-xs block mb-1">Snap Count</label>
            <input type="number" value={form.snap_count} onChange={e => set("snap_count", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" /></div>
          <div><label className="text-gray-500 text-xs block mb-1">EPA</label>
            <input type="number" step="0.1" value={form.epa} onChange={e => set("epa", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" /></div>
        </>}

        {form.category === "speed" && <>
          <div><label className="text-gray-500 text-xs block mb-1">Top Speed (mph)</label>
            <input type="number" step="0.1" value={form.top_speed_mph} onChange={e => set("top_speed_mph", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" /></div>
          <div><label className="text-gray-500 text-xs block mb-1">Avg Speed (mph)</label>
            <input type="number" step="0.1" value={form.avg_speed_mph} onChange={e => set("avg_speed_mph", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" /></div>
          <div><label className="text-gray-500 text-xs block mb-1">Distance Covered (yds)</label>
            <input type="number" value={form.distance_covered_yards} onChange={e => set("distance_covered_yards", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" /></div>
        </>}

        <div className="col-span-2">
          <label className="text-gray-500 text-xs block mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm resize-none" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 bg-gray-800 text-gray-400 py-2 rounded-lg text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.player_name || !form.game_date}
          className="flex-1 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
          style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          <Plus className="w-4 h-4" /> {saving ? "Saving..." : "Save Metric"}
        </button>
      </div>
    </div>
  );
}