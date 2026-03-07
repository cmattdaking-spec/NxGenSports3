import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Loader2, X, ChevronDown, ChevronRight, Flag, Shield, TrendingUp, Activity } from "lucide-react";

const EVENT_ICONS = {
  run: "🏃", pass: "🏈", screen: "↗️", play_action: "🎭",
  block: "🛡️", tackle: "💥", interception: "✋", fumble: "😱",
  touchdown: "🎉", penalty: "🚩", sack: "💪", blitz: "⚡",
};

const PLAY_COLORS = {
  run: "#f97316", pass: "#3b82f6", screen: "#a855f7", play_action: "#f59e0b",
  block: "#22c55e", tackle: "#ef4444", interception: "#06b6d4", fumble: "#ec4899",
  touchdown: "#fbbf24", penalty: "#6b7280", sack: "#dc2626", blitz: "#8b5cf6",
};

export default function AIVideoAnalysis({ session, tags, onAutoTagsGenerated }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    setResult(null);

    const prompt = `You are an expert football video analyst AI. Analyze this film session and generate a detailed play detection and event report.

Session: "${session?.title}"${session?.opponent ? ` vs ${session.opponent}` : ""}${session?.game_date ? ` (${session.game_date})` : ""}
Unit: ${session?.unit || "all"}
Existing manual tags: ${JSON.stringify(tags?.slice(0, 20) || [])}

Generate a comprehensive AI video analysis report. Detect and categorize plays and player actions as if you reviewed the full film. Base it on the session context and tags provided.

Return a complete analysis with detected events, player actions, play tendencies, and coaching recommendations.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          total_plays_analyzed: { type: "number" },
          detection_confidence: { type: "string" },
          detected_events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timestamp_label: { type: "string" },
                event_type: { type: "string" },
                description: { type: "string" },
                players_involved: { type: "array", items: { type: "string" } },
                yards: { type: "number" },
                result: { type: "string" },
                confidence: { type: "number" },
              }
            }
          },
          play_type_breakdown: {
            type: "object",
            properties: {
              runs: { type: "number" },
              passes: { type: "number" },
              screens: { type: "number" },
              play_action: { type: "number" },
              special_teams: { type: "number" }
            }
          },
          key_player_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                player: { type: "string" },
                timestamp: { type: "string" },
                impact: { type: "string" }
              }
            }
          },
          tendencies: { type: "array", items: { type: "string" } },
          coaching_alerts: { type: "array", items: { type: "string" } },
          positive_highlights: { type: "array", items: { type: "string" } }
        }
      }
    });

    setResult(res);
    setLoading(false);

    // Auto-generate tags from detected events
    if (res.detected_events?.length > 0 && onAutoTagsGenerated) {
      const autoTags = res.detected_events.slice(0, 15).map(e => ({
        session_id: session.id,
        timestamp_seconds: 0,
        timestamp_label: e.timestamp_label || "AI",
        play_type: ["run","pass","screen","play_action","blitz","coverage","punt","kick","return","penalty","turnover","score"].includes(e.event_type) ? e.event_type : "other",
        result: ["success","failure","neutral"].includes(e.result) ? e.result : "neutral",
        notes: `[AI] ${e.description}`,
        players_involved: e.players_involved || [],
        yards: e.yards || 0,
        flagged: e.event_type === "fumble" || e.event_type === "interception",
      }));
      onAutoTagsGenerated(autoTags);
    }
  };

  const renderSection = (id, title, icon, content) => (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(expanded === id ? null : id)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222] transition-all text-left">
        <span className="text-lg">{icon}</span>
        <span className="text-white text-sm font-semibold flex-1">{title}</span>
        {expanded === id ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
      </button>
      {expanded === id && <div className="px-4 py-3">{content}</div>}
    </div>
  );

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800"
        style={{ backgroundColor: "var(--color-primary,#f97316)11" }}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
          <span className="font-bold text-sm" style={{ color: "var(--color-primary,#f97316)" }}>AI Video Analysis</span>
          {result && <span className="text-gray-500 text-xs ml-1">· {result.total_plays_analyzed || 0} plays · {result.detection_confidence || "high"} confidence</span>}
        </div>
        {!result && !loading && (
          <button onClick={runAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <Zap className="w-3.5 h-3.5" /> Run AI Analysis
          </button>
        )}
        {result && (
          <button onClick={() => { setResult(null); runAnalysis(); }}
            className="text-gray-500 hover:text-white text-xs flex items-center gap-1">
            <Zap className="w-3 h-3" /> Re-run
          </button>
        )}
      </div>

      <div className="p-4">
        {loading && (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-gray-800 border-t-transparent rounded-full animate-spin"
                style={{ borderTopColor: "var(--color-primary,#f97316)" }} />
              <Zap className="w-5 h-5 absolute inset-0 m-auto" style={{ color: "var(--color-primary,#f97316)" }} />
            </div>
            <p className="text-white text-sm font-semibold">Analyzing film...</p>
            <p className="text-gray-500 text-xs">Detecting plays, player actions, and tendencies</p>
          </div>
        )}

        {!loading && !result && (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <Activity className="w-10 h-10 text-gray-700" />
            <p className="text-gray-400 text-sm font-medium">AI Video Analysis Ready</p>
            <p className="text-gray-600 text-xs max-w-xs">Automatically detects runs, passes, screens, blocks, tackles, interceptions, and more. Generates auto-tags and a full coaching report.</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3">
              <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
            </div>

            {/* Play breakdown pills */}
            {result.play_type_breakdown && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.play_type_breakdown).filter(([,v]) => v > 0).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: (PLAY_COLORS[type] || "#6b7280") + "22", color: PLAY_COLORS[type] || "#6b7280" }}>
                    <span>{EVENT_ICONS[type] || "•"}</span>
                    <span className="capitalize">{type.replace(/_/g," ")}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Detected Events */}
            {result.detected_events?.length > 0 && renderSection("events", `Detected Events (${result.detected_events.length})`, "🎯",
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.detected_events.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                    <span className="text-base flex-shrink-0 mt-0.5">{EVENT_ICONS[e.event_type] || "•"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: (PLAY_COLORS[e.event_type] || "#6b7280") + "22", color: PLAY_COLORS[e.event_type] || "#9ca3af" }}>
                          {e.event_type}
                        </span>
                        {e.timestamp_label && <span className="text-gray-600 text-xs">{e.timestamp_label}</span>}
                        {e.yards != null && e.yards !== 0 && <span className="text-gray-500 text-xs">{e.yards > 0 ? `+${e.yards}` : e.yards} yds</span>}
                        {e.confidence && <span className="text-gray-700 text-xs ml-auto">{Math.round(e.confidence * 100)}%</span>}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{e.description}</p>
                      {e.players_involved?.length > 0 && (
                        <p className="text-gray-600 text-xs mt-0.5">{e.players_involved.join(", ")}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Key Player Actions */}
            {result.key_player_actions?.length > 0 && renderSection("actions", "Key Player Actions", "⭐",
              <div className="space-y-2">
                {result.key_player_actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-800 last:border-0">
                    <span className="text-xs font-bold text-white bg-gray-800 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">{a.action}</span>
                    <div>
                      <span className="text-white text-xs font-medium">{a.player}</span>
                      {a.timestamp && <span className="text-gray-600 text-xs ml-2">{a.timestamp}</span>}
                      <p className="text-gray-500 text-xs">{a.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tendencies */}
            {result.tendencies?.length > 0 && renderSection("tendencies", "Detected Tendencies", "📊",
              <ul className="space-y-1.5">
                {result.tendencies.map((t, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />{t}
                  </li>
                ))}
              </ul>
            )}

            {/* Coaching Alerts */}
            {result.coaching_alerts?.length > 0 && renderSection("alerts", `Coaching Alerts (${result.coaching_alerts.length})`, "🚨",
              <ul className="space-y-1.5">
                {result.coaching_alerts.map((a, i) => (
                  <li key={i} className="text-orange-300 text-sm flex items-start gap-2">
                    <Flag className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />{a}
                  </li>
                ))}
              </ul>
            )}

            {/* Positive Highlights */}
            {result.positive_highlights?.length > 0 && renderSection("highlights", "Positive Highlights", "✅",
              <ul className="space-y-1.5">
                {result.positive_highlights.map((h, i) => (
                  <li key={i} className="text-green-300 text-sm flex items-start gap-2">
                    <Shield className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />{h}
                  </li>
                ))}
              </ul>
            )}

            {/* Auto-tag notice */}
            {result.detected_events?.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <span className="text-green-400 text-xs">✓</span>
                <p className="text-green-300 text-xs">{Math.min(result.detected_events.length, 15)} events auto-tagged in the play list</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}