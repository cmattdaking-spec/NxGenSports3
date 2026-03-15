import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  Play, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  ListVideo, PlayCircle, Edit2, Check, X, SkipForward, Pause
} from "lucide-react";
import { getEmbedUrl, isIframe } from "@/components/filmroom/VideoPlayer";

function PlaylistVideoPlayer({ url, title, index }) {
  const embedUrl = getEmbedUrl(url);
  if (isIframe(url)) {
    return (
      <iframe
        key={index}
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        title={title}
      />
    );
  }
  return (
    <video
      key={index}
      src={url}
      controls
      autoPlay
      className="w-full h-full"
    />
  );
}

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [playingPlaylist, setPlayingPlaylist] = useState(null);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [addVideoForm, setAddVideoForm] = useState(null);
  const [newVideo, setNewVideo] = useState({ title: "", url: "", notes: "" });
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    const list = await base44.entities.Playlist.list("-created_date");
    setPlaylists(list);
    setLoading(false);
  };

  const createPlaylist = async () => {
    if (!newName.trim()) return;
    const p = await base44.entities.Playlist.create({
      name: newName.trim(),
      description: newDesc.trim(),
      videos: [],
      owner_email: user?.email,
    });
    setPlaylists(prev => [p, ...prev]);
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    setExpandedId(p.id);
  };

  const deletePlaylist = async (id) => {
    await base44.entities.Playlist.delete(id);
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const addVideo = async (playlist) => {
    if (!newVideo.title.trim() || !newVideo.url.trim()) return;
    const video = { id: Date.now().toString(), ...newVideo };
    const updated = await base44.entities.Playlist.update(playlist.id, {
      videos: [...(playlist.videos || []), video],
    });
    setPlaylists(prev => prev.map(p => p.id === playlist.id ? updated : p));
    setAddVideoForm(null);
    setNewVideo({ title: "", url: "", notes: "" });
  };

  const removeVideo = async (playlist, videoId) => {
    const updated = await base44.entities.Playlist.update(playlist.id, {
      videos: playlist.videos.filter(v => v.id !== videoId),
    });
    setPlaylists(prev => prev.map(p => p.id === playlist.id ? updated : p));
  };

  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { dragOverItem.current = idx; };
  const handleDrop = async (playlist) => {
    const videos = [...(playlist.videos || [])];
    const draggedItem = videos.splice(dragItem.current, 1)[0];
    videos.splice(dragOverItem.current, 0, draggedItem);
    const updated = await base44.entities.Playlist.update(playlist.id, { videos });
    setPlaylists(prev => prev.map(p => p.id === playlist.id ? updated : p));
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const playAll = (playlist) => {
    if (!playlist.videos?.length) return;
    setPlayingPlaylist(playlist);
    setCurrentVideoIdx(0);
  };

  const nextVideo = () => {
    if (!playingPlaylist) return;
    if (currentVideoIdx < playingPlaylist.videos.length - 1) {
      setCurrentVideoIdx(i => i + 1);
    } else {
      setPlayingPlaylist(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <div className="w-10 h-10 border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary,#3b82f6)]/20 flex items-center justify-center">
            <ListVideo className="w-5 h-5 text-[var(--color-primary,#3b82f6)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Playlists</h1>
            <p className="text-gray-500 text-sm">Organize & play your film library</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all"
          style={{ backgroundColor: "var(--color-primary, #3b82f6)" }}
        >
          <Plus className="w-4 h-4" /> New Playlist
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#141414] border border-gray-700 rounded-2xl p-4 space-y-3">
          <h3 className="text-white font-semibold">New Playlist</h3>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Playlist name..."
            className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)]"
          />
          <input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)]"
          />
          <div className="flex gap-2">
            <button onClick={createPlaylist} className="px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: "var(--color-primary, #3b82f6)" }}>
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Player Modal */}
      {playingPlaylist && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-3xl space-y-4">
            <div className="flex items-center justify-between text-white">
              <span className="font-black text-lg">{playingPlaylist.name}</span>
              <button onClick={() => setPlayingPlaylist(null)}><X className="w-6 h-6 text-gray-400 hover:text-white" /></button>
            </div>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden">
              <PlaylistVideoPlayer
                key={currentVideoIdx}
                url={playingPlaylist.videos[currentVideoIdx]?.url}
                title={playingPlaylist.videos[currentVideoIdx]?.title}
                index={currentVideoIdx}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{playingPlaylist.videos[currentVideoIdx]?.title}</p>
                <p className="text-gray-500 text-xs">{currentVideoIdx + 1} of {playingPlaylist.videos.length}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={nextVideo} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
                  <SkipForward className="w-4 h-4" /> Next
                </button>
              </div>
            </div>
            {/* Playlist queue */}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {playingPlaylist.videos.map((v, i) => (
                <button key={v.id} onClick={() => setCurrentVideoIdx(i)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all ${i === currentVideoIdx ? "bg-[var(--color-primary,#3b82f6)]/20 border border-[var(--color-primary,#3b82f6)]/40" : "hover:bg-white/5"}`}>
                  <span className="text-xs w-5 text-center text-gray-500">{i + 1}</span>
                  {i === currentVideoIdx && <Play className="w-3 h-3 text-[var(--color-primary,#3b82f6)]" />}
                  <span className="text-gray-300 text-sm truncate">{v.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Playlists */}
      {playlists.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <ListVideo className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No playlists yet</p>
          <p className="text-sm mt-1">Create your first playlist to organize your film</p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map(playlist => (
            <div key={playlist.id} className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden">
              {/* Playlist Header */}
              <div className="flex items-center justify-between p-4">
                <button className="flex items-center gap-3 flex-1 text-left" onClick={() => setExpandedId(expandedId === playlist.id ? null : playlist.id)}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#3b82f6)22" }}>
                    <ListVideo className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{playlist.name}</p>
                    <p className="text-gray-500 text-xs">{playlist.videos?.length || 0} videos{playlist.description ? ` · ${playlist.description}` : ""}</p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  {(playlist.videos?.length || 0) > 0 && (
                    <button onClick={() => playAll(playlist)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
                      <PlayCircle className="w-3.5 h-3.5" /> Play All
                    </button>
                  )}
                  <button onClick={() => deletePlaylist(playlist.id)} className="p-2 text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedId === playlist.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>
              </div>

              {/* Expanded Videos */}
              {expandedId === playlist.id && (
                <div className="border-t border-gray-800 p-4 space-y-3">
                  {/* Drag-reorder list */}
                  {(playlist.videos || []).map((video, idx) => (
                    <div
                      key={video.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragEnd={() => handleDrop(playlist)}
                      onDragOver={e => e.preventDefault()}
                      className="flex items-center gap-3 bg-[#1e1e1e] rounded-xl p-3 group cursor-grab"
                    >
                      <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      <span className="text-gray-600 text-xs w-4">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{video.title}</p>
                        {video.notes && <p className="text-gray-500 text-xs truncate">{video.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setPlayingPlaylist(playlist); setCurrentVideoIdx(idx); }} className="p-1 text-[var(--color-primary,#3b82f6)] hover:opacity-70">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeVideo(playlist, video.id)} className="p-1 text-red-400 hover:text-red-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add video form */}
                  {addVideoForm === playlist.id ? (
                    <div className="bg-[#1e1e1e] rounded-xl p-3 space-y-2">
                      <input value={newVideo.title} onChange={e => setNewVideo(v => ({ ...v, title: e.target.value }))}
                        placeholder="Video title..." className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)]" />
                      <input value={newVideo.url} onChange={e => setNewVideo(v => ({ ...v, url: e.target.value }))}
                        placeholder="Video URL (YouTube, Hudl, etc.)..." className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)]" />
                      <input value={newVideo.notes} onChange={e => setNewVideo(v => ({ ...v, notes: e.target.value }))}
                        placeholder="Notes (optional)..." className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)]" />
                      <div className="flex gap-2">
                        <button onClick={() => addVideo(playlist)} className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
                          Add Video
                        </button>
                        <button onClick={() => { setAddVideoForm(null); setNewVideo({ title: "", url: "", notes: "" }); }} className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-xs">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddVideoForm(playlist.id)} className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:border-[var(--color-primary,#3b82f6)] hover:text-[var(--color-primary,#3b82f6)] transition-all text-sm">
                      <Plus className="w-4 h-4" /> Add Video
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}