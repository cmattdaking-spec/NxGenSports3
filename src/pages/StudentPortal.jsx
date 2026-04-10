import { useState, useEffect } from "react";
import { getToken } from "@/api/apiClient";
import {
  GraduationCap, BookOpen, ClipboardList, Calendar,
  AlertTriangle, TrendingUp, UserCheck, UserX, Clock,
  AlertCircle, ChevronDown, ChevronUp
} from "lucide-react";

const API = "";

async function apiFetch(url) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function letterColor(letter) {
  if (!letter) return "text-gray-500";
  if (letter.startsWith("A")) return "text-emerald-400";
  if (letter.startsWith("B")) return "text-blue-400";
  if (letter.startsWith("C")) return "text-amber-400";
  if (letter.startsWith("D")) return "text-orange-400";
  return "text-red-400";
}

function SectionHeader({ icon: Icon, title, color, count }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-white font-semibold">{title}</h2>
      {count != null && <span className="text-gray-600 text-xs ml-auto">{count}</span>}
    </div>
  );
}

function CollapsibleSection({ icon, title, color, count, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 p-4 hover:bg-white/[0.02] transition-colors">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          {icon}
        </div>
        <h2 className="text-white font-semibold text-left flex-1">{title}</h2>
        {count != null && <span className="text-gray-600 text-xs mr-2">{count}</span>}
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function StudentPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API}/api/students/my-portal`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] min-h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const student = data?.student;
  const grades = data?.grades || [];
  const subjectAvgs = data?.subject_averages || [];
  const gpa = data?.gpa;
  const attSummary = data?.attendance_summary || {};
  const attRecent = data?.attendance_recent || [];
  const schedule = data?.schedule || [];
  const discipline = data?.discipline || [];

  const statusIcon = { present: UserCheck, absent: UserX, late: Clock, excused: AlertCircle };
  const statusColor = { present: "text-emerald-400", absent: "text-red-400", late: "text-amber-400", excused: "text-blue-400" };

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-5 max-w-4xl mx-auto" data-testid="student-portal">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">My Academics</h1>
        <p className="text-gray-500 text-sm mt-1">
          {student?.full_name || "Student"} &middot; Grade {student?.grade_level || "—"}
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-3 text-center">
          <GraduationCap className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className={`text-2xl font-bold ${gpa && gpa >= 3.0 ? "text-emerald-400" : gpa && gpa >= 2.0 ? "text-amber-400" : gpa ? "text-red-400" : "text-gray-500"}`}>
            {gpa != null ? gpa.toFixed(2) : "—"}
          </p>
          <p className="text-gray-500 text-[10px]">GPA</p>
        </div>
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-3 text-center">
          <BookOpen className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{grades.length}</p>
          <p className="text-gray-500 text-[10px]">Total Grades</p>
        </div>
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-3 text-center">
          <ClipboardList className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className={`text-2xl font-bold ${attSummary.rate >= 90 ? "text-emerald-400" : attSummary.rate >= 75 ? "text-amber-400" : "text-red-400"}`}>
            {attSummary.rate != null ? `${attSummary.rate}%` : "—"}
          </p>
          <p className="text-gray-500 text-[10px]">Attendance Rate</p>
        </div>
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-3 text-center">
          <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${discipline.length > 0 ? "text-red-400" : "text-gray-600"}`} />
          <p className={`text-2xl font-bold ${discipline.length > 0 ? "text-red-400" : "text-gray-500"}`}>{discipline.length}</p>
          <p className="text-gray-500 text-[10px]">Discipline</p>
        </div>
      </div>

      {/* Grades Section */}
      <CollapsibleSection
        icon={<BookOpen className="w-4 h-4" />}
        title="Grades"
        color="bg-blue-500/15 text-blue-400"
        count={`${grades.length} grades`}
        defaultOpen={true}>

        {/* Subject Averages */}
        {subjectAvgs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {subjectAvgs.map(sa => (
              <div key={sa.subject} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3">
                <p className="text-white text-sm font-medium truncate">{sa.subject}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className={`text-lg font-bold ${
                    sa.average >= 90 ? "text-emerald-400" : sa.average >= 80 ? "text-blue-400" : sa.average >= 70 ? "text-amber-400" : "text-red-400"
                  }`}>{sa.average}%</span>
                  <span className="text-gray-600 text-[10px]">{sa.count} items</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Grades */}
        {grades.length === 0 ? (
          <p className="text-gray-500 text-sm">No grades recorded yet.</p>
        ) : (
          <div className="space-y-1">
            {grades.slice(0, 15).map((g, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm truncate">{g.assignment_name || "Assignment"}</p>
                  <p className="text-gray-600 text-[10px]">{g.subject} &middot; {g.date || ""}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {g.percentage != null && <span className="text-gray-400 text-xs">{g.percentage}%</span>}
                  <span className={`text-sm font-bold min-w-[28px] text-right ${letterColor(g.letter_grade)}`}>{g.letter_grade || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Attendance Section */}
      <CollapsibleSection
        icon={<ClipboardList className="w-4 h-4" />}
        title="Attendance"
        color="bg-emerald-500/15 text-emerald-400"
        count={`${attSummary.rate || 0}% rate`}
        defaultOpen={true}>

        {/* Summary Row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Present", value: attSummary.present || 0, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Absent", value: attSummary.absent || 0, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Late", value: attSummary.late || 0, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Excused", value: attSummary.excused || 0, color: "text-blue-400", bg: "bg-blue-500/10" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg p-2 text-center`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Records */}
        {attRecent.length === 0 ? (
          <p className="text-gray-500 text-sm">No attendance records yet.</p>
        ) : (
          <div className="space-y-1">
            {attRecent.slice(0, 10).map((a, i) => {
              const st = a.status || "present";
              const Icon = statusIcon[st] || UserCheck;
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${statusColor[st] || "text-gray-500"}`} />
                    <span className="text-white text-sm">{a.date}</span>
                  </div>
                  <span className={`text-xs font-medium capitalize ${statusColor[st] || "text-gray-500"}`}>{st}</span>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Schedule Section */}
      <CollapsibleSection
        icon={<Calendar className="w-4 h-4" />}
        title="Class Schedule"
        color="bg-purple-500/15 text-purple-400"
        count={`${schedule.length} classes`}
        defaultOpen={true}>

        {schedule.length === 0 ? (
          <p className="text-gray-500 text-sm">No class schedule available.</p>
        ) : (
          <div className="space-y-1.5">
            {schedule.map((cls, i) => (
              <div key={i} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{cls.subject_name || cls.subject || "Class"}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    {cls.faculty_name || ""} &middot; Room {cls.classroom || cls.room || "—"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-300 text-xs">{cls.day_of_week || cls.day || ""}</p>
                  <p className="text-gray-500 text-[10px]">{cls.start_time} – {cls.end_time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Discipline Section */}
      <CollapsibleSection
        icon={<AlertTriangle className="w-4 h-4" />}
        title="Discipline"
        color={discipline.length > 0 ? "bg-red-500/15 text-red-400" : "bg-gray-500/15 text-gray-500"}
        count={discipline.length > 0 ? `${discipline.length} records` : "Clean record"}
        defaultOpen={discipline.length > 0}>

        {discipline.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-emerald-400 text-sm font-medium">No discipline records</p>
            <p className="text-gray-600 text-xs mt-1">Keep up the good work!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {discipline.map((d, i) => (
              <div key={i} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium">{d.type || d.infraction_type || "Incident"}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${d.resolved ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {d.resolved ? "Resolved" : "Active"}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">{d.description || ""}</p>
                {d.action_taken && <p className="text-gray-500 text-[10px] mt-1">Action: {d.action_taken}</p>}
                {(d.date || d.created_at) && <p className="text-gray-600 text-[10px] mt-1">{d.date || d.created_at?.slice(0, 10)}</p>}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
