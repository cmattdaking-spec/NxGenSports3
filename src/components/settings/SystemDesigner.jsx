import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";

const Section = ({ title, color, open, onToggle, children }) => (
  <div className="border border-gray-800 rounded-xl overflow-hidden">
    <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1a1a] hover:bg-[#202020] transition-colors">
      <span className={`text-sm font-semibold ${color}`}>{title}</span>
      {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
    </button>
    {open && <div className="p-4 space-y-3 bg-[#161616]">{children}</div>}
  </div>
);

const TextArea = ({ label, value, onChange, placeholder }) => (
  <div>
    {label && <label className="text-gray-400 text-xs mb-1 block">{label}</label>}
    <textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4}
      className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none outline-none focus:border-[var(--color-primary,#3b82f6)] placeholder-gray-600" />
  </div>
);

const KVList = ({ items, keyLabel, valLabel, onChange, addLabel }) => {
  const add = () => onChange([...items, { [Object.keys(items[0] || { a: "" })[0]]: "", [Object.keys(items[0] || { a: "", b: "" })[1] || "b"]: "" }]);
  const update = (i, field, val) => { const n = [...items]; n[i] = { ...n[i], [field]: val }; onChange(n); };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const keys = Object.keys(item);
        return (
          <div key={i} className="flex gap-2 items-start">
            <input value={item[keys[0]] || ""} onChange={e => update(i, keys[0], e.target.value)} placeholder={keyLabel}
              className="flex-1 bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[var(--color-primary,#3b82f6)] placeholder-gray-600" />
            <input value={item[keys[1]] || ""} onChange={e => update(i, keys[1], e.target.value)} placeholder={valLabel}
              className="flex-1 bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[var(--color-primary,#3b82f6)] placeholder-gray-600" />
            <button onClick={() => remove(i)} className="text-gray-600 hover:text-red-400 mt-1.5 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        );
      })}
      <button onClick={add} className="text-xs text-[var(--color-primary,#3b82f6)] hover:opacity-80 flex items-center gap-1">
        <Plus className="w-3 h-3" /> {addLabel}
      </button>
    </div>
  );
};

const TagList = ({ items, onChange, placeholder }) => {
  const [input, setInput] = useState("");
  const add = () => { if (!input.trim()) return; onChange([...items, input.trim()]); setInput(""); };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-1 text-xs bg-[var(--color-primary,#3b82f6)]/15 text-[var(--color-primary,#3b82f6)] px-2 py-0.5 rounded-full">
            {t}
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder={placeholder}
          className="flex-1 bg-[#111] border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[var(--color-primary,#3b82f6)] placeholder-gray-600" />
        <button onClick={add} className="px-3 py-1.5 rounded-lg text-white text-xs" style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>Add</button>
      </div>
    </div>
  );
};

export default function SystemDesigner({ user }) {
  const [system, setSystem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState({});

  const role = user?.coaching_role || user?.role;
  const isOffenseCoord = ["admin", "head_coach", "associate_head_coach", "offensive_coordinator"].includes(role);
  const isDefenseCoord = ["admin", "head_coach", "associate_head_coach", "defensive_coordinator"].includes(role);
  const isLineCoach = ["admin", "head_coach", "offensive_coordinator", "position_coach"].includes(role);
  const isSC = ["admin", "head_coach", "strength_conditioning_coordinator"].includes(role);

  useEffect(() => {
    if (!user?.team_id) return;
    base44.entities.TeamSystem.filter({ team_id: user.team_id }).then(list => {
      const rec = list[0] || {};
      setSystem(rec);
      setForm({
        offensive_system: rec.offensive_system || "",
        signals: rec.signals || [],
        terminology: rec.terminology || [],
        defensive_system: rec.defensive_system || "",
        blocking_scheme: rec.blocking_scheme || "",
        blocking_calls: rec.blocking_calls || [],
        sc_system: rec.sc_system || "",
        sc_priorities: rec.sc_priorities || [],
      });
    }).catch(() => {});
  }, [user]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const toggle = (key) => setOpen(o => ({ ...o, [key]: !o[key] }));

  const save = async () => {
    setSaving(true);
    const data = { ...form, team_id: user.team_id, updated_by: user.email };
    if (system?.id) {
      await base44.entities.TeamSystem.update(system.id, data);
    } else {
      const created = await base44.entities.TeamSystem.create(data);
      setSystem(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!user?.team_id) return null;

  return (
    <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} />
            System Designer
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">Define your team's language, signals, and execution system. AI will use this context in all suggestions.</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save System"}
        </button>
      </div>

      {/* Offensive System */}
      {isOffenseCoord && (
        <Section title="⚡ Offensive System & Communication" color="text-orange-400" open={open.offense} onToggle={() => toggle("offense")}>
          <TextArea label="System Overview" value={form.offensive_system} onChange={v => set("offensive_system", v)}
            placeholder="Describe how your offense communicates — cadence structure, play-call format, motion words, check-with-me system, silent counts, tempo commands (e.g. 'GO', 'CHECK', 'KILL'), etc." />
          <div>
            <p className="text-gray-400 text-xs mb-2">Signals & Commands</p>
            <KVList items={form.signals} keyLabel="Signal / Word" valLabel="Meaning / Action" onChange={v => set("signals", v)} addLabel="Add Signal" />
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-2">Team Terminology</p>
            <KVList items={form.terminology} keyLabel="Term" valLabel="Definition" onChange={v => set("terminology", v)} addLabel="Add Term" />
          </div>
        </Section>
      )}

      {/* Defensive System */}
      {isDefenseCoord && (
        <Section title="🛡 Defensive System & Communication" color="text-red-400" open={open.defense} onToggle={() => toggle("defense")}>
          <TextArea label="System Overview" value={form.defensive_system} onChange={v => set("defensive_system", v)}
            placeholder="Describe defensive communication system — coverage calls, front adjustments, blitz indicators, mike declaration, disguise rules, kill calls, etc." />
        </Section>
      )}

      {/* Blocking Scheme */}
      {isLineCoach && (
        <Section title="🏋 Offensive Line Blocking Scheme" color="text-yellow-400" open={open.blocking} onToggle={() => toggle("blocking")}>
          <TextArea label="Scheme Overview" value={form.blocking_scheme} onChange={v => set("blocking_scheme", v)}
            placeholder="Describe the blocking system philosophy — zone, gap, combo, reach, pull rules, double-team priorities, assignment-blocking vs. man, line communication rules, etc." />
          <div>
            <p className="text-gray-400 text-xs mb-2">Blocking Calls & Assignments</p>
            <KVList items={form.blocking_calls} keyLabel="Call / Code" valLabel="Assignment / Rule" onChange={v => set("blocking_calls", v)} addLabel="Add Blocking Call" />
          </div>
        </Section>
      )}

      {/* S&C System */}
      {isSC && (
        <Section title="💪 S&C System Focus" color="text-emerald-400" open={open.sc} onToggle={() => toggle("sc")}>
          <TextArea label="Training Philosophy" value={form.sc_system} onChange={v => set("sc_system", v)}
            placeholder="Describe S&C system focus — periodization model, in-season vs. off-season emphasis, sport-specific movement priorities, injury prevention philosophy, load management approach, etc." />
          <div>
            <p className="text-gray-400 text-xs mb-2">Priority Training Pillars</p>
            <TagList items={form.sc_priorities} onChange={v => set("sc_priorities", v)} placeholder="e.g. Explosive power, Hip mobility..." />
          </div>
        </Section>
      )}
    </div>
  );
}