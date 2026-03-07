import { useState, useEffect } from "react";
import { X, Brain, Swords, Shield, Target, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { SpinnerLoader } from "@/components/SkeletonLoader";

const threatColor = { Low: "text-green-400 bg-green-500/20", Medium: "text-yellow-400 bg-yellow-500/20", High: "text-orange-400 bg-orange-500/20", "Very High": "text-red-400 bg-red-500/20" };

export default function DeepAnalysisModal({ opponent, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!opponent) return;
    loadAnalysis();
  }, [opponent?.id]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an elite football analytics AI. Provide a comprehensive strategic breakdown for facing ${opponent.name}. Record: ${opponent.record || "Unknown"}, Game: ${opponent.game_date} (${opponent.location}), Offensive Tendency: ${opponent.offensive_tendency || "Not provided"}, Defensive Tendency: ${opponent.defensive_tendency || "Not provided"}, Key Players: ${opponent.key_players || "Not provided"}.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            offensive_breakdown: { type: "string" },
            defensive_breakdown: { type: "string" },
            key_player_matchups: { type: "array", items: { type: "object", properties: { their_player: { type: "string" }, matchup_note: { type: "string" }, recommendation: { type: "string" } } } },
            exploitable_weaknesses: { type: "array", items: { type: "string" } },
            game_plan_adjustments: { type: "array", items: { type: "object", properties: { area: { type: "string" }, adjustment: { type: "string" }, rationale: { type: "string" } } } },
            threat_level: { type: "string", enum: ["Low", "Medium", "High", "Very High"] },
            win_probability_factors: { type: "array", items: { type: "string" } },
            special_teams_notes: { type: "string" }
          }
        }
      });
      setReport(res);
    } catch (err) {
      console.error("Deep analysis error:", err);
      setError("Failed to generate analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!opponent) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-teal-500/30 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-[#141414]">
          <div className="flex items-center gap-2"><Brain className="w-5 h-5 text-teal-400" /><h2 className="text-white font-bold">Nx Deep Analysis</h2></div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          {loading && <SpinnerLoader />}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={loadAnalysis} className="mt-3 px-4 py-2 rounded-lg text-white text-sm" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                Retry
              </button>
            </div>
          )}
          {report && (
            <div className="space-y-5">
              {report.threat_level && <div className="flex items-center gap-3"><span className="text-gray-500 text-sm">Threat Level:</span><span className={`text-sm font-bold px-3 py-0.5 rounded-full ${threatColor[report.threat_level]}`}>{report.threat_level}</span></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.offensive_breakdown && <div className="bg-[#1a1a1a] rounded-xl p-4 border border-orange-500/20"><div className="flex items-center gap-2 mb-2"><Swords className="w-4 h-4 text-orange-400" /><span className="text-orange-400 text-xs font-semibold uppercase">Offensive Breakdown</span></div><p className="text-gray-300 text-sm leading-relaxed">{report.offensive_breakdown}</p></div>}
                {report.defensive_breakdown && <div className="bg-[#1a1a1a] rounded-xl p-4 border border-blue-500/20"><div className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-blue-400" /><span className="text-blue-400 text-xs font-semibold uppercase">Defensive Breakdown</span></div><p className="text-gray-300 text-sm leading-relaxed">{report.defensive_breakdown}</p></div>}
              </div>
              {report.exploitable_weaknesses?.length > 0 && <div><div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-green-400" /><span className="text-green-400 text-xs font-semibold uppercase">Exploitable Weaknesses</span></div><ul className="space-y-1.5">{report.exploitable_weaknesses.map((w, i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-300"><span className="text-green-500 mt-0.5">▸</span>{w}</li>)}</ul></div>}
              {report.game_plan_adjustments?.length > 0 && <div><div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-orange-400" /><span className="text-orange-400 text-xs font-semibold uppercase">Game Plan Adjustments</span></div><div className="space-y-2">{report.game_plan_adjustments.map((adj, i) => <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-orange-500/10"><p className="text-orange-300 text-xs font-semibold uppercase mb-0.5">{adj.area}</p><p className="text-white text-sm font-medium">{adj.adjustment}</p><p className="text-gray-500 text-xs mt-0.5">{adj.rationale}</p></div>)}</div></div>}
              {report.special_teams_notes && <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-700"><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Special Teams Notes</p><p className="text-gray-300 text-sm">{report.special_teams_notes}</p></div>}
              {report.win_probability_factors?.length > 0 && <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4"><p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Win Probability Factors</p><ul className="space-y-1">{report.win_probability_factors.map((f, i) => <li key={i} className="text-gray-300 text-sm flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span>{f}</li>)}</ul></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}