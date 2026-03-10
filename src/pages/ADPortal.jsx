import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import { base44 } from "@/api/base44Client";
import { Globe, Users, Activity, Calendar, Shield, GraduationCap, BarChart2 } from "lucide-react";
import ADStaffTab from "@/components/adportal/ADStaffTab";
import ADPlayersTab from "@/components/adportal/ADPlayersTab";
import ADScheduleTab from "@/components/adportal/ADScheduleTab";
import ADHealthTab from "@/components/adportal/ADHealthTab";

const NXGEN_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/29e077944_generated_image.png";

const SPORT_LABELS = {
  football:"Football", basketball:"Basketball", baseball:"Baseball", softball:"Softball",
  soccer:"Soccer", volleyball:"Volleyball", boxing:"Boxing", golf:"Golf",
  tennis:"Tennis", wrestling:"Wrestling", cross_country:"Cross Country", track:"Track", lacrosse:"Lacrosse"
};

const TABS = [
  { id: "overview",  label: "Overview",  icon: Globe },
  { id: "staff",     label: "Staff",     icon: Shield },
  { id: "players",   label: "Players",   icon: Users },
  { id: "schedule",  label: "Schedule",  icon: Calendar },
  { id: "health",    label: "Health",    icon: Activity },
];

function ADPortalContent() {
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [practicePlans, setPracticePlans] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const loadData = useCallback(async () => {
    const [u, p, docs, h, o, pp, s] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.Player.list(),
      base44.entities.PlayerDocument.list(),
      base44.entities.PlayerHealth.list(),
      base44.entities.Opponent.list(),
      base44.entities.PracticePlan.list(),
      base44.functions.invoke("getTeamUsers").then(r => r.data).catch(() => []),
    ]);
    setUser(u);
    setPlayers(p);
    setDocuments(docs);
    setHealthRecords(h);
    setOpponents(o);
    setPracticePlans(pp);
    setStaff(s || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const allSports = [...new Set(players.map(p => p.sport || "football"))].sort();
  const playersBySport = players.reduce((acc, p) => { const s = p.sport || "football"; if (!acc[s]) acc[s] = []; acc[s].push(p); return acc; }, {});
  const healthIssues = healthRecords.filter(h => h.availability !== "full").length;

  if (loading) return (
    <div className="flex items-center justify-center h-96 bg-[#0a0a0a]">
      <div className="w-6 h-6 border-2 border-gray-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] min-h-full">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-10 blur-3xl bg-cyan-500" />
        </div>
        <div className="relative px-4 md:px-8 pt-6 pb-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl blur-lg opacity-30 bg-cyan-500" />
              <img src={NXGEN_LOGO} alt="NxGenSports" className="relative w-12 h-12 rounded-2xl object-cover shadow-2xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                NxGen<span className="text-cyan-400">Sports</span>
              </h1>
              <p className="text-gray-400 text-sm">
                Athletic Director Portal · <span className="text-white font-semibold">{user?.school_name || user?.full_name}</span>
              </p>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Athletes", value: players.length, color: "text-cyan-400" },
              { label: "Active Programs", value: allSports.length, color: "text-blue-400" },
              { label: "Coaching Staff", value: staff.length, color: "text-purple-400" },
              { label: "Health Issues", value: healthIssues, color: healthIssues > 0 ? "text-red-400" : "text-green-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#141414] border border-gray-800 rounded-xl p-3 md:p-4">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-4 md:px-8 sticky top-0 bg-[#0a0a0a] z-10">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
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
              {allSports.map(sport => {
                const sportPlayers = playersBySport[sport] || [];
                const eligible = sportPlayers.filter(p => p.academic_eligible !== false).length;
                const healthIssues = healthRecords.filter(h => {
                  const p = players.find(pl => pl.id === h.player_id);
                  return p?.sport === sport && h.availability !== "full";
                }).length;
                const upcoming = opponents.filter(o => o.sport === sport && new Date(o.game_date) >= new Date()).length;
                return (
                  <div key={sport} className="bg-[#141414] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all cursor-pointer"
                    onClick={() => setActiveTab("players")}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold">{SPORT_LABELS[sport] || sport}</h3>
                      <span className="text-xs text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                        {sportPlayers.length} athletes
                      </span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Academic Eligible</span>
                        <span className={eligible === sportPlayers.length ? "text-green-400" : "text-yellow-400"}>{eligible}/{sportPlayers.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Upcoming Games</span>
                        <span className="text-gray-300">{upcoming}</span>
                      </div>
                      {healthIssues > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Health Issues</span>
                          <span className="text-red-400">{healthIssues}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <ADStaffTab staff={staff} onRefresh={loadData} />
        )}

        {activeTab === "players" && (
          <ADPlayersTab players={players} documents={documents} onRefresh={loadData} />
        )}

        {activeTab === "schedule" && (
          <ADScheduleTab opponents={opponents} practicePlans={practicePlans} onRefresh={loadData} />
        )}

        {activeTab === "health" && (
          <ADHealthTab healthRecords={healthRecords} players={players} onRefresh={loadData} />
        )}

      </div>
    </div>
  );
}

export default function ADPortal() {
  return (
    <AuthGuard roles={["admin", "athletic_director"]}>
      <ADPortalContent />
    </AuthGuard>
  );
}