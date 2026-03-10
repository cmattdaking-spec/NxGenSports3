import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Building2, X, ChevronDown, ChevronUp,
  Search, Shield, AlertTriangle, RefreshCw
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

function generateSchoolCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "X";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const EMPTY_FORM = {
  school_name: "", mascot: "", team_id: "",
  subscribed_sports: ["boys_football"], subscription_term: "annual",
  location_city: "", location_state: "",
  poc_name: "", poc_role: "head_coach", poc_email: "", poc_phone: "",
};

export default function SuperAdminView({ allUsers, loading, onRefresh }) {
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [teamSearch, setTeamSearch] = useState("");

  const teams = allUsers.reduce((acc, u) => {
    const tid = u.team_id || "(no team)";
    if (!acc[tid]) acc[tid] = { team_id: tid, school_name: u.school_name || tid, members: [] };
    acc[tid].members.push(u);
    return acc;
  }, {});

  const teamList = Object.values(teams).filter(t =>
    t.school_name?.toLowerCase().includes(teamSearch.toLowerCase()) ||
    t.team_id?.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const toggleSport = (s) => setForm(p => ({
    ...p,
    subscribed_sports: p.subscribed_sports.includes(s)
      ? p.subscribed_sports.filter(x => x !== s)
      : [...p.subscribed_sports, s]
  }));

  const handleSubmit = async () => {
    if (!form.poc_email.trim() || !form.school_name.trim() || !form.poc_name.trim()) return;
    setSubmitting(true);
    setMsg({ text: "", type: "" });
    try {
      const teamId = form.team_id.trim() || form.school_name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      const schoolCode = generateSchoolCode();

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
        base44.entities.School.create({
          team_id: teamId,
          school_name: form.school_name.trim(),
          school_code: schoolCode,
          mascot: form.mascot.trim(),
          subscribed_sports: form.subscribed_sports,
          subscription_term: form.subscription_term,
          location_city: form.location_city.trim(),
          location_state: form.location_state.trim(),
          poc_name: form.poc_name.trim(),
          poc_role: form.poc_role,
          poc_email: form.poc_email.trim(),
          poc_phone: form.poc_phone.trim(),
        }),
      ]);

      await base44.users.inviteUser(form.poc_email.trim(), "admin");
      setMsg({ text: `School "${form.school_name}" created! Invite sent to ${form.poc_email}`, type: "success" });
      setForm(EMPTY_FORM);
      setShowAddTeam(false);
      onRefresh?.();
    } catch (err) {
      setMsg({ text: `Error: ${err.message}`, type: "error" });
    }
    setSubmitting(false);
    setTimeout(() => setMsg({ text: "", type: "" }), 6000);
  };

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">School <span style={{ color: "var(--color-primary,#f97316)" }}>Management</span></h1>
          <p className="text-gray-500 text-sm">{teamList.length} schools · {allUsers.length} total users</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAddTeam(!showAddTeam)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            <Plus className="w-4 h-4" /> Add School
          </button>
        </div>
      </div>

      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          <span className="text-purple-400 font-semibold">Super Admin Mode — </span>
          Create and manage school accounts. Each school is fully isolated with their own team data.
        </p>
      </div>

      {msg.text && (
        <div className={`rounded-xl p-3 text-sm ${msg.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Add School Form */}
      {showAddTeam && (
        <div className="bg-[#141414] border border-gray-700 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
              Add New School / Organization
            </h3>
            <button onClick={() => setShowAddTeam(false)} className="text-gray-600 hover:text-gray-300"><X className="w-4 h-4" /></button>
          </div>

          {/* School Info */}
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">School / Organization Info</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">School / Org Name <span className="text-red-400">*</span></label>
                <input type="text" value={form.school_name} onChange={e => setForm(p => ({ ...p, school_name: e.target.value }))}
                  placeholder="e.g. Westview High School"
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Mascot</label>
                <input type="text" value={form.mascot} onChange={e => setForm(p => ({ ...p, mascot: e.target.value }))}
                  placeholder="e.g. Eagles, Tigers, Warriors"
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">City</label>
                <input type="text" value={form.location_city} onChange={e => setForm(p => ({ ...p, location_city: e.target.value }))}
                  placeholder="e.g. Dallas"
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">State</label>
                <input type="text" value={form.location_state} onChange={e => setForm(p => ({ ...p, location_state: e.target.value }))}
                  placeholder="e.g. TX"
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Team ID <span className="text-gray-600">(auto-generated if blank)</span></label>
                <input type="text" value={form.team_id} onChange={e => setForm(p => ({ ...p, team_id: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                  placeholder="e.g. westview_hs"
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none font-mono" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Subscription Term</label>
                <select value={form.subscription_term} onChange={e => setForm(p => ({ ...p, subscription_term: e.target.value }))}
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                  {SUBSCRIPTION_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Subscribed Sports */}
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Subscribed Sports <span className="text-red-400">*</span></p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SPORTS.map(s => (
                <button key={s} onClick={() => toggleSport(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${form.subscribed_sports.includes(s) ? "text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"}`}
                  style={form.subscribed_sports.includes(s) ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
                  {SPORT_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Point of Contact */}
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Point of Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Full Name <span className="text-red-400">*</span></label>
                <input type="text" value={form.poc_name} onChange={e => setForm(p => ({ ...p, poc_name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Role</label>
                <select value={form.poc_role} onChange={e => setForm(p => ({ ...p, poc_role: e.target.value }))}
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                  <option value="head_coach">Head Coach</option>
                  <option value="athletic_director">Athletic Director</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Email Address <span className="text-red-400">*</span></label>
                <input type="email" value={form.poc_email} onChange={e => setForm(p => ({ ...p, poc_email: e.target.value }))}
                  placeholder="coach@school.edu"
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Phone</label>
                <input type="tel" value={form.poc_phone} onChange={e => setForm(p => ({ ...p, poc_phone: e.target.value }))}
                  placeholder="(555) 555-5555"
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-300 text-xs">
              An invitation will be sent to the point of contact. Once they accept, they can set up their account and invite their coaching staff. Only the subscribed sports will be visible to their team.
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSubmit}
              disabled={submitting || !form.poc_email.trim() || !form.school_name.trim() || !form.poc_name.trim() || form.subscribed_sports.length === 0}
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              {submitting ? "Creating..." : "Create School & Send Invite"}
            </button>
            <button onClick={() => setShowAddTeam(false)} className="px-5 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={teamSearch} onChange={e => setTeamSearch(e.target.value)}
          placeholder="Search schools by name or ID..."
          className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none" />
      </div>

      {/* Team List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
            Loading schools...
          </div>
        ) : teamList.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No schools found.</p>
          </div>
        ) : teamList.map(team => (
          <div key={team.team_id} className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
            <button onClick={() => setExpandedTeam(expandedTeam === team.team_id ? null : team.team_id)}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#f97316)22" }}>
                  <Building2 className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">{team.school_name}</p>
                  <p className="text-gray-600 text-xs font-mono">{team.team_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
                {expandedTeam === team.team_id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </button>
            {expandedTeam === team.team_id && (
              <div className="border-t border-gray-800 divide-y divide-gray-800/50">
                {team.members.map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" }}>
                      {(u.full_name || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{u.full_name || "—"}</p>
                      <p className="text-gray-500 text-xs">{u.email}</p>
                    </div>
                    <span className="text-xs text-gray-400 capitalize bg-gray-800 px-2 py-1 rounded-lg">
                      {u.coaching_role?.replace(/_/g, " ") || u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}