import { useState, useMemo } from "react";
import { Search, X, Calendar, User, FileText } from "lucide-react";

export default function MessageSearch({ messages, allUsers, onClose, onJumpTo }) {
  const [keyword, setKeyword] = useState("");
  const [sender, setSender] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const results = useMemo(() => {
    return messages.filter(m => {
      const kw = keyword.trim().toLowerCase();
      if (kw && !m.content?.toLowerCase().includes(kw)) return false;
      if (sender && m.sender_email !== sender) return false;
      if (dateFrom && new Date(m.created_date) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo); to.setHours(23,59,59);
        if (new Date(m.created_date) > to) return false;
      }
      return true;
    });
  }, [messages, keyword, sender, dateFrom, dateTo]);

  const senders = useMemo(() => {
    const map = {};
    messages.forEach(m => { if (m.sender_email) map[m.sender_email] = m.sender_name || m.sender_email; });
    return Object.entries(map).map(([email, name]) => ({ email, name }));
  }, [messages]);

  const fmt = (iso) => iso ? new Date(iso).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "";

  return (
    <div className="absolute inset-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-[#111111]">
        <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <input
          autoFocus
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none"
        />
        <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-white" /></button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-gray-800 bg-[#111111]">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-gray-500" />
          <select value={sender} onChange={e => setSender(e.target.value)}
            className="bg-[#1a1a1a] border border-gray-700 rounded-lg text-xs text-gray-300 px-2 py-1 outline-none">
            <option value="">All senders</option>
            {senders.map(s => <option key={s.email} value={s.email}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-500" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-[#1a1a1a] border border-gray-700 rounded-lg text-xs text-gray-300 px-2 py-1 outline-none" />
          <span className="text-gray-600 text-xs">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-[#1a1a1a] border border-gray-700 rounded-lg text-xs text-gray-300 px-2 py-1 outline-none" />
        </div>
        {(keyword || sender || dateFrom || dateTo) && (
          <button onClick={() => { setKeyword(""); setSender(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {results.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No messages found</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 text-xs mb-3">{results.length} result{results.length !== 1 ? "s" : ""}</p>
            {results.map(msg => (
              <button key={msg.id} onClick={() => { onJumpTo(msg); onClose(); }}
                className="w-full text-left bg-[#141414] border border-gray-800 hover:border-gray-700 rounded-xl p-3 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: "var(--color-primary,#3b82f6)44" }}>
                    {(msg.sender_name || msg.sender_email)?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-white text-xs font-semibold">{msg.sender_name || msg.sender_email}</span>
                  <span className="text-gray-600 text-xs ml-auto">{fmt(msg.created_date)}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed line-clamp-2">
                  {msg.attachment_url ? (
                    <span className="flex items-center gap-1 text-blue-400"><FileText className="w-3 h-3" /> {msg.content}</span>
                  ) : (
                    highlightKeyword(msg.content, keyword)
                  )}
                </p>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function highlightKeyword(text, keyword) {
  if (!keyword || !text) return text;
  const parts = text.split(new RegExp(`(${keyword})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase()
      ? <mark key={i} className="bg-yellow-500/30 text-yellow-300 rounded px-0.5">{part}</mark>
      : part
  );
}