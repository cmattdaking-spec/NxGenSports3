import { useState, useEffect, useCallback } from "react";
import { getToken } from "@/api/apiClient";
import {
  Search, Plus, ArrowLeft, Users, Calendar, Trash2, Edit2,
  ChevronRight, MapPin, Clock, Award, UserPlus, Layers
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const API = "/api/clubs";

async function apiFetch(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Request failed"); }
  return res.json();
}

const CLUB_TYPES = ["club", "committee", "honor_society", "team", "council"];
const CATEGORIES = ["STEM", "Arts", "Sports", "Community Service", "Academic", "Cultural", "Social", "Leadership", "Other"];
const MEMBER_ROLES = ["member", "president", "vice_president", "secretary", "treasurer", "officer"];
const EVENT_TYPES = ["meeting", "workshop", "competition", "fundraiser", "social", "community_service", "other"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function StatCard({ icon: Icon, label, value, color = "cyan" }) {
  const c = {
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    green: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400",
  };
  return (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`} className={`bg-gradient-to-br ${c[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4" />
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span></div>
      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
    </div>
  );
}

// ─── Club Form ───────────────────────────────────────────────────────────────
function ClubForm({ club, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: "", description: "", club_type: "club", category: "",
    advisor_name: "", meeting_day: "", meeting_time: "", meeting_location: "",
    max_members: "", status: "active", ...club
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, max_members: form.max_members ? Number(form.max_members) : null });
    } finally { setSaving(false); }
  };

  const F = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <input data-testid={`club-form-${key}`} type={type} value={form[key] || ""} placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {F("Name *", "name", "text", "Robotics Club")}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Description</label>
        <textarea data-testid="club-form-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="What does this club do?"
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white min-h-[60px]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Type</label>
          <select data-testid="club-form-type" value={form.club_type} onChange={e => setForm(f => ({ ...f, club_type: e.target.value }))}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            {CLUB_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Category</label>
          <select data-testid="club-form-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">None</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F("Advisor", "advisor_name")}
        {F("Max Members", "max_members", "number")}
      </div>
      <div className="border-t border-gray-800 pt-3">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Meeting Schedule</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Day</label>
            <select value={form.meeting_day} onChange={e => setForm(f => ({ ...f, meeting_day: e.target.value }))}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">None</option>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {F("Time", "meeting_time", "time")}
          {F("Location", "meeting_location")}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button data-testid="club-form-save" type="submit" disabled={saving || !form.name}
          className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
          {saving ? "Saving..." : club?.id ? "Update" : "Create Club"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm hover:bg-white/5">Cancel</button>
      </div>
    </form>
  );
}

// ─── Club Detail ─────────────────────────────────────────────────────────────
function ClubDetail({ club, onBack, onRefresh }) {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [memberStudentId, setMemberStudentId] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [evForm, setEvForm] = useState({ title: "", description: "", event_date: "", event_time: "", location: "", event_type: "meeting" });

  const cid = club.id;

  const loadData = useCallback(async () => {
    const [m, e, s] = await Promise.all([
      apiFetch("GET", `${API}/${cid}/members`),
      apiFetch("GET", `${API}/${cid}/events`),
      apiFetch("GET", `/api/students/`),
    ]);
    setMembers(m);
    setEvents(e);
    setStudents(s);
  }, [cid]);

  useEffect(() => { loadData(); }, [loadData]);

  const addMember = async () => {
    if (!memberStudentId) return;
    try {
      await apiFetch("POST", `${API}/${cid}/members`, { student_id: memberStudentId, role: memberRole });
      setShowAddMember(false);
      setMemberStudentId("");
      setMemberRole("member");
      loadData();
      onRefresh();
    } catch (err) { alert(err.message); }
  };

  const removeMember = async (mid) => {
    await apiFetch("DELETE", `${API}/${cid}/members/${mid}`);
    loadData();
    onRefresh();
  };

  const updateRole = async (mid, role) => {
    await apiFetch("PATCH", `${API}/${cid}/members/${mid}`, { role });
    loadData();
  };

  const addEvent = async () => {
    if (!evForm.title) return;
    await apiFetch("POST", `${API}/${cid}/events`, evForm);
    setShowAddEvent(false);
    setEvForm({ title: "", description: "", event_date: "", event_time: "", location: "", event_type: "meeting" });
    loadData();
  };

  const removeEvent = async (eid) => {
    await apiFetch("DELETE", `${API}/${cid}/events/${eid}`);
    loadData();
  };

  // Existing member student IDs for filtering
  const memberStudentIds = new Set(members.map(m => m.student_id));
  const availableStudents = students.filter(s => !memberStudentIds.has(s.id));

  return (
    <div data-testid="club-detail" className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button data-testid="club-detail-back" onClick={onBack} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{club.name}</h2>
          <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
            <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">
              {club.club_type?.replace("_", " ")}
            </Badge>
            {club.category && <span>{club.category}</span>}
            {club.advisor_name && <span>Advisor: {club.advisor_name}</span>}
            <span>{club.member_count ?? members.length} member{(club.member_count ?? members.length) !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Info */}
      {(club.description || club.meeting_day) && (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-2">
          {club.description && <p className="text-sm text-gray-300">{club.description}</p>}
          {club.meeting_day && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Meets {club.meeting_day}{club.meeting_time ? ` at ${club.meeting_time}` : ""}</span>
              {club.meeting_location && <><MapPin className="w-3.5 h-3.5 ml-2" /><span>{club.meeting_location}</span></>}
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-[#1a1a1a] border border-gray-800">
          <TabsTrigger value="members" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Events ({events.length})</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Members</h3>
            <button data-testid="add-member-btn" onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300"><UserPlus className="w-3 h-3" /> Add Member</button>
          </div>
          {showAddMember && (
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select data-testid="member-student-select" value={memberStudentId} onChange={e => setMemberStudentId(e.target.value)}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Select student...</option>
                  {availableStudents.map(s => <option key={s.id} value={s.id}>{s.full_name} (Grade {s.grade_level})</option>)}
                </select>
                <select data-testid="member-role-select" value={memberRole} onChange={e => setMemberRole(e.target.value)}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                  {MEMBER_ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button data-testid="member-add-submit" onClick={addMember} disabled={!memberStudentId}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">Add</button>
                <button onClick={() => setShowAddMember(false)} className="text-gray-400 text-sm hover:text-white">Cancel</button>
              </div>
            </div>
          )}
          {members.length === 0 && !showAddMember && <p className="text-gray-500 text-sm text-center py-4">No members yet.</p>}
          <div className="space-y-1.5">
            {members.map(m => (
              <div key={m.id} className="bg-[#141414] border border-gray-800 rounded-lg px-3 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold text-xs">{m.student_name?.split(" ").map(n => n[0]).join("") || "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{m.student_name}</p>
                  <p className="text-xs text-gray-500">Grade {m.grade_level}</p>
                </div>
                <select value={m.role} onChange={e => updateRole(m.id, e.target.value)}
                  className="bg-[#0d0d0d] border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300">
                  {MEMBER_ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
                <button onClick={() => removeMember(m.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Events</h3>
            <button data-testid="add-event-btn" onClick={() => setShowAddEvent(true)}
              className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300"><Plus className="w-3 h-3" /> Add Event</button>
          </div>
          {showAddEvent && (
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 space-y-3">
              <input data-testid="event-form-title" placeholder="Event title *" value={evForm.title}
                onChange={e => setEvForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              <div className="grid grid-cols-3 gap-3">
                <input type="date" value={evForm.event_date} onChange={e => setEvForm(f => ({ ...f, event_date: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                <input type="time" value={evForm.event_time} onChange={e => setEvForm(f => ({ ...f, event_time: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                <select value={evForm.event_type} onChange={e => setEvForm(f => ({ ...f, event_type: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <input placeholder="Location" value={evForm.location} onChange={e => setEvForm(f => ({ ...f, location: e.target.value }))}
                className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              <textarea placeholder="Description" value={evForm.description} onChange={e => setEvForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white min-h-[48px]" />
              <div className="flex gap-2">
                <button data-testid="event-form-save" onClick={addEvent} disabled={!evForm.title}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">Save</button>
                <button onClick={() => setShowAddEvent(false)} className="text-gray-400 text-sm hover:text-white">Cancel</button>
              </div>
            </div>
          )}
          {events.length === 0 && !showAddEvent && <p className="text-gray-500 text-sm text-center py-4">No events yet.</p>}
          <div className="space-y-2">
            {events.map(e => (
              <div key={e.id} className="bg-[#141414] border border-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">
                      {e.event_type?.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-gray-500">{e.event_date} {e.event_time && `at ${e.event_time}`}</span>
                  </div>
                  <button onClick={() => removeEvent(e.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-sm text-white font-medium">{e.title}</p>
                {e.location && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{e.location}</p>}
                {e.description && <p className="text-xs text-gray-400 mt-1">{e.description}</p>}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ClubsCommittees() {
  const [clubs, setClubs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        apiFetch("GET", `${API}/`),
        apiFetch("GET", `${API}/stats`),
      ]);
      setClubs(c);
      setStats(s);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveClub = async (form) => {
    if (editing?.id) {
      await apiFetch("PATCH", `${API}/${editing.id}`, form);
    } else {
      await apiFetch("POST", `${API}/`, form);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const deleteClub = async (id) => {
    if (!confirm("Delete this club and all its members/events?")) return;
    await apiFetch("DELETE", `${API}/${id}`);
    load();
  };

  const filtered = clubs.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.advisor_name?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q);
    const matchType = filterType === "all" || c.club_type === filterType;
    const matchCat = filterCat === "all" || c.category === filterCat;
    return matchSearch && matchType && matchCat;
  });

  const usedCategories = [...new Set(clubs.map(c => c.category).filter(Boolean))];

  if (selected) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <ClubDetail club={selected} onBack={() => { setSelected(null); load(); }} onRefresh={load} />
      </div>
    );
  }

  return (
    <div data-testid="clubs-page" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Clubs & Committees</h1>
          <p className="text-sm text-gray-500 mt-1">{stats?.total_clubs ?? 0} organization{(stats?.total_clubs ?? 0) !== 1 ? "s" : ""} | {stats?.total_members ?? 0} total members</p>
        </div>
        <button data-testid="add-club-btn" onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Club
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Layers} label="Clubs" value={stats.total_clubs} color="purple" />
          <StatCard icon={Users} label="Members" value={stats.total_members} color="cyan" />
          <StatCard icon={Award} label="Active" value={stats.active_clubs} color="green" />
          <StatCard icon={Calendar} label="Events" value={stats.upcoming_events} color="amber" />
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input data-testid="club-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clubs..."
            className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
        </div>
        <select data-testid="filter-type" value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white">
          <option value="all">All Types</option>
          {CLUB_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
        {usedCategories.length > 0 && (
          <select data-testid="filter-category" value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white">
            <option value="all">All Categories</option>
            {usedCategories.map(c => <option key={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Club List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-700 border-t-cyan-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Layers className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">{search || filterType !== "all" || filterCat !== "all" ? "No matches" : "No clubs yet"}</p>
          <p className="text-gray-600 text-sm mt-1">Click "New Club" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(c => (
            <div key={c.id} data-testid={`club-card-${c.id}`}
              className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer group"
              onClick={() => setSelected(c)}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-400">
                      {c.club_type?.replace("_", " ")}
                    </Badge>
                    {c.category && <span className="text-xs text-gray-500">{c.category}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button data-testid={`edit-club-${c.id}`} onClick={e => { e.stopPropagation(); setEditing(c); setShowForm(true); }}
                    className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/5"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button data-testid={`delete-club-${c.id}`} onClick={e => { e.stopPropagation(); deleteClub(c.id); }}
                    className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {c.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{c.description}</p>}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.member_count} member{c.member_count !== 1 ? "s" : ""}</span>
                  {c.advisor_name && <span>{c.advisor_name}</span>}
                </div>
                {c.meeting_day && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.meeting_day}{c.meeting_time ? ` ${c.meeting_time}` : ""}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={open => { setShowForm(open); if (!open) setEditing(null); }}>
        <DialogContent className="bg-[#111] border border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Club" : "Create Club"}</DialogTitle></DialogHeader>
          <ClubForm club={editing} onSave={saveClub} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
