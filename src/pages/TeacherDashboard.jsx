import { useState, useEffect } from "react";
import { getToken } from "@/api/apiClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  BookOpen, Users, ClipboardList, Calendar,
  TrendingUp, Clock, GraduationCap, ChevronRight
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

function StatCard({ icon: Icon, label, value, color, to }) {
  const inner = (
    <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        {to && <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  );
  return to ? <Link to={to} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>{inner}</Link> : <div data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>{inner}</div>;
}

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API}/api/teachers/my-dashboard`)
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

  const faculty = data?.faculty;
  const classes = data?.classes || [];
  const recentGrades = data?.recent_grades || [];
  const subjectNames = data?.subject_names || [];

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-6xl mx-auto" data-testid="teacher-dashboard">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">
          Welcome back, {faculty?.full_name || "Teacher"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {faculty?.department || "Department"} &middot; {faculty?.position || "Teacher"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="My Classes" value={classes.length} color="bg-blue-500/15 text-blue-400" />
        <StatCard icon={Users} label="My Students" value={data?.student_count || 0} color="bg-emerald-500/15 text-emerald-400" to={createPageUrl("StudentRecords")} />
        <StatCard icon={GraduationCap} label="Subjects" value={subjectNames.length} color="bg-purple-500/15 text-purple-400" />
        <StatCard icon={ClipboardList} label="Attendance Today" value={data?.attendance_recorded_today || 0} color="bg-amber-500/15 text-amber-400" />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Class Schedule */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              My Class Schedule
            </h2>
          </div>
          {classes.length === 0 ? (
            <p className="text-gray-500 text-sm">No classes assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {classes.map((cls, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{cls.subject_name || cls.subject || "Class"}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {cls.day_of_week || cls.day || ""} &middot; {cls.classroom || cls.room || ""} &middot; Grade {cls.grade_level || "All"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {cls.start_time} - {cls.end_time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Grades */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Recent Grades
            </h2>
            <Link to={createPageUrl("StudentRecords")} className="text-xs text-gray-500 hover:text-white transition-colors">
              View All
            </Link>
          </div>
          {recentGrades.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent grades.</p>
          ) : (
            <div className="space-y-2">
              {recentGrades.slice(0, 8).map((g, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-white text-sm">{g.student_name || "Student"}</p>
                    <p className="text-gray-500 text-xs">{g.course_name || g.subject || ""} &middot; {g.assignment_name || ""}</p>
                  </div>
                  <div className="text-right">
                    {g.letter_grade ? (
                      <span className={`text-sm font-bold ${
                        g.letter_grade?.startsWith("A") ? "text-emerald-400" :
                        g.letter_grade?.startsWith("B") ? "text-blue-400" :
                        g.letter_grade?.startsWith("C") ? "text-amber-400" :
                        "text-red-400"
                      }`}>{g.letter_grade}</span>
                    ) : g.percentage != null ? (
                      <span className="text-white text-sm font-medium">{g.percentage}%</span>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Grade Book", page: "GradeBook", icon: BookOpen, desc: "Manage grades" },
          { label: "Student Records", page: "StudentRecords", icon: Users, desc: "View & manage students" },
          { label: "Announcements", page: "NxAnnouncement", icon: Calendar, desc: "School announcements" },
          { label: "Messages", page: "Messages", icon: ClipboardList, desc: "Send & receive messages" },
        ].map(({ label, page, icon: Icon, desc }) => (
          <Link key={page} to={createPageUrl(page)}
            className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all group"
            data-testid={`quick-action-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            <Icon className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors mb-2" />
            <p className="text-white text-sm font-medium">{label}</p>
            <p className="text-gray-600 text-xs mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
