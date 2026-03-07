import { useState } from "react";
import { X, Brain } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { SpinnerLoader } from "@/components/SkeletonLoader";

const threatColor = { Low: "bg-green-500/20 text-green-400 border-green-500/30", Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", High: "bg-orange-500/20 text-orange-400 border-orange-500/30", Elite: "bg-red-500/20 text-red-400 border-red-500/30" };

export default function ScoutPreviewModal({ opponent, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an elite football scout for NxDown. Generate a quick scouting preview for an upcoming opponent.\n\nOpponent: ${opponent.name}\nDate: ${opponent.game_date}\nLocation: ${opponent.location}\nRecord: ${opponent.record || "Unknown"}\nConference: ${opponent.conference || "Unknown"}\nOffensive Tendency: ${opponent.offensive_tendency || "Unknown"}\nDefensive Tendency: ${opponent.defensive_tendency || "Unknown"}\nKey Players: ${opponent.key_players || "Unknown"}\nKnown Strengths: ${opponent.strengths || "Unknown"}\nKnown Weaknesses: ${opponent.weaknesses || "Unknown"}\n\nProvide a concise game-week scouting preview including threat assessment, keys to winning, and immediate prep priorities.`,
        response_json_schema: {
          type: "object",
          properties: {
            threat_level: { type: "string", enum: ["Low","Medium","High","Elite"] },
            summary: { type: "string" },
            offensive_keys: { type: "array", items: { type: "string" } },
            defensive_keys: { type: "array", items: { type: "string" } },
            matchups_to_watch: { type: "array", items: { type: "string" } },
            immediate_prep_priorities: { type: "array", items: { type: "string" } },
            win_probability_factors: { type: "array", items: { type: "string" } }
          }
        }
      });
      setReport(res);
    } catch (err) {
      console.error("Scout preview error:", err);
      setError("Failed to generate scout preview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!opponent) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-teal-500/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-[#141414]">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-teal-400" />
            <h2 className="text-white font-bold">Scout Preview: {opponent.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {!report && !error && !loading && (
            <div className="text-center py-8">
              <button onClick={loadReport} className="px-6 py-2.5 rounded-lg text-white font-medium transition-all" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                Generate Scout Preview
              </button>
            </div>
          )}

          {loading && <SpinnerLoader />}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={loadReport} className="mt-3 px-4 py-2 rounded-lg text-white text-sm" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                Retry
              </button>
            </div>
          )}

          {report && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">Threat Level:</span>
                <span className={`text-sm font-bold px-3 py-0.5 rounded-full border ${threatColor[report.threat_level]}`}>
                  {report.threat_level}
                </span>
              </div>
              {report.summary && <p className="text-gray-300 text-sm leading-relaxed">{report.summary}</p>}
              {report.immediate_prep_priorities?.length > 0 && (
                <div className="bg-[#1a1a1a] rounded-xl p-4 border" style={{ borderColor: "var(--color-primary,#f97316)30" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-primary,#f97316)" }}>Immediate Prep Priorities</p>
                  <ul className="space-y-1.5">
                    {report.immediate_prep_priorities.map((p, i) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                        <span style={{ color: "var(--color-primary,#f97316)" }} className="mt-0.5">▸</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.offensive_keys?.length > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-orange-500/20">
                    <p className="text-orange-400 text-xs font-semibold uppercase mb-2">Offensive Keys</p>
                    <ul className="space-y-1">{report.offensive_keys.map((k, i) => <li key={i} className="text-gray-300 text-xs">· {k}</li>)}</ul>
                  </div>
                )}
                {report.defensive_keys?.length > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-blue-500/20">
                    <p className="text-blue-400 text-xs font-semibold uppercase mb-2">Defensive Keys</p>
                    <ul className="space-y-1">{report.defensive_keys.map((k, i) => <li key={i} className="text-gray-300 text-xs">· {k}</li>)}</ul>
                  </div>
                )}
              </div>
              {report.win_probability_factors?.length > 0 && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Win Probability Factors</p>
                  <ul className="space-y-1">{report.win_probability_factors.map((f, i) => <li key={i} className="text-gray-300 text-sm flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span>{f}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}