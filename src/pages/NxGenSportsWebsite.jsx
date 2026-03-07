import { useState, useEffect, useRef } from "react";
import {
  ChevronDown, ChevronRight, ArrowRight, CheckCircle2, Star,
  MessageSquare, Zap, Shield, Users, Activity, Target,
  Smartphone, Globe, Play, Trophy, Heart, BookOpen,
  Bell, Video, BarChart2, Lock, Menu, X, ExternalLink,
  Sparkles, Radio
} from "lucide-react";

// ─── SPORT PRODUCTS ──────────────────────────────────────────────────────────
const SPORTS = [
  { id: "nxdown",   name: "NxDown",   sport: "Football",     emoji: "🏈", color: "#f97316", tagline: "Next-Gen Football Systems",          desc: "Playbooks, game plans, depth charts, film room, analytics & in-game live tracking for football programs." },
  { id: "nxbucket", name: "NxBucket", sport: "Basketball",   emoji: "🏀", color: "#f59e0b", tagline: "Next-Gen Basketball Systems",         desc: "Scouting, shot charts, rotations, practice scripting and real-time game management for basketball." },
  { id: "nxset",    name: "NxSet",    sport: "Volleyball",   emoji: "🏐", color: "#8b5cf6", tagline: "Next-Gen Volleyball Systems",         desc: "Rotation tracking, opponent tendencies, serve charts and film sessions for volleyball programs." },
  { id: "nxpitch",  name: "NxPitch",  sport: "Baseball",     emoji: "⚾", color: "#10b981", tagline: "Next-Gen Baseball Systems",           desc: "Pitch tracking, lineup builder, bullpen management, scouting reports and in-game analytics." },
  { id: "nxgoal",   name: "NxGoal",   sport: "Soccer",       emoji: "⚽", color: "#3b82f6", tagline: "Next-Gen Soccer Systems",             desc: "Formation builder, pressing triggers, set piece library, GPS heat maps and live possession data." },
  { id: "nxmatch",  name: "NxMatch",  sport: "Tennis",       emoji: "🎾", color: "#ec4899", tagline: "Next-Gen Tennis Systems",             desc: "Match charting, serve tendency breakdowns, player development tracking and mental readiness." },
  { id: "nxhole",   name: "NxHole",   sport: "Golf",         emoji: "⛳", color: "#84cc16", tagline: "Next-Gen Golf Systems",               desc: "Course management, yardage books, practice rounds, stats tracking and tournament analytics." },
  { id: "nxcourt",  name: "NxCourt",  sport: "Lacrosse",     emoji: "🥍", color: "#06b6d4", tagline: "Next-Gen Lacrosse Systems",           desc: "Offensive sets, defensive alignments, recruiting profiles and live face-off analytics." },
];

// ─── PLATFORM FEATURES ───────────────────────────────────────────────────────
const FEATURES = [
  { icon: Zap,          title: "Nx AI Intelligence",       desc: "Embedded AI across every sport — game plans, scouting reports, practice scripts, play suggestions and real-time in-game analysis.",          color: "#a855f7" },
  { icon: Radio,        title: "NxCall – Live Game Mode",  desc: "Real-time in-game play calling interface with live score tracking, down & distance, play log and instant push alerts to staff.",            color: "#f97316" },
  { icon: MessageSquare,title: "NxMessage",                desc: "Org-wide, sport-specific and private messaging. Groups, channels, announcements — all in one secure hub.",                                   color: "#3b82f6" },
  { icon: Heart,        title: "Parent Portal",            desc: "Parents connect to every sport their child plays from one login. Message coaches, get game alerts, see schedules and track development.",    color: "#ec4899" },
  { icon: Video,        title: "NxLab – Film & Scouting",  desc: "Upload film, annotate plays, tag tendencies and generate AI breakdowns. Opponent scouting and film review in one unified lab.",             color: "#10b981" },
  { icon: BarChart2,    title: "Analytics & Performance",  desc: "Player grades, GPS biometrics, film grades, EPA, play efficiency — import from Hudl, Catapult, MaxPreps and more.",                        color: "#f59e0b" },
  { icon: Shield,       title: "Medical & Compliance",     desc: "Physical tracking, concussion baseline, waivers, insurance and academic eligibility — fully documented and audit-ready.",                   color: "#ef4444" },
  { icon: Users,        title: "Multi-Role Access Control", desc: "Admin, Head Coach, Coordinators, Position Coaches, Trainers, Players, Parents — each with the right level of access.",                    color: "#06b6d4" },
];

