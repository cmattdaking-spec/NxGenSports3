import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Zap, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Star, Activity, Target, Dumbbell, Clapperboard, Clipboard } from "lucide-react";
import ReactMarkdown from "react-markdown";

const SECTION_ICONS = {
  roster_analysis: Users,
  injury_summary: Activity,
  depth_chart_gaps: Target,
  practice_readiness: Dumbbell,
  film_insights: Clapperboard,
  game_plan_execution: Clipboard,
  academic_compliance: Star,
  recommendations: CheckCircle,
  risk_flags: AlertTriangle,
};

function Users(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }

export default function AIProgramReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});

  const generateReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);

    try {
      const [players, healthRecords, depthCharts, practicePlans, gamePlans, filmSessions, filmTags, workouts, stats, opponents] = await Promise.all([
        base44.entities.Player.list(),
        base44.entities.PlayerHealth.list("-date", 200),
        base44.entities.DepthChart.list(),
        base44.entities.PracticePlan.list("-date", 20),
        base44.entities.GamePlan.list("-game_date", 20),
        base44.entities.FilmSession.list("-created_date", 10),
        base44.entities.FilmTag.list("-created_date", 200),
        base44.entities.WorkoutPlan.list("-date", 30),
        base44.entities.PlayerStat.list("-week", 100),
        base44.entities.Opponent.list("-game_date", 10),
      ]);

      // Build context
      const totalPlayers = players.length;
      const active = players.filter(p => p.status === "active").length;
      const injured = players.filter(p => p.status === "injured").length;
      const ineligible = players.filter(p => p.academic_eligible === false).length;

      // Latest health by player
      const latestHealth = {};
      healthRecords.forEach(r => {
        if (!latestHealth[r.player_id] || new Date(r.date) > new Date(latestHealth[r.player_id].date))
          latestHealth[r.player_id] = r;
      });
      const healthIssues = Object.values(latestHealth).filter(h => h.availability !== "full");

      // Depth chart coverage
      const coveredPositions = depthCharts.filter(d => d.starter_name).length;

      // Recent game results
      const gameResults = opponents.filter(o => o.game_result).map(o => `${o.name}: ${o.game_result} (${o.our_score}-${o.their_score})`).join(", ");

      // Film tags summary
      const successTags = filmTags.filter(t => t.result === "success").length;
      const totalTags = filmTags.length;

      // Recent S&C
      const completedWorkouts = workouts.filter(w => w.status === "completed").length;
      const avgLoad = workouts.length ? (workouts.reduce((s, w) => s + (w.load_score || 5), 0) / workouts.length).toFixed(1) : "N/A";

      // Stats summary
      const topPerformers = [...new Set(stats.map(s => s.player_name))].slice(0, 5).join(", ");

      const prompt = `You are an elite athletic director and football analytics AI generating a comprehensive program report for coaching staff. Analyze ALL aspects of the program and provide an executive-level summary with actionable insights.

PROGRAM DATA SNAPSHOT:
- Roster: ${totalPlayers} total, ${active} active, ${injured} injured, ${ineligible} academically ineligible
- Health Issues: ${healthIssues.length} players not at full availability: ${healthIssues.map(h => `${h.player_name} (${h.availability}${h.injury_type ? ', ' + h.injury_type : ''})`).join("; ") || "None"}
- Depth Chart: ${coveredPositions}/${depthCharts.length} positions with starters assigned
- Recent Results: ${gameResults || "No recorded games"}
- Film: ${totalTags} total plays tagged, ${totalTags ? Math.round((successTags/totalTags)*100) : 0}% success rate across ${filmSessions.length} sessions
- S&C: ${completedWorkouts} workouts completed, avg load score ${avgLoad}/10
- Game Plans: ${gamePlans.length} plans (${gamePlans.filter(g => g.status === 'final').length} finalized)
- Practice Plans: ${practicePlans.length} plans (${practicePlans.filter(p => p.status === 'completed').length} completed)
- Top Stat Contributors: ${topPerformers || "No stats logged"}

Generate a comprehensive AI Program Report with the following sections. Be specific with numbers, name real issues, and give concrete recommendations:

1. PROGRAM OVERVIEW — Overall health of the program, key metrics, strengths
2. ROSTER HEALTH — Injury impact, depth concerns, positional vulnerabilities
3. DEPTH CHART ANALYSIS — Positional gaps, competition needed, multi-position needs
4. FILM & TENDENCIES — Play success rates, formations working/not working, exploitation opportunities
5. S&C & READINESS — Training load, fatigue risks, conditioning recommendations
6. ACADEMIC COMPLIANCE — Eligibility status, at-risk players, GPA concerns
7. GAME PLAN EXECUTION — How well plans have been followed, adjustments needed
8. TOP PRIORITIES — The 5 most important things the coaching staff should address THIS WEEK
9. RISK FLAGS — Critical alerts the head coach must be aware of immediately

Write in a direct, professional tone appropriate for coaching staff. Use data to back every claim.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: "claude_sonnet_4_6",
        response_json_schema: {
          type: "object",
          properties: {
            program_grade: { type: "string", enum: ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"] },
            program_grade_note: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  status: { type: "string", enum: ["good", "warning", "critical", "info"] },
                  bullets: { type: "array", items: { type: "string" } }
                }
              }
            },
            top_priorities: { type: "array", items: { type: "string" } },
            risk_flags: { type: "array", items: { type: "string" } },
            executive_summary: { type: "string" }
          }
        }
      });

      setReport(result);
    } catch (err) {
      setError("Failed to generate report. Please try again.");
    }
    setLoading(false);
  };

  const gradeColor = (g) => {
    if (!g) return "text-gray-400";
    if (g.startsWith("A")) return "text-green-400";
    if (g.startsWith("B")) return "text-blue-400";
    if (g.startsWith("C")) return "text-yellow-400";
    return "text-red-400";
  };

  const statusStyles = {
    good: "border-green-500/30 bg-green-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    critical: "border-red-500/30 bg-red-500/5",
    info: "border-gray-700 bg-[#1a1a1a]",
  };

  const statusDot = {
    good: "bg-green-400",
    warning: "bg-yellow-400",
    critical: "bg-red-400",
    info: "bg-gray-500",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-black text-xl flex items-center gap-2">
            <Brain className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
            AI Program Report
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Full program analysis — roster, health, film, S&C, game plans & more</p>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-all"
          style={{ backgroundColor: "var(--color-primary,#f97316)" }}
        >
          <Zap className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
          {loading ? "Generating Report..." : report ? "Regenerate Report" : "Generate AI Report"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && (
        <div className="bg-[#141414] border border-gray-800 rounded-2xl p-16 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-gray-800 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-2 border-t-transparent rounded-full animate-spin" style={{ borderTopColor: "var(--color-primary,#f97316)" }} />
            <Brain className="absolute inset-0 m-auto w-6 h-6" style={{ color: "var(--color-primary,#f97316)" }} />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">Nx Intelligence Analyzing Your Program</p>
            <p className="text-gray-500 text-sm mt-1">Reviewing roster, health, film, S&C, game plans, and more...</p>
          </div>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-5">
          {/* Program Grade */}
          <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5 flex items-center gap-5 flex-wrap">
            <div className="text-center flex-shrink-0">
              <div className={`text-6xl font-black leading-none ${gradeColor(report.program_grade)}`}>{report.program_grade || "B"}</div>
              <p className="text-gray-500 text-xs mt-1">Program Grade</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Executive Summary</p>
              <p className="text-gray-200 text-sm leading-relaxed">{report.executive_summary}</p>
              {report.program_grade_note && <p className="text-gray-500 text-xs mt-2 italic">{report.program_grade_note}</p>}
            </div>
          </div>

          {/* Risk Flags */}
          {report.risk_flags?.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/25 rounded-2xl p-5">
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Critical Risk Flags
              </p>
              <div className="space-y-2">
                {report.risk_flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    <p className="text-gray-200 text-sm">{flag}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Priorities */}
          {report.top_priorities?.length > 0 && (
            <div className="bg-[var(--color-primary,#f97316)]/5 border border-[var(--color-primary,#f97316)]/20 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--color-primary,#f97316)" }}>
                <Star className="w-3.5 h-3.5" /> Top Priorities This Week
              </p>
              <div className="space-y-2">
                {report.top_priorities.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xs font-black mt-0.5 flex-shrink-0 w-5" style={{ color: "var(--color-primary,#f97316)" }}>{i + 1}.</span>
                    <p className="text-gray-200 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-3">
            {report.sections?.map((section, i) => {
              const isOpen = expanded[i] !== false; // default open
              return (
                <div key={i} className={`border rounded-2xl overflow-hidden ${statusStyles[section.status] || statusStyles.info}`}>
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [i]: !isOpen }))}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[section.status] || statusDot.info}`} />
                      <span className="text-white font-semibold text-sm">{section.title}</span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 space-y-3">
                      <p className="text-gray-300 text-sm leading-relaxed">{section.content}</p>
                      {section.bullets?.length > 0 && (
                        <ul className="space-y-1.5">
                          {section.bullets.map((b, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-gray-400">
                              <span className="text-gray-600 mt-1">·</span> {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="bg-[#141414] border border-gray-800 rounded-2xl p-16 text-center">
          <Brain className="w-14 h-14 mx-auto mb-4 text-gray-700" />
          <p className="text-white font-semibold text-lg">Full Program Intelligence</p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
            Click "Generate AI Report" for a complete analysis of your roster, health, depth chart, film, S&C, game plans, and academic compliance — with specific action items for this week.
          </p>
          <p className="text-gray-600 text-xs mt-3">Uses advanced AI · Takes ~15 seconds</p>
        </div>
      )}
    </div>
  );
}