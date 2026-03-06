import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Mail, Edit2, Check, X, UserPlus, Star, AlertTriangle } from "lucide-react";

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

export default function UsersSection({ currentUser }) {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("position_coach");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [acDesignating, setAcDesignating] = useState(false);

  const canDesignateAC = ["head_coach", "admin"].includes(currentUser?.role);

  useEffect(() => {
    base44.entities.User.list().then(list => {
      setAllUsers(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const currentAC = allUsers.find(u => u.is_associate_head_coach);

  const saveRole = async (userId) => {
    await base44.entities.User.update(userId, { role: editRole });
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: editRole } : u));
    setEditingId(null);
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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg("");
    await base44.users.inviteUser(inviteEmail.trim(), inviteRole === "admin" ? "admin" : "user");
    setInviteMsg(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
    setInviting(false);
    setTimeout(() => setInviteMsg(""), 4000);
  };

  return (
    <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" /> Staff Management
        </h2>
        <button
          onClick={() => setShowInvite(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
          style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}
        >
          <UserPlus className="w-3.5 h-3.5" /> Invite
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="mb-4 p-4 bg-[#1a1a1a] border border-gray-700 rounded-xl space-y-3">
          <div className="flex items-start gap-2 text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-yellow-400" />
            Only AD and Head Coach can invite staff.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleInvite()}
                placeholder="coach@school.edu"
                className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 outline-none focus:border-[var(--color-primary,#3b82f6)]"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[var(--color-primary,#3b82f6)]"
              >
                {ROLES.filter(r => r.value !== "admin").map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          {inviteMsg && <p className="text-green-400 text-xs">{inviteMsg}</p>}
          <div className="flex gap-2">
            <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
              {inviting ? "Sending..." : "Send Invite"}
            </button>
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-[var(--color-primary,#3b82f6)] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {allUsers.map(u => {
            const isAC = u.is_associate_head_coach;
            return (
              <div key={u.id} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold relative"
                  style={{ backgroundColor: "var(--color-primary,#3b82f6)22", color: "var(--color-primary,#3b82f6)" }}>
                  {(u.full_name || u.email)?.[0]?.toUpperCase()}
                  {isAC && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Star className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{u.full_name || "—"}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1 truncate">
                    <Mail className="w-2.5 h-2.5" />{u.email}
                  </p>
                </div>
                {editingId === u.id ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <select value={editRole} onChange={e => setEditRole(e.target.value)}
                      className="bg-[#1e1e1e] border border-gray-600 rounded px-2 py-1 text-white text-xs outline-none">
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <button onClick={() => saveRole(u.id)} className="p-1 text-green-400 hover:bg-green-400/10 rounded"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-500 hover:bg-gray-700 rounded"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[u.role] || "bg-gray-700 text-gray-400"}`}>
                      {ROLES.find(r => r.value === u.role)?.label || u.role?.replace(/_/g, " ") || "—"}
                    </span>
                    {canDesignateAC && u.role !== "head_coach" && u.role !== "athletic_director" && (
                      <button onClick={() => toggleAC(u)} disabled={acDesignating} title={isAC ? "Remove AC" : "Set as Associate HC"}
                        className={`p-1 rounded transition-all ${isAC ? "text-cyan-400 bg-cyan-500/10" : "text-gray-600 hover:text-cyan-400"}`}>
                        <Star className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => { setEditingId(u.id); setEditRole(u.role || "position_coach"); }}
                      className="p-1 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-all">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}