// ─── PARENT PORTAL FEATURES ──────────────────────────────────────────────────
const PARENT_FEATURES = [
  "Connect to all your child's sports from one login",
  "Receive real-time game score updates & alerts",
  "Message the coaching staff directly",
  "Connect with other sport parents",
  "View practice & game schedules",
  "Track your player's health & availability status",
  "Receive academic eligibility notifications",
  "Join sport-specific parent groups",
];

// ─── NAV LINKS ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Sports", href: "#sports" },
  { label: "Features", href: "#features" },
  { label: "Parent Portal", href: "#parents" },
  { label: "Org Suite", href: "#org" },
  { label: "Pricing", href: "#pricing" },
];

function SectionLabel({ children }) {
  return (
    <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-4">
      {children}
    </span>
  );
}

function SportCard({ sport, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative bg-[#111111] border border-gray-800 rounded-2xl p-6 transition-all duration-300 cursor-pointer overflow-hidden group"
      style={{ borderColor: hovered ? sport.color + "55" : undefined, boxShadow: hovered ? `0 0 30px ${sport.color}15` : undefined }}
    >
      {/* Glow bg */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ backgroundColor: sport.color }} />
      <div className="text-4xl mb-3">{sport.emoji}</div>
      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-xl font-black text-white">
          Nx<span style={{ color: sport.color }}>{sport.name.slice(2)}</span>
        </h3>
        <span className="text-xs text-gray-600 font-medium">{sport.sport}</span>
      </div>
      <p className="text-gray-500 text-xs mb-4 leading-relaxed">{sport.desc}</p>
      <div className="flex items-center gap-1 text-xs font-semibold transition-all" style={{ color: sport.color }}>
        Learn more <ArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
}

export default function NxGenSportsWebsite() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSport, setActiveSport] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSport(prev => (prev + 1) % SPORTS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white font-['Inter',sans-serif] overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#080808]/95 backdrop-blur border-b border-gray-800/60" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8dea6f5ebfce20bad2a8c/871a00698_image_aaa46895.png"
              alt="NxGenSports" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-black text-xl text-white tracking-tight">
              Nx<span className="text-orange-400">Gen</span><span className="text-gray-500 font-light">Sports</span>
            </span>
          </div>
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)} className="text-gray-400 hover:text-white text-sm transition-colors">{l.label}</button>
            ))}
          </div>
          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button className="text-sm text-gray-400 hover:text-white transition-colors">Sign In</button>
            <button className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg,#f97316,#fb923c)" }}>
              Request Demo
            </button>
          </div>
          {/* Mobile toggle */}
          <button className="md:hidden p-2 text-gray-400" onClick={() => setMobileMenuOpen(v => !v)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0d0d0d] border-b border-gray-800 px-4 py-4 space-y-3">
            {NAV_LINKS.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)} className="block text-gray-300 text-sm py-1 w-full text-left">{l.label}</button>
            ))}
            <button className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg,#f97316,#fb923c)" }}>
              Request Demo
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Grid bg */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle,#f97316,transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl" style={{ background: "radial-gradient(circle,#8b5cf6,transparent)" }} />

        <div className="relative max-w-5xl mx-auto px-4 md:px-8 text-center">
          {/* Sport cycle pill */}
          <div className="inline-flex items-center gap-2 bg-[#141414] border border-gray-800 rounded-full px-4 py-1.5 mb-8 text-sm">
            <span className="text-2xl transition-all duration-500">{SPORTS[activeSport].emoji}</span>
            <span className="text-gray-400">Now building for</span>
            <span className="font-bold transition-all duration-500" style={{ color: SPORTS[activeSport].color }}>
              {SPORTS[activeSport].name}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            The Intelligence Platform<br />
            <span className="relative">
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#f97316,#fb923c,#fbbf24)" }}>
                for Every Sport
              </span>
            </span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            NxGenSports brings next-generation AI coaching tools, live game management, org-wide communication and a connected parent portal to every sport — all under one platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-bold text-base transition-all hover:scale-105 hover:shadow-2xl" style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", boxShadow: "0 0 40px #f9731640" }}>
              Request Early Access
            </button>
            <button onClick={() => scrollTo("#sports")} className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-gray-700 text-white font-semibold text-base hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              Explore Products <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Hero sport logos row */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-16 opacity-60">
            {SPORTS.map((s, i) => (
              <div key={s.id} onClick={() => setActiveSport(i)} className="flex items-center gap-1.5 bg-[#111111] border border-gray-800 rounded-xl px-3 py-1.5 cursor-pointer hover:border-gray-600 transition-all text-sm" style={activeSport === i ? { borderColor: s.color + "66", opacity: 1 } : {}}>
                <span>{s.emoji}</span>
                <span className="font-bold text-white text-xs">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-gray-600">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ── SPORTS GRID ── */}
      <section id="sports" className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>Sport Products</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            One Platform. <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#f97316,#fbbf24)" }}>Every Sport.</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Each sport gets its own purpose-built NxGen product — tuned to the language, stats, and workflows coaches actually use.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SPORTS.map((sport, i) => <SportCard key={sport.id} sport={sport} index={i} />)}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-[#0d0d0d] border-y border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <SectionLabel>Platform Features</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Everything Coaches <span className="text-orange-400">Actually Need</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Built by coaches, for coaches — every feature is purpose-designed for competitive programs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-[#111111] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all" style={{ backgroundColor: color + "20" }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="text-white font-bold text-sm mb-2">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE GAME / NxCALL ── */}
      <section id="org" className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionLabel>Live Game Mode</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              NxCall — Your<br /><span className="text-orange-400">Sideline Command Center</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Real-time play calling, live score updates, down &amp; distance tracking, play log, and instant push notifications — all from your phone on the sideline.
            </p>
            <ul className="space-y-3">
              {["Live score & clock sync", "Play-by-play log with notes", "Instant staff push alerts", "In-game AI suggestions", "Offensive & defensive call sheets", "Post-game automatic recap"].map(item => (
                <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Mockup card */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-3xl opacity-20" style={{ background: "radial-gradient(circle,#f97316,transparent)" }} />
            <div className="relative bg-[#111111] border border-gray-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-orange-400" />
                  <span className="text-white font-bold text-sm">NxCall — Live</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-xs font-bold">LIVE</span>
                </div>
              </div>
              <div className="bg-[#0d0d0d] rounded-2xl p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">Q3 · 7:42</p>
                <p className="text-5xl font-black text-white">21 <span className="text-gray-600 text-2xl">–</span> 14</p>
                <p className="text-gray-400 text-xs mt-1">Riverside Eagles vs West Bay Tigers</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["3rd", "Down"], ["& 7", "Distance"], ["OWN 35", "Position"]].map(([val, lbl]) => (
                  <div key={lbl} className="bg-[#1a1a1a] rounded-xl p-2">
                    <p className="text-white font-black text-sm">{val}</p>
                    <p className="text-gray-600 text-xs">{lbl}</p>
                  </div>
                ))}
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                <p className="text-orange-400 text-xs font-bold flex items-center gap-1.5"><Zap className="w-3 h-3" /> Nx AI Suggestion</p>
                <p className="text-gray-300 text-xs mt-1">Opponent's CB overplays inside — consider a comeback route to the boundary on 3rd &amp; 7.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PARENT PORTAL ── */}
      <section id="parents" className="py-24 bg-gradient-to-b from-[#0d0d0d] to-[#080808] border-y border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Feature list */}
            <div className="order-2 lg:order-1">
              <SectionLabel>Parent Portal</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                Every Sport.<br /><span className="text-pink-400">One Parent Login.</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Parents get one unified portal that connects to every sport their child plays. Stay informed, stay connected — without jumping between apps.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PARENT_FEATURES.map(f => (
                  <div key={f} className="flex items-start gap-2.5 bg-[#111111] border border-gray-800 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300 text-xs leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Mockup */}
            <div className="order-1 lg:order-2 relative">
              <div className="absolute inset-0 rounded-3xl blur-3xl opacity-15" style={{ background: "radial-gradient(circle,#ec4899,transparent)" }} />
              <div className="relative bg-[#111111] border border-gray-800 rounded-3xl p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span className="text-white font-bold text-sm">NxParent Portal</span>
                </div>
                <p className="text-gray-500 text-xs">Welcome back, <span className="text-white font-semibold">Lisa M.</span></p>
                {/* My athletes */}
                <div className="space-y-2">
                  <p className="text-gray-600 text-xs uppercase tracking-wider font-semibold">Your Athletes</p>
                  {[
                    { name: "Jordan M.", sport: "Football", emoji: "🏈", color: "#f97316", status: "Active · QB", alert: null },
                    { name: "Jordan M.", sport: "Basketball", emoji: "🏀", color: "#f59e0b", status: "Active · PG", alert: "Game tonight 7PM" },
                  ].map((a, i) => (
                    <div key={i} className="bg-[#1a1a1a] rounded-xl p-3 flex items-center gap-3">
                      <span className="text-2xl">{a.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold">{a.sport}</p>
                        <p className="text-gray-500 text-xs">{a.status}</p>
                        {a.alert && <p className="text-xs font-semibold mt-0.5" style={{ color: a.color }}>{a.alert}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  ))}
                </div>
                {/* Recent messages */}
                <div className="space-y-2">
                  <p className="text-gray-600 text-xs uppercase tracking-wider font-semibold">Recent Messages</p>
                  {[
                    { from: "Coach Williams", time: "2m ago", preview: "Great practice today. Jordan really stood out on..." },
                    { from: "Football Parents Group", time: "1h ago", preview: "Anyone able to help with the concession stand Friday?" },
                  ].map((m, i) => (
                    <div key={i} className="bg-[#1a1a1a] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-white text-xs font-semibold">{m.from}</span>
                        <span className="text-gray-600 text-xs">{m.time}</span>
                      </div>
                      <p className="text-gray-500 text-xs truncate">{m.preview}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ORG COMMS ── */}
      <section className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>Organization Communication</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Every Conversation,<br /><span className="text-blue-400">One Platform</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            From org-wide announcements to 1-on-1 coach-to-parent messages — NxMessage keeps everyone on the same page.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Bell,          color: "#f97316", title: "Org Announcements",    desc: "Broadcast to the whole organization or specific sport programs instantly." },
            { icon: MessageSquare, color: "#3b82f6", title: "Team & Staff Channels", desc: "Sport-specific channels, position groups and coordinator rooms — all organized." },
            { icon: Users,         color: "#ec4899", title: "Parent + Player Groups", desc: "Connect parents with coaches and other parents. Player accounts with parental oversight." },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-[#111111] border border-gray-800 rounded-2xl p-6 text-center hover:border-gray-700 transition-all">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: color + "20" }}>
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <h3 className="text-white font-bold mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING TEASE ── */}
      <section id="pricing" className="py-24 bg-[#0d0d0d] border-t border-gray-800/60">
        <div className="max-w-5xl mx-auto px-4 md:px-8 text-center">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Simple, <span className="text-orange-400">Sport-Based</span> Pricing
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto mb-12">
            Each sport is licensed independently. Add the Parent Portal as an org-wide upgrade. No per-seat surprises.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { tier: "Starter",    price: "$49",  period: "/mo per sport",   features: ["Up to 40 players", "Playbook & depth chart", "Practice planning", "Basic analytics", "NxMessage"],         highlight: false, badge: null },
              { tier: "Pro",        price: "$99",  period: "/mo per sport",   features: ["Unlimited players", "Film room + AI analysis", "NxCall live game mode", "Advanced analytics", "Parent Portal", "Recruiting module"], highlight: true,  badge: "Most Popular" },
              { tier: "Enterprise", price: "Custom", period: " — contact us", features: ["Multi-sport bundle", "District / org licensing", "White-label options", "Dedicated onboarding", "API access"],  highlight: false, badge: "For Org / District" },
            ].map(({ tier, price, period, features, highlight, badge }) => (
              <div key={tier} className={`relative rounded-2xl p-6 border transition-all ${highlight ? "border-orange-500/40 bg-[#141414]" : "bg-[#111111] border-gray-800"}`} style={highlight ? { boxShadow: "0 0 50px #f9731618" } : {}}>
                {badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${highlight ? "bg-orange-500 text-white" : "bg-gray-700 text-gray-300"}`}>{badge}</span>
                  </div>
                )}
                <p className="text-gray-400 text-sm font-semibold mb-1">{tier}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black text-white">{price}</span>
                  <span className="text-gray-600 text-sm">{period}</span>
                </div>
                <ul className="space-y-2.5 mt-5 mb-6">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${highlight ? "text-orange-400" : "text-gray-600"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${highlight ? "text-white hover:opacity-90" : "bg-white/5 text-white hover:bg-white/10 border border-gray-700"}`}
                  style={highlight ? { background: "linear-gradient(135deg,#f97316,#fb923c)" } : {}}>
                  {tier === "Enterprise" ? "Contact Us" : "Get Started"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(ellipse,#f97316,transparent)" }} />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-6">🏆</div>
          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Build Smarter Teams.<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#f97316,#fbbf24)" }}>Win More Championships.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 leading-relaxed">
            Join coaches across every sport who are using NxGenSports to run smarter programs — from the whiteboard to the final whistle.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-10 py-4 rounded-2xl text-white font-bold text-base transition-all hover:scale-105" style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", boxShadow: "0 0 50px #f9731630" }}>
              Request Early Access
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-gray-700 text-white font-semibold text-base hover:bg-white/10 transition-all">
              Watch Demo Video
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-800/60 bg-[#080808] px-4 md:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8dea6f5ebfce20bad2a8c/871a00698_image_aaa46895.png"
                  alt="NxGenSports" className="w-7 h-7 rounded-lg" />
                <span className="font-black text-white">Nx<span className="text-orange-400">Gen</span><span className="text-gray-600 font-light">Sports</span></span>
              </div>
              <p className="text-gray-600 text-xs leading-relaxed">Next-generation sports intelligence platforms for coaches, athletes and programs at every level.</p>
            </div>
            {/* Products */}
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Products</p>
              <ul className="space-y-2">
                {SPORTS.slice(0,4).map(s => (
                  <li key={s.id}><a href="#" className="text-gray-600 hover:text-white text-xs transition-colors">{s.name}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Platform</p>
              <ul className="space-y-2">
                {["NxCall (Live Game)", "NxMessage", "Parent Portal", "NxLab (Film & Scout)", "Analytics"].map(l => (
                  <li key={l}><a href="#" className="text-gray-600 hover:text-white text-xs transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Company</p>
              <ul className="space-y-2">
                {["About", "Pricing", "Blog", "Contact", "Privacy Policy"].map(l => (
                  <li key={l}><a href="#" className="text-gray-600 hover:text-white text-xs transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800/60 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-gray-700 text-xs">© {new Date().getFullYear()} NxGenSports. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {SPORTS.map(s => <span key={s.id} className="text-lg cursor-pointer hover:scale-125 transition-transform" title={s.name}>{s.emoji}</span>)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}