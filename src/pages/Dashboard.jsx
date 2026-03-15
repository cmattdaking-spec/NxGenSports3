import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { useSport } from "@/components/SportContext";
import { getSportConfig } from "@/components/SportConfig";
import {
  Users, BookOpen, Target, Activity, TrendingUp,
  ClipboardList, Crosshair, Zap, AlertTriangle,
  ArrowRight, Sparkles, X, ChevronRight,
  Building2 } from
"lucide-react";
import SocialShareBar from "@/components/SocialShareBar";

const SPORT_NAMES = {
  nxgensports: "NxGenSports",
  football: "NxDown", girls_flag_football: "NxDown",
  boys_basketball: "NxBucket", girls_basketball: "NxBucket",
  boys_baseball: "NxPitch", girls_softball: "NxPitch",
  boys_soccer: "NxGoal", girls_soccer: "NxGoal",
  girls_volleyball: "NxSet",
  boys_boxing: "NxRound", girls_boxing: "NxRound",
  boys_golf: "NxHole", girls_golf: "NxHole",
  boys_tennis: "NxServe", girls_tennis: "NxServe",
  boys_wrestling: "NxMatch", girls_wrestling: "NxMatch",
  boys_cross_country: "NxRace", girls_cross_country: "NxRace",
  boys_track: "NxRace", girls_track: "NxRace",
  boys_lacrosse: "NxCage", girls_lacrosse: "NxCage"
};

