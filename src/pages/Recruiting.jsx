import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Star, Plus, Edit, Trash2, X, Upload, Video, ExternalLink,
  Trophy, Zap, User, Search, Filter, Share2, CheckCircle, AlertCircle
} from "lucide-react";

const STATUS_CFG = {
  available: { label: "Available", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  committed: { label: "Committed", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  signed: { label: "Signed", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  not_recruiting: { label: "Not Recruiting", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const POSITIONS = ["QB","RB","FB","WR","TE","LT","LG","C","RG","RT","DE","DT","NT","OLB","MLB","ILB","CB","SS","FS","K","P","LS"];

const STAT_FIELDS = [
  { key: "passing_yards", label: "Pass Yds" },
  { key: "rushing_yards", label: "Rush Yds" },
  { key: "receiving_yards", label: "Rec Yds" },
  { key: "touchdowns", label: "TDs" },
  { key: "tackles", label: "Tackles" },
  { key: "sacks", label: "Sacks" },
  { key: "forty_time", label: "40 Dash" },
  { key: "bench_reps", label: "Bench Reps" },
  { key: "vertical", label: "Vertical (in)" },
];

export default function Recruiting() {
  const [profiles, setProfiles] = useState([]);
  const [players, setPlayers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPos, setFilterPos] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [tab, setTab] = useState("board");
  const [viewProfile, setViewProfile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAward, setNewAward] = useState("");

  const canEdit = user && ["admin","head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator","position_coach"].includes(user.role);

  useEffect(() => {
    Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.RecruitProfile.list("-created_date"),
      base44.entities.Player.list(),
    ]).then(([u, p, pl]) => {
      setUser(u); setProfiles(p); setPlayers(pl); setLoading(false);
    });
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ recruiting_status: "available", is_public: true, awards: [], offers: [] });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...p });
    setShowForm(true);
  };

  const handlePlayerSelect = (playerId) => {
    const pl = players.find(p => p.id === playerId);
    if (pl) setForm(f => ({
      ...f,
      player_id: playerId,
      first_name: pl.first_name,
      last_name: pl.last_name,
      position: pl.position,
      year: pl.year,
      height: pl.height,
      weight: pl.weight,
      gpa: pl.gpa,
      hometown: pl.hometown,
      photo_url: pl.photo_url,
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photo_url: file_url }));
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    if (editing) await base44.entities.RecruitProfile.update(editing.id, form);
    else await base44.entities.RecruitProfile.create(form);
    const updated = await base44.entities.RecruitProfile.list("-created_date");
    setProfiles(updated);
    setShowForm(false);
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm("Delete recruiting profile?")) return;
    await base44.entities.RecruitProfile.delete(id);
    setProfiles(p => p.filter(x => x.id !== id));
  };

  const addAward = () => {
    if (!newAward.trim()) return;
    setForm(f => ({ ...f, awards: [...(f.awards || []), newAward.trim()] }));
    setNewAward("");
  };

  const filtered = profiles.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || p.position?.toLowerCase().includes(search.toLowerCase());
    const matchPos = filterPos === "all" || p.position === filterPos;
    const matchStatus = filterStatus === "all" || p.recruiting_status === filterStatus;
    return matchSearch && matchPos && matchStatus;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <div className="w-8 h-8 border-2 border-[var(--color-primary,#f97316)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] min-h-full">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 md:px-8 py-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-white">Nx<span style={{ color: "var(--color-primary,#f97316)" }}>Recruit</span></h1>
            <p className="text-gray-500 text-sm mt-1">Athlete recruiting profiles · {profiles.length} profiles</p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                <Plus className="w-4 h-4" /> Add Profile
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-[#141414] border border-gray-800 rounded-lg p-1 w-fit">
          {[{ id: "board", label: "Recruit Board" }, { id: "stats", label: "Stats Comparison" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t.id ? "text-white" : "text-gray-400 hover:text-white"}`}
              style={tab === t.id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players..."
              className="w-full bg-[#141414] border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm outline-none" />
          </div>
          <select value={filterPos} onChange={e => setFilterPos(e.target.value)}
            className="bg-[#141414] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none">
            <option value="all">All Positions</option>
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#141414] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none">
            <option value="all">All Status</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {tab === "board" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-600">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="font-semibold text-gray-500">No recruiting profiles yet</p>
                {canEdit && <p className="text-sm mt-1">Create a profile to get started</p>}
              </div>
            )}
            {filtered.map(p => {
              const statusCfg = STATUS_CFG[p.recruiting_status] || STATUS_CFG.available;
              return (
                <div key={p.id} className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all">
                  {/* Card Top */}
                  <div className="relative h-24 bg-gradient-to-br from-gray-900 to-gray-800 flex items-end px-4 pb-0">
                    <div className="absolute inset-0 opacity-20"
                      style={{ background: `linear-gradient(135deg, var(--color-primary,#f97316)44, transparent)` }} />
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-gray-700 bg-[#1a1a1a] translate-y-8 flex-shrink-0">
                      {p.photo_url
                        ? <img src={p.photo_url} alt={p.first_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ color: "var(--color-primary,#f97316)" }}>{p.first_name?.[0]}</div>
                      }
                    </div>
                  </div>

                  <div className="px-4 pt-10 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="text-white font-black text-lg leading-tight">{p.first_name} {p.last_name}</h3>
                        <p className="text-gray-500 text-xs">{p.position} · {p.year} · {p.school_name || "—"}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border mt-1 flex-shrink-0 ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>

                    {/* Quick stats */}
                    <div className="flex gap-3 mt-2 text-xs">
                      {p.height && <span className="text-gray-400">{p.height}</span>}
                      {p.weight && <span className="text-gray-400">{p.weight} lbs</span>}
                      {p.gpa && <span className="text-gray-400">GPA {p.gpa}</span>}
                      {p.forty_time && <span style={{ color: "var(--color-primary,#f97316)" }}>{p.forty_time}s</span>}
                    </div>

                    {p.committed_to && (
                      <div className="mt-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-blue-400" />
                        <span className="text-blue-400 text-xs">{p.recruiting_status === "signed" ? "Signed with" : "Committed to"}: {p.committed_to}</span>
                      </div>
                    )}

                    {p.offers?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-gray-500 text-xs mb-1">Offers ({p.offers.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {p.offers.slice(0, 3).map((o, i) => (
                            <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{o}</span>
                          ))}
                          {p.offers.length > 3 && <span className="text-xs text-gray-500">+{p.offers.length - 3} more</span>}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setViewProfile(p)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                        View Profile
                      </button>
                      {p.highlight_url && (
                        <a href={p.highlight_url} target="_blank" rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs bg-gray-800 text-gray-300 flex items-center gap-1">
                          <Video className="w-3 h-3" /> Film
                        </a>
                      )}
                      {canEdit && (
                        <>
                          <button onClick={() => openEdit(p)} className="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => remove(p.id)} className="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "stats" && (
          <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-500 text-xs px-4 py-3">Player</th>
                  <th className="text-left text-gray-500 text-xs px-4 py-3">Pos</th>
                  <th className="text-left text-gray-500 text-xs px-4 py-3">Yr</th>
                  {STAT_FIELDS.map(f => (
                    <th key={f.key} className="text-left text-gray-500 text-xs px-3 py-3 whitespace-nowrap">{f.label}</th>
                  ))}
                  <th className="text-left text-gray-500 text-xs px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={STAT_FIELDS.length + 4} className="text-center text-gray-500 py-10">No profiles found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-white/2">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{p.first_name} {p.last_name}</p>
                      <p className="text-gray-500 text-xs">{p.school_name || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{p.position}</td>
                    <td className="px-4 py-3 text-gray-400">{p.year || "—"}</td>
                    {STAT_FIELDS.map(f => (
                      <td key={f.key} className="px-3 py-3 text-gray-300 whitespace-nowrap">
                        {p[f.key] != null ? <span className="font-semibold text-white">{p[f.key]}{f.key === "forty_time" ? "s" : f.key === "vertical" ? '"' : ""}</span> : <span className="text-gray-700">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CFG[p.recruiting_status]?.color || "bg-gray-700 text-gray-400"}`}>
                        {STATUS_CFG[p.recruiting_status]?.label || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile Detail Modal */}
      {viewProfile && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewProfile(null)}>
          <div className="bg-[#141414] border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="relative h-32 bg-gradient-to-br from-gray-900 to-black overflow-hidden">
              <div className="absolute inset-0 opacity-30" style={{ background: "linear-gradient(135deg, var(--color-primary,#f97316), transparent)" }} />
              <button onClick={() => setViewProfile(null)} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-0 left-6 translate-y-1/2">
                <div className="w-20 h-20 rounded-2xl border-4 border-gray-800 overflow-hidden bg-[#1a1a1a]">
                  {viewProfile.photo_url
                    ? <img src={viewProfile.photo_url} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ color: "var(--color-primary,#f97316)" }}>{viewProfile.first_name?.[0]}</div>
                  }
                </div>
              </div>
            </div>

            <div className="px-6 pt-14 pb-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-white text-2xl font-black">{viewProfile.first_name} {viewProfile.last_name}</h2>
                  <p className="text-gray-400">{viewProfile.position} · {viewProfile.year} · {viewProfile.school_name || "—"}</p>
                  {viewProfile.hometown && <p className="text-gray-500 text-sm">{viewProfile.hometown}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_CFG[viewProfile.recruiting_status]?.color}`}>
                  {STATUS_CFG[viewProfile.recruiting_status]?.label}
                </span>
              </div>

              {/* Measurables */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { label: "Height", val: viewProfile.height },
                  { label: "Weight", val: viewProfile.weight ? `${viewProfile.weight} lbs` : null },
                  { label: "GPA", val: viewProfile.gpa },
                  { label: "40-Dash", val: viewProfile.forty_time ? `${viewProfile.forty_time}s` : null },
                  { label: "Vertical", val: viewProfile.vertical ? `${viewProfile.vertical}"` : null },
                ].filter(x => x.val).map(x => (
                  <div key={x.label} className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">{x.label}</p>
                    <p className="text-white font-black text-lg">{x.val}</p>
                  </div>
                ))}
              </div>

              {/* Stats */}
              {STAT_FIELDS.some(f => viewProfile[f.key] != null && !["forty_time","bench_reps","vertical"].includes(f.key)) && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Career Stats</p>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {STAT_FIELDS.filter(f => !["forty_time","bench_reps","vertical"].includes(f.key) && viewProfile[f.key] != null).map(f => (
                      <div key={f.key} className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-center">
                        <p className="text-gray-500 text-xs">{f.label}</p>
                        <p className="text-white font-black text-xl">{viewProfile[f.key]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewProfile.stats_summary && (
                <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Stats Summary</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{viewProfile.stats_summary}</p>
                </div>
              )}

              {viewProfile.bio && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Bio</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{viewProfile.bio}</p>
                </div>
              )}

              {viewProfile.awards?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Trophy className="w-3 h-3" /> Awards & Honors</p>
                  <div className="flex flex-wrap gap-2">
                    {viewProfile.awards.map((a, i) => (
                      <span key={i} className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded-lg">🏆 {a}</span>
                    ))}
                  </div>
                </div>
              )}

              {viewProfile.offers?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Scholarship Offers ({viewProfile.offers.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {viewProfile.offers.map((o, i) => (
                      <span key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg">{o}</span>
                    ))}
                  </div>
                </div>
              )}

              {viewProfile.committed_to && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-blue-400 font-semibold">{viewProfile.recruiting_status === "signed" ? "Signed" : "Committed"}</p>
                    <p className="text-white">{viewProfile.committed_to}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 flex-wrap pt-2">
                {viewProfile.highlight_url && (
                  <a href={viewProfile.highlight_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                    style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                    <Video className="w-4 h-4" /> Watch Highlights
                  </a>
                )}
                {viewProfile.hudl_url && (
                  <a href={viewProfile.hudl_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm">
                    <ExternalLink className="w-4 h-4" /> Hudl Profile
                  </a>
                )}
                {viewProfile.contact_email && (
                  <a href={`mailto:${viewProfile.contact_email}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm">
                    <User className="w-4 h-4" /> Contact
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-[#141414] z-10">
              <h2 className="text-white font-bold">{editing ? "Edit Recruit Profile" : "New Recruit Profile"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Link to Player */}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Link to Roster Player (optional)</label>
                <select onChange={e => handlePlayerSelect(e.target.value)} defaultValue=""
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none">
                  <option value="">Select player to auto-fill...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.position})</option>)}
                </select>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">First Name *</label>
                  <input value={form.first_name || ""} onChange={e => setForm({...form, first_name: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Last Name *</label>
                  <input value={form.last_name || ""} onChange={e => setForm({...form, last_name: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Position *</label>
                  <select value={form.position || ""} onChange={e => setForm({...form, position: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none">
                    <option value="">Select...</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Year</label>
                  <select value={form.year || ""} onChange={e => setForm({...form, year: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none">
                    <option value="">Select...</option>
                    {["Freshman","Sophomore","Junior","Senior","Grad"].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Height</label>
                  <input value={form.height || ""} onChange={e => setForm({...form, height: e.target.value})} placeholder='6\'2"'
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Weight (lbs)</label>
                  <input type="number" value={form.weight || ""} onChange={e => setForm({...form, weight: +e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">GPA</label>
                  <input type="number" step="0.01" value={form.gpa || ""} onChange={e => setForm({...form, gpa: +e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Hometown</label>
                  <input value={form.hometown || ""} onChange={e => setForm({...form, hometown: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">School Name</label>
                  <input value={form.school_name || ""} onChange={e => setForm({...form, school_name: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Recruiting Status</label>
                  <select value={form.recruiting_status || "available"} onChange={e => setForm({...form, recruiting_status: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none">
                    {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="text-gray-400 text-xs mb-2 block">Profile Photo</label>
                <div className="flex items-center gap-3">
                  {form.photo_url && <img src={form.photo_url} className="w-14 h-14 rounded-xl object-cover border border-gray-700" />}
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-xl text-gray-300 text-sm cursor-pointer hover:bg-gray-700">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Upload Photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  {form.photo_url && <input value={form.photo_url} onChange={e => setForm({...form, photo_url: e.target.value})} placeholder="or paste URL"
                    className="flex-1 bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-xs outline-none" />}
                </div>
              </div>

              {/* Highlight Film */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Highlight Film URL</label>
                  <input value={form.highlight_url || ""} onChange={e => setForm({...form, highlight_url: e.target.value})} placeholder="YouTube / Hudl link"
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Hudl Profile URL</label>
                  <input value={form.hudl_url || ""} onChange={e => setForm({...form, hudl_url: e.target.value})} placeholder="hudl.com/..."
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
              </div>

              {/* Performance Stats */}
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Performance Stats</p>
                <div className="grid grid-cols-3 gap-2">
                  {STAT_FIELDS.map(f => (
                    <div key={f.key}>
                      <label className="text-gray-500 text-xs mb-1 block">{f.label}</label>
                      <input type="number" step="0.01" value={form[f.key] || ""} onChange={e => setForm({...form, [f.key]: +e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Summary */}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Stats Summary (free text)</label>
                <textarea rows={2} value={form.stats_summary || ""} onChange={e => setForm({...form, stats_summary: e.target.value})}
                  placeholder="e.g. 2,400 passing yards, 28 TDs, 4 INTs senior year..."
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
              </div>

              {/* Bio */}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Bio</label>
                <textarea rows={3} value={form.bio || ""} onChange={e => setForm({...form, bio: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
              </div>

              {/* Awards */}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Awards & Honors</label>
                <div className="flex gap-2 mb-2">
                  <input value={newAward} onChange={e => setNewAward(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addAward())}
                    placeholder="e.g. All-Conference 2024"
                    className="flex-1 bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                  <button onClick={addAward} className="px-4 py-2 rounded-lg text-white text-sm" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.awards || []).map((a, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded-lg">
                      {a}
                      <button onClick={() => setForm(f => ({ ...f, awards: f.awards.filter((_, j) => j !== i) }))} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Offers */}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Scholarship Offers (one per line)</label>
                <textarea rows={2} value={(form.offers || []).join("\n")} onChange={e => setForm({...form, offers: e.target.value.split("\n").filter(Boolean)})}
                  placeholder="University of Alabama&#10;Ohio State University"
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none resize-none" />
              </div>

              {/* Committed To */}
              {(form.recruiting_status === "committed" || form.recruiting_status === "signed") && (
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">{form.recruiting_status === "signed" ? "Signed With" : "Committed To"}</label>
                  <input value={form.committed_to || ""} onChange={e => setForm({...form, committed_to: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
              )}

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Contact Email</label>
                  <input type="email" value={form.contact_email || ""} onChange={e => setForm({...form, contact_email: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Contact Phone</label>
                  <input value={form.contact_phone || ""} onChange={e => setForm({...form, contact_phone: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 text-gray-300 py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={save} disabled={saving || !form.first_name || !form.last_name || !form.position}
                  className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                  {saving ? "Saving..." : editing ? "Update Profile" : "Create Profile"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}