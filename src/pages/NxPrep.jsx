import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, ClipboardList, Target, Zap, Brain, Sparkles, Search, Plus, Edit, Trash2, X, ChevronDown, ChevronUp, Calendar, MapPin, Pen, Eye, Lock, Clock } from "lucide-react";
import NxPlanAI from "@/components/gameplan/NxPlanAI";
import PlayDesigner from "@/components/playbook/PlayDesigner";
import PlayDiagramViewer from "@/components/playbook/PlayDiagramViewer";
import NxPlayAI from "@/components/playbook/NxPlayAI";
import LoadingScreen from "@/components/LoadingScreen";

const CATEGORIES = ["run","pass","screen","play_action","blitz","coverage","zone","man","punt","kick","return"];
const UNITS = ["offense","defense","special_teams"];
const catColor = { run: "bg-green-500/20 text-green-400", pass: "bg-blue-500/20 text-blue-400", screen: "bg-cyan-500/20 text-cyan-400", play_action: "bg-teal-500/20 text-teal-400", blitz: "bg-red-500/20 text-red-400", coverage: "bg-yellow-500/20 text-yellow-400", zone: "bg-teal-600/20 text-teal-300", man: "bg-sky-500/20 text-sky-400", punt: "bg-gray-500/20 text-gray-400", kick: "bg-gray-500/20 text-gray-400", return: "bg-indigo-500/20 text-indigo-400" };
const STATUS_COLOR = { draft: "bg-yellow-500/20 text-yellow-400", active: "bg-blue-500/20 text-blue-400", completed: "bg-green-500/20 text-green-400" };
const STATUS_CFG = { draft: { label: "Draft", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" }, final: { label: "Final", color: "bg-green-500/20 text-green-400 border-green-500/30" } };

const CAN_CREATE = ["admin","head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach"];
const PRACTICE_EDIT_ROLES = ["admin","head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach"];

export default function NxPrep() {
  const [activeTab, setActiveTab] = useState("playbook");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Playbook state
  const [plays, setPlays] = useState([]);
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [playbookLoading, setPlaybookLoading] = useState(true);
  const [showPlayForm, setShowPlayForm] = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);
  const [designerPlay, setDesignerPlay] = useState(null);
  const [editingPlay, setEditingPlay] = useState(null);
  const [playForm, setPlayForm] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [diagramPlay, setDiagramPlay] = useState(null);
  const [opponents, setOpponents] = useState([]);
  const [showNxPlayAI, setShowNxPlayAI] = useState(false);

  // Game Plan state
  const [gamePlans, setGamePlans] = useState([]);
  const [gamePlanLoading, setGamePlanLoading] = useState(true);
  const [showGPForm, setShowGPForm] = useState(false);
  const [editingGP, setEditingGP] = useState(null);
  const [gpForm, setGpForm] = useState({});
  const [gpSaving, setGpSaving] = useState(false);
  const [gpExpanded, setGpExpanded] = useState({});
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [showGPAI, setShowGPAI] = useState(false);
  const [gpTab, setGpTab] = useState("plans");

  // Practice state
  const [plans, setPlans] = useState([]);
  const [players, setPlayers] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [practiceLoading, setPracticeLoading] = useState(true);
  const [showPracticeForm, setShowPracticeForm] = useState(false);
  const [editingPractice, setEditingPractice] = useState(null);
  const [practiceForm, setPracticeForm] = useState({ periods: [] });
  const [practiceExpanded, setPracticeExpanded] = useState(null);
  const [showNxGenerator, setShowNxGenerator] = useState(false);
  const [genForm, setGenForm] = useState({ duration_minutes: 120, focus: "", opponent_id: "" });
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [genPracticeLoading, setGenPracticeLoading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadPlaybookData();
    loadGamePlanData();
    loadPracticeData();
    setLoading(false);
  }, []);

  const loadPlaybookData = async () => {
    try {
      const [playData, oppData] = await Promise.all([
        base44.entities.Play.list(),
        base44.entities.Opponent.list()
      ]);
      setPlays(playData);
      setOpponents(oppData);
      setPlaybookLoading(false);
    } catch (err) {
      console.error("Error loading playbook:", err);
      setPlaybookLoading(false);
    }
  };

  const loadGamePlanData = async () => {
    try {
      const [gpData, oppData] = await Promise.all([
        base44.entities.GamePlan.list("-game_date"),
        base44.entities.Opponent.list("game_date")
      ]);
      setGamePlans(gpData);
      setOpponents(oppData);
      setGamePlanLoading(false);
    } catch (err) {
      console.error("Error loading game plans:", err);
      setGamePlanLoading(false);
    }
  };

  const loadPracticeData = async () => {
    try {
      const [pr, pl, h, op] = await Promise.all([
        base44.entities.PracticePlan.list("-date"),
        base44.entities.Player.list(),
        base44.entities.PlayerHealth.list(),
        base44.entities.Opponent.list("-game_date")
      ]);
      setPlans(pr);
      setPlayers(pl);
      setHealthRecords(h);
      setOpponents(op);
      setPracticeLoading(false);
    } catch (err) {
      console.error("Error loading practice:", err);
      setPracticeLoading(false);
    }
  };

  const canCreate = user && CAN_CREATE.includes(user.role);
  const canEditPlay = (p) => {
    if (!canCreate) return false;
    if (user?.role === "position_coach") return p.created_by === user?.email;
    return true;
  };
  const canDeletePlay = (p) => canEditPlay(p);
  const canEditPractice = user && PRACTICE_EDIT_ROLES.includes(user.role);

  // PLAYBOOK FUNCTIONS
  const savePlay = async () => {
    if (editingPlay) {
      await base44.entities.Play.update(editingPlay.id, playForm);
      setShowPlayForm(false);
      loadPlaybookData();
    } else {
      const newPlay = await base44.entities.Play.create(playForm);
      setShowPlayForm(false);
      setDesignerPlay(newPlay);
      setShowDesigner(true);
      loadPlaybookData();
    }
  };

  const removePlay = async (id) => {
    if (confirm("Delete play?")) {
      await base44.entities.Play.delete(id);
      loadPlaybookData();
    }
  };

  const getAISuggestions = async () => {
    setAiLoading(true);
    setAiSuggestions("");
    const existing = plays.map(p => `${p.name} (${p.category}, ${p.unit})`).join(", ");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a football offensive/defensive coordinator AI. Based on a high school/college football team, suggest 5 highly effective plays that would complement their existing playbook.\n\nExisting plays: ${existing || "None yet"}\n\nProvide play suggestions with:\n- Play name\n- Formation\n- Category (run/pass/screen/play_action/blitz/coverage/zone/man)\n- Brief description\n- Best down & distance situation\n\nFormat clearly and be specific.`,
    });
    setAiSuggestions(res);
    setAiLoading(false);
  };

  // GAME PLAN FUNCTIONS
  const saveGamePlan = async () => {
    setGpSaving(true);
    if (editingGP) await base44.entities.GamePlan.update(editingGP.id, gpForm);
    else await base44.entities.GamePlan.create(gpForm);
    setShowGPForm(false);
    setGpSaving(false);
    loadGamePlanData();
  };

  const removeGamePlan = async (id) => {
    if (!confirm("Delete this game plan?")) return;
    await base44.entities.GamePlan.delete(id);
    setGamePlans(p => p.filter(x => x.id !== id));
  };

  const openPlayAdd = () => { setEditingPlay(null); setPlayForm({ unit: "offense", category: "run", is_private: false }); setShowPlayForm(true); };
  const openPlayEdit = (p) => { setEditingPlay(p); setPlayForm({...p}); setShowPlayForm(true); };

  const openGPAdd = () => {
    setEditingGP(null);
    setGpForm({ unit: "offense", status: "draft", scripted_plays: [], red_zone_plays: [], third_down_plays: [], two_minute_plays: [], opening_script: [] });
    setShowGPForm(true);
  };

  const openGPEdit = (p) => { setEditingGP(p); setGpForm({ ...p }); setShowGPForm(true); };

  const openPracticeAdd = () => {
    setEditingPractice(null);
    setPracticeForm({ title: "", date: "", focus: "", duration_minutes: 120, status: "draft", periods: [] });
    setShowPracticeForm(true);
  };

  const openPracticeEdit = (p) => { setEditingPractice(p); setPracticeForm({...p, periods: p.periods || []}); setShowPracticeForm(true); };

  const savePractice = async () => {
    if (editingPractice) await base44.entities.PracticePlan.update(editingPractice.id, practiceForm);
    else await base44.entities.PracticePlan.create(practiceForm);
    setShowPracticeForm(false);
    loadPracticeData();
  };

  const removePractice = async (id) => {
    if (confirm("Delete practice plan?")) {
      await base44.entities.PracticePlan.delete(id);
      loadPracticeData();
    }
  };

  const addPeriod = () => setPracticeForm(f => ({ ...f, periods: [...(f.periods || []), { name: "", duration: 10, unit: "team", drill: "", notes: "" }] }));
  const updatePeriod = (i, field, val) => setPracticeForm(f => {
    const periods = [...(f.periods || [])];
    periods[i] = { ...periods[i], [field]: val };
    return { ...f, periods };
  });
  const removePeriod = (i) => setPracticeForm(f => ({ ...f, periods: f.periods.filter((_, idx) => idx !== i) }));

  const generateNxPlan = async () => {
    setGenPracticeLoading(true);
    setGenResult(null);
    const injuredPlayers = players.filter(p => p.status === "injured").map(p => `${p.first_name} ${p.last_name} (${p.position})`).join(", ");
    const limitedPlayers = healthRecords.filter(h => h.availability === "limited").map(h => `${h.player_name}`).join(", ");
    const opponent = opponents.find(o => o.id === genForm.opponent_id);
    const upcomingOpponents = opponents.filter(o => new Date(o.game_date) >= new Date()).slice(0, 3);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an elite football coaching AI for NxDown. Generate a complete, tailored practice session.

Team Status:
- Total Players: ${players.length}
- Injured/Out: ${injuredPlayers || "None"}
- Limited Players: ${limitedPlayers || "None"}
- Practice Duration: ${genForm.duration_minutes} minutes
- Focus Area: ${genForm.focus || "General preparation"}

${opponent ? `Upcoming Opponent: ${opponent.name} (${opponent.game_date}, ${opponent.location})
Offensive Tendency: ${opponent.offensive_tendency || "Unknown"}
Defensive Tendency: ${opponent.defensive_tendency || "Unknown"}
Key Players: ${opponent.key_players || "Unknown"}
Weaknesses: ${opponent.weaknesses || "Unknown"}` : `Upcoming Games: ${upcomingOpponents.map(o => o.name + " on " + o.game_date).join(", ") || "None scheduled"}`}

Generate a complete, structured practice plan with specific drills, focus areas, and timing. Optimize for the opponent and team needs.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          focus: { type: "string" },
          coaching_theme: { type: "string", description: "One key message for the day" },
          periods: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                duration: { type: "number" },
                unit: { type: "string" },
                drill: { type: "string" },
                coaching_points: { type: "array", items: { type: "string" } },
                notes: { type: "string" }
              }
            }
          },
          opponent_prep_notes: { type: "string" },
          health_accommodations: { type: "string" },
          total_minutes: { type: "number" }
        }
      }
    });
    setGenResult(res);
    setGenPracticeLoading(false);
  };

  const saveGeneratedPlan = async () => {
    if (!genResult) return;
    const today = new Date().toISOString().split("T")[0];
    await base44.entities.PracticePlan.create({
      title: genResult.title || "Nx Generated Practice",
      focus: genResult.focus || genForm.focus,
      date: today,
      duration_minutes: genResult.total_minutes || genForm.duration_minutes,
      status: "draft",
      periods: genResult.periods || [],
      ai_suggestions: `Coaching Theme: ${genResult.coaching_theme || ""}\n\n${genResult.opponent_prep_notes ? "Opponent Prep: " + genResult.opponent_prep_notes : ""}\n\n${genResult.health_accommodations ? "Health Notes: " + genResult.health_accommodations : ""}`.trim(),
      notes: genResult.coaching_theme || ""
    });
    setShowNxGenerator(false);
    setGenResult(null);
    loadPracticeData();
  };

  const filtered = plays.filter(p => {
    if (p.is_private && p.created_by !== user?.email && user?.role === "position_coach") return false;
    const match = p.name?.toLowerCase().includes(search.toLowerCase()) || p.formation?.toLowerCase().includes(search.toLowerCase());
    const matchUnit = filterUnit === "all" || p.unit === filterUnit;
    const matchCat = filterCat === "all" || p.category === filterCat;
    return match && matchUnit && matchCat;
  });

  const groups = UNITS.reduce((acc, u) => {
    acc[u] = filtered.filter(p => p.unit === u);
    return acc;
  }, {});

  const playsByUnit = (plan) => [
    { label: "Opening Script", items: plan.opening_script, color: "text-blue-400" },
    { label: "Scripted Plays", items: plan.scripted_plays, color: "text-orange-400" },
    { label: "Red Zone", items: plan.red_zone_plays, color: "text-red-400" },
    { label: "3rd Down", items: plan.third_down_plays, color: "text-yellow-400" },
    { label: "2-Minute", items: plan.two_minute_plays, color: "text-purple-400" },
  ].filter(s => s.items?.length > 0);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-[#0a0a0a] min-h-full flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-[#111111] border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5" style={{ color: "var(--color-primary,#f97316)" }} />
            <span className="text-white font-black text-lg">Nx<span style={{ color: "var(--color-primary,#f97316)" }}>Prep</span></span>
          </div>
        </div>
        <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-0.5 overflow-x-auto">
          {[
            { id: "playbook", label: "Playbook", icon: BookOpen },
            { id: "gameplan", label: "Game Plan", icon: Target },
            { id: "practice", label: "Practice", icon: ClipboardList }
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${activeTab === id ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              style={activeTab === id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* PLAYBOOK TAB */}
        {activeTab === "playbook" && (
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-white">Play<span style={{ color: "var(--color-primary,#f97316)" }}>book</span></h1>
                <p className="text-gray-500 text-sm">{plays.length} plays in library</p>
              </div>
              <div className="flex gap-2">
                {canCreate && (
                  <button onClick={() => setShowNxPlayAI(true)}
                    className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 text-teal-400 px-3 py-2 rounded-lg text-sm font-medium transition-all">
                    <Brain className="w-4 h-4" /><span className="hidden md:inline">NxPlay AI</span>
                  </button>
                )}
                {canCreate && (
                  <button onClick={getAISuggestions} disabled={aiLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border" style={{ backgroundColor: "var(--color-primary,#f97316)18", borderColor: "var(--color-primary,#f97316)55", color: "var(--color-primary,#f97316)" }}>
                    <Zap className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} /><span className="hidden md:inline">{aiLoading ? "Thinking..." : "NxPlay"}</span>
                  </button>
                )}
                {canCreate && (
                  <button onClick={() => { setDesignerPlay(null); setShowDesigner(true); }}
                    className="flex items-center gap-2 bg-teal-600/20 border border-teal-500/30 hover:bg-teal-600/30 text-teal-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                    <Pen className="w-4 h-4" /><span className="hidden md:inline">Designer</span>
                  </button>
                )}
                {canCreate && (
                  <button onClick={openPlayAdd}
                    className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                    <Plus className="w-4 h-4" /> Add Play
                  </button>
                )}
              </div>
            </div>

            {aiSuggestions && (
              <div className="rounded-xl p-4 mb-6 border" style={{ backgroundColor: "var(--color-primary,#f97316)15", borderColor: "var(--color-primary,#f97316)40" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
                  <span className="font-medium text-sm" style={{ color: "var(--color-primary,#f97316)" }}>NxPlay Suggestions</span>
                  <button onClick={() => setAiSuggestions("")} className="ml-auto text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-line">{aiSuggestions}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plays..."
                  className="w-full bg-[#141414] border border-gray-800 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none" />
              </div>
              <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
                className="bg-[#141414] border border-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none">
                <option value="all">All Units</option>
                {UNITS.map(u => <option key={u} value={u}>{u.replace("_"," ")}</option>)}
              </select>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="bg-[#141414] border border-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none">
                <option value="all">All Types</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_"," ")}</option>)}
              </select>
            </div>

            <div className="space-y-6">
              {UNITS.map(u => {
                if (filterUnit !== "all" && filterUnit !== u) return null;
                const unitPlays = groups[u] || [];
                if (unitPlays.length === 0 && filterUnit === "all") return null;
                return (
                  <div key={u}>
                    <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${u === "offense" ? "bg-blue-500" : u === "defense" ? "bg-red-500" : "bg-purple-500"}`} />
                      {u.replace("_"," ")} <span className="text-gray-600 font-normal">({unitPlays.length})</span>
                    </h2>
                    {unitPlays.length === 0 ? (
                      <p className="text-gray-600 text-sm">No plays yet</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unitPlays.map(p => (
                          <div key={p.id} className="bg-[#141414] border border-gray-800 rounded-xl p-4 transition-all group" onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-primary,#f97316)55"} onMouseLeave={e => e.currentTarget.style.borderColor = ""}>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-white font-bold">{p.name}</p>
                                  {p.is_private && <Lock className="w-3 h-3 text-teal-400 flex-shrink-0" title="Private play" />}
                                </div>
                                {p.formation && <p className="text-gray-500 text-xs mt-0.5">{p.formation}</p>}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setDiagramPlay(p)} className="text-gray-500 hover:text-blue-400 p-1" title="View Diagram"><Eye className="w-3.5 h-3.5" /></button>
                                {canEditPlay(p) && <button onClick={() => { setDesignerPlay(p); setShowDesigner(true); }} className="text-gray-500 hover:text-teal-400 p-1" title="Edit Diagram"><Pen className="w-3.5 h-3.5" /></button>}
                                {canEditPlay(p) && <button onClick={() => openPlayEdit(p)} className="text-gray-500 p-1" onMouseEnter={e => e.currentTarget.style.color = "var(--color-primary,#f97316)"} onMouseLeave={e => e.currentTarget.style.color = ""}><Edit className="w-3.5 h-3.5" /></button>}
                                {canDeletePlay(p) && <button onClick={() => removePlay(p.id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${catColor[p.category] || "bg-gray-500/20 text-gray-400"}`}>{p.category?.replace("_"," ")}</span>
                              {p.down_distance && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{p.down_distance}</span>}
                              {p.ai_suggested && <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: "var(--color-primary,#f97316)25", color: "var(--color-primary,#f97316)" }}><Zap className="w-2.5 h-2.5" />Nx</span>}
                            </div>
                            {p.description && <p className="text-gray-500 text-xs mt-2 line-clamp-2">{p.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {plays.length === 0 && !playbookLoading && (
              <div className="text-center py-20">
                <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No plays yet. Add your first play or use AI suggestions.</p>
              </div>
            )}

            {/* NxPlay AI Modal */}
            {showNxPlayAI && (
              <NxPlayAI
                plays={plays}
                opponents={opponents}
                onClose={() => setShowNxPlayAI(false)}
                onSavePlay={() => { loadPlaybookData(); setShowNxPlayAI(false); }}
                onOpenDesigner={({ play, elements }) => {
                  setShowNxPlayAI(false);
                  setDesignerPlay({ ...play, _designerElements: elements });
                  setShowDesigner(true);
                }}
              />
            )}

            {/* Diagram Viewer */}
            {diagramPlay && <PlayDiagramViewer play={diagramPlay} onClose={() => setDiagramPlay(null)} />}

            {/* Play Designer */}
            {showDesigner && (
              <PlayDesigner
                onClose={() => { setShowDesigner(false); setDesignerPlay(null); }}
                initialData={designerPlay ? { elements: designerPlay._designerElements || [] } : undefined}
                playName={designerPlay?.name}
                onSave={async ({ dataUrl, elements, format }) => {
                  if (designerPlay?.id) {
                    await base44.entities.Play.update(designerPlay.id, { diagram_data: dataUrl, _designerElements: elements, diagram_format: format });
                  } else {
                    await base44.entities.Play.create({ name: designerPlay?.name || "Untitled Play", unit: designerPlay?.unit || "offense", category: designerPlay?.category || "run", diagram_data: dataUrl, _designerElements: elements, diagram_format: format });
                  }
                  loadPlaybookData();
                }}
              />
            )}

            {/* Play Form */}
            {showPlayForm && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-5 border-b border-gray-800">
                    <h2 className="text-white font-bold">{editingPlay ? "Edit Play" : "Add Play"}</h2>
                    <button onClick={() => setShowPlayForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-gray-400 text-xs mb-1 block">Play Name *</label>
                        <input value={playForm.name || ""} onChange={e => setPlayForm({...playForm, name: e.target.value})}
                          className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Unit *</label>
                        <select value={playForm.unit || "offense"} onChange={e => setPlayForm({...playForm, unit: e.target.value})}
                          className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                          {UNITS.map(u => <option key={u} value={u}>{u.replace("_"," ")}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Category *</label>
                        <select value={playForm.category || "run"} onChange={e => setPlayForm({...playForm, category: e.target.value})}
                          className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_"," ")}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Formation</label>
                        <input value={playForm.formation || ""} onChange={e => setPlayForm({...playForm, formation: e.target.value})} placeholder="e.g. Shotgun 11 Personnel"
                          className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Description</label>
                      <textarea value={playForm.description || ""} onChange={e => setPlayForm({...playForm, description: e.target.value})} rows={3} placeholder="Describe the play..."
                        className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setShowPlayForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                      <button onClick={savePlay} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Save Play</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GAME PLAN TAB */}
        {activeTab === "gameplan" && (
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-white">Nx<span style={{ color: "var(--color-primary,#f97316)" }}>Plan</span></h1>
                <p className="text-gray-500 text-sm">AI-powered game planning · {gamePlans.length} plans</p>
              </div>
              {canCreate && gpTab === "plans" && (
                <button onClick={openGPAdd}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                  <Plus className="w-4 h-4" /> New Plan
                </button>
              )}
            </div>

            <div className="flex gap-1 bg-[#141414] border border-gray-800 rounded-lg p-1 w-fit mb-6">
              {[{ id: "plans", label: "Game Plans" }, { id: "ai", label: "NxPlan AI" }].map(t => (
                <button key={t.id} onClick={() => setGpTab(t.id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${gpTab === t.id ? "text-white" : "text-gray-400 hover:text-white"}`}
                  style={gpTab === t.id ? { backgroundColor: "var(--color-primary,#f97316)" } : {}}>
                  {t.id === "ai" && <Brain className="w-3.5 h-3.5 inline mr-1.5" />}
                  {t.label}
                </button>
              ))}
            </div>

            {gpTab === "ai" && (
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Generate plan for opponent</label>
                  <select value={selectedOpponent?.id || ""}
                    onChange={e => setSelectedOpponent(opponents.find(o => o.id === e.target.value) || null)}
                    className="bg-[#141414] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none w-full md:w-80">
                    <option value="">Select upcoming opponent...</option>
                    {opponents.map(o => <option key={o.id} value={o.id}>{o.name} – {o.game_date}</option>)}
                  </select>
                </div>
                <NxPlanAI
                  opponent={selectedOpponent}
                  players={players}
                  plays={plays}
                  onSave={() => { loadGamePlanData(); setGpTab("plans"); }}
                />
              </div>
            )}

            {gpTab === "plans" && (
              <div className="space-y-4">
                {gamePlans.length === 0 ? (
                  <div className="text-center py-20 text-gray-600">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-semibold text-gray-500">No game plans yet</p>
                  </div>
                ) : gamePlans.map(plan => {
                  const sections = playsByUnit(plan);
                  const isOpen = gpExpanded[plan.id];
                  return (
                    <div key={plan.id} className="bg-[#141414] border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all">
                      <div className="px-5 py-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-white font-bold text-lg">vs. {plan.opponent}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CFG[plan.status]?.color || STATUS_CFG.draft.color}`}>
                              {STATUS_CFG[plan.status]?.label || "Draft"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-gray-500 text-xs flex-wrap">
                            {plan.game_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {plan.game_date}</span>}
                            {sections.length > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {sections.reduce((s, sec) => s + (sec.items?.length || 0), 0)} plays</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canCreate && (
                            <>
                              <button onClick={() => openGPEdit(plan)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-all">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => removeGamePlan(plan.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button onClick={() => setGpExpanded(e => ({ ...e, [plan.id]: !e[plan.id] }))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-all">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                          {plan.key_tendencies && (
                            <div>
                              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Key Tendencies</p>
                              <p className="text-gray-300 text-sm leading-relaxed">{plan.key_tendencies}</p>
                            </div>
                          )}
                          {sections.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {sections.map(sec => (
                                <div key={sec.label} className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-3">
                                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${sec.color}`}>{sec.label}</p>
                                  <ol className="space-y-1">
                                    {sec.items.slice(0, 8).map((play, i) => (
                                      <li key={i} className="text-gray-300 text-xs flex items-start gap-1.5">
                                        <span className={`font-bold flex-shrink-0 ${sec.color}`}>{i + 1}.</span> {play}
                                      </li>
                                    ))}
                                    {sec.items.length > 8 && <li className="text-gray-600 text-xs">+{sec.items.length - 8} more</li>}
                                  </ol>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* GP Form */}
            {showGPForm && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-[#141414] border border-gray-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-[#141414] z-10">
                    <h2 className="text-white font-bold">{editingGP ? "Edit Game Plan" : "New Game Plan"}</h2>
                    <button onClick={() => setShowGPForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Opponent *</label>
                        <input value={gpForm.opponent || ""} onChange={e => setGpForm({ ...gpForm, opponent: e.target.value })}
                          className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Game Date *</label>
                        <input type="date" value={gpForm.game_date || ""} onChange={e => setGpForm({ ...gpForm, game_date: e.target.value })}
                          className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setShowGPForm(false)} className="flex-1 bg-gray-800 text-gray-300 py-2.5 rounded-xl text-sm">Cancel</button>
                      <button onClick={saveGamePlan} disabled={gpSaving || !gpForm.opponent || !gpForm.game_date}
                        className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                        {gpSaving ? "Saving..." : editingGP ? "Update Plan" : "Create Plan"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRACTICE TAB */}
        {activeTab === "practice" && (
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-white">Practice <span style={{ color: "var(--color-primary,#f97316)" }}>Plans</span></h1>
                <p className="text-gray-500 text-sm">{plans.length} plans</p>
              </div>
              <div className="flex gap-2">
                {canEditPractice && (
                  <button onClick={() => { setGenForm({ duration_minutes: 120, focus: "", opponent_id: "" }); setGenResult(null); setShowNxGenerator(true); }}
                    className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 text-teal-400 px-3 py-2 rounded-lg text-sm font-medium transition-all">
                    <Brain className="w-4 h-4" /><span className="hidden md:inline">Nx Generator</span>
                  </button>
                )}
                {canEditPractice && (
                  <button onClick={openPracticeAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
                    <Plus className="w-4 h-4" /> New Practice
                  </button>
                )}
              </div>
            </div>

            {plans.length === 0 ? (
              <div className="text-center py-20">
                <ClipboardList className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No practice plans yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map(plan => (
                  <div key={plan.id} className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-white font-bold">{plan.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[plan.status]}`}>{plan.status}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                          <span>{plan.date}</span>
                          {plan.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{plan.duration_minutes} min</span>}
                          {plan.focus && <span>· {plan.focus}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {canEditPractice && <button onClick={() => openPracticeEdit(plan)} className="text-gray-500 p-1.5" onMouseEnter={e => e.currentTarget.style.color="var(--color-primary,#f97316)"} onMouseLeave={e => e.currentTarget.style.color=""}><Edit className="w-4 h-4" /></button>}
                        {canEditPractice && <button onClick={() => removePractice(plan.id)} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>}
                        <button onClick={() => setPracticeExpanded(practiceExpanded === plan.id ? null : plan.id)} className="text-gray-500 hover:text-white p-1.5">
                          {practiceExpanded === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {practiceExpanded === plan.id && (
                      <div className="border-t border-gray-800 p-4 space-y-4">
                        {plan.periods?.length > 0 && (
                          <div>
                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Practice Schedule</p>
                            <div className="space-y-2">
                              {plan.periods.map((period, i) => (
                                <div key={i} className="flex items-start gap-3 bg-[#1a1a1a] rounded-lg p-3">
                                  <div className="text-white text-xs font-bold px-2 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>{period.duration}m</div>
                                  <div className="flex-1">
                                    <p className="text-white text-sm font-medium">{period.name || "Period"}</p>
                                    {period.drill && <p className="text-gray-400 text-xs mt-0.5">{period.drill}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Nx Generator Modal */}
            {showNxGenerator && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-[#141414] border border-teal-500/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-5 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-teal-400" />
                      <h2 className="text-white font-bold">Nx Practice Generator</h2>
                      <span className="text-teal-400 text-xs bg-teal-500/20 px-2 py-0.5 rounded-full">AI-Powered</span>
                    </div>
                    <button onClick={() => { setShowNxGenerator(false); setGenResult(null); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    {!genResult ? (
                      <>
                        <p className="text-gray-500 text-sm">Nx Intelligence will analyze your team's needs, health status, and upcoming opponents to generate an optimized practice plan.</p>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Duration (minutes)</label>
                            <input type="number" value={genForm.duration_minutes} onChange={e => setGenForm(f => ({ ...f, duration_minutes: +e.target.value }))}
                              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Opponent to Prepare For</label>
                            <select value={genForm.opponent_id} onChange={e => setGenForm(f => ({ ...f, opponent_id: e.target.value }))}
                              className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none">
                              <option value="">Auto-detect next game</option>
                              {opponents.filter(o => new Date(o.game_date) >= new Date()).map(o => (
                                <option key={o.id} value={o.id}>{o.name} ({o.game_date})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button onClick={() => setShowNxGenerator(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm">Cancel</button>
                          <button onClick={generateNxPlan} disabled={genPracticeLoading}
                            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium">
                            {genPracticeLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate with Nx AI
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-teal-400" />
                            <h3 className="text-white font-bold text-lg">{genResult.title}</h3>
                          </div>
                          <p className="text-teal-300 text-sm italic">"{genResult.coaching_theme}"</p>
                        </div>

                        <div className="flex gap-3">
                          <button onClick={() => setGenResult(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm">Regenerate</button>
                          <button onClick={saveGeneratedPlan} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium">
                            Save Practice Plan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Practice Form */}
            {showPracticeForm && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-5 border-b border-gray-800">
                    <h2 className="text-white font-bold">{editingPractice ? "Edit Practice Plan" : "New Practice Plan"}</h2>
                    <button onClick={() => setShowPracticeForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-gray-400 text-xs mb-1 block">Title *</label>
                        <input value={practiceForm.title || ""} onChange={e => setPracticeForm({...practiceForm, title: e.target.value})}
                          className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Date *</label>
                        <input type="date" value={practiceForm.date || ""} onChange={e => setPracticeForm({...practiceForm, date: e.target.value})}
                          className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Duration (min)</label>
                        <input type="number" value={practiceForm.duration_minutes || ""} onChange={e => setPracticeForm({...practiceForm, duration_minutes: +e.target.value})}
                          className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-gray-400 text-xs uppercase tracking-wider">Practice Periods</label>
                        <button onClick={addPeriod} className="text-orange-500 hover:text-orange-400 text-xs flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add Period
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(practiceForm.periods || []).map((period, i) => (
                          <div key={i} className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <input value={period.name || ""} onChange={e => updatePeriod(i, "name", e.target.value)} placeholder="Period name"
                                className="flex-1 bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs focus:outline-none focus:border-orange-500" />
                              <input type="number" value={period.duration || ""} onChange={e => updatePeriod(i, "duration", +e.target.value)} placeholder="Min"
                                className="w-16 bg-[#111] border border-gray-700 text-white px-2 py-1.5 rounded text-xs focus:outline-none focus:border-orange-500" />
                              <button onClick={() => removePeriod(i)} className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setShowPracticeForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                      <button onClick={savePractice} className="flex-1 text-white py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>Save Plan</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}