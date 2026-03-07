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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkRole, setBulkRole] = useState("");
  const [bulkPositions, setBulkPositions] = useState([]);
  const [bulkPhases, setBulkPhases] = useState([]);
  const [applyingBulk, setApplyingBulk] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      const isSuper = u?.role === "super_admin";
      
      // Fetch all users regardless
      base44.entities.User.list().then(list => {
        if (isSuper) {
          setAllUsers(list.filter(m => m.role !== "super_admin"));
        } else {
          // Non-admins: show everyone on same team OR themselves if no team
          const myTeam = u?.team_id;
          const teamUsers = list.filter(m => 
            m.role !== "super_admin" && 
            (m.team_id === myTeam || m.id === u?.id)
          );
          setAllUsers(teamUsers);
        }
        setLoading(false);
      }).catch((err) => {
        console.error("Error loading users:", err);
        setLoading(false);
      });
    }).catch(() => setLoading(false));
  }, []);

  // Use coaching_role directly — it's the source of truth
  const myCoachingRole = user?.coaching_role;
  const isHeadCoach = myCoachingRole === "head_coach" || myCoachingRole === "athletic_director";

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
  const canManage = isSuperAdmin || CAN_MANAGE.includes(myCoachingRole);
  const canDesignateAC = CAN_DESIGNATE_AC.includes(myCoachingRole);
  const canAddRemoveUsers = isSuperAdmin || ["head_coach", "athletic_director"].includes(myCoachingRole);

  const currentAC = allUsers.find(u => u.is_associate_head_coach);

  const saveRole = async (userId) => {
    // Just save the coaching role — no platform role confusion
    await base44.entities.User.update(userId, {
      coaching_role: editRole,
      assigned_positions: editPositions,
      assigned_phases: editPhases,
    });
    setAllUsers(prev => prev.map(u => u.id === userId
      ? { ...u, coaching_role: editRole, assigned_positions: editPositions, assigned_phases: editPhases }
      : u));
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
    try {
      // Create Invite record with team, role, and positions
      await base44.entities.Invite.create({
        email: inviteEmail.trim(),
        team_id: user?.team_id,
        coaching_role: inviteRole,
        assigned_positions: [],
        assigned_phases: [],
        status: "pending",
        invited_by: user?.email
      });
      // Send Base44 invite (requires admin role for platform access)
      await base44.users.inviteUser(inviteEmail.trim(), "admin");
      setInviteMsg({ text: `Invitation sent to ${inviteEmail}`, type: "success" });
      setInviteEmail("");
    } catch (err) {
      setInviteMsg({ text: `Error: ${err.message}`, type: "error" });
    }
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
            <p className="text-sm">No staff members found.</p>
            {!["head_coach", "athletic_director"].includes(myCoachingRole) && (
              <p className="text-xs text-gray-700 mt-2 max-w-xs mx-auto">
                Staff visibility requires Head Coach or Athletic Director role. Ask your administrator to update your coaching role.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {allUsers.map(u => {
              const isAC = u.is_associate_head_coach;
              const displayRole = u.coaching_role || u.role;
              const effectiveRole = isAC && displayRole !== "head_coach" ? `${displayRole} (AC)` : displayRole;
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium text-sm">{u.full_name || "—"}</p>
                      {isAC && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-semibold">AC</span>}
                      {u.mental_readiness != null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${u.mental_readiness >= 7 ? "bg-green-500/20 text-green-400" : u.mental_readiness >= 4 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                          🧠 {u.mental_readiness}/10
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />{u.email}
                    </p>
                    {u.assigned_positions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.assigned_positions.map(pos => <span key={pos} className="text-xs bg-blue-500/15 text-blue-400 px-1.5 py-0 rounded">{pos}</span>)}
                        {u.assigned_phases?.map(ph => <span key={ph} className="text-xs bg-orange-500/15 text-orange-400 px-1.5 py-0 rounded capitalize">{ph}</span>)}
                      </div>
                    )}
                  </div>

                  {editingId === u.id ? (
                    <div className="flex flex-col gap-2 flex-shrink-0 max-w-xs w-full">
                      <select value={editRole} onChange={e => setEditRole(e.target.value)} className="bg-[#1e1e1e] border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs outline-none w-full">
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      {(editRole === "position_coach" || editRole === "offensive_coordinator" || editRole === "defensive_coordinator") && (
                        <>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Assigned Positions</p>
                            <div className="flex flex-wrap gap-1">
                              {ALL_POSITIONS.map(pos => (
                                <button key={pos} onClick={() => setEditPositions(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos])}
                                  className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all ${editPositions.includes(pos) ? "text-white" : "bg-gray-800 text-gray-500"}`}
                                  style={editPositions.includes(pos) ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                                  {pos}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Phases of Game</p>
                            <div className="flex gap-1">
                              {PHASES.map(ph => (
                                <button key={ph.value} onClick={() => setEditPhases(prev => prev.includes(ph.value) ? prev.filter(p => p !== ph.value) : [...prev, ph.value])}
                                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${editPhases.includes(ph.value) ? "text-white" : "bg-gray-800 text-gray-500"}`}
                                  style={editPhases.includes(ph.value) ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                                  {ph.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      <div className="flex gap-1">
                        <button onClick={() => saveRole(u.id)} className="flex-1 py-1 rounded-lg text-green-400 border border-green-500/30 text-xs hover:bg-green-400/10 flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="flex-1 py-1 rounded-lg text-gray-500 border border-gray-700 text-xs hover:bg-gray-700 flex items-center justify-center gap-1">
                          <X className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[displayRole] || "bg-gray-700 text-gray-400"}`}>
                        {ROLES.find(r => r.value === displayRole)?.label || displayRole?.replace(/_/g, " ") || "—"}
                      </span>

                      {/* AC toggle — Head Coach only, for non-HC staff */}
                      {canDesignateAC && displayRole !== "head_coach" && displayRole !== "athletic_director" && (
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
                            onClick={() => { setEditingId(u.id); setEditRole(displayRole || "position_coach"); setEditPositions(u.assigned_positions || []); setEditPhases(u.assigned_phases || []); }}
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

      {/* My Mental Readiness */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <p className="text-white text-sm font-semibold">Mental Readiness</p>
          </div>
          {isHeadCoach && (
            <button onClick={() => setShowMentalReadiness(v => !v)} className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
              Team View {showMentalReadiness ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
        <p className="text-gray-500 text-xs">Report your mental readiness daily — visible to Head Coach.</p>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-gray-400 text-xs w-full">My readiness today (1-10):</p>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} onClick={() => setMyReadiness(n)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${myReadiness === n ? "text-white" : "bg-gray-800 text-gray-500"}`}
              style={myReadiness === n ? { backgroundColor: n >= 7 ? "#22c55e" : n >= 4 ? "#f59e0b" : "#ef4444" } : {}}>
              {n}
            </button>
          ))}
        </div>
        <input value={myReadinessNote} onChange={e => setMyReadinessNote(e.target.value)} placeholder="Optional note..." className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-xs outline-none" />
        <button onClick={saveReadiness} disabled={savingReadiness || !myReadiness} className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-40" style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
          {savingReadiness ? "Saving..." : "Submit"}
        </button>

        {/* Head Coach Team View */}
        {isHeadCoach && showMentalReadiness && (
          <div className="pt-3 border-t border-gray-800">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Full Team Mental Readiness</p>
            {allUsers.length === 0 ? <p className="text-gray-600 text-xs">No data yet.</p> : (
              <div className="space-y-1.5">
                {allUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#3b82f6)22", color: "var(--color-primary,#3b82f6)" }}>
                      {(u.full_name || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-gray-300 text-xs flex-1 truncate">{u.full_name || u.email}</span>
                    <span className="text-gray-600 text-xs capitalize">{u.role?.replace(/_/g, " ")}</span>
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
                <p className="text-gray-600 text-xs mt-2">
                  Avg: {allUsers.filter(u => u.mental_readiness != null).length > 0
                    ? (allUsers.filter(u => u.mental_readiness != null).reduce((s, u) => s + u.mental_readiness, 0) / allUsers.filter(u => u.mental_readiness != null).length).toFixed(1)
                    : "—"}/10 · {allUsers.filter(u => u.mental_readiness != null).length} of {allUsers.length} reported
                </p>
              </div>
            )}
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