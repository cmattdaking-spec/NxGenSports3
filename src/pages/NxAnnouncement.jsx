import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Megaphone, Plus, Pin, Trash2, X, Calendar, Users, Shield } from "lucide-react";

const TYPE_CONFIG = {
  team_wide:    { label: "Team Wide",      color: "bg-blue-500/20 text-blue-400",   icon: Users },
  parents_only: { label: "Parents Only",   color: "bg-purple-500/20 text-purple-400", icon: Shield },
  players_only: { label: "Players Only",   color: "bg-green-500/20 text-green-400",  icon: Users },
  all:          { label: "Everyone",       color: "bg-orange-500/20 text-orange-400", icon: Megaphone },
};

const CAN_POST = ["admin","head_coach","associate_head_coach","athletic_director","team_rep","parent"];

export default function NxAnnouncement() {
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", announcement_type: "team_wide", pinned: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([base44.auth.me(), base44.entities.NxAnnouncement.list("-created_date")])
      .then(([u, a]) => { setUser(u); setAnnouncements(a); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const userRole = user?.coaching_role || user?.parent_role || user?.role || "viewer";
  const canPost = CAN_POST.includes(userRole) || user?.role === "admin";

  // Filter based on user type
  const visible = announcements.filter(a => {
    if (user?.user_type === "parent" || user?.parent_role) {
      return a.announcement_type === "team_wide" || a.announcement_type === "parents_only" || a.announcement_type === "all";
    }
    if (user?.user_type === "player") {
      return a.announcement_type === "team_wide" || a.announcement_type === "players_only" || a.announcement_type === "all";
    }
    return true; // coaches/admins see all
  });

  const post = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    await base44.entities.NxAnnouncement.create({
      ...form,
      created_by_name: user?.full_name || user?.email,
      created_by_role: userRole,
    });
    setShowForm(false);
    setForm({ title: "", content: "", announcement_type: "team_wide", pinned: false });
    const updated = await base44.entities.NxAnnouncement.list("-created_date");
    setAnnouncements(updated);
  };

  const remove = async (id) => {
    if (!confirm("Delete announcement?")) return;
    await base44.entities.NxAnnouncement.delete(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const togglePin = async (a) => {
    await base44.entities.NxAnnouncement.update(a.id, { pinned: !a.pinned });
    setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, pinned: !x.pinned } : x));
  };

  const inp = "w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)]";

  const pinned = visible.filter(a => a.pinned);
  const recent = visible.filter(a => !a.pinned);

  if (loading) return <div className="flex items-center justify-center h-full bg-[#0a0a0a]"><div className="w-8 h-8 border-2 border-gray-700 border-t-[var(--color-primary,#f97316)] rounded-full animate-spin" /></div>;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#f97316)22" }}>
            <Megaphone className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Nx<span style={{ color: "var(--color-primary,#f97316)" }}>Announcement</span></h1>
            <p className="text-gray-500 text-sm">{visible.length} announcement{visible.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {canPost && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-3 flex items-center gap-1"><Pin className="w-3 h-3" /> Pinned</p>
          <div className="space-y-3">
            {pinned.map(a => <AnnouncementCard key={a.id} a={a} canPost={canPost} onPin={togglePin} onDelete={remove} />)}
          </div>
        </div>
      )}

      {/* Recent */}
      <div className="space-y-3">
        {recent.length === 0 && pinned.length === 0 && (
          <div className="text-center py-20">
            <Megaphone className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No announcements yet.</p>
          </div>
        )}
        {recent.map(a => <AnnouncementCard key={a.id} a={a} canPost={canPost} onPin={togglePin} onDelete={remove} />)}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">New Announcement</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inp} placeholder="Announcement title..." />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Message *</label>
                <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={4} className={inp + " resize-none"} placeholder="Write your announcement..." />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Audience</label>
                <select value={form.announcement_type} onChange={e => setForm({...form, announcement_type: e.target.value})} className={inp}>
                  <option value="team_wide">Team Wide (coaches + players)</option>
                  <option value="parents_only">Parents Only</option>
                  <option value="players_only">Players Only</option>
                  <option value="all">Everyone (coaches + players + parents)</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm(f => ({...f, pinned: !f.pinned}))} className={`w-10 h-5 rounded-full transition-colors relative ${form.pinned ? "" : "bg-gray-700"}`} style={form.pinned ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.pinned ? "left-5" : "left-0.5"}`} />
                </button>
                <span className="text-gray-400 text-sm">Pin this announcement</span>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={post} disabled={!form.title.trim() || !form.content.trim()} className="flex-1 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                  Post Announcement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ a, canPost, onPin, onDelete }) {
  const typeCfg = TYPE_CONFIG[a.announcement_type] || TYPE_CONFIG.team_wide;
  const Icon = typeCfg.icon;
  return (
    <div className={`bg-[#141414] border rounded-xl p-4 ${a.pinned ? "border-[var(--color-primary,#f97316)]/30" : "border-gray-800"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {a.pinned && <Pin className="w-3.5 h-3.5" style={{ color: "var(--color-primary,#f97316)" }} />}
            <h3 className="text-white font-bold">{a.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${typeCfg.color}`}>
              <Icon className="w-3 h-3" /> {typeCfg.label}
            </span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{a.content}</p>
          <div className="flex items-center gap-3 mt-2 text-gray-500 text-xs">
            {a.created_by_name && <span>— {a.created_by_name}</span>}
            {a.created_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(a.created_date).toLocaleDateString()}</span>}
          </div>
        </div>
        {canPost && (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onPin(a)} className={`p-1.5 rounded transition-colors ${a.pinned ? "" : "text-gray-600 hover:text-gray-300"}`} style={a.pinned ? { color: "var(--color-primary,#f97316)" } : {}}>
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(a.id)} className="text-gray-600 hover:text-red-400 p-1.5 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}