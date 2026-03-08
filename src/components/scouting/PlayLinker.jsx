import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, X, Link, Check } from "lucide-react";

export default function PlayLinker({ opponentId, opponentName, linkedPlays = [], onUpdate }) {
  const [plays, setPlays] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && plays.length === 0) {
      setLoading(true);
      base44.entities.Play.list().then(d => { setPlays(d); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [open]);

  const toggle = (playId) => {
    const updated = linkedPlays.includes(playId)
      ? linkedPlays.filter(id => id !== playId)
      : [...linkedPlays, playId];
    onUpdate(updated);
  };

  const filtered = plays.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.formation?.toLowerCase().includes(q);
  });

  const categoryColor = {
    run: "bg-green-500/20 text-green-400",
    pass: "bg-blue-500/20 text-blue-400",
    screen: "bg-cyan-500/20 text-cyan-400",
    play_action: "bg-purple-500/20 text-purple-400",
    blitz: "bg-red-500/20 text-red-400",
    coverage: "bg-yellow-500/20 text-yellow-400",
    punt: "bg-gray-500/20 text-gray-400",
    kick: "bg-orange-500/20 text-orange-400",
  };

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all">
        <Link className="w-3 h-3" />
        Linked Plays {linkedPlays.length > 0 && <span className="bg-indigo-500/30 px-1.5 rounded-full">{linkedPlays.length}</span>}
      </button>

      {open && (
        <div className="mt-2 bg-[#1a1a1a] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <p className="text-xs text-white font-semibold">Link Playbook Plays → {opponentName}</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-300"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="p-2 border-b border-gray-800">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plays..."
              className="w-full bg-[#141414] border border-gray-700 text-white text-xs px-2.5 py-1.5 rounded-lg outline-none" />
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-800/50">
            {loading ? (
              <p className="text-gray-500 text-xs text-center py-4">Loading plays...</p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-4">No plays found.</p>
            ) : filtered.map(play => {
              const linked = linkedPlays.includes(play.id);
              return (
                <button key={play.id} onClick={() => toggle(play.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${linked ? "bg-indigo-500/10" : "hover:bg-white/3"}`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${linked ? "border-indigo-500 bg-indigo-500" : "border-gray-600"}`}>
                    {linked && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{play.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-xs px-1.5 rounded ${categoryColor[play.category] || "bg-gray-700 text-gray-400"}`}>{play.category}</span>
                      {play.formation && <span className="text-gray-600 text-xs">{play.formation}</span>}
                      <span className="text-gray-700 text-xs capitalize">{play.unit?.replace("_"," ")}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {linkedPlays.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-800 bg-indigo-500/5">
              <p className="text-indigo-400 text-xs">{linkedPlays.length} play{linkedPlays.length !== 1 ? "s" : ""} linked to this opponent</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}