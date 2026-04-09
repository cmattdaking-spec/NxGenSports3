import { useState, useEffect, useCallback } from "react";
import { getToken } from "@/api/apiClient";
import { useSport } from "@/components/SportContext";
import {
  GraduationCap, Calendar, BookOpen, AlertTriangle, Users, Plus,
  ArrowLeft, Clock, CheckCircle, XCircle, Search, Trash2, Link2,
  BarChart2, CalendarDays, FileText
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const API = "/api/parents";

async function apiFetch(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Request failed"); }
  return res.json();
}

function StatCard({ icon: Icon, label, value, color = "cyan", sub }) {
  const c = {
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    green: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
    red: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-400",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400",
  };
  return (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
      className={`bg-gradient-to-br ${c[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4" />
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function AttendanceDot({ status }) {
  const m = { present: "bg-emerald-500", absent: "bg-red-500", tardy: "bg-amber-500", excused: "bg-blue-500" };
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`w-3 h-3 rounded-full ${m[status] || "bg-gray-600"}`} title={status} />
      <span className="text-[9px] text-gray-600">{status?.[0]?.toUpperCase()}</span>
    </div>
  );
}

function MeetingStatusBadge({ status }) {
  const m = {
    requested: "border-amber-500/50 text-amber-400",
    confirmed: "border-emerald-500/50 text-emerald-400",
    completed: "border-blue-500/50 text-blue-400",
    cancelled: "border-red-500/50 text-red-400",
  };
  return <Badge variant="outline" className={`text-xs ${m[status] || "border-gray-600 text-gray-400"}`}>{status}</Badge>;
}

// ─── Progress Report View ────────────────────────────────────────────────────
function ProgressReport({ studentId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiFetch("GET", `${API}/progress/${studentId}`);
        setData(d);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [studentId]);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-700 border-t-cyan-500 rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-red-400 text-center py-8">Failed to load progress report.</p>;

  const { student, semesters, cumulative_gpa, attendance, assignments, discipline } = data;

  return (
    <div data-testid="progress-report" className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button data-testid="progress-back" onClick={onBack} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{student.full_name}</h2>
          <p className="text-sm text-gray-400">Grade {student.grade_level} {student.student_id && `| ID: ${student.student_id}`}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={GraduationCap} label="GPA" value={cumulative_gpa?.toFixed(2)} color="cyan" />
        <StatCard icon={Calendar} label="Attendance" value={attendance.rate != null ? `${attendance.rate}%` : undefined} color="green"
          sub={attendance.total > 0 ? `${attendance.present}/${attendance.total} days` : null} />
        <StatCard icon={BookOpen} label="Assignments" value={`${assignments.completed}/${assignments.total}`} color="blue"
          sub={assignments.missing > 0 ? `${assignments.missing} missing` : "All on track"} />
        <StatCard icon={AlertTriangle} label="Discipline" value={discipline.total} color={discipline.unresolved > 0 ? "red" : "amber"}
          sub={discipline.unresolved > 0 ? `${discipline.unresolved} unresolved` : "No issues"} />
      </div>

      {/* Attendance Strip */}
      {attendance.recent.length > 0 && (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Recent Attendance</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {attendance.recent.map((a, i) => (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[36px]">
                <span className="text-[9px] text-gray-600 font-mono">{a.date?.slice(5)}</span>
                <AttendanceDot status={a.status} />
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Present ({attendance.present})</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Absent ({attendance.absent})</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Tardy ({attendance.tardy})</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Excused ({attendance.excused})</span>
          </div>
        </div>
      )}

      {/* Grades by Semester */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Academic Grades</h3>
        {semesters.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No grades recorded yet.</p>}
        {semesters.map((sem, i) => (
          <div key={i} className="bg-[#141414] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">{sem.semester}</h4>
              <span className="text-xs text-gray-400">GPA: <span className="text-cyan-400 font-medium">{sem.semester_gpa?.toFixed(2) ?? "—"}</span> | {sem.total_credits} credits</span>
            </div>
            <div className="space-y-1.5">
              {sem.grades.map((g, j) => (
                <div key={j} className="flex items-center justify-between bg-[#0d0d0d] rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm text-white">{g.course_name}</span>
                    {g.teacher_name && <span className="text-xs text-gray-600 ml-2">{g.teacher_name}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white">{g.grade_letter}</span>
                    {g.grade_percent != null && <span className="text-xs text-gray-500">{g.grade_percent}%</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Assignments */}
      {assignments.recent.length > 0 && (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Recent Assignments</h3>
          <div className="space-y-1.5">
            {assignments.recent.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-[#0d0d0d] rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm text-white">{a.title}</span>
                  {a.course_name && <span className="text-xs text-gray-600 ml-2">{a.course_name}</span>}
                  {a.due_date && <span className="text-xs text-gray-700 ml-2">Due: {a.due_date}</span>}
                </div>
                <Badge variant="outline" className={
                  a.status === "graded" ? "border-emerald-500/50 text-emerald-400 text-xs" :
                  a.status === "missing" ? "border-red-500/50 text-red-400 text-xs" :
                  a.status === "late" ? "border-amber-500/50 text-amber-400 text-xs" :
                  "border-gray-600 text-gray-400 text-xs"
                }>{a.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discipline */}
      {discipline.recent.length > 0 && (
        <div className="bg-[#141414] border border-red-900/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Discipline Records</h3>
          <div className="space-y-2">
            {discipline.recent.map((d, i) => (
              <div key={i} className="bg-[#0d0d0d] rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={
                    d.incident_type === "suspension" || d.incident_type === "expulsion" ? "border-red-500/50 text-red-400 text-xs" :
                    "border-amber-500/50 text-amber-400 text-xs"
                  }>{d.incident_type}</Badge>
                  <span className="text-xs text-gray-500">{d.incident_date}</span>
                  {d.resolved && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                </div>
                <p className="text-sm text-gray-300">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Meeting Scheduler ───────────────────────────────────────────────────────
function MeetingScheduler({ students, onCreated }) {
  const [faculty, setFaculty] = useState([]);
  const [form, setForm] = useState({
    faculty_id: "", student_id: "", meeting_date: "", meeting_time: "", subject: "", notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("GET", `${API}/available-faculty`).then(setFaculty).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.faculty_id || !form.meeting_date) { setError("Select teacher and date"); return; }
    setSaving(true);
    setError("");
    try {
      await apiFetch("POST", `${API}/meetings`, form);
      setForm({ faculty_id: "", student_id: "", meeting_date: "", meeting_time: "", subject: "", notes: "" });
      if (onCreated) onCreated();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">Request a Meeting</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Teacher *</label>
          <select data-testid="meeting-faculty" value={form.faculty_id} onChange={e => setForm(f => ({ ...f, faculty_id: e.target.value }))}
            className="w-full bg-[#0d0d0d] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">Select teacher...</option>
            {faculty.map(f => <option key={f.id} value={f.id}>{f.full_name} — {f.position}{f.department ? `, ${f.department}` : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Student (optional)</label>
          <select data-testid="meeting-student" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
            className="w-full bg-[#0d0d0d] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">General meeting</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Date *</label>
          <input data-testid="meeting-date" type="date" value={form.meeting_date}
            onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))}
            className="w-full bg-[#0d0d0d] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Time</label>
          <input data-testid="meeting-time" type="time" value={form.meeting_time}
            onChange={e => setForm(f => ({ ...f, meeting_time: e.target.value }))}
            className="w-full bg-[#0d0d0d] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Subject</label>
          <input data-testid="meeting-subject" value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g., Academic Progress"
            className="w-full bg-[#0d0d0d] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Notes</label>
        <textarea data-testid="meeting-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Additional details..."
          className="w-full bg-[#0d0d0d] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white min-h-[48px]" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button data-testid="meeting-submit" type="submit" disabled={saving || !form.faculty_id || !form.meeting_date}
        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
        {saving ? "Sending..." : "Request Meeting"}
      </button>
    </form>
  );
}

// ─── Link Student Dialog ─────────────────────────────────────────────────────
function LinkStudentDialog({ open, onOpenChange, onLinked }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLink = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch("POST", `${API}/link-student`, { student_code: code.trim() });
      setSuccess(`Linked to ${res.student?.full_name || "student"}`);
      setCode("");
      if (onLinked) onLinked();
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border border-gray-800 text-white max-w-sm">
        <DialogHeader><DialogTitle>Link a Student</DialogTitle></DialogHeader>
        <p className="text-sm text-gray-400">Enter the student's ID code to link them to your parent account.</p>
        <input data-testid="link-student-code" value={code} onChange={e => setCode(e.target.value)} placeholder="Student ID (e.g., STU001)"
          onKeyDown={e => { if (e.key === "Enter") handleLink(); }}
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white mt-2" />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-emerald-400">{success}</p>}
        <div className="flex gap-2 mt-2">
          <button data-testid="link-student-submit" onClick={handleLink} disabled={loading || !code.trim()}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
            {loading ? "Linking..." : "Link Student"}
          </button>
          <button onClick={() => onOpenChange(false)} className="px-4 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm hover:bg-white/5">Close</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ParentPortal() {
  const { user } = useSport();
  const [students, setStudents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [tab, setTab] = useState("children");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, m] = await Promise.all([
        apiFetch("GET", `${API}/my-students`),
        apiFetch("GET", `${API}/meetings`),
      ]);
      setStudents(s);
      setMeetings(m);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unlinkStudent = async (sid) => {
    if (!confirm("Unlink this student from your account?")) return;
    await apiFetch("DELETE", `${API}/unlink-student/${sid}`);
    load();
  };

  const updateMeeting = async (id, data) => {
    await apiFetch("PATCH", `${API}/meetings/${id}`, data);
    load();
  };

  const deleteMeeting = async (id) => {
    if (!confirm("Cancel this meeting request?")) return;
    await apiFetch("DELETE", `${API}/meetings/${id}`);
    load();
  };

  if (selectedStudent) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <ProgressReport studentId={selectedStudent} onBack={() => setSelectedStudent(null)} />
      </div>
    );
  }

  const pendingMeetings = meetings.filter(m => m.status === "requested");
  const upcomingMeetings = meetings.filter(m => m.status === "confirmed");

  return (
    <div data-testid="parent-portal-page" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Parent Portal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome, <span className="text-white">{user?.full_name?.split(" ")[0] || "Parent"}</span>
            {students.length > 0 && <span> — {students.length} student{students.length !== 1 ? "s" : ""} linked</span>}
          </p>
        </div>
        <button data-testid="link-student-btn" onClick={() => setShowLinkDialog(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Link2 className="w-4 h-4" /> Link Student
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Students" value={students.length} color="cyan" />
        <StatCard icon={CalendarDays} label="Meetings" value={meetings.length} color="blue"
          sub={pendingMeetings.length > 0 ? `${pendingMeetings.length} pending` : undefined} />
        <StatCard icon={CheckCircle} label="Upcoming" value={upcomingMeetings.length} color="green" />
        <StatCard icon={Clock} label="Pending" value={pendingMeetings.length} color="amber" />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-[#1a1a1a] border border-gray-800">
          <TabsTrigger value="children" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">My Children</TabsTrigger>
          <TabsTrigger value="meetings" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 text-xs">Meetings</TabsTrigger>
        </TabsList>

        {/* My Children Tab */}
        <TabsContent value="children" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-700 border-t-cyan-500 rounded-full animate-spin" /></div>
          ) : students.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 text-lg font-medium">No students linked yet</p>
              <p className="text-gray-600 text-sm mt-1">Click "Link Student" and enter your child's student ID to view their progress.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map(s => (
                <div key={s.id} data-testid={`child-card-${s.id}`}
                  className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer group"
                  onClick={() => setSelectedStudent(s.id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400 font-bold">{(s.first_name?.[0] || "")}{(s.last_name?.[0] || "")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-white">{s.full_name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Grade {s.grade_level}</span>
                        {s.student_id && <span>ID: {s.student_id}</span>}
                        {s.gpa != null && <span className="text-cyan-400">GPA: {s.gpa.toFixed(2)}</span>}
                        <Badge variant="outline" className={`text-xs ${s.status === "active" ? "border-emerald-500/50 text-emerald-400" : "border-gray-600 text-gray-400"}`}>
                          {s.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button data-testid={`unlink-${s.id}`} onClick={e => { e.stopPropagation(); unlinkStudent(s.id); }}
                        className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center gap-1 text-cyan-400 text-xs">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Progress</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="mt-4 space-y-4">
          <MeetingScheduler students={students} onCreated={load} />

          {meetings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Your Meetings</h3>
              {meetings.map(m => (
                <div key={m.id} data-testid={`meeting-${m.id}`}
                  className="bg-[#141414] border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MeetingStatusBadge status={m.status} />
                      <span className="text-xs text-gray-500">{m.meeting_date} {m.meeting_time && `at ${m.meeting_time}`}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {m.status === "requested" && (
                        <button onClick={() => updateMeeting(m.id, { status: "cancelled" })}
                          className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded hover:bg-white/5">Cancel</button>
                      )}
                      {m.status === "confirmed" && (
                        <button onClick={() => updateMeeting(m.id, { status: "completed" })}
                          className="text-xs text-gray-500 hover:text-emerald-400 px-2 py-1 rounded hover:bg-white/5">Mark Done</button>
                      )}
                      <button onClick={() => deleteMeeting(m.id)}
                        className="text-gray-600 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-sm text-white font-medium">
                    Meeting with <span className="text-cyan-400">{m.faculty_name || "Teacher"}</span>
                    {m.student_name && <span className="text-gray-500"> re: {m.student_name}</span>}
                  </p>
                  {m.subject && <p className="text-xs text-gray-400 mt-1">Subject: {m.subject}</p>}
                  {m.notes && <p className="text-xs text-gray-500 mt-1">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}
          {meetings.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No meetings scheduled yet. Use the form above to request one.</p>
          )}
        </TabsContent>
      </Tabs>

      <LinkStudentDialog open={showLinkDialog} onOpenChange={setShowLinkDialog} onLinked={load} />
    </div>
  );
}
