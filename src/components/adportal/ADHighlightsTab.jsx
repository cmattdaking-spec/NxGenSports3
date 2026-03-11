import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Film, Play, Search, ExternalLink, Star } from "lucide-react";

export default function ADHighlightsTab() {
  const [sessions, setSessions] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState("sessions");

  useEffect(() => {
    Promise.all([
      base44.entities.FilmSession.list("-created_date"),
      base44.entities.Playlist.list("-created_date"),
    ]).then(([s, p]) => {
      setSessions(s);
      setPlaylists(p);
      setLoading(false);
    });
  }, []);

  const filteredSessions = sessions.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.opponent?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPlaylists = playlists.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-white font-bold text-lg flex items-center gap-2"><Film className="w-5 h-5 text-cyan-400" /> Highlights & Film</h2>
        <div className="flex gap-2">
          <button onClick={() => setActiveView("sessions")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === "sessions" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>Film Sessions</button>
          <button onClick={() => setActiveView("playlists")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === "playlists" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>Playlists</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search highlights..." className="w-full bg-[#141414] border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-cyan-500" />
      </div>

      {activeView === "sessions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.length === 0 && <p className="text-gray-600 text-sm col-span-3 py-8 text-center">No film sessions yet</p>}
          {filteredSessions.map(s => (
            <div key={s.id} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all">
              <div className="bg-[#1a1a1a] aspect-video flex items-center justify-center relative">
                {s.video_url ? (
                  <a href={s.video_url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-all">
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </a>
                ) : (
                  <Film className="w-10 h-10 text-gray-700" />
                )}
              </div>
              <div className="p-3">
                <p className="text-white text-sm font-semibold truncate">{s.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-gray-500 text-xs">{s.opponent ? `vs ${s.opponent}` : s.sport || ""}</p>
                  <p className="text-gray-600 text-xs">{s.game_date || ""}</p>
                </div>
                {s.video_url && (
                  <a href={s.video_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300">
                    <ExternalLink className="w-3 h-3" /> Watch
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === "playlists" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlaylists.length === 0 && <p className="text-gray-600 text-sm col-span-2 py-8 text-center">No playlists yet</p>}
          {filteredPlaylists.map(p => (
            <div key={p.id} className="bg-[#141414] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                  <p className="text-gray-500 text-xs">{p.videos?.length || 0} videos</p>
                </div>
              </div>
              {p.description && <p className="text-gray-400 text-xs">{p.description}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {(p.videos || []).slice(0, 3).map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full truncate max-w-xs">
                    {v.title || `Clip ${i + 1}`}
                  </a>
                ))}
                {(p.videos?.length || 0) > 3 && <span className="text-xs text-gray-600">+{p.videos.length - 3} more</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}