import { useState, useEffect, useCallback } from "react";
import { getToken } from "@/api/apiClient";
import {
  Search, Plus, ArrowLeft, Trash2, Edit2, Send, Megaphone,
  Calendar, FileText, BarChart3, Upload, Link2, ExternalLink,
  Users, GraduationCap, Briefcase, Layers, Clock, MapPin,
  AlertTriangle, Bell, ChevronRight, Download, File
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const API = "/api/admin";

async function apiFetch(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Request failed"); }
  return res.json();
}

async function apiUpload(url, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: formData });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Upload failed"); }
  return res.json();
}

const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];
const AUDIENCE_OPTIONS = ["all", "staff", "students", "parents"];
const EVENT_TYPES = ["academic", "sports", "meeting", "holiday", "exam", "other"];
const DOC_CATEGORIES = ["policy", "handbook", "form", "report", "curriculum", "other"];

const PRIORITY_COLORS = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const EVENT_TYPE_COLORS = {
  academic: "bg-blue-500/20 text-blue-400",
  sports: "bg-emerald-500/20 text-emerald-400",
  meeting: "bg-purple-500/20 text-purple-400",
  holiday: "bg-amber-500/20 text-amber-400",
  exam: "bg-red-500/20 text-red-400",
  other: "bg-gray-500/20 text-gray-400",
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = "cyan" }) {
  const c = {
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    green: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400",
    red: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-400",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400",
  };
  return (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
      className={`bg-gradient-to-br ${c[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AnnouncementsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("GET", `${API}/announcements`);
      setItems(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (editItem) {
      await apiFetch("PATCH", `${API}/announcements/${editItem.id}`, form);
    } else {
      await apiFetch("POST", `${API}/announcements`, form);
    }
    setShowForm(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    await apiFetch("DELETE", `${API}/announcements/${id}`);
    load();
  };

  const filtered = items.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input data-testid="announcement-search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search announcements..."
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
        </div>
        <button data-testid="add-announcement-btn" onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} data-testid={`announcement-${a.id}`}
              className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-white font-semibold text-sm">{a.title}</h3>
                    <Badge className={`text-[10px] border ${PRIORITY_COLORS[a.priority]}`}>{a.priority}</Badge>
                    <Badge className="text-[10px] bg-gray-700/50 text-gray-300">{a.audience}</Badge>
                    {a.email_broadcast && <Badge className="text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Email Sent</Badge>}
                  </div>
                  <p className="text-gray-400 text-xs line-clamp-2 mb-2">{a.content}</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span>By {a.created_by}</span>
                    <span>{a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button data-testid={`edit-announcement-${a.id}`} onClick={() => { setEditItem(a); setShowForm(true); }}
                    className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button data-testid={`delete-announcement-${a.id}`} onClick={() => handleDelete(a.id)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditItem(null); } }}>
        <DialogContent className="bg-[#141414] border-gray-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit Announcement" : "New Announcement"}</DialogTitle></DialogHeader>
          <AnnouncementForm item={editItem} onSave={handleSave} onCancel={() => { setShowForm(false); setEditItem(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: "", content: "", priority: "medium", audience: "all",
    status: "published", email_broadcast: false, ...item
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Title *</label>
        <input data-testid="announcement-form-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Announcement title..."
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Content</label>
        <textarea data-testid="announcement-form-content" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          placeholder="Write your announcement..."
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white min-h-[100px] focus:border-cyan-500 focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Priority</label>
          <select data-testid="announcement-form-priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Audience</label>
          <select data-testid="announcement-form-audience" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
            {AUDIENCE_OPTIONS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input data-testid="announcement-form-broadcast" type="checkbox" checked={form.email_broadcast}
          onChange={e => setForm(f => ({ ...f, email_broadcast: e.target.checked }))}
          className="w-4 h-4 rounded border-gray-600 bg-[#1a1a1a] text-cyan-500 focus:ring-cyan-500" />
        <span className="text-sm text-gray-300">Send email broadcast to {form.audience} members</span>
      </label>
      <div className="flex gap-2 pt-2">
        <button data-testid="announcement-form-save" type="submit" disabled={saving}
          className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
          {saving ? "Saving..." : item ? "Update" : "Publish"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR TAB
// ═══════════════════════════════════════════════════════════════════════════════
function CalendarTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("GET", `${API}/calendar`);
      setEvents(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (editItem) {
      await apiFetch("PATCH", `${API}/calendar/${editItem.id}`, form);
    } else {
      await apiFetch("POST", `${API}/calendar`, form);
    }
    setShowForm(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    await apiFetch("DELETE", `${API}/calendar/${id}`);
    load();
  };

  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const monthEvents = events.filter(e => e.event_date?.startsWith(selectedMonth));

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthName = new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-semibold text-sm min-w-[160px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#1a1a1a] border border-gray-700 rounded-lg overflow-hidden">
            <button data-testid="calendar-view-list" onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "list" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}>
              List
            </button>
            <button data-testid="calendar-view-month" onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "month" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}>
              Month
            </button>
          </div>
          <button data-testid="add-calendar-event-btn" onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : viewMode === "month" ? (
        <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-800">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-xs text-gray-500 py-2 font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`e-${i}`} className="min-h-[80px] border-b border-r border-gray-800/50" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
              const dayEvents = events.filter(e => e.event_date === dateStr);
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              return (
                <div key={day} className={`min-h-[80px] border-b border-r border-gray-800/50 p-1 ${isToday ? "bg-cyan-500/5" : ""}`}>
                  <span className={`text-xs font-medium ${isToday ? "text-cyan-400" : "text-gray-400"}`}>{day}</span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${EVENT_TYPE_COLORS[e.event_type] || EVENT_TYPE_COLORS.other}`}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <div className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        monthEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No events this month</p>
          </div>
        ) : (
          <div className="space-y-2">
            {monthEvents.map(e => (
              <div key={e.id} data-testid={`calendar-event-${e.id}`}
                className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex items-center gap-4">
                <div className="flex-shrink-0 w-14 text-center">
                  <div className="text-2xl font-bold text-white">{e.event_date?.split("-")[2]}</div>
                  <div className="text-[10px] text-gray-500 uppercase">
                    {e.event_date ? new Date(e.event_date + "T00:00:00").toLocaleString("default", { weekday: "short" }) : ""}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-white font-semibold text-sm truncate">{e.title}</h3>
                    <Badge className={`text-[10px] ${EVENT_TYPE_COLORS[e.event_type] || EVENT_TYPE_COLORS.other}`}>{e.event_type}</Badge>
                  </div>
                  {e.description && <p className="text-gray-400 text-xs line-clamp-1">{e.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                    {e.event_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.event_time}</span>}
                    {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button data-testid={`edit-calendar-event-${e.id}`} onClick={() => { setEditItem(e); setShowForm(true); }}
                    className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button data-testid={`delete-calendar-event-${e.id}`} onClick={() => handleDelete(e.id)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditItem(null); } }}>
        <DialogContent className="bg-[#141414] border-gray-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit Event" : "New Calendar Event"}</DialogTitle></DialogHeader>
          <CalendarEventForm item={editItem} onSave={handleSave} onCancel={() => { setShowForm(false); setEditItem(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarEventForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: "", description: "", event_date: "", event_time: "", end_date: "", end_time: "",
    location: "", event_type: "academic", all_day: false, ...item
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.event_date) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const F = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <input data-testid={`calendar-form-${key}`} type={type} value={form[key] || ""} placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {F("Title *", "title", "text", "School Assembly")}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Description</label>
        <textarea data-testid="calendar-form-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Event details..."
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white min-h-[60px] focus:border-cyan-500 focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F("Start Date *", "event_date", "date")}
        {F("Start Time", "event_time", "time")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F("End Date", "end_date", "date")}
        {F("End Time", "end_time", "time")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F("Location", "location", "text", "Auditorium")}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Event Type</label>
          <select data-testid="calendar-form-event_type" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button data-testid="calendar-form-save" type="submit" disabled={saving}
          className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
          {saving ? "Saving..." : "Save Event"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("GET", `${API}/documents`);
      setDocs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddLink = async (form) => {
    await apiFetch("POST", `${API}/documents`, { ...form, doc_type: "link" });
    setShowForm(false);
    load();
  };

  const handleUpload = async (file, title, description, category) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);
    formData.append("description", description);
    formData.append("category", category);
    await apiUpload(`${API}/documents/upload`, formData);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    await apiFetch("DELETE", `${API}/documents/${id}`);
    load();
  };

  const filtered = docs.filter(d => {
    if (filterCat && d.category !== filterCat) return false;
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input data-testid="document-search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
        </div>
        <select data-testid="document-filter-category" value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Categories</option>
          {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <button data-testid="add-document-btn" onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No documents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(d => (
            <div key={d.id} data-testid={`document-${d.id}`}
              className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${d.doc_type === "file" ? "bg-blue-500/20" : "bg-emerald-500/20"}`}>
                  {d.doc_type === "file" ? <File className="w-5 h-5 text-blue-400" /> : <Link2 className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm truncate">{d.title}</h3>
                  {d.description && <p className="text-gray-400 text-xs line-clamp-1 mt-0.5">{d.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge className="text-[10px] bg-gray-700/50 text-gray-300">{d.category}</Badge>
                    {d.file_size && <span className="text-[10px] text-gray-500">{formatSize(d.file_size)}</span>}
                    <span className="text-[10px] text-gray-500">{d.uploaded_by}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {d.doc_type === "file" && d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer" data-testid={`download-doc-${d.id}`}
                      className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"><Download className="w-4 h-4" /></a>
                  )}
                  {d.doc_type === "link" && d.link_url && (
                    <a href={d.link_url} target="_blank" rel="noopener noreferrer" data-testid={`open-link-${d.id}`}
                      className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"><ExternalLink className="w-4 h-4" /></a>
                  )}
                  <button data-testid={`delete-doc-${d.id}`} onClick={() => handleDelete(d.id)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="bg-[#141414] border-gray-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <DocumentForm onSaveLink={handleAddLink} onUpload={handleUpload} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentForm({ onSaveLink, onUpload, onCancel }) {
  const [mode, setMode] = useState("upload");
  const [form, setForm] = useState({ title: "", description: "", category: "other", link_url: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === "upload" && file) {
        await onUpload(file, form.title, form.description, form.category);
      } else if (mode === "link" && form.link_url) {
        await onSaveLink(form);
      }
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex bg-[#1a1a1a] border border-gray-700 rounded-lg overflow-hidden">
        <button type="button" data-testid="doc-mode-upload" onClick={() => setMode("upload")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${mode === "upload" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}>
          <Upload className="w-3.5 h-3.5" /> Upload File
        </button>
        <button type="button" data-testid="doc-mode-link" onClick={() => setMode("link")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${mode === "link" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}>
          <Link2 className="w-3.5 h-3.5" /> Add Link
        </button>
      </div>

      {mode === "upload" ? (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Select File *</label>
          <input data-testid="doc-file-input" type="file" onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-cyan-600 file:text-white" />
        </div>
      ) : (
        <div>
          <label className="text-xs text-gray-400 block mb-1">URL *</label>
          <input data-testid="doc-link-input" type="url" value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
            placeholder="https://..."
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
        </div>
      )}

      <div>
        <label className="text-xs text-gray-400 block mb-1">Title</label>
        <input data-testid="doc-form-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Document title (optional for uploads)"
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Description</label>
        <input data-testid="doc-form-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Brief description..."
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Category</label>
        <select data-testid="doc-form-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
          {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button data-testid="doc-form-save" type="submit" disabled={saving || (mode === "upload" && !file) || (mode === "link" && !form.link_url)}
          className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
          {saving ? "Saving..." : mode === "upload" ? "Upload" : "Add Link"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENROLLMENT STATS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function StatsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("GET", `${API}/stats`);
        setStats(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading stats...</div>;
  if (!stats) return <div className="text-center py-12 text-gray-500">Could not load stats</div>;

  const maxGradeCount = stats.grade_distribution?.reduce((m, g) => Math.max(m, g.count), 0) || 1;

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={GraduationCap} label="Students" value={stats.total_students} color="cyan" />
        <StatCard icon={Briefcase} label="Faculty" value={stats.total_faculty} color="green" />
        <StatCard icon={Users} label="Total Users" value={stats.total_users} color="blue" />
        <StatCard icon={Layers} label="Clubs" value={stats.total_clubs} color="purple" />
        <StatCard icon={Megaphone} label="Announcements" value={stats.total_announcements} color="amber" />
        <StatCard icon={Calendar} label="Upcoming Events" value={stats.upcoming_events} color="green" />
        <StatCard icon={FileText} label="Documents" value={stats.total_documents} color="blue" />
        <StatCard icon={Layers} label="Active Clubs" value={stats.active_clubs} color="cyan" />
      </div>

      {/* User Breakdown */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">User Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Staff", value: stats.staff_count, color: "bg-cyan-500" },
            { label: "Players", value: stats.player_count, color: "bg-emerald-500" },
            { label: "Parents", value: stats.parent_count, color: "bg-amber-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grade Distribution */}
      {stats.grade_distribution?.length > 0 && (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Student Grade Distribution</h3>
          <div className="space-y-2">
            {stats.grade_distribution.map(g => (
              <div key={g.grade} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20 text-right truncate">{g.grade}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${Math.max((g.count / maxGradeCount) * 100, 8)}%` }}
                  >
                    <span className="text-[10px] text-white font-semibold">{g.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function SchoolAdminReporting() {
  return (
    <div data-testid="school-admin-reporting" className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">School Admin</h1>
        <p className="text-gray-400 text-sm mt-0.5">Announcements, calendar, documents & enrollment stats</p>
      </div>

      <Tabs defaultValue="announcements" className="w-full">
        <TabsList className="bg-[#141414] border border-gray-800 p-1 rounded-xl w-full flex">
          <TabsTrigger data-testid="tab-announcements" value="announcements" className="flex-1 text-xs sm:text-sm data-[state=active]:bg-cyan-600 data-[state=active]:text-white rounded-lg">
            <Megaphone className="w-4 h-4 mr-1.5 hidden sm:inline" />Announcements
          </TabsTrigger>
          <TabsTrigger data-testid="tab-calendar" value="calendar" className="flex-1 text-xs sm:text-sm data-[state=active]:bg-cyan-600 data-[state=active]:text-white rounded-lg">
            <Calendar className="w-4 h-4 mr-1.5 hidden sm:inline" />Calendar
          </TabsTrigger>
          <TabsTrigger data-testid="tab-documents" value="documents" className="flex-1 text-xs sm:text-sm data-[state=active]:bg-cyan-600 data-[state=active]:text-white rounded-lg">
            <FileText className="w-4 h-4 mr-1.5 hidden sm:inline" />Documents
          </TabsTrigger>
          <TabsTrigger data-testid="tab-stats" value="stats" className="flex-1 text-xs sm:text-sm data-[state=active]:bg-cyan-600 data-[state=active]:text-white rounded-lg">
            <BarChart3 className="w-4 h-4 mr-1.5 hidden sm:inline" />Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="mt-4"><AnnouncementsTab /></TabsContent>
        <TabsContent value="calendar" className="mt-4"><CalendarTab /></TabsContent>
        <TabsContent value="documents" className="mt-4"><DocumentsTab /></TabsContent>
        <TabsContent value="stats" className="mt-4"><StatsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
