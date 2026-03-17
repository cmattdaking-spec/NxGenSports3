import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Pencil, X, Check, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SPORT_LABELS = {
  football:"Football", girls_flag_football:"Girls Flag Football",
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
  // legacy keys
  basketball:"Basketball", baseball:"Baseball", softball:"Softball",
  soccer:"Soccer", volleyball:"Volleyball", boxing:"Boxing", golf:"Golf",
  tennis:"Tennis", wrestling:"Wrestling", cross_country:"Cross Country",
  track:"Track", lacrosse:"Lacrosse",
};

function PlayerRow({ player, docs, onSavePlayer, onSaveDocs }) {
  const [expanded, setExpanded] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(false);
  const [pData, setPData] = useState({ academic_eligible: player.academic_eligible !== false, gpa: player.gpa || "", status: player.status || "active" });
  const [dData, setDData] = useState({
    physical_on_file: docs?.physical_on_file || false,
    waiver_signed: docs?.waiver_signed || false,
    concussion_baseline_done: docs?.concussion_baseline_done || false,
    medical_forms_complete: docs?.medical_forms_complete || false,
    insurance_on_file: docs?.insurance_on_file || false,
    notes: docs?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const saveAll = async () => {
    setSaving(true);
    await base44.entities.Player.update(player.id, { academic_eligible: pData.academic_eligible, gpa: pData.gpa ? parseFloat(pData.gpa) : null, status: pData.status });
    if (docs?.id) {
      await base44.entities.PlayerDocument.update(docs.id, dData);
    } else {
      await base44.entities.PlayerDocument.create({ player_id: player.id, player_name: `${player.first_name} ${player.last_name}`, ...dData });
    }
    setSaving(false);
    setEditingPlayer(false);
    onSavePlayer();
  };

  const docCount = [dData.physical_on_file, dData.waiver_signed, dData.concussion_baseline_done, dData.medical_forms_complete, dData.insurance_on_file].filter(Boolean).length;

  return (
    <div className="border-b border-gray-800 last:border-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{player.first_name} {player.last_name}</p>
            <p className="text-gray-500 text-xs">{player.position || "—"} · {player.year || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${player.academic_eligible !== false ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {player.academic_eligible !== false ? "Eligible" : "Ineligible"}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${docCount === 5 ? "bg-green-500/20 text-green-400" : docCount > 2 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
            <FileText className="w-3 h-3" />{docCount}/5
          </span>
          <button onClick={() => { setExpanded(true); setEditingPlayer(true); }} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-all">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Academic + Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Status</label>
              {editingPlayer ? (
                <Select value={pData.status} onValueChange={value => setPData({ ...pData, status: value })}>
                  <SelectTrigger className="w-full bg-[#111] border-gray-700 rounded-lg text-white text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="injured">Injured</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              ) : <p className="text-white text-sm capitalize">{player.status}</p>}
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Academic Eligible</label>
              {editingPlayer ? (
                <Select value={pData.academic_eligible ? "yes" : "no"} onValueChange={value => setPData({ ...pData, academic_eligible: value === "yes" })}>
                  <SelectTrigger className="w-full bg-[#111] border-gray-700 rounded-lg text-white text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Eligible</SelectItem>
                    <SelectItem value="no">Ineligible</SelectItem>
                  </SelectContent>
                </Select>
              ) : <p className={`text-sm ${player.academic_eligible !== false ? "text-green-400" : "text-red-400"}`}>{player.academic_eligible !== false ? "Eligible" : "Ineligible"}</p>}
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">GPA</label>
              {editingPlayer ? (
                <input type="number" step="0.01" min="0" max="4" value={pData.gpa} onChange={e => setPData({...pData, gpa: e.target.value})}
                  className="w-full bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
              ) : <p className="text-white text-sm">{player.gpa || "—"}</p>}
            </div>
          </div>

          {/* Documents / Paperwork */}
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Physical & Paperwork</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { key: "physical_on_file", label: "Physical" },
                { key: "waiver_signed", label: "Waiver" },
                { key: "concussion_baseline_done", label: "Concussion" },
                { key: "medical_forms_complete", label: "Medical Forms" },
                { key: "insurance_on_file", label: "Insurance" },
              ].map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${dData[key] ? "border-green-500/40 bg-green-500/10" : "border-gray-700 bg-[#111]"}`}>
                  <input type="checkbox" checked={dData[key]} onChange={e => setDData({...dData, [key]: e.target.checked})}
                    disabled={!editingPlayer} className="w-3.5 h-3.5 accent-green-400" />
                  <span className={`text-xs ${dData[key] ? "text-green-400" : "text-gray-500"}`}>{label}</span>
                </label>
              ))}
            </div>
            {editingPlayer && (
              <div className="mt-2">
                <label className="text-gray-500 text-xs mb-1 block">Notes</label>
                <textarea value={dData.notes} onChange={e => setDData({...dData, notes: e.target.value})} rows={2}
                  className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white text-xs outline-none resize-none" />
              </div>
            )}
          </div>

          {editingPlayer && (
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingPlayer(false)} className="px-4 py-2 rounded-xl bg-gray-800 text-gray-400 text-sm hover:bg-gray-700">Cancel</button>
              <button onClick={saveAll} disabled={saving} className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ADPlayersTab({ players, documents, onRefresh }) {
  const [sportFilter, setSportFilter] = useState("all");
  const [search, setSearch] = useState("");

  const sports = [...new Set(players.map(p => p.sport || "football"))].sort();

  const filtered = players.filter(p => {
    const matchSport = sportFilter === "all" || p.sport === sportFilter;
    const matchSearch = !search || `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase());
    return matchSport && matchSearch;
  });

  const getDoc = (playerId) => documents.find(d => d.player_id === playerId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-white font-bold text-lg">Players ({filtered.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player…"
            className="bg-[#141414] border border-gray-700 rounded-xl px-3 py-1.5 text-white text-sm outline-none w-40" />
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="bg-[#141414] border-gray-700 rounded-xl text-white text-sm min-w-36">
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {sports.map(s => <SelectItem key={s} value={s}>{SPORT_LABELS[s] || s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
        {filtered.length === 0 && <p className="text-gray-500 text-sm px-5 py-8 text-center">No players found.</p>}
        {filtered.map(p => (
          <PlayerRow key={p.id} player={p} docs={getDoc(p.id)} onSavePlayer={onRefresh} onSaveDocs={onRefresh} />
        ))}
      </div>
    </div>
  );
}