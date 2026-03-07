import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Brain, Zap, Plus, Tag, Shuffle, Pen } from "lucide-react";

const CATEGORIES = ["run","pass","screen","play_action","blitz","coverage","zone","man","punt","kick","return"];

// Generate canvas elements from AI play description
function generateDiagramElements(play, format = "11man") {
  const W = 800, EZ_H = 52, FIELD_H = 520 - 2 * EZ_H;
  const LOS_Y = EZ_H + FIELD_H * 0.62;
  const cx = W / 2;

  const elements = [];
  let id = Date.now();

  const isOffense = play.unit === "offense" || !play.unit;
  const cat = play.category || "run";
  const playerCount = { flag: 5, "7on7": 7, "8man": 8, "11man": 11, "12man": 12 }[format] || 11;

  // Place O-line
  if (playerCount >= 7) {
    const linePositions = playerCount >= 11
      ? [-80, -40, 0, 40, 80]
      : playerCount >= 8
        ? [-60, -30, 0, 30, 60]
        : [-40, 0, 40];
    linePositions.forEach((offset, i) => {
      elements.push({
        id: id++, type: "player",
        x: cx + offset, y: LOS_Y + 2,
        label: offset === 0 ? "C" : "O",
        pColor: offset === 0 ? "#6366f1" : "#3b82f6",
        shape: offset === 0 ? "square" : "circle",
      });
    });
  }

  // QB behind center
  const qbY = LOS_Y + 30;
  elements.push({ id: id++, type: "player", x: cx, y: qbY, label: "QB", pColor: "#f59e0b", shape: "circle" });

  // Skill players
  if (cat === "run" || cat === "play_action") {
    // RB
    elements.push({ id: id++, type: "player", x: cx - 20, y: qbY + 28, label: "O", pColor: "#3b82f6", shape: "circle" });
    // WRs wide
    if (playerCount >= 8) {
      elements.push({ id: id++, type: "player", x: 55, y: LOS_Y, label: "O", pColor: "#3b82f6", shape: "circle" });
      elements.push({ id: id++, type: "player", x: W - 55, y: LOS_Y, label: "O", pColor: "#3b82f6", shape: "circle" });
    }
    // Draw run route from QB
    elements.push({ id: id++, type: "arrow", x1: cx, y1: qbY + 15, x2: cx - 20, y2: qbY + 70, color: "#f59e0b", lineWidth: 2.5 });
    // Handoff arrow
    elements.push({ id: id++, type: "arrow", x1: cx - 20, y1: qbY + 40, x2: cx - 60, y2: qbY + 80, color: "#10b981", lineWidth: 2.5 });
  } else if (cat === "pass" || cat === "screen" || cat === "play_action") {
    // WRs
    const wrPositions = playerCount >= 8 ? [55, W - 55] : [70, W - 70];
    wrPositions.forEach((x, i) => {
      elements.push({ id: id++, type: "player", x, y: LOS_Y, label: "O", pColor: "#3b82f6", shape: "circle" });
      // Route: go or curl
      if (i === 0) {
        elements.push({ id: id++, type: "freehand", points: [
          { x, y: LOS_Y - 3 }, { x: x + 5, y: LOS_Y - 30 }, { x: x + 30, y: LOS_Y - 80 }
        ], color: "#ff6b00", lineWidth: 2.5 });
      } else {
        elements.push({ id: id++, type: "freehand", points: [
          { x, y: LOS_Y - 3 }, { x: x - 10, y: LOS_Y - 40 }, { x: x - 50, y: LOS_Y - 70 }
        ], color: "#3b82f6", lineWidth: 2.5 });
      }
    });
    // TE
    if (playerCount >= 11) {
      elements.push({ id: id++, type: "player", x: cx + 90, y: LOS_Y, label: "O", pColor: "#3b82f6", shape: "circle" });
      elements.push({ id: id++, type: "freehand", points: [
        { x: cx + 90, y: LOS_Y - 3 }, { x: cx + 90, y: LOS_Y - 35 }, { x: cx + 130, y: LOS_Y - 60 }
      ], color: "#10b981", lineWidth: 2.5 });
    }
    // QB throw arc
    elements.push({ id: id++, type: "arrow", x1: cx, y1: qbY, x2: cx - 50 + 80, y2: LOS_Y - 75, color: "#f59e0b", lineWidth: 1.5 });
  }

  // Defense
  const defY = LOS_Y - 28;
  const defPositions = playerCount >= 11 ? [-80, -40, 0, 40, 80] : [-50, 0, 50];
  defPositions.forEach(offset => {
    elements.push({ id: id++, type: "player", x: cx + offset, y: defY, label: "X", pColor: "#ef4444", shape: "circle" });
  });

  return elements;
}

