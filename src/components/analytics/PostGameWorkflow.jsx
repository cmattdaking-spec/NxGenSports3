import { useState } from "react";
import { Zap, X, CheckCircle, Circle, Play, Upload, FileText, MessageSquare, BarChart2, ChevronRight, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const WORKFLOW_STEPS = [
  { id: "film", label: "Film Breakdown", icon: Play, desc: "Upload film notes or key play breakdowns from the game" },
  { id: "stats", label: "Stats Review", icon: BarChart2, desc: "Review and confirm game stats are logged for all players" },
  { id: "analysis", label: "AI Analysis", icon: Zap, desc: "Run AI post-game analysis combining film notes & stats" },
  { id: "report", label: "Coaching Report", icon: FileText, desc: "Generate final post-game report for staff distribution" },
  { id: "message", label: "Team Message", icon: MessageSquare, desc: "Draft a post-game message to players and staff" },
];

export default function PostGameWorkflow({ players, stats, games, user }) {
  const [activeStep, setActiveStep] = useState("film");
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [filmNotes, setFilmNotes] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [coachReport, setCoachReport] = useState("");
  const [teamMessage, setTeamMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [filmFile, setFilmFile] = useState(null);

  const isHeadCoach = ["admin", "head_coach", "associate_head_coach"].includes(user?.role);

  const weeks = [...new Set(stats.map(s => s.week))].sort((a, b) => b - a);
  const weekStats = selectedWeek ? stats.filter(s => s.week === Number(selectedWeek)) : [];

  const markComplete = (stepId) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const runAIAnalysis = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    setAiAnalysis("");

    const topPerformers = weekStats.sort((a, b) => (b.grade || 0) - (a.grade || 0)).slice(0, 5)
      .map(s => `${s.player_name} (${s.position}): grade=${s.grade || "N/A"}, yards=${(s.passing_yards || 0) + (s.rushing_yards || 0) + (s.receiving_yards || 0)}, TDs=${s.touchdowns || 0}, tackles=${s.tackles || 0}`);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the head football analyst for NxDown. Generate a comprehensive post-game analysis report.\n\nGame Week: ${selectedWeek}\nFilm Notes from Coaching Staff:\n${filmNotes || "No film notes provided — analyze from stats only"}\n\nTop Performers:\n${topPerformers.join("\n")}\n\nFull Stats Count: ${weekStats.length} players logged\n\nProvide:\n1. GAME SUMMARY (2-3 sentences)\n2. OFFENSIVE PERFORMANCE\n   - What worked, what didn't\n   - Key plays identified from film\n   - Grade (A-F)\n3. DEFENSIVE PERFORMANCE\n   - Coverage issues or strengths\n   - Pass rush effectiveness\n   - Grade (A-F)\n4. SPECIAL TEAMS\n5. INDIVIDUAL STANDOUTS (top 3 with specific notes)\n6. AREAS OF CONCERN (issues to address in practice)\n7. NEXT WEEK PREPARATION PRIORITIES\n\nWrite as a professional coaching document.`,
    });

    setAiAnalysis(res);
    markComplete("analysis");
    setLoading(false);
  };

  const generateCoachReport = async () => {
    if (!aiAnalysis) return;
    setLoading(true);
    setCoachReport("");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Take this post-game analysis and format it as a professional 1-page coaching report for staff distribution.\n\nAnalysis:\n${aiAnalysis}\n\nFormat with:\n- Clear section headers\n- Key action items highlighted\n- Practice focus areas\n- Individual player notes for position coaches\n- Overall game grade\n\nKeep it concise and staff-ready.`,
    });
    setCoachReport(res);
    markComplete("report");
    setLoading(false);
  };

  const generateTeamMessage = async () => {
    if (!aiAnalysis) return;
    setLoading(true);
    setTeamMessage("");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this post-game analysis, draft a head coach message to the entire team.\n\nAnalysis:\n${aiAnalysis}\n\nThe message should:\n- Be motivating and honest (not sugar-coating issues)\n- Acknowledge standout performances specifically\n- Address what needs to improve\n- Set the tone for the next week of practice\n- Be 3-4 paragraphs, conversational and direct\n- Sound like it comes from a confident head coach\n\nThis will be sent to players and coaching staff.`,
    });
    setTeamMessage(res);
    markComplete("message");
    setLoading(false);
  };

  const handleFilmUpload = async (file) => {
    setFilmFile(file);
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: "Extract any football film breakdown notes, play-by-play observations, coaching comments, or strategic insights from this file.",
      file_urls: [file_url],
    });
    setFilmNotes(prev => prev ? `${prev}\n\n[From uploaded file]:\n${res}` : `[From uploaded file]:\n${res}`);
    markComplete("film");
    setLoading(false);
  };

  if (!isHeadCoach) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
        <p className="text-white font-semibold">Head Coach Access Only</p>
        <p className="text-gray-500 text-sm mt-1">The Post-Game Workflow is restricted to Head Coaches and Administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">Post-Game Workflow</h2>
          <p className="text-gray-500 text-sm">Automated post-game analysis pipeline — film to final report</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm">Game Week:</span>
          <select value={selectedWeek} onChange={e => { setSelectedWeek(e.target.value); setActiveStep("film"); setCompletedSteps(new Set()); setAiAnalysis(""); setCoachReport(""); setTeamMessage(""); }}
            className="bg-[#141414] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm">
            <option value="">Select Week</option>
            {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
          </select>
        </div>
      </div>

      {!selectedWeek ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl">
          <Play className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Select a game week to begin the post-game workflow</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Step navigator */}
          <div className="space-y-2">
            {WORKFLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              const isDone = completedSteps.has(step.id);
              return (
                <button key={step.id} onClick={() => setActiveStep(step.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${isActive ? "text-white" : isDone ? "border-green-500/30 bg-green-500/5 text-green-400" : "border-gray-800 bg-[#141414] text-gray-400 hover:text-white"}`}
                  style={isActive ? { backgroundColor: "var(--color-primary,#f97316)22", borderColor: "var(--color-primary,#f97316)66" } : {}}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? "bg-green-500/20" : isActive ? "" : "bg-gray-800"}`}
                      style={isActive ? { backgroundColor: "var(--color-primary,#f97316)33" } : {}}>
                      {isDone ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Icon className="w-3.5 h-3.5" style={isActive ? { color: "var(--color-primary,#f97316)" } : {}} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{step.label}</p>
                      <p className="text-xs text-gray-500 truncate">{step.desc}</p>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-primary,#f97316)" }} />}
                  </div>
                </button>
              );
            })}

            {/* Progress */}
            <div className="pt-3 border-t border-gray-800">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Workflow Progress</span>
                <span>{completedSteps.size}/{WORKFLOW_STEPS.length} steps</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(completedSteps.size / WORKFLOW_STEPS.length) * 100}%`, backgroundColor: "var(--color-primary,#f97316)" }} />
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="lg:col-span-2 bg-[#141414] border border-gray-800 rounded-xl p-5">

            {/* STEP: Film Breakdown */}
            {activeStep === "film" && (
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Play className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} /> Film Breakdown Notes
                </h3>
                <p className="text-gray-500 text-sm">Enter coaching notes from film review, or upload a film breakdown document.</p>
                <textarea value={filmNotes} onChange={e => setFilmNotes(e.target.value)}
                  placeholder="e.g., 1st quarter — our OL had issues with their 3-tech. QB missed two open routes on the slant. Defensive secondary gave up 2 big plays on Cover 2 vs. vertical routes..."
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-4 py-3 rounded-lg text-sm resize-none h-48" />
                <div className="flex gap-3 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer border border-gray-700 hover:border-gray-500 text-gray-300 px-3 py-2 rounded-lg text-sm transition-all">
                    <Upload className="w-4 h-4" />
                    Upload Film Notes (PDF/Doc)
                    <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={e => e.target.files[0] && handleFilmUpload(e.target.files[0])} />
                  </label>
                  <button onClick={() => { markComplete("film"); setActiveStep("stats"); }}
                    disabled={!filmNotes.trim()}
                    className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                    style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                    Save & Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {loading && <p className="text-gray-400 text-sm animate-pulse">Extracting film notes from file...</p>}
              </div>
            )}

            {/* STEP: Stats Review */}
            {activeStep === "stats" && (
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} /> Week {selectedWeek} Stats Review
                </h3>
                <p className="text-gray-500 text-sm">{weekStats.length} players have stats logged for this week.</p>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {weekStats.sort((a, b) => (b.grade || 0) - (a.grade || 0)).map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1a1a1a] border border-gray-800">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-6">{s.position}</span>
                        <span className="text-white text-sm">{s.player_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {s.passing_yards > 0 && <span>{s.passing_yards} pass yds</span>}
                        {s.rushing_yards > 0 && <span>{s.rushing_yards} rush yds</span>}
                        {s.receiving_yards > 0 && <span>{s.receiving_yards} rec yds</span>}
                        {s.tackles > 0 && <span>{s.tackles} tkl</span>}
                        {s.touchdowns > 0 && <span className="text-green-400">{s.touchdowns} TD</span>}
                        {s.grade && <span className="font-bold" style={{ color: "var(--color-primary,#f97316)" }}>Grd: {s.grade}</span>}
                      </div>
                    </div>
                  ))}
                  {weekStats.length === 0 && (
                    <p className="text-gray-500 text-sm py-4 text-center">No stats logged for Week {selectedWeek}. Go to Player Trends tab to add stats.</p>
                  )}
                </div>
                <button onClick={() => { markComplete("stats"); setActiveStep("analysis"); }}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                  Confirm Stats & Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP: AI Analysis */}
            {activeStep === "analysis" && (
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} /> AI Post-Game Analysis
                </h3>
                {!aiAnalysis ? (
                  <>
                    <p className="text-gray-500 text-sm">AI will combine your film notes with game stats to generate a comprehensive post-game analysis.</p>
                    <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                      <p className="text-gray-400 font-medium">Inputs ready:</p>
                      <p className={completedSteps.has("film") ? "text-green-400" : "text-gray-600"}>
                        {completedSteps.has("film") ? "✓" : "○"} Film notes ({filmNotes.length} chars)
                      </p>
                      <p className={weekStats.length > 0 ? "text-green-400" : "text-gray-600"}>
                        {weekStats.length > 0 ? "✓" : "○"} Game stats ({weekStats.length} players)
                      </p>
                    </div>
                    <button onClick={runAIAnalysis} disabled={loading}
                      className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                      <Zap className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
                      {loading ? "Analyzing Game..." : "Run AI Analysis"}
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="max-h-72 overflow-y-auto bg-[#1a1a1a] border border-gray-700 rounded-lg p-4">
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiAnalysis}</pre>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setActiveStep("report")}
                        className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                        Next: Generate Report <ChevronRight className="w-4 h-4" />
                      </button>
                      <button onClick={() => setAiAnalysis("")} className="text-gray-400 hover:text-white text-sm border border-gray-700 px-3 py-2 rounded-lg">
                        Re-run
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP: Coach Report */}
            {activeStep === "report" && (
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} /> Coaching Staff Report
                </h3>
                {!coachReport ? (
                  <>
                    <p className="text-gray-500 text-sm">Generate a formatted report ready for distribution to your coaching staff.</p>
                    <button onClick={generateCoachReport} disabled={loading || !aiAnalysis}
                      className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
                      style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                      <FileText className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
                      {loading ? "Generating..." : "Generate Staff Report"}
                    </button>
                    {!aiAnalysis && <p className="text-yellow-500 text-xs">Complete the AI Analysis step first.</p>}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="max-h-72 overflow-y-auto bg-[#1a1a1a] border border-gray-700 rounded-lg p-4">
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{coachReport}</pre>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => {
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(new Blob([coachReport], { type: "text/plain" }));
                        a.download = `PostGame_Week${selectedWeek}_StaffReport.txt`;
                        a.click();
                      }} className="flex items-center gap-2 text-sm border border-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-lg">
                        Download Report
                      </button>
                      <button onClick={() => setActiveStep("message")}
                        className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                        Next: Team Message <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP: Team Message */}
            {activeStep === "message" && (
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} /> Team Message Draft
                </h3>
                {!teamMessage ? (
                  <>
                    <p className="text-gray-500 text-sm">AI will draft a post-game message from you to the team based on the analysis.</p>
                    <button onClick={generateTeamMessage} disabled={loading || !aiAnalysis}
                      className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
                      style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                      <MessageSquare className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
                      {loading ? "Drafting Message..." : "Draft Team Message"}
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <textarea value={teamMessage} onChange={e => setTeamMessage(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-4 py-3 rounded-lg text-sm resize-none h-48" />
                    <div className="flex gap-3">
                      <button onClick={() => setTeamMessage("")} className="text-gray-400 hover:text-white text-sm border border-gray-700 px-3 py-2 rounded-lg">
                        Re-draft
                      </button>
                      <button onClick={() => markComplete("message")}
                        className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                        <CheckCircle className="w-4 h-4" /> Mark Complete
                      </button>
                    </div>
                    {completedSteps.size === WORKFLOW_STEPS.length && (
                      <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-medium text-sm">Post-game workflow complete!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}