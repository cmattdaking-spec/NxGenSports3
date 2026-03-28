import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Building2, X, ChevronDown, ChevronUp,
  Search, RefreshCw, Trash2,
  MapPin, Calendar, Users, User, Mail, Phone, Edit2, Ban, PauseCircle, PlayCircle, UserPlus, Shield
} from "lucide-react";
import InviteForm from "./InviteForm";
import MasterTeamsTab from "./MasterTeamsTab";

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
  { value: "associate_head_coach", label: "Associate Head Coach" },
  { value: "offensive_coordinator", label: "Offensive Coordinator" },
  { value: "defensive_coordinator", label: "Defensive Coordinator" },
  { value: "special_teams_coordinator", label: "Special Teams Coordinator" },
  { value: "strength_conditioning_coordinator", label: "Strength & Conditioning Coordinator" },
  { value: "position_coach", label: "Position Coach" },
  { value: "trainer", label: "Trainer" },
];

const ADMIN_PLATFORM_ROLES = [
  "head_coach",
  "athletic_director",
  "associate_head_coach",
  "offensive_coordinator",
  "defensive_coordinator",
  "special_teams_coordinator",
  "strength_conditioning_coordinator",
];

const SCHOOL_STATUS_META = {
  active: { label: "Active", badge: "bg-green-500/15 text-green-400", icon: PlayCircle },
  suspended: { label: "Suspended", badge: "bg-yellow-500/15 text-yellow-400", icon: PauseCircle },
  deactivated: { label: "Deactivated", badge: "bg-red-500/15 text-red-400", icon: Ban },
};

function getPlatformRoleForCoachingRole(role) {
  return ADMIN_PLATFORM_ROLES.includes(role) ? "admin" : "user";
}

function splitFullName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

function generateSchoolCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "X";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const EMPTY_FORM = {
  school_name: "", mascot: "", team_id: "",
  logo_url: "", primary_color: "#f97316", secondary_color: "",
  subscribed_sports: ["boys_football"], subscription_term: "annual",
  subscription_start: "", subscription_end: "",
  status: "active",
  location_city: "", location_state: "",
  poc_name: "", poc_role: "head_coach", poc_email: "", poc_phone: "",
};

const SUITE_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/29e077944_generated_image.png";