export default function Dashboard() {
  const { activeSport } = useSport();
  const cfg = getSportConfig(activeSport);
  const [players, setPlayers] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [plays, setPlays] = useState([]);
  const [gamePlans, setGamePlans] = useState([]);
  const [practices, setPractices] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDismissed, setAiDismissed] = useState(false);

  useEffect(() => {
    Promise.all([
    base44.auth.me().catch(() => null),
    base44.entities.Player.filter({ sport: activeSport }),
    base44.entities.PlayerHealth.list(),
    base44.entities.Play.filter({ sport: activeSport }),
    base44.entities.GamePlan.filter({ sport: activeSport }),
    base44.entities.PracticePlan.list(),
    base44.entities.Opponent.filter({ sport: activeSport })]
    ).then(([u, p, h, pl, gp, pr, op]) => {
      setUser(u);
      setPlayers(p);
      setHealthRecords(h);
      setPlays(pl);
      setGamePlans(gp);
      setPractices(pr);
      setOpponents(op);
      setLoading(false);
      loadAISuggestions(u, p, h, pl, gp, pr, op);
    });
  }, [activeSport]);

  const loadAISuggestions = async (u, p, h, pl, gp, pr, op) => {
    if (!u) return;
    setAiLoading(true);
    const role = u.role || "coach";
    const injured = p.filter((pl) => pl.status === "injured").length;
    const nextGame = op.find((o) => new Date(o.game_date) >= new Date());
    const upcomingPractice = pr.find((practice) => practice.status !== "completed" && new Date(practice.date) >= new Date());
    const context = `Role: ${role}. Players: ${p.length}. Injured: ${injured}. Plays in playbook: ${pl.length}. Game plans: ${gp.length}. Next game: ${nextGame ? nextGame.name + " on " + nextGame.game_date : "none"}. Upcoming practice: ${upcomingPractice ? upcomingPractice.title + " on " + upcomingPractice.date : "none"}.`;
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI assistant for a ${activeSport} team management app. Based on the current team data, generate 3 personalized action suggestions for a user with role "${role}". Keep each suggestion concise (under 15 words). Focus on the most impactful next steps given the data. Context: ${context}`,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                page: { type: "string", description: "One of: Roster, Playbook, DepthChart, GamePlan, Practice, Scouting, PlayerHealth, Analytics" },
                icon: { type: "string" }
              }
            }
          }
        }
      }
    });
    setAiSuggestions(res?.suggestions || []);
    setAiLoading(false);
  };

  const injured = players.filter((p) => p.status === "injured");
  const limited = healthRecords.filter((h) => h.availability === "limited" || h.availability === "out");
  const nextGame = opponents.find((o) => new Date(o.game_date) >= new Date());
  const upcomingPractice = practices.find((p) => p.status !== "completed" && new Date(p.date) >= new Date());

  const stats = [
  { label: "Players", value: players.length, icon: Users, page: "Roster", color: "from-blue-600 to-blue-700" },
  { label: `Total ${cfg.termPlay}s`, value: plays.length, icon: BookOpen, page: "Playbook", color: "from-orange-500 to-orange-600" },
  { label: "Game Plans", value: gamePlans.length, icon: Target, page: "GamePlan", color: "from-purple-600 to-purple-700" },
  { label: "Health Issues", value: injured.length + limited.length, icon: Activity, page: "PlayerHealth", color: "from-red-600 to-red-700" }];


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <div className="text-center">
          <div className="relative flex items-center justify-center mb-4">
            <div className="w-16 h-16 border-2 border-gray-800 border-t-orange-500 rounded-full animate-spin absolute" />
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8dea6f5ebfce20bad2a8c/871a00698_image_aaa46895.png"
              alt="NxDown"
              className="w-8 h-8 rounded-lg object-cover" />

          </div>
          <p className="text-gray-400 text-sm">Loading your command center...</p>
        </div>
      </div>);

  }

  return (
    <div className="bg-[#0a0a0a] min-h-full">

      {/* ── NxDown Branded Hero Header ── */}
      <div className="relative overflow-hidden border-b border-gray-800/60">
        {/* Background glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, var(--color-primary,#f97316), transparent)" }} />
          <div className="absolute -top-12 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl" style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
        </div>

        <div className="relative px-4 md:px-8 pt-8 pb-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: Logo + Welcome */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-2xl blur-lg opacity-30" style={{ backgroundColor: "var(--color-primary,#f97316)" }} />
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/681c5ffa8_image_6f7e875e.png"

                alt="NxDown" className="relative w-14 h-14 rounded-2xl object-cover shadow-2xl" />


              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                    Nx<span style={{ color: "var(--color-primary,#f97316)" }}>{(SPORT_NAMES[activeSport] || "NxDown").slice(2)}</span>
                  </h1>
                  <span className="hidden md:inline text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-semibold tracking-wider">PRO</span>
                </div>
                <p className="text-gray-400 text-sm font-medium">
                {user ?
                  <>Welcome back, <span className="text-white font-semibold">{user.full_name?.split(" ")[0] || "Coach"}</span></> :
                  `Next-Gen ${activeSport.charAt(0).toUpperCase() + activeSport.slice(1)} Systems`
                  }
                  {user?.school_name &&
                  <span className="ml-2 text-gray-600">· <Building2 className="w-3 h-3 inline mb-0.5" /> {user.school_name}</span>
                  }
                </p>
                <p className="text-gray-600 text-xs mt-0.5 capitalize">
                  {user?.role?.replace(/_/g, " ") || `${activeSport.replace(/_/g, " ")} Intelligence Platform`}
                  {user?.is_associate_head_coach && <span className="text-cyan-400 ml-1.5 font-semibold">(Associate HC)</span>}
                </p>
              </div>
            </div>

            {/* Right: Status + Social */}
            <div className="flex flex-col items-start md:items-end gap-2">
              <SocialShareBar label="Share your program" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">

        {/* Nx AI Suggestions */}
        {!aiDismissed && (aiLoading || aiSuggestions.length > 0) &&
          <div className="bg-[#141414] border rounded-xl p-4" style={{ borderColor: "var(--color-primary,#f97316)33" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
                <span className="text-sm font-semibold text-white">Nx Suggestions for You</span>
              </div>
              <button onClick={() => setAiDismissed(true)} className="text-gray-600 hover:text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {aiLoading ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-3 h-3 rounded-full border border-gray-500 border-t-transparent animate-spin" />
                Nx is analyzing your team data...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {aiSuggestions.map((s, i) => (
                  <Link
                    key={i}
                    to={createPageUrl(s.page || "Dashboard")}
                    className="flex items-center gap-2 p-3 bg-[#1a1a1a] rounded-lg border border-transparent transition-all group"
                    style={{ "--hover-border": "var(--color-primary,#f97316)44" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary,#f97316)44"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "var(--color-primary,#f97316)22" }}
                    >
                      <Zap className="w-3 h-3" style={{ color: "var(--color-primary,#f97316)" }} />
                    </div>
                    <span className="text-gray-300 text-xs flex-1">{s.text}</span>
                    <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        }

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, page, color }) =>
          <Link key={label} to={createPageUrl(page)}
          className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all group">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-gray-500 text-xs mt-1">{label}</p>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* NxGame */}
          <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Target className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} /> NxGame
              </h2>
              <Link to={createPageUrl("GameSchedule")} className="text-xs flex items-center gap-1" style={{ color: "var(--color-primary,#f97316)" }}>
                Full Schedule <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {nextGame ?
            <div>
                <p className="text-2xl font-black text-white">vs. {nextGame.name}</p>
                <p className="text-sm mt-1" style={{ color: "var(--color-primary,#f97316)" }}>{nextGame.game_date} · {nextGame.location}</p>
                {nextGame.offensive_tendency &&
              <p className="text-gray-400 text-xs mt-2 line-clamp-2"><span className="text-gray-500">{cfg.gamePlanKeyTendenciesLabel.split(" ")[0]}:</span> {nextGame.offensive_tendency}</p>
              }
                {nextGame.weaknesses &&
              <p className="text-green-400 text-xs mt-1 line-clamp-1">⚡ {nextGame.weaknesses}</p>
              }
              </div> :

            <p className="text-gray-500 text-sm">No upcoming games scheduled</p>
            }
          </div>

          {/* Health Alerts */}
          <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Health Alerts
              </h2>
              <Link to={createPageUrl("PlayerHealth")} className="text-xs flex items-center gap-1" style={{ color: "var(--color-primary,#f97316)" }}>
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {injured.length === 0 && limited.length === 0 ?
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-gray-400 text-sm">All players healthy</p>
              </div> :

            <div className="space-y-2">
                {injured.slice(0, 4).map((p) =>
              <div key={p.id} className="flex items-center justify-between">
                    <span className="text-white text-sm">{p.first_name} {p.last_name}</span>
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{p.position} · Injured</span>
                  </div>
              )}
              </div>
            }
          </div>

          {/* Quick Actions */}
          <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} /> Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
              { label: "Add Play", page: "Playbook", icon: BookOpen },
              { label: "Edit Depth Chart", page: "DepthChart", icon: TrendingUp },
              { label: "New Practice", page: "Practice", icon: ClipboardList },
              { label: "Game Schedule", page: "GameSchedule", icon: Crosshair }].
              map(({ label, page, icon: Icon }) =>
              <Link key={label} to={createPageUrl(page)}
              className="flex items-center gap-2 p-3 bg-[#1a1a1a] rounded-lg border border-transparent transition-all"
              onMouseEnter={(e) => {e.currentTarget.style.borderColor = "var(--color-primary,#f97316)44";e.currentTarget.style.backgroundColor = "var(--color-primary,#f97316)10";}}
              onMouseLeave={(e) => {e.currentTarget.style.borderColor = "transparent";e.currentTarget.style.backgroundColor = "";}}>
                  <Icon className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
                  <span className="text-gray-300 text-xs font-medium">{label}</span>
                </Link>
              )}
            </div>
          </div>

          {/* NxPractice */}
          <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold flex items-center gap-2">
                <ClipboardList className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} /> NxPractice
              </h2>
              <Link to={createPageUrl("Practice")} className="text-xs flex items-center gap-1" style={{ color: "var(--color-primary,#f97316)" }}>
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {upcomingPractice ?
            <div>
                <p className="text-xl font-black text-white">{upcomingPractice.title}</p>
                <p className="text-sm mt-1" style={{ color: "var(--color-primary,#f97316)" }}>{upcomingPractice.date}</p>
                {upcomingPractice.focus && <p className="text-gray-400 text-xs mt-2">{upcomingPractice.focus}</p>}
                {upcomingPractice.duration_minutes &&
              <p className="text-gray-500 text-xs mt-1">{upcomingPractice.duration_minutes} min</p>
              }
              </div> :

            <p className="text-gray-500 text-sm">No upcoming practices</p>
            }
          </div>
        </div>

      </div>
    </div>);

}