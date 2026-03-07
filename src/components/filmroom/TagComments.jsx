import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TagComments({ tag, sessionId, user, onClose }) {
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    base44.entities.FilmComment.filter({ tag_id: tag.id }).then(setComments);

    const unsub = base44.entities.FilmComment.subscribe((event) => {
      if (event.data?.tag_id !== tag.id) return;
      if (event.type === "create") setComments(prev => [...prev, event.data]);
      if (event.type === "delete") setComments(prev => prev.filter(c => c.id !== event.id));
    });
    return unsub;
  }, [tag.id]);

  const send = async () => {
    if (!input.trim()) return;
    setSending(true);
    await base44.entities.FilmComment.create({
      session_id: sessionId,
      tag_id: tag.id,
      timestamp_seconds: tag.timestamp_seconds,
      timestamp_label: tag.timestamp_label,
      author_name: user?.full_name || user?.email || "Coach",
      author_email: user?.email || "",
      content: input.trim(),
    });
    setInput("");
    setSending(false);
  };

  const del = async (id) => {
    await base44.entities.FilmComment.delete(id);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6">
      <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-md flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
            <span className="text-white font-semibold text-sm">
              Discussion — <span className="font-mono text-gray-400">{tag.timestamp_label}</span>
              <span className="ml-2 text-xs capitalize text-gray-500">{tag.play_type?.replace(/_/g, " ")}</span>
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Coach note (tag notes) */}
        {tag.notes && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-gray-700 text-xs text-gray-400 italic flex-shrink-0">
            <span className="text-gray-600 not-italic font-medium">Tag note: </span>{tag.notes}
          </div>
        )}

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-6">No comments yet — start the discussion</p>
          )}
          {comments.map(c => {
            const isMe = c.author_email === user?.email;
            return (
              <div key={c.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ backgroundColor: "var(--color-primary,#f97316)33", color: "var(--color-primary,#f97316)" }}>
                  {(c.author_name?.[0] || "?").toUpperCase()}
                </div>
                <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className={`flex items-center gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className="text-gray-500 text-xs">{c.author_name}</span>
                    <span className="text-gray-700 text-xs">{timeAgo(c.created_date)}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-sm ${isMe ? "text-white rounded-tr-sm" : "bg-[#1a1a1a] text-gray-300 rounded-tl-sm border border-gray-700"}`}
                    style={isMe ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
                    {c.content}
                  </div>
                  {isMe && (
                    <button onClick={() => del(c.id)} className="text-gray-700 hover:text-red-400 text-xs transition-colors">delete</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-800 flex gap-2 flex-shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Add a comment..."
            className="flex-1 bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
          />
          <button onClick={send} disabled={sending || !input.trim()}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
            style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}