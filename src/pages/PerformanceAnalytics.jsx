import { useState, useEffect } from "react";
import { useSport } from "@/components/SportContext";
import { base44 } from "@/api/base44Client";
import { BarChart2, Upload, Database, Activity, Plus, RefreshCw, Film, TrendingUp } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import DataImportPanel from "../components/analytics/DataImportPanel";
import ImportHistory from "../components/analytics/ImportHistory";
import PerformanceMetricsPanel from "../components/analytics/PerformanceMetricsPanel";
import AddMetricForm from "../components/analytics/AddMetricForm";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart2 },
  { id: "import", label: "Import Data", icon: Upload },
  { id: "metrics", label: "Player Metrics", icon: Activity },
  { id: "history", label: "Import History", icon: Database },
];

export default function PerformanceAnalytics() {
  const { activeSport } = useSport();
  const [tab, setTab] = useState("dashboard");
  const [imports, setImports] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [players, setPlayers] = useState([]);
  const [filmSessions, setFilmSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [lastImportAnalysis, setLastImportAnalysis] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.PerformanceImport.list("-created_date"),
      base44.entities.PerformanceMetric.filter({ sport: activeSport }, "-game_date", 100),
      base44.entities.Player.filter({ sport: activeSport }, "-created_date", 100),
      base44.entities.FilmSession.filter({ sport: activeSport }, "-created_date", 20),
    ]).then(([imp, met, pls, films]) => {
      setImports(imp);
      setMetrics(met);
      setPlayers(pls);
      setFilmSessions(films);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeSport]);

  const handleImported = (record, analysis) => {
    setImports(prev => [record, ...prev]);
    setLastImportAnalysis({ record, analysis });
    setTab("history");
  };

  const handleDeleteImport = async (id) => {
    await base44.entities.PerformanceImport.delete(id);
    setImports(prev => prev.filter(i => i.id !== id));
  };

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
  const topSpeedRecord = metrics.filter(m => m.top_speed_mph).sort((a, b) => b.top_speed_mph - a.top_speed_mph)[0];
  const recentImport = imports[0];

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
              <p className="text-gray-500 text-xs">Hudl · ODK · Catapult · GPS · Film Data</p>
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
                { label: "Total Imports", value: imports.length, icon: Database, color: "#3b82f6", sub: recentImport ? `Last: ${recentImport.source.toUpperCase()}` : "No imports yet" },
                { label: "Metrics Logged", value: metrics.length, icon: Activity, color: "var(--color-primary,#f97316)", sub: `${[...new Set(metrics.map(m => m.player_name))].length} players tracked` },
                { label: "Avg Play Grade", value: avgPlayGrade != null ? avgPlayGrade : "—", icon: BarChart2, color: avgPlayGrade >= 75 ? "#22c55e" : avgPlayGrade >= 55 ? "#f59e0b" : "#ef4444", sub: "Team film grade" },
                { label: "Top Speed", value: topSpeedRecord ? `${topSpeedRecord.top_speed_mph} mph` : "—", icon: TrendingUp, color: "#22c55e", sub: topSpeedRecord ? topSpeedRecord.player_name : "No GPS data yet" },
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

            {/* Integration guide */}
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
              <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <Film className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
                Supported Integrations
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: "Hudl Assist", color: "#e8401b", how: "Export → Athlete Data → Download CSV", supports: ["Game film tags", "Athlete grades", "Play-by-play data", "Team tendencies"] },
                  { name: "ODK / XPS", color: "#1b6fe8", how: "Reports → Export → CSV/Excel format", supports: ["Play-by-play breakdowns", "Formation data", "Down & distance stats", "Tendency reports"] },
                  { name: "MaxPreps", color: "#d4080a", how: "Stats page → Export → Download CSV", supports: ["Season stats", "Game-by-game data", "Player leaderboards"] },
                  { name: "Catapult GPS", color: "#00c48c", how: "Cloud Portal → Export → CSV/Excel", supports: ["GPS tracking", "Load metrics", "Speed & distance", "Sprint counts"] },
                  { name: "Sportscode", color: "#7c3aed", how: "Export Capture → CSV or XML format", supports: ["Video tags", "Code windows", "Statistical breakdowns"] },
                  { name: "Generic CSV", color: "#6b7280", how: "Any spreadsheet exported as .csv", supports: ["Custom data", "Manual entries", "Any format with headers"] },
                ].map(src => (
                  <div key={src.name} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: src.color }} />
                      <p className="text-white text-sm font-semibold">{src.name}</p>
                    </div>
                    <p className="text-gray-600 text-xs mb-2 leading-relaxed"><span className="text-gray-500 font-medium">How to export:</span> {src.how}</p>
                    <ul className="space-y-0.5">
                      {src.supports.map((s, i) => (
                        <li key={i} className="text-gray-500 text-xs flex items-center gap-1.5">
                          <span style={{ color: src.color }}>✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent imports & metrics */}
            {imports.length > 0 && (
              <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
                <h3 className="text-white font-semibold text-sm mb-3">Recent Imports</h3>
                <div className="space-y-2">
                  {imports.slice(0, 5).map(imp => (
                    <div key={imp.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: imp.source === "hudl" ? "#e8401b" : imp.source === "odk" ? "#1b6fe8" : imp.source === "catapult" ? "#00c48c" : "#6b7280" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{imp.title}</p>
                        <p className="text-gray-500 text-xs">{imp.source.toUpperCase()} · {imp.import_type.replace(/_/g," ")} {imp.opponent ? `· vs ${imp.opponent}` : ""}</p>
                      </div>
                      <span className="text-gray-600 text-xs flex-shrink-0">{imp.record_count || 0} records</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* IMPORT TAB */}
        {tab === "import" && (
          <div className="max-w-2xl">
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
              <h2 className="text-white font-bold text-sm mb-1">Import External Data</h2>
              <p className="text-gray-500 text-xs mb-5">Upload exports from Hudl, ODK, Catapult, or any CSV — AI will parse and analyze the data automatically.</p>
              <DataImportPanel onImported={handleImported} />
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

        {/* HISTORY TAB */}
        {tab === "history" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-sm">{imports.length} Import{imports.length !== 1 ? "s" : ""}</h2>
              <button onClick={() => setTab("import")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white font-medium"
                style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                <Upload className="w-3.5 h-3.5" /> New Import
              </button>
            </div>
            <ImportHistory imports={imports} onDelete={handleDeleteImport} />
          </div>
        )}
      </div>
    </div>
  );
}