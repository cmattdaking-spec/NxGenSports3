import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Shield, Mail, Edit2, Check, X, UserPlus, Lock, Star, AlertTriangle, Building2, Brain, ChevronDown, ChevronUp } from "lucide-react";

const ALL_POSITIONS = ["QB","RB","FB","WR","TE","OL","DL","LB","CB","S","K","P","LS","DB","DE","DT","NT","OLB","MLB","ILB","SS","FS","LT","LG","C","RG","RT"];
const PHASES = [
  { value: "offense", label: "Offense" },
  { value: "defense", label: "Defense" },
  { value: "special_teams", label: "Special Teams" },
];

const ROLES = [
  { value: "athletic_director", label: "Athletic Director" },
  { value: "head_coach", label: "Head Coach" },
  { value: "associate_head_coach", label: "Associate Head Coach" },
  { value: "offensive_coordinator", label: "Offensive Coordinator" },
  { value: "defensive_coordinator", label: "Defensive Coordinator" },
  { value: "special_teams_coordinator", label: "Special Teams Coordinator" },
  { value: "strength_conditioning_coordinator", label: "Strength & Conditioning Coordinator" },
  { value: "position_coach", label: "Position Coach" },
  { value: "trainer", label: "Trainer" },
];

const SUPER_ADMIN_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "head_coach", label: "Head Coach" },
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

// Who can add/remove users
const CAN_MANAGE = ["admin", "head_coach", "athletic_director"];
// Who can designate the Associate Head Coach
const CAN_DESIGNATE_AC = ["head_coach", "admin"];

