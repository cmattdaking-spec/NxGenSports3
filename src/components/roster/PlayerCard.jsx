import { Mail, Phone, ChevronDown, ChevronUp, Edit, Trash2, GraduationCap, Dumbbell, Star } from "lucide-react";

const statusColor = { active: "bg-green-500/20 text-green-400", injured: "bg-red-500/20 text-red-400", suspended: "bg-yellow-500/20 text-yellow-400", inactive: "bg-gray-500/20 text-gray-400" };
const unitColor = { offense: "bg-blue-500/20 text-blue-400", defense: "bg-red-500/20 text-red-400", special_teams: "bg-purple-500/20 text-purple-400" };

function Metric({ label, value, unit = "" }) {
  if (!value && value !== 0) return null;
  return (
    <div className="bg-[#1a1a1a] rounded-lg p-2.5 text-center">
      <p className="text-white text-sm font-bold">{value}{unit}</p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}

function RatingBar({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500 text-xs w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: "var(--color-primary,#f97316)" }} />
      </div>
      <span className="text-gray-400 text-xs w-6 text-right">{value}</span>
    </div>
  );
}

export default function PlayerCard({ player: p, expanded, onToggle, onEdit, onDelete, canEdit }) {
  const displayRole = p.coaching_role || p.role;
  const hasAcademic = p.gpa || p.sat_score || p.act_score;
  const hasAthletic = p.forty_time || p.bench_reps || p.vertical_jump || p.broad_jump || p.three_cone || p.shuttle_time;
  const hasRatings = p.speed || p.strength || p.agility || p.football_iq;
  const hasContact = p.contact_email || p.contact_phone || p.parent_name;

  return (
    <div className={`bg-[#141414] border rounded-xl overflow-hidden transition-all ${expanded ? "border-[var(--color-primary,#f97316)]/30" : "border-gray-800"}`}>
      {/* Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          {p.first_name?.[0]}{p.last_name?.[0]}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{p.first_name} {p.last_name}</p>
            <span className="text-gray-600 text-xs font-mono">#{p.number || "—"}</span>
            {p.academic_eligible === false && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">Ineligible</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-xs font-mono font-bold" style={{ color: "var(--color-primary,#f97316)" }}>{p.position}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${unitColor[p.unit] || "bg-gray-500/20 text-gray-400"}`}>{p.unit?.replace("_"," ")}</span>
            {p.year && <span className="text-gray-500 text-xs">{p.year}</span>}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor[p.status]}`}>{p.status}</span>
          </div>
        </div>

        {/* Rating + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {p.overall_rating ? (
            <div className="hidden md:flex items-center gap-1.5">
              <div className="w-14 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${p.overall_rating}%`, backgroundColor: "var(--color-primary,#f97316)" }} />
              </div>
              <span className="text-gray-400 text-xs">{p.overall_rating}</span>
            </div>
          ) : null}
          {p.gpa ? <span className="hidden md:block text-xs bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded">GPA {p.gpa.toFixed(2)}</span> : null}
          {canEdit && <button onClick={() => onEdit(p)} className="text-gray-500 hover:text-blue-400 p-1 transition-colors"><Edit className="w-3.5 h-3.5" /></button>}
          {canEdit && <button onClick={() => onDelete(p.id)} className="text-gray-500 hover:text-red-400 p-1 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
          <button onClick={onToggle} className="text-gray-500 hover:text-white p-1 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Academic */}
            {hasAcademic && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                  <p className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">Academic</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Metric label="GPA" value={p.gpa?.toFixed(2)} />
                  <Metric label="SAT" value={p.sat_score} />
                  <Metric label="ACT" value={p.act_score} />
                </div>
                {p.graduation_year && <p className="text-gray-500 text-xs">Grad Year: <span className="text-gray-300">{p.graduation_year}</span></p>}
                <div className={`text-xs px-2 py-1 rounded-lg inline-block ${p.academic_eligible !== false ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                  {p.academic_eligible !== false ? "✓ Academically Eligible" : "✗ Ineligible"}
                </div>
              </div>
            )}

            {/* Athletic Metrics */}
            {hasAthletic && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="w-3.5 h-3.5 text-orange-400" />
                  <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Measurables</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="40-Yard" value={p.forty_time} unit="s" />
                  <Metric label="Bench Reps" value={p.bench_reps} />
                  <Metric label="Vertical" value={p.vertical_jump} unit='"' />
                  <Metric label="Broad Jump" value={p.broad_jump} unit='"' />
                  <Metric label="3-Cone" value={p.three_cone} unit="s" />
                  <Metric label="Shuttle" value={p.shuttle_time} unit="s" />
                </div>
              </div>
            )}

            {/* Ratings + Contact */}
            <div className="space-y-3">
              {hasRatings && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-3.5 h-3.5 text-yellow-400" />
                    <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">Ratings</p>
                  </div>
                  <div className="space-y-1.5">
                    <RatingBar label="Speed" value={p.speed} />
                    <RatingBar label="Strength" value={p.strength} />
                    <RatingBar label="Agility" value={p.agility} />
                    <RatingBar label="Football IQ" value={p.football_iq} />
                  </div>
                </>
              )}
              {hasContact && (
                <div className="space-y-1.5 mt-3">
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Contact</p>
                  {p.contact_email && <p className="text-gray-300 text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {p.contact_email}</p>}
                  {p.contact_phone && <p className="text-gray-300 text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {p.contact_phone}</p>}
                  {p.parent_name && <p className="text-gray-500 text-xs mt-1">Parent: <span className="text-gray-300">{p.parent_name}</span> {p.parent_phone && `· ${p.parent_phone}`}</p>}
                </div>
              )}
            </div>
          </div>

          {p.notes && (
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Notes</p>
              <p className="text-gray-300 text-sm">{p.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}