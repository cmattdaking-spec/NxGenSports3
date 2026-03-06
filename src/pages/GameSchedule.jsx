import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, MapPin, ChevronDown, ChevronUp, Shield, Swords, Target, TrendingUp, Brain, X, Gamepad2 } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import LiveGameTracker from "../components/schedule/LiveGameTracker";

const LEVELS = ["Varsity","JV","Freshman"];

const LEVEL_COLOR = {
  Varsity: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  JV: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Freshman: "bg-green-500/20 text-green-400 border-green-500/30"
};

export default function GameSchedule() {
  const [opponents, setOpponents] = useState([]);
  const [players, setPlayers] = useState([]);
  const [gamePlans, setGamePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filterLevel, setFilterLevel] = useState("all");
  const [scoutModal, setScoutModal] = useState(null);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutReport, setScoutReport] = useState(null);
  const [teamPreview, setTeamPreview] = useState(null);
  const [liveTracker, setLiveTracker] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.Opponent.list("game_date"),
      base44.entities.Player.list(),
      base44.entities.GamePlan.list()
    ]).then(([u, op, pl, gp]) => {
      setUser(u); setOpponents(op); setPlayers(pl); setGamePlans(gp);
      setLoading(false);
      // Build team preview
      const byUnit = { offense: pl.filter(p => p.unit === "offense" && p.status === "active").length, defense: pl.filter(p => p.unit === "defense" && p.status === "active").length, special_teams: pl.filter(p => p.unit === "special_teams" && p.status === "active").length };
      const injured = pl.filter(p => p.status === "injured").length;
      setTeamPreview({ total: pl.length, byUnit, injured });
    });
  }, []);

  const today = new Date();
  today.setHours(0,0,0,0);

  const upcoming = opponents.filter(o => new Date(o.game_date) >= today).sort((a,b) => new Date(a.game_date) - new Date(b.game_date));
  const past = opponents.filter(o => new Date(o.game_date) < today).sort((a,b) => new Date(b.game_date) - new Date(a.game_date));

  const filtered = (list) => list.filter(o => filterLevel === "all" || !o.level || o.level === filterLevel);

  const getGamePlan = (opponent) => gamePlans.find(gp => gp.opponent === opponent.name);

  const generateScoutPreview = async (opponent) => {
    setScoutModal(opponent);
    setScoutLoading(true);
    setScoutReport(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite football scout for NxDown. Generate a quick scouting preview for an upcoming opponent.

Opponent: ${opponent.name}
Date: ${opponent.game_date}
Location: ${opponent.location}
Record: ${opponent.record || "Unknown"}
Conference: ${opponent.conference || "Unknown"}
Offensive Tendency: ${opponent.offensive_tendency || "Unknown"}
Defensive Tendency: ${opponent.defensive_tendency || "Unknown"}
Key Players: ${opponent.key_players || "Unknown"}
Known Strengths: ${opponent.strengths || "Unknown"}
Known Weaknesses: ${opponent.weaknesses || "Unknown"}

Provide a concise game-week scouting preview including threat assessment, keys to winning, and immediate prep priorities.`,
      response_json_schema: {
        type: "object",
        properties: {
          threat_level: { type: "string", enum: ["Low","Medium","High","Elite"] },
          summary: { type: "string" },
          offensive_keys: { type: "array", items: { type: "string" } },
          defensive_keys: { type: "array", items: { type: "string" } },
          matchups_to_watch: { type: "array", items: { type: "string" } },
          immediate_prep_priorities: { type: "array", items: { type: "string" } },
          win_probability_factors: { type: "array", items: { type: "string" } }
        }
      }
    });
    setScoutReport(res);
    setScoutLoading(false);
  };

  const threatColor = { Low: "bg-green-500/20 text-green-400 border-green-500/30", Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", High: "bg-orange-500/20 text-orange-400 border-orange-500/30", Elite: "bg-red-500/20 text-red-400 border-red-500/30" };

  const renderGame = (opp, isPast) => {
    const plan = getGamePlan(opp);
    const isExpanded = expanded === opp.id;
    return (
      <div key={opp.id} className={`bg-[#141414] border rounded-xl overflow-hidden transition-all ${isPast ? "opacity-70 border-gray-800" : "border-gray-800 hover:border-gray-700"}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-white font-bold text-lg">vs. {opp.name}</h3>
                {opp.level && <span className={`text-xs px-2 py-0.5 rounded-full border ${LEVEL_COLOR[opp.level] || "bg-gray-500/20 text-gray-400"}`}>{opp.level}</span>}
                {opp.record && <span className="text-gray-500 text-xs">({opp.record})</span>}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{opp.game_date}</span>
                {opp.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{opp.location}</span>}
                {opp.conference && <span>· {opp.conference}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isPast && (
                <button onClick={() => generateScoutPreview(opp)}
                  className="flex items-center gap-1 bg-teal-500/10 border border-teal-500/30 text-teal-400 px-2 py-1.5 rounded-lg text-xs hover:bg-teal-500/20 transition-all">
                  <Brain className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Scout Preview</span>
                </button>
              )}
              {plan && (
                <Link to={createPageUrl("GamePlan")} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs border transition-all"
                  style={{ backgroundColor: "var(--color-primary,#f97316)15", borderColor: "var(--color-primary,#f97316)40", color: "var(--color-primary,#f97316)" }}>
                  <Target className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Game Plan</span>
                </Link>
              )}
              <button onClick={() => setLiveTracker(opp)}
                className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white px-2 py-1.5 rounded-lg text-xs transition-all">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tracker</span>
              </button>
              <button onClick={() => setExpanded(isExpanded ? null : opp.id)} className="text-gray-500 hover:text-white p-1.5">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="border-t border-gray-800 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {opp.offensive_tendency && (
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-orange-500/15">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Swords className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Offensive Tendency</span>
                </div>
                <p className="text-gray-300 text-sm">{opp.offensive_tendency}</p>
              </div>
            )}
            {opp.defensive_tendency && (
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-blue-500/15">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Defensive Tendency</span>
                </div>
                <p className="text-gray-300 text-sm">{opp.defensive_tendency}</p>
              </div>
            )}
            {opp.key_players && (
              <div className="bg-[#1a1a1a] rounded-lg p-3">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Key Players to Watch</p>
                <p className="text-gray-300 text-sm">{opp.key_players}</p>
              </div>
            )}
            {opp.weaknesses && (
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-green-500/15">
                <p className="text-green-400 text-xs uppercase tracking-wider mb-1">Exploitable Weaknesses</p>
                <p className="text-gray-300 text-sm">{opp.weaknesses}</p>
              </div>
            )}
            {opp.hudl_link && (
              <div className="col-span-2">
                <a href={opp.hudl_link} target="_blank" rel="noreferrer" className="text-blue-400 text-sm hover:underline flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> View on Hudl
                </a>
              </div>
            )}
            {!opp.offensive_tendency && !opp.defensive_tendency && !opp.key_players && (
              <div className="col-span-2">
                <p className="text-gray-600 text-sm">No scouting data yet. <Link to={createPageUrl("Scouting")} className="text-blue-400 hover:underline">Add scouting info →</Link></p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Game <span style={{ color: "var(--color-primary,#f97316)" }}>Schedule</span></h1>
          <p className="text-gray-500 text-sm">{opponents.length} games · {upcoming.length} upcoming</p>
        </div>
        <Link to={createPageUrl("Scouting")}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          <Target className="w-4 h-4" /> Scouting
        </Link>
      </div>

      {/* Team Preview Card */}
      {teamPreview && (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Our Team Snapshot</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{teamPreview.total}</p>
              <p className="text-gray-500 text-xs">Total Players</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-blue-400">{teamPreview.byUnit.offense}</p>
              <p className="text-gray-500 text-xs">Offense</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-red-400">{teamPreview.byUnit.defense}</p>
              <p className="text-gray-500 text-xs">Defense</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-teal-400">{teamPreview.byUnit.special_teams}</p>
              <p className="text-gray-500 text-xs">Special Teams</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-red-500">{teamPreview.injured}</p>
              <p className="text-gray-500 text-xs">Injured</p>
            </div>
          </div>
        </div>
      )}

      {/* Level Filter */}
      <div className="flex gap-2 mb-5">
        {["all", ...LEVELS].map(l => (
          <button key={l} onClick={() => setFilterLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterLevel === l ? "text-white" : "bg-[#141414] border border-gray-800 text-gray-400 hover:text-white"}`}
            style={filterLevel === l ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
            {l === "all" ? "All Levels" : l}
          </button>
        ))}
      </div>

      {/* Upcoming Games */}
      {filtered(upcoming).length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Upcoming Games</h2>
          <div className="space-y-3">{filtered(upcoming).map(o => renderGame(o, false))}</div>
        </div>
      )}

      {/* Past Games */}
      {filtered(past).length > 0 && (
        <div>
          <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Past Games</h2>
          <div className="space-y-3">{filtered(past).map(o => renderGame(o, true))}</div>
        </div>
      )}

      {opponents.length === 0 && (
        <div className="text-center py-20">
          <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">No games scheduled yet.</p>
          <Link to={createPageUrl("Scouting")} className="text-sm px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            Add Opponents
          </Link>
        </div>
      )}

      {/* Live Game Tracker */}
      {liveTracker && <LiveGameTracker opponent={liveTracker} onClose={() => setLiveTracker(null)} />}

      {/* Scout Preview Modal */}
      {scoutModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-teal-500/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-teal-400" />
                <h2 className="text-white font-bold">Scout Preview: {scoutModal.name}</h2>
              </div>
              <button onClick={() => { setScoutModal(null); setScoutReport(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              {scoutLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Generating scout preview...</p>
                </div>
              ) : scoutReport ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">Threat Level:</span>
                    <span className={`text-sm font-bold px-3 py-0.5 rounded-full border ${threatColor[scoutReport.threat_level]}`}>
                      {scoutReport.threat_level}
                    </span>
                  </div>
                  {scoutReport.summary && <p className="text-gray-300 text-sm leading-relaxed">{scoutReport.summary}</p>}
                  {scoutReport.immediate_prep_priorities?.length > 0 && (
                    <div className="bg-[#1a1a1a] rounded-xl p-4 border" style={{ borderColor: "var(--color-primary,#f97316)30" }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-primary,#f97316)" }}>Immediate Prep Priorities</p>
                      <ul className="space-y-1.5">
                        {scoutReport.immediate_prep_priorities.map((p, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <span style={{ color: "var(--color-primary,#f97316)" }} className="mt-0.5">▸</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {scoutReport.offensive_keys?.length > 0 && (
                      <div className="bg-[#1a1a1a] rounded-lg p-3 border border-orange-500/20">
                        <p className="text-orange-400 text-xs font-semibold uppercase mb-2">Offensive Keys</p>
                        <ul className="space-y-1">{scoutReport.offensive_keys.map((k, i) => <li key={i} className="text-gray-300 text-xs">· {k}</li>)}</ul>
                      </div>
                    )}
                    {scoutReport.defensive_keys?.length > 0 && (
                      <div className="bg-[#1a1a1a] rounded-lg p-3 border border-blue-500/20">
                        <p className="text-blue-400 text-xs font-semibold uppercase mb-2">Defensive Keys</p>
                        <ul className="space-y-1">{scoutReport.defensive_keys.map((k, i) => <li key={i} className="text-gray-300 text-xs">· {k}</li>)}</ul>
                      </div>
                    )}
                  </div>
                  {scoutReport.win_probability_factors?.length > 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                      <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Win Probability Factors</p>
                      <ul className="space-y-1">{scoutReport.win_probability_factors.map((f, i) => <li key={i} className="text-gray-300 text-sm flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span>{f}</li>)}</ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}