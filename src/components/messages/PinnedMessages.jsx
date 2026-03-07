import { X, Pin, FileText } from "lucide-react";

export default function PinnedMessages({ pinned, onUnpin, onClose, onJumpTo }) {
  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString([], { month:"short", day:"numeric" }) : "";

  return (
    <div className="w-72 flex-shrink-0 bg-[#111111] border-l border-gray-800 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} />
          <span className="text-white font-semibold text-sm">Pinned Messages</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400">{pinned.length}</span>
        </div>
        <button onClick={onClose}><X className="w-4 h-4 text-gray-500 hover:text-white" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {pinned.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <Pin className="w-6 h-6 mx-auto mb-2 opacity-20" />
            <p className="text-xs">No pinned messages</p>
          </div>
        ) : pinned.map(msg => (
          <div key={msg.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary,#3b82f6)44" }}>
                {(msg.sender_name || msg.sender_email)?.[0]?.toUpperCase()}
              </div>
              <span className="text-white text-xs font-semibold">{msg.sender_name || msg.sender_email}</span>
              <span className="text-gray-600 text-xs ml-auto">{fmt(msg.created_date)}</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed line-clamp-3">
              {msg.attachment_url ? (
                <span className="flex items-center gap-1 text-blue-400"><FileText className="w-3 h-3" /> {msg.content}</span>
              ) : msg.content}
            </p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => onJumpTo(msg)} className="text-xs text-[var(--color-primary,#3b82f6)] hover:underline">Jump to</button>
              <button onClick={() => onUnpin(msg.id)} className="text-xs text-gray-600 hover:text-red-400 ml-auto">Unpin</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}