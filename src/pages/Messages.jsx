import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  MessageSquare, Plus, Send, Users, User, ChevronLeft,
  Lock, X, Check, Smile, Hash, Paperclip, FileText, Download, MessageCircle
} from "lucide-react";
import ChannelsList, { DEFAULT_CHANNELS } from "../components/messages/ChannelsList";
import ThreadPanel from "../components/messages/ThreadPanel";
import PresenceDot from "../components/messages/PresenceDot";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newConvoType, setNewConvoType] = useState("direct");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [sidebarTab, setSidebarTab] = useState("channels"); // "channels" | "dms"
  const messagesEndRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [threadMsg, setThreadMsg] = useState(null); // message being threaded
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const presenceRef = useRef(null);

  const EMOJIS = ["😂","😭","🔥","💪","🏈","🙌","👊","💯","🎯","⚡","🏆","😤","👏","🙏","😮","💀","😎","🤙","👍","❤️","🎉","🤣","😅","😆","😊","🥶","🤯","💥","🚀","🔒"];

  const insertEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmoji(false);
  };

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadConversations(u);
      // Simulate presence: mark all users as online if they messaged in last 10 min
      base44.entities.Message.list("-created_date", 50).then(recent => {
        const cutoff = Date.now() - 10 * 60 * 1000;
        const active = new Set(
          recent.filter(m => new Date(m.created_date).getTime() > cutoff).map(m => m.sender_email)
        );
        setOnlineUsers(active);
      }).catch(() => {});
    }).catch(() => {});
    base44.entities.User.list().then(setAllUsers).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeConvo && !activeChannel) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      const id = activeConvo?.id || activeChannel?.id;
      if (event.data?.conversation_id === id) {
        if (event.type === "create") setMessages(prev => [...prev, event.data]);
      }
    });
    return unsub;
  }, [activeConvo?.id, activeChannel?.id]);

  const loadConversations = async (u) => {
    const all = await base44.entities.Conversation.list("-updated_date");
    const mine = all.filter(c => c.participants?.includes(u?.email));
    setConversations(mine);
    setLoading(false);
  };

  const openConversation = async (convo) => {
    setActiveConvo(convo);
    setActiveChannel(null);
    const msgs = await base44.entities.Message.filter({ conversation_id: convo.id }, "created_date");
    setMessages(msgs);
  };

  const openChannel = async (ch) => {
    // Find or create a group conversation for this channel
    let convo = conversations.find(c => c.name === `#${ch.name}` && c.type === "group");
    if (!convo) {
      convo = await base44.entities.Conversation.create({
        type: "group",
        name: `#${ch.name}`,
        participants: [user?.email],
        participant_names: [user?.full_name || user?.email],
        created_by: user?.email,
      });
      setConversations(prev => [convo, ...prev]);
    }
    setActiveChannel({ ...ch, id: convo.id });
    setActiveConvo(null);
    const msgs = await base44.entities.Message.filter({ conversation_id: convo.id }, "created_date");
    setMessages(msgs);
  };

  const sendMessage = async (attachmentUrl = null, attachmentName = null) => {
    const content = attachmentUrl ? (newMessage.trim() || attachmentName) : newMessage.trim();
    if (!content || sending) return;
    const convoId = activeConvo?.id || activeChannel?.id;
    if (!convoId) return;
    setSending(true);
    const msg = await base44.entities.Message.create({
      conversation_id: convoId,
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      content,
      attachment_url: attachmentUrl || null,
    });
    setMessages(prev => [...prev, msg]);
    await base44.entities.Conversation.update(convoId, {
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
    setSidebarTab("dms");
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

  const dmConvos = conversations.filter(c => !c.name?.startsWith("#"));

  const formatTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const activeTitle = activeChannel
    ? `# ${activeChannel.name}`
    : activeConvo ? getConvoDisplayName(activeConvo) : "";

  const isFile = (msg) => msg.attachment_url;
  const isImage = (url) => url && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url);

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <div className="w-10 h-10 border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hasActive = activeConvo || activeChannel;

  return (
    <div className="bg-[#0a0a0a] h-full flex overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-64 flex-shrink-0 bg-[#111111] border-r border-gray-800 flex flex-col ${hasActive ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" />
              <span className="text-white font-black text-lg">NxMessage</span>
            </div>
            <button onClick={() => setShowNewConvo(v => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Sidebar tabs */}
          <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-0.5">
            {[{ id: "channels", label: "Channels" }, { id: "dms", label: "DMs" }].map(t => (
              <button key={t.id} onClick={() => setSidebarTab(t.id)}
                className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${sidebarTab === t.id ? "text-white" : "text-gray-500"}`}
                style={sidebarTab === t.id ? { backgroundColor: "var(--color-primary,#3b82f6)33", color: "var(--color-primary,#3b82f6)" } : {}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* New Convo Panel */}
        {showNewConvo && (
          <div className="p-4 border-b border-gray-800 bg-[#141414] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white text-sm font-semibold">New Direct Message</span>
              <button onClick={() => setShowNewConvo(false)}><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setNewConvoType("direct")} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${newConvoType === "direct" ? "text-white" : "bg-gray-800 text-gray-400"}`} style={newConvoType === "direct" ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>Direct</button>
              <button onClick={() => setNewConvoType("group")} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${newConvoType === "group" ? "text-white" : "bg-gray-800 text-gray-400"}`} style={newConvoType === "group" ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>Group</button>
            </div>
            {newConvoType === "group" && (
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name..." className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none" />
            )}
            <input value={searchUsers} onChange={e => setSearchUsers(e.target.value)} placeholder="Search people..." className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none" />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredUsers.map(u => (
                <button key={u.id} onClick={() => {
                  if (newConvoType === "direct") setSelectedUsers([u]);
                  else setSelectedUsers(prev => prev.find(p => p.id === u.id) ? prev.filter(p => p.id !== u.id) : [...prev, u]);
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

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {sidebarTab === "channels" && (
            <ChannelsList
              activeChannelId={activeChannel?.id ? DEFAULT_CHANNELS.find(c => `#${c.name}` === conversations.find(cv => cv.id === activeChannel.id)?.name)?.id : null}
              onSelect={openChannel}
            />
          )}

          {sidebarTab === "dms" && (
            <>
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-1 mb-1">Direct Messages</p>
              {dmConvos.length === 0 ? (
                <div className="text-center py-8 text-gray-600 px-3">
                  <User className="w-6 h-6 mx-auto mb-1 opacity-30" />
                  <p className="text-xs">No DMs yet</p>
                </div>
              ) : dmConvos.map(convo => {
                const otherEmail = convo.type === "direct" ? convo.participants?.find(p => p !== user?.email) : null;
                const isOnline = otherEmail ? onlineUsers.has(otherEmail) : false;
                return (
                <button key={convo.id} onClick={() => openConversation(convo)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5 transition-all text-left ${activeConvo?.id === convo.id ? "bg-[var(--color-primary,#3b82f6)]/15" : "hover:bg-white/5"}`}>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs" style={{ backgroundColor: "var(--color-primary,#3b82f6)33" }}>
                      {convo.type === "group" ? <Users className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" /> : <span style={{ color: "var(--color-primary,#3b82f6)" }}>{getConvoDisplayName(convo)[0]?.toUpperCase()}</span>}
                    </div>
                    {convo.type === "direct" && (
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111111] ${isOnline ? "bg-green-400" : "bg-gray-600"}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{getConvoDisplayName(convo)}</p>
                    <p className="text-gray-500 text-xs truncate">{convo.last_message || "No messages yet"}</p>
                  </div>
                </button>
                );
              })}
            </>
          )}
        </div>

        {/* Online indicator legend */}
        <div className="px-3 pb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
          <span className="text-gray-600 text-xs">Active recently</span>
        </div>
      </div>

      {/* Chat Area */}
      {hasActive ? (
        <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#111111] border-b border-gray-800">
            <button className="md:hidden text-gray-400" onClick={() => { setActiveConvo(null); setActiveChannel(null); }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#3b82f6)22" }}>
              {activeChannel ? <Hash className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} /> :
               activeConvo?.type === "group" ? <Users className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} /> :
               <User className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} />}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{activeTitle}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Lock className="w-2.5 h-2.5" />
                <span>{activeChannel ? activeChannel.description || "Team channel" : `${activeConvo?.type === "group" ? `${activeConvo.participants?.length} members` : "Direct Message"}`}</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10 text-gray-600">
                {activeChannel ? <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" /> : <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />}
                <p className="text-sm">{activeChannel ? `Welcome to #${activeChannel.name}` : "Start the conversation"}</p>
                <p className="text-xs mt-1">{activeChannel ? activeChannel.description : "Messages are private and secure"}</p>
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.sender_email === user?.email;
              const hasAttachment = msg.attachment_url;
              const isThreaded = threadMsg?.id === msg.id;
              return (
                <div key={msg.id} className={`flex group ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs md:max-w-md lg:max-w-lg ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {!isMe && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <PresenceDot isOnline={onlineUsers.has(msg.sender_email)} />
                        <span className="text-gray-500 text-xs">{msg.sender_name || msg.sender_email}</span>
                      </div>
                    )}
                    {hasAttachment ? (
                      <div className={`rounded-2xl overflow-hidden border ${isMe ? "border-transparent" : "border-gray-700"}`}
                        style={isMe ? { backgroundColor: "var(--color-primary,#3b82f6)33" } : { backgroundColor: "#1e1e1e" }}>
                        {isImage(msg.attachment_url) ? (
                          <img src={msg.attachment_url} alt="attachment" className="max-w-xs max-h-64 object-contain" />
                        ) : (
                          <a href={msg.attachment_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-all">
                            <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            <span className="text-gray-200 text-sm">{msg.content}</span>
                            <Download className="w-4 h-4 text-gray-500 ml-2" />
                          </a>
                        )}
                        {msg.content && isImage(msg.attachment_url) && (
                          <p className="px-3 py-2 text-gray-200 text-sm">{msg.content}</p>
                        )}
                      </div>
                    ) : (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "rounded-br-sm text-white" : "bg-[#1e1e1e] text-gray-200 rounded-bl-sm"}`}
                        style={isMe ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                        {msg.content}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mx-1">
                      <span className="text-gray-600 text-xs">{formatTime(msg.created_date)}</span>
                      <button
                        onClick={() => setThreadMsg(isThreaded ? null : msg)}
                        className={`flex items-center gap-1 text-xs transition-all opacity-0 group-hover:opacity-100 ${isThreaded ? "opacity-100 text-[var(--color-primary,#3b82f6)]" : "text-gray-600 hover:text-gray-400"}`}>
                        <MessageCircle className="w-3 h-3" />
                        <span>Reply</span>
                      </button>
                    </div>
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
              <button onClick={() => setShowEmoji(v => !v)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${showEmoji ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                style={showEmoji ? { backgroundColor: "var(--color-primary,#3b82f6)22" } : {}}>
                <Smile className="w-4 h-4" />
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-gray-500 hover:text-gray-300 transition-all">
                {uploading ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Message ${activeChannel ? `#${activeChannel.name}` : activeTitle}...`}
                rows={1}
                className="flex-1 bg-[#1e1e1e] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)] resize-none"
              />
              <button onClick={() => sendMessage()} disabled={!newMessage.trim() || sending}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-50 transition-all"
                style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {/* Thread Panel */}
        {threadMsg && (
          <ThreadPanel parentMsg={threadMsg} user={user} onClose={() => setThreadMsg(null)} />
        )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#0a0a0a]">
          <div className="text-center text-gray-600">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">Select a channel or conversation</p>
            <p className="text-sm mt-1">Use the sidebar to navigate</p>
          </div>
        </div>
      )}
    </div>
  );
}