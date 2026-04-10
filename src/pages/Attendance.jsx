import { useState, useEffect, useCallback } from "react";
import { getToken } from "@/api/apiClient";
import {
  ClipboardList, ChevronLeft, ChevronRight, Check,
  Save, Loader2, UserCheck, UserX, Clock, AlertCircle
} from "lucide-react";

const API = "";

async function apiFetch(url, opts = {}) {
  const headers = { "Content-Type": "application/json", ...opts.headers };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present", icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40" },
  { value: "absent", label: "Absent", icon: UserX, color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/40" },
  { value: "late", label: "Late", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/40" },
  { value: "excused", label: "Excused", icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/40" },
];

function StatusButton({ status, selected, onClick }) {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  if (!opt) return null;
  const Icon = opt.icon;
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
        selected ? `${opt.bg} ${opt.color} ${opt.border}` : "bg-transparent text-gray-600 border-transparent hover:text-gray-400 hover:border-gray-700"
      }`}
      data-testid={`status-${status}`}>
      <Icon className="w-3.5 h-3.5" />
      {opt.label}
    </button>
  );
}

export default function Attendance() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [localStatus, setLocalStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setSaved(false);
    try {
      const resp = await apiFetch(`${API}/api/teachers/attendance?date=${date}`);
      setStudents(resp.students || []);
      setRecords(resp.records || {});
      // Initialize local state from server records
      const init = {};
      for (const s of (resp.students || [])) {
        const rec = (resp.records || {})[s.id];
        init[s.id] = rec?.status || "present";
      }
      setLocalStatus(init);
      setDirty(false);
    } catch {
      setStudents([]);
      setRecords({});
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

  const changeDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const setStatus = (studentId, status) => {
    setLocalStatus(prev => ({ ...prev, [studentId]: status }));
    setDirty(true);
    setSaved(false);
  };

  const markAll = (status) => {
    const next = {};
    for (const s of students) next[s.id] = status;
    setLocalStatus(next);
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = students.map(s => ({
        student_id: s.id,
        status: localStatus[s.id] || "present",
      }));
      await apiFetch(`${API}/api/teachers/attendance/bulk`, {
        method: "POST",
        body: JSON.stringify({ date, entries }),
      });
      setSaved(true);
      setDirty(false);
      await loadData();
    } catch { /* ignore */ }
    setSaving(false);
  };

  // Stats
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const s of students) {
    const st = localStatus[s.id] || "present";
    if (counts[st] !== undefined) counts[st]++;
  }

  const isToday = date === new Date().toISOString().slice(0, 10);
  const dayName = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] min-h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-5 max-w-4xl mx-auto" data-testid="attendance-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-400" />
            Attendance
          </h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} students</p>
        </div>
        <button onClick={handleSave} disabled={saving || !dirty}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            saved ? "bg-emerald-600 text-white" : dirty ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-gray-800 text-gray-500"
          } disabled:opacity-50`}
          data-testid="save-attendance-btn">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Attendance"}
        </button>
      </div>

      {/* Date Picker */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="w-9 h-9 rounded-lg bg-[#1e1e1e] border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors" data-testid="prev-date">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-transparent text-white text-lg font-bold outline-none text-center cursor-pointer"
            data-testid="date-picker" />
          <p className="text-gray-500 text-xs mt-0.5">{dayName}{isToday && " (Today)"}</p>
        </div>
        <button onClick={() => changeDate(1)} className="w-9 h-9 rounded-lg bg-[#1e1e1e] border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors" data-testid="next-date">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        {STATUS_OPTIONS.map(opt => {
          const Icon = opt.icon;
          return (
            <div key={opt.value} className={`${opt.bg} border ${opt.border} rounded-xl p-3 text-center`}>
              <Icon className={`w-4 h-4 ${opt.color} mx-auto mb-1`} />
              <p className={`text-xl font-bold ${opt.color}`}>{counts[opt.value]}</p>
              <p className="text-gray-500 text-[10px]">{opt.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-500 text-xs mr-1">Mark all:</span>
        {STATUS_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => markAll(opt.value)}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${opt.bg} ${opt.color} border ${opt.border} hover:opacity-80 transition-opacity`}
            data-testid={`mark-all-${opt.value}`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Student List */}
      {students.length === 0 ? (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-10 text-center">
          <ClipboardList className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No students found for your classes.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {students.map((student, idx) => {
            const currentStatus = localStatus[student.id] || "present";
            const existingRecord = records[student.id];
            return (
              <div key={student.id}
                className="bg-[#141414] border border-gray-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                data-testid={`attendance-row-${idx}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{(student.first_name?.[0] || "") + (student.last_name?.[0] || "")}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{student.full_name}</p>
                    <p className="text-gray-600 text-[10px]">Grade {student.grade_level || "—"}{existingRecord ? " · Recorded" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {STATUS_OPTIONS.map(opt => (
                    <StatusButton key={opt.value} status={opt.value}
                      selected={currentStatus === opt.value}
                      onClick={() => setStatus(student.id, opt.value)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
