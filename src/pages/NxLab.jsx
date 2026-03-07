import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Tag, Film, Zap, X, Menu, Users, PenTool, Crosshair, Brain, Shield, Swords, Target, Plus, Edit, Trash2, ExternalLink, ChevronDown, ChevronUp, FlaskConical, BookOpen, ClipboardList, MessageSquare } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import VideoPlayer from "../components/filmroom/VideoPlayer";
import TagForm from "../components/filmroom/TagForm";
import TagList from "../components/filmroom/TagList";
import SessionSidebar from "../components/filmroom/SessionSidebar";
import TagComments from "../components/filmroom/TagComments";
import AIVideoAnalysis from "../components/filmroom/AIVideoAnalysis";
import VideoAnnotationCanvas from "../components/filmroom/VideoAnnotationCanvas";

// ─── SCOUTING SUB-COMPONENT ──────────────────────────────────────────────────
function ScoutingTab() {
  const [opponents, setOpponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTarget, setAiTarget] = useState(null);
  const [deepAnalysisTarget, setDeepAnalysisTarget] = useState(null);
  const [deepAnalysisLoading, setDeepAnalysisLoading] = useState(false);
  const [deepReport, setDeepReport] = useState(null);

  const load = () => base44.entities.Opponent.list("-game_date").then(d => { setOpponents(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ location: "home" }); setShowForm(true); };
  const openEdit = (o) => { setEditing(o); setForm({...o}); setShowForm(true); };
  const save = async () => {
    if (editing) await base44.entities.Opponent.update(editing.id, form);
    else await base44.entities.Opponent.create(form);
    setShowForm(false); load();
  };
  const remove = async (id) => { if (confirm("Delete opponent?")) { await base44.entities.Opponent.delete(id); load(); } };

  const getScoutReport = async (opp) => {
    setAiLoading(true); setAiTarget(opp.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football scouting AI. Generate a concise scouting report for: ${opp.name} (${opp.record || "?"} record, ${opp.location} game on ${opp.game_date}).\nOffensive Tendency: ${opp.offensive_tendency || "Unknown"}\nDefensive Tendency: ${opp.defensive_tendency || "Unknown"}\nKey Players: ${opp.key_players || "Unknown"}\nStrengths: ${opp.strengths || "Unknown"}\nWeaknesses: ${opp.weaknesses || "Unknown"}\n\nProvide: 1) Offensive analysis 2) Defensive analysis 3) Key matchups 4) Top 3 game plan recommendations.`,
      add_context_from_internet: true
    });
    await base44.entities.Opponent.update(opp.id, { ai_scout_report: res });
    load(); setAiLoading(false); setAiTarget(null);
  };

  const getDeepAnalysis = async (opp) => {
    setDeepAnalysisLoading(true); setDeepAnalysisTarget(opp.id); setDeepReport(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite football analytics AI. Provide a comprehensive strategic breakdown for facing ${opp.name}. Record: ${opp.record || "Unknown"}, Game: ${opp.game_date} (${opp.location}), Offensive Tendency: ${opp.offensive_tendency || "Not provided"}, Defensive Tendency: ${opp.defensive_tendency || "Not provided"}, Key Players: ${opp.key_players || "Not provided"}.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          offensive_breakdown: { type: "string" },
          defensive_breakdown: { type: "string" },
          key_player_matchups: { type: "array", items: { type: "object", properties: { their_player: { type: "string" }, matchup_note: { type: "string" }, recommendation: { type: "string" } } } },
          exploitable_weaknesses: { type: "array", items: { type: "string" } },
          game_plan_adjustments: { type: "array", items: { type: "object", properties: { area: { type: "string" }, adjustment: { type: "string" }, rationale: { type: "string" } } } },
          threat_level: { type: "string", enum: ["Low", "Medium", "High", "Very High"] },
          win_probability_factors: { type: "array", items: { type: "string" } },
          special_teams_notes: { type: "string" }
        }
      }
    });
    setDeepReport(res); setDeepAnalysisLoading(false);
  };

  const locationBadge = { home: "bg-green-500/20 text-green-400", away: "bg-red-500/20 text-red-400", neutral: "bg-yellow-500/20 text-yellow-400" };
  const threatColor = { Low: "text-green-400 bg-green-500/20", Medium: "text-yellow-400 bg-yellow-500/20", High: "text-orange-400 bg-orange-500/20", "Very High": "text-red-400 bg-red-500/20" };
  const upcoming = opponents.filter(o => new Date(o.game_date) >= new Date());
  const past = opponents.filter(o => new Date(o.game_date) < new Date());

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  const renderOpponent = (opp) => (
    <div key={opp.id} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-white font-bold">{opp.name}</h3>
            {opp.record && <span className="text-gray-500 text-sm">({opp.record})</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full ${locationBadge[opp.location]}`}>{opp.location}</span>
          </div>
          <div className="flex gap-3 text-xs text-gray-500 flex-wrap"><span>{opp.game_date}</span>{opp.conference && <span>· {opp.conference}</span>}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {opp.hudl_link && <a href={opp.hudl_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-1.5 rounded-lg text-xs hover:bg-blue-500/20"><ExternalLink className="w-3.5 h-3.5" /> Hudl</a>}
          <button onClick={() => { setDeepAnalysisTarget(opp.id); getDeepAnalysis(opp); }} disabled={deepAnalysisLoading && deepAnalysisTarget === opp.id}
            className="flex items-center gap-1 bg-teal-500/10 border border-teal-500/30 text-teal-400 px-2 py-1.5 rounded-lg text-xs hover:bg-teal-500/20">
            <Brain className={`w-3.5 h-3.5 ${deepAnalysisLoading && deepAnalysisTarget === opp.id ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{deepAnalysisLoading && deepAnalysisTarget === opp.id ? "Analyzing..." : "Nx Analysis"}</span>
          </button>
          <button onClick={() => getScoutReport(opp)} disabled={aiLoading && aiTarget === opp.id}
            className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2 py-1.5 rounded-lg text-xs hover:bg-orange-500/20">
            <Zap className={`w-3.5 h-3.5 ${aiLoading && aiTarget === opp.id ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{aiLoading && aiTarget === opp.id ? "Scouting..." : "Nx Scout"}</span>
          </button>
          <button onClick={() => openEdit(opp)} className="text-gray-500 hover:text-orange-500 p-1.5"><Edit className="w-4 h-4" /></button>
          <button onClick={() => remove(opp.id)} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
          <button onClick={() => setExpanded(expanded === opp.id ? null : opp.id)} className="text-gray-500 hover:text-white p-1.5">
            {expanded === opp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {expanded === opp.id && (
        <div className="border-t border-gray-800 p-4 space-y-3">
          {[{ label: "Offensive Tendency", val: opp.offensive_tendency }, { label: "Defensive Tendency", val: opp.defensive_tendency }, { label: "Key Players", val: opp.key_players }, { label: "Strengths", val: opp.strengths }, { label: "Weaknesses", val: opp.weaknesses }, { label: "Notes", val: opp.notes }].filter(i => i.val).map(({ label, val }) => (
            <div key={label}><p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</p><p className="text-gray-300 text-sm">{val}</p></div>
          ))}
          {opp.ai_scout_report && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2"><Zap className="w-3.5 h-3.5 text-orange-500" /><span className="text-orange-400 text-xs font-medium">Nx Scout Report</span></div>
              <p className="text-gray-300 text-sm whitespace-pre-line">{opp.ai_scout_report}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-white">Opponent <span style={{ color: "var(--color-primary,#f97316)" }}>Scouting</span></h2>
          <p className="text-gray-500 text-sm">{opponents.length} opponents · Powered by Nx Intelligence</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          <Plus className="w-4 h-4" /> Add Opponent
        </button>
      </div>

      {opponents.length === 0 && <div className="text-center py-16"><Crosshair className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No opponents yet.</p></div>}
      {upcoming.length > 0 && <div className="mb-5"><p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Upcoming Games</p><div className="space-y-3">{upcoming.map(renderOpponent)}</div></div>}
      {past.length > 0 && <div><p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Past Games</p><div className="space-y-3 opacity-70">{past.map(renderOpponent)}</div></div>}

      {/* Deep Analysis Modal */}
      {deepAnalysisTarget && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-teal-500/30 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2"><Brain className="w-5 h-5 text-teal-400" /><h2 className="text-white font-bold">Nx Deep Analysis</h2></div>
              <button onClick={() => { setDeepAnalysisTarget(null); setDeepReport(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              {deepAnalysisLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Analyzing opponent data...</p>
                </div>
              ) : deepReport && (
                <div className="space-y-5">
                  {deepReport.threat_level && <div className="flex items-center gap-3"><span className="text-gray-500 text-sm">Threat Level:</span><span className={`text-sm font-bold px-3 py-0.5 rounded-full ${threatColor[deepReport.threat_level]}`}>{deepReport.threat_level}</span></div>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deepReport.offensive_breakdown && <div className="bg-[#1a1a1a] rounded-xl p-4 border border-orange-500/20"><div className="flex items-center gap-2 mb-2"><Swords className="w-4 h-4 text-orange-400" /><span className="text-orange-400 text-xs font-semibold uppercase">Offensive Breakdown</span></div><p className="text-gray-300 text-sm leading-relaxed">{deepReport.offensive_breakdown}</p></div>}
                    {deepReport.defensive_breakdown && <div className="bg-[#1a1a1a] rounded-xl p-4 border border-blue-500/20"><div className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-blue-400" /><span className="text-blue-400 text-xs font-semibold uppercase">Defensive Breakdown</span></div><p className="text-gray-300 text-sm leading-relaxed">{deepReport.defensive_breakdown}</p></div>}
                  </div>
                  {deepReport.exploitable_weaknesses?.length > 0 && <div><div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-green-400" /><span className="text-green-400 text-xs font-semibold uppercase">Exploitable Weaknesses</span></div><ul className="space-y-1.5">{deepReport.exploitable_weaknesses.map((w, i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-300"><span className="text-green-500 mt-0.5">▸</span>{w}</li>)}</ul></div>}
                  {deepReport.game_plan_adjustments?.length > 0 && <div><div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-orange-400" /><span className="text-orange-400 text-xs font-semibold uppercase">Game Plan Adjustments</span></div><div className="space-y-2">{deepReport.game_plan_adjustments.map((adj, i) => <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-orange-500/10"><p className="text-orange-300 text-xs font-semibold uppercase mb-0.5">{adj.area}</p><p className="text-white text-sm font-medium">{adj.adjustment}</p><p className="text-gray-500 text-xs mt-0.5">{adj.rationale}</p></div>)}</div></div>}
                  {deepReport.special_teams_notes && <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-700"><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Special Teams Notes</p><p className="text-gray-300 text-sm">{deepReport.special_teams_notes}</p></div>}
                  {deepReport.win_probability_factors?.length > 0 && <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4"><p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Win Probability Factors</p><ul className="space-y-1">{deepReport.win_probability_factors.map((f, i) => <li key={i} className="text-gray-300 text-sm flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span>{f}</li>)}</ul></div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Opponent" : "Add Opponent"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-gray-400 text-xs mb-1 block">Team Name *</label><input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" /></div>
                <div><label className="text-gray-400 text-xs mb-1 block">Game Date *</label><input type="date" value={form.game_date || ""} onChange={e => setForm({...form, game_date: e.target.value})} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" /></div>
                <div><label className="text-gray-400 text-xs mb-1 block">Location</label><select value={form.location || "home"} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none"><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select></div>
                <div><label className="text-gray-400 text-xs mb-1 block">Record</label><input value={form.record || ""} onChange={e => setForm({...form, record: e.target.value})} placeholder="e.g. 5-2" className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" /></div>
                <div><label className="text-gray-400 text-xs mb-1 block">Conference</label><input value={form.conference || ""} onChange={e => setForm({...form, conference: e.target.value})} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" /></div>
                <div className="col-span-2"><label className="text-gray-400 text-xs mb-1 block">Hudl Link</label><input value={form.hudl_link || ""} onChange={e => setForm({...form, hudl_link: e.target.value})} placeholder="https://hudl.com/..." className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" /></div>
              </div>
              {[{ label: "Offensive Tendencies", key: "offensive_tendency" }, { label: "Defensive Tendencies", key: "defensive_tendency" }, { label: "Key Players", key: "key_players" }, { label: "Strengths", key: "strengths" }, { label: "Weaknesses", key: "weaknesses" }, { label: "Notes", key: "notes" }].map(({ label, key }) => (
                <div key={key}><label className="text-gray-400 text-xs mb-1 block">{label}</label><textarea value={form[key] || ""} onChange={e => setForm({...form, [key]: e.target.value})} rows={2} className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none resize-none" /></div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={save} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Save Opponent</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PLAYBOOK TAB ────────────────────────────────────────────────────────────
function PlaybookTab() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <BookOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Playbook feature coming soon</p>
      </div>
    </div>
  );
}

// ─── PRACTICE TAB ────────────────────────────────────────────────────────────
function PracticeTab() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <ClipboardList className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Practice planning feature coming soon</p>
      </div>
    </div>
  );
}

// ─── GAME PLAN TAB ───────────────────────────────────────────────────────────
function GamePlanTab() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Target className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Game plan feature coming soon</p>
      </div>
    </div>
  );
}

// ─── MESSAGES TAB ────────────────────────────────────────────────────────────
function MessagesTab() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <MessageSquare className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Messages feature coming soon</p>
      </div>
    </div>
  );
}

// ─── MAIN NxLab PAGE ─────────────────────────────────────────────────────────
export default function NxLab() {
  const [activeTab, setActiveTab] = useState("film");

  // Film Room state
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
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [commentTag, setCommentTag] = useState(null);
  const [user, setUser] = useState(null);
  const [presence, setPresence] = useState({});
  const playerRef = useRef(null);
  const videoContainerRef = useRef(null);
  const presenceIntervalRef = useRef(null);

  useEffect(() => {
    Promise.all([base44.entities.FilmSession.list("-created_date"), base44.auth.me()])
      .then(([s, u]) => { setUser(u); setSessions(s); if (s.length > 0) loadSession(s[0], u); else setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    const unsub = base44.entities.FilmTag.subscribe((event) => {
      if (event.data?.session_id !== activeSession.id) return;
      if (event.type === "create") setTags(prev => prev.find(t => t.id === event.id) ? prev : [...prev, event.data]);
      if (event.type === "update") setTags(prev => prev.map(t => t.id === event.id ? event.data : t));
      if (event.type === "delete") setTags(prev => prev.filter(t => t.id !== event.id));
    });
    return unsub;
  }, [activeSession?.id]);

  useEffect(() => {
    if (!activeSession) return;
    const unsub = base44.entities.FilmComment.subscribe((event) => {
      if (event.data?.session_id !== activeSession.id) return;
      const tagId = event.data?.tag_id;
      if (!tagId) return;
      if (event.type === "create") setCommentCounts(prev => ({ ...prev, [tagId]: (prev[tagId] || 0) + 1 }));
      if (event.type === "delete") setCommentCounts(prev => ({ ...prev, [tagId]: Math.max((prev[tagId] || 1) - 1, 0) }));
    });
    return unsub;
  }, [activeSession?.id]);

  useEffect(() => {
    if (!activeSession || !user) return;
    const bc = () => setPresence(prev => ({ ...prev, [user.email]: { name: user.full_name || user.email, lastSeen: Date.now() } }));
    bc(); presenceIntervalRef.current = setInterval(bc, 15000);
    return () => clearInterval(presenceIntervalRef.current);
  }, [activeSession?.id, user]);

  const loadSession = async (session) => {
    setLoading(true); setActiveSession(session); setShowTagForm(false); setAiBreakdown(""); setShowAIAnalysis(false); setCommentCounts({});
    const [t, comments] = await Promise.all([base44.entities.FilmTag.filter({ session_id: session.id }), base44.entities.FilmComment.filter({ session_id: session.id })]);
    setTags(t);
    const counts = {}; comments.forEach(c => { if (c.tag_id) counts[c.tag_id] = (counts[c.tag_id] || 0) + 1; });
    setCommentCounts(counts); setLoading(false);
  };

  const createSession = async (data) => { const s = await base44.entities.FilmSession.create({ ...data, tag_count: 0 }); setSessions(prev => [s, ...prev]); loadSession(s); };
  const deleteSession = async (id) => {
    await base44.entities.FilmSession.delete(id);
    const updated = sessions.filter(s => s.id !== id); setSessions(updated);
    if (activeSession?.id === id) { if (updated.length > 0) loadSession(updated[0]); else { setActiveSession(null); setTags([]); } }
  };
  const saveTag = async (tagData) => {
    await base44.entities.FilmTag.create({ ...tagData, session_id: activeSession.id });
    const n = tags.length + 1; await base44.entities.FilmSession.update(activeSession.id, { tag_count: n });
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, tag_count: n } : s)); setShowTagForm(false);
  };
  const deleteTag = async (tagId) => {
    await base44.entities.FilmTag.delete(tagId);
    const n = Math.max(tags.length - 1, 0); await base44.entities.FilmSession.update(activeSession.id, { tag_count: n });
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, tag_count: n } : s));
  };
  const handleAutoTags = async (autoTags) => {
    for (const tag of autoTags) await base44.entities.FilmTag.create(tag);
    const n = tags.length + autoTags.length; await base44.entities.FilmSession.update(activeSession.id, { tag_count: n });
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, tag_count: n } : s));
  };
  const getAIBreakdown = async () => {
    if (!tags.length) return; setAiLoading(true); setShowAI(true); setAiBreakdown("");
    const summary = tags.map(t => ({ time: t.timestamp_label, play: t.play_type, formation: t.formation, down: t.down, distance: t.distance, yards: t.yards, result: t.result, flagged: t.flagged, notes: t.notes }));
    const res = await base44.integrations.Core.InvokeLLM({ prompt: `Football film analyst. Analyze tagged plays from "${activeSession?.title}". ${JSON.stringify(summary)} Provide: 1) TENDENCY BREAKDOWN 2) SUCCESS RATE ANALYSIS 3) FLAGGED PLAYS 4) KEY COACHING POINTS 5) EXPLOITABLE PATTERNS.` });
    setAiBreakdown(res); setAiLoading(false);
  };

  const seekToTag = (tag) => playerRef.current?.seekTo(tag.timestamp_seconds);
  const successRate = tags.length ? Math.round((tags.filter(t => t.result === "success").length / tags.length) * 100) : 0;
  const runCount = tags.filter(t => t.play_type === "run").length;
  const passCount = tags.filter(t => t.play_type === "pass").length;
  const flaggedCount = tags.filter(t => t.flagged).length;
  const activeViewers = Object.entries(presence).filter(([, v]) => Date.now() - v.lastSeen < 30000).map(([email, v]) => ({ email, name: v.name }));

  if (loading && sessions.length === 0 && !activeSession && activeTab === "film") return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full flex flex-col h-screen overflow-hidden">
      {/* Top Nav */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#111111] border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
          <span className="text-white font-black text-lg">Nx<span style={{ color: "var(--color-primary,#f97316)" }}>Lab</span></span>
        </div>
        <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-0.5 overflow-x-auto">
           {[
             { id: "film", label: "Film Room", icon: Film },
             { id: "scouting", label: "Scouting", icon: Crosshair },
             { id: "playbook", label: "Playbook", icon: BookOpen },
             { id: "practice", label: "Practice", icon: ClipboardList },
             { id: "gameplan", label: "Game Plan", icon: Target },
             { id: "messages", label: "Messages", icon: MessageSquare }
           ].map(({ id, label, icon: Icon }) => (
             <button key={id} onClick={() => setActiveTab(id)}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${activeTab === id ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
               style={activeTab === id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
               <Icon className="w-3.5 h-3.5" />{label}
             </button>
           ))}
         </div>
      </div>

      {/* SCOUTING TAB */}
      {activeTab === "scouting" && (
        <div className="flex-1 overflow-y-auto"><ScoutingTab /></div>
      )}

      {/* PLAYBOOK TAB */}
      {activeTab === "playbook" && (
        <div className="flex-1 overflow-y-auto"><PlaybookTab /></div>
      )}

      {/* PRACTICE TAB */}
      {activeTab === "practice" && (
        <div className="flex-1 overflow-y-auto"><PracticeTab /></div>
      )}

      {/* GAME PLAN TAB */}
      {activeTab === "gameplan" && (
        <div className="flex-1 overflow-y-auto"><GamePlanTab /></div>
      )}

      {/* MESSAGES TAB */}
      {activeTab === "messages" && (
        <div className="flex-1 overflow-y-auto"><MessagesTab /></div>
      )}

      {/* FILM TAB */}
      {activeTab === "film" && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar */}
          <aside className={`fixed md:relative inset-y-0 left-0 z-40 w-64 bg-[#111111] border-r border-gray-800 flex flex-col p-3 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
            <div className="flex items-center gap-2 mb-4 pt-1">
              <Film className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
              <span className="text-white font-black text-sm">Film Sessions</span>
              <button onClick={() => setSidebarOpen(false)} className="ml-auto md:hidden text-gray-500"><X className="w-4 h-4" /></button>
            </div>
            <SessionSidebar sessions={sessions} activeId={activeSession?.id} onSelect={s => { loadSession(s); setSidebarOpen(false); }} onCreate={createSession} onDelete={deleteSession} />
          </aside>
          {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Film toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-[#0d0d0d] flex-shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-400"><Menu className="w-5 h-5" /></button>
                <div>
                  <p className="text-white font-semibold text-sm">{activeSession?.title || "No session selected"}</p>
                  {activeSession?.opponent && <p className="text-gray-500 text-xs">vs {activeSession.opponent}</p>}
                </div>
              </div>
              {activeSession && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 mr-2">
                    <span>{tags.length} tags</span><span className="text-green-400">{successRate}%</span>
                    {flaggedCount > 0 && <span className="text-yellow-500">{flaggedCount} flagged</span>}
                    {activeViewers.length > 0 && <span className="text-blue-400">{activeViewers.length} watching</span>}
                  </div>
                  <button onClick={() => setShowAnnotation(v => !v)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${showAnnotation ? "text-white border-transparent" : "border-gray-700 text-gray-400"}`} style={showAnnotation ? { backgroundColor: "#7c3aed" } : {}}>
                    <PenTool className="w-3.5 h-3.5" /><span className="hidden sm:inline">Draw</span>
                  </button>
                  <button onClick={() => setShowAIAnalysis(v => !v)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${showAIAnalysis ? "text-white border-transparent" : "border-gray-700"}`} style={showAIAnalysis ? { backgroundColor: "var(--color-primary,#f97316)" } : { color: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)44" }}>
                    <Zap className="w-3.5 h-3.5" /><span className="hidden sm:inline">AI Detect</span>
                  </button>
                  <button onClick={getAIBreakdown} disabled={aiLoading || !tags.length} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40" style={{ color: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)44", backgroundColor: "var(--color-primary,#f97316)11" }}>
                    <Zap className={`w-3.5 h-3.5 ${aiLoading ? "animate-pulse" : ""}`} /><span className="hidden sm:inline">Breakdown</span>
                  </button>
                  <button onClick={() => setShowTagForm(f => !f)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                    <Tag className="w-3.5 h-3.5" /><span className="hidden sm:inline">Tag Play</span>
                  </button>
                </div>
              )}
            </div>

            {!activeSession ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-4">
                <Film className="w-16 h-16 text-gray-800" />
                <p className="text-gray-500 text-lg font-semibold">No Film Session Selected</p>
                <button onClick={() => setSidebarOpen(true)} className="md:hidden text-white px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Open Sessions</button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 min-w-0">
                  <div ref={videoContainerRef} className="relative w-full" style={{ minHeight: 200 }}>
                    <VideoPlayer ref={playerRef} url={activeSession?.video_url} onTimeUpdate={setCurrentTime} />
                    <VideoAnnotationCanvas visible={showAnnotation} onClose={() => setShowAnnotation(false)} />
                  </div>
                  {showTagForm && <TagForm currentTime={currentTime} onSave={saveTag} onCancel={() => setShowTagForm(false)} />}
                  {showAIAnalysis && <AIVideoAnalysis session={activeSession} tags={tags} onAutoTagsGenerated={handleAutoTags} />}
                  {showAI && (
                    <div className="bg-[#141414] border border-gray-700 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800" style={{ backgroundColor: "var(--color-primary,#f97316)11" }}>
                        <div className="flex items-center gap-2"><Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} /><span className="font-semibold text-sm" style={{ color: "var(--color-primary,#f97316)" }}>AI Film Breakdown</span></div>
                        <button onClick={() => setShowAI(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="p-4 max-h-80 overflow-y-auto">
                        {aiLoading ? <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-primary,#f97316)44", borderTopColor: "var(--color-primary,#f97316)" }} /></div>
                          : <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiBreakdown}</pre>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-full lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-800 bg-[#0d0d0d] p-3 flex flex-col" style={{ maxHeight: "calc(100vh - 110px)" }}>
                  <h3 className="text-white font-semibold text-sm mb-3 flex-shrink-0">Tagged Plays</h3>
                  <TagList tags={tags} commentCounts={commentCounts} onDelete={deleteTag} onTagClick={seekToTag} onOpenComments={tag => setCommentTag(tag)} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {commentTag && <TagComments tag={commentTag} sessionId={activeSession?.id} user={user} onClose={() => setCommentTag(null)} />}
    </div>
  );
}