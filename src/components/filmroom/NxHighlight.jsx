import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Star, X, Users, User, Loader2, ChevronDown, ChevronUp, Play } from "lucide-react";

export default function NxHighlight({ session, tags, players, onClose }) {
  const [mode, setMode] = useState("team"); // "team" | "player"
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [loading, setLoading] = useState(false);
  const [highlights, setHighlights] = useState(null);
  const [sharing, setSharing] = useState(false);

  const sessionVideoUrl = session?.video_url || "";

  const buildClipLink = (seconds) => {
    if (!sessionVideoUrl) return "";
    const ts = Math.max(0, Math.floor(seconds || 0));
    if (sessionVideoUrl.includes("youtube.com/watch") || sessionVideoUrl.includes("youtu.be/")) {
      const sep = sessionVideoUrl.includes("?") ? "&" : "?";
      return `${sessionVideoUrl}${sep}t=${ts}s`;
    }
    if (sessionVideoUrl.includes("vimeo.com/")) {
      return `${sessionVideoUrl}#t=${ts}s`;
    }
    return `${sessionVideoUrl}#t=${ts}`;
  };

  const shareText = async (title, text) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return true;
      }
    } catch {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const shareClip = async (clip) => {
    const link = buildClipLink(clip.timestamp_seconds);
    const text = `${clip.description}\n${link || ""}`.trim();
    setSharing(true);
    await shareText("NxHighlight Clip", text);
    setSharing(false);
  };

  const shareAllHighlights = async () => {
    if (!highlights?.highlight_clips?.length) return;
    const headline = `${highlights.player_name || highlights.team_name || "Team"} Highlights`;
    const lines = highlights.highlight_clips.map((clip, idx) => {
      const link = buildClipLink(clip.timestamp_seconds);
      return `${idx + 1}. ${clip.timestamp_label} - ${clip.description}${link ? `\n${link}` : ""}`;
    });
    const text = `${headline}\n\n${lines.join("\n\n")}`;
    setSharing(true);
    await shareText("NxHighlight Reel", text);
    setSharing(false);
  };

  const generate = async () => {
    if (!tags.length) return;
    setLoading(true);
    setHighlights(null);

    const tagSummary = tags.map(t => ({
      time: t.timestamp_label,
      seconds: t.timestamp_seconds,
      play: t.play_type,
      result: t.result,
      yards: t.yards,
      players: t.players_involved,
      formation: t.formation,
      down: t.down,
      distance: t.distance,
      notes: t.notes,
      flagged: t.flagged,
    }));

    const isPlayerMode = mode === "player" && selectedPlayer;
    const playerName = isPlayerMode ? players.find(p => p.id === selectedPlayer || `${p.first_name} ${p.last_name}` === selectedPlayer)?.first_name + " " + players.find(p => p.id === selectedPlayer || `${p.first_name} ${p.last_name}` === selectedPlayer)?.last_name : null;

    const prompt = isPlayerMode
      ? `You are a sports highlight reel creator. From this film session "${session?.title}", identify the TOP highlight plays for player "${playerName}". Look for plays where this player is involved (check players_involved array or notes).

Tagged plays:
${JSON.stringify(tagSummary, null, 2)}

Return a JSON object with:
- player_name: string
- total_highlights: number
- highlight_clips: array of { timestamp_label, timestamp_seconds, play_type, description (exciting 1-sentence highlight call), grade (A/B/C) }
- summary: short exciting paragraph about this player's performance
- key_moments: array of 3 bullet points of standout moments`
      : `You are a sports highlight reel creator. From this film session "${session?.title}", identify the TOP team highlights.

Tagged plays:
${JSON.stringify(tagSummary, null, 2)}

Return a JSON object with:
- team_name: "Team"
- total_highlights: number
- highlight_clips: array of { timestamp_label, timestamp_seconds, play_type, description (exciting 1-sentence highlight call), grade (A/B/C) }
- summary: short exciting paragraph about team performance
- key_moments: array of 3 bullet points of standout moments
- mvp_plays: top 2 plays by description`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          player_name: { type: "string" },
          team_name: { type: "string" },
          total_highlights: { type: "number" },
          highlight_clips: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timestamp_label: { type: "string" },
                timestamp_seconds: { type: "number" },
                play_type: { type: "string" },
                description: { type: "string" },
                grade: { type: "string" },
              }
            }
          },
          summary: { type: "string" },
          key_moments: { type: "array", items: { type: "string" } },
          mvp_plays: { type: "array", items: { type: "string" } },
        }
      }
    });

    setHighlights(result);
    setLoading(false);
  };

  const gradeColor = (grade) => {
    if (grade === "A") return "text-green-400 bg-green-400/10";
    if (grade === "B") return "bg-blue-400/10 text-blue-400";
    return "bg-gray-700 text-gray-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="bg-[#141414] border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-[#141414] z-10">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-bold text-lg">Nx<span style={{ color: "var(--color-primary,#f97316)" }}>Highlight</span></span>
            {session?.title && <span className="text-gray-500 text-sm hidden sm:inline">— {session.title}</span>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <button onClick={() => setMode("team")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "team" ? "text-white" : "bg-gray-800 text-gray-400"}`}
              style={mode === "team" ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
              <Users className="w-4 h-4" /> Team Highlights
            </button>
            <button onClick={() => setMode("player")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "player" ? "text-white" : "bg-gray-800 text-gray-400"}`}
              style={mode === "player" ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
              <User className="w-4 h-4" /> Player Highlights
            </button>
          </div>

          {/* Player selector */}
          {mode === "player" && (
            <div>
              {players.length > 0 ? (
                <select
                  value={selectedPlayer}
                  onChange={e => setSelectedPlayer(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm">
                  <option value="">Select a player...</option>
                  {players.map(p => (
                    <option key={p.id} value={`${p.first_name} ${p.last_name}`}>
                      #{p.number || "—"} {p.first_name} {p.last_name} ({p.position || "—"})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={selectedPlayer}
                  onChange={e => setSelectedPlayer(e.target.value)}
                  placeholder="Enter player name..."
                  className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm"
                />
              )}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={loading || !tags.length || (mode === "player" && !selectedPlayer)}
            className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            {loading ? "Generating Highlights..." : `Generate ${mode === "team" ? "Team" : "Player"} Highlights`}
          </button>

          {!tags.length && (
            <p className="text-yellow-500 text-xs text-center">Tag plays in this session first to generate highlights.</p>
          )}

          {/* Results */}
          {highlights && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-semibold text-sm">
                    {highlights.player_name || highlights.team_name || "Highlights"}
                  </span>
                  <span className="text-xs bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full">
                    {highlights.total_highlights} highlights
                  </span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{highlights.summary}</p>
              </div>

              {/* Key Moments */}
              {highlights.key_moments?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Key Moments</p>
                  <ul className="space-y-1">
                    {highlights.key_moments.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span style={{ color: "var(--color-primary,#f97316)" }} className="flex-shrink-0 font-bold">{i + 1}.</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Highlight Clips */}
              {highlights.highlight_clips?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                      Highlight Clips ({highlights.highlight_clips.length})
                    </p>
                    <button
                      onClick={shareAllHighlights}
                      disabled={sharing}
                      className="text-xs px-2.5 py-1 rounded-lg border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 disabled:opacity-50">
                      {sharing ? "Sharing..." : "Share Reel"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {highlights.highlight_clips.map((clip, i) => (
                      <div key={i} className="bg-[#1e1e1e] rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-800">
                        <div className="flex-shrink-0 w-14 text-center">
                          <div className="text-white font-bold text-xs font-mono">{clip.timestamp_label}</div>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block ${gradeColor(clip.grade)}`}>
                            {clip.grade}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded capitalize mr-1">{clip.play_type}</span>
                          <p className="text-gray-200 text-sm mt-1">{clip.description}</p>
                          {sessionVideoUrl && (
                            <button
                              onClick={() => shareClip(clip)}
                              disabled={sharing}
                              className="mt-2 text-xs px-2 py-1 rounded border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 disabled:opacity-50">
                              {sharing ? "Sharing..." : "Share Clip"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MVP plays (team mode) */}
              {highlights.mvp_plays?.length > 0 && (
                <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4">
                  <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2">⭐ Must-Watch Plays</p>
                  {highlights.mvp_plays.map((p, i) => (
                    <p key={i} className="text-gray-300 text-sm mb-1">• {p}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}