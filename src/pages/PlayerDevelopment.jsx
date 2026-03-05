import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, TrendingUp, Star, Target, Activity, ChevronDown, ChevronUp, User } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";

const RISK_COLOR = { Low: "text-green-400 bg-green-500/20", Medium: "text-yellow-400 bg-yellow-500/20", High: "text-red-400 bg-red-500/20" };
const POTENTIAL_COLOR = { Elite: "text-yellow-400", High: "text-orange-400", Medium: "text-blue-400", Developing: "text-gray-400" };

export default function PlayerDevelopment() {
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [devPlan, setDevPlan] = useState(null);
  const [devLoading, setDevLoading] = useState(false);
  const [teamReport, setTeamReport] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Player.list(),
      base44.entities.PlayerStat.list("-week", 200),
      base44.entities.PlayerHealth.list("-date", 100),
      base44.entities.PracticePlan.list("-date", 20),
    ]).then(([pl, st, hr, pr]) => {
      setPlayers(pl); setStats(st); setHealthRecords(hr); setPractices(pr);
      setLoading(false);
    });
  }, []);

  const generateDevelopmentPlan = async (player) => {
    setSelectedPlayer(player);
    setDevLoading(true); setDevPlan(null);

    const playerStats = stats.filter(s => s.player_id === player.id).sort((a, b) => b.week - a.week);
    const latestHealth = healthRecords.filter(h => h.player_id === player.id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const avgGrade = playerStats.length ? (playerStats.reduce((s, r) => s + (r.grade || 0), 0) / playerStats.length).toFixed(1) : "N/A";
    const avgSnaps = playerStats.length ? (playerStats.reduce((s, r) => s + (r.snap_count || 0), 0) / playerStats.length).toFixed(0) : "N/A";
    const injuries = latestHealth.filter(h => h.injury_type).map(h => h.injury_type).join(", ") || "None";
    const recentPractices = practices.slice(0, 5).map(p => `${p.title} (${p.focus || "General"})`).join(", ");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite player development AI for NxDown football. Generate a comprehensive long-term development plan for this player.

Player Profile:
- Name: ${player.first_name} ${player.last_name}
- Position: ${player.position}, Unit: ${player.unit}
- Year: ${player.year || "Unknown"}, Height: ${player.height || "?"}, Weight: ${player.weight || "?"}lbs
- Overall Rating: ${player.overall_rating || "N/A"}/100
- Speed: ${player.speed || "N/A"}, Strength: ${player.strength || "N/A"}, Agility: ${player.agility || "N/A"}, Football IQ: ${player.football_iq || "N/A"}
- Status: ${player.status}

Performance Data (${playerStats.length} games tracked):
- Average Grade: ${avgGrade}, Average Snaps: ${avgSnaps}
${playerStats.length > 0 ? `- Recent stats: ${JSON.stringify(playerStats.slice(0,3))}` : ""}

Health History:
- Recent Injuries: ${injuries}
- Current Availability: ${latestHealth[0]?.availability || "Unknown"}

Recent Practice Load: ${recentPractices || "No data"}

Generate a detailed long-term development plan.`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_assessment: { type: "string" },
          potential_rating: { type: "string", enum: ["Elite", "High", "Medium", "Developing"] },
          injury_risk_level: { type: "string", enum: ["Low", "Medium", "High"] },
          star_potential: { type: "boolean" },
          strengths: { type: "array", items: { type: "string" } },
          areas_to_improve: { type: "array", items: { type: "string" } },
          short_term_goals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal: { type: "string" },
                timeline: { type: "string" },
                metric: { type: "string" }
              }
            }
          },
          long_term_goals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal: { type: "string" },
                timeline: { type: "string" }
              }
            }
          },
          training_program: {
            type: "object",
            properties: {
              weekly_focus: { type: "string" },
              strength_drills: { type: "array", items: { type: "string" } },
              skill_drills: { type: "array", items: { type: "string" } },
              film_study: { type: "string" },
              load_recommendation: { type: "string" }
            }
          },
          career_projection: { type: "string" },
          next_level_readiness: { type: "string" }
        }
      }
    });
    setDevPlan(res);
    setDevLoading(false);
  };

  const generateTeamReport = async () => {
    setTeamLoading(true); setTeamReport(null);
    const playerData = players.slice(0, 30).map(p => {
      const pStats = stats.filter(s => s.player_id === p.id);
      const avgGrade = pStats.length ? (pStats.reduce((sum, s) => sum + (s.grade || 0), 0) / pStats.length).toFixed(1) : 0;
      const latestHealth = healthRecords.filter(h => h.player_id === p.id)[0];
      return `${p.first_name} ${p.last_name}: ${p.position} (${p.year}), Rating: ${p.overall_rating || "N/A"}, Avg Grade: ${avgGrade}, Health: ${latestHealth?.availability || "unknown"}, Status: ${p.status}`;
    }).join("\n");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite talent scout and development AI for NxDown. Analyze the entire roster and identify top prospects, development needs, and team strengths.

Players:
${playerData}

Generate a comprehensive team development report.`,
      response_json_schema: {
        type: "object",
        properties: {
          team_summary: { type: "string" },
          future_stars: {
            type: "array",
            items: {
              type: "object",
              properties: {
                player_name: { type: "string" },
                position: { type: "string" },
                reason: { type: "string" },
                potential: { type: "string" }
              }
            }
          },
          depth_concerns: { type: "array", items: { type: "string" } },
          team_development_priorities: { type: "array", items: { type: "string" } },
          next_level_prospects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                player_name: { type: "string" },
                projection: { type: "string" }
              }
            }
          }
        }
      }
    });
    setTeamReport(res);
    setTeamLoading(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Player <span className="text-orange-500">Development</span></h1>
          <p className="text-gray-500 text-sm">Nx AI-powered long-term development plans</p>
        </div>
        <button onClick={generateTeamReport} disabled={teamLoading}
          className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-400 px-4 py-2 rounded-lg text-sm font-semibold transition-all">
          <Star className={`w-4 h-4 ${teamLoading ? "animate-pulse" : ""}`} />
          {teamLoading ? "Analyzing Team..." : "Team Prospect Report"}
        </button>
      </div>

      {/* Team Report */}
      {(teamLoading || teamReport) && (
        <div className="bg-[#141414] border border-purple-500/20 rounded-xl mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-400" />
            <span className="text-white font-semibold text-sm">Nx Team Prospect Report</span>
          </div>
          {teamLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Analyzing entire roster...</p>
            </div>
          ) : teamReport && (
            <div className="p-4 space-y-4">
              <p className="text-gray-300 text-sm">{teamReport.team_summary}</p>
              {teamReport.future_stars?.length > 0 && (
                <div>
                  <p className="text-yellow-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Star className="w-3 h-3" /> Future Stars</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {teamReport.future_stars.map((s, i) => (
                      <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-yellow-500/10">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-sm">{s.player_name}</span>
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">{s.position}</span>
                          <span className={`text-xs ml-auto ${POTENTIAL_COLOR[s.potential] || "text-gray-400"}`}>{s.potential}</span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">{s.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {teamReport.next_level_prospects?.length > 0 && (
                <div>
                  <p className="text-blue-400 text-xs uppercase tracking-wider mb-2">Next Level Prospects</p>
                  <div className="space-y-1.5">
                    {teamReport.next_level_prospects.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-white font-medium">{p.player_name}</span>
                        <span className="text-gray-400 text-xs">→ {p.projection}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Player Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map(player => {
          const pStats = stats.filter(s => s.player_id === player.id);
          const avgGrade = pStats.length ? (pStats.reduce((sum, s) => sum + (s.grade || 0), 0) / pStats.length).toFixed(1) : null;
          const latestHealth = healthRecords.filter(h => h.player_id === player.id)[0];
          const isSelected = selectedPlayer?.id === player.id;

          return (
            <div key={player.id} className={`bg-[#141414] border rounded-xl overflow-hidden transition-all ${isSelected ? "border-orange-500/50" : "border-gray-800 hover:border-gray-700"}`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
                      {player.first_name?.[0]}{player.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{player.first_name} {player.last_name}</p>
                      <p className="text-gray-500 text-xs">{player.position} · {player.year || "—"}</p>
                    </div>
                  </div>
                  {player.overall_rating && (
                    <div className="text-right">
                      <p className="text-orange-400 font-black text-lg">{player.overall_rating}</p>
                      <p className="text-gray-600 text-xs">Rating</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mb-3">
                  {avgGrade && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Avg Grade: {avgGrade}</span>}
                  {latestHealth && <span className={`text-xs px-2 py-0.5 rounded ${latestHealth.availability === "full" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>{latestHealth.availability}</span>}
                </div>
                <button onClick={() => generateDevelopmentPlan(player)} disabled={devLoading && isSelected}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-400 py-2 rounded-lg text-xs font-medium transition-all">
                  <Brain className={`w-3.5 h-3.5 ${devLoading && isSelected ? "animate-pulse" : ""}`} />
                  {devLoading && isSelected ? "Generating Plan..." : "Nx Development Plan"}
                </button>
              </div>

              {/* Dev Plan Display */}
              {isSelected && devPlan && !devLoading && (
                <div className="border-t border-gray-800 p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${POTENTIAL_COLOR[devPlan.potential_rating]} bg-current/10`} style={{ backgroundColor: devPlan.potential_rating === "Elite" ? "rgba(234,179,8,0.1)" : devPlan.potential_rating === "High" ? "rgba(249,115,22,0.1)" : "rgba(59,130,246,0.1)" }}>
                      {devPlan.potential_rating} Potential
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_COLOR[devPlan.injury_risk_level]}`}>
                      {devPlan.injury_risk_level} Injury Risk
                    </span>
                    {devPlan.star_potential && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" /> Star Potential
                      </span>
                    )}
                  </div>

                  <p className="text-gray-300 text-xs">{devPlan.overall_assessment}</p>

                  {/* Short-term goals */}
                  {devPlan.short_term_goals?.length > 0 && (
                    <div>
                      <p className="text-orange-400 text-xs uppercase tracking-wider mb-1.5">Short-Term Goals</p>
                      {devPlan.short_term_goals.map((g, i) => (
                        <div key={i} className="flex items-start gap-2 mb-1.5">
                          <Target className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-300 text-xs">{g.goal}</p>
                            <p className="text-gray-500 text-xs">{g.timeline}{g.metric ? ` · ${g.metric}` : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Training */}
                  {devPlan.training_program && (
                    <div className="bg-[#1a1a1a] rounded-lg p-3">
                      <p className="text-blue-400 text-xs uppercase mb-2">Training Program</p>
                      {devPlan.training_program.weekly_focus && <p className="text-gray-400 text-xs mb-2">{devPlan.training_program.weekly_focus}</p>}
                      {devPlan.training_program.skill_drills?.slice(0, 3).map((d, i) => (
                        <p key={i} className="text-gray-300 text-xs flex gap-1.5"><span className="text-blue-400">·</span> {d}</p>
                      ))}
                      {devPlan.training_program.load_recommendation && (
                        <p className="text-yellow-400 text-xs mt-2 italic">{devPlan.training_program.load_recommendation}</p>
                      )}
                    </div>
                  )}

                  {/* Career Projection */}
                  {devPlan.career_projection && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                      <p className="text-green-400 text-xs uppercase mb-1">Career Projection</p>
                      <p className="text-gray-300 text-xs">{devPlan.career_projection}</p>
                      {devPlan.next_level_readiness && <p className="text-gray-500 text-xs mt-1 italic">{devPlan.next_level_readiness}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}