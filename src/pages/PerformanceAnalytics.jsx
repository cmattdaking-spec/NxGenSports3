import { useState, useEffect } from "react";
import { useSport } from "@/components/SportContext";
import { base44 } from "@/api/base44Client";
import { BarChart2, Activity, Plus, TrendingUp, Clock, Users } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import PerformanceMetricsPanel from "../components/analytics/PerformanceMetricsPanel";
import AddMetricForm from "../components/analytics/AddMetricForm";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart2 },
  { id: "metrics", label: "Player Metrics", icon: Activity },
];

const PLAYER_USAGE_ENTITY_CANDIDATES = [
  "PlayerAreaUsage",
  "PlayerUsageTime",
  "PlayerEngagement",
  "PlayerTimeLog",
];

const AREA_ORDER = [
  { key: "nxlab_film", label: "NxLab-Film" },
  { key: "game_plan", label: "Game Plan" },
  { key: "practice_plan", label: "Practice Plan" },
  { key: "playbook", label: "Playbook" },
  { key: "my_sc", label: "My S&C" },
  { key: "recruiting", label: "Recruiting" },
  { key: "analytics", label: "Analytics" },
];

const PAGE_TO_AREA = {
  NxLab: "nxlab_film",
  GamePlan: "game_plan",
  Practice: "practice_plan",
  Playbook: "playbook",
  StrengthConditioning: "my_sc",
  Recruiting: "recruiting",
  PerformanceAnalytics: "analytics",
};

const getUsageDurationSeconds = (record) => {
  if (Number.isFinite(record?.duration_seconds)) return record.duration_seconds;
  if (Number.isFinite(record?.duration_secs)) return record.duration_secs;
  if (Number.isFinite(record?.seconds_spent)) return record.seconds_spent;
  if (Number.isFinite(record?.duration_minutes)) return record.duration_minutes * 60;
  if (Number.isFinite(record?.minutes_spent)) return record.minutes_spent * 60;
  return 0;
};

const normalizeAreaKey = (record) => {
  if (record?.area_key) return record.area_key;
  if (record?.area) return record.area;
  if (record?.module) return record.module;
  if (record?.page && PAGE_TO_AREA[record.page]) return PAGE_TO_AREA[record.page];
  return null;
};

