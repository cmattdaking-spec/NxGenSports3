import { useState, useEffect, useCallback } from "react";
import { getToken } from "@/api/apiClient";
import {
  Search, Plus, ArrowLeft, Users, BookOpen, MapPin, Calendar,
  Trash2, Edit2, ChevronRight, Clock, Building, Award, Briefcase, GraduationCap
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const API = "/api/faculty";

async function apiFetch(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Request failed"); }
  return res.json();
}

const POSITIONS = ["Teacher", "Department Head", "Counselor", "Librarian", "Nurse", "Administrator", "Coach", "Support Staff", "Substitute"];
const STATUSES = ["active", "on_leave", "terminated", "retired"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const ROOM_TYPES = ["classroom", "lab", "gym", "auditorium", "library", "office", "other"];

function StatCard({ icon: Icon, label, value, color = "cyan" }) {
  const c = {
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    green: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400",
  };
  return (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`} className={`bg-gradient-to-br ${c[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
    </div>
  );
}

// ─── Faculty Form ────────────────────────────────────────────────────────────
function FacultyForm({ member, departments, onSave, onCancel }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", position: "Teacher",
    department: "", employee_id: "", hire_date: "", status: "active",
    qualifications: "", bio: "", office_room: "", subjects: [],
    ...member
  });
  const [subjectInput, setSubjectInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const addSubject = () => {
    if (subjectInput.trim() && !form.subjects.includes(subjectInput.trim())) {
      setForm(f => ({ ...f, subjects: [...f.subjects, subjectInput.trim()] }));
      setSubjectInput("");
    }
  };

  const F = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <input data-testid={`faculty-form-${key}`} type={type} value={form[key] || ""} placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {F("First Name *", "first_name", "text", "Sarah")}
        {F("Last Name *", "last_name", "text", "Johnson")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F("Email", "email", "email", "sarah@school.com")}
        {F("Phone", "phone", "tel")}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Position</label>
          <select data-testid="faculty-form-position" value={form.position}
            onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            {POSITIONS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Department</label>
          <select data-testid="faculty-form-department" value={form.department}
            onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">None</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Status</label>
          <select data-testid="faculty-form-status" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F("Employee ID", "employee_id", "text", "EMP001")}
        {F("Hire Date", "hire_date", "date")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F("Qualifications", "qualifications")}
        {F("Office Room", "office_room")}
      </div>
      {/* Subjects */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Subjects</label>
        <div className="flex gap-2 mb-2">
          <input value={subjectInput} onChange={e => setSubjectInput(e.target.value)} placeholder="Add subject..."
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }}
            className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          <button type="button" onClick={addSubject} className="bg-cyan-600/20 text-cyan-400 px-3 py-2 rounded-lg text-sm hover:bg-cyan-600/30">Add</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {form.subjects.map((s, i) => (
            <span key={i} className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              {s}
              <button type="button" onClick={() => setForm(f => ({ ...f, subjects: f.subjects.filter((_, j) => j !== i) }))}
                className="hover:text-red-400">&times;</button>
            </span>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Bio</label>
        <textarea data-testid="faculty-form-bio" value={form.bio || ""} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          placeholder="Brief bio..."
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white min-h-[60px]" />
      </div>
      <div className="flex gap-2 pt-2">
        <button data-testid="faculty-form-save" type="submit" disabled={saving || !form.first_name || !form.last_name}
          className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
          {saving ? "Saving..." : member?.id ? "Update" : "Add Faculty"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm hover:bg-white/5">Cancel</button>
      </div>
    </form>
  );
}

// ─── Schedule Row ────────────────────────────────────────────────────────────
function ScheduleGrid({ entries, onDelete }) {
  if (!entries.length) return <p className="text-gray-500 text-sm text-center py-4">No schedule entries yet.</p>;
  const grouped = {};
  DAYS.forEach(d => { grouped[d] = entries.filter(e => e.day_of_week === d).sort((a, b) => (a.period || "").localeCompare(b.period || "")); });
  return (
    <div className="space-y-3">
      {DAYS.map(day => grouped[day].length > 0 && (
        <div key={day}>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">{day}</p>
          <div className="space-y-1">
            {grouped[day].map(e => (
              <div key={e.id} className="bg-[#141414] border border-gray-800 rounded-lg px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-cyan-400 font-mono w-14">P{e.period}</span>
                  <span className="text-sm text-white font-medium truncate">{e.subject_name}</span>
                  <span className="text-xs text-gray-500">Room {e.classroom}</span>
                  <span className="text-xs text-gray-600">{e.start_time}–{e.end_time}</span>
                  {e.grade_level && <span className="text-xs text-gray-600">Gr {e.grade_level}</span>}
                </div>
                {onDelete && <button onClick={() => onDelete(e.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Faculty Detail ──────────────────────────────────────────────────────────
function FacultyDetail({ member, onBack, onRefresh }) {
  const [schedule, setSchedule] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schForm, setSchForm] = useState({ subject_name: "", classroom: "", period: "1", day_of_week: "Monday", start_time: "08:00", end_time: "08:50", grade_level: "", notes: "" });

  const fid = member.id;

  const loadSchedule = useCallback(async () => {
    const data = await apiFetch("GET", `${API}/member/${fid}/schedule`);
    setSchedule(data);
  }, [fid]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const addSchedule = async () => {
    await apiFetch("POST", `${API}/member/${fid}/schedule`, schForm);
    setShowScheduleForm(false);
    setSchForm({ subject_name: "", classroom: "", period: "1", day_of_week: "Monday", start_time: "08:00", end_time: "08:50", grade_level: "", notes: "" });
    loadSchedule();
  };

  const delSchedule = async (eid) => {
    await apiFetch("DELETE", `${API}/member/${fid}/schedule/${eid}`);
    loadSchedule();
  };

  return (
    <div data-testid="faculty-detail" className="space-y-6">
      <div className="flex items-center gap-4">
        <button data-testid="faculty-detail-back" onClick={onBack} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{member.full_name}</h2>
          <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
            <span>{member.position}</span>
            {member.department && <><span className="text-gray-700">|</span><span>{member.department}</span></>}
            {member.employee_id && <><span className="text-gray-700">|</span><span>ID: {member.employee_id}</span></>}
            <Badge variant="outline" className={member.status === "active" ? "border-emerald-500/50 text-emerald-400" : "border-amber-500/50 text-amber-400"}>
              {member.status?.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Contact & Info</h3>
          {[
            ["Email", member.email],
            ["Phone", member.phone],
            ["Hire Date", member.hire_date],
            ["Office", member.office_room],
            ["Qualifications", member.qualifications],
          ].map(([lbl, val]) => val ? (
            <div key={lbl} className="flex justify-between">
              <span className="text-xs text-gray-500">{lbl}</span>
              <span className="text-sm text-gray-300">{val}</span>
            </div>
          ) : null)}
          {member.bio && <p className="text-xs text-gray-400 border-t border-gray-800 pt-2">{member.bio}</p>}
        </div>
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Subjects</h3>
          {member.subjects?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {member.subjects.map((s, i) => (
                <span key={i} className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          ) : <p className="text-xs text-gray-500">No subjects assigned.</p>}
          <h3 className="text-sm font-semibold text-white mt-4">Schedule Summary</h3>
          <p className="text-2xl font-bold text-cyan-400">{schedule.length} <span className="text-sm font-normal text-gray-500">classes/week</span></p>
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Class Schedule</h3>
          <button data-testid="add-schedule-btn" onClick={() => setShowScheduleForm(true)}
            className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300"><Plus className="w-3 h-3" /> Add Class</button>
        </div>
        {showScheduleForm && (
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input data-testid="schedule-form-subject" placeholder="Subject *" value={schForm.subject_name}
                onChange={e => setSchForm(f => ({ ...f, subject_name: e.target.value }))}
                className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              <input placeholder="Classroom" value={schForm.classroom}
                onChange={e => setSchForm(f => ({ ...f, classroom: e.target.value }))}
                className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <select data-testid="schedule-form-day" value={schForm.day_of_week} onChange={e => setSchForm(f => ({ ...f, day_of_week: e.target.value }))}
                className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
              <select data-testid="schedule-form-period" value={schForm.period} onChange={e => setSchForm(f => ({ ...f, period: e.target.value }))}
                className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                {PERIODS.map(p => <option key={p}>{p}</option>)}
              </select>
              <input type="time" value={schForm.start_time} onChange={e => setSchForm(f => ({ ...f, start_time: e.target.value }))}
                className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              <input type="time" value={schForm.end_time} onChange={e => setSchForm(f => ({ ...f, end_time: e.target.value }))}
                className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="flex gap-2">
              <button data-testid="schedule-form-save" onClick={addSchedule} disabled={!schForm.subject_name}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">Save</button>
              <button onClick={() => setShowScheduleForm(false)} className="text-gray-400 text-sm hover:text-white">Cancel</button>
            </div>
          </div>
        )}
        <ScheduleGrid entries={schedule} onDelete={delSchedule} />
      </div>

      {/* Linked Students */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Linked Students</h3>
        <LinkedStudents facultyId={fid} />
      </div>
    </div>
  );
}

// ─── Manage Panel (Departments, Subjects, Classrooms) ────────────────────────
function ManagePanel({ departments, subjects, classrooms, onRefresh }) {
  const [deptName, setDeptName] = useState("");
  const [deptHead, setDeptHead] = useState("");
  const [subjName, setSubjName] = useState("");
  const [subjCode, setSubjCode] = useState("");
  const [subjDept, setSubjDept] = useState("");
  const [roomNum, setRoomNum] = useState("");
  const [roomBldg, setRoomBldg] = useState("");
  const [roomCap, setRoomCap] = useState("");
  const [roomType, setRoomType] = useState("classroom");

  const addDept = async () => {
    if (!deptName) return;
    await apiFetch("POST", `${API}/departments`, { name: deptName, head_name: deptHead });
    setDeptName(""); setDeptHead(""); onRefresh();
  };
  const delDept = async (id) => { await apiFetch("DELETE", `${API}/departments/${id}`); onRefresh(); };
  const addSubj = async () => {
    if (!subjName) return;
    await apiFetch("POST", `${API}/subjects`, { name: subjName, code: subjCode, department: subjDept });
    setSubjName(""); setSubjCode(""); setSubjDept(""); onRefresh();
  };
  const delSubj = async (id) => { await apiFetch("DELETE", `${API}/subjects/${id}`); onRefresh(); };
  const addRoom = async () => {
    if (!roomNum) return;
    await apiFetch("POST", `${API}/classrooms`, { room_number: roomNum, building: roomBldg, capacity: roomCap ? Number(roomCap) : null, room_type: roomType });
    setRoomNum(""); setRoomBldg(""); setRoomCap(""); setRoomType("classroom"); onRefresh();
  };
  const delRoom = async (id) => { await apiFetch("DELETE", `${API}/classrooms/${id}`); onRefresh(); };

  return (
    <div className="space-y-6">
      {/* Departments */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Departments</h3>
        <div className="flex gap-2 mb-3">
          <input data-testid="dept-name-input" value={deptName} onChange={e => setDeptName(e.target.value)} placeholder="Department name *"
            className="flex-1 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          <input value={deptHead} onChange={e => setDeptHead(e.target.value)} placeholder="Head"
            className="flex-1 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          <button data-testid="add-dept-btn" onClick={addDept} disabled={!deptName}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="space-y-1">
          {departments.map(d => (
            <div key={d.id} className="flex items-center justify-between px-3 py-1.5 bg-[#0d0d0d] rounded-lg">
              <div><span className="text-sm text-white">{d.name}</span>{d.head_name && <span className="text-xs text-gray-500 ml-2">Head: {d.head_name}</span>}</div>
              <button onClick={() => delDept(d.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {departments.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No departments yet.</p>}
        </div>
      </div>
      {/* Subjects */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Subjects</h3>
        <div className="flex gap-2 mb-3">
          <input data-testid="subj-name-input" value={subjName} onChange={e => setSubjName(e.target.value)} placeholder="Subject name *"
            className="flex-1 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          <input value={subjCode} onChange={e => setSubjCode(e.target.value)} placeholder="Code"
            className="w-24 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          <select value={subjDept} onChange={e => setSubjDept(e.target.value)}
            className="w-32 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">Dept</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <button data-testid="add-subj-btn" onClick={addSubj} disabled={!subjName}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="space-y-1">
          {subjects.map(s => (
            <div key={s.id} className="flex items-center justify-between px-3 py-1.5 bg-[#0d0d0d] rounded-lg">
              <div><span className="text-sm text-white">{s.name}</span>{s.code && <span className="text-xs text-gray-500 ml-2">{s.code}</span>}{s.department && <span className="text-xs text-gray-600 ml-2">{s.department}</span>}</div>
              <button onClick={() => delSubj(s.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {subjects.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No subjects yet.</p>}
        </div>
      </div>
      {/* Classrooms */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Classrooms</h3>
        <div className="flex gap-2 mb-3">
          <input data-testid="room-num-input" value={roomNum} onChange={e => setRoomNum(e.target.value)} placeholder="Room # *"
            className="w-20 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          <input value={roomBldg} onChange={e => setRoomBldg(e.target.value)} placeholder="Building"
            className="flex-1 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          <input value={roomCap} onChange={e => setRoomCap(e.target.value)} placeholder="Cap" type="number"
            className="w-16 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          <select value={roomType} onChange={e => setRoomType(e.target.value)}
            className="w-28 bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            {ROOM_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <button data-testid="add-room-btn" onClick={addRoom} disabled={!roomNum}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="space-y-1">
          {classrooms.map(r => (
            <div key={r.id} className="flex items-center justify-between px-3 py-1.5 bg-[#0d0d0d] rounded-lg">
              <div>
                <span className="text-sm text-white">Room {r.room_number}</span>
                {r.building && <span className="text-xs text-gray-500 ml-2">{r.building}</span>}
                {r.capacity && <span className="text-xs text-gray-600 ml-2">Cap: {r.capacity}</span>}
                <span className="text-xs text-gray-700 ml-2">{r.room_type}</span>
              </div>
              <button onClick={() => delRoom(r.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {classrooms.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No classrooms yet.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Master Schedule Calendar ────────────────────────────────────────────────
const DEPT_COLORS = [
  { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-300" },
  { bg: "bg-purple-500/15", border: "border-purple-500/30", text: "text-purple-300" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300" },
  { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-300" },
  { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-300" },
  { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-300" },
  { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-300" },
  { bg: "bg-teal-500/15", border: "border-teal-500/30", text: "text-teal-300" },
];

function MasterScheduleCalendar() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("GET", `${API}/schedule/all`);
        setEntries(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-700 border-t-cyan-500 rounded-full animate-spin" /></div>;

  // Build faculty color map
  const facultyNames = [...new Set(entries.map(e => e.faculty_name).filter(Boolean))];
  const colorMap = {};
  facultyNames.forEach((name, i) => { colorMap[name] = DEPT_COLORS[i % DEPT_COLORS.length]; });

  // Build grid: period x day
  const usedPeriods = [...new Set(entries.map(e => e.period))].sort();
  const periods = usedPeriods.length > 0 ? usedPeriods : PERIODS;

  const getCell = (day, period) => entries.filter(e => e.day_of_week === day && e.period === period);

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
        <p className="text-gray-400 text-lg font-medium">No schedule entries yet</p>
        <p className="text-gray-600 text-sm mt-1">Add schedule entries from faculty detail pages.</p>
      </div>
    );
  }

  return (
    <div data-testid="master-schedule-calendar" className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {facultyNames.map(name => {
          const c = colorMap[name];
          return (
            <span key={name} className={`text-xs px-2 py-0.5 rounded-full border ${c.bg} ${c.border} ${c.text}`}>{name}</span>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header Row */}
          <div className="grid grid-cols-6 gap-px bg-gray-800 rounded-t-xl overflow-hidden">
            <div className="bg-[#0d0d0d] p-2 text-center">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Period</span>
            </div>
            {DAYS.map(day => (
              <div key={day} className="bg-[#0d0d0d] p-2 text-center">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">{day.slice(0, 3)}</span>
              </div>
            ))}
          </div>

          {/* Period Rows */}
          {periods.map(period => (
            <div key={period} className="grid grid-cols-6 gap-px bg-gray-800">
              {/* Period label */}
              <div className="bg-[#111] p-2 flex items-center justify-center">
                <span className="text-xs text-cyan-400 font-mono font-bold">P{period}</span>
              </div>
              {/* Day cells */}
              {DAYS.map(day => {
                const cellEntries = getCell(day, period);
                return (
                  <div key={day} className="bg-[#111] p-1.5 min-h-[64px]">
                    {cellEntries.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-gray-800 text-xs">—</span>
                      </div>
                    ) : cellEntries.map((e, i) => {
                      const c = colorMap[e.faculty_name] || DEPT_COLORS[0];
                      return (
                        <div key={i} data-testid={`schedule-cell-${day}-${period}`}
                          className={`${c.bg} ${c.border} border rounded-lg p-1.5 mb-1 last:mb-0`}>
                          <p className={`text-xs font-medium ${c.text} truncate`}>{e.subject_name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{e.faculty_name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {e.classroom && <span className="text-[10px] text-gray-600">Rm {e.classroom}</span>}
                            {e.start_time && <span className="text-[10px] text-gray-700">{e.start_time}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Linked Students (Faculty Detail) ────────────────────────────────────────
function LinkedStudents({ facultyId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("GET", `${API}/member/${facultyId}/students`);
        setStudents(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [facultyId]);

  if (loading) return <div className="text-xs text-gray-500">Loading students...</div>;
  if (students.length === 0) return <p className="text-xs text-gray-500 text-center py-3">No linked students. Assign this teacher when adding grades to students.</p>;

  return (
    <div data-testid="linked-students" className="space-y-2">
      {students.map(s => (
        <div key={s.student_id} className="bg-[#141414] border border-gray-800 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{s.full_name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Grade {s.grade_level}</span>
              {s.student_code && <><span className="text-gray-700">|</span><span>{s.student_code}</span></>}
              {s.gpa != null && <><span className="text-gray-700">|</span><span className="text-cyan-400">GPA: {s.gpa.toFixed(2)}</span></>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {s.courses.map((c, i) => (
              <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                {c.course_name} ({c.grade_letter})
              </span>
            ))}
          </div>
          <Badge variant="outline" className={`text-xs ${s.status === "active" ? "border-emerald-500/50 text-emerald-400" : "border-gray-600 text-gray-400"}`}>
            {s.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function FacultyStaff() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState("directory");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, d, s, c, st] = await Promise.all([
        apiFetch("GET", `${API}/`),
        apiFetch("GET", `${API}/departments`),
        apiFetch("GET", `${API}/subjects`),
        apiFetch("GET", `${API}/classrooms`),
        apiFetch("GET", `${API}/stats`),
      ]);
      setFaculty(f); setDepartments(d); setSubjects(s); setClassrooms(c); setStats(st);
    } catch (err) { console.error("Load error:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveFaculty = async (form) => {
    if (editing?.id) {
      await apiFetch("PATCH", `${API}/member/${editing.id}`, form);
    } else {
      await apiFetch("POST", `${API}/`, form);
    }
    setShowForm(false); setEditing(null); load();
  };

  const deleteFaculty = async (id) => {
    if (!confirm("Delete this faculty member and their schedule?")) return;
    await apiFetch("DELETE", `${API}/member/${id}`);
    load();
  };

  const filtered = faculty.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.full_name?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q) || f.employee_id?.toLowerCase().includes(q);
    const matchDept = filterDept === "all" || f.department === filterDept;
    const matchStatus = filterStatus === "all" || f.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  if (selected) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <FacultyDetail member={selected} onBack={() => { setSelected(null); load(); }} onRefresh={load} />
      </div>
    );
  }

  return (
    <div data-testid="faculty-staff-page" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Faculty & Staff</h1>
          <p className="text-sm text-gray-500 mt-1">{stats?.total_faculty ?? 0} member{(stats?.total_faculty ?? 0) !== 1 ? "s" : ""} | {stats?.departments ?? 0} departments</p>
        </div>
        <button data-testid="add-faculty-btn" onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Faculty
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Users} label="Faculty" value={stats.total_faculty} color="cyan" />
          <StatCard icon={Award} label="Active" value={stats.active_faculty} color="green" />
          <StatCard icon={Building} label="Departments" value={stats.departments} color="blue" />
          <StatCard icon={BookOpen} label="Subjects" value={stats.subjects} color="purple" />
          <StatCard icon={MapPin} label="Classrooms" value={stats.classrooms} color="amber" />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-[#1a1a1a] border border-gray-800">
          <TabsTrigger value="directory" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Directory</TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Schedule</TabsTrigger>
          <TabsTrigger value="manage" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Manage</TabsTrigger>
        </TabsList>

        {/* Directory Tab */}
        <TabsContent value="directory" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input data-testid="faculty-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search faculty..."
                className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
            </div>
            <select data-testid="filter-dept" value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white">
              <option value="all">All Depts</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <select data-testid="filter-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white">
              <option value="all">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-700 border-t-cyan-500 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 text-lg font-medium">{search || filterDept !== "all" || filterStatus !== "all" ? "No matches" : "No faculty yet"}</p>
              <p className="text-gray-600 text-sm mt-1">Click "Add Faculty" to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(f => (
                <div key={f.id} data-testid={`faculty-row-${f.id}`}
                  className="bg-[#141414] border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors cursor-pointer group"
                  onClick={() => setSelected(f)}>
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 font-bold text-sm">{(f.first_name?.[0] || "")}{(f.last_name?.[0] || "")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{f.full_name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span>{f.position}</span>
                      {f.department && <><span className="text-gray-700">|</span><span>{f.department}</span></>}
                      {f.employee_id && <><span className="text-gray-700">|</span><span>{f.employee_id}</span></>}
                    </div>
                  </div>
                  {f.subjects?.length > 0 && (
                    <div className="hidden md:flex items-center gap-1.5">
                      {f.subjects.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                      {f.subjects.length > 3 && <span className="text-xs text-gray-500">+{f.subjects.length - 3}</span>}
                    </div>
                  )}
                  <Badge variant="outline" className={`text-xs ${f.status === "active" ? "border-emerald-500/50 text-emerald-400" : "border-amber-500/50 text-amber-400"}`}>
                    {f.status?.replace("_", " ")}
                  </Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button data-testid={`edit-faculty-${f.id}`} onClick={e => { e.stopPropagation(); setEditing(f); setShowForm(true); }}
                      className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/5"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button data-testid={`delete-faculty-${f.id}`} onClick={e => { e.stopPropagation(); deleteFaculty(f.id); }}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          <MasterScheduleCalendar />
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="mt-4">
          <ManagePanel departments={departments} subjects={subjects} classrooms={classrooms} onRefresh={load} />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={open => { setShowForm(open); if (!open) setEditing(null); }}>
        <DialogContent className="bg-[#111] border border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Faculty" : "Add Faculty Member"}</DialogTitle>
          </DialogHeader>
          <FacultyForm member={editing} departments={departments} onSave={saveFaculty} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
