import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Users, Shield, Mail, Edit2, Check, X, UserPlus, Lock, Star,
  AlertTriangle, Building2, Brain, ChevronDown, ChevronUp, Plus,
  Search, Trash2, RefreshCw
} from "lucide-react";

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
const CAN_MANAGE = ["admin", "head_coach", "athletic_director"];
const CAN_DESIGNATE_AC = ["head_coach", "admin"];

// ─── Super Admin View ─────────────────────────────────────────────────────────
function SuperAdminView({ allUsers, loading, onRefresh }) {
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [form, setForm] = useState({ email: "", school_name: "", team_id: "", coaching_role: "head_coach" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({});
  const [savingUser, setSavingUser] = useState(false);

  const teams = allUsers.reduce((acc, u) => {
    const tid = u.team_id || "(no team)";
    if (!acc[tid]) acc[tid] = { team_id: tid, school_name: u.school_name || tid, members: [] };
    acc[tid].members.push(u);
    return acc;
  }, {});
  const teamList = Object.values(teams).filter(t =>
    t.school_name?.toLowerCase().includes(teamSearch.toLowerCase()) ||
    t.team_id?.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const allTeamIds = [...new Set(allUsers.map(u => u.team_id).filter(Boolean))];

  const startEditUser = (u) => {
    setEditingUser(u.id);
    setEditUserForm({
      full_name: u.full_name || "",
      coaching_role: u.coaching_role || "position_coach",
      team_id: u.team_id || "",
      school_name: u.school_name || "",
    });
  };

  const saveEditUser = async (userId) => {
    setSavingUser(true);
    await base44.entities.User.update(userId, editUserForm);
    setEditingUser(null);
    setSavingUser(false);
    // trigger re-render via parent reload
    onRefresh?.();
  };

  const handleAddTeam = async () => {
    if (!form.email.trim() || !form.school_name.trim()) return;
    setSubmitting(true);
    setMsg({ text: "", type: "" });
    try {
      const generatedTeamId = form.team_id.trim() || form.school_name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      await base44.entities.Invite.create({
        email: form.email.trim(),
        team_id: generatedTeamId,
        coaching_role: form.coaching_role,
        assigned_positions: [],
        assigned_phases: [],
        status: "pending",
        invited_by: "super_admin",
      });
      await base44.users.inviteUser(form.email.trim(), "admin");
      setMsg({ text: `Team "${form.school_name}" created and invitation sent to ${form.email}`, type: "success" });
      setForm({ email: "", school_name: "", team_id: "", coaching_role: "head_coach" });
      setShowAddTeam(false);
    } catch (err) {
      setMsg({ text: `Error: ${err.message}`, type: "error" });
    }
    setSubmitting(false);
    setTimeout(() => setMsg({ text: "", type: "" }), 5000);
  };

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">
            Team <span style={{ color: "var(--color-primary,#f97316)" }}>Management</span>
          </h1>
          <p className="text-gray-500 text-sm">{teamList.length} teams · {allUsers.length} total users</p>
        </div>
        <button onClick={() => setShowAddTeam(!showAddTeam)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          <Plus className="w-4 h-4" /> Add Team
        </button>
      </div>

      {/* Super Admin Badge */}
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          <span className="text-purple-400 font-semibold">Super Admin Mode — </span>
          Create teams, invite administrators, and oversee all school accounts. Each team is fully isolated.
        </p>
      </div>

      {/* Global message */}
      {msg.text && (
        <div className={`rounded-xl p-3 text-sm ${msg.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Add Team Form */}
      {showAddTeam && (
        <div className="bg-[#141414] border border-gray-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
              Add New Team / School
            </h3>
            <button onClick={() => setShowAddTeam(false)} className="text-gray-600 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">School / Program Name <span className="text-red-400">*</span></label>
              <input type="text" value={form.school_name} onChange={e => setForm(p => ({ ...p, school_name: e.target.value }))}
                placeholder="e.g. Westview High School"
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#f97316)]" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">
                Team ID <span className="text-gray-600">(auto-generated if blank)</span>
              </label>
              <input type="text" value={form.team_id} onChange={e => setForm(p => ({ ...p, team_id: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                placeholder="e.g. westview_hs"
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#f97316)] font-mono" />
              {form.school_name && !form.team_id && (
                <p className="text-gray-600 text-xs mt-1">
                  Will be: <span className="font-mono text-gray-500">{form.school_name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}</span>
                </p>
              )}
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Admin / Head Coach Email <span className="text-red-400">*</span></label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="headcoach@school.edu"
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#f97316)]" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Their Role</label>
              <select value={form.coaching_role} onChange={e => setForm(p => ({ ...p, coaching_role: e.target.value }))}
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[var(--color-primary,#f97316)]">
                <option value="head_coach">Head Coach</option>
                <option value="athletic_director">Athletic Director</option>
              </select>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-300 text-xs">
              An invitation will be sent to the admin email. Once accepted, they will be enrolled into the team with the selected role and can invite their own staff.
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={handleAddTeam} disabled={submitting || !form.email.trim() || !form.school_name.trim()}
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              {submitting ? "Creating..." : "Create Team & Send Invite"}
            </button>
            <button onClick={() => setShowAddTeam(false)} className="px-5 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Team Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={teamSearch} onChange={e => setTeamSearch(e.target.value)}
          placeholder="Search teams by name or ID..."
          className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-[var(--color-primary,#f97316)]" />
      </div>

      {/* Team List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
            Loading teams...
          </div>
        ) : teamList.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No teams found.</p>
          </div>
        ) : teamList.map(team => (
          <div key={team.team_id} className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedTeam(expandedTeam === team.team_id ? null : team.team_id)}
              className="w-full px-5 py-3 border-b border-gray-800 flex items-center justify-between hover:bg-white/2 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#f97316)22" }}>
                  <Building2 className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">{team.school_name}</p>
                  <p className="text-gray-600 text-xs font-mono">{team.team_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
                {expandedTeam === team.team_id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </button>
            {expandedTeam === team.team_id && (
              <div className="divide-y divide-gray-800/50">
                {team.members.map(u => {
                  const dispRole = u.coaching_role || u.role;
                  const isEditing = editingUser === u.id;
                  return (
                    <div key={u.id} className="px-5 py-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-gray-500 text-xs mb-0.5 block">Name</label>
                              <input value={editUserForm.full_name} onChange={e => setEditUserForm(p => ({ ...p, full_name: e.target.value }))}
                                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
                            </div>
                            <div>
                              <label className="text-gray-500 text-xs mb-0.5 block">Role</label>
                              <select value={editUserForm.coaching_role} onChange={e => setEditUserForm(p => ({ ...p, coaching_role: e.target.value }))}
                                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none">
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-gray-500 text-xs mb-0.5 block">Team ID</label>
                              <input value={editUserForm.team_id} onChange={e => setEditUserForm(p => ({ ...p, team_id: e.target.value }))}
                                list="team-ids-list"
                                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none font-mono" />
                              <datalist id="team-ids-list">
                                {allTeamIds.map(tid => <option key={tid} value={tid} />)}
                              </datalist>
                            </div>
                            <div>
                              <label className="text-gray-500 text-xs mb-0.5 block">School Name</label>
                              <input value={editUserForm.school_name} onChange={e => setEditUserForm(p => ({ ...p, school_name: e.target.value }))}
                                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => saveEditUser(u.id)} disabled={savingUser}
                              className="px-3 py-1 rounded-lg text-green-400 border border-green-500/30 text-xs hover:bg-green-400/10 flex items-center gap-1 disabled:opacity-50">
                              <Check className="w-3 h-3" /> {savingUser ? "Saving..." : "Save"}
                            </button>
                            <button onClick={() => setEditingUser(null)}
                              className="px-3 py-1 rounded-lg text-gray-500 border border-gray-700 text-xs hover:bg-gray-700 flex items-center gap-1">
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" }}>
                            {(u.full_name || u.email)?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm">{u.full_name || "—"}</p>
                            <p className="text-gray-500 text-xs">{u.email}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[dispRole] || "bg-gray-700 text-gray-400"}`}>
                            {ROLES.find(r => r.value === dispRole)?.label || dispRole?.replace(/_/g, " ") || "—"}
                          </span>
                          {u.is_associate_head_coach && (
                            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">AC</span>
                          )}
                          <button onClick={() => startEditUser(u)}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-gray-700 transition-all flex-shrink-0">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Staff Invite Form ────────────────────────────────────────────────────────
function InviteForm({ user, onClose, onInvited }) {
  const [form, setForm] = useState({
    email: "",
    coaching_role: "position_coach",
    positions: [],
    phases: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const showPositions = ["position_coach", "offensive_coordinator", "defensive_coordinator"].includes(form.coaching_role);

  const handleInvite = async () => {
    if (!form.email.trim()) return;
    setSubmitting(true);
    setMsg({ text: "", type: "" });
    try {
      await base44.entities.Invite.create({
        email: form.email.trim(),
        team_id: user?.team_id,
        coaching_role: form.coaching_role,
        assigned_positions: form.positions,
        assigned_phases: form.phases,
        status: "pending",
        invited_by: user?.email,
      });
      await base44.users.inviteUser(form.email.trim(), "admin");
      setMsg({ text: `Invitation sent to ${form.email}`, type: "success" });
      onInvited?.();
      setTimeout(() => { setMsg({ text: "", type: "" }); onClose(); }, 2500);
    } catch (err) {
      setMsg({ text: `Error: ${err.message}`, type: "error" });
    }
    setSubmitting(false);
  };

  const togglePos = (pos) => setForm(p => ({ ...p, positions: p.positions.includes(pos) ? p.positions.filter(x => x !== pos) : [...p.positions, pos] }));
  const togglePhase = (ph) => setForm(p => ({ ...p, phases: p.phases.includes(ph) ? p.phases.filter(x => x !== ph) : [...p.phases, ph] }));

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} />
          Invite Staff Member
        </h3>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300"><X className="w-4 h-4" /></button>
      </div>

      {/* School context */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
        <Building2 className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-gray-400 text-xs">Inviting to: </span>
        <span className="text-white text-xs font-semibold">{user?.school_name || "Your School"}</span>
        <span className="text-gray-600 text-xs font-mono ml-1">({user?.team_id || "no team"})</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Email Address <span className="text-red-400">*</span></label>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleInvite()}
            placeholder="coach@school.edu"
            className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)]" />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Coaching Role <span className="text-red-400">*</span></label>
          <select value={form.coaching_role} onChange={e => setForm(p => ({ ...p, coaching_role: e.target.value, positions: [], phases: [] }))}
            className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[var(--color-primary,#3b82f6)]">
            {ROLES.filter(r => r.value !== "admin").map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Role badge preview */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">Role preview:</span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[form.coaching_role] || "bg-gray-700 text-gray-400"}`}>
          {ROLES.find(r => r.value === form.coaching_role)?.label}
        </span>
      </div>

      {/* Positions (conditional) */}
      {showPositions && (
        <div>
          <label className="text-gray-400 text-xs mb-2 block">Assigned Positions <span className="text-gray-600">(optional)</span></label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_POSITIONS.map(pos => (
              <button key={pos} onClick={() => togglePos(pos)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${form.positions.includes(pos) ? "text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"}`}
                style={form.positions.includes(pos) ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Phases */}
      <div>
        <label className="text-gray-400 text-xs mb-2 block">Phases of Game <span className="text-gray-600">(optional)</span></label>
        <div className="flex gap-2">
          {PHASES.map(ph => (
            <button key={ph.value} onClick={() => togglePhase(ph.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${form.phases.includes(ph.value) ? "text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"}`}
              style={form.phases.includes(ph.value) ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
              {ph.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-yellow-300 text-xs">
          The invited staff member will be automatically enrolled into <strong>{user?.school_name || "your school"}</strong> with the selected role when they accept.
        </p>
      </div>

      {msg.text && (
        <p className={`text-sm ${msg.type === "success" ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
      )}

      <div className="flex gap-2">
        <button onClick={handleInvite} disabled={submitting || !form.email.trim()}
          className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
          style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
          {submitting ? "Sending..." : "Send Invitation"}
        </button>
        <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function UserManagement() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editPositions, setEditPositions] = useState([]);
  const [editPhases, setEditPhases] = useState([]);
  const [showMentalReadiness, setShowMentalReadiness] = useState(false);
  const [myReadiness, setMyReadiness] = useState(null);
  const [myReadinessNote, setMyReadinessNote] = useState("");
  const [savingReadiness, setSavingReadiness] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [acDesignating, setAcDesignating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkRole, setBulkRole] = useState("");
  const [bulkPositions, setBulkPositions] = useState([]);
  const [bulkPhases, setBulkPhases] = useState([]);
  const [applyingBulk, setApplyingBulk] = useState(false);

  const loadUsers = (currentUser) => {
    const isSuper = currentUser?.role === "super_admin";
    base44.entities.User.list().then(list => {
      if (isSuper) {
        setAllUsers(list.filter(m => m.role !== "super_admin"));
      } else {
        const myTeam = currentUser?.team_id;
        setAllUsers(list.filter(m => m.role !== "super_admin" && (m.team_id === myTeam || m.id === currentUser?.id)));
      }
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

  const myCoachingRole = user?.coaching_role;
  const isHeadCoach = myCoachingRole === "head_coach" || myCoachingRole === "athletic_director";
  const isSuperAdmin = user?.role === "super_admin";
  const canManage = isSuperAdmin || CAN_MANAGE.includes(myCoachingRole);
  const canDesignateAC = CAN_DESIGNATE_AC.includes(myCoachingRole);
  const canAddRemoveUsers = isSuperAdmin || ["head_coach", "athletic_director"].includes(myCoachingRole);

  const currentAC = allUsers.find(u => u.is_associate_head_coach);

  const filteredUsers = allUsers.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.coaching_role?.toLowerCase().includes(q) || u.assigned_positions?.some(p => p.toLowerCase().includes(q)));
    const matchRole = !roleFilter || u.coaching_role === roleFilter;
    return matchSearch && matchRole;
  });

  const saveReadiness = async () => {
    if (!myReadiness) return;
    setSavingReadiness(true);
    await base44.auth.updateMe({ mental_readiness: myReadiness, mental_readiness_note: myReadinessNote, mental_readiness_date: new Date().toISOString().split("T")[0] });
    setSavingReadiness(false);
  };

  const applyBulkAction = async () => {
    if (selectedUsers.size === 0) return;
    setApplyingBulk(true);
    const updates = {
      ...(bulkRole && { coaching_role: bulkRole }),
      ...(bulkPositions.length > 0 && { assigned_positions: bulkPositions }),
      ...(bulkPhases.length > 0 && { assigned_phases: bulkPhases }),
    };
    if (Object.keys(updates).length === 0) { setApplyingBulk(false); return; }
    for (const uid of Array.from(selectedUsers)) {
      await base44.entities.User.update(uid, updates);
    }
    setAllUsers(prev => prev.map(u => selectedUsers.has(u.id) ? { ...u, ...updates } : u));
    setSelectedUsers(new Set());
    setBulkRole(""); setBulkPositions([]); setBulkPhases([]);
    setApplyingBulk(false);
  };

  const saveRole = async (userId) => {
    await base44.entities.User.update(userId, { coaching_role: editRole, full_name: editName, assigned_positions: editPositions, assigned_phases: editPhases });
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, coaching_role: editRole, full_name: editName, assigned_positions: editPositions, assigned_phases: editPhases } : u));
    setEditingId(null);
  };

  const removeFromTeam = async (userId) => {
    if (!window.confirm("Remove this user from your team? They will lose access to your team's data.")) return;
    await base44.entities.User.update(userId, { team_id: null, school_name: null, coaching_role: null });
    setAllUsers(prev => prev.filter(u => u.id !== userId));
  };

  const toggleAC = async (targetUser) => {
    if (!canDesignateAC) return;
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
    return <SuperAdminView allUsers={allUsers} loading={loading} onRefresh={() => loadUsers(user)} />;
  }

  // ── Staff Management View ──────────────────────────────────────────────────
  const showBulkPositions = ["position_coach", "offensive_coordinator", "defensive_coordinator"].includes(bulkRole);

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
              {user?.school_name || "Your School"} · <span className="font-mono text-gray-600">{user?.team_id}</span> · {allUsers.length} staff
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); loadUsers(user); }} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canAddRemoveUsers && (
            <button onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
              <UserPlus className="w-4 h-4" /> Invite Staff
            </button>
          )}
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-400">
          <span className="text-blue-400 font-semibold">Account Isolation Active — </span>
          All data is scoped to <span className="text-white">{user?.school_name || "your school"}</span> only.
          {canDesignateAC && <span className="text-cyan-400 ml-1">You can designate 1 Associate Head Coach.</span>}
        </div>
      </div>

      {/* AC Banner */}
      {currentAC && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 flex items-center gap-3">
          <Star className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <p className="text-xs text-gray-300">
            <span className="text-cyan-400 font-semibold">Associate Head Coach: </span>
            {currentAC.full_name || currentAC.email} — coordinator-level access.
          </p>
          {canDesignateAC && (
            <button onClick={() => toggleAC(currentAC)} disabled={acDesignating}
              className="ml-auto text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded border border-gray-700 hover:border-red-500/30 transition-colors">
              Remove AC
            </button>
          )}
        </div>
      )}

      {/* Invite Form */}
      {showInvite && canAddRemoveUsers && (
        <InviteForm user={user} onClose={() => setShowInvite(false)} onInvited={() => loadUsers(user)} />
      )}

      {/* Staff Table */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">
              Staff Members
              {filteredUsers.length !== allUsers.length && <span className="ml-2 text-gray-600">({filteredUsers.length} of {allUsers.length})</span>}
            </p>
            <div className="flex items-center gap-1 text-gray-600 text-xs">
              <Lock className="w-3 h-3" />
              <span>Team-isolated</span>
            </div>
          </div>

          {/* Search + Role Filter */}
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, role, or position..."
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)]" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[var(--color-primary,#3b82f6)]">
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {(searchQuery || roleFilter) && (
              <button onClick={() => { setSearchQuery(""); setRoleFilter(""); }} className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 text-xs hover:text-white transition-colors">
                Clear
              </button>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-blue-400 text-sm font-semibold">{selectedUsers.size} staff member{selectedUsers.size !== 1 ? "s" : ""} selected</p>
                <button onClick={() => setSelectedUsers(new Set())} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear selection
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Set Role</label>
                  <select value={bulkRole} onChange={e => { setBulkRole(e.target.value); setBulkPositions([]); }}
                    className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-2 py-2 text-white text-xs outline-none">
                    <option value="">— no change —</option>
                    {ROLES.filter(r => r.value !== "admin").map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                {showBulkPositions && (
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Set Positions <span className="text-gray-600">(hold Ctrl/Cmd)</span></label>
                    <select multiple value={bulkPositions} onChange={e => setBulkPositions(Array.from(e.target.selectedOptions, o => o.value))}
                      className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none h-20">
                      {ALL_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Set Phases <span className="text-gray-600">(hold Ctrl/Cmd)</span></label>
                  <select multiple value={bulkPhases} onChange={e => setBulkPhases(Array.from(e.target.selectedOptions, o => o.value))}
                    className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none h-20">
                    {PHASES.map(ph => <option key={ph.value} value={ph.value}>{ph.label}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={applyBulkAction} disabled={applyingBulk || (!bulkRole && !bulkPositions.length && !bulkPhases.length)}
                className="w-full md:w-auto px-5 py-2 rounded-lg text-white text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all">
                {applyingBulk ? "Applying..." : `Apply to ${selectedUsers.size} member${selectedUsers.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          )}

          {/* Select all */}
          {filteredUsers.length > 0 && canAddRemoveUsers && (
            <div className="flex items-center gap-2">
              <input type="checkbox"
                checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                onChange={e => setSelectedUsers(e.target.checked ? new Set(filteredUsers.map(u => u.id)) : new Set())}
                className="w-4 h-4 rounded border-gray-700 cursor-pointer" />
              <span className="text-gray-500 text-xs">Select all visible</span>
            </div>
          )}
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
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No results for your search.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredUsers.map(u => {
              const isSelected = selectedUsers.has(u.id);
              const isAC = u.is_associate_head_coach;
              const displayRole = u.coaching_role || u.role;
              return (
                <div key={u.id} className={`flex items-center gap-4 px-5 py-4 transition-colors ${isAC ? "bg-cyan-500/3" : ""} ${isSelected ? "bg-blue-500/5" : "hover:bg-white/1"}`}>
                  {canAddRemoveUsers && (
                    <input type="checkbox" checked={isSelected}
                      onChange={e => {
                        const s = new Set(selectedUsers);
                        e.target.checked ? s.add(u.id) : s.delete(u.id);
                        setSelectedUsers(s);
                      }}
                      className="w-4 h-4 rounded border-gray-700 cursor-pointer flex-shrink-0" />
                  )}

                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm relative"
                    style={{ backgroundColor: "var(--color-primary,#3b82f6)33", color: "var(--color-primary,#3b82f6)" }}>
                    {(u.full_name || u.email)?.[0]?.toUpperCase()}
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
                    {(u.assigned_positions?.length > 0 || u.assigned_phases?.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.assigned_positions?.map(pos => <span key={pos} className="text-xs bg-blue-500/15 text-blue-400 px-1.5 rounded">{pos}</span>)}
                        {u.assigned_phases?.map(ph => <span key={ph} className="text-xs bg-orange-500/15 text-orange-400 px-1.5 rounded capitalize">{ph.replace("_", " ")}</span>)}
                      </div>
                    )}
                  </div>

                  {editingId === u.id ? (
                    <div className="flex flex-col gap-2 flex-shrink-0 max-w-xs w-full">
                      <select value={editRole} onChange={e => setEditRole(e.target.value)}
                        className="bg-[#1e1e1e] border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs outline-none w-full">
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      {["position_coach","offensive_coordinator","defensive_coordinator"].includes(editRole) && (
                        <>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Positions</p>
                            <div className="flex flex-wrap gap-1">
                              {ALL_POSITIONS.map(pos => (
                                <button key={pos} onClick={() => setEditPositions(p => p.includes(pos) ? p.filter(x => x !== pos) : [...p, pos])}
                                  className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all ${editPositions.includes(pos) ? "text-white" : "bg-gray-800 text-gray-500"}`}
                                  style={editPositions.includes(pos) ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                                  {pos}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Phases</p>
                            <div className="flex gap-1">
                              {PHASES.map(ph => (
                                <button key={ph.value} onClick={() => setEditPhases(p => p.includes(ph.value) ? p.filter(x => x !== ph.value) : [...p, ph.value])}
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
                      {canDesignateAC && displayRole !== "head_coach" && displayRole !== "athletic_director" && (
                        <button onClick={() => toggleAC(u)} disabled={acDesignating} title={isAC ? "Remove AC" : "Designate as AC"}
                          className={`p-1.5 rounded-lg transition-all ${isAC ? "text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20" : "text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/5"}`}>
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canAddRemoveUsers && (
                        <button onClick={() => { setEditingId(u.id); setEditRole(displayRole || "position_coach"); setEditPositions(u.assigned_positions || []); setEditPhases(u.assigned_phases || []); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-all">
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

      {/* Mental Readiness */}
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
          <p className="text-gray-400 text-xs w-full">My readiness today (1–10):</p>
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
        {isHeadCoach && showMentalReadiness && (
          <div className="pt-3 border-t border-gray-800">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Team Mental Readiness</p>
            <div className="space-y-1.5">
              {allUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#3b82f6)22", color: "var(--color-primary,#3b82f6)" }}>
                    {(u.full_name || u.email)?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-gray-300 text-xs flex-1 truncate">{u.full_name || u.email}</span>
                  <span className="text-gray-600 text-xs capitalize">{(u.coaching_role || u.role)?.replace(/_/g, " ")}</span>
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
          </div>
        )}
      </div>

      {/* Permission Summary */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="w-3 h-3" /> Permission Levels
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {[
            { role: "Athletic Director / Head Coach", perms: "Full access — manage staff, players, all data", color: "text-yellow-400" },
            { role: "Associate Head Coach (AC)", perms: "Coordinator-level access when designated by Head Coach", color: "text-cyan-400" },
            { role: "Coordinators + S&C", perms: "Playbook, Game Plans, Scouting, Practice, Analytics", color: "text-orange-400" },
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