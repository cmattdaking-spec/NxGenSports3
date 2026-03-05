import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const AVAILABILITY = ["full","limited","out","day_to_day"];
const AVAILABILITY_CONFIG = {
  full: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle, label: "Full" },
  limited: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock, label: "Limited" },
  out: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle, label: "Out" },
  day_to_day: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: Clock, label: "Day-to-Day" },
};

export default function PlayerHealth() {
  const [records, setRecords] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [filterAvail, setFilterAvail] = useState("all");
  const [user, setUser] = useState(null);

  const load = async () => {
    const [r, p] = await Promise.all([
      base44.entities.PlayerHealth.list("-date"),
      base44.entities.Player.list()
    ]);
    setRecords(r); setPlayers(p); setLoading(false);
  };
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); load(); }, []);

  const canEdit = user?.role !== "athletic_director";

  const openAdd = () => {
    setEditing(null);
    setForm({ availability: "full", cleared_to_play: true, date: new Date().toISOString().split("T")[0] });
    setShowForm(true);
  };
  const openEdit = (r) => { setEditing(r); setForm({...r}); setShowForm(true); };
  const save = async () => {
    if (editing) await base44.entities.PlayerHealth.update(editing.id, form);
    else await base44.entities.PlayerHealth.create(form);
    setShowForm(false); load();
  };
  const remove = async (id) => { if (confirm("Delete health record?")) { await base44.entities.PlayerHealth.delete(id); load(); } };

  const handlePlayerSelect = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setForm(f => ({ ...f, player_id: playerId, player_name: `${player.first_name} ${player.last_name}` }));
    }
  };

  const filtered = records.filter(r => filterAvail === "all" || r.availability === filterAvail);

  // Group by player - latest record per player
  const latestByPlayer = {};
  records.forEach(r => {
    if (!latestByPlayer[r.player_id] || new Date(r.date) > new Date(latestByPlayer[r.player_id].date)) {
      latestByPlayer[r.player_id] = r;
    }
  });

  const availStats = AVAILABILITY.reduce((acc, a) => {
    acc[a] = Object.values(latestByPlayer).filter(r => r.availability === a).length;
    return acc;
  }, {});

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Player <span className="text-orange-500">Health</span></h1>
          <p className="text-gray-500 text-sm">{records.length} health records</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Log Health
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {AVAILABILITY.map(a => {
          const cfg = AVAILABILITY_CONFIG[a];
          const Icon = cfg.icon;
          return (
            <button key={a} onClick={() => setFilterAvail(filterAvail === a ? "all" : a)}
              className={`p-4 rounded-xl border transition-all ${filterAvail === a ? cfg.color : "bg-[#141414] border-gray-800 text-gray-400"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{cfg.label}</span>
              </div>
              <p className="text-2xl font-black">{availStats[a] || 0}</p>
            </button>
          );
        })}
      </div>

      {/* Health Records */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Player</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Date</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Availability</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Injury</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Est. Return</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Cleared</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-10">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-10">No health records found</td></tr>
              ) : filtered.map(r => {
                const cfg = AVAILABILITY_CONFIG[r.availability];
                const Icon = cfg?.icon || Activity;
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{r.player_name}</p>
                      {r.reported_by && <p className="text-gray-500 text-xs">by {r.reported_by}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit border ${cfg?.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.injury_type ? (
                        <div>
                          <p className="text-gray-300 text-sm">{r.injury_type}</p>
                          {r.injury_location && <p className="text-gray-500 text-xs">{r.injury_location}</p>}
                        </div>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{r.estimated_return || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.cleared_to_play ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {r.cleared_to_play ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-orange-500 transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => remove(r.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Health Record" : "Log Health Status"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Player *</label>
                  <select value={form.player_id || ""} onChange={e => handlePlayerSelect(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="">Select player...</option>
                    {players.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.position})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Date</label>
                  <input type="date" value={form.date || ""} onChange={e => setForm({...form, date: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Availability *</label>
                  <select value={form.availability || "full"} onChange={e => setForm({...form, availability: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    {AVAILABILITY.map(a => <option key={a} value={a}>{a.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Injury Type</label>
                  <input value={form.injury_type || ""} onChange={e => setForm({...form, injury_type: e.target.value})} placeholder="e.g. Hamstring Strain"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Body Location</label>
                  <input value={form.injury_location || ""} onChange={e => setForm({...form, injury_location: e.target.value})} placeholder="e.g. Left Hamstring"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Est. Return Date</label>
                  <input type="date" value={form.estimated_return || ""} onChange={e => setForm({...form, estimated_return: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Cleared to Play</label>
                  <select value={form.cleared_to_play ? "yes" : "no"} onChange={e => setForm({...form, cleared_to_play: e.target.value === "yes"})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Reported By</label>
                  <input value={form.reported_by || ""} onChange={e => setForm({...form, reported_by: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Diagnosis</label>
                <textarea value={form.diagnosis || ""} onChange={e => setForm({...form, diagnosis: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Treatment Plan</label>
                <textarea value={form.treatment || ""} onChange={e => setForm({...form, treatment: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={save} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium">Save Record</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}