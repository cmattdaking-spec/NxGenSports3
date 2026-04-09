import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { getToken } from "@/api/apiClient";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  MessageSquare, Plus, Send, Users, User, ChevronLeft,
  Lock, X, Check, Paperclip, FileText, Download,
  Search, Megaphone, Bell
} from "lucide-react";

// ─── Security helpers ─────────────────────────────────────────────────────────
const canAccessConvo = (convo, email) => convo?.participants?.includes(email);

const getAllowedUsers = (allUsers, currentUser) => {
  const myType = currentUser?.user_type || "coach";
  const myEmail = currentUser?.email;
  return allUsers.filter(u => {
    if (u.email === myEmail) return false;
    const theirType = u.user_type || "coach";
    if (myType === "player") return theirType === "coach" || theirType === "admin" || theirType === "player";
    if (myType === "parent") return theirType === "coach" || theirType === "admin";
    return true;
  });
};

// ─── ConvoItem ────────────────────────────────────────────────────────────────
function ConvoItem({ convo, active, user, getDisplayName, onClick, onlineUsers, allUsers }) {
  let isOtherOnline = false;
  if (convo.type === "direct") {
    const otherEmail = convo.participants?.find(p => p !== user?.email);
    const otherUser  = allUsers.find(u => u.email === otherEmail);
    if (otherUser) isOtherOnline = onlineUsers.has(otherUser.id);
  } else {
    isOtherOnline = (convo.participants || [])
      .filter(p => p !== user?.email)
      .some(email => { const u = allUsers.find(u => u.email === email); return u && onlineUsers.has(u.id); });
  }

  return (
    <button data-testid="convo-item" onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all text-left active:scale-[0.98] ${active ? "bg-[var(--color-primary,#3b82f6)]/15 border border-[var(--color-primary,#3b82f6)]/20" : "hover:bg-white/5"}`}>
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: "var(--color-primary,#3b82f6)33" }}>
          {convo.type === "group"
            ? <Users className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} />
            : <span style={{ color: "var(--color-primary,#3b82f6)" }}>{getDisplayName(convo)[0]?.toUpperCase()}</span>}
        </div>
        {isOtherOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#111111]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-white text-sm font-semibold truncate">{getDisplayName(convo)}</p>
          {isOtherOnline && <span className="text-green-400 text-[10px] flex-shrink-0">● online</span>}
        </div>
        <p className="text-gray-500 text-xs truncate">{convo.last_message || "No messages yet"}</p>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Messages() {
  const [user,          setUser]          = useState(null);
  const [allUsers,      setAllUsers]      = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConvo,   setActiveConvo]   = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [newMessage,    setNewMessage]    = useState("");
  const [loading,       setLoading]       = useState(true);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [showNewConvo,  setShowNewConvo]  = useState(false);
  const [newConvoType,  setNewConvoType]  = useState("direct");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName,     setGroupName]     = useState("");
  const [searchUsers,   setSearchUsers]   = useState("");
  const [sending,       setSending]       = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [isAnnouncement,setIsAnnouncement] = useState(false);
  const [onlineUsers,   setOnlineUsers]   = useState(new Set());
  const [showPushBanner,setShowPushBanner] = useState(false);

  const fileInputRef   = useRef(null);
  const messagesEndRef = useRef(null);
  const containerRef   = useRef(null);   // for iOS keyboard height fix
  const wsRef          = useRef(null);
  const wsAlive        = useRef(false);
  const activeConvoRef = useRef(null);

  const { supported: pushSupported, permission, subscribed, subscribe: subscribePush } = usePushNotifications();
  const myType         = user?.user_type || "coach";
  const isCoachOrAdmin = myType === "coach" || myType === "admin" || user?.role === "admin" || user?.role === "super_admin";

  // ─── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const res = await base44.functions.invoke("getTeamUsers", {});
      setAllUsers(res.data || []);
      await loadConversations(u);
    }).catch(() => setLoading(false));
  }, []);

  // ─── iOS keyboard: resize container to visual viewport height ───────────────
  // On iOS, the soft keyboard overlays without resizing window.innerHeight.
  // We use visualViewport to shrink the Messages container so the input bar
  // stays above the keyboard rather than hiding behind it.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      if (containerRef.current) {
        containerRef.current.style.height = `${vv.height}px`;
      }
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      if (containerRef.current) containerRef.current.style.height = '';
    };
  }, []);

  // ─── Re-fetch messages when app returns to foreground (iOS background) ────
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && activeConvoRef.current && user) {
        base44.entities.Message.filter(
          { conversation_id: activeConvoRef.current.id }, 'created_at', 500
        ).then(msgs => setMessages(msgs)).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.email]);

  // ─── Auto-scroll to latest message ────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (!user) return;
    if (pushSupported && permission === "default" && !subscribed) {
      const t = setTimeout(() => setShowPushBanner(true), 3000);
      return () => clearTimeout(t);
    }
  }, [user?.email, pushSupported, permission, subscribed]);

  // ─── WebSocket: real-time messages + presence ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl    = `${protocol}://${window.location.host}/api/ws/messages/${token}`;
    let unmounted  = false;
    let pingTimer;
    let reconnectTimer;

    const connect = () => {
      if (unmounted) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          wsAlive.current = true;
          pingTimer = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send("ping"); }, 25000);
        };

        ws.onmessage = e => {
          if (e.data === "pong") return;
          try {
            const p = JSON.parse(e.data);
            if (p.type === "presence_init")  { setOnlineUsers(new Set(p.online_users || [])); return; }
            if (p.type === "user_online")     { setOnlineUsers(prev => new Set([...prev, p.user_id])); return; }
            if (p.type === "user_offline")    { setOnlineUsers(prev => { const s = new Set(prev); s.delete(p.user_id); return s; }); return; }
            if (p.type === "new_message")     {
              // Use ref to avoid stale closure
              if (activeConvoRef.current?.id === p.data.conversation_id) {
                setMessages(prev => prev.find(m => m.id === p.data.id) ? prev : [...prev, p.data]);
              }
              setConversations(prev => prev.map(c =>
                c.id === p.data.conversation_id
                  ? { ...c, last_message: (p.data.content || "").substring(0, 60), last_message_time: p.data.created_at }
                  : c
              ));
            }
            if (p.type === "new_conversation") {
              // Reload conversations when a new one is created by someone else
              base44.auth.me().then(u => { if (!unmounted) loadConversations(u); }).catch(() => {});
            }
          } catch {}
        };

        ws.onclose = () => {
          wsAlive.current = false;
          clearInterval(pingTimer);
          if (!unmounted) reconnectTimer = setTimeout(connect, 3000);
        };
        ws.onerror = () => ws.close();
      } catch { if (!unmounted) reconnectTimer = setTimeout(connect, 3000); }
    };

    connect();
    return () => {
      unmounted = true;
      clearInterval(pingTimer);
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [user?.email]);

  // ─── Fallback polling (when WS is down) ────────────────────────────────────
  useEffect(() => {
    if (!activeConvo || !user) return;
    const interval = setInterval(async () => {
      if (wsAlive.current) return;
      try {
        const msgs = await base44.entities.Message.filter({ conversation_id: activeConvo.id }, "created_at", 500);
        setMessages(msgs);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeConvo?.id, user?.email]);

  // ─── Push notification banner (show after 3s if not subscribed) ────────────
  useEffect(() => { activeConvoRef.current = activeConvo; }, [activeConvo]);

  // ─── Data helpers ─────────────────────────────────────────────────────────
  const loadConversations = async u => {
    try {
      const all  = await base44.entities.Conversation.list("-updated_date");
      // Show conversations this user participates in (or all for coaches)
      const mine = all.filter(c => canAccessConvo(c, u?.email));
      setConversations(mine);
    } catch {}
    setLoading(false);
  };

  const openConversation = async convo => {
    if (!canAccessConvo(convo, user?.email)) return;
    setActiveConvo(convo);
    setMessages([]);
    setLoadingMsgs(true);
    try {
      // Sort ascending so oldest shows first (natural chat order)
      const msgs = await base44.entities.Message.filter({ conversation_id: convo.id }, "created_at", 500);
      setMessages(msgs);
    } catch {}
    setLoadingMsgs(false);
  };

  const sendMessage = async (attachmentUrl = null, attachmentName = null) => {
    let content = attachmentUrl ? (newMessage.trim() || attachmentName) : newMessage.trim();
    if (!content || sending || !activeConvo) return;
    if (isAnnouncement) content = `📢 ${content}`;
    setIsAnnouncement(false);
    setSending(true);
    setNewMessage("");           // optimistic clear
    try {
      const msg = await base44.entities.Message.create({
        conversation_id: activeConvo.id,
        sender_email:    user?.email,
        sender_name:     user?.full_name || user?.email,
        content,
        attachment_url:  attachmentUrl || null,
        team_id:         user?.team_id || null,
        school_id:       user?.school_id || null,
      });
      setMessages(prev => [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c.id === activeConvo.id
          ? { ...c, last_message: content.substring(0, 60), last_message_time: new Date().toISOString() }
          : c
      ));
      await base44.entities.Conversation.update(activeConvo.id, {
        last_message:      content.substring(0, 60),
        last_message_time: new Date().toISOString(),
      });
    } catch {
      // Restore the unsent message so the user can retry
      setNewMessage(prev => prev || content);
    }
    setSending(false);
  };

  const handleFileUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await sendMessage(file_url, file.name);
    } catch {}
    setUploading(false);
    e.target.value = "";
  };

  const createConversation = async () => {
    if (!selectedUsers.length) return;
    const participants      = [user?.email, ...selectedUsers.map(u => u.email)];
    const participantNames  = [user?.full_name || user?.email, ...selectedUsers.map(u => u.full_name || u.email)];
    const name              = newConvoType === "group" ? (groupName.trim() || participantNames.slice(0, 3).join(", ")) : null;

    if (newConvoType === "direct") {
      const otherEmail = selectedUsers[0].email;
      const existing   = conversations.find(c => c.type === "direct" && c.participants?.includes(user?.email) && c.participants?.includes(otherEmail));
      if (existing) { openConversation(existing); setShowNewConvo(false); setSelectedUsers([]); return; }
    }

    const convo = await base44.entities.Conversation.create({
      type:             newConvoType,
      name,
      participants,
      participant_names: participantNames,
      created_by:       user?.email,
      team_id:          user?.team_id || null,   // required for RLS filter
      school_id:        user?.school_id || null,
    });
    setConversations(prev => [convo, ...prev]);
    setShowNewConvo(false);
    setSelectedUsers([]);
    setGroupName("");
    openConversation(convo);
  };

  const getConvoDisplayName = convo => {
    if (convo.type === "direct") {
      const other = convo.participants?.find(p => p !== user?.email);
      const idx   = convo.participants?.indexOf(other);
      return convo.participant_names?.[idx] || other || "Unknown";
    }
    return convo.name || convo.participant_names?.filter(n => n !== (user?.full_name || user?.email)).join(", ") || "Group";
  };

  const allowedUsers   = getAllowedUsers(allUsers, user);
  const filteredUsers  = allowedUsers.filter(u =>
    !searchUsers || [u.full_name, u.email, u.coaching_role, u.school_name].some(f => f?.toLowerCase().includes(searchUsers.toLowerCase()))
  );
  const directConvos = conversations.filter(c => c.type === "direct");
  const groupConvos  = conversations.filter(c => c.type === "group");
  const formatTime   = iso => iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const isImage      = url => url && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url);
  const hasActive    = !!activeConvo;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    // Use explicit dvh height so iOS URL-bar changes don't collapse the layout.
    // Do NOT use overflow:hidden at this level — it prevents iOS keyboard from
    // pushing the viewport up (which is the mechanism that keeps the input visible).
    <div ref={containerRef} className="bg-[#0a0a0a] flex" style={{ height: "100%", minHeight: 0 }}>

      {/* ── Conversation Sidebar ─────────────────────────────────────────── */}
      <div className={`flex-shrink-0 bg-[#111111] border-r border-gray-800 flex flex-col transition-all duration-200
        ${hasActive ? "hidden md:flex md:w-72" : "flex w-full md:w-72"}`}>

        {/* Header */}
        <div className="p-4 border-b border-gray-800 safe-area-top">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" />
              <span className="text-white font-black text-lg">NxMessage</span>
              <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Secure</span>
            </div>
            <button data-testid="new-convo-btn" onClick={() => setShowNewConvo(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New conversation panel */}
        {showNewConvo && (
          <div className="border-b border-gray-800 bg-[#141414] flex flex-col max-h-72 overflow-hidden">
            <div className="flex justify-between items-center px-4 pt-3 pb-2 flex-shrink-0">
              <span className="text-white text-sm font-semibold">New Message</span>
              <button onClick={() => { setShowNewConvo(false); setSelectedUsers([]); setSearchUsers(""); }}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {isCoachOrAdmin && (
              <div className="flex gap-2 px-4 mb-2 flex-shrink-0">
                <button onClick={() => setNewConvoType("direct")} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${newConvoType === "direct" ? "text-white" : "bg-gray-800 text-gray-400"}`} style={newConvoType === "direct" ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>Direct</button>
                <button onClick={() => setNewConvoType("group")}  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${newConvoType === "group" ? "text-white" : "bg-gray-800 text-gray-400"}`}  style={newConvoType === "group"  ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>Group</button>
              </div>
            )}
            {newConvoType === "group" && (
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name…"
                className="mx-4 mb-2 bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none flex-shrink-0" />
            )}
            <div className="relative px-4 mb-2 flex-shrink-0">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input value={searchUsers} onChange={e => setSearchUsers(e.target.value)} placeholder="Search…"
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm placeholder-gray-500 outline-none" />
            </div>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 px-4 mb-2 flex-shrink-0">
                {selectedUsers.map(u => (
                  <span key={u.id} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-primary,#3b82f6)22", color: "var(--color-primary,#3b82f6)" }}>
                    {u.full_name || u.email}
                    <button onClick={() => setSelectedUsers(prev => prev.filter(p => p.id !== u.id))}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {filteredUsers.map(u => (
                <button key={u.id} onClick={() => newConvoType === "direct" ? setSelectedUsers([u]) : setSelectedUsers(prev => prev.find(p => p.id === u.id) ? prev.filter(p => p.id !== u.id) : [...prev, u])}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left ${selectedUsers.find(p => p.id === u.id) ? "bg-[var(--color-primary,#3b82f6)]/20" : "hover:bg-white/5"}`}>
                  <div className="relative flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white font-bold">
                      {(u.full_name || u.email)?.[0]?.toUpperCase()}
                    </div>
                    {onlineUsers.has(u.id) && <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-[#141414]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate">{u.full_name || u.email}</p>
                    <p className="text-gray-500 text-xs truncate">{u.coaching_role?.replace(/_/g, " ") || u.role}</p>
                  </div>
                  {selectedUsers.find(p => p.id === u.id) && <Check className="w-3 h-3 flex-shrink-0" style={{ color: "var(--color-primary,#3b82f6)" }} />}
                </button>
              ))}
            </div>
            {selectedUsers.length > 0 && (
              <button onClick={createConversation} className="mx-4 mb-3 py-2 rounded-lg text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
                Start Conversation ({selectedUsers.length})
              </button>
            )}
          </div>
        )}

        {/* Push notification banner */}
        {showPushBanner && !subscribed && (
          <div className="mx-3 my-2 rounded-xl p-3 flex items-start gap-2 flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#3b82f6)12", border: "1px solid var(--color-primary,#3b82f6)30" }}>
            <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-primary,#3b82f6)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold">Enable notifications</p>
              <p className="text-gray-500 text-xs mt-0.5">Get notified of new messages.</p>
              <div className="flex gap-2 mt-2">
                <button onClick={async () => { await subscribePush(); setShowPushBanner(false); }} className="px-3 py-1 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>Enable</button>
                <button onClick={() => setShowPushBanner(false)} className="px-3 py-1 rounded-lg text-xs text-gray-500">Not now</button>
              </div>
            </div>
            <button onClick={() => setShowPushBanner(false)} className="text-gray-600 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-700 border-t-[var(--color-primary,#3b82f6)] rounded-full animate-spin" />
            </div>
          ) : directConvos.length === 0 && groupConvos.length === 0 ? (
            <div className="text-center py-12 px-4 text-gray-600">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium text-gray-500">No conversations yet</p>
              <p className="text-xs mt-1">Tap + to start messaging</p>
            </div>
          ) : (
            <>
              {groupConvos.length > 0 && (
                <>
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-2 mb-1 mt-1">Groups</p>
                  {groupConvos.map(c => <ConvoItem key={c.id} convo={c} active={activeConvo?.id === c.id} user={user} getDisplayName={getConvoDisplayName} onClick={() => openConversation(c)} onlineUsers={onlineUsers} allUsers={allUsers} />)}
                  <div className="my-2 border-t border-gray-800/50" />
                </>
              )}
              {directConvos.length > 0 && (
                <>
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-2 mb-1">Direct Messages</p>
                  {directConvos.map(c => <ConvoItem key={c.id} convo={c} active={activeConvo?.id === c.id} user={user} getDisplayName={getConvoDisplayName} onClick={() => openConversation(c)} onlineUsers={onlineUsers} allUsers={allUsers} />)}
                </>
              )}
            </>
          )}
        </div>

        {/* Self identity footer */}
        {user && (
          <div className="px-3 py-2 border-t border-gray-800 flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#3b82f6)66" }}>
              {user.full_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user.full_name || user.email}</p>
              <p className="text-gray-600 text-xs capitalize">{user.coaching_role?.replace(/_/g, " ") || myType}</p>
            </div>
            <Lock className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* ── Chat Area ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {hasActive ? (
          <>
            {/* Chat header */}
            <div className="bg-[#111111] border-b border-gray-800 px-4 py-3 flex items-center gap-3 flex-shrink-0 safe-area-top">
              <button data-testid="back-btn" className="md:hidden w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 -ml-1 flex-shrink-0"
                onClick={() => { setActiveConvo(null); setMessages([]); }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#3b82f6)22" }}>
                {activeConvo?.type === "group"
                  ? <Users className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} />
                  : <User  className="w-4 h-4" style={{ color: "var(--color-primary,#3b82f6)" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{getConvoDisplayName(activeConvo)}</p>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-green-500" />
                  <p className="text-xs text-gray-500 truncate">
                    {activeConvo?.type === "group" ? `${activeConvo.participants?.length} members · group` : "Private · secure"}
                  </p>
                  {activeConvo?.type === "direct" && (() => {
                    const otherEmail = activeConvo.participants?.find(p => p !== user?.email);
                    const otherUser  = allUsers.find(u => u.email === otherEmail);
                    return otherUser && onlineUsers.has(otherUser.id)
                      ? <span className="flex items-center gap-1 text-green-400 text-xs flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> online</span>
                      : null;
                  })()}
                </div>
              </div>
              {isCoachOrAdmin && activeConvo?.type === "group" && (
                <button onClick={() => setIsAnnouncement(v => !v)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${isAnnouncement ? "text-yellow-400 bg-yellow-500/15" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}>
                  <Megaphone className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Messages list — flex-1 min-h-0 makes it scroll correctly on mobile */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3" data-testid="messages-list">
              {loadingMsgs ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-700 border-t-[var(--color-primary,#3b82f6)] rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 text-gray-600">
                  <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Start the conversation</p>
                  <p className="text-xs mt-1">Messages are private and secure</p>
                </div>
              ) : messages.map(msg => {
                const isMe              = msg.sender_email === user?.email;
                const isAnnouncementMsg = msg.content?.startsWith("📢 ");
                return (
                  <div key={msg.id || msg.created_at} data-testid="message-bubble"
                    className={`flex ${isMe ? "justify-end" : "justify-start"} ${isAnnouncementMsg ? "bg-yellow-500/5 rounded-xl px-2 py-1 border border-yellow-500/10" : ""}`}>
                    <div className={`max-w-[80%] md:max-w-md flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && <span className="text-gray-500 text-xs ml-1">{msg.sender_name || msg.sender_email}</span>}
                      {msg.attachment_url ? (
                        <div className={`rounded-2xl overflow-hidden border ${isMe ? "border-transparent" : "border-gray-700"}`} style={isMe ? { backgroundColor: "var(--color-primary,#3b82f6)33" } : { backgroundColor: "#1e1e1e" }}>
                          {isImage(msg.attachment_url)
                            ? <img src={msg.attachment_url} alt="attachment" className="max-w-xs max-h-56 object-contain" />
                            : <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3">
                                <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                <span className="text-gray-200 text-sm">{msg.content}</span>
                                <Download className="w-4 h-4 text-gray-500 ml-2" />
                              </a>}
                        </div>
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm break-words ${isMe ? "rounded-br-sm text-white" : "bg-[#1e1e1e] text-gray-200 rounded-bl-sm"}`}
                          style={isMe ? { backgroundColor: "var(--color-primary,#3b82f6)" } : {}}>
                          {msg.content}
                        </div>
                      )}
                      <span className="text-gray-600 text-xs mx-1">{formatTime(msg.created_at || msg.created_date)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input — stays at bottom, visible above iOS keyboard.
                 Container height is adjusted by visualViewport on iOS so
                 the input bar never hides behind the soft keyboard. */}
            <div className="flex-shrink-0 bg-[#111111] border-t border-gray-800 p-3"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
              {isAnnouncement && (
                <div className="mb-2 flex items-center gap-2 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <Megaphone className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  <span className="text-yellow-300 text-xs flex-1">Announcement mode — all members will see this</span>
                  <button onClick={() => setIsAnnouncement(false)}><X className="w-3.5 h-3.5 text-yellow-500" /></button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-300 flex-shrink-0 active:scale-95">
                  {uploading
                    ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    : <Paperclip className="w-4 h-4" />}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <textarea
                  data-testid="message-input"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={`Message ${getConvoDisplayName(activeConvo)}…`}
                  rows={1}
                  style={{ resize: "none", maxHeight: "120px", overflowY: "auto" }}
                  className="flex-1 bg-[#1e1e1e] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-[var(--color-primary,#3b82f6)] min-h-[40px]"
                />
                <button data-testid="send-btn" onClick={() => sendMessage()} disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 active:scale-95"
                  style={{ backgroundColor: "var(--color-primary,#3b82f6)" }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state — only shown on desktop when no convo selected */
          <div className="hidden md:flex flex-1 items-center justify-center bg-[#0a0a0a]">
            <div className="text-center text-gray-600 px-6">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--color-primary,#3b82f6)12" }}>
                <Lock className="w-8 h-8 opacity-30" style={{ color: "var(--color-primary,#3b82f6)" }} />
              </div>
              <p className="font-semibold text-gray-400">NxMessage</p>
              <p className="text-sm mt-1">Select a conversation to start chatting</p>
              <p className="text-xs mt-2 text-gray-700">All messages are private and end-to-end secured</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