export default function UserManagement() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editPositions, setEditPositions] = useState([]);
  const [editPhases, setEditPhases] = useState([]);
  const [mentalReadiness, setMentalReadiness] = useState([]);
  const [showMentalReadiness, setShowMentalReadiness] = useState(false);
  const [myReadiness, setMyReadiness] = useState(null);
  const [myReadinessNote, setMyReadinessNote] = useState("");
  const [savingReadiness, setSavingReadiness] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("position_coach");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState({ text: "", type: "success" });
  const [acDesignating, setAcDesignating] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      const isSuper = u?.role === "super_admin";
      if (!isSuper && !CAN_MANAGE.includes(u?.role)) return setLoading(false);
      base44.entities.User.list().then(list => {
        if (isSuper) {
          // Super admin sees all users but cannot access team data — just user records
          setAllUsers(list.filter(m => m.role !== "super_admin"));
        } else {
          const teamId = u.team_id;
          const filtered = teamId ? list.filter(m => m.team_id === teamId || !m.team_id) : list;
          setAllUsers(filtered);
        }
        setLoading(false);
      });
    }).catch(() => setLoading(false));
  }, []);

  const isHeadCoach = user?.role === "head_coach" || user?.role === "admin";

  // Load mental readiness data for head coach view
  useEffect(() => {
    if (!user || !isHeadCoach) return;
    base44.entities.User.list().then(list => {
      setMentalReadiness(list.filter(u => u.mental_readiness != null));
    }).catch(() => {});
  }, [user]);

  // Load my own readiness
  useEffect(() => {
    if (!user) return;
    setMyReadiness(user.mental_readiness || null);
    setMyReadinessNote(user.mental_readiness_note || "");
  }, [user]);

  const saveReadiness = async () => {
    if (!myReadiness) return;
    setSavingReadiness(true);
    await base44.auth.updateMe({ mental_readiness: myReadiness, mental_readiness_note: myReadinessNote, mental_readiness_date: new Date().toISOString().split("T")[0] });
    setSavingReadiness(false);
  };

  const isSuperAdmin = user?.role === "super_admin";
  const canManage = isSuperAdmin || CAN_MANAGE.includes(user?.role);
  const canDesignateAC = CAN_DESIGNATE_AC.includes(user?.role);
  const canAddRemoveUsers = isSuperAdmin || ["admin", "head_coach", "athletic_director"].includes(user?.role);

  const currentAC = allUsers.find(u => u.is_associate_head_coach);

  const saveRole = async (userId) => {
    await base44.entities.User.update(userId, { role: editRole, assigned_positions: editPositions, assigned_phases: editPhases });
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: editRole, assigned_positions: editPositions, assigned_phases: editPhases } : u));
    setEditingId(null);
  };

  const toggleAC = async (targetUser) => {
    if (!canDesignateAC) return;
    setAcDesignating(true);
    // Remove AC from current if exists
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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg({ text: "", type: "success" });
    await base44.users.inviteUser(inviteEmail.trim(), inviteRole === "admin" ? "admin" : "user");
    setInviteMsg({ text: `Invitation sent to ${inviteEmail}`, type: "success" });
    setInviteEmail("");
    setInviting(false);
    setTimeout(() => setInviteMsg({ text: "", type: "" }), 4000);
  };

  if (!canManage) {
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

  if (isSuperAdmin) {
    // Group users by team_id
    const teams = allUsers.reduce((acc, u) => {
      const tid = u.team_id || "(no team)";
      if (!acc[tid]) acc[tid] = { team_id: tid, school_name: u.school_name || tid, members: [] };
      acc[tid].members.push(u);
      return acc;
    }, {});
    const teamList = Object.values(teams);

    return (
      <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Team <span style={{ color: "var(--color-primary,#f97316)" }}>Management</span></h1>
            <p className="text-gray-500 text-sm">{teamList.length} teams · {allUsers.length} total users</p>
          </div>
          <button onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <UserPlus className="w-4 h-4" /> Add Team
          </button>
        </div>

        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 flex items-start gap-3">
          <Shield className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400">
            <span className="text-purple-400 font-semibold">Super Admin Mode. </span>
            You can add teams and manage platform access. You cannot view any team's data.
          </p>
        </div>

        {showInvite && (
          <div className="bg-[#141414] border border-gray-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} /> Add New Team
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Admin Email</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="headcoach@school.edu"
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                  {SUPER_ADMIN_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            {inviteMsg.text && <p className={`text-sm ${inviteMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>{inviteMsg.text}</p>}
            <div className="flex gap-2">
              <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                {inviting ? "Sending..." : "Send Invitation"}
              </button>
              <button onClick={() => setShowInvite(false)} className="px-5 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-6 h-6 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
              Loading teams...
            </div>
          ) : teamList.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No teams yet. Add the first team.</p>
            </div>
          ) : teamList.map(team => (
            <div key={team.team_id} className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-white font-semibold">{team.school_name}</span>
                  <span className="text-gray-600 text-xs">·  {team.members.length} users</span>
                </div>
                <span className="text-gray-700 text-xs font-mono">{team.team_id}</span>
              </div>
              <div className="divide-y divide-gray-800/50">
                {team.members.map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" }}>
                      {(u.full_name || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{u.full_name || "—"}</p>
                      <p className="text-gray-500 text-xs">{u.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[u.role] || "bg-gray-700 text-gray-400"}`}>
                      {ROLES.find(r => r.value === u.role)?.label || u.role?.replace(/_/g, " ") || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

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
              {user?.school_name || "Your School"} · {allUsers.length} staff members
            </p>
          </div>
        </div>
        {canAddRemoveUsers && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}
          >
            <UserPlus className="w-4 h-4" /> Invite Staff
          </button>
        )}
      </div>

      {/* Security notice */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-400">
          <span className="text-blue-400 font-semibold">Account Isolation Active. </span>
          All data is scoped to your school account. Only the Athletic Director and Head Coach can add or remove staff and players.
          {canDesignateAC && <span className="text-cyan-400 ml-1">You can designate 1 Associate Head Coach with coordinator-level access.</span>}
        </div>
      </div>

      {/* AC Designation Banner */}
      {currentAC && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 flex items-center gap-3">
          <Star className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <p className="text-xs text-gray-300">
            <span className="text-cyan-400 font-semibold">Associate Head Coach: </span>
            {currentAC.full_name || currentAC.email} — has coordinator-level access.
          </p>
          {canDesignateAC && (
            <button onClick={() => toggleAC(currentAC)} disabled={acDesignating}
              className="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded border border-gray-700 hover:border-red-500/30">
              Remove AC
            </button>
          )}
        </div>
      )}

      {/* Invite Form */}
      {showInvite && canAddRemoveUsers && (
        <div className="bg-[#141414] border border-gray-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} />
            <h3 className="text-white font-semibold">Invite New Staff Member</h3>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-300 text-xs">Only Athletic Director and Head Coach can invite staff. Invited users will be added to your school account only.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleInvite()}
                placeholder="coach@school.edu"
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)]"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[var(--color-primary,#3b82f6)]"
              >
                {ROLES.filter(r => r.value !== "admin").map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          {inviteMsg.text && (
            <p className={`text-sm ${inviteMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>{inviteMsg.text}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}
            >
              {inviting ? "Sending..." : "Send Invitation"}
            </button>
            <button onClick={() => setShowInvite(false)} className="px-5 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <p className="text-gray-400 text-xs uppercase tracking-wider">Staff Members</p>
          <div className="flex items-center gap-1 text-gray-600 text-xs">
            <Lock className="w-3 h-3" />
            <span>Account-isolated</span>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-[var(--color-primary,#3b82f6)] rounded-full animate-spin mx-auto mb-2" />
            Loading staff...
          </div>
        ) : allUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No staff members yet. Invite someone to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {allUsers.map(u => {
              const isAC = u.is_associate_head_coach;
              const effectiveRole = isAC && u.role !== "head_coach" ? `${u.role} (AC)` : u.role;
              return (
                <div key={u.id} className={`flex items-center gap-4 px-5 py-4 transition-colors ${isAC ? "bg-cyan-500/3" : ""}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm relative"
                    style={{ backgroundColor: "var(--color-primary,#3b82f6)33" }}>
                    <span style={{ color: "var(--color-primary,#3b82f6)" }}>{(u.full_name || u.email)?.[0]?.toUpperCase()}</span>
                    {isAC && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                        <Star className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">{u.full_name || "—"}</p>
                      {isAC && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-semibold">AC</span>}
                    </div>
                    <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />{u.email}
                    </p>
                  </div>

                  {editingId === u.id ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value)}
                        className="bg-[#1e1e1e] border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs outline-none"
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <button onClick={() => saveRole(u.id)} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-700 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[u.role] || "bg-gray-700 text-gray-400"}`}>
                        {ROLES.find(r => r.value === u.role)?.label || u.role?.replace(/_/g, " ") || "—"}
                      </span>

                      {/* AC toggle — Head Coach only, for non-HC staff */}
                      {canDesignateAC && u.role !== "head_coach" && u.role !== "athletic_director" && (
                        <button
                          onClick={() => toggleAC(u)}
                          disabled={acDesignating}
                          title={isAC ? "Remove Associate Head Coach" : "Designate as Associate Head Coach"}
                          className={`p-1.5 rounded-lg transition-all ${isAC ? "text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20" : "text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/5"}`}
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canAddRemoveUsers && (
                        <button
                          onClick={() => { setEditingId(u.id); setEditRole(u.role || "position_coach"); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permission summary */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="w-3 h-3" /> Permission Levels
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {[
            { role: "Athletic Director / Head Coach", perms: "Full access — manage staff, players, all data", color: "text-yellow-400" },
            { role: "Associate Head Coach (AC)", perms: "Coordinator-level access when designated by Head Coach", color: "text-cyan-400" },
            { role: "Coordinators + S&C Coordinator", perms: "Playbook, Game Plans, Scouting, Practice, Analytics", color: "text-orange-400" },
            { role: "Position Coach / Trainer", perms: "View roster, health, analytics — no admin access", color: "text-gray-400" },
          ].map(({ role, perms, color }) => (
            <div key={role} className="flex items-start gap-2 p-2 bg-[#1a1a1a] rounded-lg">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${color.replace("text-", "bg-")}`} />
              <div>
                <p className={`font-semibold ${color}`}>{role}</p>
                <p className="text-gray-500 mt-0.5">{perms}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}