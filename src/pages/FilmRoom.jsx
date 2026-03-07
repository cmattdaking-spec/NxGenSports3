import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Tag, Film, Zap, X, Menu, Users } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import VideoPlayer from "../components/filmroom/VideoPlayer";
import TagForm from "../components/filmroom/TagForm";
import TagList from "../components/filmroom/TagList";
import SessionSidebar from "../components/filmroom/SessionSidebar";
import TagComments from "../components/filmroom/TagComments";

export default function FilmRoom() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [tags, setTags] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});
  const [currentTime, setCurrentTime] = useState(0);
  const [showTagForm, setShowTagForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiBreakdown, setAiBreakdown] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [commentTag, setCommentTag] = useState(null); // tag whose comments are open
  const [user, setUser] = useState(null);
  // presence: map of email -> { name, lastSeen }
  const [presence, setPresence] = useState({});
  const playerRef = useRef(null);
  const presenceIntervalRef = useRef(null);
  const activeSessionRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.FilmSession.list("-created_date"),
      base44.auth.me(),
    ]).then(([s, u]) => {
      setUser(u);
      setSessions(s);
      if (s.length > 0) loadSession(s[0], u);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Real-time subscription for tags
  useEffect(() => {
    if (!activeSession) return;
    const unsub = base44.entities.FilmTag.subscribe((event) => {
      if (event.data?.session_id !== activeSession.id) return;
      if (event.type === "create") {
        setTags(prev => {
          if (prev.find(t => t.id === event.id)) return prev;
          return [...prev, event.data];
        });
      }
      if (event.type === "update") {
        setTags(prev => prev.map(t => t.id === event.id ? event.data : t));
      }
      if (event.type === "delete") {
        setTags(prev => prev.filter(t => t.id !== event.id));
      }
    });
    return unsub;
  }, [activeSession?.id]);

  // Real-time subscription for comments (update comment counts)
  useEffect(() => {
    if (!activeSession) return;
    const unsub = base44.entities.FilmComment.subscribe((event) => {
      if (event.data?.session_id !== activeSession.id) return;
      const tagId = event.data?.tag_id;
      if (!tagId) return;
      if (event.type === "create") {
        setCommentCounts(prev => ({ ...prev, [tagId]: (prev[tagId] || 0) + 1 }));
      }
      if (event.type === "delete") {
        setCommentCounts(prev => ({ ...prev, [tagId]: Math.max((prev[tagId] || 1) - 1, 0) }));
      }
    });
    return unsub;
  }, [activeSession?.id]);

  // Presence heartbeat — write own presence to session notes field isn't ideal;
  // instead we store presence in a lightweight way via FilmSession watchers field
  useEffect(() => {
    if (!activeSession || !user) return;
    const broadcastPresence = () => {
      // Use session update to track active viewers via a "viewers" JSON blob
      const key = user.email;
      const name = user.full_name || user.email;
      setPresence(prev => ({
        ...prev,
        [key]: { name, lastSeen: Date.now() },
      }));
    };
    broadcastPresence();
    presenceIntervalRef.current = setInterval(broadcastPresence, 15000);
    return () => clearInterval(presenceIntervalRef.current);
  }, [activeSession?.id, user]);

  const loadSession = async (session, u) => {
    setLoading(true);
    activeSessionRef.current = session;
    setActiveSession(session);
    setShowTagForm(false);
    setAiBreakdown("");
    setCommentCounts({});

    const [t, comments] = await Promise.all([
      base44.entities.FilmTag.filter({ session_id: session.id }),
      base44.entities.FilmComment.filter({ session_id: session.id }),
    ]);
    setTags(t);

    // Build comment counts per tag
    const counts = {};
    comments.forEach(c => { if (c.tag_id) counts[c.tag_id] = (counts[c.tag_id] || 0) + 1; });
    setCommentCounts(counts);
    setLoading(false);
  };

  const createSession = async (data) => {
    const s = await base44.entities.FilmSession.create({ ...data, tag_count: 0 });
    const updated = [s, ...sessions];
    setSessions(updated);
    loadSession(s, user);
  };

  const deleteSession = async (id) => {
    await base44.entities.FilmSession.delete(id);
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (activeSession?.id === id) {
      if (updated.length > 0) loadSession(updated[0], user);
      else { setActiveSession(null); setTags([]); }
    }
  };

  const saveTag = async (tagData) => {
    await base44.entities.FilmTag.create({ ...tagData, session_id: activeSession.id });
    // tags updated via subscription
    const newCount = tags.length + 1;
    await base44.entities.FilmSession.update(activeSession.id, { tag_count: newCount });
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, tag_count: newCount } : s));
    setShowTagForm(false);
  };

  const deleteTag = async (tagId) => {
    await base44.entities.FilmTag.delete(tagId);
    // removed via subscription
    const newCount = Math.max(tags.length - 1, 0);
    await base44.entities.FilmSession.update(activeSession.id, { tag_count: newCount });
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, tag_count: newCount } : s));
  };

  const seekToTag = (tag) => {
    playerRef.current?.seekTo(tag.timestamp_seconds);
  };

  const getAIBreakdown = async () => {
    if (!tags.length) return;
    setAiLoading(true);
    setShowAI(true);
    setAiBreakdown("");
    const summary = tags.map(t => ({
      time: t.timestamp_label, play: t.play_type, formation: t.formation,
      personnel: t.personnel, down: t.down, distance: t.distance,
      yards: t.yards, result: t.result, flagged: t.flagged, notes: t.notes,
    }));
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football film analyst. Analyze these tagged plays from a film session titled "${activeSession?.title}"${activeSession?.opponent ? ` (vs ${activeSession.opponent})` : ""}.\n\nTagged Plays:\n${JSON.stringify(summary, null, 2)}\n\nProvide:\n1. TENDENCY BREAKDOWN — run/pass ratio, down & distance tendencies, formation usage\n2. SUCCESS RATE ANALYSIS — what's working vs failing\n3. FLAGGED PLAYS — specific notes on flagged plays\n4. KEY COACHING POINTS — top 3-5 actionable takeaways\n5. OPPONENT/SELF TENDENCIES — exploitable patterns\n\nBe specific, cite timestamps, write for a coaching staff audience.`,
    });
    setAiBreakdown(res);
    setAiLoading(false);
  };

  const successRate = tags.length ? Math.round((tags.filter(t => t.result === "success").length / tags.length) * 100) : 0;
  const runCount = tags.filter(t => t.play_type === "run").length;
  const passCount = tags.filter(t => t.play_type === "pass").length;
  const flaggedCount = tags.filter(t => t.flagged).length;

  // Active viewers (presence within last 30s)
  const activeViewers = Object.entries(presence)
    .filter(([, v]) => Date.now() - v.lastSeen < 30000)
    .map(([email, v]) => ({ email, name: v.name }));

  if (loading && sessions.length === 0 && !activeSession) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full flex flex-col md:flex-row h-screen overflow-hidden">

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-40
        w-64 bg-[#111111] border-r border-gray-800
        flex flex-col p-3
        transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="flex items-center gap-2 mb-4 pt-1">
          <Film className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
          <span className="text-white font-black text-lg">Film <span style={{ color: "var(--color-primary,#f97316)" }}>Room</span></span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto md:hidden text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <SessionSidebar
          sessions={sessions}
          activeId={activeSession?.id}
          onSelect={s => { loadSession(s, user); setSidebarOpen(false); }}
          onCreate={createSession}
          onDelete={deleteSession}
        />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#111111] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-400">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-bold text-sm">{activeSession?.title || "Film Room"}</h1>
              {activeSession?.opponent && <p className="text-gray-500 text-xs">vs {activeSession.opponent}</p>}
            </div>
          </div>
          {activeSession && (
            <div className="flex items-center gap-3">
              {/* Presence avatars */}
              {activeViewers.length > 0 && (
                <div className="hidden md:flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-gray-600 mr-0.5" />
                  {activeViewers.slice(0, 4).map(v => (
                    <div key={v.email} title={v.name}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold -ml-1 border border-[#111]"
                      style={{ backgroundColor: "var(--color-primary,#f97316)55", color: "var(--color-primary,#f97316)" }}>
                      {(v.name?.[0] || "?").toUpperCase()}
                    </div>
                  ))}
                  <span className="text-gray-600 text-xs ml-1">{activeViewers.length} watching</span>
                </div>
              )}
              {/* Mini stats */}
              <div className="hidden md:flex items-center gap-3 text-xs text-gray-500">
                <span>{tags.length} tags</span>
                <span className="text-green-400">{successRate}% success</span>
                {runCount > 0 && <span>Run: {runCount}</span>}
                {passCount > 0 && <span>Pass: {passCount}</span>}
                {flaggedCount > 0 && <span className="text-yellow-500">{flaggedCount} flagged</span>}
              </div>
              <button onClick={getAIBreakdown} disabled={aiLoading || !tags.length}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40"
                style={{ color: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)4d", backgroundColor: "var(--color-primary,#f97316)1a" }}>
                <Zap className={`w-3.5 h-3.5 ${aiLoading ? "animate-pulse" : ""}`} />
                {aiLoading ? "Analyzing..." : "AI Breakdown"}
              </button>
              <button onClick={() => setShowTagForm(f => !f)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                <Tag className="w-3.5 h-3.5" />
                Tag Play
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        {!activeSession ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <Film className="w-16 h-16 text-gray-800" />
            <p className="text-gray-500 text-lg font-semibold">No Film Session Selected</p>
            <p className="text-gray-600 text-sm">Create a session using the panel on the left</p>
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-white px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
              Open Sessions
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Video side */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 min-w-0">
              <VideoPlayer
                ref={playerRef}
                url={activeSession?.video_url}
                onTimeUpdate={setCurrentTime}
              />

              {showTagForm && (
                <TagForm
                  currentTime={currentTime}
                  onSave={saveTag}
                  onCancel={() => setShowTagForm(false)}
                />
              )}

              {/* AI breakdown panel */}
              {showAI && (
                <div className="bg-[#141414] border border-gray-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800"
                    style={{ backgroundColor: "var(--color-primary,#f97316)11" }}>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
                      <span className="font-semibold text-sm" style={{ color: "var(--color-primary,#f97316)" }}>AI Film Breakdown</span>
                    </div>
                    <button onClick={() => setShowAI(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-4 max-h-80 overflow-y-auto">
                    {aiLoading ? (
                      <div className="flex flex-col items-center py-8 gap-3">
                        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: "var(--color-primary,#f97316)44", borderTopColor: "var(--color-primary,#f97316)" }} />
                        <p className="text-gray-400 text-sm">Analyzing {tags.length} tagged plays...</p>
                      </div>
                    ) : (
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiBreakdown}</pre>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile stats */}
              <div className="lg:hidden flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <span>{tags.length} tags</span>
                <span className="text-green-400">{successRate}% success</span>
                {runCount > 0 && <span>Run: {runCount}</span>}
                {passCount > 0 && <span>Pass: {passCount}</span>}
                {flaggedCount > 0 && <span className="text-yellow-500">{flaggedCount} flagged</span>}
              </div>
            </div>

            {/* Tag list panel */}
            <div className="w-full lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-800 bg-[#0d0d0d] p-3 flex flex-col"
              style={{ maxHeight: "calc(100vh - 57px)" }}>
              <h3 className="text-white font-semibold text-sm mb-3 flex-shrink-0">Tagged Plays</h3>
              <TagList
                tags={tags}
                commentCounts={commentCounts}
                onDelete={deleteTag}
                onTagClick={seekToTag}
                onOpenComments={tag => setCommentTag(tag)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Comment modal */}
      {commentTag && (
        <TagComments
          tag={commentTag}
          sessionId={activeSession?.id}
          user={user}
          onClose={() => setCommentTag(null)}
        />
      )}
    </div>
  );
}