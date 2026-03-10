import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AuthGuard from "@/components/AuthGuard";
import SuperAdminView from "@/components/usermgmt/SuperAdminView";
import InviteForm from "@/components/usermgmt/InviteForm";
import PendingInvites from "@/components/usermgmt/PendingInvites";
import {
  Users, Shield, Mail, Edit2, Check, X, UserPlus, Lock, Star,
  Search, Trash2, RefreshCw, Building2, Brain, ChevronDown, ChevronUp
} from "lucide-react";

const ROLES = [
  { value: "athletic_director", label: "Athletic Director" },
  { value: "head_coach", label: "Head Coach" },
  { value: "associate_head_coach", label: "Associate Head Coach" },
  { value: "offensive_coordinator", label: "Offensive Coordinator" },
  { value: "defensive_coordinator", label: "Defensive Coordinator" },
  { value: "special_teams_coordinator", label: "Special Teams Coordinator" },
  { value: "strength_conditioning_coordinator", label: "S&C Coordinator" },
  { value: "position_coach", label: "Position Coach" },
  { value: "trainer", label: "Trainer" },
];

const ALL_POSITIONS = ["QB","RB","FB","WR","TE","OL","DL","LB","CB","S","K","P","LS","DB","DE","DT","NT","OLB","MLB","ILB","SS","FS","LT","LG","C","RG","RT"];
const PHASES = [
  { value: "offense", label: "Offense" },
  { value: "defense", label: "Defense" },
  { value: "special_teams", label: "Special Teams" },
];

const roleColors = {
  admin: "bg-purple-500/20 text-purple-400",
  athletic_director: "bg-yellow-500/20 text-yellow-400",
  head_coach: "bg-blue-500/20 text-blue-400",
  associate_head_coach: "bg-cyan-500/20 text-cyan-400",
  offensive_coordinator: "bg-orange-500/20 text-orange-400",
  defensive_coordinator: "bg-red-500/20 text-red-400",
  special_teams_coordinator: "bg-green-500/20 text-green-400",
  strength_conditioning_coordinator: "bg-emerald-500/20 text-emerald-400",
  position_coach: "bg-gray-500/20 text-gray-400",
  trainer: "bg-teal-500/20 text-teal-400",
};

const SPORT_LABELS = {
  football:"Football", basketball:"Basketball", baseball:"Baseball",
  softball:"Softball", soccer:"Soccer", volleyball:"Volleyball",
  boxing:"Boxing", golf:"Golf", tennis:"Tennis", wrestling:"Wrestling",
  cross_country:"Cross Country", track:"Track", lacrosse:"Lacrosse"
};

