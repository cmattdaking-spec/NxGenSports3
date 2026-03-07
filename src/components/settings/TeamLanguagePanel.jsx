import { useState } from "react";
import { Save, RotateCcw, BookOpen } from "lucide-react";
import { POSITION_DEFS, DEFAULT_POSITION_LABELS, savePositionLabels, useTeamLanguage } from "@/components/playbook/useTeamLanguage";

export default function TeamLanguagePanel() {
  const { labels, settingsId } = useTeamLanguage();
  const [localLabels, setLocalLabels] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const current = localLabels || labels;

  const handleChange = (code, value) => {
    setLocalLabels(prev => ({ ...(prev || labels), [code]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await savePositionLabels(current, settingsId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setLocalLabels({ ...DEFAULT_POSITION_LABELS });
    setSaved(false);
  };

  const units = ["offense", "defense", "special_teams"];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-orange-400" />
            <h3 className="text-white font-bold text-sm">Team Position Language</h3>
          </div>
          <p className="text-gray-500 text-xs">
            Customize how positions are named across the depth chart, playbook, and AI. Uses the standard football lettering system (X, Z, W, Y, A, MIKE, SAM, WILL).
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs transition-all">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50 transition-all"
            style={{ backgroundColor: saved ? "#22c55e" : "var(--color-primary,#f97316)" }}>
            <Save className="w-3 h-3" />
            {saving ? "Saving..." : saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {units.map(unit => {
        const defs = POSITION_DEFS.filter(d => d.unit === unit);
        return (
          <div key={unit}>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2 font-semibold">
              {unit.replace("_", " ")}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {defs.map(({ code, desc }) => (
                <div key={code} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-2.5 flex items-center gap-2">
                  <div className="flex-shrink-0 text-center">
                    <span className="text-gray-600 text-xs font-mono">{code}</span>
                    <p className="text-gray-700 text-[9px] leading-tight">{desc}</p>
                  </div>
                  <div className="flex-shrink-0 text-gray-700">→</div>
                  <input
                    value={current[code] || code}
                    onChange={e => handleChange(code, e.target.value.toUpperCase().slice(0, 6))}
                    placeholder={code}
                    maxLength={6}
                    className="flex-1 min-w-0 bg-[#111] border border-gray-700 text-white px-2 py-1 rounded text-sm font-bold font-mono outline-none focus:border-orange-500 w-full"
                    style={{ color: "var(--color-primary,#f97316)" }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 text-xs text-gray-400">
        <span className="text-orange-400 font-semibold">Standard Lettering System: </span>
        X = #1 WR (split end) · Z = #2 WR (flanker) · W = Slot/Wing · Y = Tight End · A = Running Back · MIKE = MLB · SAM = Strong OLB · WILL = Weak ILB
      </div>
    </div>
  );
}