import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Edit, Save, X } from "lucide-react";

const OFFENSE_POSITIONS = ["QB","RB","FB","WR","TE","LT","LG","C","RG","RT"];
const DEFENSE_POSITIONS = ["DE","DT","NT","OLB","MLB","ILB","CB","SS","FS"];
const SPECIAL_POSITIONS = ["K","P","LS"];

const UNIT_POSITIONS = { offense: OFFENSE_POSITIONS, defense: DEFENSE_POSITIONS, special_teams: SPECIAL_POSITIONS };

export default function DepthChart() {
  const [unit, setUnit] = useState("offense");
  const [players, setPlayers] = useState([]);
  const [depthCharts, setDepthCharts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  const load = async () => {
    const [p, d] = await Promise.all([base44.entities.Player.list(), base44.entities.DepthChart.list()]);
    setPlayers(p);
    setDepthCharts(d);
  };
  useEffect(() => { load(); }, []);

  const positions = UNIT_POSITIONS[unit] || [];
  const unitPlayers = players.filter(p => p.unit === unit);

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
    const playerData = unitPlayers.map(p => `${p.first_name} ${p.last_name} (${p.position}, Rating: ${p.overall_rating || "N/A"}, Status: ${p.status})`).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football coaching AI assistant. Based on the following ${unit} players, suggest an optimal depth chart. Consider player ratings, positions, and availability status. Format your response as clear position-by-position recommendations with brief reasoning.\n\nPlayers:\n${playerData}\n\nProvide depth chart recommendations for ${unit} positions: ${positions.join(", ")}`,
    });
    setAiSuggestion(res);
    setAiLoading(false);
  };

  const playerOptions = unitPlayers.filter(p => p.status !== "injured");

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Depth <span className="text-orange-500">Chart</span></h1>
          <p className="text-gray-500 text-sm">Manage your starters & backups</p>
        </div>
        <button onClick={getAISuggestions} disabled={aiLoading}
          className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 px-4 py-2 rounded-lg text-sm font-medium transition-all">
          <Zap className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} />
          {aiLoading ? "Analyzing..." : "AI Suggest"}
        </button>
      </div>

      {/* Unit Tabs */}
      <div className="flex gap-2 mb-6">
        {["offense","defense","special_teams"].map(u => (
          <button key={u} onClick={() => setUnit(u)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${unit === u ? "bg-orange-500 text-white" : "bg-[#141414] border border-gray-800 text-gray-400 hover:text-white"}`}>
            {u.replace("_"," ").replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-orange-400 font-medium text-sm">AI Depth Chart Recommendation</span>
            <button onClick={() => setAiSuggestion("")} className="ml-auto text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-gray-300 text-sm whitespace-pre-line">{aiSuggestion}</p>
        </div>
      )}

      {/* Depth Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {positions.map(pos => {
          const chart = getChart(pos);
          return (
            <div key={pos} className="bg-[#141414] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-orange-500 font-black text-lg font-mono">{pos}</span>
                <button onClick={() => openEdit(pos)} className="text-gray-500 hover:text-orange-500 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { label: "1st", name: chart?.starter_name, key: "starter" },
                  { label: "2nd", name: chart?.backup1_name, key: "backup1" },
                  { label: "3rd", name: chart?.backup2_name, key: "backup2" },
                  { label: "4th", name: chart?.backup3_name, key: "backup3" },
                ].map(({ label, name }) => (
                  <div key={label} className={`flex items-center gap-3 p-2 rounded-lg ${label === "1st" ? "bg-orange-500/10 border border-orange-500/20" : "bg-[#1a1a1a]"}`}>
                    <span className={`text-xs font-bold w-6 ${label === "1st" ? "text-orange-500" : "text-gray-600"}`}>{label}</span>
                    <span className={`text-sm ${name ? (label === "1st" ? "text-white font-medium" : "text-gray-300") : "text-gray-600 italic"}`}>
                      {name || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing} Depth Chart</h2>
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
                    const p = playerOptions.find(pl => pl.id === e.target.value);
                    setForm({...form, [idKey]: e.target.value, [nameKey]: p ? `${p.first_name} ${p.last_name}` : ""});
                  }} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="">— Empty —</option>
                    {playerOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.position})</option>
                    ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditing(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={save} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}