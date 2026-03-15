import { Plus, Film, Trash2, Link as LinkIcon, Upload, X } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function SessionSidebar({ sessions, activeId, onSelect, onCreate, onDelete, canAddSession = true, canDeleteSession = true }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", video_url: "", opponent: "", game_date: "", unit: "all" });
  const [uploadMode, setUploadMode] = useState("url"); // "url" | "file"
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress("Uploading...");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, video_url: file_url }));
      setUploadProgress("✓ Uploaded");
    } catch {
      setUploadProgress("Upload failed");
    }
    setUploading(false);
  };

  const handleCreate = () => {
    if (!form.title || !form.video_url) return;
    onCreate(form);
    setForm({ title: "", video_url: "", opponent: "", game_date: "", unit: "all" });
    setUploadMode("url");
    setUploadProgress("");
    setShowForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">Film Sessions</h3>
        {canAddSession && (
          <button onClick={() => setShowForm(f => !f)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 mb-3 space-y-2">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Session title *"
            className="w-full bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs" />

          {/* Video Source Toggle */}
          <div className="flex gap-1">
            <button onClick={() => setUploadMode("url")}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs transition-all ${uploadMode === "url" ? "text-white" : "bg-gray-800 text-gray-500"}`}
              style={uploadMode === "url" ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
              <LinkIcon className="w-3 h-3" /> URL
            </button>
            <button onClick={() => setUploadMode("file")}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs transition-all ${uploadMode === "file" ? "text-white" : "bg-gray-800 text-gray-500"}`}
              style={uploadMode === "file" ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
              <Upload className="w-3 h-3" /> Upload
            </button>
          </div>

          {uploadMode === "url" ? (
            <input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })}
              placeholder="YouTube, Vimeo, or .mp4 URL *"
              className="w-full bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs" />
          ) : (
            <div>
              <label className="w-full flex flex-col items-center justify-center gap-1 bg-[#111] border border-dashed border-gray-600 rounded py-3 cursor-pointer hover:border-gray-400 transition-all">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">Click to upload video</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
              {uploadProgress && (
                <p className={`text-xs mt-1 ${uploadProgress.startsWith("✓") ? "text-green-400" : uploading ? "text-gray-400" : "text-red-400"}`}>
                  {uploadProgress}
                </p>
              )}
              {form.video_url && uploadProgress.startsWith("✓") && (
                <p className="text-xs text-gray-600 truncate mt-0.5">{form.video_url.split("/").pop()}</p>
              )}
            </div>
          )}

          <input value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })}
            placeholder="Opponent (optional)"
            className="w-full bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs" />
          <input type="date" value={form.game_date} onChange={e => setForm({ ...form, game_date: e.target.value })}
            className="w-full bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs" />
          <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
            className="w-full bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs">
            <option value="all">All Units</option>
            <option value="offense">Offense</option>
            <option value="defense">Defense</option>
            <option value="special_teams">Special Teams</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setUploadProgress(""); setUploadMode("url"); }}
              className="flex-1 bg-gray-800 text-gray-400 py-1.5 rounded text-xs">Cancel</button>
            <button onClick={handleCreate} disabled={!form.title || !form.video_url || uploading}
              className="flex-1 text-white py-1.5 rounded text-xs font-semibold disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              Create
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1">
        {sessions.length === 0 && !showForm && (
          <div className="text-center py-10">
            <Film className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-600 text-xs">No sessions yet</p>
            <p className="text-gray-700 text-xs mt-1">Tap + to add a session</p>
          </div>
        )}
        {sessions.map(s => (
          <button key={s.id} onClick={() => onSelect(s)}
            className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center gap-2 group ${activeId === s.id ? "text-white" : "bg-[#141414] border-gray-800 text-gray-400 hover:text-white hover:border-gray-600"}`}
            style={activeId === s.id ? { backgroundColor: "var(--color-primary,#f97316)22", borderColor: "var(--color-primary,#f97316)66" } : {}}>
            <Film className="w-3.5 h-3.5 flex-shrink-0" style={activeId === s.id ? { color: "var(--color-primary,#f97316)" } : {}} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{s.title}</p>
              {s.opponent && <p className="text-gray-600 text-xs truncate">vs {s.opponent}</p>}
              {s.game_date && <p className="text-gray-700 text-xs">{s.game_date}</p>}
            </div>
            <div className="flex items-center gap-1">
              {s.tag_count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">{s.tag_count}</span>
              )}
              {canDeleteSession && (
                <button onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}