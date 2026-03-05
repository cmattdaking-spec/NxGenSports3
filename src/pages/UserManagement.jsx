import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Shield, Mail, Edit2, Check, X, UserPlus, ChevronDown } from "lucide-react";

const ROLES = [
  { value: "athletic_director", label: "Athletic Director" },
  { value: "head_coach", label: "Head Coach" },
  { value: "offensive_coordinator", label: "Offensive Coordinator" },
  { value: "defensive_coordinator", label: "Defensive Coordinator" },
  { value: "special_teams_coordinator", label: "Special Teams Coordinator" },
  { value: "position_coach", label: "Position Coach" },
  { value: "trainer", label: "Trainer" },
  { value: "admin", label: "Admin" },
];

const roleColors = {
  admin: "bg-purple-500/20 text-purple-400",
  athletic_director: "bg-yellow-500/20 text-yellow-400",
  head_coach: "bg-blue-500/20 text-blue-400",
  offensive_coordinator: "bg-orange-500/20 text-orange-400",
  defensive_coordinator: "bg-red-500/20 text-red-400",
  special_teams_coordinator: "bg-green-500/20 text-green-400",
  position_coach: "bg-gray-500/20 text-gray-400",
  trainer: "bg-teal-500/20 text-teal-400",
};

export default function UserManagement() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("position_coach");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      const allowed = ["admin", "head_coach", "athletic_director"];
      if (!allowed.includes(u?.role)) return setLoading(false);
      base44.entities.User.list().then(list => {
        setAllUsers(list);
        setLoading(false);
      });
    }).catch(() => setLoading(false));
  }, []);

  const isAdmin = user?.role === "admin";
  const canView = isAdmin || user?.role === "head_coach" || user?.role === "athletic_director";

  const saveRole = async (userId) => {
    await base44.entities.User.update(userId, { role: editRole });
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: editRole } : u));
    setEditingId(null);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg("");
    await base44.users.inviteUser(inviteEmail.trim(), inviteRole === "admin" ? "admin" : "user");
    // Also set role on user if possible - they'll get it after first login via admin update
    setInviteMsg(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
    setInviting(false);
    setTimeout(() => setInviteMsg(""), 3000);
  };

  if (!canView) {
    return (
      <div className="bg-[#0a0a0a] min-h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Access Restricted</p>
          <p className="text-sm mt-1">Admin, Head Coach, or Athletic Director access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#3b82f6)22" }}>
            <Users className="w-5 h-5" style={{ color: "var(--color-primary,#3b82f6)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">User Management</h1>
            <p className="text-gray-500 text-sm">{allUsers.length} staff members</p>
          </div>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}
        >
          <UserPlus className="w-4 h-4" /> Invite User
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="bg-[#141414] border border-gray-700 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-semibold">Invite New Staff Member</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
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
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {inviteMsg && <p className="text-green-400 text-sm">{inviteMsg}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}
            >
              {inviting ? "Sending..." : "Send Invitation"}
            </button>
            <button onClick={() => setShowInvite(false)} className="px-5 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {allUsers.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ backgroundColor: "var(--color-primary,#3b82f6)44" }}>
                  <span style={{ color: "var(--color-primary,#3b82f6)" }}>{(u.full_name || u.email)?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{u.full_name || "—"}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</p>
                </div>

                {editingId === u.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="bg-[#1e1e1e] border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs outline-none"
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <button onClick={() => saveRole(u.id)} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-700"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[u.role] || "bg-gray-700 text-gray-400"}`}>
                      {ROLES.find(r => r.value === u.role)?.label || u.role?.replace(/_/g, " ") || "—"}
                    </span>
                    <button
                      onClick={() => { setEditingId(u.id); setEditRole(u.role || "position_coach"); }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}