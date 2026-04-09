import { useState, useEffect, useCallback } from "react";
import { getToken } from "@/api/apiClient";
import { useSport } from "@/components/SportContext";
import {
  Search, Plus, ArrowLeft, GraduationCap, Calendar, BookOpen,
  AlertTriangle, FileText, Users, ChevronRight, Trash2, Edit2,
  Check, X, Clock, UserCheck, UserX, AlertCircle
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const API = "/api/students";

async function apiFetch(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

const GRADE_LEVELS = ["9", "10", "11", "12"];
const STATUSES = ["active", "inactive", "transferred", "graduated"];
const ATTENDANCE_STATUSES = ["present", "absent", "tardy", "excused"];
const DISCIPLINE_TYPES = ["warning", "detention", "suspension", "expulsion", "other"];
const ASSIGNMENT_STATUSES = ["pending", "submitted", "graded", "late", "missing"];
const GRADE_LETTERS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
const SEMESTERS = ["Fall 2024", "Spring 2025", "Fall 2025", "Spring 2026", "Fall 2026", "Spring 2027"];

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = "cyan", sub }) {
  const colors = {
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    green: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
    red: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-400",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400",
  };
  return (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
      className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Student Form ────────────────────────────────────────────────────────────
function StudentForm({ student, onSave, onCancel }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", student_id: "", email: "",
    grade_level: "9", gender: "", phone: "", date_of_birth: "",
    guardian_name: "", guardian_phone: "", guardian_email: "",
    address: "", status: "active", sports: [],
    ...student
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const F = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <input data-testid={`student-form-${key}`} type={type} value={form[key] || ""} placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {F("First Name *", "first_name", "text", "John")}
        {F("Last Name *", "last_name", "text", "Smith")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F("Student ID", "student_id", "text", "STU001")}
        {F("Email", "email", "email", "student@school.com")}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Grade Level</label>
          <select data-testid="student-form-grade_level" value={form.grade_level}
            onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            {GRADE_LEVELS.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </div>
        {F("Gender", "gender")}
        {F("Date of Birth", "date_of_birth", "date")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F("Phone", "phone", "tel")}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Status</label>
          <select data-testid="student-form-status" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>
      {F("Address", "address")}
      <div className="border-t border-gray-800 pt-3">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Guardian Info</p>
        <div className="grid grid-cols-3 gap-3">
          {F("Name", "guardian_name")}
          {F("Phone", "guardian_phone", "tel")}
          {F("Email", "guardian_email", "email")}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button data-testid="student-form-save" type="submit" disabled={saving || !form.first_name || !form.last_name}
          className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
          {saving ? "Saving..." : student?.id ? "Update Student" : "Add Student"}
        </button>
        <button data-testid="student-form-cancel" type="button" onClick={onCancel}
          className="px-4 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm hover:bg-white/5">Cancel</button>
      </div>
    </form>
  );
}

// ─── Grade Form (inline) ────────────────────────────────────────────────────
function GradeForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ course_name: "", course_code: "", teacher_name: "", faculty_id: "", semester: SEMESTERS[2], grade_letter: "A", grade_percent: "", credit_hours: "3", notes: "" });
  const [facultyList, setFacultyList] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        const res = await fetch("/api/faculty/", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setFacultyList(await res.json());
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const handleFacultyChange = (e) => {
    const fid = e.target.value;
    if (!fid) {
      setForm(f => ({ ...f, faculty_id: "", teacher_name: "" }));
      return;
    }
    const fac = facultyList.find(f => f.id === fid);
    setForm(f => ({ ...f, faculty_id: fid, teacher_name: fac?.full_name || "" }));
  };

  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input data-testid="grade-form-course" placeholder="Course Name *" value={form.course_name}
          onChange={e => setForm(f => ({ ...f, course_name: e.target.value }))}
          className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        <input placeholder="Course Code" value={form.course_code}
          onChange={e => setForm(f => ({ ...f, course_code: e.target.value }))}
          className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <select data-testid="grade-form-letter" value={form.grade_letter} onChange={e => setForm(f => ({ ...f, grade_letter: e.target.value }))}
          className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
          {GRADE_LETTERS.map(g => <option key={g}>{g}</option>)}
        </select>
        <input placeholder="%" type="number" value={form.grade_percent}
          onChange={e => setForm(f => ({ ...f, grade_percent: e.target.value }))}
          className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        <select data-testid="grade-form-semester" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
          className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
          {SEMESTERS.map(s => <option key={s}>{s}</option>)}
        </select>
        <input placeholder="Credits" type="number" value={form.credit_hours}
          onChange={e => setForm(f => ({ ...f, credit_hours: e.target.value }))}
          className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select data-testid="grade-form-faculty" value={form.faculty_id} onChange={handleFacultyChange}
          className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">Select Teacher (optional)</option>
          {facultyList.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
        </select>
        <input placeholder="Or type teacher name" value={form.teacher_name}
          onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))}
          className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
      </div>
      <div className="flex gap-2">
        <button data-testid="grade-form-save" onClick={() => onSave({ ...form, grade_percent: form.grade_percent ? Number(form.grade_percent) : null, credit_hours: Number(form.credit_hours) || 1 })}
          disabled={!form.course_name}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">Add Grade</button>
        <button onClick={onCancel} className="text-gray-400 text-sm hover:text-white">Cancel</button>
      </div>
    </div>
  );
}

