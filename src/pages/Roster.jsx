import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Filter, Edit, Trash2, X, ChevronDown } from "lucide-react";

const POSITIONS = ["QB","RB","FB","WR","TE","LT","LG","C","RG","RT","DE","DT","NT","OLB","MLB","ILB","CB","SS","FS","K","P","LS"];
const UNITS = ["offense","defense","special_teams"];
const YEARS = ["Freshman","Sophomore","Junior","Senior","Grad"];
const STATUSES = ["active","injured","suspended","inactive"];

const statusColor = { active: "bg-green-500/20 text-green-400", injured: "bg-red-500/20 text-red-400", suspended: "bg-yellow-500/20 text-yellow-400", inactive: "bg-gray-500/20 text-gray-400" };
const unitColor = { offense: "bg-blue-500/20 text-blue-400", defense: "bg-red-500/20 text-red-400", special_teams: "bg-purple-500/20 text-purple-400" };

const CAN_ADD = ["admin","head_coach","athletic_director","offensive_coordinator","defensive_coordinator","special_teams_coordinator"];
const CAN_DELETE = ["admin","head_coach","athletic_director"];

export default function Roster() {
  const [players, setPlayers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterPos, setFilterPos] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = () => base44.entities.Player.list().then(d => { setPlayers(d); setLoading(false); });
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, []);

  const filtered = players.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || p.position?.toLowerCase().includes(search.toLowerCase());
    const matchUnit = filterUnit === "all" || p.unit === filterUnit;
    const matchPos = filterPos === "all" || p.position === filterPos;
    return matchSearch && matchUnit && matchPos;
  });

  const canAdd = CAN_ADD.includes(user?.role);
  const canDelete = CAN_DELETE.includes(user?.role);

  const openAdd = () => { setEditing(null); setForm({ status: "active", unit: "offense", academic_eligible: true }); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setShowForm(true); };

  const save = async () => {
    if (editing) await base44.entities.Player.update(editing.id, form);
    else await base44.entities.Player.create(form);
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (confirm("Remove player?")) { await base44.entities.Player.delete(id); load(); }
  };

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Roster <span className="text-orange-500">Management</span></h1>
          <p className="text-gray-500 text-sm">{players.length} players</p>
        </div>
        {canAdd && (
          <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
            <Plus className="w-4 h-4" /> Add Player
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players..."
            className="w-full bg-[#141414] border border-gray-800 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
          className="bg-[#141414] border border-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
          <option value="all">All Units</option>
          {UNITS.map(u => <option key={u} value={u}>{u.replace("_", " ")}</option>)}
        </select>
        <select value={filterPos} onChange={e => setFilterPos(e.target.value)}
          className="bg-[#141414] border border-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
          <option value="all">All Positions</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">#</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Player</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Position</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Unit</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Year</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Status</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Rating</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center text-gray-500 py-10">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-500 py-10">No players found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-800/50 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-orange-500 font-bold text-sm">#{p.number || "--"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{p.first_name} {p.last_name}</p>
                        {p.hometown && <p className="text-gray-500 text-xs">{p.hometown}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm font-mono">{p.position}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${unitColor[p.unit] || "bg-gray-500/20 text-gray-400"}`}>
                      {p.unit?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{p.year}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.overall_rating ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${p.overall_rating}%` }} />
                        </div>
                        <span className="text-gray-400 text-xs">{p.overall_rating}</span>
                      </div>
                    ) : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                   <div className="flex items-center gap-2 justify-end">
                     {canAdd && <button onClick={() => openEdit(p)} className="text-gray-500 hover:text-blue-400 transition-colors"><Edit className="w-4 h-4" /></button>}
                     {canDelete && <button onClick={() => remove(p.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                   </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Player" : "Add Player"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">First Name *</label>
                  <input value={form.first_name || ""} onChange={e => setForm({...form, first_name: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Last Name *</label>
                  <input value={form.last_name || ""} onChange={e => setForm({...form, last_name: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Number</label>
                  <input value={form.number || ""} onChange={e => setForm({...form, number: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Position *</label>
                  <select value={form.position || ""} onChange={e => setForm({...form, position: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="">Select...</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Unit *</label>
                  <select value={form.unit || ""} onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    {UNITS.map(u => <option key={u} value={u}>{u.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Year</label>
                  <select value={form.year || ""} onChange={e => setForm({...form, year: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="">Select...</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Height</label>
                  <input value={form.height || ""} onChange={e => setForm({...form, height: e.target.value})} placeholder="6'2&quot;"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Weight (lbs)</label>
                  <input type="number" value={form.weight || ""} onChange={e => setForm({...form, weight: +e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Status</label>
                  <select value={form.status || "active"} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Overall Rating (0-100)</label>
                  <input type="number" min="0" max="100" value={form.overall_rating || ""} onChange={e => setForm({...form, overall_rating: +e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Hometown</label>
                <input value={form.hometown || ""} onChange={e => setForm({...form, hometown: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={3}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={save} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">Save Player</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}