export default function PerformanceAnalytics() {
  const { activeSport } = useSport();
  const [tab, setTab] = useState("dashboard");
  const [metrics, setMetrics] = useState([]);
  const [players, setPlayers] = useState([]);
  const [usageRecords, setUsageRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMetric, setShowAddMetric] = useState(false);

  useEffect(() => {
    const loadUsageRecords = async () => {
      for (const entityName of PLAYER_USAGE_ENTITY_CANDIDATES) {
        try {
          const entity = base44.entities?.[entityName];
          if (!entity || typeof entity.list !== "function") continue;
          const rows = await entity.list("-created_date", 1000);
          return rows || [];
        } catch {
          // Try next candidate.
        }
      }
      return [];
    };

    Promise.all([
      base44.entities.PerformanceMetric.filter({ sport: activeSport }, "-game_date", 100),
      base44.entities.Player.filter({ sport: activeSport }, "-created_date", 200),
      loadUsageRecords(),
    ]).then(([met, pls, usage]) => {
      setMetrics(met);
      setPlayers(pls);
      setUsageRecords(usage);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeSport]);

  const handleMetricSaved = async () => {
    const updated = await base44.entities.PerformanceMetric.list("-game_date", 100);
    setMetrics(updated);
    setShowAddMetric(false);
  };

  if (loading) return <LoadingScreen />;

  // Dashboard summary stats
  const avgPlayGrade = metrics.filter(m => m.play_grade).length
    ? Math.round(metrics.filter(m => m.play_grade).reduce((s, m) => s + m.play_grade, 0) / metrics.filter(m => m.play_grade).length)
    : null;

  const areaTotals = AREA_ORDER.map((area) => {
    const totalSeconds = usageRecords.reduce((sum, record) => {
      const areaKey = normalizeAreaKey(record);
      if (areaKey !== area.key) return sum;
      return sum + getUsageDurationSeconds(record);
    }, 0);
    return {
      ...area,
      totalSeconds,
      totalMinutes: Math.round(totalSeconds / 60),
      totalHours: (totalSeconds / 3600).toFixed(1),
    };
  });

  const totalTrackedSeconds = areaTotals.reduce((sum, area) => sum + area.totalSeconds, 0);

  const playerAreaRows = {};
  for (const record of usageRecords) {
    const areaKey = normalizeAreaKey(record);
    if (!areaKey) continue;
    const duration = getUsageDurationSeconds(record);
    if (!duration) continue;

    const playerName =
      record.player_name ||
      record.user_name ||
      [record.first_name, record.last_name].filter(Boolean).join(" ") ||
      "Unknown Player";

    if (!playerAreaRows[playerName]) {
      playerAreaRows[playerName] = {
        playerName,
        totals: {},
      };
    }

    playerAreaRows[playerName].totals[areaKey] = (playerAreaRows[playerName].totals[areaKey] || 0) + duration;
  }

  const playerUsageRows = Object.values(playerAreaRows)
    .map((row) => {
      const totalSeconds = Object.values(row.totals).reduce((sum, secs) => sum + secs, 0);
      return {
        ...row,
        totalSeconds,
      };
    })
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 20);

  return (
    <div className="bg-[#0a0a0a] min-h-full">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#111111] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "var(--color-primary,#f97316)22" }}>
              <TrendingUp className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
            </div>
            <div>
              <h1 className="text-white font-black text-xl capitalize">{activeSport.replace(/_/g," ")} <span style={{ color: "var(--color-primary,#f97316)" }}>Analytics</span></h1>
              <p className="text-gray-500 text-xs">Coach dashboard for player metrics and player area engagement</p>
            </div>
          </div>
          {tab === "metrics" && (
            <button onClick={() => setShowAddMetric(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white font-medium"
              style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              <Plus className="w-4 h-4" /> Log Metric
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? "text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
              style={tab === t.id ? { backgroundColor: "var(--color-primary,#f97316)", color: "#fff" } : {}}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Metrics Logged", value: metrics.length, icon: Activity, color: "var(--color-primary,#f97316)", sub: `${[...new Set(metrics.map(m => m.player_name))].length} players tracked` },
                { label: "Roster Players", value: players.length, icon: Users, color: "#3b82f6", sub: "Players available in analytics" },
                { label: "Avg Play Grade", value: avgPlayGrade != null ? avgPlayGrade : "—", icon: BarChart2, color: avgPlayGrade >= 75 ? "#22c55e" : avgPlayGrade >= 55 ? "#f59e0b" : "#ef4444", sub: "Team film grade" },
                {
                  label: "Tracked Usage",
                  value: totalTrackedSeconds ? `${(totalTrackedSeconds / 3600).toFixed(1)}h` : "—",
                  icon: Clock,
                  color: "#22c55e",
                  sub: totalTrackedSeconds ? `${Math.round(totalTrackedSeconds / 60)} total minutes` : "No player usage yet",
                },
              ].map((card, i) => (
                <div key={i} className="bg-[#141414] border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-gray-500 text-xs">{card.label}</p>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.color + "22" }}>
                      <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                    </div>
                  </div>
                  <p className="text-white text-2xl font-black">{card.value}</p>
                  <p className="text-gray-600 text-xs mt-1">{card.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
              <h2 className="text-white font-bold text-sm mb-4">Player Area Engagement (Coaches)</h2>
              <p className="text-gray-500 text-xs mb-4">
                Time tracked for player activity in NxLab-film, Game Plan, Practice Plan, Playbook, My S&amp;C, Recruiting, and Analytics.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {areaTotals.map((area) => (
                  <div key={area.key} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">{area.label}</p>
                    <p className="text-white text-lg font-black mt-1">{area.totalMinutes}m</p>
                    <p className="text-gray-600 text-xs">{area.totalHours}h total</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left py-2 pr-2">Player</th>
                      {AREA_ORDER.map((area) => (
                        <th key={area.key} className="text-right py-2 px-2 whitespace-nowrap">{area.label}</th>
                      ))}
                      <th className="text-right py-2 pl-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerUsageRows.length === 0 && (
                      <tr>
                        <td colSpan={AREA_ORDER.length + 2} className="py-4 text-center text-gray-500">
                          No player area usage tracked yet.
                        </td>
                      </tr>
                    )}

                    {playerUsageRows.map((row) => (
                      <tr key={row.playerName} className="border-b border-gray-900 last:border-0">
                        <td className="py-2 pr-2 text-white whitespace-nowrap">{row.playerName}</td>
                        {AREA_ORDER.map((area) => {
                          const mins = Math.round((row.totals[area.key] || 0) / 60);
                          return (
                            <td key={area.key} className="py-2 px-2 text-right text-gray-300">{mins ? `${mins}m` : "-"}</td>
                          );
                        })}
                        <td className="py-2 pl-2 text-right text-white font-semibold">{Math.round(row.totalSeconds / 60)}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* METRICS TAB */}
        {tab === "metrics" && (
          <div className="space-y-4">
            {showAddMetric && (
              <AddMetricForm players={players} onSaved={handleMetricSaved} onClose={() => setShowAddMetric(false)} />
            )}
            <PerformanceMetricsPanel metrics={metrics} players={players} />
          </div>
        )}
      </div>
    </div>
  );
}