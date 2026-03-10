import { useState, useContext } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Loader2, Target, Shield, Zap, ChevronDown, ChevronUp, Save, Sparkles } from "lucide-react";
import { useSportConfig } from "@/components/SportConfig";
import { SportContext } from "@/components/SportContext";

export default function NxPlanAI({ opponent, players, plays, existingPlan, onSave }) {
  const { activeSport } = useContext(SportContext);
  const cfg = useSportConfig(activeSport);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [unit, setUnit] = useState(cfg.units[0]);
  const [focus, setFocus] = useState("");
  const [expanded, setExpanded] = useState({ scripted: true, redzone: false, thirddown: false, twomin: false });

  const generate = async () => {
    setLoading(true);
    setResult(null);

    const playList = plays
      .filter(p => p.unit === unit)
      .map(p => `${p.name} (${p.category}${p.formation ? ", " + p.formation : ""})`)
      .join(", ") || "No plays in playbook yet";

    const rosterSummary = players.slice(0, 20)
      .map(p => `${p.first_name} ${p.last_name} (${p.position}, ${p.year || "?"}, status: ${p.status})`)
      .join("; ");

    const prompt = `You are ${cfg.brand}'s elite AI game planning coordinator (${cfg.aiPersona}). Generate a comprehensive ${unit} game plan.

Opponent: ${opponent?.name || "Unknown"}
Game Date: ${opponent?.game_date || "TBD"}
Location: ${opponent?.location || "TBD"}
Opponent Record: ${opponent?.record || "Unknown"}
Opponent Offensive Tendency: ${opponent?.offensive_tendency || "Unknown"}
Opponent Defensive Tendency: ${opponent?.defensive_tendency || "Unknown"}
Opponent Key Players: ${opponent?.key_players || "Unknown"}
Opponent Strengths: ${opponent?.strengths || "Unknown"}
Opponent Weaknesses: ${opponent?.weaknesses || "Unknown"}

Our Roster (top 20): ${rosterSummary || "Unknown"}
Available ${unit} Plays: ${playList}
Special Focus: ${focus || "None"}

Create a detailed, tactical game plan with specific play calls, situational strategies, and opponent-specific adjustments.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          game_plan_summary: { type: "string" },
          key_tendencies: { type: "string" },
          opening_script: { type: "array", items: { type: "string" } },
          scripted_plays: { type: "array", items: { type: "string" } },
          red_zone_plays: { type: "array", items: { type: "string" } },
          third_down_plays: { type: "array", items: { type: "string" } },
          two_minute_plays: { type: "array", items: { type: "string" } },
          matchups_to_exploit: { type: "array", items: { type: "string" } },
          matchups_to_avoid: { type: "array", items: { type: "string" } },
          personnel_packages: { type: "array", items: { type: "string" } },
          key_adjustments: { type: "array", items: { type: "string" } },
          motivational_notes: { type: "string" },
        }
      }
    });
    setResult(res);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!result) return;
    const data = {
      opponent: opponent?.name || "Unknown",
      game_date: opponent?.game_date || new Date().toISOString().split("T")[0],
      location: opponent?.location || "home",
      unit,
      key_tendencies: result.key_tendencies,
      scripted_plays: result.scripted_plays || [],
      red_zone_plays: result.red_zone_plays || [],
      third_down_plays: result.third_down_plays || [],
      two_minute_plays: result.two_minute_plays || [],
      opening_script: result.opening_script || [],
      ai_suggestions: result.game_plan_summary,
      notes: result.key_adjustments?.join("\n"),
      status: "draft",
    };
    if (existingPlan?.id) {
      await base44.entities.GamePlan.update(existingPlan.id, data);
    } else {
      await base44.entities.GamePlan.create(data);
    }
    onSave?.();
  };

  const Section = ({ title, items, id, color = "text-orange-400", bg = "bg-orange-500/10", border = "border-orange-500/20" }) => (
    <div className={`${bg} border ${border} rounded-xl overflow-hidden`}>
      <button className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setExpanded(e => ({ ...e, [id]: !e[id] }))}>
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title} ({items?.length || 0})</span>
        {expanded[id] ? <ChevronUp className={`w-4 h-4 ${color}`} /> : <ChevronDown className={`w-4 h-4 ${color}`} />}
      </button>
      {expanded[id] && items?.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`font-black text-xs mt-0.5 flex-shrink-0 ${color}`}>{i + 1}.</span>
              <p className="text-gray-300 text-sm">{item}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Config */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
          <h3 className="text-white font-bold">NxPlan AI Generator</h3>
          <span className="text-xs px-2 py-0.5 rounded-full border text-orange-400 bg-orange-500/10 border-orange-500/20">AI-Powered</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Unit</label>
            <div className="flex gap-2">
              {cfg.units.map(u => (
                <button key={u} onClick={() => setUnit(u)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${unit === u ? "text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                  style={unit === u ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
                  {cfg.unitLabels[u] || u.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Special Focus / Emphasis</label>
            <input value={focus} onChange={e => setFocus(e.target.value)}
              placeholder="e.g. Stop their run game, exploit slot CB..."
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
          </div>
        </div>

        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
          style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Generating Plan..." : `Generate ${unit.charAt(0).toUpperCase() + unit.slice(1)} Game Plan`}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-[#141414] border border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-primary,#f97316)", borderTopColor: "transparent" }} />
          <p className="text-gray-400 text-sm">NxPlan AI is analyzing opponent tendencies, roster matchups, and building your game plan...</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          {result.game_plan_summary && (
            <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Game Plan Summary</p>
              <p className="text-gray-200 text-sm leading-relaxed">{result.game_plan_summary}</p>
            </div>
          )}

          {result.key_tendencies && (
            <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Key Tendencies & Opponent Notes</p>
              <p className="text-gray-200 text-sm leading-relaxed">{result.key_tendencies}</p>
            </div>
          )}

          {/* Play Scripts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cfg.gamePlanSections.map((sec, i) => {
              const colorMap = ["text-blue-400","text-red-400","text-yellow-400","text-purple-400"];
              const bgMap = ["bg-blue-500/5","bg-red-500/5","bg-yellow-500/5","bg-purple-500/5"];
              const borderMap = ["border-blue-500/20","border-red-500/20","border-yellow-500/20","border-purple-500/20"];
              return (
                <Section key={sec.key} title={sec.label} items={result[sec.key]} id={sec.key}
                  color={colorMap[i] || "text-orange-400"} bg={bgMap[i] || "bg-orange-500/5"} border={borderMap[i] || "border-orange-500/20"} />
              );
            })}
            <Section title="Personnel / Lineups" items={result.personnel_packages} id="personnel"
              color="text-cyan-400" bg="bg-cyan-500/5" border="border-cyan-500/20" />
          </div>

          {/* Matchups */}
          {(result.matchups_to_exploit?.length > 0 || result.matchups_to_avoid?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.matchups_to_exploit?.length > 0 && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-2">✓ Matchups to Exploit</p>
                  <ul className="space-y-1.5">
                    {result.matchups_to_exploit.map((m, i) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                        <Target className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" /> {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.matchups_to_avoid?.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">⚠ Matchups to Avoid</p>
                  <ul className="space-y-1.5">
                    {result.matchups_to_avoid.map((m, i) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                        <Shield className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" /> {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Key Adjustments */}
          {result.key_adjustments?.length > 0 && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Key In-Game Adjustments</p>
              <ul className="space-y-1.5">
                {result.key_adjustments.map((a, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <Zap className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.motivational_notes && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Motivational / Locker Room Notes</p>
              <p className="text-gray-300 text-sm italic leading-relaxed">"{result.motivational_notes}"</p>
            </div>
          )}

          {/* Save */}
          <button onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-all"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <Save className="w-4 h-4" />
            Save Game Plan
          </button>
        </div>
      )}
    </div>
  );
}