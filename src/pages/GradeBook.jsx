import { useState, useEffect, useCallback } from "react";
import { getToken } from "@/api/apiClient";
import {
  BookOpen, Plus, Save, Trash2, ChevronDown, Filter,
  Users, Award, PenLine, X, Check, Loader2
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

function letterColor(letter) {
  if (!letter) return "text-gray-500";
  if (letter.startsWith("A")) return "text-emerald-400";
  if (letter.startsWith("B")) return "text-blue-400";
  if (letter.startsWith("C")) return "text-amber-400";
  if (letter.startsWith("D")) return "text-orange-400";
  return "text-red-400";
}

function letterBg(letter) {
  if (!letter) return "bg-gray-500/10";
  if (letter.startsWith("A")) return "bg-emerald-500/10";
  if (letter.startsWith("B")) return "bg-blue-500/10";
  if (letter.startsWith("C")) return "bg-amber-500/10";
  if (letter.startsWith("D")) return "bg-orange-500/10";
  return "bg-red-500/10";
}

// ── Inline Edit Cell ────────────────────────────────────────────────────
function GradeCell({ grade, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setValue(grade?.score ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (value === "" || value === null) return setEditing(false);
    setSaving(true);
    try {
      await onSave(parseFloat(value));
    } catch { /* ignore */ }
    setSaving(false);
    setEditing(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input type="number" value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey} autoFocus min="0" max="100" step="0.1"
          className="w-14 bg-[#1e1e1e] border border-blue-500 rounded px-1.5 py-0.5 text-white text-xs outline-none text-center"
          data-testid="grade-edit-input" />
        {saving ? <Loader2 className="w-3 h-3 animate-spin text-blue-400" /> : (
          <>
            <button onClick={handleSave} className="text-emerald-400 hover:text-emerald-300" data-testid="grade-save-btn"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-gray-300"><X className="w-3.5 h-3.5" /></button>
          </>
        )}
      </div>
    );
  }

  if (!grade) {
    return (
      <button onClick={startEdit} className="w-full h-full flex items-center justify-center text-gray-600 hover:text-gray-400 transition-colors py-1" data-testid="grade-empty-cell">
        <PenLine className="w-3 h-3" />
      </button>
    );
  }

  return (
    <button onClick={startEdit}
      className={`w-full flex items-center justify-center gap-1 px-1 py-1 rounded ${letterBg(grade.letter_grade)} hover:opacity-80 transition-opacity`}
      data-testid="grade-cell">
      <span className={`text-xs font-bold ${letterColor(grade.letter_grade)}`}>{grade.letter_grade}</span>
      <span className="text-gray-500 text-[10px]">{grade.percentage}%</span>
    </button>
  );
}

// ── Add Assignment Modal ────────────────────────────────────────────────
function AddAssignmentModal({ subjects, students, onClose, onSubmit }) {
  const [subject, setSubject] = useState(subjects[0] || "");
  const [assignmentName, setAssignmentName] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [term, setTerm] = useState("Spring 2026");
  const initialEntries = students.map(s => ({ student_id: s.id, name: s.full_name, score: "" }));
  const [entries, setEntries] = useState(initialEntries);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!assignmentName.trim()) return;
    setSubmitting(true);
    const validEntries = entries.filter(e => e.score !== "" && e.score !== null);
    try {
      await onSubmit({ subject, assignment_name: assignmentName.trim(), max_score: parseFloat(maxScore), term, entries: validEntries });
      onClose();
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" data-testid="add-assignment-modal">
      <div className="bg-[#141414] border border-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Add Assignment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Subject */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
              data-testid="assignment-subject-select">
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Assignment Name */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Assignment Name</label>
            <input type="text" value={assignmentName} onChange={e => setAssignmentName(e.target.value)}
              placeholder="e.g. Chapter 5 Test, Homework 4, Lab Report"
              className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none"
              data-testid="assignment-name-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Max Score</label>
              <input type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                data-testid="assignment-max-score" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Term</label>
              <input type="text" value={term} onChange={e => setTerm(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
            </div>
          </div>
          {/* Bulk score entry */}
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Scores (leave blank to skip)</label>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {entries.map((e, i) => (
                <div key={e.student_id} className="flex items-center gap-2">
                  <span className="text-gray-300 text-xs flex-1 truncate">{e.name}</span>
                  <input type="number" value={e.score} min="0" max={maxScore} step="0.1"
                    onChange={ev => {
                      const copy = [...entries];
                      copy[i] = { ...copy[i], score: ev.target.value };
                      setEntries(copy);
                    }}
                    placeholder="—"
                    className="w-16 bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1 text-white text-xs text-center outline-none"
                    data-testid={`bulk-score-${i}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !assignmentName.trim()}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center gap-2"
            data-testid="submit-assignment-btn">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {submitting ? "Saving..." : "Save Grades"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main GradeBook Page ─────────────────────────────────────────────────
export default function GradeBook() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");

  const loadGradebook = useCallback(async () => {
    try {
      const resp = await apiFetch(`${API}/api/teachers/gradebook`);
      setData(resp);
      setError("");
    } catch (e) {
      setError("Failed to load gradebook");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGradebook(); }, [loadGradebook]);

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] min-h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const students = data?.students || [];
  const grades = data?.grades || [];
  const subjects = data?.subjects || [];
  const assignments = data?.assignments || [];

  // Filter assignments by selected subject
  const filteredAssignments = selectedSubject === "all"
    ? assignments
    : assignments.filter(a => a.subject === selectedSubject);

  // Build grade lookup: key = `${student_id}::${subject}::${assignment_name}`
  const gradeLookup = {};
  for (const g of grades) {
    const key = `${g.student_id}::${g.subject}::${g.assignment_name}`;
    if (!gradeLookup[key]) gradeLookup[key] = g;
  }

  // Unique assignment names for current filter
  const assignmentNames = [...new Set(filteredAssignments.map(a => a.name))];

  // Calculate student averages for filtered subject
  const getStudentAvg = (studentId) => {
    const studentGrades = grades.filter(g =>
      g.student_id === studentId &&
      (selectedSubject === "all" || g.subject === selectedSubject)
    );
    if (studentGrades.length === 0) return null;
    const avg = studentGrades.reduce((sum, g) => sum + (g.percentage || 0), 0) / studentGrades.length;
    return Math.round(avg * 10) / 10;
  };

  const handleCellSave = async (studentId, subject, assignmentName, grade, newScore) => {
    if (grade?.id) {
      await apiFetch(`${API}/api/teachers/gradebook/entry/${grade.id}`, {
        method: "PUT",
        body: JSON.stringify({ score: newScore, max_score: grade.max_score || 100 }),
      });
    } else {
      await apiFetch(`${API}/api/teachers/gradebook/entry`, {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          subject,
          assignment_name: assignmentName,
          score: newScore,
          max_score: 100,
        }),
      });
    }
    await loadGradebook();
  };

  const handleBulkSubmit = async (payload) => {
    await apiFetch(`${API}/api/teachers/gradebook/bulk`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadGradebook();
  };

  const handleDeleteGrade = async (gradeId) => {
    await apiFetch(`${API}/api/teachers/gradebook/entry/${gradeId}`, { method: "DELETE" });
    await loadGradebook();
  };

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto" data-testid="gradebook-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            Grade Book
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {students.length} students &middot; {assignmentNames.length} assignments
            {selectedSubject !== "all" && ` &middot; ${selectedSubject}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Subject filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              className="bg-[#1e1e1e] border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm outline-none appearance-none cursor-pointer"
              data-testid="subject-filter">
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
            data-testid="add-assignment-btn">
            <Plus className="w-4 h-4" /> Add Assignment
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-3">
          <Users className="w-4 h-4 text-blue-400 mb-1" />
          <p className="text-xl font-bold text-white">{students.length}</p>
          <p className="text-gray-500 text-xs">Students</p>
        </div>
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-3">
          <BookOpen className="w-4 h-4 text-purple-400 mb-1" />
          <p className="text-xl font-bold text-white">{assignmentNames.length}</p>
          <p className="text-gray-500 text-xs">Assignments</p>
        </div>
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-3">
          <Award className="w-4 h-4 text-emerald-400 mb-1" />
          <p className="text-xl font-bold text-white">
            {grades.length > 0 ? (grades.reduce((s, g) => s + (g.percentage || 0), 0) / grades.length).toFixed(1) + "%" : "—"}
          </p>
          <p className="text-gray-500 text-xs">Class Average</p>
        </div>
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-3">
          <PenLine className="w-4 h-4 text-amber-400 mb-1" />
          <p className="text-xl font-bold text-white">{grades.length}</p>
          <p className="text-gray-500 text-xs">Total Grades</p>
        </div>
      </div>

      {/* Gradebook Table */}
      {students.length === 0 ? (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-10 text-center">
          <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No students found for your classes.</p>
        </div>
      ) : assignmentNames.length === 0 ? (
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-10 text-center">
          <BookOpen className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">No assignments yet for this subject.</p>
          <button onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors">
            Add First Assignment
          </button>
        </div>
      ) : (
        <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="gradebook-table">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3 sticky left-0 bg-[#141414] z-10 min-w-[160px]">Student</th>
                  {assignmentNames.map(name => (
                    <th key={name} className="text-center text-gray-400 text-xs font-medium px-2 py-3 min-w-[80px]">
                      <div className="truncate max-w-[100px] mx-auto" title={name}>{name}</div>
                      {selectedSubject === "all" && (
                        <div className="text-[10px] text-gray-600 font-normal">
                          {filteredAssignments.find(a => a.name === name)?.subject || ""}
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="text-center text-gray-400 text-xs font-medium px-3 py-3 min-w-[70px]">Avg</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const avg = getStudentAvg(student.id);
                  return (
                    <tr key={student.id} className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors" data-testid={`gradebook-row-${student.id}`}>
                      <td className="px-4 py-2 sticky left-0 bg-[#141414] z-10">
                        <p className="text-white text-sm font-medium truncate">{student.full_name}</p>
                        <p className="text-gray-600 text-[10px]">Grade {student.grade_level}</p>
                      </td>
                      {assignmentNames.map(name => {
                        const subj = selectedSubject !== "all" ? selectedSubject : (filteredAssignments.find(a => a.name === name)?.subject || "");
                        const key = `${student.id}::${subj}::${name}`;
                        const grade = gradeLookup[key];
                        return (
                          <td key={name} className="px-1 py-1 text-center">
                            <GradeCell grade={grade}
                              onSave={(score) => handleCellSave(student.id, subj, name, grade, score)} />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center">
                        {avg != null ? (
                          <span className={`text-sm font-bold ${
                            avg >= 90 ? "text-emerald-400" : avg >= 80 ? "text-blue-400" : avg >= 70 ? "text-amber-400" : avg >= 60 ? "text-orange-400" : "text-red-400"
                          }`}>{avg}%</span>
                        ) : (
                          <span className="text-gray-600 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Assignment Modal */}
      {showAddModal && (
        <AddAssignmentModal
          subjects={subjects}
          students={students}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleBulkSubmit}
        />
      )}
    </div>
  );
}
