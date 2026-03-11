import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Users, Filter } from "lucide-react";
import usePullToRefresh, { PullIndicator } from "@/components/hooks/usePullToRefresh";
import PlayerCard from "../components/roster/PlayerCard";
import PlayerForm from "../components/roster/PlayerForm";
import { useSport } from "@/components/SportContext";
import { getSportConfig } from "@/components/SportConfig";
const YEARS = ["Freshman","Sophomore","Junior","Senior","Grad"];
const CAN_EDIT = ["admin","head_coach","athletic_director","associate_head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach"];

export default function Roster() {
  const { activeSport, canEditAll, user: ctxUser, sportFilter } = useSport();
  const cfg = getSportConfig(activeSport);
  const POSITIONS = Object.values(cfg.positions).flat().filter((v, i, a) => a.indexOf(v) === i);
  const UNITS = cfg.units;
  const [players, setPlayers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterPos, setFilterPos] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState(null);

  const load = () => base44.entities.Player.filter({ sport: activeSport }).then(d => { setPlayers(d); setLoading(false); });

  const { refreshing, pullDelta, handlers: pullHandlers } = usePullToRefresh(
    () => base44.entities.Player.filter({ sport: activeSport }).then(d => setPlayers(d))
  );

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, [activeSport]);

  const myRole = user?.coaching_role || user?.role;
  const isHeadCoach = user?.coaching_role === "head_coach" || user?.role === "admin";
  const canEdit = isHeadCoach || canEditAll || CAN_EDIT.includes(myRole) || CAN_EDIT.includes(user?.role);
  // Only head coach and admin can delete players
  const canDelete = isHeadCoach || user?.role === "admin";

  const filtered = players.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    const q = search.toLowerCase();
    return (
      (!q || name.includes(q) || p.position?.toLowerCase().includes(q) || p.number?.includes(q) || p.hometown?.toLowerCase().includes(q)) &&
      (filterUnit === "all" || p.unit === filterUnit) &&
      (filterPos === "all" || p.position === filterPos) &&
      (filterYear === "all" || p.year === filterYear) &&
      (filterStatus === "all" || p.status === filterStatus)
    );
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ status: "active", unit: cfg.units[0], academic_eligible: true, levels: ["Varsity"], secondary_positions: [], sport: activeSport });
    setShowForm(true);
  };
  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setShowForm(true); };

  const save = async () => {
    setShowForm(false);
    if (editing) {
      setPlayers(prev => prev.map(p => p.id === editing.id ? { ...p, ...form } : p));
      await base44.entities.Player.update(editing.id, form);
    } else {
      const tempId = `temp_${Date.now()}`;
      setPlayers(prev => [...prev, { ...form, id: tempId, sport: activeSport }]);
      const created = await base44.entities.Player.create({ ...form, sport: activeSport });
      setPlayers(prev => prev.map(p => p.id === tempId ? created : p));
    }
  };

  const remove = async (id) => {
    if (confirm("Remove this player from the roster?")) {
      setPlayers(prev => prev.filter(p => p.id !== id));
      await base44.entities.Player.delete(id);
    }
  };

  // Stats
  const active = players.filter(p => p.status === "active").length;
  const injured = players.filter(p => p.status === "injured").length;
  const ineligible = players.filter(p => p.academic_eligible === false).length;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6" {...pullHandlers}>
      <PullIndicator delta={pullDelta} refreshing={refreshing} />
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#f97316)22" }}>
            <Users className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white capitalize">{activeSport.replace(/_/g," ")} <span style={{ color: "var(--color-primary,#f97316)" }}>Roster</span></h1>
            <p className="text-gray-500 text-sm">{players.length} players · {active} active · {injured > 0 ? `${injured} injured · ` : ""}{ineligible > 0 ? `${ineligible} ineligible` : ""}</p>
          </div>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <Plus className="w-4 h-4" /> Add Player
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-3 mb-5 space-y-2">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-500 text-xs uppercase tracking-wider">Filter & Search</span>
          {(search || filterUnit !== "all" || filterPos !== "all" || filterYear !== "all" || filterStatus !== "all") && (
            <button onClick={() => { setSearch(""); setFilterUnit("all"); setFilterPos("all"); setFilterYear("all"); setFilterStatus("all"); }}
              className="ml-auto text-xs text-gray-600 hover:text-gray-300 transition-colors">
              Clear filters
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, position, number, hometown..."
              className="w-full bg-[#1e1e1e] border border-gray-700 text-white pl-8 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)]" />
          </div>
          <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
            className="bg-[#1e1e1e] border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)]">
            <option value="all">All Units</option>
            {UNITS.map(u => <option key={u} value={u}>{cfg.unitLabels[u] || u.replace("_", " ")}</option>)}
          </select>
          <select value={filterPos} onChange={e => setFilterPos(e.target.value)}
            className="bg-[#1e1e1e] border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)]">
            <option value="all">All Positions</option>
            {POSITIONS.map(p => <option key={p} value={p}>{cfg.positionLabels[p] || p}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="bg-[#1e1e1e] border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)]">
            <option value="all">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#1e1e1e] border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)]">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="injured">Injured</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <p className="text-gray-600 text-xs">{filtered.length} of {players.length} players</p>
      </div>

      {/* Player List */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-[var(--color-primary,#f97316)] rounded-full animate-spin mx-auto mb-2" />
          Loading roster...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">{players.length === 0 ? "No players yet. Add your first player!" : "No players match your filters."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <PlayerCard
              key={p.id}
              player={p}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onEdit={openEdit}
              onDelete={remove}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}

      {/* Player Form Modal */}
      {showForm && (
        <PlayerForm
          form={form}
          setForm={setForm}
          editing={editing}
          onSave={save}
          onClose={() => setShowForm(false)}
          activeSport={activeSport}
        />
      )}
    </div>
  );
}