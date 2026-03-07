import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Send, MessageSquare, Loader2 } from "lucide-react";

export default function ThreadPanel({ parentMsg, user, onClose }) {
  const [replies, setReplies] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!parentMsg?.id) return;
    base44.entities.Message.filter({ conversation_id: `thread_${parentMsg.id}` }, "created_date")
      .then(setReplies);

    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === `thread_${parentMsg.id}` && event.type === "create") {
        setReplies(prev => [...prev, event.data]);
      }
    });
    return unsub;
  }, [parentMsg?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const msg = await base44.entities.Message.create({
      conversation_id: `thread_${parentMsg.id}`,
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      content,
    });
    setReplies(prev => [...prev, msg]);
    setText("");
    setSending(false);
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="w-72 flex-shrink-0 bg-[#111111] border-l border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span className="text-white font-semibold text-sm">Thread</span>
          {replies.length > 0 && (
            <span className="text-xs text-gray-500">{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b border-gray-800 bg-[#141414]">
        <p className="text-gray-500 text-xs mb-1">{parentMsg.sender_name || parentMsg.sender_email}</p>
        <p className="text-gray-200 text-sm">{parentMsg.content}</p>
        <p className="text-gray-600 text-xs mt-1">{formatTime(parentMsg.created_date)}</p>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {replies.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            <p className="text-xs">No replies yet</p>
            <p className="text-xs mt-0.5">Be the first to reply</p>
          </div>
        )}
        {replies.map(msg => {
          const isMe = msg.sender_email === user?.email;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && <span className="text-gray-500 text-xs ml-1">{msg.sender_name || msg.sender_email}</span>}
                <div className={`px-3 py-2 rounded-xl text-xs ${isMe ? "text-white rounded-br-sm" : "bg-[#1e1e1e] text-gray-200 rounded-bl-sm"}`}
                  style={isMe ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                  {msg.content}
                </div>
                <span className="text-gray-600 text-xs mx-1">{formatTime(msg.created_date)}</span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Reply in thread..."
            rows={1}
            className="flex-1 bg-[#1e1e1e] border border-gray-700 rounded-xl px-3 py-2 text-white text-xs placeholder-gray-500 outline-none resize-none"
          />
          <button onClick={send} disabled={!text.trim() || sending}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}