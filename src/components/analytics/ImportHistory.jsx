import { useState } from "react";
import { Database, ChevronDown, ChevronRight, Trash2, TrendingUp, AlertTriangle, Lightbulb, BarChart2 } from "lucide-react";
import { format } from "date-fns";

const SOURCE_COLORS = {
  hudl: "#e8401b", odk: "#1b6fe8", maxpreps: "#d4080a",
  catapult: "#00c48c", sportscode: "#7c3aed", csv_upload: "#6b7280", manual: "#4b5563"
};

export default function ImportHistory({ imports, onDelete }) {
  const [expanded, setExpanded] = useState(null);

  if (!imports.length) return (
    <div className="flex flex-col items-center py-16 gap-3">
      <Database className="w-10 h-10 text-gray-800" />
      <p className="text-gray-500 text-sm">No imports yet</p>
      <p className="text-gray-600 text-xs">Import data from Hudl, ODK, Catapult, or CSV</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {imports.map(imp => {
        const analysis = (() => { try { return JSON.parse(imp.ai_analysis || "{}"); } catch { return {}; } })();
        const isExpanded = expanded === imp.id;
        const color = SOURCE_COLORS[imp.source] || "#6b7280";

        return (
          <div key={imp.id} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(isExpanded ? null : imp.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-medium truncate">{imp.title}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0"
                    style={{ color, borderColor: color + "44", backgroundColor: color + "18" }}>
                    {imp.source.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {imp.opponent && <span className="text-gray-600 text-xs">vs {imp.opponent}</span>}
                  {imp.game_date && <span className="text-gray-600 text-xs">{format(new Date(imp.game_date), "MMM d, yyyy")}</span>}
                  {imp.record_count > 0 && <span className="text-gray-500 text-xs">{imp.record_count} records</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); onDelete?.(imp.id); }}
                  className="text-gray-700 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-4">
                {/* KPIs */}
                {analysis.kpis?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BarChart2 className="w-3 h-3" /> Key Performance Indicators
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {analysis.kpis.map((kpi, i) => (
                        <div key={i} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-2.5">
                          <p className="text-gray-400 text-xs truncate">{kpi.label}</p>
                          <p className="text-white font-bold text-sm">{kpi.value}</p>
                          {kpi.trend && <p className="text-gray-600 text-xs mt-0.5">{kpi.trend}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coaching insights */}
                {analysis.coaching_insights?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-3 h-3 text-yellow-500" /> Coaching Insights
                    </p>
                    <ul className="space-y-1.5">
                      {analysis.coaching_insights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                          <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Trends */}
                {analysis.trends?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" /> Notable Trends
                    </p>
                    <ul className="space-y-1.5">
                      {analysis.trends.map((trend, i) => (
                        <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5 flex-shrink-0">→</span>
                          {trend}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Flags */}
                {analysis.flags?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-orange-400" /> Data Flags
                    </p>
                    <ul className="space-y-1">
                      {analysis.flags.map((flag, i) => (
                        <li key={i} className="text-orange-300 text-xs flex items-start gap-2">
                          <span className="flex-shrink-0 mt-0.5">⚠</span>{flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Summary */}
                {analysis.summary && (
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3">
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-1">Summary</p>
                    <p className="text-gray-400 text-xs leading-relaxed">{analysis.summary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}