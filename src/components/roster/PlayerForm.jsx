import { useState } from "react";
import { X } from "lucide-react";
import { getSportConfig } from "@/components/SportConfig";

const YEARS = ["Freshman","Sophomore","Junior","Senior","Grad"];
const STATUSES = ["active","injured","suspended","inactive"];
const LEVELS = ["Varsity","JV","Freshman"];

const I = ({ label, required, children }) => (
  <div>
    <label className="text-gray-400 text-xs mb-1 block">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    {children}
  </div>
);

const inp = "w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)]";

export default function PlayerForm({ form, setForm, editing, onSave, onClose, activeSport }) {
  const cfg = getSportConfig(activeSport);
  const isBasketball = cfg.sportFamily === "basketball";

  // Flatten all positions for this sport
  const POSITIONS = Object.values(cfg.positions).flat().filter((v, i, a) => a.indexOf(v) === i);
  const UNITS = cfg.units;
  const posLabel = (p) => cfg.positionLabels[p] || p;

  const toggleArr = (key, val) => {
    const curr = form[key] || [];
    setForm({ ...form, [key]: curr.includes(val) ? curr.filter(x => x !== val) : [...curr, val] });
  };

  const [tab, setTab] = useState("basic");

  const tabs = [
    { id: "basic", label: "Basic Info" },
    { id: "academic", label: "Academic" },
    { id: "athletic", label: "Athletic" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-[#141414] z-10">
          <h2 className="text-white font-bold">{editing ? "Edit Player" : "Add Player"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t.id ? "text-white border-b-2" : "text-gray-500 hover:text-gray-300"}`}
              style={tab === t.id ? { borderColor: "var(--color-primary,#f97316)" } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Basic Info */}
          {tab === "basic" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <I label="First Name" required><input value={form.first_name || ""} onChange={e => setForm({...form, first_name: e.target.value})} className={inp} /></I>
                <I label="Last Name" required><input value={form.last_name || ""} onChange={e => setForm({...form, last_name: e.target.value})} className={inp} /></I>
                <I label="Jersey #"><input value={form.number || ""} onChange={e => setForm({...form, number: e.target.value})} className={inp} /></I>
                <I label="Year">
                  <select value={form.year || ""} onChange={e => setForm({...form, year: e.target.value})} className={inp}>
                    <option value="">Select...</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </I>
                <I label="Position" required>
                  <select value={form.position || ""} onChange={e => setForm({...form, position: e.target.value})} className={inp}>
                    <option value="">Select...</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </I>
                <I label="Unit" required>
                  <select value={form.unit || ""} onChange={e => setForm({...form, unit: e.target.value})} className={inp}>
                    {UNITS.map(u => <option key={u} value={u}>{u.replace("_"," ")}</option>)}
                  </select>
                </I>
                <I label="Height"><input value={form.height || ""} onChange={e => setForm({...form, height: e.target.value})} placeholder='6&apos;2"' className={inp} /></I>
                <I label="Weight (lbs)"><input type="number" value={form.weight || ""} onChange={e => setForm({...form, weight: +e.target.value})} className={inp} /></I>
                <I label="Status">
                  <select value={form.status || "active"} onChange={e => setForm({...form, status: e.target.value})} className={inp}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </I>
                <I label="Overall Rating (0-100)"><input type="number" min="0" max="100" value={form.overall_rating || ""} onChange={e => setForm({...form, overall_rating: +e.target.value})} className={inp} /></I>
                <I label="Graduation Year"><input type="number" value={form.graduation_year || ""} onChange={e => setForm({...form, graduation_year: +e.target.value})} placeholder="2025" className={inp} /></I>
                <I label="Hometown"><input value={form.hometown || ""} onChange={e => setForm({...form, hometown: e.target.value})} className={inp} /></I>
              </div>

              <I label="Team Levels">
                <div className="flex gap-2 mt-1">
                  {LEVELS.map(l => (
                    <button key={l} type="button" onClick={() => toggleArr("levels", l)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${(form.levels||[]).includes(l) ? "text-white" : "bg-[#1a1a1a] border-gray-700 text-gray-400"}`}
                      style={(form.levels||[]).includes(l) ? { backgroundColor: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)" } : {}}>
                      {l}
                    </button>
                  ))}
                </div>
              </I>

              <I label="Secondary Positions">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {POSITIONS.filter(p => p !== form.position).map(pos => (
                    <button key={pos} type="button" onClick={() => toggleArr("secondary_positions", pos)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-all ${(form.secondary_positions||[]).includes(pos) ? "text-white" : "bg-[#1a1a1a] border-gray-700 text-gray-400"}`}
                      style={(form.secondary_positions||[]).includes(pos) ? { backgroundColor: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)" } : {}}>
                      {pos}
                    </button>
                  ))}
                </div>
              </I>

              <I label="Notes">
                <textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className={inp + " resize-none"} />
              </I>
            </>
          )}

          {/* Academic */}
          {tab === "academic" && (
            <div className="grid grid-cols-2 gap-3">
              <I label="GPA (0.0 – 4.0)"><input type="number" step="0.01" min="0" max="4" value={form.gpa || ""} onChange={e => setForm({...form, gpa: +e.target.value})} className={inp} /></I>
              <I label="SAT Score"><input type="number" value={form.sat_score || ""} onChange={e => setForm({...form, sat_score: +e.target.value})} placeholder="400–1600" className={inp} /></I>
              <I label="ACT Score"><input type="number" value={form.act_score || ""} onChange={e => setForm({...form, act_score: +e.target.value})} placeholder="1–36" className={inp} /></I>
              <I label="Academic Eligible">
                <select value={form.academic_eligible !== false ? "yes" : "no"} onChange={e => setForm({...form, academic_eligible: e.target.value === "yes"})} className={inp}>
                  <option value="yes">Yes ✓</option>
                  <option value="no">No ✗</option>
                </select>
              </I>
            </div>
          )}

          {/* Athletic Metrics */}
          {tab === "athletic" && (
            <div className="grid grid-cols-2 gap-3">
              <I label="40-Yard Dash (sec)"><input type="number" step="0.01" value={form.forty_time || ""} onChange={e => setForm({...form, forty_time: +e.target.value})} placeholder="4.50" className={inp} /></I>
              <I label="Bench Press Reps (225lbs)"><input type="number" value={form.bench_reps || ""} onChange={e => setForm({...form, bench_reps: +e.target.value})} className={inp} /></I>
              <I label="Vertical Jump (in)"><input type="number" step="0.5" value={form.vertical_jump || ""} onChange={e => setForm({...form, vertical_jump: +e.target.value})} placeholder="30" className={inp} /></I>
              <I label="Broad Jump (in)"><input type="number" step="0.5" value={form.broad_jump || ""} onChange={e => setForm({...form, broad_jump: +e.target.value})} className={inp} /></I>
              <I label="3-Cone Drill (sec)"><input type="number" step="0.01" value={form.three_cone || ""} onChange={e => setForm({...form, three_cone: +e.target.value})} placeholder="6.90" className={inp} /></I>
              <I label="20-Yd Shuttle (sec)"><input type="number" step="0.01" value={form.shuttle_time || ""} onChange={e => setForm({...form, shuttle_time: +e.target.value})} placeholder="4.20" className={inp} /></I>
              <I label="Speed Rating (0-100)"><input type="number" min="0" max="100" value={form.speed || ""} onChange={e => setForm({...form, speed: +e.target.value})} className={inp} /></I>
              <I label="Strength Rating (0-100)"><input type="number" min="0" max="100" value={form.strength || ""} onChange={e => setForm({...form, strength: +e.target.value})} className={inp} /></I>
              <I label="Agility Rating (0-100)"><input type="number" min="0" max="100" value={form.agility || ""} onChange={e => setForm({...form, agility: +e.target.value})} className={inp} /></I>
              <I label="Football IQ (0-100)"><input type="number" min="0" max="100" value={form.football_iq || ""} onChange={e => setForm({...form, football_iq: +e.target.value})} className={inp} /></I>
            </div>
          )}

          {/* Contact */}
          {tab === "contact" && (
            <div className="grid grid-cols-2 gap-3">
              <I label="Player Email"><input type="email" value={form.contact_email || ""} onChange={e => setForm({...form, contact_email: e.target.value})} className={inp} /></I>
              <I label="Player Phone"><input type="tel" value={form.contact_phone || ""} onChange={e => setForm({...form, contact_phone: e.target.value})} className={inp} /></I>
              <div className="col-span-2 border-t border-gray-800 pt-3">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Parent / Guardian</p>
              </div>
              <I label="Parent Name"><input value={form.parent_name || ""} onChange={e => setForm({...form, parent_name: e.target.value})} className={inp} /></I>
              <I label="Parent Phone"><input type="tel" value={form.parent_phone || ""} onChange={e => setForm({...form, parent_phone: e.target.value})} className={inp} /></I>
              <I label="Parent Email" ><input type="email" value={form.parent_email || ""} onChange={e => setForm({...form, parent_email: e.target.value})} className={inp} /></I>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            <button onClick={onSave} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              {editing ? "Save Changes" : "Add Player"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}