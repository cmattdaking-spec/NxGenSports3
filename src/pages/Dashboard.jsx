import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  Users, BookOpen, Target, Activity, TrendingUp,
  ClipboardList, Crosshair, Zap, AlertTriangle,
  ArrowRight, Shield
} from "lucide-react";

export default function Dashboard() {
  const [players, setPlayers] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [plays, setPlays] = useState([]);
  const [gamePlans, setGamePlans] = useState([]);
  const [practices, setPractices] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Player.list(),
      base44.entities.PlayerHealth.list(),
      base44.entities.Play.list(),
      base44.entities.GamePlan.list(),
      base44.entities.PracticePlan.list(),
      base44.entities.Opponent.list()
    ]).then(([p, h, pl, gp, pr, op]) => {
      setPlayers(p);
      setHealthRecords(h);
      setPlays(pl);
      setGamePlans(gp);
      setPractices(pr);
      setOpponents(op);
      setLoading(false);
    });
  }, []);

  const injured = players.filter(p => p.status === "injured");
  const limited = healthRecords.filter(h => h.availability === "limited" || h.availability === "out");
  const nextGame = opponents.find(o => new Date(o.game_date) >= new Date());
  const upcomingPractice = practices.find(p => p.status !== "completed" && new Date(p.date) >= new Date());

  const stats = [
    { label: "Players", value: players.length, icon: Users, page: "Roster", color: "from-blue-600 to-blue-700" },
    { label: "Total Plays", value: plays.length, icon: BookOpen, page: "Playbook", color: "from-orange-500 to-orange-600" },
    { label: "Game Plans", value: gamePlans.length, icon: Target, page: "GamePlan", color: "from-purple-600 to-purple-700" },
    { label: "Health Issues", value: injured.length + limited.length, icon: Activity, page: "PlayerHealth", color: "from-red-600 to-red-700" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            Command <span className="text-orange-500">Center</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Your team at a glance</p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
          <Zap className="w-4 h-4 text-orange-500" />
          <span className="text-orange-400 text-sm font-medium">AI Ready</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, page, color }) => (
          <Link key={label} to={createPageUrl(page)}
            className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-orange-500/40 transition-all group">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Game */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" /> Next Game
            </h2>
            <Link to={createPageUrl("Scouting")} className="text-orange-500 text-xs hover:text-orange-400 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {nextGame ? (
            <div>
              <p className="text-2xl font-black text-white">{nextGame.name}</p>
              <p className="text-orange-500 text-sm mt-1">{nextGame.game_date} · {nextGame.location}</p>
              {nextGame.offensive_tendency && (
                <p className="text-gray-400 text-xs mt-2 line-clamp-2">{nextGame.offensive_tendency}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No upcoming games scheduled</p>
          )}
        </div>

        {/* Health Alerts */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Health Alerts
            </h2>
            <Link to={createPageUrl("PlayerHealth")} className="text-orange-500 text-xs hover:text-orange-400 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {injured.length === 0 && limited.length === 0 ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <p className="text-gray-400 text-sm">All players healthy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {injured.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-white text-sm">{p.first_name} {p.last_name}</span>
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{p.position} · Injured</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Add Play", page: "Playbook", icon: BookOpen },
              { label: "Edit Depth Chart", page: "DepthChart", icon: TrendingUp },
              { label: "New Practice", page: "Practice", icon: ClipboardList },
              { label: "Scout Opponent", page: "Scouting", icon: Crosshair },
            ].map(({ label, page, icon: Icon }) => (
              <Link key={label} to={createPageUrl(page)}
                className="flex items-center gap-2 p-3 bg-[#1a1a1a] rounded-lg hover:bg-orange-500/10 hover:border-orange-500/30 border border-transparent transition-all">
                <Icon className="w-4 h-4 text-orange-500" />
                <span className="text-gray-300 text-xs font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Practice */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-orange-500" /> Next Practice
            </h2>
            <Link to={createPageUrl("Practice")} className="text-orange-500 text-xs hover:text-orange-400 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingPractice ? (
            <div>
              <p className="text-xl font-black text-white">{upcomingPractice.title}</p>
              <p className="text-orange-500 text-sm mt-1">{upcomingPractice.date}</p>
              {upcomingPractice.focus && <p className="text-gray-400 text-xs mt-2">{upcomingPractice.focus}</p>}
              {upcomingPractice.duration_minutes && (
                <p className="text-gray-500 text-xs mt-1">{upcomingPractice.duration_minutes} min</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No upcoming practices</p>
          )}
        </div>
      </div>
    </div>
  );
}