export default function NxPlayAI({ plays, opponents, onClose, onSavePlay, onOpenDesigner }) {
  const [mode, setMode] = useState("variations"); // variations | counters | autotag
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedPlay, setSelectedPlay] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [defenseScheme, setDefenseScheme] = useState("");

  const generateVariations = async () => {
    if (!selectedPlay) return;
    setLoading(true); setResult(null);
    const opp = opponents.find(o => o.id === selectedOpponent);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite football AI coordinator for NxDown. Generate 4 creative variations of the play "${selectedPlay.name}" (${selectedPlay.category}, ${selectedPlay.formation || "no formation"}).
${opp ? `\nOpponent defensive tendency: ${opp.defensive_tendency}\nOpponent strengths: ${opp.strengths}\nOpponent weaknesses: ${opp.weaknesses}` : ""}
Return variations that exploit different defensive looks.`,
      response_json_schema: {
        type: "object",
        properties: {
          variations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                formation: { type: "string" },
                category: { type: "string" },
                description: { type: "string" },
                down_distance: { type: "string" },
                personnel: { type: "string" },
                tags: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });
    setResult(res);
    setLoading(false);
  };

  const generateCounters = async () => {
    if (!defenseScheme) return;
    setLoading(true); setResult(null);
    const playList = plays.slice(0, 30).map(p => `${p.name} (${p.category}, ${p.formation || ""})`).join(", ");
    const opp = opponents.find(o => o.id === selectedOpponent);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite offensive coordinator for NxDown. The opponent is running a "${defenseScheme}" defensive scheme.
${opp ? `Scouting notes: ${opp.defensive_tendency}. Key players: ${opp.key_players}.` : ""}
Our current plays: ${playList}

Generate 5 specific play calls and audibles that counter this defense effectively.`,
      response_json_schema: {
        type: "object",
        properties: {
          counters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", description: "play or audible" },
                formation: { type: "string" },
                category: { type: "string" },
                rationale: { type: "string" },
                description: { type: "string" },
                down_distance: { type: "string" }
              }
            }
          }
        }
      }
    });
    setResult(res);
    setLoading(false);
  };

  const autoTagPlays = async () => {
    setLoading(true); setResult(null);
    const untagged = plays.filter(p => !p.down_distance && !p.field_zone).slice(0, 15);
    if (untagged.length === 0) {
      setResult({ tagged: [], message: "All plays already have tags!" });
      setLoading(false); return;
    }
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football analyst for NxDown. Auto-tag the following plays with optimal formations, down/distance situations, field zones, and an effectiveness rating (1-10).

Plays to tag:
${untagged.map(p => `- ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Unit: ${p.unit}, Description: ${p.description || "none"}`).join("\n")}`,
      response_json_schema: {
        type: "object",
        properties: {
          tagged: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                formation: { type: "string" },
                down_distance: { type: "string" },
                field_zone: { type: "string" },
                effectiveness: { type: "number" },
                tags: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });
    setResult(res);
    setLoading(false);
  };

  const handleGenerate = () => {
    if (mode === "variations") generateVariations();
    else if (mode === "counters") generateCounters();
    else autoTagPlays();
  };

  const saveVariation = async (v) => {
    const play = await base44.entities.Play.create({
      name: v.name,
      formation: v.formation,
      category: v.category || "run",
      unit: selectedPlay?.unit || "offense",
      description: v.description,
      down_distance: v.down_distance,
      personnel: v.personnel,
      tags: v.tags || [],
      ai_suggested: true,
    });
    onSavePlay && onSavePlay(play);
    // Open designer with auto-generated diagram
    if (onOpenDesigner) {
      const elements = generateDiagramElements({ ...v, unit: selectedPlay?.unit || "offense" });
      onOpenDesigner({ play, elements });
    }
  };

  const saveCounter = async (c) => {
    const play = await base44.entities.Play.create({
      name: c.name,
      formation: c.formation,
      category: c.category || "run",
      unit: "offense",
      description: c.description,
      down_distance: c.down_distance,
      ai_suggested: true,
      notes: c.rationale,
    });
    onSavePlay && onSavePlay(play);
    if (onOpenDesigner) {
      const elements = generateDiagramElements({ ...c, unit: "offense" });
      onOpenDesigner({ play, elements });
    }
  };

  const applyTags = async (tagged) => {
    await Promise.all(tagged.map(t =>
      base44.entities.Play.update(t.id, {
        formation: t.formation,
        down_distance: t.down_distance,
        field_zone: t.field_zone,
        tags: t.tags,
      })
    ));
    onSavePlay && onSavePlay();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-orange-500/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-orange-400" />
            <h2 className="text-white font-bold">NxPlay AI Assistant</h2>
            <span className="text-orange-400 text-xs bg-orange-500/20 px-2 py-0.5 rounded-full">AI-Powered</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Mode Selector */}
          <div className="flex gap-2">
            {[
              { key: "variations", label: "Play Variations", icon: Shuffle },
              { key: "counters", label: "Counters & Audibles", icon: Zap },
              { key: "autotag", label: "Auto-Tag Plays", icon: Tag },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setMode(key); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${mode === key ? "bg-orange-500 text-white" : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-gray-700"}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Inputs */}
          {mode === "variations" && (
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Select Base Play *</label>
                <select value={selectedPlay?.id || ""} onChange={e => setSelectedPlay(plays.find(p => p.id === e.target.value) || null)}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Choose a play...</option>
                  {plays.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Opponent (optional)</label>
                <select value={selectedOpponent || ""} onChange={e => setSelectedOpponent(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Generic variations</option>
                  {opponents.map(o => <option key={o.id} value={o.id}>{o.name} ({o.game_date})</option>)}
                </select>
              </div>
            </div>
          )}

          {mode === "counters" && (
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Defensive Scheme to Counter *</label>
                <input value={defenseScheme} onChange={e => setDefenseScheme(e.target.value)} placeholder="e.g. Cover 2, 4-3 Under, Press Man, Tampa 2..."
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Opponent (optional)</label>
                <select value={selectedOpponent || ""} onChange={e => setSelectedOpponent(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                  <option value="">No specific opponent</option>
                  {opponents.map(o => <option key={o.id} value={o.id}>{o.name} ({o.game_date})</option>)}
                </select>
              </div>
            </div>
          )}

          {mode === "autotag" && (
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 text-sm text-gray-400">
              Nx will analyze your existing plays and automatically assign formations, down/distance situations, field zones, and effectiveness ratings to untagged plays.
              <br /><span className="text-orange-400 mt-1 block">{plays.filter(p => !p.down_distance && !p.field_zone).length} untagged plays found.</span>
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <Brain className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
            {loading ? "Nx is thinking..." : "Generate with NxPlay AI"}
          </button>

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <div className="border-t border-gray-800 pt-3">
                <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-3">NxPlay Results</p>

                {mode === "variations" && result.variations?.map((v, i) => (
                  <div key={i} className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 mb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{v.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {v.formation && <span className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{v.formation}</span>}
                          {v.category && <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">{v.category}</span>}
                          {v.down_distance && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{v.down_distance}</span>}
                        </div>
                        <p className="text-gray-400 text-xs mt-1.5">{v.description}</p>
                      </div>
                      <button onClick={() => saveVariation(v)} title="Save & open in Designer" className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-all text-xs font-medium">
                        <Plus className="w-3 h-3" /><Pen className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {mode === "counters" && result.counters?.map((c, i) => (
                  <div key={i} className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 mb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-semibold text-sm">{c.name}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${c.type === "audible" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>{c.type}</span>
                        </div>
                        <p className="text-gray-400 text-xs">{c.rationale}</p>
                        {c.description && <p className="text-gray-500 text-xs mt-1">{c.description}</p>}
                      </div>
                      <button onClick={() => saveCounter(c)} title="Save & open in Designer" className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-all text-xs font-medium">
                        <Plus className="w-3 h-3" /><Pen className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {mode === "autotag" && (
                  <div>
                    {result.message && <p className="text-gray-400 text-sm mb-3">{result.message}</p>}
                    {result.tagged?.length > 0 && (
                      <>
                        {result.tagged.map((t, i) => (
                          <div key={i} className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 mb-2 text-sm">
                            <p className="text-white font-medium">{t.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {t.formation && <span className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{t.formation}</span>}
                              {t.down_distance && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{t.down_distance}</span>}
                              {t.field_zone && <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">{t.field_zone}</span>}
                              {t.effectiveness && <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">★ {t.effectiveness}/10</span>}
                            </div>
                          </div>
                        ))}
                        <button onClick={() => applyTags(result.tagged)}
                          className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium">
                          Apply All Tags
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}