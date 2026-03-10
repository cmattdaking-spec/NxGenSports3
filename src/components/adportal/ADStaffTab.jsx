import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Pencil, Trash2, X, Check, ChevronDown } from "lucide-react";
import PendingInvites from "@/components/usermgmt/PendingInvites";

const SPORT_LABELS = {
  football:"Football", basketball:"Basketball", baseball:"Baseball", softball:"Softball",
  soccer:"Soccer", volleyball:"Volleyball", boxing:"Boxing", golf:"Golf",
  tennis:"Tennis", wrestling:"Wrestling", cross_country:"Cross Country", track:"Track", lacrosse:"Lacrosse"
};
const ALL_SPORTS = Object.keys(SPORT_LABELS);

const COACHING_ROLES = [
  "head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator",
  "special_teams_coordinator","strength_conditioning_coordinator","ol_coach","qb_coach",
  "rb_coach","wr_coach","db_coach","lb_coach","dl_coach","position_coach","trainer","athletic_director","manager"
];

export default function ADStaffTab({ staff, onRefresh }) {
  const [teamId, setTeamId] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setTeamId(u?.team_id)).catch(() => {});
  }, []);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [inviteForm, setInviteForm] = useState({ email: "", coaching_role: "position_coach", assigned_sports: ["football"] });
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditData({ coaching_role: s.coaching_role || "", assigned_sports: s.assigned_sports || ["football"], role: s.role || "user" });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    await base44.functions.invoke("updateTeamUser", { userId: id, updates: editData });
    setSaving(false);
    setEditingId(null);
    onRefresh();
  };

  const removeUser = async (id) => {
    await base44.functions.invoke("updateTeamUser", { userId: id, updates: { team_id: null, coaching_role: null } });
    setConfirmDelete(null);
    onRefresh();
  };

  const sendInvite = async () => {
    if (!inviteForm.email) return;
    setInviting(true);
    const me = await base44.auth.me();
    await base44.functions.invoke("sendInvite", {
      email: inviteForm.email,
      coaching_role: inviteForm.coaching_role,
      team_id: me.team_id,
      school_name: me.school_name,
      school_code: me.school_code,
      assigned_sports: inviteForm.assigned_sports,
      invite_type: "staff",
    });
    setInviting(false);
    setShowInvite(false);
    setInviteForm({ email: "", coaching_role: "position_coach", assigned_sports: ["football"] });
    onRefresh();
  };

  const toggleSport = (sport, arr, setArr) => {
    setArr(arr.includes(sport) ? arr.filter(s => s !== sport) : [...arr, sport]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Staff Management ({staff.length})</h2>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition-all">
          <UserPlus className="w-4 h-4" /> Invite Staff
        </button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowInvite(false)}>
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Invite Staff Member</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Email Address</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none" placeholder="coach@school.edu" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Role</label>
                <select value={inviteForm.coaching_role} onChange={e => setInviteForm({...inviteForm, coaching_role: e.target.value})}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none capitalize">
                  {COACHING_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-2 block">Assigned Sports</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SPORTS.map(s => (
                    <button key={s} onClick={() => toggleSport(s, inviteForm.assigned_sports, arr => setInviteForm({...inviteForm, assigned_sports: arr}))}
                      className={`px-2 py-1 rounded-lg text-xs transition-all ${inviteForm.assigned_sports.includes(s) ? "bg-cyan-500 text-black font-bold" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                      {SPORT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={sendInvite} disabled={inviting || !inviteForm.email}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition-all disabled:opacity-50">
                {inviting ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Invites */}
      <PendingInvites teamId={teamId} onRevoked={onRefresh} />

      {/* Staff List */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl divide-y divide-gray-800">
        {staff.length === 0 && <p className="text-gray-500 text-sm px-5 py-6 text-center">No staff members found.</p>}
        {staff.map(s => (
          <div key={s.id} className="px-4 py-3">
            {editingId === s.id ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{s.full_name || s.email}</p>
                    <p className="text-gray-500 text-xs">{s.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(s.id)} disabled={saving} className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Role</label>
                    <select value={editData.coaching_role} onChange={e => setEditData({...editData, coaching_role: e.target.value})}
                      className="w-full bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none capitalize">
                      {COACHING_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Platform Access</label>
                    <select value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})}
                      className="w-full bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1.5 block">Sports</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SPORTS.map(sp => (
                      <button key={sp} onClick={() => {
                        const arr = editData.assigned_sports || [];
                        setEditData({...editData, assigned_sports: arr.includes(sp) ? arr.filter(x => x !== sp) : [...arr, sp]});
                      }}
                        className={`px-2 py-0.5 rounded-lg text-xs transition-all ${(editData.assigned_sports || []).includes(sp) ? "bg-cyan-500 text-black font-bold" : "bg-gray-800 text-gray-400"}`}>
                        {SPORT_LABELS[sp]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold flex-shrink-0">
                    {s.full_name?.[0] || "C"}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{s.full_name || s.email}</p>
                    <p className="text-gray-500 text-xs">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex gap-1 flex-wrap justify-end max-w-xs">
                    {(s.assigned_sports || []).slice(0, 2).map(sp => (
                      <span key={sp} className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">{SPORT_LABELS[sp] || sp}</span>
                    ))}
                    {(s.assigned_sports || []).length > 2 && <span className="text-xs text-gray-500">+{(s.assigned_sports || []).length - 2}</span>}
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-lg capitalize whitespace-nowrap">
                    {s.coaching_role?.replace(/_/g, " ") || s.role}
                  </span>
                  <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {confirmDelete === s.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => removeUser(s.id)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">Remove</button>
                      <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded-lg">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}