import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  MessageSquare, Plus, Send, Users, User, ChevronLeft,
  Lock, X, Check, Hash, Paperclip, FileText, Download,
  Search, Megaphone, ChevronDown, ChevronUp, Shield
} from "lucide-react";

// ─── SECURITY HELPERS ──────────────────────────────────────────────────────
// Returns true only if user is a participant in this conversation
const canAccessConvo = (convo, userEmail) => convo?.participants?.includes(userEmail);

// Returns filtered users the current user is allowed to DM
const getAllowedUsers = (allUsers, currentUser) => {
  const myType = currentUser?.user_type || "coach";
  const myEmail = currentUser?.email;

  return allUsers.filter(u => {
    if (u.email === myEmail) return false;
    const theirType = u.user_type || "coach";

    // Players can only message coaches of their assigned sports
    if (myType === "player") {
      return theirType === "coach" || theirType === "admin";
    }
    // Parents can message coaches + other parents on same team
    if (myType === "parent") {
      if (theirType === "coach" || theirType === "admin") return true;
      if (theirType === "parent" && u.team_id === currentUser?.team_id) return true;
      return false;
    }
    // Coaches can message anyone: other coaches (any org), ADs, players on their team, parents on their team
    return true;
  });
};

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
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  const myType = user?.user_type || "coach";
  const isCoachOrAdmin = myType === "coach" || myType === "admin" || user?.role === "admin";

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const res = await base44.functions.invoke('getTeamUsers', {});
      setAllUsers(res.data || []);
      loadConversations(u);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeConvo) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === activeConvo.id) {
        if (event.type === "create") setMessages(prev => prev.find(m => m.id === event.id) ? prev : [...prev, event.data]);
      }
    });
    return unsub;
  }, [activeConvo?.id]);

  const loadConversations = async (u) => {
    const all = await base44.entities.Conversation.list("-updated_date");
    // Only show conversations this user is a participant of
    const mine = all.filter(c => canAccessConvo(c, u?.email));
    setConversations(mine);
    setLoading(false);
  };

  const openConversation = async (convo) => {
    // Security: ensure user is actually a participant
    if (!canAccessConvo(convo, user?.email)) return;
    setActiveConvo(convo);
    const msgs = await base44.entities.Message.filter({ conversation_id: convo.id }, "created_date");
    setMessages(msgs);
  };

  const sendMessage = async (attachmentUrl = null, attachmentName = null) => {
    let content = attachmentUrl ? (newMessage.trim() || attachmentName) : newMessage.trim();
    if (!content || sending) return;
    if (!activeConvo || !canAccessConvo(activeConvo, user?.email)) return;
    if (isAnnouncement) content = `📢 ${content}`;
    setIsAnnouncement(false);
    setSending(true);
    const msg = await base44.entities.Message.create({
      conversation_id: activeConvo.id,
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      content,
      attachment_url: attachmentUrl || null,
    });
    setMessages(prev => [...prev, msg]);
    await base44.entities.Conversation.update(activeConvo.id, {
      last_message: content.substring(0, 60),
      last_message_time: new Date().toISOString(),
    });
    setNewMessage("");
    setSending(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await sendMessage(file_url, file.name);
    setUploading(false);
    e.target.value = "";
  };

  const createConversation = async () => {
    if (selectedUsers.length === 0) return;
    const participants = [user?.email, ...selectedUsers.map(u => u.email)];
    const participantNames = [user?.full_name || user?.email, ...selectedUsers.map(u => u.full_name || u.email)];
    const name = newConvoType === "group"
      ? (groupName.trim() || participantNames.slice(0, 3).join(", "))
      : null;

    // Check for existing DM
    if (newConvoType === "direct") {
      const otherEmail = selectedUsers[0].email;
      const existing = conversations.find(c =>
        c.type === "direct" &&
        c.participants?.includes(user?.email) &&
        c.participants?.includes(otherEmail)
      );
      if (existing) {
        openConversation(existing);
        setShowNewConvo(false);
        setSelectedUsers([]);
        return;
      }
    }

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
    if (convo.type === "direct") {
      const other = convo.participants?.find(p => p !== user?.email);
      const idx = convo.participants?.indexOf(other);
      return convo.participant_names?.[idx] || other || "Unknown";
    }
    return convo.name || convo.participant_names?.filter(n => n !== (user?.full_name || user?.email)).join(", ") || "Group";
  };

  const allowedUsers = getAllowedUsers(allUsers, user);
  const filteredUsers = allowedUsers.filter(u =>
    u.full_name?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.coaching_role?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.school_name?.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const directConvos = conversations.filter(c => c.type === "direct");
  const groupConvos = conversations.filter(c => c.type === "group");

  const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const isImage = (url) => url && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url);

  const getUserTypeBadge = (u) => {
    const t = u.user_type || "coach";
    if (t === "player") return <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Player</span>;
    if (t === "parent") return <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">Parent</span>;
    if (u.coaching_role === "athletic_director" || t === "admin") return <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">AD</span>;
    return null;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <div className="w-10 h-10 border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hasActive = !!activeConvo;

  return (
    <div className="bg-[#0a0a0a] h-full flex overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-72 flex-shrink-0 bg-[#111111] border-r border-gray-800 flex flex-col ${hasActive ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" />
              <span className="text-white font-black text-lg">NxMessage</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Secure</span>
            </div>
            <button onClick={() => setShowNewConvo(v => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-gray-500 text-xs">
            {myType === "coach" || myType === "admin" ? "Message coaches across all organizations, players & parents" :
             myType === "player" ? "Message your coaches" :
             "Message coaches & other parents"}
          </p>
        </div>

        {/* New Convo Panel */}
        {showNewConvo && (
          <div className="p-4 border-b border-gray-800 bg-[#141414] space-y-3 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center">
              <span className="text-white text-sm font-semibold">New Message</span>
              <button onClick={() => { setShowNewConvo(false); setSelectedUsers([]); setSearchUsers(""); }}><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            {isCoachOrAdmin && (
              <div className="flex gap-2">
                <button onClick={() => setNewConvoType("direct")} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${newConvoType === "direct" ? "text-white" : "bg-gray-800 text-gray-400"}`} style={newConvoType === "direct" ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>Direct</button>
                <button onClick={() => setNewConvoType("group")} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${newConvoType === "group" ? "text-white" : "bg-gray-800 text-gray-400"}`} style={newConvoType === "group" ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>Group</button>
              </div>
            )}
            {newConvoType === "group" && (
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name..." className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none" />
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input value={searchUsers} onChange={e => setSearchUsers(e.target.value)} placeholder="Search by name, school, role..." className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm placeholder-gray-500 outline-none" />
            </div>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedUsers.map(u => (
                  <span key={u.id} className="flex items-center gap-1 bg-[var(--color-primary,#3b82f6)]/20 text-[var(--color-primary,#3b82f6)] text-xs px-2 py-0.5 rounded-full">
                    {u.full_name || u.email}
                    <button onClick={() => setSelectedUsers(prev => prev.filter(p => p.id !== u.id))}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="space-y-0.5">
              {filteredUsers.length === 0 && searchUsers && <p className="text-gray-600 text-xs text-center py-3">No users found</p>}
              {filteredUsers.map(u => (
                <button key={u.id} onClick={() => {
                  if (newConvoType === "direct") setSelectedUsers([u]);
                  else setSelectedUsers(prev => prev.find(p => p.id === u.id) ? prev.filter(p => p.id !== u.id) : [...prev, u]);
                }} className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${selectedUsers.find(p => p.id === u.id) ? "bg-[var(--color-primary,#3b82f6)]/20" : "hover:bg-white/5"}`}>
                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white flex-shrink-0 font-bold">
                    {(u.full_name || u.email)?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="text-white text-xs font-medium truncate">{u.full_name || u.email}</p>
                      {getUserTypeBadge(u)}
                    </div>
                    <p className="text-gray-500 text-xs truncate">{u.coaching_role?.replace(/_/g," ") || u.role?.replace(/_/g," ")} {u.school_name ? `· ${u.school_name}` : ""}</p>
                  </div>
                  {selectedUsers.find(p => p.id === u.id) && <Check className="w-3 h-3 text-[var(--color-primary,#3b82f6)] ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
            {selectedUsers.length > 0 && (
              <button onClick={createConversation} className="w-full py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
                Start Conversation ({selectedUsers.length})
              </button>
            )}
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {directConvos.length === 0 && groupConvos.length === 0 && (
            <div className="text-center py-12 text-gray-600 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No conversations yet</p>
              <p className="text-xs mt-1">Click + to start messaging</p>
            </div>
          )}

          {groupConvos.length > 0 && (
            <>
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-1 mb-1">Groups</p>
              {groupConvos.map(convo => <ConvoItem key={convo.id} convo={convo} active={activeConvo?.id === convo.id} user={user} getDisplayName={getConvoDisplayName} onClick={() => openConversation(convo)} />)}
              <div className="my-1 border-t border-gray-800/50" />
            </>
          )}

          {directConvos.length > 0 && (
            <>
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-1 mb-1">Direct Messages</p>
              {directConvos.map(convo => <ConvoItem key={convo.id} convo={convo} active={activeConvo?.id === convo.id} user={user} getDisplayName={getConvoDisplayName} onClick={() => openConversation(convo)} />)}
            </>
          )}
        </div>

        {/* Identity */}
        <div className="px-3 pb-3 border-t border-gray-800 pt-2">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#3b82f6)66" }}>
              {user?.full_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user?.full_name || user?.email}</p>
              <p className="text-gray-600 text-xs capitalize">{user?.coaching_role?.replace(/_/g," ") || myType}</p>
            </div>
            <Lock className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        {hasActive ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-[#111111] border-b border-gray-800 px-4 py-3 flex items-center gap-3">
              <button className="md:hidden text-gray-400" onClick={() => setActiveConvo(null)}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#3b82f6)22" }}>
                {activeConvo?.type === "group" ? <Users className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} /> : <User className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{getConvoDisplayName(activeConvo)}</p>
                <div className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-green-500" />
                  <p className="text-xs text-gray-500">{activeConvo?.type === "group" ? `${activeConvo.participants?.length} members · private group` : "Private · End-to-end secured"}</p>
                </div>
              </div>
              {/* Announcement button for coaches/admins in group chats */}
              {isCoachOrAdmin && activeConvo?.type === "group" && (
                <button onClick={() => setIsAnnouncement(v => !v)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isAnnouncement ? "text-yellow-400" : "text-gray-500 hover:text-gray-300"}`}
                  style={isAnnouncement ? { backgroundColor: "rgba(234,179,8,0.15)" } : {}}
                  title="Send as announcement">
                  <Megaphone className="w-4 h-4" />
                </button>
              )}
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
                const isAnnouncementMsg = msg.content?.startsWith("📢 ");
                return (
                  <div key={msg.id} className={`flex group ${isMe ? "justify-end" : "justify-start"} ${isAnnouncementMsg ? "bg-yellow-500/5 rounded-xl px-2 py-1 border border-yellow-500/10" : ""}`}>
                    <div className={`max-w-xs md:max-w-md lg:max-w-lg flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && <span className="text-gray-500 text-xs ml-1">{msg.sender_name || msg.sender_email}</span>}
                      {msg.attachment_url ? (
                        <div className={`rounded-2xl overflow-hidden border ${isMe ? "border-transparent" : "border-gray-700"}`} style={isMe ? { backgroundColor: "var(--color-primary,#3b82f6)33" } : { backgroundColor: "#1e1e1e" }}>
                          {isImage(msg.attachment_url) ? (
                            <img src={msg.attachment_url} alt="attachment" className="max-w-xs max-h-64 object-contain" />
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 hover:bg-white/5">
                              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                              <span className="text-gray-200 text-sm">{msg.content}</span>
                              <Download className="w-4 h-4 text-gray-500 ml-2" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "rounded-br-sm text-white" : "bg-[#1e1e1e] text-gray-200 rounded-bl-sm"}`}
                          style={isMe ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                          {msg.content}
                        </div>
                      )}
                      <span className="text-gray-600 text-xs mx-1">{formatTime(msg.created_date)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-[#111111] border-t border-gray-800">
              {isAnnouncement && (
                <div className="mb-2 flex items-center gap-2 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <Megaphone className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-yellow-300 text-xs flex-1">Announcement mode</span>
                  <button onClick={() => setIsAnnouncement(false)}><X className="w-3.5 h-3.5 text-yellow-500" /></button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-300">
                  {uploading ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={`Message ${getConvoDisplayName(activeConvo)}...`}
                  rows={1}
                  className="flex-1 bg-[#1e1e1e] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)] resize-none"
                />
                <button onClick={() => sendMessage()} disabled={!newMessage.trim() || sending}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-[#0a0a0a]">
            <div className="text-center text-gray-600">
              <Lock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">NxMessage</p>
              <p className="text-sm mt-1">Select a conversation or start a new one</p>
              <p className="text-xs mt-2 text-gray-700">All messages are private and secure</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConvoItem({ convo, active, user, getDisplayName, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5 transition-all text-left ${active ? "bg-[var(--color-primary,#3b82f6)]/15" : "hover:bg-white/5"}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs" style={{ backgroundColor: "var(--color-primary,#3b82f6)33" }}>
        {convo.type === "group" ? <Users className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" /> : <span style={{ color: "var(--color-primary,#3b82f6)" }}>{getDisplayName(convo)[0]?.toUpperCase()}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{getDisplayName(convo)}</p>
        <p className="text-gray-500 text-xs truncate">{convo.last_message || "No messages yet"}</p>
      </div>
    </button>
  );
}