import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Loader2, Star, TrendingUp, AlertTriangle, Target, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

const TEAM_NEEDS = [
  "QB", "RB", "WR", "TE", "OL", "DE", "DT", "LB", "CB", "S", "K/P"
];

export default function ScoutAssistant({ profiles }) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [teamNeeds, setTeamNeeds] = useState([]);
  const [teamStyle, setTeamStyle] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkReport, setBulkReport] = useState(null);

  const toggleNeed = (pos) => {
    setTeamNeeds(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]);
  };

  const analyzeRecruit = async () => {
    if (!selectedProfile) return;
    setLoading(true);
    setReport(null);
    const p = selectedProfile;
    const prompt = `You are an elite football recruiting analyst for NxDown. Analyze this recruit and provide a comprehensive scouting evaluation.

Recruit: ${p.first_name} ${p.last_name}
Position: ${p.position} | Year: ${p.year || "Unknown"} | School: ${p.school_name || "Unknown"}
Height: ${p.height || "N/A"} | Weight: ${p.weight ? p.weight + " lbs" : "N/A"} | GPA: ${p.gpa || "N/A"}
Hometown: ${p.hometown || "N/A"}
40-Yard Dash: ${p.forty_time ? p.forty_time + "s" : "N/A"}
Vertical: ${p.vertical ? p.vertical + '"' : "N/A"} | Bench Reps: ${p.bench_reps || "N/A"}
Passing Yards: ${p.passing_yards || 0} | Rushing Yards: ${p.rushing_yards || 0} | Receiving Yards: ${p.receiving_yards || 0}
TDs: ${p.touchdowns || 0} | Tackles: ${p.tackles || 0} | Sacks: ${p.sacks || 0}
Stats Summary: ${p.stats_summary || "N/A"}
Bio: ${p.bio || "N/A"}
Awards: ${p.awards?.join(", ") || "None"}
Offers: ${p.offers?.join(", ") || "None"}
Highlight Film URL: ${p.highlight_url || p.hudl_url || "Not provided"}
${(p.highlight_url || p.hudl_url) ? "IMPORTANT: Use the highlight film URL above to look up and analyze actual game footage if accessible. Evaluate footwork, release, acceleration, coverage technique, etc. from film." : ""}
Recruiting Status: ${p.recruiting_status}
${p.committed_to ? `Committed to: ${p.committed_to}` : ""}

Team needs (positions): ${teamNeeds.length ? teamNeeds.join(", ") : "Not specified"}
Team style/system: ${teamStyle || "Not specified"}

Provide a thorough scouting report with grades, strengths, weaknesses, fit analysis, and overall recommendation.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: !!(p.highlight_url || p.hudl_url),
      response_json_schema: {
        type: "object",
        properties: {
          overall_grade: { type: "string", enum: ["A+","A","A-","B+","B","B-","C+","C","C-","D","F"] },
          overall_score: { type: "number" },
          star_rating: { type: "number" },
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          athleticism_grade: { type: "string" },
          production_grade: { type: "string" },
          football_iq_grade: { type: "string" },
          team_fit_score: { type: "number" },
          team_fit_analysis: { type: "string" },
          development_potential: { type: "string", enum: ["Low","Medium","High","Elite"] },
          comparable_player: { type: "string" },
          recommendation: { type: "string", enum: ["Hard Commit","Strong Pursue","Monitor","Pass"] },
          recommendation_notes: { type: "string" },
          projected_role: { type: "string" },
          red_flags: { type: "array", items: { type: "string" } },
        }
      }
    });
    setReport(res);
    setLoading(false);
  };

  const findBestFits = async () => {
    if (profiles.length === 0) return;
    setBulkLoading(true);
    setBulkReport(null);
    const profileList = profiles.map(p =>
      `${p.first_name} ${p.last_name} | ${p.position} | ${p.year || "?"} | 40yd: ${p.forty_time || "N/A"}s | GPA: ${p.gpa || "N/A"} | TDs: ${p.touchdowns || 0} | Rush: ${p.rushing_yards || 0} | Pass: ${p.passing_yards || 0} | Status: ${p.recruiting_status} | Awards: ${p.awards?.length || 0}`
    ).join("\n");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite football recruiting coordinator. Analyze these ${profiles.length} recruit profiles and identify the best fits for our team.

Team Needs (positions): ${teamNeeds.length ? teamNeeds.join(", ") : "All positions"}
Team System/Style: ${teamStyle || "General football"}

Recruits:
${profileList}

Identify the top recruits by position need, highlight hidden gems, and flag any that may be undervalued based on their stats/athleticism relative to their offer count.`,
      response_json_schema: {
        type: "object",
        properties: {
          top_picks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                position: { type: "string" },
                reason: { type: "string" },
                priority: { type: "string", enum: ["Must Have","High","Medium","Low"] },
              }
            }
          },
          hidden_gems: { type: "array", items: { type: "string" } },
          position_analysis: { type: "string" },
          overall_class_grade: { type: "string" },
          recommendations: { type: "array", items: { type: "string" } },
        }
      }
    });
    setBulkReport(res);
    setBulkLoading(false);
  };

  const PRIORITY_COLOR = {
    "Must Have": "bg-red-500/20 text-red-400 border-red-500/30",
    "High": "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "Medium": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "Low": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  const REC_COLOR = {
    "Hard Commit": "bg-green-500/20 text-green-400 border-green-500/30",
    "Strong Pursue": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Monitor": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "Pass": "bg-gray-600/20 text-gray-400 border-gray-600/30",
  };

  const gradeColor = (g) => {
    if (!g) return "text-gray-400";
    if (g.startsWith("A")) return "text-green-400";
    if (g.startsWith("B")) return "text-blue-400";
    if (g.startsWith("C")) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-5">
      {/* Config Panel */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
          <h2 className="text-white font-bold">NxScout AI Configuration</h2>
          <span className="text-xs px-2 py-0.5 rounded-full border text-orange-400 bg-orange-500/10 border-orange-500/20">AI-Powered</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Team Positional Needs (select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {TEAM_NEEDS.map(pos => (
                <button key={pos} onClick={() => toggleNeed(pos)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${teamNeeds.includes(pos) ? "text-white border-transparent" : "bg-[#1a1a1a] text-gray-400 border-gray-700 hover:border-gray-500"}`}
                  style={teamNeeds.includes(pos) ? { backgroundColor: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)" } : {}}>
                  {pos}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Team System / Style</label>
            <input value={teamStyle} onChange={e => setTeamStyle(e.target.value)}
              placeholder="e.g. Spread offense, 4-3 defense, Air Raid..."
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-4 flex-wrap">
          <button onClick={findBestFits} disabled={bulkLoading || profiles.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {bulkLoading ? "Analyzing Board..." : "Analyze Full Recruit Board"}
          </button>
        </div>
      </div>

      {/* Bulk Report */}
      {bulkReport && (
        <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">Recruit Board Analysis</h3>
            <span className="text-gray-500 text-xs">Class Grade: <span className="text-white font-black">{bulkReport.overall_class_grade}</span></span>
          </div>

          {bulkReport.position_analysis && (
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
              <p className="text-gray-300 text-sm leading-relaxed">{bulkReport.position_analysis}</p>
            </div>
          )}

          {bulkReport.top_picks?.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Top Targets</p>
              <div className="space-y-2">
                {bulkReport.top_picks.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 bg-[#1a1a1a] rounded-xl p-3 border border-gray-700">
                    <span className="text-orange-400 font-black text-sm w-6 flex-shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-white font-semibold text-sm">{p.name}</p>
                        <span className="text-gray-500 text-xs">{p.position}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[p.priority]}`}>{p.priority}</span>
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">{p.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bulkReport.hidden_gems?.length > 0 && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2">💎 Hidden Gems</p>
              <ul className="space-y-1">
                {bulkReport.hidden_gems.map((g, i) => (
                  <li key={i} className="text-gray-300 text-sm">· {g}</li>
                ))}
              </ul>
            </div>
          )}

          {bulkReport.recommendations?.length > 0 && (
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Action Items</p>
              <ul className="space-y-1">
                {bulkReport.recommendations.map((r, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <Target className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Individual Scout */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-4">Individual Recruit Evaluation</h3>
        <div className="flex gap-3 mb-4 flex-wrap">
          <select value={selectedProfile?.id || ""} onChange={e => setSelectedProfile(profiles.find(p => p.id === e.target.value) || null)}
            className="flex-1 min-w-[200px] bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none">
            <option value="">Select a recruit to evaluate...</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.position})</option>)}
          </select>
          <button onClick={analyzeRecruit} disabled={!selectedProfile || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {loading ? "Scouting..." : "Generate Report"}
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 text-sm py-6">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--color-primary,#f97316)" }} />
            NxScout AI is analyzing film, stats, measurables, and team fit...
          </div>
        )}

        {report && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Overall</p>
                <p className={`text-4xl font-black ${gradeColor(report.overall_grade)}`}>{report.overall_grade}</p>
              </div>
              <div>
                <div className="flex gap-0.5 mb-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(report.star_rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-700"}`} />
                  ))}
                </div>
                <p className="text-gray-400 text-xs">{report.star_rating?.toFixed(1)} stars</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: "Athleticism", val: report.athleticism_grade },
                  { label: "Production", val: report.production_grade },
                  { label: "Football IQ", val: report.football_iq_grade },
                ].map(g => (
                  <div key={g.label} className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-center">
                    <p className="text-gray-500 text-xs">{g.label}</p>
                    <p className={`font-black text-lg ${gradeColor(g.val)}`}>{g.val}</p>
                  </div>
                ))}
              </div>
              <div className={`ml-auto px-4 py-2 rounded-xl text-sm font-bold border ${REC_COLOR[report.recommendation]}`}>
                {report.recommendation}
              </div>
            </div>

            {report.summary && (
              <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
                <p className="text-gray-300 text-sm leading-relaxed">{report.summary}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.strengths?.length > 0 && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Strengths</p>
                  <ul className="space-y-1">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.weaknesses?.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">Areas to Develop</p>
                  <ul className="space-y-1">
                    {report.weaknesses.map((w, i) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" /> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {report.team_fit_analysis && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Team Fit Analysis</p>
                  <span className="text-blue-400 font-black">{report.team_fit_score}/100</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{report.team_fit_analysis}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {report.projected_role && (
                <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-center">
                  <p className="text-gray-500 text-xs mb-1">Projected Role</p>
                  <p className="text-white text-xs font-semibold">{report.projected_role}</p>
                </div>
              )}
              {report.development_potential && (
                <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-center">
                  <p className="text-gray-500 text-xs mb-1">Development</p>
                  <p className="text-white text-xs font-semibold">{report.development_potential}</p>
                </div>
              )}
              {report.comparable_player && (
                <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 col-span-2 text-center">
                  <p className="text-gray-500 text-xs mb-1">Comparable Player</p>
                  <p className="text-white text-sm font-bold">{report.comparable_player}</p>
                </div>
              )}
            </div>

            {report.red_flags?.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">⚠ Red Flags</p>
                <ul className="space-y-1">
                  {report.red_flags.map((f, i) => (
                    <li key={i} className="text-gray-300 text-sm">· {f}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.recommendation_notes && (
              <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Recommendation Notes</p>
                <p className="text-gray-300 text-sm leading-relaxed italic">{report.recommendation_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}