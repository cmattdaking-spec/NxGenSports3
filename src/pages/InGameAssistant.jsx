import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Zap, Target, Shield, Users, Clock, RefreshCw, ChevronDown, ChevronUp, Crosshair } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";

export default function InGameAssistant() {
  const [opponents, setOpponents] = useState([]);
  const [plays, setPlays] = useState([]);
  const [players, setPlayers] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Game state
  const [selectedOpponent, setSelectedOpponent] = useState("");
  const [ourScore, setOurScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);
  const [quarter, setQuarter] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState("15:00");
  const [down, setDown] = useState(1);
  const [yardsToGo, setYardsToGo] = useState(10);
  const [fieldPosition, setFieldPosition] = useState("own 25");
  const [situation, setSituation] = useState("normal");

  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [expanded, setExpanded] = useState("play_calls");
  const [formation, setFormation] = useState("");
  const [playPackage, setPlayPackage] = useState("");
  const [motion, setMotion] = useState("");
  const [tag, setTag] = useState("");
  const [structuredCall, setStructuredCall] = useState("");

  const buildStructuredCall = () => {
    const parts = [formation, playPackage, motion, tag].filter(Boolean);
    setStructuredCall(parts.join(" -> "));
  };

  useEffect(() => {
    buildStructuredCall();
  }, [formation, playPackage, motion, tag]);

  useEffect(() => {
    Promise.all([
      base44.entities.Opponent.list(),
      base44.entities.Play.list(),
      base44.entities.Player.list(),
      base44.entities.PlayerHealth.list("-date", 50),
    ]).then(([op, pl, pr, hr]) => {
      setOpponents(op); setPlays(pl); setPlayers(pr); setHealthRecords(hr);
      setLoading(false);
    });
  }, []);

  const getSuggestions = async () => {
    setAiLoading(true); setSuggestions(null);
    const opp = opponents.find(o => o.id === selectedOpponent);
    const activePlayers = players.filter(p => p.status === "active").slice(0, 20).map(p => `${p.first_name} ${p.last_name} (${p.position}, Rating: ${p.overall_rating || "N/A"})`).join(", ");
    const offensePlays = plays.filter(p => p.unit === "offense").slice(0, 20).map(p => p.name).join(", ");
    const defensePlays = plays.filter(p => p.unit === "defense").slice(0, 20).map(p => p.name).join(", ");
    const scoreDiff = ourScore - theirScore;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite in-game AI coordinator for NxDown. Provide real-time strategic suggestions.

CURRENT GAME SITUATION:
- Score: Us ${ourScore} - Them ${theirScore} (${scoreDiff > 0 ? "Leading by " + scoreDiff : scoreDiff < 0 ? "Trailing by " + Math.abs(scoreDiff) : "Tied"})
- Quarter: ${quarter}, Time: ${timeRemaining}
- Down & Distance: ${down}${["st","nd","rd","th"][down-1] || "th"} & ${yardsToGo}
- Field Position: ${fieldPosition}
- Situation: ${situation}

OPPONENT${opp ? `: ${opp.name}
- Offensive Tendency: ${opp.offensive_tendency || "Unknown"}
- Defensive Tendency: ${opp.defensive_tendency || "Unknown"}
- Key Players: ${opp.key_players || "Unknown"}
- Strengths: ${opp.strengths || "Unknown"}
- Weaknesses: ${opp.weaknesses || "Unknown"}` : ": Not specified"}

OUR TEAM:
- Active Players: ${activePlayers}
- Offensive Plays: ${offensePlays}
- Defensive Plays: ${defensePlays}

Generate specific, actionable real-time suggestions.`,
      response_json_schema: {
        type: "object",
        properties: {
          situation_assessment: { type: "string" },
          urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
          play_calls: {
            type: "array",
            items: {
              type: "object",
              properties: {
                play_name: { type: "string" },
                formation: { type: "string" },
                rationale: { type: "string" },
                success_probability: { type: "string" }
              }
            }
          },
          optimal_matchups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                matchup: { type: "string" },
                advantage: { type: "string" },
                how_to_exploit: { type: "string" }
              }
            }
          },
          defensive_adjustments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                adjustment: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          personnel_recommendations: { type: "array", items: { type: "string" } },
          next_series_focus: { type: "string" }
        }
      }
    });
    setSuggestions(res);
    setAiLoading(false);
  };

  const urgencyColor = { low: "text-green-400 bg-green-500/20 border-green-500/30", medium: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30", high: "text-orange-400 bg-orange-500/20 border-orange-500/30", critical: "text-red-400 bg-red-500/20 border-red-500/30" };

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">In-Game <span className="text-orange-500">Nx Assistant</span></h1>
          <p className="text-gray-500 text-sm">Real-time strategic AI suggestions</p>
        </div>
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
          <Brain className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 text-xs font-semibold">Live AI</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Game State Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-white font-semibold text-sm">Game Situation</p>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Opponent</label>
              <select value={selectedOpponent} onChange={e => setSelectedOpponent(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                <option value="">Select opponent...</option>
                {opponents.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Score */}
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Score (Us / Them)</label>
              <div className="flex gap-2 items-center">
                <input type="number" value={ourScore} onChange={e => setOurScore(+e.target.value)} min="0"
                  className="flex-1 bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm text-center focus:outline-none focus:border-orange-500" />
                <span className="text-gray-500 text-sm">—</span>
                <input type="number" value={theirScore} onChange={e => setTheirScore(+e.target.value)} min="0"
                  className="flex-1 bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm text-center focus:outline-none focus:border-orange-500" />
              </div>
            </div>

            {/* Quarter + Time */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Quarter</label>
                <select value={quarter} onChange={e => setQuarter(+e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                  {[1,2,3,4,"OT"].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Time Remaining</label>
                <input value={timeRemaining} onChange={e => setTimeRemaining(e.target.value)} placeholder="15:00"
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
            </div>

            {/* Down & Distance */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Down</label>
                <select value={down} onChange={e => setDown(+e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                  {[1,2,3,4].map(d => <option key={d} value={d}>{d}{["st","nd","rd","th"][d-1]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Yards to Go</label>
                <input type="number" value={yardsToGo} onChange={e => setYardsToGo(+e.target.value)} min="1" max="99"
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Field Position</label>
              <input value={fieldPosition} onChange={e => setFieldPosition(e.target.value)} placeholder="e.g. own 35, opp 20"
                className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Situation</label>
              <select value={situation} onChange={e => setSituation(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                <option value="normal">Normal</option>
                <option value="red_zone">Red Zone</option>
                <option value="two_minute">2-Minute Drill</option>
                <option value="goal_line">Goal Line</option>
                <option value="backed_up">Backed Up</option>
                <option value="overtime">Overtime</option>
              </select>
            </div>

            <button onClick={getSuggestions} disabled={aiLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <Brain className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} />
              {aiLoading ? "Nx AI Thinking..." : "Get Nx Suggestions"}
            </button>
          </div>

          {/* Structured Play Call Panel */}
          <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-white font-semibold text-sm">Structured Play Call</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Formation</label>
                <input value={formation} onChange={e => setFormation(e.target.value)} placeholder="e.g. 21 Personnel"
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Package</label>
                <input value={playPackage} onChange={e => setPlayPackage(e.target.value)} placeholder="e.g. Trips Right"
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Motion</label>
                <input value={motion} onChange={e => setMotion(e.target.value)} placeholder="e.g. Bubble Screen"
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Tag</label>
                <input value={tag} onChange={e => setTag(e.target.value)} placeholder="e.g. Hot Route"
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Play Call</label>
              <input value={structuredCall} readOnly
                className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        {/* Suggestions Panel */}
        <div className="lg:col-span-2 space-y-3">
          {aiLoading && (
            <div className="bg-[#141414] border border-orange-500/20 rounded-xl p-8 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Nx AI analyzing game situation...</p>
            </div>
          )}

          {suggestions && !aiLoading && (
            <>
              {/* Assessment Banner */}
              <div className={`border rounded-xl p-4 ${urgencyColor[suggestions.urgency] || urgencyColor.medium}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Situation Assessment · {suggestions.urgency?.toUpperCase()}</span>
                  <button onClick={getSuggestions} className="ml-auto p-1 hover:opacity-70 transition-opacity">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm">{suggestions.situation_assessment}</p>
              </div>

              {/* Play Calls */}
              {suggestions.play_calls?.length > 0 && (
                <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
                  <button onClick={() => setExpanded(expanded === "play_calls" ? null : "play_calls")}
                    className="w-full flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-400" />
                      <span className="text-white font-semibold text-sm">Suggested Play Calls</span>
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">{suggestions.play_calls.length}</span>
                    </div>
                    {expanded === "play_calls" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {expanded === "play_calls" && (
                    <div className="border-t border-gray-800 divide-y divide-gray-800">
                      {suggestions.play_calls.map((p, i) => (
                        <div key={i} className="p-3 flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold text-sm">{p.play_name}</span>
                              {p.formation && <span className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{p.formation}</span>}
                            </div>
                            <p className="text-gray-400 text-xs mt-0.5">{p.rationale}</p>
                          </div>
                          {p.success_probability && <span className="text-green-400 text-xs font-bold flex-shrink-0">{p.success_probability}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Matchups */}
              {suggestions.optimal_matchups?.length > 0 && (
                <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
                  <button onClick={() => setExpanded(expanded === "matchups" ? null : "matchups")}
                    className="w-full flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-semibold text-sm">Optimal Matchups</span>
                    </div>
                    {expanded === "matchups" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {expanded === "matchups" && (
                    <div className="border-t border-gray-800 divide-y divide-gray-800">
                      {suggestions.optimal_matchups.map((m, i) => (
                        <div key={i} className="p-3">
                          <p className="text-white text-sm font-medium">{m.matchup}</p>
                          <p className="text-purple-300 text-xs mt-0.5">{m.advantage}</p>
                          <p className="text-gray-400 text-xs mt-1">{m.how_to_exploit}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Defensive Adjustments */}
              {suggestions.defensive_adjustments?.length > 0 && (
                <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
                  <button onClick={() => setExpanded(expanded === "defense" ? null : "defense")}
                    className="w-full flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-semibold text-sm">Defensive Adjustments</span>
                    </div>
                    {expanded === "defense" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {expanded === "defense" && (
                    <div className="border-t border-gray-800 divide-y divide-gray-800">
                      {suggestions.defensive_adjustments.map((d, i) => (
                        <div key={i} className="p-3">
                          <p className="text-white text-sm font-medium">{d.adjustment}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{d.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Personnel & Next Series */}
              {(suggestions.personnel_recommendations?.length > 0 || suggestions.next_series_focus) && (
                <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
                  {suggestions.personnel_recommendations?.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Personnel Recommendations</p>
                      <ul className="space-y-1">
                        {suggestions.personnel_recommendations.map((r, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-orange-400 mt-0.5">▸</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {suggestions.next_series_focus && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <p className="text-blue-400 text-xs uppercase mb-1">Next Series Focus</p>
                      <p className="text-gray-300 text-sm">{suggestions.next_series_focus}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!suggestions && !aiLoading && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-12 text-center">
              <Crosshair className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Set your game situation and click<br />Get Nx Suggestions to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}