import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Building2, X, ChevronDown, ChevronUp,
  Search, Shield, AlertTriangle, RefreshCw, Trash2,
  MapPin, Calendar, Users, Mail, Phone, Edit2, Check
} from "lucide-react";

const SPORT_LABELS = {
  boys_football:"Boys Football", girls_football:"Girls Football", girls_flag_football:"Girls Flag Football",
  boys_basketball:"Boys Basketball", girls_basketball:"Girls Basketball",
  boys_baseball:"Boys Baseball", girls_softball:"Girls Softball",
  boys_soccer:"Boys Soccer", girls_soccer:"Girls Soccer",
  girls_volleyball:"Girls Volleyball",
  boys_boxing:"Boys Boxing", girls_boxing:"Girls Boxing",
  boys_golf:"Boys Golf", girls_golf:"Girls Golf",
  boys_tennis:"Boys Tennis", girls_tennis:"Girls Tennis",
  boys_wrestling:"Boys Wrestling", girls_wrestling:"Girls Wrestling",
  boys_cross_country:"Boys Cross Country", girls_cross_country:"Girls Cross Country",
  boys_track:"Boys Track & Field", girls_track:"Girls Track & Field",
  boys_lacrosse:"Boys Lacrosse", girls_lacrosse:"Girls Lacrosse",
};
const ALL_SPORTS = Object.keys(SPORT_LABELS);

const SUBSCRIPTION_TERMS = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "2_year", label: "2-Year" },
  { value: "3_year", label: "3-Year" },
];

const POC_ROLES = [
  { value: "head_coach", label: "Head Coach" },
  { value: "athletic_director", label: "Athletic Director" },
];

function generateSchoolCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "X";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const EMPTY_FORM = {
  school_name: "", mascot: "", team_id: "",
  subscribed_sports: ["boys_football"], subscription_term: "annual",
  subscription_start: "", subscription_end: "",
  location_city: "", location_state: "",
  poc_name: "", poc_role: "head_coach", poc_email: "", poc_phone: "",
};

