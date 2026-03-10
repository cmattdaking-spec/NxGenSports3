import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { getSportConfig } from "@/components/SportConfig";
import { UserPlus, X, Building2, AlertTriangle } from "lucide-react";

const DEFAULT_STAFF_ROLES = [
  { value: "head_coach", label: "Head Coach" },
  { value: "associate_head_coach", label: "Associate Head Coach" },
  { value: "offensive_coordinator", label: "Offensive Coordinator" },
  { value: "defensive_coordinator", label: "Defensive Coordinator" },
  { value: "special_teams_coordinator", label: "Special Teams Coordinator" },
  { value: "strength_conditioning_coordinator", label: "Strength & Conditioning Coordinator" },
  { value: "position_coach", label: "Position Coach" },
  { value: "trainer", label: "Trainer" },
];
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

export default function InviteForm({ user, onClose, onInvited }) {
  const [inviteType, setInviteType] = useState("staff");
  const defaultSport = user?.assigned_sports?.[0] || "football";
  const sportCfg = useMemo(() => getSportConfig(defaultSport), [defaultSport]);
  const STAFF_ROLES = sportCfg.staffRoles || DEFAULT_STAFF_ROLES;
  const ALL_POSITIONS = Object.values(sportCfg.positions).flat().filter((v, i, a) => a.indexOf(v) === i);
  const PHASES = sportCfg.units.map(u => ({ value: u, label: sportCfg.unitLabels[u] || u.replace(/_/g, " ") }));

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    coaching_role: STAFF_ROLES[0]?.value || "head_coach",
    positions: [],
    phases: [],
    sports: user?.assigned_sports?.length ? [...user.assigned_sports] : [defaultSport],
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Only show sports this school subscribes to
  const availableSports = user?.assigned_sports?.length ? user.assigned_sports : Object.keys(SPORT_LABELS);
  const showPositions = ["position_coach", "offensive_coordinator", "defensive_coordinator"].includes(form.coaching_role);

  const handleInvite = async () => {
    if (!form.email.trim()) return;
    setSubmitting(true);
    setMsg({ text: "", type: "" });
    try {
      const response = await base44.functions.invoke("sendInvite", {
        email: form.email.trim(),
        team_id: user?.team_id,
        school_name: user?.school_name,
        school_code: user?.school_code,
        coaching_role: form.coaching_role,
        assigned_positions: form.positions,
        assigned_phases: form.phases,
        assigned_sports: form.sports,
        invite_type: inviteType,
        poc_name: form.full_name.trim(),
      });
      if (response.data?.error) throw new Error(response.data.error);
      setMsg({ text: `Invitation sent to ${form.email}`, type: "success" });
      onInvited?.();
      setTimeout(() => { setMsg({ text: "", type: "" }); onClose(); }, 2500);
    } catch (err) {
      setMsg({ text: `Error: ${err.message}`, type: "error" });
    }
    setSubmitting(false);
  };

  const togglePos = (pos) => setForm(p => ({ ...p, positions: p.positions.includes(pos) ? p.positions.filter(x => x !== pos) : [...p.positions, pos] }));
  const togglePhase = (ph) => setForm(p => ({ ...p, phases: p.phases.includes(ph) ? p.phases.filter(x => x !== ph) : [...p.phases, ph] }));
  const toggleSport = (s) => setForm(p => ({ ...p, sports: p.sports.includes(s) ? p.sports.filter(x => x !== s) : [...p.sports, s] }));

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} />
          Send Invitation
        </h3>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300"><X className="w-4 h-4" /></button>
      </div>

      {/* School context */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap">
        <Building2 className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-gray-400 text-xs">Inviting to:</span>
        <span className="text-white text-xs font-semibold">{user?.school_name || "Your School"}</span>
        {user?.school_code && (
          <span className="text-cyan-400 text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full ml-1">
            {user.school_code}
          </span>
        )}
      </div>

      {/* Invite type */}
      <div className="flex gap-2">
        {[{ id: "staff", label: "Staff Member" }, { id: "player", label: "Player" }].map(t => (
          <button key={t.id} onClick={() => setInviteType(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${inviteType === t.id ? "text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            style={inviteType === t.id ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Full Name <span className="text-gray-600">(optional)</span></label>
          <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
            placeholder="Name"
            className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none" />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Email Address <span className="text-red-400">*</span></label>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleInvite()}
            placeholder="email@school.edu"
            className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none" />
        </div>
        {inviteType === "staff" && (
          <div className="md:col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">Coaching Role <span className="text-red-400">*</span></label>
            <select value={form.coaching_role} onChange={e => setForm(p => ({ ...p, coaching_role: e.target.value, positions: [], phases: [] }))}
              className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
              {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Sports */}
      <div>
        <label className="text-gray-400 text-xs mb-2 block">Assigned Sport(s) <span className="text-red-400">*</span></label>
        <div className="flex flex-wrap gap-1.5">
          {availableSports.map(s => (
            <button key={s} onClick={() => toggleSport(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${form.sports.includes(s) ? "text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"}`}
              style={form.sports.includes(s) ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
              {SPORT_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Positions (staff only) */}
      {inviteType === "staff" && showPositions && (
        <div>
          <label className="text-gray-400 text-xs mb-2 block">Assigned Positions <span className="text-gray-600">(optional)</span></label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_POSITIONS.map(pos => (
              <button key={pos} onClick={() => togglePos(pos)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${form.positions.includes(pos) ? "text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"}`}
                style={form.positions.includes(pos) ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Phases (staff only) */}
      {inviteType === "staff" && (
        <div>
          <label className="text-gray-400 text-xs mb-2 block">Phases of Game <span className="text-gray-600">(optional)</span></label>
          <div className="flex gap-2">
            {PHASES.map(ph => (
              <button key={ph.value} onClick={() => togglePhase(ph.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${form.phases.includes(ph.value) ? "text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"}`}
                style={form.phases.includes(ph.value) ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                {ph.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-yellow-300 text-xs">
          The recipient will receive an email invitation to join <strong>{user?.school_name || "your school"}</strong> and will be prompted to set up their account.
        </p>
      </div>

      {msg.text && (
        <p className={`text-sm ${msg.type === "success" ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
      )}

      <div className="flex gap-2">
        <button onClick={handleInvite} disabled={submitting || !form.email.trim() || form.sports.length === 0}
          className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
          style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
          {submitting ? "Sending..." : "Send Invitation"}
        </button>
        <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}