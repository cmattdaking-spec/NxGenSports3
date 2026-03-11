import { useState } from "react";
import { Tag, Flag, CheckCircle, XCircle, Minus } from "lucide-react";
import { useSport } from "@/components/SportContext";
import { getSportConfig } from "@/components/SportConfig";

// Sport-specific tag field configs
const SPORT_TAG_CONFIG = {
  football: {
    playTypes: ["run","pass","screen","play_action","blitz","coverage","punt","kick","return","penalty","turnover","score","other"],
    personnel: ["11","12","21","22","10","13","20","base_4-3","nickel","dime","other"],
    fields: ["down","distance","formation","yards","personnel"],
    labels: { down:"Down", distance:"Distance (yds)", formation:"Formation", yards:"Yards Gained", personnel:"Personnel" },
    placeholders: { formation:"Shotgun, I-Form...", distance:"10", yards:"0" },
    downOptions: [{ v:"1",l:"1st" },{ v:"2",l:"2nd" },{ v:"3",l:"3rd" },{ v:"4",l:"4th" }],
  },
  baseball: {
    playTypes: ["pitching_strategy","base_running","situational_hitting","bunt_play","pickoff","defensive_play","penalty","score","other"],
    personnel: [],
    fields: ["down","formation","yards"],
    labels: { down:"Inning", formation:"Situation", yards:"Runners On" },
    placeholders: { formation:"RISP, Bases Loaded, 2 outs...", yards:"1B, 2B..." },
    downOptions: [{ v:"1",l:"1st" },{ v:"2",l:"2nd" },{ v:"3",l:"3rd" },{ v:"4",l:"4th" },{ v:"5",l:"5th" },{ v:"6",l:"6th" },{ v:"7",l:"7th" },{ v:"8",l:"8th" },{ v:"9",l:"9th" }],
  },
  basketball: {
    playTypes: ["set_play","fast_break","inbound","zone_offense","man_defense","zone_defense","press","transition","penalty","score","other"],
    personnel: [],
    fields: ["down","formation","yards"],
    labels: { down:"Quarter", formation:"Play Type", yards:"Points Scored" },
    placeholders: { formation:"Half-court, transition...", yards:"0" },
    downOptions: [{ v:"1",l:"Q1" },{ v:"2",l:"Q2" },{ v:"3",l:"Q3" },{ v:"4",l:"Q4" },{ v:"5",l:"OT" }],
  },
  soccer: {
    playTypes: ["set_piece","corner_kick","free_kick","counter_attack","pressing","defensive_shape","penalty","score","other"],
    personnel: [],
    fields: ["down","formation","yards"],
    labels: { down:"Half", formation:"Pattern", yards:"Field Zone" },
    placeholders: { formation:"Build-up, long ball...", yards:"Final third..." },
    downOptions: [{ v:"1",l:"1st Half" },{ v:"2",l:"2nd Half" },{ v:"5",l:"Extra Time" }],
  },
  volleyball: {
    playTypes: ["serve_receive","offensive_set","blocking_scheme","serving_strategy","transition","out_of_system","quick_attack","score","other"],
    personnel: [],
    fields: ["down","formation"],
    labels: { down:"Set", formation:"Rotation" },
    placeholders: { formation:"Rotation 1, 6-2 system..." },
    downOptions: [{ v:"1",l:"Set 1" },{ v:"2",l:"Set 2" },{ v:"3",l:"Set 3" },{ v:"4",l:"Set 4" },{ v:"5",l:"Set 5" }],
  },
};

function getTagConfig(sportFamily) {
  return SPORT_TAG_CONFIG[sportFamily] || SPORT_TAG_CONFIG.football;
}

function fmtTime(secs) {
  const s = Math.floor(secs);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function TagForm({ currentTime, onSave, onCancel }) {
  const { activeSport } = useSport();
  const sportCfg = getSportConfig(activeSport);
  const tagCfg = getTagConfig(sportCfg.sportFamily);

  const [form, setForm] = useState({
    play_type: tagCfg.playTypes[0] || "other",
    personnel: tagCfg.personnel[0] || "",
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

  const showField = (f) => tagCfg.fields.includes(f);

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
        <div className={showField("personnel") && tagCfg.personnel.length > 0 ? "" : "col-span-2"}>
          <label className="text-gray-500 text-xs mb-1 block">Play Type *</label>
          <select value={form.play_type} onChange={e => set("play_type", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm capitalize">
            {tagCfg.playTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        {/* Personnel (football only) */}
        {showField("personnel") && tagCfg.personnel.length > 0 && (
          <div>
            <label className="text-gray-500 text-xs mb-1 block">{tagCfg.labels.personnel || "Personnel"}</label>
            <select value={form.personnel} onChange={e => set("personnel", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm">
              {tagCfg.personnel.map(p => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        )}
        {/* Down / Inning / Quarter etc. */}
        {showField("down") && (
          <div>
            <label className="text-gray-500 text-xs mb-1 block">{tagCfg.labels.down || "Down"}</label>
            <select value={form.down} onChange={e => set("down", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm">
              <option value="">—</option>
              {tagCfg.downOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        )}
        {/* Distance (football only) */}
        {showField("distance") && (
          <div>
            <label className="text-gray-500 text-xs mb-1 block">{tagCfg.labels.distance || "Distance"}</label>
            <input type="number" value={form.distance} onChange={e => set("distance", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" placeholder={tagCfg.placeholders?.distance || "10"} />
          </div>
        )}
        {/* Formation / Situation */}
        {showField("formation") && (
          <div>
            <label className="text-gray-500 text-xs mb-1 block">{tagCfg.labels.formation || "Formation"}</label>
            <input value={form.formation} onChange={e => set("formation", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" placeholder={tagCfg.placeholders?.formation || ""} />
          </div>
        )}
        {/* Yards / Points / Runners On */}
        {showField("yards") && (
          <div>
            <label className="text-gray-500 text-xs mb-1 block">{tagCfg.labels.yards || "Yards Gained"}</label>
            <input type={sportCfg.sportFamily === "baseball" ? "text" : "number"} value={form.yards} onChange={e => set("yards", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-2 py-1.5 rounded text-sm" placeholder={tagCfg.placeholders?.yards || "0"} />
          </div>
        )}
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