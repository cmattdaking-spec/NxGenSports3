import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSport } from "@/components/SportContext";
import { FileText, Plus, Edit, Trash2, Eye, Brain, Zap } from "lucide-react";
import LoadingScreen from "../../components/LoadingScreen";

export default function ScoutingReport() {
  const { activeSport } = useSport();
  const [reports, setReports] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ game_id: "", report: "", ai_generated: false });
  const [aiLoading, setAiLoading] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeSport]);

  const loadData = async () => {
    const [rep, gam] = await Promise.all([
      base44.entities.ScoutingReport.list("-created_date"),
      base44.entities.Game.list("-date")
    ]);
    setReports(rep.filter(r => r.sport === activeSport));
    setGames(gam.filter(g => g.sport === activeSport));
    setLoading(false);
  };

  const save = async () => {
    if (editing) {
      await base44.entities.ScoutingReport.update(editing.id, form);
    } else {
      await base44.entities.ScoutingReport.create({ ...form, sport: activeSport });
    }
    setShowForm(false);
    setEditing(null);
    setForm({ game_id: "", report: "", ai_generated: false });
    loadData();
  };

  const generateAI = async () => {
    setAiLoading(true);
    const game = games.find(g => g.id === form.game_id);
    if (!game) return;
    const prompt = `Generate a detailed scouting report for our team's performance in the game against ${game.opponent_name} on ${game.date}. Sport: ${activeSport}. Include strengths, weaknesses, key plays, and recommendations.`;
    const res = await base44.integrations.Core.InvokeLLM({ prompt });
    const response = typeof res === 'object' && res !== null && 'response' in res ? res.response : res;
    setForm({ ...form, report: response, ai_generated: true });
    setAiLoading(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Scouting Reports</h1>
        <button onClick={() => setShowForm(true)} className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      <div className="grid gap-4">
        {reports.map(r => {
          const game = games.find(g => g.id === r.game_id);
          return (
            <div key={r.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">{game?.opponent_name || "Unknown Game"}</h3>
                  <p className="text-gray-400 text-sm">{game?.date}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewing(r)} className="text-blue-400"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => { setEditing(r); setForm(r); setShowForm(true); }} className="text-yellow-400"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => { base44.entities.ScoutingReport.delete(r.id); loadData(); }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-2xl">
            <h2 className="text-white text-xl mb-4">{editing ? "Edit" : "New"} Scouting Report</h2>
            <select value={form.game_id} onChange={e => setForm({ ...form, game_id: e.target.value })} className="w-full mb-4 p-2 bg-gray-800 text-white rounded">
              <option value="">Select Game</option>
              {games.map(g => <option key={g.id} value={g.id}>{g.opponent_name} - {g.date}</option>)}
            </select>
            <textarea value={form.report} onChange={e => setForm({ ...form, report: e.target.value })} className="w-full h-64 p-2 bg-gray-800 text-white rounded" placeholder="Scouting report..." />
            <div className="flex gap-2 mt-4">
              <button onClick={generateAI} disabled={aiLoading} className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2">
                <Brain className="w-4 h-4" /> {aiLoading ? "Generating..." : "Generate with AI"}
              </button>
              <button onClick={save} className="bg-green-500 text-white px-4 py-2 rounded">Save</button>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-2xl">
            <h2 className="text-white text-xl mb-4">Scouting Report</h2>
            <pre className="text-white whitespace-pre-wrap">{viewing.report}</pre>
            <button onClick={() => setViewing(null)} className="mt-4 bg-gray-500 text-white px-4 py-2 rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}