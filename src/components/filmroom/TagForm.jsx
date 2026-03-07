import { useState } from "react";
import { Tag, Flag, CheckCircle, XCircle, Minus } from "lucide-react";

const PLAY_TYPES = ["run","pass","screen","play_action","blitz","coverage","punt","kick","return","penalty","turnover","score","other"];
const PERSONNEL = ["11","12","21","22","10","13","20","base_4-3","nickel","dime","other"];

function fmtTime(secs) {
  const s = Math.floor(secs);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function TagForm({ currentTime, onSave, onCancel }) {
  const [form, setForm] = useState({
    play_type: "pass",
    personnel: "11",
    result: "success",
    down: "",
    distance: "",
    yards: "",
    formation: "",
    notes: "",
    flagged: false,
    timestamp_seconds: Math.floor(currentTime || 0),
    timestamp_label: fmtTime(currentTime || 0),
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    if (!form.play_type || !form.result) return;
    onSave({
      ...form,
      timestamp_seconds: Number(form.timestamp_seconds),
      down: form.down ? Number(form.down) : undefined,
      distance: form.distance ? Number(form.distance) : undefined,
      yards: form.yards ? Number(form.yards) : undefined,
    });
  };

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
          <span className="text-white font-semibold text-sm">Tag Play</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Timestamp:</span>
          <input
            value={form.timestamp_label}
            onChange={e => {
              const parts = e.target.value.split(":");
              const secs = parts.length === 2 ? Number(parts[0]) * 60 + Number(parts[1]) : Number(parts[0]);
              set("timestamp_label", e.target.value);
              set("timestamp_seconds", isNaN(secs) ? 0 : secs);
            }}
            className="w-16 bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1 rounded text-xs text-center"
            placeholder="0:00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Play Type */}
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Play Type *</label>
          <select value={form.play_type} onChange={e => set("play_type", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm capitalize">
            {PLAY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        {/* Personnel */}
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Personnel</label>
          <select value={form.personnel} onChange={e => set("personnel", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm">
            {PERSONNEL.map(p => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        {/* Down */}
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Down</label>
          <select value={form.down} onChange={e => set("down", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm">
            <option value="">—</option>
            <option value="1">1st</option>
            <option value="2">2nd</option>
            <option value="3">3rd</option>
            <option value="4">4th</option>
          </select>
        </div>
        {/* Distance */}
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Distance (yds)</label>
          <input type="number" value={form.distance} onChange={e => set("distance", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" placeholder="10" />
        </div>
        {/* Formation */}
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Formation</label>
          <input value={form.formation} onChange={e => set("formation", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" placeholder="Shotgun, I-Form..." />
        </div>
        {/* Yards */}
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Yards Gained</label>
          <input type="number" value={form.yards} onChange={e => set("yards", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" placeholder="0" />
        </div>
      </div>

      {/* Result */}
      <div>
        <label className="text-gray-500 text-xs mb-1 block">Result *</label>
        <div className="flex gap-2">
          {[
            { v: "success", icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/20 border-green-500/40" },
            { v: "neutral", icon: Minus, color: "text-gray-400", bg: "bg-gray-700 border-gray-600" },
            { v: "failure", icon: XCircle, color: "text-red-400", bg: "bg-red-500/20 border-red-500/40" },
          ].map(({ v, icon: Icon, color, bg }) => (
            <button key={v} onClick={() => set("result", v)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.result === v ? bg : "bg-[#1a1a1a] border-gray-700 text-gray-500"}`}>
              <Icon className={`w-3.5 h-3.5 ${form.result === v ? color : ""}`} />
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-gray-500 text-xs mb-1 block">Coach Notes</label>
        <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
          className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm resize-none h-16"
          placeholder="Key observations, player name, scheme issue..." />
      </div>

      {/* Flag */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.flagged} onChange={e => set("flagged", e.target.checked)}
          className="w-3.5 h-3.5 accent-orange-500" />
        <Flag className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-gray-400 text-xs">Flag for review</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-700">Cancel</button>
        <button onClick={handleSave}
          className="flex-1 text-white py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          Save Tag
        </button>
      </div>
    </div>
  );
}