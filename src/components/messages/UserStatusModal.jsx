import { useState } from "react";
import { X, Circle, Clock, MinusCircle, BellOff } from "lucide-react";

const STATUSES = [
  { value: "online",  label: "Online",            color: "bg-green-400",  icon: Circle },
  { value: "away",    label: "Away",              color: "bg-yellow-400", icon: Clock },
  { value: "dnd",     label: "Do Not Disturb",    color: "bg-red-500",    icon: BellOff },
  { value: "offline", label: "Appear Offline",    color: "bg-gray-600",   icon: MinusCircle },
];

const QUICK_STATUSES = ["In a meeting", "Coaching session", "Film review", "Lunch break", "Be right back"];

export default function UserStatusModal({ current, customStatus, onSave, onClose }) {
  const [selected, setSelected] = useState(current || "online");
  const [custom, setCustom] = useState(customStatus || "");

  return (
    <div className="absolute bottom-12 left-3 z-50 w-64 bg-[#1a1a1a] border border-gray-700 rounded-xl shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-semibold text-sm">Set Status</span>
        <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <div className="space-y-1 mb-3">
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setSelected(s.value)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${selected === s.value ? "bg-white/10" : "hover:bg-white/5"}`}>
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.color}`} />
            <span className={`text-sm ${selected === s.value ? "text-white font-semibold" : "text-gray-400"}`}>{s.label}</span>
            {selected === s.value && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-primary,#3b82f6)]" />}
          </button>
        ))}
      </div>
      <div className="mb-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder="Custom status message..."
          className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {QUICK_STATUSES.map(q => (
          <button key={q} onClick={() => setCustom(q)}
            className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-all">
            {q}
          </button>
        ))}
      </div>
      <button onClick={() => { onSave(selected, custom); onClose(); }}
        className="w-full py-2 rounded-lg text-white text-sm font-semibold"
        style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
        Save Status
      </button>
    </div>
  );
}