function UserManagementContent() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [acDesignating, setAcDesignating] = useState(false);
  const [showMentalReadiness, setShowMentalReadiness] = useState(false);
  const [myReadiness, setMyReadiness] = useState(null);
  const [myReadinessNote, setMyReadinessNote] = useState("");
  const [savingReadiness, setSavingReadiness] = useState(false);

  const loadUsers = (currentUser) => {
    base44.functions.invoke("getTeamUsers").then(res => {
      setAllUsers(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setMyReadiness(u?.mental_readiness || null);
      setMyReadinessNote(u?.mental_readiness_note || "");
      loadUsers(u);
    }).catch(() => setLoading(false));
  }, []);

  const coachRole = user?.coaching_role;
  const isSuperAdmin = user?.role === "super_admin";
  const isAD = coachRole === "athletic_director" || user?.role === "admin";
  const isHeadCoach = coachRole === "head_coach";
  // Only Head Coach and Athletic Director can invite/remove
  const canManageStaff = isSuperAdmin || isAD || isHeadCoach;
  const currentAC = allUsers.find(u => u.is_associate_head_coach);

  if (isSuperAdmin) {
    return <SuperAdminView allUsers={allUsers} loading={loading} onRefresh={() => { setLoading(true); loadUsers(user); }} />;
  }

  if (!canManageStaff) {
    return (
      <div className="bg-[#0a0a0a] min-h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Lock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-white">Access Restricted</p>
          <p className="text-sm mt-1">Athletic Director or Head Coach access required.</p>
        </div>
      </div>
    );
  }

  // AD sees all sports; Head Coach only sees their sport
  const availableSports = isAD
    ? [...new Set(allUsers.flatMap(u => u.assigned_sports || []).filter(Boolean))]
    : (user?.assigned_sports || []);

  // Filter users visible to this coach
  // Head coach only sees staff in their sport
  let visibleUsers = allUsers;
  if (isHeadCoach && !isAD) {
    const mySports = user?.assigned_sports || [];
    visibleUsers = allUsers.filter(u =>
      u.id === user?.id ||
      (u.assigned_sports || []).some(s => mySports.includes(s))
    );
  }

  const filteredUsers = visibleUsers.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.coaching_role?.toLowerCase().includes(q));
    const matchRole = !roleFilter || u.coaching_role === roleFilter;
    const matchSport = !sportFilter || (u.assigned_sports || []).includes(sportFilter);
    return matchSearch && matchRole && matchSport;
  });

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditForm({
      full_name: u.full_name || "",
      coaching_role: u.coaching_role || "position_coach",
      assigned_positions: u.assigned_positions || [],
      assigned_phases: u.assigned_phases || [],
      assigned_sports: u.assigned_sports || ["football"],
    });
  };

  const saveEdit = async (userId) => {
    await base44.entities.User.update(userId, editForm);
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...editForm } : u));
    setEditingId(null);
  };

  const removeFromTeam = async (userId) => {
    if (!window.confirm("Remove this user from your team? They will lose access to your team's data.")) return;
    await base44.entities.User.update(userId, { team_id: null, school_name: null, coaching_role: null });
    setAllUsers(prev => prev.filter(u => u.id !== userId));
  };

  const toggleAC = async (targetUser) => {
    setAcDesignating(true);
    if (currentAC && currentAC.id !== targetUser.id) {
      await base44.entities.User.update(currentAC.id, { is_associate_head_coach: false });
    }
    const newVal = !targetUser.is_associate_head_coach;
    await base44.entities.User.update(targetUser.id, { is_associate_head_coach: newVal });
    setAllUsers(prev => prev.map(u => {
      if (u.id === currentAC?.id && u.id !== targetUser.id) return { ...u, is_associate_head_coach: false };
      if (u.id === targetUser.id) return { ...u, is_associate_head_coach: newVal };
      return u;
    }));
    setAcDesignating(false);
  };

  const saveReadiness = async () => {
    if (!myReadiness) return;
    setSavingReadiness(true);
    await base44.auth.updateMe({ mental_readiness: myReadiness, mental_readiness_note: myReadinessNote, mental_readiness_date: new Date().toISOString().split("T")[0] });
    setSavingReadiness(false);
  };

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#3b82f6)22" }}>
            <Users className="w-5 h-5" style={{ color: "var(--color-primary,#3b82f6)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Staff Management</h1>
            <p className="text-gray-500 text-sm flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {user?.school_name || "Your School"} · {filteredUsers.length} staff
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); loadUsers(user); }} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
            <UserPlus className="w-4 h-4" /> Invite
          </button>
        </div>
      </div>

      {/* Account isolation notice */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          <span className="text-blue-400 font-semibold">Account Isolation Active — </span>
          All data is scoped to <span className="text-white">{user?.school_name || "your school"}</span>.
          {isAD && <span className="text-yellow-400 ml-1">You can view and manage all sports as Athletic Director.</span>}
        </p>
      </div>

      {/* AC Banner */}
      {currentAC && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 flex items-center gap-3">
          <Star className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <p className="text-xs text-gray-300">
            <span className="text-cyan-400 font-semibold">Associate Head Coach: </span>
            {currentAC.full_name || currentAC.email} — coordinator-level access.
          </p>
          {isHeadCoach && (
            <button onClick={() => toggleAC(currentAC)} disabled={acDesignating}
              className="ml-auto text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded border border-gray-700 transition-colors">
              Remove AC
            </button>
          )}
        </div>
      )}

      {/* Invite Form */}
      {showInvite && (
        <InviteForm user={user} onClose={() => setShowInvite(false)} onInvited={() => loadUsers(user)} />
      )}

      {/* Pending Invites */}
      <PendingInvites teamId={user?.team_id} onRevoked={() => loadUsers(user)} />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-white text-sm placeholder-gray-500 outline-none" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2 text-white text-sm outline-none">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {isAD && availableSports.length > 1 && (
          <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
            className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2 text-white text-sm outline-none">
            <option value="">All Sports</option>
            {availableSports.map(s => <option key={s} value={s}>{SPORT_LABELS[s] || s}</option>)}
          </select>
        )}
        {(searchQuery || roleFilter || sportFilter) && (
          <button onClick={() => { setSearchQuery(""); setRoleFilter(""); setSportFilter(""); }}
            className="px-3 py-2 rounded-xl bg-gray-800 text-gray-400 text-xs hover:text-white transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Staff Table */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-[var(--color-primary,#3b82f6)] rounded-full animate-spin mx-auto mb-2" />
            Loading staff...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No staff members found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredUsers.map(u => {
              const isAC = u.is_associate_head_coach;
              const displayRole = u.coaching_role || u.role;
              const isEditing = editingId === u.id;
              return (
                <div key={u.id} className={`flex items-start gap-4 px-5 py-4 transition-colors ${isAC ? "bg-cyan-500/[0.02]" : "hover:bg-white/[0.01]"}`}>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm relative mt-0.5"
                    style={{ backgroundColor: "var(--color-primary,#3b82f6)33", color: "var(--color-primary,#3b82f6)" }}>
                    {(u.full_name || u.email)?.[0]?.toUpperCase()}
                    {isAC && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                        <Star className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                            placeholder="Full name"
                            className="bg-[#1e1e1e] border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm outline-none" />
                          <select value={editForm.coaching_role} onChange={e => setEditForm(p => ({ ...p, coaching_role: e.target.value }))}
                            className="bg-[#1e1e1e] border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm outline-none">
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                        {/* Sports */}
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Sports</p>
                          <div className="flex flex-wrap gap-1">
                            {(user?.assigned_sports || Object.keys(SPORT_LABELS)).map(s => (
                              <button key={s} onClick={() => setEditForm(p => ({
                                ...p,
                                assigned_sports: p.assigned_sports.includes(s) ? p.assigned_sports.filter(x => x !== s) : [...p.assigned_sports, s]
                              }))}
                                className={`px-2 py-0.5 rounded text-xs ${editForm.assigned_sports.includes(s) ? "text-white" : "bg-gray-800 text-gray-500"}`}
                                style={editForm.assigned_sports.includes(s) ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                                {SPORT_LABELS[s] || s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => saveEdit(u.id)} className="px-3 py-1 rounded-lg text-green-400 border border-green-500/30 text-xs hover:bg-green-400/10 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded-lg text-gray-500 border border-gray-700 text-xs hover:bg-gray-700 flex items-center gap-1">
                            <X className="w-3 h-3" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium text-sm">{u.full_name || "—"}</p>
                          {isAC && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-semibold">AC</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[displayRole] || "bg-gray-700 text-gray-400"}`}>
                            {ROLES.find(r => r.value === displayRole)?.label || displayRole?.replace(/_/g, " ") || "—"}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />{u.email}
                        </p>
                        {(u.assigned_sports?.length > 0 || u.assigned_positions?.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {u.assigned_sports?.map(s => <span key={s} className="text-xs bg-purple-500/15 text-purple-400 px-1.5 rounded capitalize">{SPORT_LABELS[s] || s}</span>)}
                            {u.assigned_positions?.map(pos => <span key={pos} className="text-xs bg-blue-500/15 text-blue-400 px-1.5 rounded">{pos}</span>)}
                            {u.assigned_phases?.map(ph => <span key={ph} className="text-xs bg-orange-500/15 text-orange-400 px-1.5 rounded capitalize">{ph.replace("_", " ")}</span>)}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isHeadCoach && displayRole !== "head_coach" && displayRole !== "athletic_director" && (
                        <button onClick={() => toggleAC(u)} disabled={acDesignating} title={isAC ? "Remove AC" : "Designate as AC"}
                          className={`p-1.5 rounded-lg transition-all ${isAC ? "text-cyan-400 bg-cyan-500/10" : "text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/5"}`}>
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeFromTeam(u.id)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mental Readiness */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <p className="text-white text-sm font-semibold">Mental Readiness</p>
          </div>
          {(isHeadCoach || isAD) && (
            <button onClick={() => setShowMentalReadiness(v => !v)} className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
              Team View {showMentalReadiness ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
        <p className="text-gray-500 text-xs">Report your mental readiness daily — visible to Head Coach & AD.</p>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-gray-400 text-xs w-full">My readiness today (1–10):</p>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} onClick={() => setMyReadiness(n)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${myReadiness === n ? "text-white" : "bg-gray-800 text-gray-500"}`}
              style={myReadiness === n ? { backgroundColor: n >= 7 ? "#22c55e" : n >= 4 ? "#f59e0b" : "#ef4444" } : {}}>
              {n}
            </button>
          ))}
        </div>
        <input value={myReadinessNote} onChange={e => setMyReadinessNote(e.target.value)}
          placeholder="Optional note..."
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-xs outline-none" />
        <button onClick={saveReadiness} disabled={savingReadiness || !myReadiness}
          className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-40"
          style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
          {savingReadiness ? "Saving..." : "Submit"}
        </button>
        {(isHeadCoach || isAD) && showMentalReadiness && (
          <div className="pt-3 border-t border-gray-800 space-y-2">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Team Mental Readiness</p>
            {allUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary,#3b82f6)22", color: "var(--color-primary,#3b82f6)" }}>
                  {(u.full_name || u.email)?.[0]?.toUpperCase()}
                </div>
                <span className="text-gray-300 text-xs flex-1 truncate">{u.full_name || u.email}</span>
                {u.mental_readiness != null ? (
                  <div className="flex items-center gap-1">
                    <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${u.mental_readiness * 10}%`, backgroundColor: u.mental_readiness >= 7 ? "#22c55e" : u.mental_readiness >= 4 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                    <span className={`text-xs font-bold ${u.mental_readiness >= 7 ? "text-green-400" : u.mental_readiness >= 4 ? "text-yellow-400" : "text-red-400"}`}>{u.mental_readiness}/10</span>
                  </div>
                ) : <span className="text-gray-700 text-xs">not reported</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserManagement() {
  return (
    <AuthGuard roles={["admin", "super_admin", "head_coach", "athletic_director"]}>
      <UserManagementContent />
    </AuthGuard>
  );
}