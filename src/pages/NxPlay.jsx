import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSport } from "@/components/SportContext";
import LiveGameTracker from "@/components/schedule/LiveGameTracker";
import LoadingScreen from "@/components/LoadingScreen";
import { Activity, Clock3, Gamepad2, Radio, Send, Trophy } from "lucide-react";

const UPDATE_TYPES = [
  { value: "parent_update", label: "Parent Update" },
  { value: "highlight", label: "Highlight" },
  { value: "injury", label: "Injury Alert" },
  { value: "general", label: "General" },
];

const COACH_ROLES = [
  "admin",
  "head_coach",
  "associate_head_coach",
  "offensive_coordinator",
  "defensive_coordinator",
  "special_teams_coordinator",
  "strength_conditioning_coordinator",
  "position_coach",
  "athletic_director",
  "trainer",
];

function formatClock(value) {
  if (!value) return "Now";
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) return "Now";
  return ts.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function NxPlay() {
  const { activeSport } = useSport();
  const [user, setUser] = useState(null);
  const [opponents, setOpponents] = useState([]);
  const [parentLinkedPlayerIds, setParentLinkedPlayerIds] = useState([]);
  const [parentTeamIds, setParentTeamIds] = useState([]);
  const [selectedOpponentId, setSelectedOpponentId] = useState("");
  const [gameRecord, setGameRecord] = useState(null);
  const [gameLoadError, setGameLoadError] = useState("");
  const [liveTracker, setLiveTracker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [updateForm, setUpdateForm] = useState({ type: "parent_update", content: "" });

  const role = user?.coaching_role || user?.role || "viewer";
  const isParent = user?.user_type === "parent" || user?.parent_role;
  const isCoach = COACH_ROLES.includes(role) || user?.role === "admin";

  const getLinkedPlayerIds = (u) => {
    return [
      u?.linked_player_id,
      ...(Array.isArray(u?.linked_player_ids) ? u.linked_player_ids : []),
      ...(Array.isArray(u?.child_ids) ? u.child_ids : []),
    ].filter(Boolean);
  };

  const loadOpponents = async (currentUser) => {
    const list = await base44.entities.Opponent.filter({ sport: activeSport }, "game_date");

    const userIsParent = currentUser?.user_type === "parent" || currentUser?.parent_role;
    if (!userIsParent) {
      setParentLinkedPlayerIds([]);
      setParentTeamIds([]);
      setOpponents(list || []);
      if (!selectedOpponentId && list?.length > 0) {
        setSelectedOpponentId(list[0].id);
      }
      return;
    }

    const linkedIds = getLinkedPlayerIds(currentUser);
    setParentLinkedPlayerIds(linkedIds);

    if (linkedIds.length === 0) {
      setParentTeamIds([]);
      setOpponents([]);
      setSelectedOpponentId("");
      return;
    }

    const players = await base44.entities.Player.filter({ sport: activeSport });
    const linkedPlayers = (players || []).filter(
      (p) => linkedIds.includes(p.id) || (p.player_id && linkedIds.includes(p.player_id))
    );
    const teamIds = [...new Set([
      ...(linkedPlayers.map((p) => p.team_id).filter(Boolean)),
      currentUser?.team_id,
    ].filter(Boolean))];

    setParentTeamIds(teamIds);

    const scopedOpponents = (list || []).filter((opp) => {
      const oppTeamId = opp.team_id || currentUser?.team_id;
      return oppTeamId && teamIds.includes(oppTeamId);
    });

    setOpponents(scopedOpponents);
    if (!selectedOpponentId && scopedOpponents.length > 0) {
      setSelectedOpponentId(scopedOpponents[0].id);
    }
  };

  const ensureGameRecord = async (opponent) => {
    if (!opponent) return null;

    const existing = await base44.entities.GameRecord.filter({ opponent_id: opponent.id });
    if (existing?.length > 0) {
      return existing[0];
    }

    return base44.entities.GameRecord.create({
      opponent_id: opponent.id,
      opponent_name: opponent.name,
      game_date: opponent.game_date,
      sport: activeSport,
      our_score: 0,
      their_score: 0,
      quarter: 1,
      status: "upcoming",
      plays: [],
      live_updates: [],
    });
  };

  const loadSelectedGame = async (currentUser = user) => {
    try {
      setGameLoadError("");

      if (!selectedOpponentId) {
        setGameRecord(null);
        return;
      }

      const opponent = opponents.find(o => o.id === selectedOpponentId);
      if (!opponent) {
        setGameRecord(null);
        return;
      }

      const currentIsParent = currentUser?.user_type === "parent" || currentUser?.parent_role;
      const parentAllowed = !currentIsParent || parentTeamIds.includes(opponent.team_id || currentUser?.team_id);
      if (!parentAllowed) {
        setGameRecord(null);
        return;
      }

      const records = await base44.entities.GameRecord.filter({ opponent_id: opponent.id });
      if (records?.length > 0) {
        setGameRecord(records[0]);
        return;
      }

      const userCanCreate = COACH_ROLES.includes(currentUser?.coaching_role || currentUser?.role || "");
      if (!userCanCreate) {
        setGameRecord(null);
        setGameLoadError("Live tracker has not been started for this game yet.");
        return;
      }

      const created = await ensureGameRecord(opponent);
      setGameRecord(created);
    } catch (error) {
      setGameRecord(null);
      const msg = String(error?.message || "");
      if (msg.toLowerCase().includes("permission denied")) {
        setGameLoadError("You do not have permission to create a live game record. Ask a coach to start Game Tracker.");
      } else {
        setGameLoadError("Unable to load live game tracking right now.");
      }
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const me = await base44.auth.me().catch(() => null);
        if (!active) return;
        setUser(me);
        await loadOpponents(me);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [activeSport]);

  useEffect(() => {
    if (!selectedOpponentId || opponents.length === 0) return;
    loadSelectedGame(user);
  }, [selectedOpponentId, opponents, user?.id, parentTeamIds.join("|")]);

  useEffect(() => {
    if (!selectedOpponentId) return;
    if (!opponents.some((opp) => opp.id === selectedOpponentId)) {
      setSelectedOpponentId(opponents[0]?.id || "");
      setGameRecord(null);
    }
  }, [opponents, selectedOpponentId]);

  useEffect(() => {
    const unsub = base44.entities.GameRecord.subscribe(() => {
      loadSelectedGame(user);
    });
    return unsub;
  }, [selectedOpponentId, opponents, user?.id, parentTeamIds.join("|")]);

  const selectedOpponent = opponents.find(o => o.id === selectedOpponentId);
  const selectedOpponentAllowed = !isParent || !!(selectedOpponent && parentTeamIds.includes(selectedOpponent.team_id || user?.team_id));
  const canPostLiveUpdates = isCoach || (isParent && selectedOpponentAllowed);

  const timeline = useMemo(() => {
    if (!gameRecord) return [];

    const playItems = (gameRecord.plays || []).map((play, idx) => ({
      id: `play_${idx}_${play.posted_at || ""}`,
      kind: "play",
      createdAt: play.posted_at || "",
      actor: play.posted_by || "Game Tracker",
      title: `${play.team === "us" ? "Us" : selectedOpponent?.name || "Opponent"} · ${play.play_type || "Play"}`,
      body: play.description || "",
      detail: `Q${play.quarter || gameRecord.quarter || 1}${play.result ? ` · ${play.result}` : ""}`,
      yards: play.yards,
    }));

    const updateItems = (gameRecord.live_updates || []).map((update, idx) => ({
      id: update.id || `update_${idx}_${update.posted_at || ""}`,
      kind: "update",
      createdAt: update.posted_at || "",
      actor: update.posted_by || "Live Reporter",
      title: update.type ? update.type.replace(/_/g, " ") : "Live Update",
      body: update.content || "",
      detail: update.result || "",
    }));

    return [...playItems, ...updateItems].sort((a, b) => {
      const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTs - aTs;
    });
  }, [gameRecord, selectedOpponent?.name]);

  const postUpdate = async () => {
    if (!gameRecord || !updateForm.content?.trim()) return;
    if (isParent && !selectedOpponentAllowed) return;

    setPosting(true);
    try {
      const next = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: updateForm.type,
        content: updateForm.content.trim(),
        source: "nxplay",
        posted_at: new Date().toISOString(),
        posted_by: user?.full_name || user?.email || (isParent ? "Parent" : "Coach"),
      };

      const updates = [next, ...(gameRecord.live_updates || [])];
      const updated = await base44.entities.GameRecord.update(gameRecord.id, { live_updates: updates });
      setGameRecord(updated || { ...gameRecord, live_updates: updates });
      setUpdateForm({ type: "parent_update", content: "" });
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">
            Nx<span style={{ color: "var(--color-primary,#f97316)" }}>Play</span>
          </h1>
          <p className="text-sm text-gray-500">Real-time game tracker and live updates across all profiles</p>
        </div>
        {isCoach && selectedOpponent && (
          <button
            onClick={() => setLiveTracker(selectedOpponent)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}
          >
            <Gamepad2 className="w-4 h-4" />
            Open Game Tracker
          </button>
        )}
      </div>

      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
        <label className="text-gray-400 text-xs mb-2 block uppercase tracking-wider">Select Game</label>
        <select
          value={selectedOpponentId}
          onChange={(e) => setSelectedOpponentId(e.target.value)}
          className="w-full md:max-w-xl bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)]"
        >
          <option value="">Choose a game...</option>
          {opponents.map((opp) => (
            <option key={opp.id} value={opp.id}>
              {opp.game_date} - vs {opp.name}
            </option>
          ))}
        </select>
      </div>

      {selectedOpponent && gameRecord && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs uppercase tracking-wider">Live Score</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${gameRecord.status === "live" ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-gray-400 border-gray-700 bg-gray-700/10"}`}>
                  {gameRecord.status === "live" ? "Live" : gameRecord.status || "upcoming"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 items-center">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">Us</p>
                  <p className="text-3xl font-black text-white">{gameRecord.our_score || 0}</p>
                </div>
                <div className="text-center text-gray-500 text-xs">Q{gameRecord.quarter || 1}</div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase truncate">{selectedOpponent.name}</p>
                  <p className="text-3xl font-black text-red-400">{gameRecord.their_score || 0}</p>
                </div>
              </div>
            </div>

            {canPostLiveUpdates && (
              <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
                <p className="text-white text-sm font-semibold">Post In-Game Update</p>
                <select
                  value={updateForm.type}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none"
                >
                  {UPDATE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <textarea
                  rows={3}
                  value={updateForm.content}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder={isParent ? "Share a parent update in real-time..." : "Post a live game update..."}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
                />
                <button
                  onClick={postUpdate}
                  disabled={posting || !updateForm.content.trim()}
                  className="w-full flex items-center justify-center gap-2 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary,#f97316)" }}
                >
                  <Send className="w-4 h-4" />
                  {posting ? "Posting..." : "Post Live Update"}
                </button>
              </div>
            )}

            {isParent && parentLinkedPlayerIds.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
                Parent live updates require at least one linked player.
              </div>
            )}

            {isParent && selectedOpponent && !selectedOpponentAllowed && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
                You can post updates only for games tied to your linked player(s).
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-[#141414] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white text-sm font-semibold">Live Feed</p>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Radio className="w-3 h-3" /> Real-time</p>
            </div>

            {timeline.length === 0 ? (
              <div className="text-center py-10 text-gray-600">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No live updates yet. Coaches can use Game Tracker, and parents can post updates here.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {timeline.map((item) => (
                  <div key={item.id} className="bg-[#101010] border border-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500">{item.title}</p>
                      <span className="text-[11px] text-gray-600 flex items-center gap-1">
                        <Clock3 className="w-3 h-3" />
                        {formatClock(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200">{item.body}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      {item.kind === "play" ? <Trophy className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
                      <span>{item.actor}</span>
                      {item.detail && <span>· {item.detail}</span>}
                      {typeof item.yards === "number" && <span>· {item.yards > 0 ? `+${item.yards}` : item.yards} yds</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedOpponent && !gameRecord && (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          {gameLoadError || "Live game record is not available yet for this matchup."}
        </div>
      )}

      {!selectedOpponent && (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          Select a game to open NxPlay live coverage.
        </div>
      )}

      {liveTracker && <LiveGameTracker opponent={liveTracker} onClose={() => setLiveTracker(null)} />}
    </div>
  );
}
