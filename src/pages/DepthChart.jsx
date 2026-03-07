import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Edit, X, Flame, AlertTriangle } from "lucide-react";
import { useTeamLanguage, POSITION_DEFS } from "@/components/playbook/useTeamLanguage";

// Use lettering system positions
const OFFENSE_POSITIONS = ["QB","X","Z","W","Y","A","FB","H","LT","LG","C","RG","RT"];
const DEFENSE_POSITIONS = ["DE","DT","NT","OLB","MLB","ILB","CB","SS","FS"];
const SPECIAL_POSITIONS = ["K","P","LS"];
const UNIT_POSITIONS = { offense: OFFENSE_POSITIONS, defense: DEFENSE_POSITIONS, special_teams: SPECIAL_POSITIONS };

const LOAD_ALERT_ROLES = ["head_coach","admin","trainer","strength_conditioning_coordinator"];

export default function DepthChart() {
  const [unit, setUnit] = useState("offense");
  const [players, setPlayers] = useState([]);
  const [depthCharts, setDepthCharts] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [user, setUser] = useState(null);
  const [filterLevel, setFilterLevel] = useState("all");
  const { getLabel, getLanguageContext } = useTeamLanguage();

  const load = async () => {
    const [p, d, w, h] = await Promise.all([
      base44.entities.Player.list(),
      base44.entities.DepthChart.list(),
      base44.entities.WorkoutPlan.list("-date", 50),
      base44.entities.PlayerHealth.list("-date", 100)
    ]);
    setPlayers(p); setDepthCharts(d); setWorkouts(w); setHealthRecords(h);
  };
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); load(); }, []);

  // AD and Trainer can only view depth chart, not edit
  const canEdit = user && !["athletic_director","trainer"].includes(user.role);
  const canSeeLoadAlerts = user && LOAD_ALERT_ROLES.includes(user.role);

  // Players who can play a position (primary or secondary)
  const getPositionPlayers = (pos) => {
    return players.filter(p => {
      const matchesUnit = p.unit === unit;
      const matchesPrimary = p.position === pos;
      const matchesSecondary = p.secondary_positions?.includes(pos);
      const matchesLevel = filterLevel === "all" || !p.levels || p.levels.length === 0 || p.levels.includes(filterLevel);
      return (matchesPrimary || matchesSecondary) && matchesLevel;
    });
  };

  // S&C load score for a player (last 7 days)
  const getPlayerLoadScore = (playerId) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentWorkouts = workouts.filter(w => {
      const d = new Date(w.date);
      const isRecent = d >= sevenDaysAgo;
      const isForPlayer = !w.player_ids?.length || w.player_ids.includes(playerId);
      return isRecent && isForPlayer && w.status === "completed";
    });
    if (!recentWorkouts.length) return null;
    const avgLoad = recentWorkouts.reduce((sum, w) => sum + (w.load_score || 5), 0) / recentWorkouts.length;
    return avgLoad;
  };

  // Health status for a player
  const getPlayerHealth = (playerId) => {
    return healthRecords.find(h => h.player_id === playerId);
  };

  const positions = UNIT_POSITIONS[unit] || [];

  const getChart = (pos) => depthCharts.find(d => d.position === pos && d.unit === unit);

  const openEdit = (pos) => {
    const existing = getChart(pos);
    setEditing(pos);
    setForm(existing || { position: pos, unit });
  };

  const save = async () => {
    const existing = getChart(editing);
    if (existing) await base44.entities.DepthChart.update(existing.id, form);
    else await base44.entities.DepthChart.create({ ...form, position: editing, unit });
    setEditing(null);
    load();
  };

  const getAISuggestions = async () => {
    setAiLoading(true);
    setAiSuggestion("");
    const unitPlayers = players.filter(p => p.unit === unit || p.secondary_positions?.some(sp => UNIT_POSITIONS[unit]?.includes(sp)));
    const playerData = unitPlayers.map(p => {
      const loadScore = getPlayerLoadScore(p.id);
      const health = getPlayerHealth(p.id);
      const readiness = health?.availability === "out" ? "OUT" : health?.availability === "limited" ? "Limited" : loadScore && loadScore >= 8 ? "High Load/Fatigued" : "Ready";
      const positions = [p.position, ...(p.secondary_positions || [])].join("/");
      return `${p.first_name} ${p.last_name} (${positions}, Rating: ${p.overall_rating || "N/A"}, Status: ${p.status}, Readiness: ${readiness}, S&C Load: ${loadScore ? loadScore.toFixed(1)+"/10" : "No data"})`;
    }).join("\n");

    const langCtx = getLanguageContext();
    const posLabels = positions.map(p => `${getLabel(p)} (${p})`).join(", ");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football coaching assistant for NxDown. ${langCtx}

Based on the following ${unit} players, suggest an optimal depth chart.
IMPORTANT: Factor in player READINESS (S&C load and health status). Players marked "High Load/Fatigued" or "Limited" should be considered for lower depth chart spots. Players who are "OUT" should not be starters.
Players may play multiple positions — assign them optimally.

Players:
${playerData}

Provide depth chart recommendations for ${unit} positions: ${posLabels}
Note any S&C-related readiness concerns. Use team position labels throughout.`,
    });
    setAiSuggestion(res);
    setAiLoading(false);
  };

  const allEligiblePlayers = (pos) => {
    return players.filter(p => {
      const matchesPos = p.position === pos || p.secondary_positions?.includes(pos);
      return matchesPos && p.status !== "injured";
    });
  };

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Depth <span style={{ color: "var(--color-primary,#f97316)" }}>Chart</span></h1>
          <p className="text-gray-500 text-sm">Manage your starters & backups · Multi-position support</p>
        </div>
        <button onClick={getAISuggestions} disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border"
          style={{ backgroundColor: "var(--color-primary,#f97316)15", borderColor: "var(--color-primary,#f97316)40", color: "var(--color-primary,#f97316)" }}>
          <Zap className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} />
          {aiLoading ? "Analyzing..." : "Nx Suggest"}
        </button>
      </div>

      {/* Unit + Level Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["offense","defense","special_teams"].map(u => (
          <button key={u} onClick={() => setUnit(u)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${unit === u ? "text-white" : "bg-[#141414] border border-gray-800 text-gray-400 hover:text-white"}`}
            style={unit === u ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
            {u.replace("_"," ").replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
        <div className="w-px bg-gray-800 mx-1 hidden md:block" />
        {["all","Varsity","JV","Freshman"].map(l => (
          <button key={l} onClick={() => setFilterLevel(l)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterLevel === l ? "bg-[#141414] border text-white" : "text-gray-500 hover:text-gray-300"}`}
            style={filterLevel === l ? { borderColor: "var(--color-primary,#f97316)60" } : {}}>
            {l === "all" ? "All Levels" : l}
          </button>
        ))}
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <div className="rounded-xl p-4 mb-6 border" style={{ backgroundColor: "var(--color-primary,#f97316)10", borderColor: "var(--color-primary,#f97316)35" }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
            <span className="font-medium text-sm" style={{ color: "var(--color-primary,#f97316)" }}>Nx Depth Chart Recommendation (S&C-Aware)</span>
            <button onClick={() => setAiSuggestion("")} className="ml-auto text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-gray-300 text-sm whitespace-pre-line">{aiSuggestion}</p>
        </div>
      )}

      {/* Depth Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {positions.map(pos => {
          const chart = getChart(pos);
          const slots = [
            { label: "1st", name: chart?.starter_name, id: chart?.starter_id },
            { label: "2nd", name: chart?.backup1_name, id: chart?.backup1_id },
            { label: "3rd", name: chart?.backup2_name, id: chart?.backup2_id },
            { label: "4th", name: chart?.backup3_name, id: chart?.backup3_id },
          ];
          return (
            <div key={pos} className="bg-[#141414] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-black text-lg font-mono" style={{ color: "var(--color-primary,#f97316)" }}>{getLabel(pos)}</span>
                  {getLabel(pos) !== pos && <span className="text-gray-700 text-xs ml-1.5 font-mono">({pos})</span>}
                  <p className="text-gray-600 text-xs leading-none mt-0.5">{POSITION_DEFS.find(d => d.code === pos)?.desc || ""}</p>
                </div>
                {canEdit && (
                  <button onClick={() => openEdit(pos)} className="text-gray-500 transition-colors"
                    onMouseEnter={e => e.currentTarget.style.color="var(--color-primary,#f97316)"}
                    onMouseLeave={e => e.currentTarget.style.color=""}>
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {slots.map(({ label, name, id }) => {
                  const loadScore = id ? getPlayerLoadScore(id) : null;
                  const health = id ? getPlayerHealth(id) : null;
                  const isHighLoad = canSeeLoadAlerts && loadScore && loadScore >= 8;
                  const isLimited = health && (health.availability === "limited" || health.availability === "out");
                  const player = id ? players.find(p => p.id === id) : null;
                  const isMultiPos = player?.secondary_positions?.includes(pos) && player?.position !== pos;
                  return (
                    <div key={label} className={`flex items-center gap-3 p-2 rounded-lg ${label === "1st" ? "border" : "bg-[#1a1a1a]"}`}
                      style={label === "1st" ? { backgroundColor: "var(--color-primary,#f97316)15", borderColor: "var(--color-primary,#f97316)30" } : {}}>
                      <span className="text-xs font-bold w-6" style={label === "1st" ? { color: "var(--color-primary,#f97316)" } : { color: "#4b5563" }}>{label}</span>
                      <span className={`text-sm flex-1 ${name ? (label === "1st" ? "text-white font-medium" : "text-gray-300") : "text-gray-600 italic"}`}>
                        {name || "—"}
                        {isMultiPos && <span className="text-xs text-cyan-400 ml-1">(flex)</span>}
                      </span>
                      {isHighLoad && <Flame className="w-3 h-3 text-orange-400 flex-shrink-0" title="High S&C Load" />}
                      {isLimited && <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" title={`Health: ${health.availability}`} />}
                    </div>
                  );
                })}
              </div>
              {/* Multi-position eligible note */}
              {getPositionPlayers(pos).some(p => p.secondary_positions?.includes(pos)) && (
                <p className="text-cyan-600 text-xs mt-2">+ flex-eligible players available</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{getLabel(editing)} Depth Chart <span className="text-gray-600 text-sm font-normal">({editing})</span></h2>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: "Starter (1st)", nameKey: "starter_name", idKey: "starter_id" },
                { label: "2nd String", nameKey: "backup1_name", idKey: "backup1_id" },
                { label: "3rd String", nameKey: "backup2_name", idKey: "backup2_id" },
                { label: "4th String", nameKey: "backup3_name", idKey: "backup3_id" },
              ].map(({ label, nameKey, idKey }) => (
                <div key={nameKey}>
                  <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                  <select value={form[idKey] || ""} onChange={e => {
                    const p = allEligiblePlayers(editing).find(pl => pl.id === e.target.value);
                    setForm({...form, [idKey]: e.target.value, [nameKey]: p ? `${p.first_name} ${p.last_name}` : ""});
                  }} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm">
                    <option value="">— Empty —</option>
                    {allEligiblePlayers(editing).map(p => {
                      const loadScore = getPlayerLoadScore(p.id);
                      const health = getPlayerHealth(p.id);
                      const isHighLoad = canSeeLoadAlerts && loadScore && loadScore >= 8;
                      const isPrimary = p.position === editing;
                      const label = `${p.first_name} ${p.last_name} (${p.position}${!isPrimary ? " → " + editing : ""})${isHighLoad ? " ⚡High Load" : ""}${health?.availability === "limited" ? " ⚠ Limited" : ""}`;
                      return <option key={p.id} value={p.id}>{label}</option>;
                    })}
                  </select>
                </div>
              ))}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditing(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={save} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}