export default function SuperAdminView({ allUsers, loading: usersLoading, onRefresh }) {
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [teamSearch, setTeamSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadSchools = () => {
    setSchoolsLoading(true);
    base44.entities.School.list("-created_date").then(list => {
      setSchools(list);
      setSchoolsLoading(false);
    }).catch(() => setSchoolsLoading(false));
  };

  useEffect(() => { loadSchools(); }, []);

  // Build member counts from allUsers by team_id
  const memberCountByTeam = allUsers.reduce((acc, u) => {
    if (u.team_id) acc[u.team_id] = (acc[u.team_id] || 0) + 1;
    return acc;
  }, {});
  const membersByTeam = allUsers.reduce((acc, u) => {
    if (u.team_id) { acc[u.team_id] = acc[u.team_id] || []; acc[u.team_id].push(u); }
    return acc;
  }, {});

  const toggleSport = (s, target, setter) => setter(p => ({
    ...p,
    [target]: p[target].includes(s)
      ? p[target].filter(x => x !== s)
      : [...p[target], s]
  }));

  const filteredSchools = schools.filter(s =>
    s.school_name?.toLowerCase().includes(teamSearch.toLowerCase()) ||
    s.team_id?.toLowerCase().includes(teamSearch.toLowerCase()) ||
    s.location_city?.toLowerCase().includes(teamSearch.toLowerCase()) ||
    s.location_state?.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.poc_email.trim() || !form.school_name.trim() || !form.poc_name.trim()) return;
    setSubmitting(true);
    setMsg({ text: "", type: "" });
    try {
      const teamId = form.team_id.trim() || form.school_name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      const schoolCode = generateSchoolCode();

      const schoolData = {
        team_id: teamId,
        school_name: form.school_name.trim(),
        school_code: schoolCode,
        mascot: form.mascot.trim(),
        subscribed_sports: form.subscribed_sports,
        subscription_term: form.subscription_term,
        subscription_start: form.subscription_start || undefined,
        subscription_end: form.subscription_end || undefined,
        location_city: form.location_city.trim(),
        location_state: form.location_state.trim(),
        poc_name: form.poc_name.trim(),
        poc_role: form.poc_role,
        poc_email: form.poc_email.trim(),
        poc_phone: form.poc_phone.trim(),
      };

      await Promise.all([
        base44.entities.Invite.create({
          email: form.poc_email.trim(),
          team_id: teamId,
          school_name: form.school_name.trim(),
          school_code: schoolCode,
          coaching_role: form.poc_role,
          assigned_sports: form.subscribed_sports,
          assigned_positions: [],
          assigned_phases: [],
          status: "pending",
          invited_by: "super_admin",
          invite_type: "school_setup",
          poc_name: form.poc_name.trim(),
          poc_phone: form.poc_phone.trim(),
          mascot: form.mascot.trim(),
          subscribed_sports: form.subscribed_sports,
          subscription_term: form.subscription_term,
          location_city: form.location_city.trim(),
          location_state: form.location_state.trim(),
        }),
        base44.entities.School.create(schoolData),
      ]);

      await base44.users.inviteUser(form.poc_email.trim(), "admin");
      setMsg({ text: `School "${form.school_name}" created! Invite sent to ${form.poc_email}`, type: "success" });
      setForm(EMPTY_FORM);
      setShowAddSchool(false);
      loadSchools();
      onRefresh?.();
    } catch (err) {
      setMsg({ text: `Error: ${err.message}`, type: "error" });
    }
    setSubmitting(false);
    setTimeout(() => setMsg({ text: "", type: "" }), 6000);
  };

  const startEdit = (school) => {
    setEditingId(school.id);
    setEditForm({
      school_name: school.school_name || "",
      mascot: school.mascot || "",
      location_city: school.location_city || "",
      location_state: school.location_state || "",
      subscribed_sports: school.subscribed_sports || [],
      subscription_term: school.subscription_term || "annual",
      subscription_start: school.subscription_start || "",
      subscription_end: school.subscription_end || "",
      poc_name: school.poc_name || "",
      poc_role: school.poc_role || "head_coach",
      poc_email: school.poc_email || "",
      poc_phone: school.poc_phone || "",
    });
  };

  const saveEdit = async (schoolId) => {
    setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, ...editForm } : s));
    await base44.entities.School.update(schoolId, editForm);
    setEditingId(null);
  };

  const deleteSchool = async (school) => {
    if (!window.confirm(`Delete "${school.school_name}"? This removes the school record but does NOT delete user accounts.`)) return;
    setDeletingId(school.id);
    await base44.entities.School.delete(school.id);
    setSchools(prev => prev.filter(s => s.id !== school.id));
    setDeletingId(null);
    if (expandedId === school.id) setExpandedId(null);
  };

  const loading = schoolsLoading || usersLoading;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">School <span style={{ color: "var(--color-primary,#f97316)" }}>Management</span></h1>
          <p className="text-gray-500 text-sm">{filteredSchools.length} school{filteredSchools.length !== 1 ? "s" : ""} · {allUsers.length} total users</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadSchools(); onRefresh?.(); }} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowAddSchool(!showAddSchool); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <Plus className="w-4 h-4" /> Add School
          </button>
        </div>
      </div>

      {/* Super admin badge */}
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          <span className="text-purple-400 font-semibold">Super Admin Mode — </span>
          Create, edit, and remove school accounts. Each school is fully isolated with their own team data.
        </p>
      </div>

      {/* Feedback message */}
      {msg.text && (
        <div className={`rounded-xl p-3 text-sm ${msg.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* ── Add School Form ── */}
      {showAddSchool && (
        <SchoolForm
          form={form}
          setForm={setForm}
          onToggleSport={(s) => toggleSport(s, "subscribed_sports", setForm)}
          onSubmit={handleSubmit}
          onCancel={() => setShowAddSchool(false)}
          submitting={submitting}
          title="Add New School / Organization"
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={teamSearch} onChange={e => setTeamSearch(e.target.value)}
          placeholder="Search by name, ID, city, or state..."
          className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none" />
      </div>

      {/* School List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
            Loading schools...
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{teamSearch ? "No schools match your search." : "No schools yet. Add one above."}</p>
          </div>
        ) : filteredSchools.map(school => {
          const isExpanded = expandedId === school.id;
          const isEditing = editingId === school.id;
          const memberCount = memberCountByTeam[school.team_id] || 0;
          const members = membersByTeam[school.team_id] || [];

          return (
            <div key={school.id} className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
              {/* School row */}
              <div className="px-5 py-4 flex items-center gap-4">
                <button onClick={() => setExpandedId(isExpanded ? null : school.id)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#f97316)22" }}>
                    <Building2 className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{school.school_name}</p>
                      {school.mascot && <span className="text-gray-500 text-xs">· {school.mascot}</span>}
                      {school.subscription_term && (
                        <span className="text-xs bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded capitalize">{school.subscription_term.replace("_", "-")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-gray-600 text-xs font-mono">{school.team_id}</span>
                      {(school.location_city || school.location_state) && (
                        <span className="text-gray-600 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{[school.location_city, school.location_state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      <span className="text-gray-600 text-xs flex items-center gap-1">
                        <Users className="w-3 h-3" />{memberCount} member{memberCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => { isEditing ? setEditingId(null) : startEdit(school); setExpandedId(school.id); }}
                    className={`p-2 rounded-lg transition-all ${isEditing ? "text-white bg-gray-700" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteSchool(school)} disabled={deletingId === school.id}
                    className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setExpandedId(isExpanded ? null : school.id)} className="text-gray-500 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded: edit form or details */}
              {isExpanded && (
                <div className="border-t border-gray-800">
                  {isEditing ? (
                    <div className="p-5">
                      <SchoolForm
                        form={editForm}
                        setForm={setEditForm}
                        onToggleSport={(s) => toggleSport(s, "subscribed_sports", setEditForm)}
                        onSubmit={() => saveEdit(school.id)}
                        onCancel={() => setEditingId(null)}
                        submitting={false}
                        title="Edit School"
                        submitLabel="Save Changes"
                        hideWarning
                      />
                    </div>
                  ) : (
                    <div className="p-5 space-y-4">
                      {/* POC */}
                      {(school.poc_name || school.poc_email) && (
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Point of Contact</p>
                          <div className="flex flex-wrap gap-4">
                            {school.poc_name && <span className="text-white text-sm">{school.poc_name} <span className="text-gray-500">({school.poc_role?.replace("_"," ")})</span></span>}
                            {school.poc_email && <span className="text-gray-400 text-sm flex items-center gap-1"><Mail className="w-3 h-3" />{school.poc_email}</span>}
                            {school.poc_phone && <span className="text-gray-400 text-sm flex items-center gap-1"><Phone className="w-3 h-3" />{school.poc_phone}</span>}
                          </div>
                        </div>
                      )}

                      {/* Subscribed sports */}
                      {school.subscribed_sports?.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Subscribed Sports ({school.subscribed_sports.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {school.subscribed_sports.map(s => (
                              <span key={s} className="text-xs px-2 py-1 rounded-lg text-white" style={{ backgroundColor: "var(--color-primary,#f97316)33", color: "var(--color-primary,#f97316)" }}>
                                {SPORT_LABELS[s] || s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Subscription dates */}
                      {(school.subscription_start || school.subscription_end) && (
                        <div className="flex gap-4 text-xs text-gray-400">
                          {school.subscription_start && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Start: {school.subscription_start}</span>}
                          {school.subscription_end && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />End: {school.subscription_end}</span>}
                        </div>
                      )}

                      {/* Members */}
                      {members.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Staff Members ({members.length})</p>
                          <div className="space-y-1.5">
                            {members.map(u => (
                              <div key={u.id} className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg px-3 py-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                  style={{ backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" }}>
                                  {(u.full_name || u.email)?.[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-xs font-medium">{u.full_name || "—"}</p>
                                  <p className="text-gray-500 text-xs">{u.email}</p>
                                </div>
                                <span className="text-xs text-gray-500 capitalize bg-gray-800 px-2 py-0.5 rounded">
                                  {u.coaching_role?.replace(/_/g, " ") || u.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Reusable school form (add + edit) ──────────────────────────────────────
function SchoolForm({ form, setForm, onToggleSport, onSubmit, onCancel, submitting, title, submitLabel = "Create School & Send Invite", hideWarning = false }) {
  const f = (field) => (val) => setForm(p => ({ ...p, [field]: typeof val === "string" ? val : val.target?.value ?? val }));

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
          {title}
        </h3>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-300"><X className="w-4 h-4" /></button>
      </div>

      {/* School Info */}
      <div>
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">School / Organization Info</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="School / Org Name" required>
            <input value={form.school_name} onChange={f("school_name")} placeholder="e.g. Westview High School" className="field-input" />
          </Field>
          <Field label="Mascot">
            <input value={form.mascot} onChange={f("mascot")} placeholder="e.g. Eagles, Tigers" className="field-input" />
          </Field>
          <Field label="City">
            <input value={form.location_city} onChange={f("location_city")} placeholder="e.g. Dallas" className="field-input" />
          </Field>
          <Field label="State">
            <input value={form.location_state} onChange={f("location_state")} placeholder="e.g. TX" className="field-input" />
          </Field>
          <Field label={<>Team ID <span className="text-gray-600 font-normal">(auto if blank)</span></>}>
            <input value={form.team_id || ""} onChange={e => setForm(p => ({ ...p, team_id: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
              placeholder="e.g. westview_hs" className="field-input font-mono" />
          </Field>
          <Field label="Subscription Term">
            <select value={form.subscription_term} onChange={f("subscription_term")} className="field-input">
              {SUBSCRIPTION_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Subscription Start">
            <input type="date" value={form.subscription_start || ""} onChange={f("subscription_start")} className="field-input" />
          </Field>
          <Field label="Subscription End">
            <input type="date" value={form.subscription_end || ""} onChange={f("subscription_end")} className="field-input" />
          </Field>
        </div>
      </div>

      {/* Subscribed Sports */}
      <div>
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Subscribed Sports <span className="text-red-400">*</span></p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(SPORT_LABELS).map(([key, label]) => (
            <button key={key} type="button" onClick={() => onToggleSport(key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${form.subscribed_sports?.includes(key) ? "text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"}`}
              style={form.subscribed_sports?.includes(key) ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Point of Contact */}
      <div>
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Point of Contact</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Full Name" required>
            <input value={form.poc_name} onChange={f("poc_name")} placeholder="Full name" className="field-input" />
          </Field>
          <Field label="Role">
            <select value={form.poc_role} onChange={f("poc_role")} className="field-input">
              {POC_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Email Address" required>
            <input type="email" value={form.poc_email} onChange={f("poc_email")} placeholder="coach@school.edu" className="field-input" />
          </Field>
          <Field label="Phone">
            <input type="tel" value={form.poc_phone} onChange={f("poc_phone")} placeholder="(555) 555-5555" className="field-input" />
          </Field>
        </div>
      </div>

      {!hideWarning && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-300 text-xs">
            An invitation will be sent to the point of contact. Once they accept, they can set up their account and invite their coaching staff. Only the subscribed sports will be visible to their team.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onSubmit}
          disabled={submitting || !form.poc_email?.trim() || !form.school_name?.trim() || !form.poc_name?.trim() || !form.subscribed_sports?.length}
          className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
          style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          {submitting ? "Saving..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
          Cancel
        </button>
      </div>

      <style>{`
        .field-input {
          width: 100%;
          background: #1e1e1e;
          border: 1px solid #374151;
          border-radius: 12px;
          padding: 10px 12px;
          color: white;
          font-size: 14px;
          outline: none;
        }
        .field-input::placeholder { color: #6b7280; }
        .field-input:focus { border-color: var(--color-primary, #f97316); }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-gray-400 text-xs mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}