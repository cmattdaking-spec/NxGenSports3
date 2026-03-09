import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { GraduationCap, CheckCircle, XCircle, Search, FileText, ClipboardCheck, AlertCircle } from "lucide-react";

const ELIGIBILITY_EDIT = ["athletic_director", "admin", "head_coach"];
const DOCS_EDIT = ["athletic_director", "admin", "head_coach"];

export default function AcademicEligibility() {
  const [players, setPlayers] = useState([]);
  const [docs, setDocs] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState({});
  const [tab, setTab] = useState("eligibility");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    Promise.all([
      base44.entities.Player.list(),
      base44.entities.PlayerDocument.list()
    ]).then(([p, d]) => { setPlayers(p); setDocs(d); setLoading(false); });
  }, []);

  const canEditEligibility = ELIGIBILITY_EDIT.includes(user?.coaching_role) || user?.role === "admin";
  const canEditDocs = DOCS_EDIT.includes(user?.coaching_role) || user?.role === "admin";

  // Granular permission gate
  const ALWAYS_ACADEMIC = ["head_coach","associate_head_coach","athletic_director"];
  const hasAcademicAccess = user && (ALWAYS_ACADEMIC.includes(user.coaching_role) || user.can_view_academic === true || user.role === "admin");

  if (user && !hasAcademicAccess) return (
    <div className="bg-[#0a0a0a] min-h-full flex items-center justify-center">
      <div className="text-center">
        <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-700" />
        <p className="text-white font-semibold">Access Restricted</p>
        <p className="text-gray-500 text-sm mt-1">Academic data access must be granted by your Head Coach or Athletic Director.</p>
      </div>
    </div>
  );

  const getDoc = (playerId) => docs.find(d => d.player_id === playerId);

  const toggleEligibility = async (player) => {
    if (!canEditEligibility) return;
    setSaving(prev => ({ ...prev, [player.id]: true }));
    await base44.entities.Player.update(player.id, { academic_eligible: !player.academic_eligible });
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, academic_eligible: !p.academic_eligible } : p));
    setSaving(prev => ({ ...prev, [player.id]: false }));
  };

  const toggleDocField = async (player, field, value) => {
    if (!canEditDocs) return;
    const existing = getDoc(player.id);
    setSaving(prev => ({ ...prev, [`${player.id}_${field}`]: true }));
    const data = { player_id: player.id, player_name: `${player.first_name} ${player.last_name}`, [field]: value };
    if (existing) {
      await base44.entities.PlayerDocument.update(existing.id, data);
      setDocs(prev => prev.map(d => d.id === existing.id ? { ...d, ...data } : d));
    } else {
      const created = await base44.entities.PlayerDocument.create(data);
      setDocs(prev => [...prev, created]);
    }
    setSaving(prev => ({ ...prev, [`${player.id}_${field}`]: false }));
  };

  const filtered = players.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) || p.position?.toLowerCase().includes(search.toLowerCase());
  });

  const eligible = filtered.filter(p => p.academic_eligible !== false);
  const ineligible = filtered.filter(p => p.academic_eligible === false);

  const physicalMissing = players.filter(p => !getDoc(p.id)?.physical_on_file).length;
  const waiverMissing = players.filter(p => !getDoc(p.id)?.waiver_signed).length;

  if (loading) return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-50">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 border-2 border-gray-800 border-t-[var(--color-primary,#f97316)] rounded-full animate-spin absolute" />
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8dea6f5ebfce20bad2a8c/871a00698_image_aaa46895.png" alt="NxDown" className="w-8 h-8 rounded-lg object-cover" />
      </div>
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6">
      {/* Header */}
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
              {" · "}
              <span className="text-yellow-400">{physicalMissing} physicals missing</span>
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players..."
            className="bg-[#141414] border border-gray-800 text-white pl-9 pr-4 py-2 rounded-xl text-sm outline-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#141414] border border-gray-800 rounded-lg p-1 w-fit">
        {[
          { id: "eligibility", label: "Eligibility", icon: GraduationCap },
          { id: "physical", label: "Physicals", icon: ClipboardCheck },
          { id: "waiver", label: "Waivers", icon: FileText }
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === id ? "text-white" : "text-gray-400 hover:text-white"}`}
            style={tab === id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Permission banner */}
      {!canEditEligibility && tab === "eligibility" && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
          View only — only Athletic Director or Head Coach can change eligibility status.
        </div>
      )}
      {!canEditDocs && (tab === "physical" || tab === "waiver") && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
          View only — only Athletic Director or Head Coach can update physical/waiver status.
        </div>
      )}

      {/* Eligibility Tab */}
      {tab === "eligibility" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141414] border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
              <div><p className="text-3xl font-black text-white">{eligible.length}</p><p className="text-green-400 text-sm">Eligible</p></div>
            </div>
            <div className="bg-[#141414] border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div><p className="text-3xl font-black text-white">{ineligible.length}</p><p className="text-red-400 text-sm">Ineligible</p></div>
            </div>
          </div>
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
                    {canEditEligibility && <th className="px-4 py-3 text-gray-500 text-xs font-medium text-center">Toggle</th>}
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
                        {canEditEligibility && (
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => toggleEligibility(p)} disabled={saving[p.id]}
                              className={`relative w-11 h-6 rounded-full transition-all duration-300 ${isEligible ? "bg-green-500" : "bg-gray-700"} disabled:opacity-50`}>
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
        </>
      )}

      {/* Physical Tab */}
      {tab === "physical" && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="bg-[#141414] border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
              <div><p className="text-3xl font-black text-white">{players.length - physicalMissing}</p><p className="text-green-400 text-sm">Physical On File</p></div>
            </div>
            <div className="bg-[#141414] border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div><p className="text-3xl font-black text-white">{physicalMissing}</p><p className="text-red-400 text-sm">Missing Physical</p></div>
            </div>
          </div>
          <div className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Player</th>
                    <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Position</th>
                    <th className="text-center text-gray-500 text-xs font-medium px-4 py-3">Physical On File</th>
                    <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Physical Date</th>
                    <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Expiry</th>
                    {canEditDocs && <th className="px-4 py-3 text-gray-500 text-xs font-medium text-center">Toggle</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const doc = getDoc(p.id);
                    const hasPhysical = doc?.physical_on_file || false;
                    return (
                      <tr key={p.id} className="border-b border-gray-800/50 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: hasPhysical ? "#16a34a55" : "#dc262655" }}>
                              {p.first_name?.[0]}{p.last_name?.[0]}
                            </div>
                            <p className="text-white text-sm font-medium">{p.first_name} {p.last_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm font-mono">{p.position}</td>
                        <td className="px-4 py-3 text-center">
                          {hasPhysical ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" /> On File
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" /> Missing
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{doc?.physical_date || "—"}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{doc?.physical_expiry || "—"}</td>
                        {canEditDocs && (
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => toggleDocField(p, "physical_on_file", !hasPhysical)}
                              disabled={saving[`${p.id}_physical_on_file`]}
                              className={`relative w-11 h-6 rounded-full transition-all duration-300 ${hasPhysical ? "bg-green-500" : "bg-gray-700"} disabled:opacity-50`}>
                              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${hasPhysical ? "left-5" : "left-0.5"}`} />
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
        </>
      )}

      {/* Waiver Tab */}
      {tab === "waiver" && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="bg-[#141414] border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
              <div><p className="text-3xl font-black text-white">{players.length - waiverMissing}</p><p className="text-green-400 text-sm">Waiver Signed</p></div>
            </div>
            <div className="bg-[#141414] border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div><p className="text-3xl font-black text-white">{waiverMissing}</p><p className="text-red-400 text-sm">Missing Waiver</p></div>
            </div>
          </div>
          <div className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Player</th>
                    <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Position</th>
                    <th className="text-center text-gray-500 text-xs font-medium px-4 py-3">Waiver Signed</th>
                    <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Date Signed</th>
                    {canEditDocs && <th className="px-4 py-3 text-gray-500 text-xs font-medium text-center">Toggle</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const doc = getDoc(p.id);
                    const hasSigned = doc?.waiver_signed || false;
                    return (
                      <tr key={p.id} className="border-b border-gray-800/50 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: hasSigned ? "#16a34a55" : "#dc262655" }}>
                              {p.first_name?.[0]}{p.last_name?.[0]}
                            </div>
                            <p className="text-white text-sm font-medium">{p.first_name} {p.last_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm font-mono">{p.position}</td>
                        <td className="px-4 py-3 text-center">
                          {hasSigned ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" /> Signed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" /> Missing
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{doc?.waiver_date || "—"}</td>
                        {canEditDocs && (
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => toggleDocField(p, "waiver_signed", !hasSigned)}
                              disabled={saving[`${p.id}_waiver_signed`]}
                              className={`relative w-11 h-6 rounded-full transition-all duration-300 ${hasSigned ? "bg-green-500" : "bg-gray-700"} disabled:opacity-50`}>
                              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${hasSigned ? "left-5" : "left-0.5"}`} />
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
        </>
      )}
    </div>
  );
}