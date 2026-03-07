import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  MessageSquare, Plus, Send, Users, User, ChevronLeft,
  Lock, Search, X, Check, Smile
} from "lucide-react";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newConvoType, setNewConvoType] = useState("direct");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const messagesEndRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const EMOJIS = ["😂","😭","🔥","💪","🏈","🙌","👊","💯","🎯","⚡","🏆","😤","👏","🙏","😮","💀","😎","🤙","👍","❤️","🎉","🤣","😅","😆","😊","🥶","🤯","💥","🚀","🔒"];

  const insertEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmoji(false);
  };

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadConversations(u);
    }).catch(() => {});
    base44.entities.User.list().then(setAllUsers).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeConvo) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === activeConvo.id) {
        if (event.type === "create") setMessages(prev => [...prev, event.data]);
      }
    });
    return unsub;
  }, [activeConvo?.id]);

  const loadConversations = async (u) => {
    const all = await base44.entities.Conversation.list("-updated_date");
    const mine = all.filter(c => c.participants?.includes(u?.email));
    setConversations(mine);
    setLoading(false);
  };

  const openConversation = async (convo) => {
    setActiveConvo(convo);
    const msgs = await base44.entities.Message.filter({ conversation_id: convo.id }, "created_date");
    setMessages(msgs);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvo || sending) return;
    setSending(true);
    const msg = await base44.entities.Message.create({
      conversation_id: activeConvo.id,
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      content: newMessage.trim(),
    });
    setMessages(prev => [...prev, msg]);
    await base44.entities.Conversation.update(activeConvo.id, {
      last_message: newMessage.trim().substring(0, 60),
      last_message_time: new Date().toISOString(),
    });
    setNewMessage("");
    setSending(false);
  };

  const createConversation = async () => {
    if (selectedUsers.length === 0) return;
    const participants = [user?.email, ...selectedUsers.map(u => u.email)];
    const participantNames = [user?.full_name || user?.email, ...selectedUsers.map(u => u.full_name || u.email)];
    const name = newConvoType === "group"
      ? groupName.trim() || participantNames.join(", ")
      : null;
    const convo = await base44.entities.Conversation.create({
      type: newConvoType,
      name,
      participants,
      participant_names: participantNames,
      created_by: user?.email,
    });
    setConversations(prev => [convo, ...prev]);
    setShowNewConvo(false);
    setSelectedUsers([]);
    setGroupName("");
    openConversation(convo);
  };

  const getConvoDisplayName = (convo) => {
    if (convo.name) return convo.name;
    if (convo.type === "direct") {
      const other = convo.participants?.find(p => p !== user?.email);
      const idx = convo.participants?.indexOf(other);
      return convo.participant_names?.[idx] || other || "Unknown";
    }
    return convo.participant_names?.filter(n => n !== (user?.full_name || user?.email)).join(", ") || "Group";
  };

  const filteredUsers = allUsers.filter(u =>
    u.email !== user?.email &&
    (u.full_name?.toLowerCase().includes(searchUsers.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchUsers.toLowerCase()))
  );

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <div className="w-10 h-10 border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] h-full flex overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-72 flex-shrink-0 bg-[#111111] border-r border-gray-800 flex flex-col ${activeConvo ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" />
            <span className="text-white font-black text-lg">NxMessage</span>
          </div>
          <button
            onClick={() => setShowNewConvo(true)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* New Convo Modal */}
        {showNewConvo && (
          <div className="p-4 border-b border-gray-800 bg-[#141414] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white text-sm font-semibold">New Conversation</span>
              <button onClick={() => setShowNewConvo(false)}><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setNewConvoType("direct")} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${newConvoType === "direct" ? "text-white" : "bg-gray-800 text-gray-400"}`} style={newConvoType === "direct" ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                Direct
              </button>
              <button onClick={() => setNewConvoType("group")} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${newConvoType === "group" ? "text-white" : "bg-gray-800 text-gray-400"}`} style={newConvoType === "group" ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                Group
              </button>
            </div>
            {newConvoType === "group" && (
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name..." className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none" />
            )}
            <input value={searchUsers} onChange={e => setSearchUsers(e.target.value)} placeholder="Search coaches..." className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none" />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredUsers.map(u => (
                <button key={u.id} onClick={() => {
                  if (newConvoType === "direct") {
                    setSelectedUsers([u]);
                  } else {
                    setSelectedUsers(prev => prev.find(p => p.id === u.id) ? prev.filter(p => p.id !== u.id) : [...prev, u]);
                  }
                }} className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${selectedUsers.find(p => p.id === u.id) ? "bg-[var(--color-primary,#3b82f6)]/20" : "hover:bg-white/5"}`}>
                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white flex-shrink-0">
                    {(u.full_name || u.email)?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">{u.full_name || u.email}</p>
                    <p className="text-gray-500 text-xs truncate capitalize">{u.role?.replace(/_/g, " ")}</p>
                  </div>
                  {selectedUsers.find(p => p.id === u.id) && <Check className="w-3 h-3 text-[var(--color-primary,#3b82f6)] ml-auto" />}
                </button>
              ))}
            </div>
            {selectedUsers.length > 0 && (
              <button onClick={createConversation} className="w-full py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
                Start Conversation
              </button>
            )}
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-10 text-gray-600 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new conversation above</p>
            </div>
          ) : (
            conversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => openConversation(convo)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 transition-all text-left hover:bg-white/3 ${activeConvo?.id === convo.id ? "bg-[var(--color-primary,#3b82f6)]/10 border-l-2 border-l-[var(--color-primary,#3b82f6)]" : ""}`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ backgroundColor: "var(--color-primary,#3b82f6)33" }}>
                  {convo.type === "group" ? <Users className="w-5 h-5 text-[var(--color-primary,#3b82f6)]" /> : <span style={{ color: "var(--color-primary,#3b82f6)" }}>{getConvoDisplayName(convo)[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm font-semibold truncate">{getConvoDisplayName(convo)}</p>
                    {convo.last_message_time && <span className="text-gray-600 text-xs flex-shrink-0">{formatTime(convo.last_message_time)}</span>}
                  </div>
                  <p className="text-gray-500 text-xs truncate mt-0.5">{convo.last_message || "No messages yet"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeConvo ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#111111] border-b border-gray-800">
            <button className="md:hidden text-gray-400" onClick={() => setActiveConvo(null)}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#3b82f6)33" }}>
              {activeConvo.type === "group" ? <Users className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" /> : <User className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" />}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{getConvoDisplayName(activeConvo)}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Lock className="w-2.5 h-2.5" /> <span>Secure · {activeConvo.type === "group" ? `${activeConvo.participants?.length} members` : "Direct Message"}</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10 text-gray-600">
                <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Start the conversation</p>
                <p className="text-xs mt-1">Messages are private and secure</p>
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.sender_email === user?.email;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs md:max-w-md lg:max-w-lg ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {!isMe && <span className="text-gray-500 text-xs ml-1">{msg.sender_name || msg.sender_email}</span>}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "rounded-br-sm text-white" : "bg-[#1e1e1e] text-gray-200 rounded-bl-sm"}`}
                      style={isMe ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                      {msg.content}
                    </div>
                    <span className="text-gray-600 text-xs mx-1">{formatTime(msg.created_date)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-[#111111] border-t border-gray-800">
            {showEmoji && (
              <div className="mb-2 bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => insertEmoji(e)} className="text-xl hover:scale-125 transition-transform leading-none">{e}</button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                onClick={() => setShowEmoji(v => !v)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${showEmoji ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                style={showEmoji ? { backgroundColor: "var(--color-primary,#3b82f6)22" } : {}}
              >
                <Smile className="w-5 h-5" />
              </button>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-[#1e1e1e] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)] resize-none"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-50 transition-all"
                style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#0a0a0a]">
          <div className="text-center text-gray-600">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">Select a conversation</p>
            <p className="text-sm mt-1">Or start a new one</p>
          </div>
        </div>
      )}
    </div>
  );
}