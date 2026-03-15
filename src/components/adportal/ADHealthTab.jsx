import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, X, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SPORT_LABELS = {
  football:"Football", basketball:"Basketball", baseball:"Baseball", softball:"Softball",
  soccer:"Soccer", volleyball:"Volleyball", boxing:"Boxing", golf:"Golf",
  tennis:"Tennis", wrestling:"Wrestling", cross_country:"Cross Country", track:"Track", lacrosse:"Lacrosse"
};

const AVAIL_COLORS = {
  full: "bg-green-500/20 text-green-400",
  limited: "bg-yellow-500/20 text-yellow-400",
  out: "bg-red-500/20 text-red-400",
  day_to_day: "bg-orange-500/20 text-orange-400",
};

export default function ADHealthTab({ healthRecords, players, onRefresh }) {
  const [sportFilter, setSportFilter] = useState("all");
  const [availFilter, setAvailFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const enriched = healthRecords.map(h => ({
    ...h,
    sport: players.find(p => p.id === h.player_id)?.sport || "unknown",
  }));

  const sports = [...new Set(enriched.map(h => h.sport))].filter(s => s !== "unknown").sort();

  const filtered = enriched.filter(h => {
    const matchSport = sportFilter === "all" || h.sport === sportFilter;
    const matchAvail = availFilter === "all" || h.availability === availFilter;
    return matchSport && matchAvail;
  });

  const issues = filtered.filter(h => h.availability !== "full");
  const allClear = filtered.filter(h => h.availability === "full");

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.PlayerHealth.update(editingId, editData);
    setSaving(false);
    setEditingId(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-white font-bold text-lg">Health Status</h2>
        <div className="flex gap-2 flex-wrap">
          <Select value={availFilter} onValueChange={setAvailFilter}>
            <SelectTrigger className="bg-[#141414] border-gray-700 rounded-xl text-white text-sm min-w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="out">Out</SelectItem>
              <SelectItem value="limited">Limited</SelectItem>
              <SelectItem value="day_to_day">Day-to-Day</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Out", count: enriched.filter(h => h.availability === "out").length, color: "text-red-400" },
          { label: "Limited", count: enriched.filter(h => h.availability === "limited").length, color: "text-yellow-400" },
          { label: "Day-to-Day", count: enriched.filter(h => h.availability === "day_to_day").length, color: "text-orange-400" },
          { label: "Full", count: enriched.filter(h => h.availability === "full").length, color: "text-green-400" },
        ].map(({ label, count, color }) => (
          <div key={label} className="bg-[#141414] border border-gray-800 rounded-xl p-3 text-center">
            <p className={`text-2xl font-black ${color}`}>{count}</p>
            <p className="text-gray-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Issues first */}
      {issues.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Active Issues ({issues.length})</p>
          <div className="bg-[#141414] border border-gray-800 rounded-xl divide-y divide-gray-800">
            {issues.map(h => (
              <div key={h.id} className="px-4 py-3">
                {editingId === h.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Availability</label>
                        <Select value={editData.availability} onValueChange={value => setEditData({ ...editData, availability: value })}>
                          <SelectTrigger className="w-full bg-[#111] border-gray-700 rounded-lg text-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full</SelectItem>
                            <SelectItem value="limited">Limited</SelectItem>
                            <SelectItem value="day_to_day">Day-to-Day</SelectItem>
                            <SelectItem value="out">Out</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Est. Return</label>
                        <input type="date" value={editData.estimated_return || ""} onChange={e => setEditData({...editData, estimated_return: e.target.value})}
                          className="w-full bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Notes</label>
                      <input value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})}
                        className="w-full bg-[#111] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 text-xs">Cancel</button>
                      <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-xs disabled:opacity-50">
                        {saving ? "…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{h.player_name}</p>
                      <p className="text-gray-500 text-xs">
                        <span className="capitalize">{SPORT_LABELS[h.sport] || h.sport}</span>
                        {h.injury_type && ` · ${h.injury_type}`}
                        {h.estimated_return && ` · Est. return: ${h.estimated_return}`}
                      </p>
                      {h.notes && <p className="text-gray-600 text-xs mt-0.5 italic">{h.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${AVAIL_COLORS[h.availability]}`}>{h.availability?.replace(/_/g, " ")}</span>
                      <button onClick={() => { setEditingId(h.id); setEditData({...h}); }}
                        className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All clear players */}
      {allClear.length > 0 && availFilter === "all" && (
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Full Availability ({allClear.length})</p>
          <div className="bg-[#141414] border border-gray-800 rounded-xl divide-y divide-gray-800">
            {allClear.map(h => (
              <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <span className="text-white text-sm">{h.player_name}</span>
                  <span className="text-gray-600 text-xs ml-2">{SPORT_LABELS[h.sport] || h.sport}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Full</span>
                  <button onClick={() => { setEditingId(h.id); setEditData({...h}); }}
                    className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}