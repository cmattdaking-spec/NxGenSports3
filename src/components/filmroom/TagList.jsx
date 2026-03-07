import { Flag, CheckCircle, XCircle, Minus, Trash2, Search, Filter } from "lucide-react";
import { useState } from "react";

const RESULT_STYLES = {
  success: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  failure: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  neutral: { icon: Minus, color: "text-gray-400", bg: "bg-gray-800 border-gray-700" },
};

const PLAY_TYPE_COLORS = {
  run: "bg-orange-500/20 text-orange-400",
  pass: "bg-blue-500/20 text-blue-400",
  blitz: "bg-red-500/20 text-red-400",
  screen: "bg-purple-500/20 text-purple-400",
  play_action: "bg-yellow-500/20 text-yellow-400",
  coverage: "bg-cyan-500/20 text-cyan-400",
  turnover: "bg-red-600/20 text-red-500",
  score: "bg-green-500/20 text-green-400",
};

export default function TagList({ tags, onDelete, onTagClick }) {
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const allTypes = [...new Set(tags.map(t => t.play_type))].filter(Boolean);

  const filtered = tags
    .filter(t => {
      if (filterResult !== "all" && t.result !== filterResult) return false;
      if (filterType !== "all" && t.play_type !== filterType) return false;
      if (flaggedOnly && !t.flagged) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.play_type?.includes(q) ||
          t.formation?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          t.personnel?.includes(q) ||
          t.timestamp_label?.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tags..."
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white pl-8 pr-3 py-1.5 rounded-lg text-xs" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all","success","neutral","failure"].map(r => (
            <button key={r} onClick={() => setFilterResult(r)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-all ${filterResult === r ? "text-white" : "bg-[#1a1a1a] border-gray-700 text-gray-500 hover:text-gray-300"}`}
              style={filterResult === r ? { backgroundColor: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)" } : {}}>
              {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
          <button onClick={() => setFlaggedOnly(f => !f)}
            className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 transition-all ${flaggedOnly ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" : "bg-[#1a1a1a] border-gray-700 text-gray-500"}`}>
            <Flag className="w-3 h-3" /> Flagged
          </button>
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-gray-700 text-gray-300 px-2 py-1.5 rounded text-xs">
          <option value="all">All play types</option>
          {allTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Count */}
      <p className="text-gray-600 text-xs mb-2">{filtered.length} tag{filtered.length !== 1 ? "s" : ""}</p>

      {/* Tag list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-sm">No tags match your filters</div>
        )}
        {filtered.map(tag => {
          const R = RESULT_STYLES[tag.result] || RESULT_STYLES.neutral;
          const RIcon = R.icon;
          const typeColor = PLAY_TYPE_COLORS[tag.play_type] || "bg-gray-700 text-gray-400";
          return (
            <div key={tag.id}
              onClick={() => onTagClick?.(tag)}
              className={`border rounded-lg p-2.5 cursor-pointer hover:brightness-110 transition-all ${R.bg}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={e => { e.stopPropagation(); onTagClick?.(tag); }}
                    className="flex-shrink-0 font-mono text-xs px-1.5 py-0.5 rounded bg-black/40 text-gray-300 hover:text-white">
                    {tag.timestamp_label}
                  </button>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${typeColor}`}>
                    {tag.play_type?.replace(/_/g, " ")}
                  </span>
                  {tag.down && (
                    <span className="text-xs text-gray-500">
                      {tag.down}&amp;{tag.distance || "?"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {tag.flagged && <Flag className="w-3 h-3 text-yellow-500" />}
                  <RIcon className={`w-3.5 h-3.5 ${R.color}`} />
                  <button onClick={e => { e.stopPropagation(); onDelete(tag.id); }}
                    className="text-gray-700 hover:text-red-400 transition-colors ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {(tag.formation || tag.personnel) && (
                <div className="flex gap-2 mt-1">
                  {tag.formation && <span className="text-gray-500 text-xs">{tag.formation}</span>}
                  {tag.personnel && <span className="text-gray-600 text-xs">{tag.personnel} pers.</span>}
                  {tag.yards != null && tag.yards !== "" && <span className="text-gray-500 text-xs">{tag.yards > 0 ? "+" : ""}{tag.yards} yds</span>}
                </div>
              )}
              {tag.notes && (
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{tag.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}