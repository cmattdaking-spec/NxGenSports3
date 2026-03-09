import { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  Users, Activity, Calendar, BarChart2, GraduationCap,
  Shield, ChevronRight, Globe, Award, TrendingUp
} from "lucide-react";

const SPORT_LABELS = {
  football:"Football", basketball:"Basketball", baseball:"Baseball", softball:"Softball",
  soccer:"Soccer", volleyball:"Volleyball", boxing:"Boxing", golf:"Golf",
  tennis:"Tennis", wrestling:"Wrestling", cross_country:"Cross Country", track:"Track", lacrosse:"Lacrosse"
};

const NXGEN_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/29e077944_generated_image.png";

export default function ADPortal() {
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.Player.list(),
      base44.entities.PlayerHealth.list(),
      base44.entities.Opponent.list(),
      base44.entities.User.list().catch(() => []),
    ]).then(([u, p, h, o, s]) => {
      setUser(u);
      setPlayers(p);
      setHealthRecords(h);
      setOpponents(o);
      setStaff((s || []).filter(m => m.coaching_role));
      setLoading(false);
    });
  }, []);

  // Group players by sport
  const playersBySport = players.reduce((acc, p) => {
    const s = p.sport || "football";
    if (!acc[s]) acc[s] = [];
    acc[s].push(p);
    return acc;
  }, {});

  // Health by sport
  const healthBySport = healthRecords.reduce((acc, h) => {
    const p = players.find(pl => pl.id === h.player_id);
    const s = p?.sport || "unknown";
    if (!acc[s]) acc[s] = { out: 0, limited: 0, full: 0 };
    if (h.availability === "out") acc[s].out++;
    else if (h.availability === "limited") acc[s].limited++;
    else acc[s].full++;
    return acc;
  }, {});

  // Staff by sport
  const staffBySport = staff.reduce((acc, s) => {
    const sports = s.assigned_sports || ["football"];
    sports.forEach(sp => {
      if (!acc[sp]) acc[sp] = [];
      acc[sp].push(s);
    });
    return acc;
  }, {});

  // Upcoming schedule by sport
  const now = new Date();
  const schedBySport = opponents.reduce((acc, o) => {
    const s = o.sport || "football";
    if (!acc[s]) acc[s] = [];
    if (new Date(o.game_date) >= now) acc[s].push(o);
    return acc;
  }, {});

  const allSports = [...new Set([
    ...Object.keys(playersBySport),
    ...Object.keys(staffBySport),
    ...Object.keys(schedBySport),
  ])].sort();

  const tabs = [
    { id: "overview", label: "Overview", icon: Globe },
    { id: "roster", label: "All Rosters", icon: Users },
    { id: "eligibility", label: "Eligibility", icon: GraduationCap },
    { id: "health", label: "Health", icon: Activity },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "staff", label: "All Staff", icon: Shield },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <div className="w-6 h-6 border-2 border-gray-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] min-h-full">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-10 blur-3xl bg-cyan-500" />
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5 blur-3xl bg-blue-500" />
        </div>
        <div className="relative px-4 md:px-8 pt-8 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl blur-lg opacity-30 bg-cyan-500" />
              <img src={NXGEN_LOGO} alt="NxGenSports" className="relative w-14 h-14 rounded-2xl object-cover shadow-2xl" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                NxGen<span className="text-cyan-400">Sports</span>
              </h1>
              <p className="text-gray-400 text-sm font-medium">
                Athletic Director Portal · <span className="text-white font-semibold">{user?.school_name || user?.full_name}</span>
              </p>
              <p className="text-gray-600 text-xs mt-0.5">All-sports command center · {allSports.length} active programs</p>
            </div>
          </div>

          {/* Top-level summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: "Total Athletes", value: players.length, color: "text-cyan-400" },
              { label: "Active Programs", value: allSports.length, color: "text-blue-400" },
              { label: "Coaching Staff", value: staff.length, color: "text-purple-400" },
              { label: "Health Issues", value: healthRecords.filter(h => h.availability !== "full").length, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#141414] border border-gray-800 rounded-xl p-4">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-4 md:px-8">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === id ? "border-cyan-400 text-cyan-400" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg">Programs Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allSports.map(sport => (
                <div key={sport} className="bg-[#141414] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold capitalize">{SPORT_LABELS[sport] || sport}</h3>
                    <span className="text-xs text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                      {playersBySport[sport]?.length || 0} athletes
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Coaching Staff</span>
                      <span className="text-gray-300">{staffBySport[sport]?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Upcoming Games</span>
                      <span className="text-gray-300">{schedBySport[sport]?.length || 0}</span>
                    </div>
                    {healthBySport[sport]?.out > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Players Out</span>
                        <span className="text-red-400">{healthBySport[sport].out}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROSTER */}
        {activeTab === "roster" && (
          <div className="space-y-6">
            {allSports.map(sport => (
              <div key={sport}>
                <h3 className="text-white font-bold capitalize mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  {SPORT_LABELS[sport] || sport} — {playersBySport[sport]?.length || 0} athletes
                </h3>
                <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-gray-500 text-xs px-4 py-3 uppercase tracking-wider">#</th>
                        <th className="text-left text-gray-500 text-xs px-4 py-3 uppercase tracking-wider">Name</th>
                        <th className="text-left text-gray-500 text-xs px-4 py-3 uppercase tracking-wider">Position</th>
                        <th className="text-left text-gray-500 text-xs px-4 py-3 uppercase tracking-wider">Year</th>
                        <th className="text-left text-gray-500 text-xs px-4 py-3 uppercase tracking-wider">Status</th>
                        <th className="text-left text-gray-500 text-xs px-4 py-3 uppercase tracking-wider">Eligible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(playersBySport[sport] || []).slice(0, 10).map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"}>
                          <td className="px-4 py-2.5 text-gray-500">{p.number || "—"}</td>
                          <td className="px-4 py-2.5 text-white font-medium">{p.first_name} {p.last_name}</td>
                          <td className="px-4 py-2.5 text-gray-400">{p.position || "—"}</td>
                          <td className="px-4 py-2.5 text-gray-400">{p.year || "—"}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs ${p.academic_eligible !== false ? "text-green-400" : "text-red-400"}`}>
                              {p.academic_eligible !== false ? "✓" : "✗"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(playersBySport[sport]?.length || 0) > 10 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-2.5 text-center text-gray-600 text-xs">
                            +{(playersBySport[sport]?.length || 0) - 10} more athletes
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ELIGIBILITY */}
        {activeTab === "eligibility" && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg">Academic Eligibility — All Sports</h2>
            {allSports.map(sport => {
              const sportPlayers = playersBySport[sport] || [];
              const eligible = sportPlayers.filter(p => p.academic_eligible !== false).length;
              const ineligible = sportPlayers.filter(p => p.academic_eligible === false).length;
              return (
                <div key={sport} className="bg-[#141414] border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold capitalize">{SPORT_LABELS[sport] || sport}</h3>
                    <div className="flex gap-3 text-sm">
                      <span className="text-green-400">{eligible} eligible</span>
                      {ineligible > 0 && <span className="text-red-400">{ineligible} ineligible</span>}
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: sportPlayers.length ? `${(eligible / sportPlayers.length) * 100}%` : "0%" }} />
                  </div>
                  {ineligible > 0 && (
                    <div className="mt-3 space-y-1">
                      {sportPlayers.filter(p => p.academic_eligible === false).map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                          <span className="text-red-300">{p.first_name} {p.last_name} — {p.position}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* HEALTH */}
        {activeTab === "health" && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg">Health Status — All Sports</h2>
            {allSports.map(sport => {
              const sportHealth = healthRecords.filter(h => {
                const p = players.find(pl => pl.id === h.player_id);
                return p?.sport === sport;
              });
              const issues = sportHealth.filter(h => h.availability !== "full");
              return (
                <div key={sport} className="bg-[#141414] border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold capitalize">{SPORT_LABELS[sport] || sport}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${issues.length === 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {issues.length === 0 ? "All Clear" : `${issues.length} issues`}
                    </span>
                  </div>
                  {issues.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {issues.map(h => (
                        <div key={h.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">{h.player_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${h.availability === "out" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {h.availability}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* SCHEDULE */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg">Upcoming Games — All Sports</h2>
            {allSports.map(sport => {
              const games = schedBySport[sport] || [];
              if (games.length === 0) return null;
              return (
                <div key={sport} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-800">
                    <h3 className="text-white font-bold capitalize">{SPORT_LABELS[sport] || sport}</h3>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {games.slice(0, 5).map(g => (
                      <div key={g.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">vs. {g.name}</p>
                          <p className="text-gray-500 text-xs">{g.game_date} · {g.location}</p>
                        </div>
                        {g.game_result && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${g.game_result === "W" ? "bg-green-500/20 text-green-400" : g.game_result === "L" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
                            {g.game_result}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg">Analytics Summary — All Sports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allSports.map(sport => {
                const sportPlayers = playersBySport[sport] || [];
                const active = sportPlayers.filter(p => p.status === "active").length;
                const avgGpa = sportPlayers.filter(p => p.gpa).reduce((sum, p, _, a) => sum + p.gpa / a.length, 0);
                return (
                  <div key={sport} className="bg-[#141414] border border-gray-800 rounded-xl p-5">
                    <h3 className="text-white font-bold capitalize mb-3">{SPORT_LABELS[sport] || sport}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Active Athletes</span>
                        <span className="text-white">{active} / {sportPlayers.length}</span>
                      </div>
                      {avgGpa > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Avg GPA</span>
                          <span className={`font-semibold ${avgGpa >= 3.0 ? "text-green-400" : avgGpa >= 2.0 ? "text-yellow-400" : "text-red-400"}`}>
                            {avgGpa.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Games Scheduled</span>
                        <span className="text-white">{(schedBySport[sport] || []).length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAFF */}
        {activeTab === "staff" && (
          <div className="space-y-6">
            <h2 className="text-white font-bold text-lg">All Coaching Staff</h2>
            {allSports.map(sport => {
              const sportStaff = staffBySport[sport] || [];
              if (sportStaff.length === 0) return null;
              return (
                <div key={sport}>
                  <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2 capitalize">{SPORT_LABELS[sport] || sport}</h3>
                  <div className="bg-[#141414] border border-gray-800 rounded-xl divide-y divide-gray-800">
                    {sportStaff.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
                            {s.full_name?.[0] || "C"}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{s.full_name}</p>
                            <p className="text-gray-500 text-xs">{s.email}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 capitalize bg-gray-800 px-2 py-1 rounded-lg">
                          {s.coaching_role?.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}