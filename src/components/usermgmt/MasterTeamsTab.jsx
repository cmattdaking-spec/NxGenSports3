import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, X, Search, RefreshCw, Trash2,
  Calendar, Users, Mail, Edit2, Ban, PauseCircle, PlayCircle, Shield
} from "lucide-react";

const SUBSCRIPTION_TERMS = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "2_year", label: "2-Year" },
  { value: "3_year", label: "3-Year" },
];

const STATUS_META = {
  active: { label: "Active", badge: "bg-green-500/15 text-green-400", icon: PlayCircle },
  suspended: { label: "Suspended", badge: "bg-yellow-500/15 text-yellow-400", icon: PauseCircle },
  deactivated: { label: "Deactivated", badge: "bg-red-500/15 text-red-400", icon: Ban },
};

const EMPTY_FORM = {
  team_id: "",
  school_name: "",
  assigned_admin_name: "",
  assigned_admin_email: "",
  assigned_admin_role: "head_coach",
  subscription_status: "active",
  subscription_term: "annual",
  subscription_start: "",
  subscription_end: "",
};

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

export default function MasterTeamsTab() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const loadTeams = () => {
    setLoading(true);
    setError("");
    base44.functions.invoke("listMasterTeams")
      .then(res => {
        setTeams(res.data?.teams || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load Master Teams.");
        setLoading(false);
      });
  };

  useEffect(() => { loadTeams(); }, []);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 5000);
  };

  const handleAdd = async () => {
    if (!form.team_id.trim() || !form.school_name.trim()) return;
    setSubmitting(true);
    try {
      await base44.entities.MasterTeams.create({
        team_id: form.team_id.trim(),
        school_name: form.school_name.trim(),
        assigned_admin_name: form.assigned_admin_name.trim(),
        assigned_admin_email: form.assigned_admin_email.trim(),
        assigned_admin_role: form.assigned_admin_role,
        subscription_status: form.subscription_status || "active",
        subscription_term: form.subscription_term,
        subscription_start: form.subscription_start || undefined,
        subscription_end: form.subscription_end || undefined,
      });
      setForm(EMPTY_FORM);
      setShowAdd(false);
      showMsg("Master Team record created.");
      loadTeams();
    } catch (err) {
      showMsg(`Error: ${err.message}`, "error");
    }
    setSubmitting(false);
  };

  const startEdit = (team) => {
    setEditingId(team.id);
    setEditForm({
      school_name: team.school_name || "",
      assigned_admin_name: team.assigned_admin_name || "",
      assigned_admin_email: team.assigned_admin_email || "",
      assigned_admin_role: team.assigned_admin_role || "head_coach",
      subscription_status: team.subscription_status || "active",
      subscription_term: team.subscription_term || "annual",
      subscription_start: team.subscription_start || "",
      subscription_end: team.subscription_end || "",
    });
  };

  const saveEdit = async (teamId) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...editForm } : t));
    try {
      await base44.entities.MasterTeams.update(teamId, editForm);
      setEditingId(null);
      showMsg("Master Team updated.");
    } catch (err) {
      loadTeams();
      showMsg(`Error: ${err.message}`, "error");
    }
  };

  const updateStatus = async (team, nextStatus) => {
    setTeams(prev => prev.map(t => t.id === team.id ? { ...t, subscription_status: nextStatus } : t));
    try {
      await base44.entities.MasterTeams.update(team.id, { subscription_status: nextStatus });
      showMsg(`${team.school_name} marked ${nextStatus}.`);
    } catch (err) {
      loadTeams();
      showMsg(`Error: ${err.message}`, "error");
    }
  };

  const deleteTeam = async (team) => {
    if (!window.confirm(`Delete Master Team record for "${team.school_name}"?`)) return;
    setDeletingId(team.id);
    try {
      await base44.entities.MasterTeams.delete(team.id);
      setTeams(prev => prev.filter(t => t.id !== team.id));
      showMsg(`${team.school_name} removed from Master Teams.`);
    } catch (err) {
      showMsg(`Error: ${err.message}`, "error");
    }
    setDeletingId(null);
  };

  const filteredTeams = teams.filter(t => {
    const matchesSearch =
      t.school_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.team_id?.toLowerCase().includes(search.toLowerCase()) ||
      t.assigned_admin_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (t.subscription_status || "active") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
          <h2 className="text-white font-bold text-lg">Master Teams</h2>
          <span className="text-gray-500 text-sm">({filteredTeams.length} team{filteredTeams.length !== 1 ? "s" : ""})</span>
        </div>
        <div className="flex gap-2">
          <button onClick={loadTeams} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <Plus className="w-4 h-4" /> Add Team
          </button>
        </div>
      </div>

      {/* Feedback */}
      {msg.text && (
        <div className={`rounded-xl p-3 text-sm ${msg.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <MasterTeamForm
          form={form}
          setForm={setForm}
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
          submitting={submitting}
          title="Add Master Team Record"
          submitLabel="Create Master Team"
        />
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, or admin email..."
            className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#141414] border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none md:w-52"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>
      )}

      {/* Team list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
            Loading master teams...
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{search ? "No teams match your search." : "No master team records yet. Add one above."}</p>
          </div>
        ) : filteredTeams.map(team => {
          const status = team.subscription_status || "active";
          const statusMeta = STATUS_META[status] || STATUS_META.active;
          const isEditing = editingId === team.id;

          return (
            <div key={team.id} className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{team.school_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusMeta.badge}`}>{statusMeta.label}</span>
                      {team.subscription_term && (
                        <span className="text-xs bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded capitalize">
                          {team.subscription_term.replace("_", "-")}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-xs font-mono mt-0.5">{team.team_id}</p>

                    {/* Assigned admin */}
                    {(team.assigned_admin_name || team.assigned_admin_email) && (
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Admin:</span>
                        {team.assigned_admin_name && (
                          <span className="text-gray-300 text-sm flex items-center gap-1">
                            <Users className="w-3 h-3 text-gray-500" />
                            {team.assigned_admin_name}
                            {team.assigned_admin_role && (
                              <span className="text-gray-500 ml-1 capitalize">({team.assigned_admin_role.replace(/_/g, " ")})</span>
                            )}
                          </span>
                        )}
                        {team.assigned_admin_email && (
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            <Mail className="w-3 h-3" />{team.assigned_admin_email}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Subscription dates */}
                    {(team.subscription_start || team.subscription_end) && (
                      <div className="flex gap-4 text-xs text-gray-400 mt-1.5">
                        {team.subscription_start && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Start: {team.subscription_start}</span>
                        )}
                        {team.subscription_end && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />End: {team.subscription_end}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => isEditing ? setEditingId(null) : startEdit(team)}
                      className={`p-2 rounded-lg transition-all ${isEditing ? "text-white bg-gray-700" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTeam(team)}
                      disabled={deletingId === team.id}
                      className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status quick-actions */}
                {!isEditing && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {status !== "active" && (
                      <button onClick={() => updateStatus(team, "active")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/15 text-green-400 hover:bg-green-500/20 transition-all">
                        Activate
                      </button>
                    )}
                    {status !== "suspended" && (
                      <button onClick={() => updateStatus(team, "suspended")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/20 transition-all">
                        Suspend
                      </button>
                    )}
                    {status !== "deactivated" && (
                      <button onClick={() => updateStatus(team, "deactivated")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/20 transition-all">
                        Deactivate
                      </button>
                    )}
                  </div>
                )}

                {/* Inline edit form */}
                {isEditing && (
                  <div className="mt-4 border-t border-gray-800 pt-4">
                    <MasterTeamForm
                      form={editForm}
                      setForm={setEditForm}
                      onSubmit={() => saveEdit(team.id)}
                      onCancel={() => setEditingId(null)}
                      submitting={false}
                      title="Edit Master Team"
                      submitLabel="Save Changes"
                      hideTeamId
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MasterTeamForm({ form, setForm, onSubmit, onCancel, submitting, title, submitLabel = "Save", hideTeamId = false }) {
  const f = (field) => (val) =>
    setForm(p => ({ ...p, [field]: typeof val === "string" ? val : val.target?.value ?? val }));

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
          {title}
        </h3>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-300"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {!hideTeamId && (
          <Field label="Team ID" required>
            <input
              value={form.team_id || ""}
              onChange={e => setForm(p => ({ ...p, team_id: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
              placeholder="e.g. westview_hs"
              className="mt-field-input font-mono"
            />
          </Field>
        )}
        <Field label="School / Org Name" required>
          <input value={form.school_name || ""} onChange={f("school_name")} placeholder="e.g. Westview High School" className="mt-field-input" />
        </Field>
        <Field label="Assigned Admin Name">
          <input value={form.assigned_admin_name || ""} onChange={f("assigned_admin_name")} placeholder="Full name" className="mt-field-input" />
        </Field>
        <Field label="Assigned Admin Email">
          <input type="email" value={form.assigned_admin_email || ""} onChange={f("assigned_admin_email")} placeholder="admin@school.edu" className="mt-field-input" />
        </Field>
        <Field label="Admin Role">
          <select value={form.assigned_admin_role || "head_coach"} onChange={f("assigned_admin_role")} className="mt-field-input">
            <option value="head_coach">Head Coach</option>
            <option value="athletic_director">Athletic Director</option>
            <option value="associate_head_coach">Associate Head Coach</option>
            <option value="offensive_coordinator">Offensive Coordinator</option>
            <option value="defensive_coordinator">Defensive Coordinator</option>
            <option value="special_teams_coordinator">Special Teams Coordinator</option>
            <option value="strength_conditioning_coordinator">S&C Coordinator</option>
          </select>
        </Field>
        <Field label="Subscription Status">
          <select value={form.subscription_status || "active"} onChange={f("subscription_status")} className="mt-field-input">
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </Field>
        <Field label="Subscription Term">
          <select value={form.subscription_term || "annual"} onChange={f("subscription_term")} className="mt-field-input">
            {SUBSCRIPTION_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Subscription Start">
          <input type="date" value={form.subscription_start || ""} onChange={f("subscription_start")} className="mt-field-input" />
        </Field>
        <Field label="Subscription End">
          <input type="date" value={form.subscription_end || ""} onChange={f("subscription_end")} className="mt-field-input" />
        </Field>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !form.school_name?.trim() || (!hideTeamId && !form.team_id?.trim())}
          className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
          style={{ backgroundColor: "var(--color-primary,#f97316)" }}
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
          Cancel
        </button>
      </div>

      <style>{`
        .mt-field-input {
          width: 100%;
          background: #1e1e1e;
          border: 1px solid #374151;
          border-radius: 12px;
          padding: 10px 12px;
          color: white;
          font-size: 14px;
          outline: none;
        }
        .mt-field-input::placeholder { color: #6b7280; }
        .mt-field-input:focus { border-color: var(--color-primary, #f97316); }
      `}</style>
    </div>
  );
}