export default function SuperAdminView({ allUsers, loading: usersLoading, onRefresh, user }) {
  const [activeTab, setActiveTab] = useState("schools");
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState("");
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [accentColor, setAccentColor] = useState(user?.accent_color || "#f97316");
  useEffect(() => {
    if (user?.accent_color) {
      setAccentColor(user.accent_color);
      document.documentElement.style.setProperty("--color-primary", user.accent_color);
    }
  }, [user?.accent_color]);
  const [savingColor, setSavingColor] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [teamSearch, setTeamSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [reinvitingId, setReinvitingId] = useState(null);
  const [addingUserId, setAddingUserId] = useState(null);

  // ── Users tab state ──
  const [usersData, setUsersData] = useState([]);
  const [usersDataLoading, setUsersDataLoading] = useState(false);
  const [usersDataError, setUsersDataError] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);
  const [userSearch, setUserSearch] = useState("");

  // ── Players tab state ──
  const [playersData, setPlayersData] = useState([]);
  const [playersDataLoading, setPlayersDataLoading] = useState(false);
  const [playersDataError, setPlayersDataError] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editPlayerForm, setEditPlayerForm] = useState({});
  const [savingPlayerId, setSavingPlayerId] = useState(null);
  const [playerSearch, setPlayerSearch] = useState("");

  const loadSchools = () => {
    setSchoolsLoading(true);
    setSchoolsError("");
    base44.functions.invoke("listAllSchools").then(res => {
      setSchools(res.data?.schools || []);
      setSchoolsLoading(false);
    }).catch(err => {
      setSchoolsError(err.message || "Failed to load schools.");
      setSchoolsLoading(false);
    });
  };

  const loadUsersData = () => {
    setUsersDataLoading(true);
    setUsersDataError("");
    base44.functions.invoke("getTeamUsers").then(res => {
      setUsersData(Array.isArray(res.data) ? res.data : []);
      setUsersDataLoading(false);
    }).catch(err => {
      setUsersDataError(err.message || "Failed to load users.");
      setUsersDataLoading(false);
    });
  };

  const loadPlayersData = () => {
    setPlayersDataLoading(true);
    setPlayersDataError("");
    base44.entities.Player.list("-created_date").then(list => {
      setPlayersData(list || []);
      setPlayersDataLoading(false);
    }).catch(err => {
      setPlayersDataError(err.message || "Failed to load players.");
      setPlayersDataLoading(false);
    });
  };

  const saveAccentColor = async () => {
    setSavingColor(true);
    await base44.auth.updateMe({ accent_color: accentColor });
    document.documentElement.style.setProperty("--color-primary", accentColor);
    setSavingColor(false);
  };

  useEffect(() => { loadSchools(); }, []);

  // Lazy-load users and players when their tabs are first opened
  useEffect(() => {
    if (activeTab === "users" && usersData.length === 0 && !usersDataLoading) {
      loadUsersData();
    }
  }, [activeTab, usersData.length, usersDataLoading]);

  useEffect(() => {
    if (activeTab === "players" && playersData.length === 0 && !playersDataLoading) {
      loadPlayersData();
    }
  }, [activeTab, playersData.length, playersDataLoading]);

  // Build member counts from allUsers by team_id
  // Scope member counts to users belonging to schools assigned to this super admin.
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

  const filteredSchools = schools.filter(s => {
    const matchesSearch =
      s.school_name?.toLowerCase().includes(teamSearch.toLowerCase()) ||
      s.team_id?.toLowerCase().includes(teamSearch.toLowerCase()) ||
      s.location_city?.toLowerCase().includes(teamSearch.toLowerCase()) ||
      s.location_state?.toLowerCase().includes(teamSearch.toLowerCase());
    const matchesStatus = statusFilter === "all" || (s.status || "active") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const createPointOfContactInvite = async (school) => {
    const { firstName, lastName } = splitFullName(school.poc_name);
    const pendingInvites = await base44.entities.Invite.filter(
      { team_id: school.team_id, email: school.poc_email, status: "pending" },
      "-created_date",
      50
    );

    await Promise.all(pendingInvites.map(invite => base44.entities.Invite.update(invite.id, { status: "expired" })));

    await base44.functions.invoke("sendInvite", {
      email: school.poc_email.trim(),
      team_id: school.team_id,
      school_id: school.id,
      school_name: school.school_name,
      school_code: school.school_code,
      coaching_role: school.poc_role,
      assigned_sports: school.subscribed_sports || [],
      assigned_positions: [],
      assigned_phases: [],
      first_name: firstName,
      last_name: lastName,
      invite_type: "school_setup",
      poc_phone: school.poc_phone || "",
      mascot: school.mascot || "",
      subscribed_sports: school.subscribed_sports || [],
      subscription_term: school.subscription_term,
      location_city: school.location_city || "",
      location_state: school.location_state || "",
    });
  };

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
        logo_url: form.logo_url.trim(),
        primary_color: form.primary_color || "#f97316",
        secondary_color: form.secondary_color || "",
        subscribed_sports: form.subscribed_sports,
        subscription_term: form.subscription_term,
        subscription_start: form.subscription_start || undefined,
        subscription_end: form.subscription_end || undefined,
        status: form.status || "active",
        location_city: form.location_city.trim(),
        location_state: form.location_state.trim(),
        poc_name: form.poc_name.trim(),
        poc_role: form.poc_role,
        poc_email: form.poc_email.trim(),
        poc_phone: form.poc_phone.trim(),
      };

      const createdSchool = await base44.entities.School.create(schoolData);

      // Send POC invite immediately after school creation
      if (form.poc_email?.trim() && form.poc_name?.trim()) {
        try {
          await createPointOfContactInvite({ ...schoolData, id: createdSchool.id, school_code: schoolCode });
        } catch (inviteErr) {
          console.warn("POC invite failed (school was created):", inviteErr?.message);
        }
      }

      setMsg({ text: `School "${form.school_name}" created & invite sent to ${form.poc_email}.`, type: "success" });
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
      logo_url: school.logo_url || "",
      primary_color: school.primary_color || "#f97316",
      secondary_color: school.secondary_color || "",
      location_city: school.location_city || "",
      location_state: school.location_state || "",
      subscribed_sports: school.subscribed_sports || [],
      subscription_term: school.subscription_term || "annual",
      subscription_start: school.subscription_start || "",
      subscription_end: school.subscription_end || "",
      status: school.status || "active",
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

  const expirePendingInvitesForSchool = async (school) => {
    const pendingInvites = await base44.entities.Invite.filter({ team_id: school.team_id, status: "pending" }, "-created_date", 200);
    await Promise.all(pendingInvites.map(invite => base44.entities.Invite.update(invite.id, { status: "expired" })));
  };

  const updateSchoolStatus = async (school, nextStatus) => {
    setSchools(prev => prev.map(s => s.id === school.id ? { ...s, status: nextStatus } : s));
    try {
      await base44.entities.School.update(school.id, { status: nextStatus });
      if (nextStatus !== "active") {
        await expirePendingInvitesForSchool(school);
      }
      setMsg({ text: `${school.school_name} marked ${nextStatus}.`, type: "success" });
    } catch (err) {
      setSchools(prev => prev.map(s => s.id === school.id ? { ...s, status: school.status || "active" } : s));
      setMsg({ text: `Error: ${err.message}`, type: "error" });
    }
    setTimeout(() => setMsg({ text: "", type: "" }), 5000);
  };

  const deleteSchool = async (school) => {
    if (!window.confirm(`Delete "${school.school_name}"? This removes the school record but does NOT delete user accounts.`)) return;
    setDeletingId(school.id);
    await expirePendingInvitesForSchool(school);
    await base44.entities.School.delete(school.id);
    setSchools(prev => prev.filter(s => s.id !== school.id));
    setDeletingId(null);
    if (expandedId === school.id) setExpandedId(null);
  };

  const reinvitePointOfContact = async (school) => {
    if (!school.poc_email?.trim()) return;
    setReinvitingId(school.id);
    try {
      await createPointOfContactInvite(school);
      setMsg({ text: `Point of contact re-invited for ${school.school_name}.`, type: "success" });
    } catch (err) {
      setMsg({ text: `Error: ${err.message}`, type: "error" });
    }
    setReinvitingId(null);
    setTimeout(() => setMsg({ text: "", type: "" }), 5000);
  };

  const saveUserEdit = async (userId) => {
    setSavingUserId(userId);
    try {
      await base44.functions.invoke("updateTeamUser", { userId, data: editUserForm });
      setUsersData(prev => prev.map(u => u.id === userId ? { ...u, ...editUserForm } : u));
      setEditingUserId(null);
    } catch (err) {
      setMsg({ text: `Error updating user: ${err.message}`, type: "error" });
      setTimeout(() => setMsg({ text: "", type: "" }), 5000);
    }
    setSavingUserId(null);
  };

  const savePlayerEdit = async (playerId) => {
    setSavingPlayerId(playerId);
    try {
      await base44.entities.Player.update(playerId, editPlayerForm);
      setPlayersData(prev => prev.map(p => p.id === playerId ? { ...p, ...editPlayerForm } : p));
      setEditingPlayerId(null);
    } catch (err) {
      setPlayersDataError(`Error updating player: ${err.message}`);
      setTimeout(() => setPlayersDataError(""), 5000);
    }
    setSavingPlayerId(null);
  };

  // Only block on schools loading — user count/members are bonus info
  const loading = schoolsLoading;

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={SUITE_LOGO} alt="NxGenSports" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-black text-white">Nx<span style={{ color: "var(--color-primary,#f97316)" }}>GenSports</span></h1>
            <p className="text-gray-500 text-sm">{filteredSchools.length} school{filteredSchools.length !== 1 ? "s" : ""} registered</p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Super Admin color scheme */}
          <div className="flex items-center gap-2 bg-[#141414] border border-gray-800 rounded-xl px-3 py-2">
            <span className="text-gray-500 text-xs">Accent</span>
            <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
            <button onClick={saveAccentColor} disabled={savingColor}
              className="text-xs px-2 py-0.5 rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              {savingColor ? "..." : "Save"}
            </button>
          </div>
          {activeTab === "schools" && (
            <>
              <button onClick={() => { loadSchools(); onRefresh?.(); }} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => { setShowAddSchool(!showAddSchool); setEditingId(null); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                <Plus className="w-4 h-4" /> Add School
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-[#141414] border border-gray-800 rounded-xl p-1 w-fit flex-wrap">
        <button
          onClick={() => setActiveTab("schools")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "schools" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          style={activeTab === "schools" ? { backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" } : {}}
        >
          <Building2 className="w-4 h-4" /> Schools
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "users" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          style={activeTab === "users" ? { backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" } : {}}
        >
          <Users className="w-4 h-4" /> Users
        </button>
        <button
          onClick={() => setActiveTab("players")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "players" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          style={activeTab === "players" ? { backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" } : {}}
        >
          <User className="w-4 h-4" /> Players
        </button>
        <button
          onClick={() => setActiveTab("master_teams")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "master_teams" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          style={activeTab === "master_teams" ? { backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" } : {}}
        >
          <Shield className="w-4 h-4" /> Master Teams
        </button>
      </div>

      {/* Master Teams tab */}
      {activeTab === "master_teams" && (
        <MasterTeamsTab />
      )}

      {/* Schools tab */}
      {activeTab === "schools" && (
        <>
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
          onCancel={() => { setShowAddSchool(false); setForm(EMPTY_FORM); }}
          submitting={submitting}
          title="Add New School / Organization"
        />
      )}

      {/* Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={teamSearch} onChange={e => setTeamSearch(e.target.value)}
            placeholder="Search by name, ID, city, or state..."
            className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#141414] border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none md:w-52">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {schoolsError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{schoolsError}</div>
      )}

      {/* School List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
            Loading schools...
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <img src={SUITE_LOGO} alt="NxGenSports" className="w-10 h-10 mx-auto mb-2 opacity-20 rounded-lg" />
            <p className="text-sm">{teamSearch ? "No schools match your search." : "No schools yet. Add one above."}</p>
          </div>
        ) : filteredSchools.map(school => {
          const isExpanded = expandedId === school.id;
          const isEditing = editingId === school.id;
          const memberCount = memberCountByTeam[school.team_id] || 0;
          const members = membersByTeam[school.team_id] || [];
          const schoolStatus = school.status || "active";
          const statusMeta = SCHOOL_STATUS_META[schoolStatus] || SCHOOL_STATUS_META.active;

          return (
            <div key={school.id} className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
              {/* School row */}
              <div className="px-5 py-4 flex items-center gap-4">
                <button onClick={() => setExpandedId(isExpanded ? null : school.id)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                  {/* Logo or color swatch */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-700"
                    style={{ backgroundColor: school.primary_color ? school.primary_color + "33" : "#f9731622" }}>
                    <img src={SUITE_LOGO} alt="NxGenSports" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  {/* Color swatches */}
                  {(school.primary_color || school.secondary_color) && (
                    <div className="flex gap-1 flex-shrink-0">
                      {school.primary_color && <div className="w-3 h-10 rounded-full" style={{ backgroundColor: school.primary_color }} title={school.primary_color} />}
                      {school.secondary_color && <div className="w-3 h-10 rounded-full" style={{ backgroundColor: school.secondary_color }} title={school.secondary_color} />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{school.school_name}</p>
                      {school.mascot && <span className="text-gray-500 text-xs">· {school.mascot}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusMeta.badge}`}>{statusMeta.label}</span>
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
                      />
                    </div>
                  ) : (
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {schoolStatus !== "active" && (
                          <button onClick={() => updateSchoolStatus(school, "active")}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/15 text-green-400 hover:bg-green-500/20 transition-all">
                            Activate School
                          </button>
                        )}
                        {schoolStatus !== "suspended" && (
                          <button onClick={() => updateSchoolStatus(school, "suspended")}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/20 transition-all">
                            Suspend School
                          </button>
                        )}
                        {schoolStatus !== "deactivated" && (
                          <button onClick={() => updateSchoolStatus(school, "deactivated")}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/20 transition-all">
                            Deactivate School
                          </button>
                        )}
                        <button onClick={() => deleteSchool(school)} disabled={deletingId === school.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all disabled:opacity-40">
                          Delete School
                        </button>
                        <button onClick={() => setAddingUserId(addingUserId === school.id ? null : school.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" />
                          {addingUserId === school.id ? "Cancel" : "Add User"}
                        </button>
                      </div>

                      {/* Add User Form */}
                      {addingUserId === school.id && (
                        <InviteForm
                          user={{
                            team_id: school.team_id,
                            school_id: school.id,
                            school_name: school.school_name,
                            school_code: school.school_code,
                            assigned_sports: school.subscribed_sports || [],
                          }}
                          onClose={() => setAddingUserId(null)}
                          onInvited={() => { loadSchools(); onRefresh?.(); }}
                        />
                      )}

                      {/* POC */}
                      {(school.poc_name || school.poc_email) && (
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Point of Contact</p>
                            <button onClick={() => reinvitePointOfContact(school)} disabled={reinvitingId === school.id || !school.poc_email?.trim()}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-40">
                              {reinvitingId === school.id ? "Sending..." : "Reinvite POC"}
                            </button>
                          </div>
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
        </>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none" />
            </div>
            <button onClick={loadUsersData} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {usersDataError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{usersDataError}</div>}

          {usersDataLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-6 h-6 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
              Loading users...
            </div>
          ) : (
            <div className="space-y-2">
              {usersData
                .filter(u => {
                  const q = userSearch.toLowerCase();
                  return !q || (u.full_name || "").toLowerCase().includes(q) ||
                    (u.email || "").toLowerCase().includes(q) ||
                    (u.team_id || "").toLowerCase().includes(q) ||
                    (u.school_name || "").toLowerCase().includes(q);
                })
                .map(u => {
                  const isEditing = editingUserId === u.id;
                  return (
                    <div key={u.id} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" }}>
                          {(u.full_name || u.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{u.full_name || "—"}</p>
                          <p className="text-gray-500 text-xs">{u.email}</p>
                          {u.school_name && <p className="text-gray-600 text-xs">{u.school_name} · <span className="font-mono">{u.team_id}</span></p>}
                        </div>
                        <span className="text-xs text-gray-500 capitalize bg-gray-800 px-2 py-0.5 rounded hidden md:block">
                          {u.coaching_role?.replace(/_/g, " ") || u.role}
                        </span>
                        <button onClick={() => {
                          if (isEditing) { setEditingUserId(null); return; }
                          setEditingUserId(u.id);
                          setEditUserForm({
                            school_id: u.school_id || "",
                            team_id: u.team_id || "",
                            school_name: u.school_name || "",
                            school_code: u.school_code || "",
                            assigned_sports: u.assigned_sports || [],
                          });
                        }}
                          className={`p-2 rounded-lg transition-all ${isEditing ? "text-white bg-gray-700" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {isEditing && (
                        <div className="border-t border-gray-800 p-4 space-y-3">
                          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Reassign School / Team</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">School Name</label>
                              <input value={editUserForm.school_name} onChange={e => setEditUserForm(p => ({ ...p, school_name: e.target.value }))}
                                placeholder="School name" className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                            </div>
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">Team ID</label>
                              <input value={editUserForm.team_id} onChange={e => setEditUserForm(p => ({ ...p, team_id: e.target.value }))}
                                placeholder="team_id" className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none font-mono" />
                            </div>
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">School ID</label>
                              <input value={editUserForm.school_id} onChange={e => setEditUserForm(p => ({ ...p, school_id: e.target.value }))}
                                placeholder="school_id" className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none font-mono" />
                            </div>
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">School Code</label>
                              <input value={editUserForm.school_code} onChange={e => setEditUserForm(p => ({ ...p, school_code: e.target.value }))}
                                placeholder="e.g. XABCD5" className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none font-mono" />
                            </div>
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs mb-2 block">Assigned Sports</label>
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_SPORTS.map(s => (
                                <button key={s} onClick={() => setEditUserForm(p => ({
                                  ...p,
                                  assigned_sports: p.assigned_sports.includes(s)
                                    ? p.assigned_sports.filter(x => x !== s)
                                    : [...p.assigned_sports, s]
                                }))}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${editUserForm.assigned_sports?.includes(s) ? "text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"}`}
                                  style={editUserForm.assigned_sports?.includes(s) ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
                                  {SPORT_LABELS[s] || s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveUserEdit(u.id)} disabled={savingUserId === u.id}
                              className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                              style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                              {savingUserId === u.id ? "Saving..." : "Save Changes"}
                            </button>
                            <button onClick={() => setEditingUserId(null)} className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              {usersData.length === 0 && !usersDataLoading && (
                <p className="text-center text-gray-600 py-8 text-sm">No users found.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Players tab */}
      {activeTab === "players" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" value={playerSearch} onChange={e => setPlayerSearch(e.target.value)}
                placeholder="Search players..."
                className="w-full bg-[#141414] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none" />
            </div>
            <button onClick={loadPlayersData} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {playersDataError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{playersDataError}</div>}

          {playersDataLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-6 h-6 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
              Loading players...
            </div>
          ) : (
            <div className="space-y-2">
              {playersData
                .filter(p => {
                  const q = playerSearch.toLowerCase();
                  return !q || (`${p.first_name || ""} ${p.last_name || ""}`).toLowerCase().includes(q) ||
                    (p.team_id || "").toLowerCase().includes(q) ||
                    (p.school_id || "").toLowerCase().includes(q) ||
                    (p.position || "").toLowerCase().includes(q);
                })
                .map(p => {
                  const isEditing = editingPlayerId === p.id;
                  const playerName = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unnamed Player";
                  return (
                    <div key={p.id} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" }}>
                          {playerName[0]?.toUpperCase() || "P"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{playerName}</p>
                          <p className="text-gray-500 text-xs">
                            {p.position && <span className="mr-2">{p.position}</span>}
                            {p.sport && <span>{SPORT_LABELS[p.sport] || p.sport}</span>}
                          </p>
                          {p.team_id && <p className="text-gray-600 text-xs font-mono">{p.team_id}</p>}
                        </div>
                        <button onClick={() => {
                          if (isEditing) { setEditingPlayerId(null); return; }
                          setEditingPlayerId(p.id);
                          setEditPlayerForm({
                            first_name: p.first_name || "",
                            last_name: p.last_name || "",
                            school_id: p.school_id || "",
                            team_id: p.team_id || "",
                            sport: p.sport || "",
                            position: p.position || "",
                          });
                        }}
                          className={`p-2 rounded-lg transition-all ${isEditing ? "text-white bg-gray-700" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {isEditing && (
                        <div className="border-t border-gray-800 p-4 space-y-3">
                          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Edit Player</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">First Name</label>
                              <input value={editPlayerForm.first_name} onChange={e => setEditPlayerForm(p => ({ ...p, first_name: e.target.value }))}
                                placeholder="First name" className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                            </div>
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">Last Name</label>
                              <input value={editPlayerForm.last_name} onChange={e => setEditPlayerForm(p => ({ ...p, last_name: e.target.value }))}
                                placeholder="Last name" className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                            </div>
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">Team ID</label>
                              <input value={editPlayerForm.team_id} onChange={e => setEditPlayerForm(p => ({ ...p, team_id: e.target.value }))}
                                placeholder="team_id" className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none font-mono" />
                            </div>
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">School ID</label>
                              <input value={editPlayerForm.school_id} onChange={e => setEditPlayerForm(p => ({ ...p, school_id: e.target.value }))}
                                placeholder="school_id" className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none font-mono" />
                            </div>
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">Sport</label>
                              <select value={editPlayerForm.sport} onChange={e => setEditPlayerForm(p => ({ ...p, sport: e.target.value }))}
                                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none">
                                <option value="">— select sport —</option>
                                {ALL_SPORTS.map(s => <option key={s} value={s}>{SPORT_LABELS[s] || s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">Position</label>
                              <input value={editPlayerForm.position} onChange={e => setEditPlayerForm(p => ({ ...p, position: e.target.value }))}
                                placeholder="e.g. QB, WR" className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => savePlayerEdit(p.id)} disabled={savingPlayerId === p.id}
                              className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                              style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                              {savingPlayerId === p.id ? "Saving..." : "Save Changes"}
                            </button>
                            <button onClick={() => setEditingPlayerId(null)} className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              {playersData.length === 0 && !playersDataLoading && (
                <p className="text-center text-gray-600 py-8 text-sm">No players found.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable school form (add + edit) ──────────────────────────────────────
function SchoolForm({ form, setForm, onToggleSport, onSubmit, onCancel, submitting, title, submitLabel = "Create School" }) {
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
          <Field label="Logo URL">
            <input value={form.logo_url || ""} onChange={f("logo_url")} placeholder="https://... (team logo image URL)" className="field-input" />
          </Field>
          <Field label="Primary Color">
            <div className="flex items-center gap-2">
              <input type="color" value={form.primary_color || "#f97316"} onChange={f("primary_color")}
                className="w-10 h-10 rounded-lg border border-gray-700 bg-transparent cursor-pointer" />
              <input value={form.primary_color || ""} onChange={f("primary_color")} placeholder="#f97316" className="field-input flex-1" />
            </div>
          </Field>
          <Field label="Secondary Color">
            <div className="flex items-center gap-2">
              <input type="color" value={form.secondary_color || "#ffffff"} onChange={f("secondary_color")}
                className="w-10 h-10 rounded-lg border border-gray-700 bg-transparent cursor-pointer" />
              <input value={form.secondary_color || ""} onChange={f("secondary_color")} placeholder="#ffffff (optional)" className="field-input flex-1" />
            </div>
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
          <Field label="School Status">
            <select value={form.status || "active"} onChange={f("status")} className="field-input">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
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