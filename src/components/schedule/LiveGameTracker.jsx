import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, Zap, Clock, Flag, CheckCircle } from "lucide-react";

const PLAY_TYPES = ["Run", "Pass Complete", "Pass Incomplete", "Sack", "Penalty", "Punt", "Kickoff", "Field Goal", "Touchdown", "Turnover", "Timeout", "Other"];

export default function LiveGameTracker({ opponent, onClose }) {
  const [gameRecord, setGameRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPlayForm, setShowPlayForm] = useState(false);
  const [playForm, setPlayForm] = useState({ team: "us", play_type: "Run", description: "", yards: "", result: "" });

  useEffect(() => {
    base44.entities.GameRecord.filter({ opponent_id: opponent.id }).then(records => {
      if (records.length > 0) {
        setGameRecord(records[0]);
      } else {
        // Create a new game record
        base44.entities.GameRecord.create({
          opponent_id: opponent.id,
          opponent_name: opponent.name,
          game_date: opponent.game_date,
          our_score: 0,
          their_score: 0,
          quarter: 1,
          status: "upcoming",
          plays: []
        }).then(r => setGameRecord(r));
      }
      setLoading(false);
    });
  }, [opponent.id]);

  const update = async (data) => {
    if (!gameRecord) return;
    setSaving(true);
    const updated = await base44.entities.GameRecord.update(gameRecord.id, data);
    setGameRecord(prev => ({ ...prev, ...data }));
    setSaving(false);
  };

  const startGame = () => update({ status: "live", quarter: 1 });
  const endGame = () => update({ status: "final" });

  const scoreUpdate = (team, delta) => {
    const field = team === "us" ? "our_score" : "their_score";
    const newVal = Math.max(0, (gameRecord[field] || 0) + delta);
    update({ [field]: newVal });
  };

  const addPlay = async () => {
    if (!playForm.description) return;
    const newPlay = {
      quarter: gameRecord.quarter || 1,
      clock: gameRecord.game_clock || "",
      team: playForm.team,
      play_type: playForm.play_type,
      description: playForm.description,
      yards: playForm.yards ? Number(playForm.yards) : undefined,
      result: playForm.result
    };
    const updatedPlays = [...(gameRecord.plays || []), newPlay];
    await update({ plays: updatedPlays });
    setPlayForm({ team: "us", play_type: "Run", description: "", yards: "", result: "" });
    setShowPlayForm(false);
  };

  const isLive = gameRecord?.status === "live";
  const isFinal = gameRecord?.status === "final";

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            {isLive && <span className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />LIVE</span>}
            {isFinal && <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">FINAL</span>}
            <h2 className="text-white font-bold">vs. {opponent.name}</h2>
            <span className="text-gray-500 text-sm">{opponent.game_date}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Scoreboard */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-center gap-8">
            {/* Our Score */}
            <div className="text-center">
              <p className="text-gray-500 text-xs uppercase mb-1">Us</p>
              <div className="flex items-center gap-2">
                {isLive && <button onClick={() => scoreUpdate("us", -1)} className="w-7 h-7 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 text-sm font-bold">−</button>}
                <p className="text-5xl font-black text-white w-16 text-center">{gameRecord?.our_score || 0}</p>
                {isLive && <button onClick={() => scoreUpdate("us", 1)} className="w-7 h-7 rounded-full bg-teal-600 text-white hover:bg-teal-500 text-sm font-bold">+</button>}
              </div>
            </div>

            {/* Quarter & Status */}
            <div className="text-center">
              <p className="text-gray-400 text-sm font-semibold">{isFinal ? "FINAL" : `Q${gameRecord?.quarter || 1}`}</p>
              {isLive && (
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => update({ quarter: Math.max(1, (gameRecord.quarter || 1) - 1) })}
                    className="text-xs text-gray-500 hover:text-white">◀</button>
                  <span className="text-gray-500 text-xs">Quarter</span>
                  <button onClick={() => update({ quarter: Math.min(4, (gameRecord.quarter || 1) + 1) })}
                    className="text-xs text-gray-500 hover:text-white">▶</button>
                </div>
              )}
            </div>

            {/* Their Score */}
            <div className="text-center">
              <p className="text-gray-500 text-xs uppercase mb-1">{opponent.name}</p>
              <div className="flex items-center gap-2">
                {isLive && <button onClick={() => scoreUpdate("them", -1)} className="w-7 h-7 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 text-sm font-bold">−</button>}
                <p className="text-5xl font-black text-red-400 w-16 text-center">{gameRecord?.their_score || 0}</p>
                {isLive && <button onClick={() => scoreUpdate("them", 1)} className="w-7 h-7 rounded-full bg-red-700 text-white hover:bg-red-600 text-sm font-bold">+</button>}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3 mt-4">
            {!isLive && !isFinal && (
              <button onClick={startGame} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Zap className="w-4 h-4" /> Start Game
              </button>
            )}
            {isLive && (
              <>
                <button onClick={() => setShowPlayForm(true)} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <Plus className="w-4 h-4" /> Log Play
                </button>
                <button onClick={endGame} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> End Game
                </button>
              </>
            )}
            {isFinal && (
              <button onClick={startGame} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Reopen Game
              </button>
            )}
          </div>
        </div>

        {/* Play Log Form */}
        {showPlayForm && (
          <div className="p-4 border-b border-gray-800 bg-[#1a1a1a] flex-shrink-0">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Team</label>
                <select value={playForm.team} onChange={e => setPlayForm(f => ({ ...f, team: e.target.value }))}
                  className="w-full bg-[#111] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm">
                  <option value="us">Us</option>
                  <option value="them">{opponent.name}</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Play Type</label>
                <select value={playForm.play_type} onChange={e => setPlayForm(f => ({ ...f, play_type: e.target.value }))}
                  className="w-full bg-[#111] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm">
                  {PLAY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">Description *</label>
                <input value={playForm.description} onChange={e => setPlayForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. QB keeper up the middle for 8 yards"
                  className="w-full bg-[#111] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Yards</label>
                <input type="number" value={playForm.yards} onChange={e => setPlayForm(f => ({ ...f, yards: e.target.value }))}
                  className="w-full bg-[#111] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Result</label>
                <input value={playForm.result} onChange={e => setPlayForm(f => ({ ...f, result: e.target.value }))}
                  placeholder="e.g. 1st Down"
                  className="w-full bg-[#111] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPlayForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={addPlay} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-lg text-sm font-medium">Add Play</button>
            </div>
          </div>
        )}

        {/* Play Log */}
        <div className="flex-1 overflow-y-auto p-4">
          {(!gameRecord?.plays || gameRecord.plays.length === 0) ? (
            <div className="text-center py-10 text-gray-600">
              <Flag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{isLive ? "No plays logged yet. Use 'Log Play' to track the game." : "Start the game to begin tracking plays."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...gameRecord.plays].reverse().map((play, i) => (
                <div key={i} className={`bg-[#1a1a1a] border rounded-lg p-3 ${play.team === "us" ? "border-teal-500/20" : "border-red-500/20"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${play.team === "us" ? "bg-teal-500/20 text-teal-400" : "bg-red-500/20 text-red-400"}`}>
                      {play.team === "us" ? "Us" : opponent.name}
                    </span>
                    <span className="text-gray-500 text-xs">Q{play.quarter}</span>
                    <span className="text-gray-600 text-xs bg-gray-800 px-1.5 py-0.5 rounded">{play.play_type}</span>
                    {play.yards !== undefined && <span className="text-gray-400 text-xs ml-auto">{play.yards > 0 ? `+${play.yards}` : play.yards} yds</span>}
                  </div>
                  <p className="text-gray-300 text-sm">{play.description}</p>
                  {play.result && <p className="text-gray-500 text-xs mt-0.5 italic">{play.result}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}