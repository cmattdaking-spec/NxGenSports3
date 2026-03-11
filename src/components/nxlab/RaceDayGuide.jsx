import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSport } from "@/components/SportContext";
import {
  Plus, X, Clock, MapPin, Flag, ChevronDown, ChevronUp,
  Zap, Image, Video, Trophy, BarChart2, Star, Edit, Trash2, Radio
} from "lucide-react";

const UPDATE_TYPES = [
  { value: "result",    label: "Result",    icon: Trophy,    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  { value: "stat",      label: "Stat",      icon: BarChart2, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { value: "highlight", label: "Highlight", icon: Star,      color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  { value: "photo",     label: "Photo",     icon: Image,     color: "text-pink-400 bg-pink-500/10 border-pink-500/30" },
  { value: "video",     label: "Video",     icon: Video,     color: "text-teal-400 bg-teal-500/10 border-teal-500/30" },
  { value: "general",   label: "Update",    icon: Radio,     color: "text-gray-400 bg-gray-500/10 border-gray-500/30" },
];

const inp = "w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#f97316)]";

function UpdateBadge({ type }) {
  const cfg = UPDATE_TYPES.find(t => t.value === type) || UPDATE_TYPES[5];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

export default function RaceDayGuide({ user }) {
  const { activeSport } = useSport();
  const [events, setEvents] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showUpdateForm, setShowUpdateForm] = useState(null); // event id
  const [eventForm, setEventForm] = useState({});
  const [updateForm, setUpdateForm] = useState({ type: "result", content: "", media_url: "", athlete_name: "", event_name: "" });
  const [scheduleRows, setScheduleRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const role = user?.coaching_role || user?.role || "viewer";
  const isCoach = ["admin","head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator","position_coach","strength_conditioning_coordinator"].includes(role) || user?.role === "admin";

  const load = () => base44.entities.RaceDayEvent.filter({ sport: activeSport }, "-event_date").then(setEvents);
  useEffect(() => { load(); }, [activeSport]);

  // Subscribe to live updates
  useEffect(() => {
    const unsub = base44.entities.RaceDayEvent.subscribe(() => load());
    return unsub;
  }, [activeSport]);

  const openAdd = () => {
    setEditingEvent(null);
    setEventForm({ sport: activeSport, status: "upcoming" });
    setScheduleRows([]);
    setShowEventForm(true);
  };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    setEventForm({ ...ev });
    setScheduleRows(ev.schedule_items || []);
    setShowEventForm(true);
  };

  const saveEvent = async () => {
    setSaving(true);
    const data = { ...eventForm, schedule_items: scheduleRows, sport: activeSport };
    if (editingEvent) await base44.entities.RaceDayEvent.update(editingEvent.id, data);
    else await base44.entities.RaceDayEvent.create(data);
    setSaving(false);
    setShowEventForm(false);
    setEditingEvent(null);
    load();
  };

  const deleteEvent = async (id) => {
    if (!confirm("Delete this event?")) return;
    await base44.entities.RaceDayEvent.delete(id);
    load();
  };

  const postUpdate = async (eventId, currentUpdates) => {
    const newUpdate = {
      ...updateForm,
      id: Date.now().toString(),
      posted_at: new Date().toISOString(),
      posted_by: user?.full_name || user?.email || "Coach",
    };
    const updates = [newUpdate, ...(currentUpdates || [])];
    await base44.entities.RaceDayEvent.update(eventId, { live_updates: updates });
    setShowUpdateForm(null);
    setUpdateForm({ type: "result", content: "", media_url: "", athlete_name: "", event_name: "" });
    load();
  };

  const deleteUpdate = async (eventId, updateId, currentUpdates) => {
    const updates = currentUpdates.filter(u => u.id !== updateId);
    await base44.entities.RaceDayEvent.update(eventId, { live_updates: updates });
    load();
  };

  const setStatus = async (eventId, status) => {
    await base44.entities.RaceDayEvent.update(eventId, { status });
    load();
  };

  const upcoming = events.filter(e => e.status !== "completed");
  const past = events.filter(e => e.status === "completed");

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">
            Race Day <span style={{ color: "var(--color-primary,#f97316)" }}>Guide</span>
          </h1>
          <p className="text-gray-500 text-sm">Check-in times, schedules & live updates</p>
        </div>
        {isCoach && (
          <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <Plus className="w-4 h-4" /> Add Event
          </button>
        )}
      </div>

      {events.length === 0 && (
        <div className="text-center py-20">
          <Flag className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No race events yet. {isCoach ? "Add your first event above." : "Check back when your coach adds an event."}</p>
        </div>
      )}

      {/* Upcoming / Live */}
      {upcoming.length > 0 && (
        <div className="space-y-4 mb-6">
          {upcoming.map(ev => (
            <EventCard key={ev.id} ev={ev} expanded={expanded === ev.id} onToggle={() => setExpanded(expanded === ev.id ? null : ev.id)}
              isCoach={isCoach} user={user}
              onEdit={() => openEdit(ev)} onDelete={() => deleteEvent(ev.id)}
              onSetStatus={(s) => setStatus(ev.id, s)}
              onPostUpdate={() => { setShowUpdateForm(ev.id); setUpdateForm({ type: "result", content: "", media_url: "", athlete_name: "", event_name: "" }); }}
              onDeleteUpdate={(uid) => deleteUpdate(ev.id, uid, ev.live_updates || [])}
              showUpdateForm={showUpdateForm === ev.id}
              updateForm={updateForm} setUpdateForm={setUpdateForm}
              onSaveUpdate={() => postUpdate(ev.id, ev.live_updates || [])}
              onCancelUpdate={() => setShowUpdateForm(null)}
            />
          ))}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Completed Events</p>
          <div className="space-y-3 opacity-70">
            {past.map(ev => (
              <EventCard key={ev.id} ev={ev} expanded={expanded === ev.id} onToggle={() => setExpanded(expanded === ev.id ? null : ev.id)}
                isCoach={isCoach} user={user}
                onEdit={() => openEdit(ev)} onDelete={() => deleteEvent(ev.id)}
                onSetStatus={(s) => setStatus(ev.id, s)}
                onPostUpdate={() => { setShowUpdateForm(ev.id); setUpdateForm({ type: "result", content: "", media_url: "", athlete_name: "", event_name: "" }); }}
                onDeleteUpdate={(uid) => deleteUpdate(ev.id, uid, ev.live_updates || [])}
                showUpdateForm={showUpdateForm === ev.id}
                updateForm={updateForm} setUpdateForm={setUpdateForm}
                onSaveUpdate={() => postUpdate(ev.id, ev.live_updates || [])}
                onCancelUpdate={() => setShowUpdateForm(null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editingEvent ? "Edit Event" : "New Race Day Event"}</h2>
              <button onClick={() => setShowEventForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Event / Meet Name *</label>
                  <input value={eventForm.event_name || ""} onChange={e => setEventForm(f => ({ ...f, event_name: e.target.value }))} className={inp} placeholder="e.g. Regional Championship Meet" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Date *</label>
                  <input type="date" value={eventForm.event_date || ""} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Location</label>
                  <input value={eventForm.location || ""} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} className={inp} placeholder="Venue / Address" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Team Arrival Time</label>
                  <input value={eventForm.arrival_time || ""} onChange={e => setEventForm(f => ({ ...f, arrival_time: e.target.value }))} className={inp} placeholder="e.g. 7:30 AM" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Athlete Check-In Time</label>
                  <input value={eventForm.check_in_time || ""} onChange={e => setEventForm(f => ({ ...f, check_in_time: e.target.value }))} className={inp} placeholder="e.g. 8:00 AM" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Warm-Up Time</label>
                  <input value={eventForm.warm_up_time || ""} onChange={e => setEventForm(f => ({ ...f, warm_up_time: e.target.value }))} className={inp} placeholder="e.g. 8:30 AM" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">First Event Time</label>
                  <input value={eventForm.first_event_time || ""} onChange={e => setEventForm(f => ({ ...f, first_event_time: e.target.value }))} className={inp} placeholder="e.g. 9:00 AM" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Dress Code / What to Bring</label>
                  <input value={eventForm.dress_code || ""} onChange={e => setEventForm(f => ({ ...f, dress_code: e.target.value }))} className={inp} placeholder="e.g. Full uniform, spikes, water bottle" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-gray-400 text-xs mb-1 block">Coach Notes</label>
                  <textarea value={eventForm.notes || ""} onChange={e => setEventForm(f => ({ ...f, notes: e.target.value }))} rows={3} className={inp + " resize-none"} placeholder="Any additional info for athletes..." />
                </div>
              </div>

              {/* Schedule Rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 text-xs">Event Schedule</label>
                  <button onClick={() => setScheduleRows(r => [...r, { event: "", time: "", participants: "", notes: "" }])} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Row</button>
                </div>
                {scheduleRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                    <input value={row.event} onChange={e => setScheduleRows(r => r.map((x, j) => j === i ? { ...x, event: e.target.value } : x))} className={inp + " col-span-4"} placeholder="Event" />
                    <input value={row.time} onChange={e => setScheduleRows(r => r.map((x, j) => j === i ? { ...x, time: e.target.value } : x))} className={inp + " col-span-3"} placeholder="Time" />
                    <input value={row.participants} onChange={e => setScheduleRows(r => r.map((x, j) => j === i ? { ...x, participants: e.target.value } : x))} className={inp + " col-span-4"} placeholder="Athletes" />
                    <button onClick={() => setScheduleRows(r => r.filter((_, j) => j !== i))} className="col-span-1 text-gray-600 hover:text-red-400 flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Status</label>
                <select value={eventForm.status || "upcoming"} onChange={e => setEventForm(f => ({ ...f, status: e.target.value }))} className={inp}>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEventForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={saveEvent} disabled={saving || !eventForm.event_name || !eventForm.event_date} className="flex-1 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                  {saving ? "Saving..." : "Save Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ ev, expanded, onToggle, isCoach, user, onEdit, onDelete, onSetStatus, onPostUpdate, onDeleteUpdate, showUpdateForm, updateForm, setUpdateForm, onSaveUpdate, onCancelUpdate }) {
  const updates = ev.live_updates || [];
  const isLive = ev.status === "live";

  return (
    <div className={`bg-[#141414] border rounded-xl overflow-hidden transition-all ${isLive ? "border-[var(--color-primary,#f97316)]" : "border-gray-800"}`}>
      {/* Card Header */}
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-bold">{ev.event_name}</h3>
              {isLive && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                  <Radio className="w-3 h-3" /> LIVE
                </span>
              )}
              {ev.status === "completed" && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Completed</span>}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
              {ev.event_date && <span className="flex items-center gap-1"><Flag className="w-3 h-3" />{new Date(ev.event_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>}
              {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}
              {ev.check_in_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Check-in: {ev.check_in_time}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {updates.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-primary,#f97316)20", color: "var(--color-primary,#f97316)" }}>{updates.length} updates</span>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-800">
          {/* Coach Actions */}
          {isCoach && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border-b border-gray-800 flex-wrap">
              <button onClick={onPostUpdate} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-white font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                <Plus className="w-3 h-3" /> Post Update
              </button>
              {ev.status !== "live" && <button onClick={() => onSetStatus("live")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30"><Radio className="w-3 h-3" /> Go Live</button>}
              {ev.status === "live" && <button onClick={() => onSetStatus("completed")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">Mark Complete</button>}
              <button onClick={onEdit} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5"><Edit className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Post Update Form */}
          {showUpdateForm && (
            <div className="p-4 bg-[#111111] border-b border-gray-800 space-y-3">
              <p className="text-white text-sm font-semibold">Post Live Update</p>
              <div className="flex gap-2 flex-wrap">
                {UPDATE_TYPES.map(t => (
                  <button key={t.value} onClick={() => setUpdateForm(f => ({ ...f, type: t.value }))}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${updateForm.type === t.value ? t.color : "border-gray-700 text-gray-500 hover:text-gray-300"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={updateForm.athlete_name || ""} onChange={e => setUpdateForm(f => ({ ...f, athlete_name: e.target.value }))} placeholder="Athlete name (optional)" className="col-span-1 bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" />
                <input value={updateForm.event_name || ""} onChange={e => setUpdateForm(f => ({ ...f, event_name: e.target.value }))} placeholder="Event (e.g. 100m)" className="col-span-1 bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" />
              </div>
              <textarea value={updateForm.content} onChange={e => setUpdateForm(f => ({ ...f, content: e.target.value }))} rows={2} placeholder="Update content (result, stat, note...)" className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none resize-none" />
              {(updateForm.type === "photo" || updateForm.type === "video") && (
                <input value={updateForm.media_url || ""} onChange={e => setUpdateForm(f => ({ ...f, media_url: e.target.value }))} placeholder="Media URL" className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" />
              )}
              <div className="flex gap-2">
                <button onClick={onCancelUpdate} className="flex-1 bg-gray-800 text-gray-400 py-1.5 rounded-lg text-sm">Cancel</button>
                <button onClick={onSaveUpdate} disabled={!updateForm.content} className="flex-1 text-white py-1.5 rounded-lg text-sm font-medium disabled:opacity-40" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Post</button>
              </div>
            </div>
          )}

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Schedule / Times */}
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3 font-semibold">Race Day Schedule</p>
              <div className="space-y-2">
                {ev.arrival_time && <TimeRow icon={Clock} label="Team Arrival" value={ev.arrival_time} />}
                {ev.check_in_time && <TimeRow icon={Clock} label="Athlete Check-In" value={ev.check_in_time} highlight />}
                {ev.warm_up_time && <TimeRow icon={Clock} label="Warm-Up" value={ev.warm_up_time} />}
                {ev.first_event_time && <TimeRow icon={Flag} label="First Event" value={ev.first_event_time} />}
              </div>
              {ev.schedule_items?.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Event Schedule</p>
                  <div className="rounded-lg border border-gray-800 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-[#1a1a1a] text-gray-500"><th className="px-3 py-2 text-left">Event</th><th className="px-3 py-2 text-left">Time</th><th className="px-3 py-2 text-left hidden sm:table-cell">Athletes</th></tr></thead>
                      <tbody>
                        {ev.schedule_items.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-[#111]" : "bg-[#0d0d0d]"}>
                            <td className="px-3 py-2 text-white">{row.event}</td>
                            <td className="px-3 py-2 text-gray-300">{row.time}</td>
                            <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{row.participants}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {ev.dress_code && (
                <div className="mt-3 p-3 bg-[#111] rounded-lg border border-gray-800">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">What to Bring</p>
                  <p className="text-gray-300 text-sm">{ev.dress_code}</p>
                </div>
              )}
              {ev.notes && (
                <div className="mt-3 p-3 rounded-lg border" style={{ backgroundColor: "var(--color-primary,#f97316)08", borderColor: "var(--color-primary,#f97316)30" }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--color-primary,#f97316)" }}>Coach Notes</p>
                  <p className="text-gray-300 text-sm whitespace-pre-line">{ev.notes}</p>
                </div>
              )}
            </div>

            {/* Live Updates */}
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3 font-semibold flex items-center gap-2">
                Live Updates
                {isLive && <span className="text-red-400 text-xs normal-case font-normal flex items-center gap-1 animate-pulse"><Radio className="w-3 h-3" /> Live</span>}
              </p>
              {updates.length === 0 && (
                <div className="text-center py-8 text-gray-600 text-sm">{isLive ? "Updates will appear here..." : "No updates posted yet."}</div>
              )}
              <div className="space-y-3">
                {updates.map(u => (
                  <div key={u.id} className="bg-[#111] border border-gray-800 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <UpdateBadge type={u.type} />
                        {u.athlete_name && <span className="text-white text-xs font-semibold">{u.athlete_name}</span>}
                        {u.event_name && <span className="text-gray-500 text-xs">· {u.event_name}</span>}
                      </div>
                      {isCoach && (
                        <button onClick={() => onDeleteUpdate(u.id)} className="text-gray-700 hover:text-red-400 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm">{u.content}</p>
                    {u.media_url && u.type === "photo" && (
                      <img src={u.media_url} alt="" className="mt-2 rounded-lg w-full object-cover max-h-48" />
                    )}
                    {u.media_url && u.type === "video" && (
                      <a href={u.media_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-teal-400 text-xs hover:underline"><Video className="w-3 h-3" /> Watch video</a>
                    )}
                    <p className="text-gray-600 text-xs mt-1">{u.posted_by} · {u.posted_at ? new Date(u.posted_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${highlight ? "border" : "bg-[#111]"}`}
      style={highlight ? { backgroundColor: "var(--color-primary,#f97316)10", borderColor: "var(--color-primary,#f97316)40" } : {}}>
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={highlight ? { color: "var(--color-primary,#f97316)" } : { color: "#6b7280" }} />
        <span className={`text-sm ${highlight ? "text-white font-semibold" : "text-gray-400"}`}>{label}</span>
      </div>
      <span className={`text-sm font-bold ${highlight ? "" : "text-white"}`} style={highlight ? { color: "var(--color-primary,#f97316)" } : {}}>{value}</span>
    </div>
  );
}