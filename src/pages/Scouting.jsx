import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, Zap, Crosshair, ExternalLink, ChevronDown, ChevronUp, Brain, Shield, Swords, Users, Target } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import PlayLinker from "../components/scouting/PlayLinker";
import usePullToRefresh, { PullIndicator } from "@/components/hooks/usePullToRefresh";

export default function Scouting() {
  const [opponents, setOpponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTarget, setAiTarget] = useState(null);
  const [deepAnalysisTarget, setDeepAnalysisTarget] = useState(null);
  const [deepAnalysisLoading, setDeepAnalysisLoading] = useState(false);
  const [deepReport, setDeepReport] = useState(null);

  const load = () => base44.entities.Opponent.list("-game_date").then(d => { setOpponents(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const { refreshing, pullDelta, handlers: pullHandlers } = usePullToRefresh(
    () => base44.entities.Opponent.list("-game_date").then(d => setOpponents(d))
  );

  const openAdd = () => { setEditing(null); setForm({ location: "home" }); setShowForm(true); };
  const openEdit = (o) => { setEditing(o); setForm({...o}); setShowForm(true); };
  const save = async () => {
    setShowForm(false);
    if (editing) {
      setOpponents(prev => prev.map(o => o.id === editing.id ? { ...o, ...form } : o));
      await base44.entities.Opponent.update(editing.id, form);
    } else {
      const tempId = `temp_${Date.now()}`;
      setOpponents(prev => [{ ...form, id: tempId }, ...prev]);
      const created = await base44.entities.Opponent.create(form);
      setOpponents(prev => prev.map(o => o.id === tempId ? created : o));
    }
  };
  const remove = async (id) => {
    if (confirm("Delete opponent?")) {
      setOpponents(prev => prev.filter(o => o.id !== id));
      await base44.entities.Opponent.delete(id);
    }
  };

  const getScoutReport = async (opp) => {
    setAiLoading(true); setAiTarget(opp.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football scouting AI. Generate a concise scouting report for: ${opp.name} (${opp.record || "?"} record, ${opp.location} game on ${opp.game_date}).\nOffensive Tendency: ${opp.offensive_tendency || "Unknown"}\nDefensive Tendency: ${opp.defensive_tendency || "Unknown"}\nKey Players: ${opp.key_players || "Unknown"}\nStrengths: ${opp.strengths || "Unknown"}\nWeaknesses: ${opp.weaknesses || "Unknown"}\n\nProvide: 1) Offensive analysis 2) Defensive analysis 3) Key matchups 4) Top 3 game plan recommendations. Be tactical and specific.`,
      add_context_from_internet: true
    });
    await base44.entities.Opponent.update(opp.id, { ai_scout_report: res });
    load(); setAiLoading(false); setAiTarget(null);
  };

  const getDeepAnalysis = async (opp) => {
    setDeepAnalysisLoading(true);
    setDeepAnalysisTarget(opp.id);
    setDeepReport(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite football analytics AI. Provide a comprehensive strategic breakdown for facing ${opp.name}.
      
Known data:
- Record: ${opp.record || "Unknown"}, Conference: ${opp.conference || "Unknown"}
- Game: ${opp.game_date} (${opp.location})
- Offensive Tendency: ${opp.offensive_tendency || "Not provided"}
- Defensive Tendency: ${opp.defensive_tendency || "Not provided"}
- Key Players: ${opp.key_players || "Not provided"}
- Strengths: ${opp.strengths || "Not provided"}
- Weaknesses: ${opp.weaknesses || "Not provided"}

Generate a detailed JSON report with strategic insights.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          offensive_breakdown: { type: "string", description: "Detailed offensive tendencies, formations, preferred plays, run/pass split" },
          defensive_breakdown: { type: "string", description: "Defensive scheme, coverage types, blitz packages, vulnerabilities" },
          key_player_matchups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                their_player: { type: "string" },
                matchup_note: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          exploitable_weaknesses: { type: "array", items: { type: "string" } },
          game_plan_adjustments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area: { type: "string" },
                adjustment: { type: "string" },
                rationale: { type: "string" }
              }
            }
          },
          threat_level: { type: "string", enum: ["Low", "Medium", "High", "Very High"] },
          win_probability_factors: { type: "array", items: { type: "string" } },
          special_teams_notes: { type: "string" }
        }
      }
    });
    setDeepReport(res);
    setDeepAnalysisLoading(false);
  };

  const locationBadge = { home: "bg-green-500/20 text-green-400", away: "bg-red-500/20 text-red-400", neutral: "bg-yellow-500/20 text-yellow-400" };
  const threatColor = { Low: "text-green-400 bg-green-500/20", Medium: "text-yellow-400 bg-yellow-500/20", High: "text-orange-400 bg-orange-500/20", "Very High": "text-red-400 bg-red-500/20" };

  const upcoming = opponents.filter(o => new Date(o.game_date) >= new Date());
  const past = opponents.filter(o => new Date(o.game_date) < new Date());

  const renderOpponent = (opp) => (
    <div key={opp.id} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-white font-bold">{opp.name}</h3>
            {opp.record && <span className="text-gray-500 text-sm">({opp.record})</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full ${locationBadge[opp.location]}`}>{opp.location}</span>
          </div>
          <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
            <span>{opp.game_date}</span>
            {opp.conference && <span>· {opp.conference}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {opp.hudl_link && (
            <a href={opp.hudl_link} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-1.5 rounded-lg text-xs hover:bg-blue-500/20 transition-all">
              <ExternalLink className="w-3.5 h-3.5" /> Hudl
            </a>
          )}
          <button onClick={() => { setDeepAnalysisTarget(opp.id); getDeepAnalysis(opp); }}
            disabled={deepAnalysisLoading && deepAnalysisTarget === opp.id}
            className="flex items-center gap-1 bg-teal-500/10 border border-teal-500/30 text-teal-400 px-2 py-1.5 rounded-lg text-xs hover:bg-teal-500/20 transition-all">
            <Brain className={`w-3.5 h-3.5 ${deepAnalysisLoading && deepAnalysisTarget === opp.id ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{deepAnalysisLoading && deepAnalysisTarget === opp.id ? "Analyzing..." : "Nx Analysis"}</span>
          </button>
          <button onClick={() => getScoutReport(opp)} disabled={aiLoading && aiTarget === opp.id}
            className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2 py-1.5 rounded-lg text-xs hover:bg-orange-500/20 transition-all">
            <Zap className={`w-3.5 h-3.5 ${aiLoading && aiTarget === opp.id ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{aiLoading && aiTarget === opp.id ? "Scouting..." : "Nx Scout"}</span>
          </button>
          <button onClick={() => openEdit(opp)} className="text-gray-500 hover:text-orange-500 p-1.5"><Edit className="w-4 h-4" /></button>
          <button onClick={() => remove(opp.id)} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
          <button onClick={() => setExpanded(expanded === opp.id ? null : opp.id)} className="text-gray-500 hover:text-white p-1.5">
            {expanded === opp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded === opp.id && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {[
            { label: "Offensive Tendency", val: opp.offensive_tendency },
            { label: "Defensive Tendency", val: opp.defensive_tendency },
            { label: "Key Players", val: opp.key_players },
            { label: "Strengths", val: opp.strengths },
            { label: "Weaknesses", val: opp.weaknesses },
            { label: "Notes", val: opp.notes },
          ].filter(item => item.val).map(({ label, val }) => (
            <div key={label}>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</p>
              <p className="text-gray-300 text-sm">{val}</p>
            </div>
          ))}
          {opp.ai_scout_report && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-orange-400 text-xs font-medium">Nx Scout Report</span>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-line">{opp.ai_scout_report}</p>
            </div>
          )}
          {!opp.offensive_tendency && !opp.ai_scout_report && (
            <p className="text-gray-600 text-sm">No scout data yet. Use Nx Scout or Nx Analysis to generate a report.</p>
          )}
          {/* Linked Playbook Plays */}
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Linked Game Plan Plays</p>
            <PlayLinker
              opponentId={opp.id}
              opponentName={opp.name}
              linkedPlays={opp.linked_play_ids || []}
              onUpdate={async (ids) => {
                await base44.entities.Opponent.update(opp.id, { linked_play_ids: ids });
                load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6" {...pullHandlers}>
      <PullIndicator delta={pullDelta} refreshing={refreshing} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Opponent <span style={{ color: "var(--color-primary,#f97316)" }}>Scouting</span></h1>
          <p className="text-gray-500 text-sm">{opponents.length} opponents · Powered by Nx Intelligence</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          <Plus className="w-4 h-4" /> Add Opponent
        </button>
      </div>

      {opponents.length === 0 && (
        <div className="text-center py-20">
          <Crosshair className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No opponents yet. Add your schedule!</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Upcoming Games</h2>
          <div className="space-y-3">{upcoming.map(renderOpponent)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Past Games</h2>
          <div className="space-y-3 opacity-70">{past.map(renderOpponent)}</div>
        </div>
      )}

      {/* Deep Analysis Modal */}
      {deepAnalysisTarget && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-teal-500/30 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-teal-400" />
                <h2 className="text-white font-bold">Nx Deep Analysis</h2>
                <span className="text-teal-400 text-xs bg-teal-500/20 px-2 py-0.5 rounded-full">AI-Powered</span>
              </div>
              <button onClick={() => { setDeepAnalysisTarget(null); setDeepReport(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              {deepAnalysisLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Nx Intelligence analyzing opponent data...</p>
                  <p className="text-gray-600 text-xs">Generating offensive/defensive breakdown, matchups, and game plan adjustments</p>
                </div>
              ) : deepReport ? (
                <div className="space-y-5">
                  {/* Threat Level */}
                  {deepReport.threat_level && (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm">Threat Level:</span>
                      <span className={`text-sm font-bold px-3 py-0.5 rounded-full ${threatColor[deepReport.threat_level]}`}>
                        {deepReport.threat_level}
                      </span>
                    </div>
                  )}

                  {/* Offensive / Defensive breakdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deepReport.offensive_breakdown && (
                      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-orange-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Swords className="w-4 h-4 text-orange-400" />
                          <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Offensive Breakdown</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{deepReport.offensive_breakdown}</p>
                      </div>
                    )}
                    {deepReport.defensive_breakdown && (
                      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Defensive Breakdown</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{deepReport.defensive_breakdown}</p>
                      </div>
                    )}
                  </div>

                  {/* Key Matchups */}
                  {deepReport.key_player_matchups?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-teal-400" />
                          <span className="text-teal-400 text-xs font-semibold uppercase tracking-wider">Key Player Matchups</span>
                      </div>
                      <div className="space-y-2">
                        {deepReport.key_player_matchups.map((m, i) => (
                          <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-teal-500/10">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white text-sm font-semibold">{m.their_player}</span>
                            <span className="text-gray-500 text-xs">·</span>
                            <span className="text-gray-400 text-xs">{m.matchup_note}</span>
                          </div>
                          <p className="text-teal-300 text-xs">↳ {m.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exploitable Weaknesses */}
                  {deepReport.exploitable_weaknesses?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">Exploitable Weaknesses</span>
                      </div>
                      <ul className="space-y-1.5">
                        {deepReport.exploitable_weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="text-green-500 mt-0.5">▸</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Game Plan Adjustments */}
                  {deepReport.game_plan_adjustments?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Nx Game Plan Adjustments</span>
                      </div>
                      <div className="space-y-2">
                        {deepReport.game_plan_adjustments.map((adj, i) => (
                          <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-orange-500/10">
                            <p className="text-orange-300 text-xs font-semibold uppercase mb-0.5">{adj.area}</p>
                            <p className="text-white text-sm font-medium">{adj.adjustment}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{adj.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Teams */}
                  {deepReport.special_teams_notes && (
                    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-700">
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Special Teams Notes</p>
                      <p className="text-gray-300 text-sm">{deepReport.special_teams_notes}</p>
                    </div>
                  )}

                  {/* Win Probability Factors */}
                  {deepReport.win_probability_factors?.length > 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                      <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Win Probability Factors</p>
                      <ul className="space-y-1">
                        {deepReport.win_probability_factors.map((f, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Opponent" : "Add Opponent"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Team Name *</label>
                  <input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Game Date *</label>
                  <input type="date" value={form.game_date || ""} onChange={e => setForm({...form, game_date: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Location</label>
                  <select value={form.location || "home"} onChange={e => setForm({...form, location: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="home">Home</option>
                    <option value="away">Away</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Record</label>
                  <input value={form.record || ""} onChange={e => setForm({...form, record: e.target.value})} placeholder="e.g. 5-2"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Conference</label>
                  <input value={form.conference || ""} onChange={e => setForm({...form, conference: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Hudl Link</label>
                  <input value={form.hudl_link || ""} onChange={e => setForm({...form, hudl_link: e.target.value})} placeholder="https://hudl.com/..."
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              {[
                { label: "Offensive Tendencies", key: "offensive_tendency" },
                { label: "Defensive Tendencies", key: "defensive_tendency" },
                { label: "Key Players", key: "key_players" },
                { label: "Strengths", key: "strengths" },
                { label: "Weaknesses", key: "weaknesses" },
                { label: "Notes", key: "notes" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                  <textarea value={form[key] || ""} onChange={e => setForm({...form, [key]: e.target.value})} rows={2}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={save} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Save Opponent</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}