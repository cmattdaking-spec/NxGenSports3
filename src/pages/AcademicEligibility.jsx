import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { GraduationCap, CheckCircle, XCircle, Search } from "lucide-react";

export default function AcademicEligibility() {
  const [players, setPlayers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState({});

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Player.list().then(p => { setPlayers(p); setLoading(false); });
  }, []);

  const canEdit = user?.role === "athletic_director" || user?.role === "admin" || user?.role === "head_coach";

  const toggleEligibility = async (player) => {
    if (!canEdit) return;
    setSaving(prev => ({ ...prev, [player.id]: true }));
    const updated = await base44.entities.Player.update(player.id, {
      academic_eligible: !player.academic_eligible,
    });
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, academic_eligible: !p.academic_eligible } : p));
    setSaving(prev => ({ ...prev, [player.id]: false }));
  };

  const filtered = players.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) || p.position?.toLowerCase().includes(search.toLowerCase());
  });

  const eligible = filtered.filter(p => p.academic_eligible !== false);
  const ineligible = filtered.filter(p => p.academic_eligible === false);

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-primary,#3b82f6)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#3b82f6)22" }}>
            <GraduationCap className="w-5 h-5" style={{ color: "var(--color-primary,#3b82f6)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Academic Eligibility</h1>
            <p className="text-gray-500 text-sm">
              <span className="text-green-400">{eligible.length} eligible</span>
              {" · "}
              <span className="text-red-400">{ineligible.length} ineligible</span>
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search players..."
            className="bg-[#141414] border border-gray-800 text-white pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
          />
        </div>
      </div>

      {!canEdit && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
          View only — only Athletic Director or Head Coach can change eligibility status.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#141414] border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-3xl font-black text-white">{eligible.length}</p>
            <p className="text-green-400 text-sm">Eligible</p>
          </div>
        </div>
        <div className="bg-[#141414] border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
          <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-3xl font-black text-white">{ineligible.length}</p>
            <p className="text-red-400 text-sm">Ineligible</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">#</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Player</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Position</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Year</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">GPA</th>
                <th className="text-center text-gray-500 text-xs font-medium px-4 py-3">Eligibility</th>
                {canEdit && <th className="px-4 py-3 text-gray-500 text-xs font-medium text-center">Toggle</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-10">No players found</td></tr>
              ) : filtered.map(p => {
                const isEligible = p.academic_eligible !== false;
                return (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-sm font-mono">#{p.number || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "var(--color-primary,#3b82f6)55" }}>
                          {p.first_name?.[0]}{p.last_name?.[0]}
                        </div>
                        <p className="text-white text-sm font-medium">{p.first_name} {p.last_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm font-mono">{p.position}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{p.year || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{p.gpa ? p.gpa.toFixed(2) : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {isEligible ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Ineligible
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleEligibility(p)}
                          disabled={saving[p.id]}
                          className={`relative w-11 h-6 rounded-full transition-all duration-300 ${isEligible ? "bg-green-500" : "bg-gray-700"} disabled:opacity-50`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${isEligible ? "left-5" : "left-0.5"}`} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}