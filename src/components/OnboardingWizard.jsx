import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, ChevronRight, Users, CalendarDays, BookOpen, X, Trophy } from "lucide-react";

const STEPS = [
  { id: "welcome",  title: "Welcome to NxGenSports", icon: Trophy },
  { id: "player",   title: "Add your first player",   icon: Users },
  { id: "game",     title: "Schedule a game",          icon: CalendarDays },
  { id: "playbook", title: "Create a play",            icon: BookOpen },
  { id: "done",     title: "You're all set!",           icon: CheckCircle },
];

const SPORT_POSITIONS = {
  football:   ["QB","RB","WR","TE","OL","DL","LB","CB","S"],
  basketball: ["PG","SG","SF","PF","C"],
  baseball:   ["P","C","1B","2B","3B","SS","LF","CF","RF"],
  soccer:     ["GK","DEF","MID","FWD"],
  volleyball: ["S","OH","MB","RS","L"],
  default:    ["Player"],
};

function getPositions(sport) {
  if (!sport) return SPORT_POSITIONS.default;
  const key = Object.keys(SPORT_POSITIONS).find(k => (sport || "").includes(k));
  return key ? SPORT_POSITIONS[key] : SPORT_POSITIONS.default;
}

export default function OnboardingWizard({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState({});

  // Step data
  const sport = user?.assigned_sports?.[0] || "football";
  const positions = getPositions(sport);

  const [playerForm, setPlayerForm] = useState({ first_name: "", last_name: "", position: positions[0] || "Player", jersey_number: "" });
  const [gameForm, setGameForm]     = useState({ name: "", game_date: "", location: "" });
  const [playForm, setPlayForm]     = useState({ name: "", formation: "", category: "run", description: "" });

  const isCoachLeadRole = ["head_coach","admin","athletic_director","offensive_coordinator","defensive_coordinator"].includes(user?.coaching_role || user?.role);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ onboarding_completed: true });
    } catch {}
    setSaving(false);
    onComplete();
  };

  const savePlayer = async () => {
    if (!playerForm.first_name || !playerForm.last_name) { setStep(s => s + 1); return; }
    setSaving(true);
    try {
      await base44.entities.Player.create({
        first_name: playerForm.first_name,
        last_name: playerForm.last_name,
        position: playerForm.position,
        jersey_number: playerForm.jersey_number || undefined,
        sport,
        team_id: user?.team_id,
        school_id: user?.school_id,
        status: "active",
      });
    } catch {}
    setSaving(false);
    setStep(s => s + 1);
  };

  const saveGame = async () => {
    if (!gameForm.name) { setStep(s => s + 1); return; }
    setSaving(true);
    try {
      await base44.entities.Opponent.create({
        name: gameForm.name,
        game_date: gameForm.game_date || undefined,
        location: gameForm.location || undefined,
        sport,
        team_id: user?.team_id,
        school_id: user?.school_id,
      });
    } catch {}
    setSaving(false);
    setStep(s => s + 1);
  };

  const savePlay = async () => {
    if (!playForm.name) { setStep(s => s + 1); return; }
    setSaving(true);
    try {
      await base44.entities.Play.create({
        name: playForm.name,
        formation: playForm.formation || undefined,
        category: playForm.category,
        description: playForm.description || undefined,
        sport,
        team_id: user?.team_id,
        school_id: user?.school_id,
      });
    } catch {}
    setSaving(false);
    setStep(s => s + 1);
  };

  const primaryColor = "var(--color-primary,#00F2FF)";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-[#111111] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">

        {/* Progress bar */}
        <div className="h-1 bg-gray-800">
          <div className="h-full transition-all duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%`, backgroundColor: primaryColor }} />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 pt-5 pb-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${i <= step ? "opacity-100" : "opacity-20 bg-gray-700"}`}
              style={i <= step ? { backgroundColor: primaryColor } : {}} />
          ))}
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* ── Step 0: Welcome ─────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-4 pt-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}22` }}>
                <Trophy className="w-7 h-7" style={{ color: primaryColor }} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Welcome, {user?.full_name?.split(" ")[0] || "Coach"}!</h2>
                <p className="text-gray-400 text-sm mt-1">
                  You're connected to <span className="text-white font-semibold">{user?.school_name || "your school"}</span>. Let's set up your program in 3 quick steps.
                </p>
              </div>
              <ul className="space-y-2">
                {[
                  { icon: Users,        label: "Add your first player to the roster" },
                  { icon: CalendarDays, label: "Schedule an upcoming game" },
                  { icon: BookOpen,     label: "Create your first play" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}22` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                    </div>
                    <span className="text-gray-300 text-sm">{label}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => setStep(1)}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, #1a4bbd)`, color: "#0a0a0a" }}>
                Let's get started <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={handleFinish} className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Skip setup — I'll do this later
              </button>
            </div>
          )}

          {/* ── Step 1: Add Player ──────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: primaryColor }}>Step 1 of 3</p>
                <h2 className="text-xl font-black text-white">Add your first player</h2>
                <p className="text-gray-500 text-xs mt-0.5">This will appear on your Roster page.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">First Name <span className="text-red-400">*</span></label>
                  <input value={playerForm.first_name} onChange={e => setPlayerForm(f => ({ ...f, first_name: e.target.value }))}
                    placeholder="e.g. Marcus" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary,#00F2FF)]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Last Name <span className="text-red-400">*</span></label>
                  <input value={playerForm.last_name} onChange={e => setPlayerForm(f => ({ ...f, last_name: e.target.value }))}
                    placeholder="e.g. Johnson" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary,#00F2FF)]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Position</label>
                  <select value={playerForm.position} onChange={e => setPlayerForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary,#00F2FF)]">
                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Jersey # (optional)</label>
                  <input value={playerForm.jersey_number} onChange={e => setPlayerForm(f => ({ ...f, jersey_number: e.target.value }))}
                    placeholder="#" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary,#00F2FF)]" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={savePlayer} disabled={saving || !playerForm.first_name || !playerForm.last_name}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, #1a4bbd)`, color: "#0a0a0a" }}>
                  {saving ? "Saving..." : "Add Player & Continue"}
                </button>
                <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm hover:text-white hover:bg-gray-700 transition-colors">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Schedule Game ───────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: primaryColor }}>Step 2 of 3</p>
                <h2 className="text-xl font-black text-white">Schedule a game</h2>
                <p className="text-gray-500 text-xs mt-0.5">This will appear on your Game Schedule page.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Opponent Name <span className="text-red-400">*</span></label>
                  <input value={gameForm.name} onChange={e => setGameForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Westview Eagles" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary,#00F2FF)]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Game Date</label>
                    <input type="date" value={gameForm.game_date} onChange={e => setGameForm(f => ({ ...f, game_date: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary,#00F2FF)]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Location (optional)</label>
                    <input value={gameForm.location} onChange={e => setGameForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Home" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary,#00F2FF)]" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveGame} disabled={saving || !gameForm.name}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, #1a4bbd)`, color: "#0a0a0a" }}>
                  {saving ? "Saving..." : "Add Game & Continue"}
                </button>
                <button onClick={() => setStep(3)} className="px-4 py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm hover:text-white hover:bg-gray-700 transition-colors">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Create Play ─────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: primaryColor }}>Step 3 of 3</p>
                <h2 className="text-xl font-black text-white">Create your first play</h2>
                <p className="text-gray-500 text-xs mt-0.5">This will appear in your Playbook.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Play Name <span className="text-red-400">*</span></label>
                  <input value={playForm.name} onChange={e => setPlayForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. 34 Dive" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary,#00F2FF)]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Formation (optional)</label>
                    <input value={playForm.formation} onChange={e => setPlayForm(f => ({ ...f, formation: e.target.value }))}
                      placeholder="e.g. I-Formation" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary,#00F2FF)]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Category</label>
                    <select value={playForm.category} onChange={e => setPlayForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary,#00F2FF)]">
                      <option value="run">Run</option>
                      <option value="pass">Pass</option>
                      <option value="play_action">Play Action</option>
                      <option value="defense">Defense</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
                  <textarea value={playForm.description} onChange={e => setPlayForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Coaching notes, blocking assignments, etc." rows={2}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none resize-none focus:border-[var(--color-primary,#00F2FF)]" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={savePlay} disabled={saving || !playForm.name}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, #1a4bbd)`, color: "#0a0a0a" }}>
                  {saving ? "Saving..." : "Save Play & Finish"}
                </button>
                <button onClick={() => setStep(4)} className="px-4 py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm hover:text-white hover:bg-gray-700 transition-colors">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5 pt-2 text-center">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}33, #1a4bbd33)` }}>
                <CheckCircle className="w-9 h-9" style={{ color: primaryColor }} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">You're all set!</h2>
                <p className="text-gray-400 text-sm mt-2">
                  Your program is live. Here's what you can do next:
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-left">
                {[
                  { label: "Build out your Roster",   emoji: "👥" },
                  { label: "Design plays in Playbook", emoji: "📋" },
                  { label: "Set up Practice Plans",    emoji: "🏃" },
                  { label: "Invite your coaching staff", emoji: "✉️" },
                ].map(({ label, emoji }) => (
                  <div key={label} className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl px-3 py-2.5">
                    <span className="text-base">{emoji}</span>
                    <span className="text-gray-300 text-xs font-medium">{label}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleFinish} disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-bold"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, #1a4bbd)`, color: "#0a0a0a" }}>
                {saving ? "Saving..." : "Go to Dashboard →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
