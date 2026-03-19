import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Users, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import usePullToRefresh, { PullIndicator } from "@/components/hooks/usePullToRefresh";
import PlayerCard from "../components/roster/PlayerCard";
import PlayerForm from "../components/roster/PlayerForm";
import { useSport } from "@/components/SportContext";
import { getSportConfig } from "@/components/SportConfig";
import { useOptimisticList } from "@/components/hooks/useOptimisticList";
const YEARS = ["Freshman","Sophomore","Junior","Senior","Grad"];
const CAN_EDIT = ["admin","head_coach","athletic_director","associate_head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach"];

export default function Roster() {
  const { activeSport, canEditAll, user: ctxUser, sportFilter, isSuperAdmin } = useSport();
  const cfg = getSportConfig(activeSport);
  const POSITIONS = Object.values(cfg.positions).flat().filter((v, i, a) => a.indexOf(v) === i);
  const UNITS = cfg.units;
  const { items: players, setItems: setPlayers, addOptimistic, updateOptimistic, removeOptimistic } = useOptimisticList([]);
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
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  const load = () => {
    // Always scope to user's team_id to prevent cross-org data leakage
    const filter = { sport: activeSport };
    if (ctxUser?.team_id) filter.team_id = ctxUser.team_id;
    base44.entities.Player.filter(filter).then(d => { setPlayers(d); setLoading(false); });
  };

  const { refreshing, pullDelta, handlers: pullHandlers } = usePullToRefresh(load);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [activeSport, ctxUser?.team_id]);

  useEffect(() => {
    if (isSuperAdmin) {
      setSchoolsLoading(true);
      base44.functions.invoke("listAllSchools").then(res => {
        setSchools(res.data?.schools || []);
        setSchoolsLoading(false);
      }).catch(() => setSchoolsLoading(false));
    }
  }, [isSuperAdmin]);

  const myRole = user?.coaching_role || user?.role;
  const isHeadCoach = user?.coaching_role === "head_coach" || user?.role === "admin";
  const canEdit = isSuperAdmin || isHeadCoach || canEditAll || CAN_EDIT.includes(myRole) || CAN_EDIT.includes(user?.role);
  // Only head coach, admin, and super admin can delete players
  const canDelete = isSuperAdmin || isHeadCoach || user?.role === "admin";

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
    const scopedPlayerPayload = {
      ...form,
      sport: activeSport,
      team_id: ctxUser?.team_id || form.team_id || null,
      school_id: ctxUser?.school_id || form.school_id || null,
      school_code: ctxUser?.school_code || form.school_code || null,
    };

    if (editing) {
      const previous = players.find(p => p.id === editing.id);
      updateOptimistic(editing.id, scopedPlayerPayload);
      try {
        await base44.entities.Player.update(editing.id, scopedPlayerPayload);
      } catch {
        if (previous) {
          updateOptimistic(editing.id, previous);
        }
      }
    } else {
      const tempId = addOptimistic(scopedPlayerPayload);
      try {
        const created = await base44.entities.Player.create(scopedPlayerPayload);
        updateOptimistic(tempId, created);

        // Send player an email invitation if contact_email is provided
        if (scopedPlayerPayload.contact_email?.trim() && scopedPlayerPayload.first_name?.trim() && scopedPlayerPayload.last_name?.trim()) {
          try {
            const schoolName = ctxUser?.school_name
              || schools.find(s => s.id === scopedPlayerPayload.school_id)?.school_name
              || null;
            await base44.functions.invoke("sendInvite", {
              email: scopedPlayerPayload.contact_email.trim(),
              team_id: scopedPlayerPayload.team_id,
              school_id: scopedPlayerPayload.school_id,
              school_name: schoolName,
              school_code: scopedPlayerPayload.school_code,
              first_name: scopedPlayerPayload.first_name.trim(),
              last_name: scopedPlayerPayload.last_name.trim(),
              assigned_sports: [activeSport],
              assigned_positions: [],
              assigned_phases: [],
              invite_type: "player",
            });
          } catch (inviteErr) {
            console.warn(`Player invite failed for ${scopedPlayerPayload.contact_email} (player was created):`, inviteErr?.message);
          }
        }
      } catch {
        removeOptimistic(tempId);
      }
    }
  };

  const remove = async (id) => {
    if (confirm("Remove this player from the roster?")) {
      removeOptimistic(id);
      try {
        await base44.entities.Player.delete(id);
      } catch {
        load();
      }
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
          <Select value={filterUnit} onValueChange={setFilterUnit}>
            <SelectTrigger className="bg-[#1e1e1e] border-gray-700 text-gray-300 w-32">
              <SelectValue placeholder="All Units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {UNITS.map(u => <SelectItem key={u} value={u}>{cfg.unitLabels[u] || u.replace("_"," ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPos} onValueChange={setFilterPos}>
            <SelectTrigger className="bg-[#1e1e1e] border-gray-700 text-gray-300 w-36">
              <SelectValue placeholder="All Positions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {POSITIONS.map(p => <SelectItem key={p} value={p}>{cfg.positionLabels[p] || p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="bg-[#1e1e1e] border-gray-700 text-gray-300 w-32">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-[#1e1e1e] border-gray-700 text-gray-300 w-32">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="injured">Injured</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
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
          isSuperAdmin={isSuperAdmin}
          schools={schools}
          schoolsLoading={schoolsLoading}
        />
      )}
    </div>
  );
}