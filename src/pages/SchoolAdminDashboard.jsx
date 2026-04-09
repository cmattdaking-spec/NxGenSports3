import { useState, useEffect } from "react";
import { getToken } from "@/api/apiClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users, GraduationCap, Briefcase, Layers, ShieldCheck,
  FileText, BarChart3, ChevronRight, Calendar, Bell,
  Download, MessageSquare
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
  return to ? <Link to={to} data-testid={`admin-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>{inner}</Link> : <div data-testid={`admin-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>{inner}</div>;
}

export default function SchoolAdminDashboard() {
  const [stats, setStats] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API}/api/students/`).catch(() => []),
      apiFetch(`${API}/api/faculty/`).catch(() => []),
      apiFetch(`${API}/api/clubs/`).catch(() => []),
      apiFetch(`${API}/api/admin-reports/announcements`).catch(() => []),
      apiFetch(`${API}/api/admin-reports/events`).catch(() => []),
    ]).then(([students, faculty, clubs, anns, evts]) => {
      const activeStudents = Array.isArray(students) ? students.filter(s => s.status === "active").length : 0;
      const activeFaculty = Array.isArray(faculty) ? faculty.filter(f => f.status === "active").length : 0;
      setStats({
        totalStudents: Array.isArray(students) ? students.length : 0,
        activeStudents,
        totalFaculty: Array.isArray(faculty) ? faculty.length : 0,
        activeFaculty,
        totalClubs: Array.isArray(clubs) ? clubs.length : 0,
      });
      setAnnouncements(Array.isArray(anns) ? anns.slice(0, 5) : []);
      setEvents(Array.isArray(evts) ? evts.slice(0, 5) : []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] min-h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-6xl mx-auto" data-testid="school-admin-dashboard">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">School Administration</h1>
        <p className="text-gray-500 text-sm mt-1">Academic overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Total Students" value={stats.totalStudents || 0} color="bg-blue-500/15 text-blue-400" to={createPageUrl("StudentRecords")} />
        <StatCard icon={GraduationCap} label="Active Students" value={stats.activeStudents || 0} color="bg-emerald-500/15 text-emerald-400" />
        <StatCard icon={Briefcase} label="Faculty" value={stats.totalFaculty || 0} color="bg-purple-500/15 text-purple-400" to={createPageUrl("FacultyStaff")} />
        <StatCard icon={Briefcase} label="Active Faculty" value={stats.activeFaculty || 0} color="bg-cyan-500/15 text-cyan-400" />
        <StatCard icon={Layers} label="Clubs" value={stats.totalClubs || 0} color="bg-amber-500/15 text-amber-400" to={createPageUrl("ClubsCommittees")} />
      </div>

      {/* Two Column: Announcements + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Announcements */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Recent Announcements
            </h2>
            <Link to={createPageUrl("SchoolAdminReporting")} className="text-xs text-gray-500 hover:text-white transition-colors">
              Manage
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-gray-500 text-sm">No announcements yet.</p>
          ) : (
            <div className="space-y-2">
              {announcements.map((a, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3">
                  <p className="text-white text-sm font-medium">{a.title}</p>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">{a.content || a.body || ""}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {a.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.priority === "urgent" ? "bg-red-500/20 text-red-400" :
                        a.priority === "high" ? "bg-amber-500/20 text-amber-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>{a.priority}</span>
                    )}
                    {a.audience && (
                      <span className="text-xs text-gray-600">{a.audience}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Upcoming Events
            </h2>
            <Link to={createPageUrl("SchoolAdminReporting")} className="text-xs text-gray-500 hover:text-white transition-colors">
              Manage
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming events.</p>
          ) : (
            <div className="space-y-2">
              {events.map((e, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{e.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{e.location || ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">{e.date || e.start_date || ""}</p>
                    {e.event_type && (
                      <span className="text-xs text-gray-600">{e.event_type}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Student Records", page: "StudentRecords", icon: Users, desc: "Manage all students" },
          { label: "Faculty & Staff", page: "FacultyStaff", icon: Briefcase, desc: "Manage faculty" },
          { label: "Clubs", page: "ClubsCommittees", icon: Layers, desc: "Clubs & committees" },
          { label: "Admin Reporting", page: "SchoolAdminReporting", icon: ShieldCheck, desc: "Announcements, calendar, docs" },
          { label: "Data Export", page: "SchoolAdminReporting", icon: Download, desc: "Export & import data" },
          { label: "Report Cards", page: "StudentRecords", icon: FileText, desc: "Generate report cards" },
          { label: "User Management", page: "UserManagement", icon: Users, desc: "Manage users & invites" },
          { label: "Messages", page: "Messages", icon: MessageSquare, desc: "Communication" },
        ].map(({ label, page, icon: Icon, desc }) => (
          <Link key={label} to={createPageUrl(page)}
            className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all group"
            data-testid={`admin-action-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            <Icon className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors mb-2" />
            <p className="text-white text-sm font-medium">{label}</p>
            <p className="text-gray-600 text-xs mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