// ─── Attendance badge ────────────────────────────────────────────────────────
function AttendanceBadge({ status }) {
  const map = {
    present: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    absent: "bg-red-500/20 text-red-400 border-red-500/30",
    tardy: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    excused: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${map[status] || "bg-gray-700 text-gray-400"}`}>{status}</span>;
}

// ─── Student Detail ──────────────────────────────────────────────────────────
function StudentDetail({ student, onBack, onUpdate }) {
  const [stats, setStats] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [discipline, setDiscipline] = useState([]);
  const [transcript, setTranscript] = useState(null);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showDisciplineForm, setShowDisciplineForm] = useState(false);
  const [attForm, setAttForm] = useState({ date: new Date().toISOString().slice(0, 10), status: "present", notes: "" });
  const [assignForm, setAssignForm] = useState({ title: "", course_name: "", due_date: "", status: "pending", max_grade: "100" });
  const [discForm, setDiscForm] = useState({ incident_date: new Date().toISOString().slice(0, 10), incident_type: "warning", description: "", action_taken: "" });
  const sid = student.id;

  const loadAll = useCallback(async () => {
    const [s, g, a, asgn, d, t] = await Promise.all([
      apiFetch("GET", `${API}/${sid}/stats`),
      apiFetch("GET", `${API}/${sid}/grades`),
      apiFetch("GET", `${API}/${sid}/attendance`),
      apiFetch("GET", `${API}/${sid}/assignments`),
      apiFetch("GET", `${API}/${sid}/discipline`),
      apiFetch("GET", `${API}/${sid}/transcript`),
    ]);
    setStats(s); setGrades(g); setAttendance(a); setAssignments(asgn); setDiscipline(d); setTranscript(t);
  }, [sid]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addGrade = async (data) => { await apiFetch("POST", `${API}/${sid}/grades`, data); setShowGradeForm(false); loadAll(); };
  const delGrade = async (gid) => { await apiFetch("DELETE", `${API}/${sid}/grades/${gid}`); loadAll(); };
  const addAttendance = async () => { await apiFetch("POST", `${API}/${sid}/attendance`, attForm); setShowAttendanceForm(false); setAttForm({ date: new Date().toISOString().slice(0, 10), status: "present", notes: "" }); loadAll(); };
  const delAttendance = async (rid) => { await apiFetch("DELETE", `${API}/${sid}/attendance/${rid}`); loadAll(); };
  const addAssignment = async () => { await apiFetch("POST", `${API}/${sid}/assignments`, { ...assignForm, max_grade: Number(assignForm.max_grade) || 100 }); setShowAssignmentForm(false); setAssignForm({ title: "", course_name: "", due_date: "", status: "pending", max_grade: "100" }); loadAll(); };
  const delAssignment = async (aid) => { await apiFetch("DELETE", `${API}/${sid}/assignments/${aid}`); loadAll(); };
  const addDiscipline = async () => { await apiFetch("POST", `${API}/${sid}/discipline`, discForm); setShowDisciplineForm(false); setDiscForm({ incident_date: new Date().toISOString().slice(0, 10), incident_type: "warning", description: "", action_taken: "" }); loadAll(); };
  const delDiscipline = async (did) => { await apiFetch("DELETE", `${API}/${sid}/discipline/${did}`); loadAll(); };

  return (
    <div data-testid="student-detail" className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button data-testid="student-detail-back" onClick={onBack} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{student.full_name}</h2>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>Grade {student.grade_level}</span>
            {student.student_id && <span>ID: {student.student_id}</span>}
            <Badge variant="outline" className={student.status === "active" ? "border-emerald-500/50 text-emerald-400" : "border-gray-600 text-gray-400"}>
              {student.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={GraduationCap} label="GPA" value={stats.gpa?.toFixed(2)} color="cyan" />
          <StatCard icon={Calendar} label="Attendance" value={stats.attendance.rate != null ? `${stats.attendance.rate}%` : undefined} color="green"
            sub={stats.attendance.total > 0 ? `${stats.attendance.present}/${stats.attendance.total} days` : null} />
          <StatCard icon={BookOpen} label="Assignments" value={`${stats.assignments.completed}/${stats.assignments.total}`} color="blue"
            sub={stats.assignments.missing > 0 ? `${stats.assignments.missing} missing` : "All on track"} />
          <StatCard icon={AlertTriangle} label="Discipline" value={stats.discipline.total} color={stats.discipline.unresolved > 0 ? "red" : "amber"}
            sub={stats.discipline.unresolved > 0 ? `${stats.discipline.unresolved} unresolved` : "No issues"} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="grades" className="w-full">
        <TabsList className="bg-[#1a1a1a] border border-gray-800 w-full flex overflow-x-auto">
          <TabsTrigger value="grades" className="flex-1 data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Grades</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Attendance</TabsTrigger>
          <TabsTrigger value="assignments" className="flex-1 data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Assignments</TabsTrigger>
          <TabsTrigger value="discipline" className="flex-1 data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Discipline</TabsTrigger>
          <TabsTrigger value="transcript" className="flex-1 data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Transcript</TabsTrigger>
        </TabsList>

        {/* Grades Tab */}
        <TabsContent value="grades" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Course Grades</h3>
            <button data-testid="add-grade-btn" onClick={() => setShowGradeForm(true)} className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300">
              <Plus className="w-3 h-3" /> Add Grade
            </button>
          </div>
          {showGradeForm && <GradeForm onSave={addGrade} onCancel={() => setShowGradeForm(false)} />}
          {grades.length === 0 && !showGradeForm && <p className="text-gray-500 text-sm py-4 text-center">No grades recorded yet.</p>}
          <div className="space-y-2">
            {grades.map(g => (
              <div key={g.id} className="bg-[#141414] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium">{g.course_name} {g.course_code && <span className="text-gray-500">({g.course_code})</span>}</p>
                  <p className="text-xs text-gray-500">{g.semester} {g.teacher_name && `| ${g.teacher_name}`} | {g.credit_hours} credits</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">{g.grade_letter}</span>
                  {g.grade_percent != null && <span className="text-xs text-gray-400">{g.grade_percent}%</span>}
                  <button onClick={() => delGrade(g.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Attendance Records</h3>
            <button data-testid="add-attendance-btn" onClick={() => setShowAttendanceForm(true)} className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300">
              <Plus className="w-3 h-3" /> Record Attendance
            </button>
          </div>
          {showAttendanceForm && (
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input data-testid="attendance-form-date" type="date" value={attForm.date} onChange={e => setAttForm(f => ({ ...f, date: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                <select data-testid="attendance-form-status" value={attForm.status} onChange={e => setAttForm(f => ({ ...f, status: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                  {ATTENDANCE_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <input placeholder="Notes" value={attForm.notes} onChange={e => setAttForm(f => ({ ...f, notes: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div className="flex gap-2">
                <button data-testid="attendance-form-save" onClick={addAttendance} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Save</button>
                <button onClick={() => setShowAttendanceForm(false)} className="text-gray-400 text-sm hover:text-white">Cancel</button>
              </div>
            </div>
          )}
          {attendance.length === 0 && !showAttendanceForm && <p className="text-gray-500 text-sm py-4 text-center">No attendance records yet.</p>}
          <div className="space-y-1.5">
            {attendance.map(a => (
              <div key={a.id} className="bg-[#141414] border border-gray-800 rounded-lg px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 font-mono w-24">{a.date}</span>
                  <AttendanceBadge status={a.status} />
                  {a.notes && <span className="text-xs text-gray-500">{a.notes}</span>}
                </div>
                <button onClick={() => delAttendance(a.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Assignments</h3>
            <button data-testid="add-assignment-btn" onClick={() => setShowAssignmentForm(true)} className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300">
              <Plus className="w-3 h-3" /> Add Assignment
            </button>
          </div>
          {showAssignmentForm && (
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input data-testid="assignment-form-title" placeholder="Title *" value={assignForm.title} onChange={e => setAssignForm(f => ({ ...f, title: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                <input placeholder="Course" value={assignForm.course_name} onChange={e => setAssignForm(f => ({ ...f, course_name: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="date" value={assignForm.due_date} onChange={e => setAssignForm(f => ({ ...f, due_date: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                <select value={assignForm.status} onChange={e => setAssignForm(f => ({ ...f, status: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                  {ASSIGNMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <input placeholder="Max Grade" type="number" value={assignForm.max_grade} onChange={e => setAssignForm(f => ({ ...f, max_grade: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div className="flex gap-2">
                <button data-testid="assignment-form-save" onClick={addAssignment} disabled={!assignForm.title}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">Save</button>
                <button onClick={() => setShowAssignmentForm(false)} className="text-gray-400 text-sm hover:text-white">Cancel</button>
              </div>
            </div>
          )}
          {assignments.length === 0 && !showAssignmentForm && <p className="text-gray-500 text-sm py-4 text-center">No assignments yet.</p>}
          <div className="space-y-2">
            {assignments.map(a => (
              <div key={a.id} className="bg-[#141414] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.course_name} {a.due_date && `| Due: ${a.due_date}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={
                    a.status === "graded" ? "border-emerald-500/50 text-emerald-400" :
                    a.status === "missing" ? "border-red-500/50 text-red-400" :
                    a.status === "late" ? "border-amber-500/50 text-amber-400" :
                    "border-gray-600 text-gray-400"
                  }>{a.status}</Badge>
                  <button onClick={() => delAssignment(a.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Discipline Tab */}
        <TabsContent value="discipline" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Discipline Records</h3>
            <button data-testid="add-discipline-btn" onClick={() => setShowDisciplineForm(true)} className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300">
              <Plus className="w-3 h-3" /> Add Record
            </button>
          </div>
          {showDisciplineForm && (
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input data-testid="discipline-form-date" type="date" value={discForm.incident_date} onChange={e => setDiscForm(f => ({ ...f, incident_date: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                <select data-testid="discipline-form-type" value={discForm.incident_type} onChange={e => setDiscForm(f => ({ ...f, incident_type: e.target.value }))}
                  className="bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                  {DISCIPLINE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <textarea data-testid="discipline-form-desc" placeholder="Description *" value={discForm.description} onChange={e => setDiscForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white min-h-[60px]" />
              <input placeholder="Action Taken" value={discForm.action_taken} onChange={e => setDiscForm(f => ({ ...f, action_taken: e.target.value }))}
                className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              <div className="flex gap-2">
                <button data-testid="discipline-form-save" onClick={addDiscipline} disabled={!discForm.description}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">Save</button>
                <button onClick={() => setShowDisciplineForm(false)} className="text-gray-400 text-sm hover:text-white">Cancel</button>
              </div>
            </div>
          )}
          {discipline.length === 0 && !showDisciplineForm && <p className="text-gray-500 text-sm py-4 text-center">No discipline records.</p>}
          <div className="space-y-2">
            {discipline.map(d => (
              <div key={d.id} className="bg-[#141414] border border-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      d.incident_type === "suspension" || d.incident_type === "expulsion" ? "border-red-500/50 text-red-400" :
                      d.incident_type === "detention" ? "border-amber-500/50 text-amber-400" :
                      "border-gray-600 text-gray-400"
                    }>{d.incident_type}</Badge>
                    <span className="text-xs text-gray-500">{d.incident_date}</span>
                  </div>
                  <button onClick={() => delDiscipline(d.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-sm text-gray-300">{d.description}</p>
                {d.action_taken && <p className="text-xs text-gray-500 mt-1">Action: {d.action_taken}</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-4">
          {!transcript ? <p className="text-gray-500 text-sm py-4 text-center">Loading transcript...</p> : (
            <div data-testid="student-transcript" className="space-y-4">
              <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Unofficial Transcript</h3>
                    <p className="text-xs text-gray-500">{student.full_name} | ID: {student.student_id || "N/A"} | Grade {student.grade_level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Cumulative GPA</p>
                    <p className="text-2xl font-bold text-cyan-400">{transcript.cumulative_gpa?.toFixed(2) ?? "—"}</p>
                  </div>
                </div>
                {transcript.semesters.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No grade records to display.</p>}
                {transcript.semesters.map((sem, i) => (
                  <div key={i} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-2 border-b border-gray-700 pb-1">
                      <h4 className="text-sm font-semibold text-white">{sem.semester}</h4>
                      <span className="text-xs text-gray-400">Semester GPA: <span className="text-white font-medium">{sem.semester_gpa?.toFixed(2) ?? "—"}</span> | Credits: {sem.total_credits}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs">
                          <th className="text-left py-1 font-medium">Course</th>
                          <th className="text-left py-1 font-medium">Code</th>
                          <th className="text-center py-1 font-medium">Grade</th>
                          <th className="text-center py-1 font-medium">Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sem.grades.map((g, j) => (
                          <tr key={j} className="border-t border-gray-800/50">
                            <td className="py-1.5 text-gray-300">{g.course_name}</td>
                            <td className="py-1.5 text-gray-500">{g.course_code || "—"}</td>
                            <td className="py-1.5 text-center text-white font-medium">{g.grade_letter}</td>
                            <td className="py-1.5 text-center text-gray-400">{g.credit_hours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StudentRecords() {
  const { user } = useSport();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("GET", API + "/");
      setStudents(data);
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveStudent = async (form) => {
    if (editing?.id) {
      await apiFetch("PATCH", `${API}/${editing.id}`, form);
    } else {
      await apiFetch("POST", API + "/", form);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const deleteStudent = async (id) => {
    if (!confirm("Delete this student and all their records?")) return;
    await apiFetch("DELETE", `${API}/${id}`);
    load();
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    const matchGrade = filterGrade === "all" || s.grade_level === filterGrade;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchGrade && matchStatus;
  });

  if (selected) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <StudentDetail student={selected} onBack={() => { setSelected(null); load(); }}
          onUpdate={(updated) => setSelected(updated)} />
      </div>
    );
  }

  return (
    <div data-testid="student-records-page" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Student Records</h1>
          <p className="text-sm text-gray-500 mt-1">{students.length} student{students.length !== 1 ? "s" : ""} enrolled</p>
        </div>
        <button data-testid="add-student-btn" onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input data-testid="student-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, or email..."
            className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
        </div>
        <select data-testid="filter-grade" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
          className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white">
          <option value="all">All Grades</option>
          {GRADE_LEVELS.map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select data-testid="filter-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Student List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">{search || filterGrade !== "all" || filterStatus !== "all" ? "No students match your filters" : "No students yet"}</p>
          <p className="text-gray-600 text-sm mt-1">Click "Add Student" to create the first record.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <div key={s.id} data-testid={`student-row-${s.id}`}
              className="bg-[#141414] border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors cursor-pointer group"
              onClick={() => setSelected(s)}>
              <div className="w-10 h-10 rounded-full bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">{(s.first_name?.[0] || "")}{(s.last_name?.[0] || "")}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{s.full_name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Grade {s.grade_level}</span>
                  {s.student_id && <><span className="text-gray-700">|</span><span>{s.student_id}</span></>}
                  {s.gpa != null && <><span className="text-gray-700">|</span><span className="text-cyan-400">GPA: {s.gpa.toFixed(2)}</span></>}
                </div>
              </div>
              <Badge variant="outline" className={`text-xs ${s.status === "active" ? "border-emerald-500/50 text-emerald-400" : "border-gray-600 text-gray-400"}`}>
                {s.status}
              </Badge>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button data-testid={`edit-student-${s.id}`} onClick={(e) => { e.stopPropagation(); setEditing(s); setShowForm(true); }}
                  className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/5"><Edit2 className="w-3.5 h-3.5" /></button>
                <button data-testid={`delete-student-${s.id}`} onClick={(e) => { e.stopPropagation(); deleteStudent(s.id); }}
                  className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
            </div>
          ))}
        </div>
      )}

      {/* Student Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditing(null); }}>
        <DialogContent className="bg-[#111] border border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Student" : "Add New Student"}</DialogTitle>
          </DialogHeader>
          <StudentForm student={editing} onSave={saveStudent} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
