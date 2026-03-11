import { useState, useEffect, useRef } from "react";
import { Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import EnrollmentCheck from "@/components/EnrollmentCheck";
import { SportLogoSVG } from "@/components/SportLogos";
import { SportContext } from "@/components/SportContext";
import {
  Users, BookOpen, Target, Activity,
  ChevronLeft, ChevronRight, Home,
  Menu, X, TrendingUp, ClipboardList, Crosshair, BarChart2,
  MessageSquare, Settings, GraduationCap, UserCog, Gamepad2,
  Dumbbell, CalendarDays, Clapperboard, Star, Globe, ChevronDown, ArrowLeft
} from "lucide-react";

// Note: BookOpen is used twice (in import and for NxPrep icon)

const COORDINATOR_ROLES = ["admin","head_coach","associate_head_coach","athletic_director","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach","trainer"];
const COORD_ONLY = ["admin","head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach"];
const GAME_PLAN_ROLES = ["admin","head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach"];
const IN_GAME_ROLES = ["admin","head_coach","associate_head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","strength_conditioning_coordinator","position_coach"];

const SUITE_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/29e077944_generated_image.png";

const SPORT_LOGOS = {
  football:           "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/661cb3b76_image_aaa46895.png",
  boys_football:      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/661cb3b76_image_aaa46895.png",
  girls_football:     "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/661cb3b76_image_aaa46895.png",
  girls_flag_football:"https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/661cb3b76_image_aaa46895.png",
  basketball:         "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/4bfe54bbf_generated_image.png",
  boys_basketball:    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/4bfe54bbf_generated_image.png",
  girls_basketball:   "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/4bfe54bbf_generated_image.png",
  baseball:           "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/30b1e61b1_generated_image.png",
  boys_baseball:      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/30b1e61b1_generated_image.png",
  softball:           "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/30b1e61b1_generated_image.png",
  girls_softball:     "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/30b1e61b1_generated_image.png",
  volleyball:         "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/22ec04955_generated_image.png",
  girls_volleyball:   "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/22ec04955_generated_image.png",
  golf:               "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/41c3a1e28_generated_image.png",
  boys_golf:          "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/41c3a1e28_generated_image.png",
  girls_golf:         "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/41c3a1e28_generated_image.png",
  tennis:             "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/89840f744_generated_image.png",
  boys_tennis:        "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/89840f744_generated_image.png",
  girls_tennis:       "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/89840f744_generated_image.png",
  wrestling:          "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/06251e0e6_generated_image.png",
  boys_wrestling:     "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/06251e0e6_generated_image.png",
  girls_wrestling:    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/06251e0e6_generated_image.png",
  cross_country:      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/17de9d101_generated_image.png",
  boys_cross_country: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/17de9d101_generated_image.png",
  girls_cross_country:"https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/17de9d101_generated_image.png",
  track:              "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/17de9d101_generated_image.png",
  boys_track:         "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/17de9d101_generated_image.png",
  girls_track:        "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/17de9d101_generated_image.png",
  boxing:             "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/67920ea8c_generated_image.png",
  boys_boxing:        "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/67920ea8c_generated_image.png",
  girls_boxing:       "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/67920ea8c_generated_image.png",
  soccer:             "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/d82b0681b_generated_image.png",
  boys_soccer:        "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/d82b0681b_generated_image.png",
  girls_soccer:       "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/d82b0681b_generated_image.png",
  lacrosse:           "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/2afe9d955_generated_image.png",
  boys_lacrosse:      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/2afe9d955_generated_image.png",
  girls_lacrosse:     "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/2afe9d955_generated_image.png",
};

const SPORT_NAMES = {
  nxgensports:        "NxGenSports",
  football:           "NxDown",     girls_flag_football:"NxDown",
  boys_basketball:    "NxBucket",   girls_basketball:   "NxBucket",
  boys_baseball:      "NxPitch",    girls_softball:     "NxPitch",
  boys_soccer:        "NxGoal",     girls_soccer:       "NxGoal",
  girls_volleyball:   "NxSet",
  boys_boxing:        "NxRound",    girls_boxing:       "NxRound",
  boys_golf:          "NxHole",     girls_golf:         "NxHole",
  boys_tennis:        "NxServe",    girls_tennis:       "NxServe",
  boys_wrestling:     "NxMatch",    girls_wrestling:    "NxMatch",
  boys_cross_country: "NxRace",     girls_cross_country:"NxRace",
  boys_track:         "NxRace",     girls_track:        "NxRace",
  boys_lacrosse:      "NxCage",     girls_lacrosse:     "NxCage",
};

const SPORT_LABELS = {
  nxgensports:        "NxGenSports",
  football:           "Football",           girls_flag_football:"Girls Flag Football",
  boys_basketball:    "Boys Basketball",    girls_basketball:   "Girls Basketball",
  boys_baseball:      "Boys Baseball",      girls_softball:     "Girls Softball",
  boys_soccer:        "Boys Soccer",        girls_soccer:       "Girls Soccer",
  girls_volleyball:   "Girls Volleyball",
  boys_boxing:        "Boys Boxing",        girls_boxing:       "Girls Boxing",
  boys_golf:          "Boys Golf",          girls_golf:         "Girls Golf",
  boys_tennis:        "Boys Tennis",        girls_tennis:       "Girls Tennis",
  boys_wrestling:     "Boys Wrestling",     girls_wrestling:    "Girls Wrestling",
  boys_cross_country: "Boys Cross Country", girls_cross_country:"Girls Cross Country",
  boys_track:         "Boys Track & Field", girls_track:        "Girls Track & Field",
  boys_lacrosse:      "Boys Lacrosse",      girls_lacrosse:     "Girls Lacrosse",
};

// ─── CLEANED UP NAV ─────────────────────────────────────────────────────────
// Coach/Admin nav
const navItems = [
  { label: "Dashboard",      page: "Dashboard",            icon: Home,           roles: null },
  { label: "Schedule",       page: "GameSchedule",         icon: CalendarDays,   roles: null },
  { label: "Eligibility",    page: "AcademicEligibility",  icon: GraduationCap,  roles: null },
  { label: "Roster",         page: "Roster",               icon: Users,          roles: null },
  { label: "Health",         page: "PlayerHealth",         icon: Activity,       roles: null },
  { label: "NxMessages",     page: "Messages",             icon: MessageSquare,  roles: null },
  { label: "NxAnnouncement", page: "NxAnnouncement",       icon: MessageSquare,  roles: null },
  { label: "NxLab",          page: "NxLab",                icon: Clapperboard,   roles: null, hideSports: ["boys_track","girls_track","boys_cross_country","girls_cross_country","track","cross_country"] },
  { label: "S&C",            page: "StrengthConditioning", icon: Dumbbell,       roles: null },
  { label: "Recruiting",     page: "Recruiting",           icon: Star,           roles: COORD_ONLY },
  { label: "Analytics",      page: "PerformanceAnalytics", icon: BarChart2,      roles: null },
  { label: "Reports",        page: "Reports",              icon: TrendingUp,     roles: null },
  { label: "Users",          page: "UserManagement",       icon: UserCog,        roles: ["admin","head_coach","athletic_director"] },
  { label: "AD Portal",      page: "ADPortal",             icon: Globe,          roles: ["admin","athletic_director"] },
];

// Player nav
const playerNavItems = [
  { label: "Schedule",       page: "GameSchedule",         icon: CalendarDays },
  { label: "NxLab",          page: "NxLab",                icon: Clapperboard },
  { label: "My S&C",         page: "StrengthConditioning", icon: Dumbbell },
  { label: "Recruiting",     page: "Recruiting",           icon: Star },
  { label: "Analytics",      page: "PerformanceAnalytics", icon: BarChart2 },
  { label: "NxMessages",     page: "Messages",             icon: MessageSquare },
  { label: "Announcements",  page: "NxAnnouncement",       icon: MessageSquare },
];

// Parent nav
const parentNavItems = [
  { label: "Schedule",       page: "GameSchedule",         icon: CalendarDays },
  { label: "NxMessages",     page: "Messages",             icon: MessageSquare },
  { label: "Announcements",  page: "NxAnnouncement",       icon: MessageSquare },
];

// Inject critical mobile meta tags at runtime (since index.html can't be edited directly)
function useMobileMeta(brandName) {
  useEffect(() => {
    // Page title
    document.title = brandName || "NxGenSports";
    // viewport-fit=cover — required for iOS safe-area-inset-* to work
    let vp = document.querySelector('meta[name="viewport"]');
    if (vp && !vp.content.includes("viewport-fit")) {
      vp.content = vp.content + ", viewport-fit=cover";
    }
    // Apple PWA meta
    const setMeta = (name, content, prop = "name") => {
      let el = document.querySelector(`meta[${prop}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(prop, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    setMeta("apple-mobile-web-app-title", "NxGenSports");
    setMeta("mobile-web-app-capable", "yes");
    setMeta("theme-color", "#0a0a0a");
    setMeta("description", "NxGenSports — Next-Gen Athletic Intelligence Platform");
  }, [brandName]);
}

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollPositions = useRef({});
  const [user, setUser] = useState(null);
  const [teamLogo, setTeamLogo] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [prevPage, setPrevPage] = useState(currentPageName);
  const [activeSport, setActiveSport] = useState("football");
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [assignedSports, setAssignedSports] = useState(["football"]);

  useEffect(() => {
    if (currentPageName !== prevPage) {
      setPrevPage(currentPageName);
      setPageLoading(true);
      const t = setTimeout(() => setPageLoading(false), 600);
      return () => clearTimeout(t);
    }
  }, [currentPageName]);

  // System dark mode detection
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (e) => document.documentElement.classList.toggle("dark", e.matches);
    apply(mq);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      const sports = u?.assigned_sports?.length ? u.assigned_sports : ["boys_football"];
      setAssignedSports(sports);
      const uIsAD = u?.coaching_role === "athletic_director" || (u?.role === "admin" && u?.coaching_role === "athletic_director");
      const uIsSuperAdmin = u?.role === "super_admin";
      const saved = (uIsAD || uIsSuperAdmin) ? "nxgensports" : (u?.active_sport || sports[0]);
      setActiveSport(saved);
    }).catch(() => {});
    base44.entities.AppSettings.list().then((list) => {
      if (list.length > 0) {
        if (list[0].primary_color) {
          document.documentElement.style.setProperty("--color-primary", list[0].primary_color);
          document.documentElement.style.setProperty("--color-secondary", list[0].secondary_color || list[0].primary_color);
        }
        if (list[0].team_logo_url) setTeamLogo(list[0].team_logo_url);
      }
    }).catch(() => {});
  }, []);

  const coachingRole = user?.coaching_role || "position_coach";
  const effectiveRole = user?.is_associate_head_coach ? "associate_head_coach" : coachingRole;
  const isAD = effectiveRole === "athletic_director" || (user?.role === "admin" && user?.coaching_role === "athletic_director");
  const isHeadCoach = coachingRole === "head_coach";
  const isSuperAdmin = user?.role === "super_admin";
  const canEditAll = isAD || isHeadCoach;
  const brandName = SPORT_NAMES[activeSport] || "NxDown";
  const [brandPrefix, brandSuffix] = brandName.startsWith("Nx") ? ["Nx", brandName.slice(2)] : [brandName, ""];
  useMobileMeta(brandName);

  const switchSport = async (sport) => {
    if (user?.primary_sport && !isAD) return; // locked to primary sport
    if (sport === "nxgensports") {
      setActiveSport("nxgensports");
      setShowSportPicker(false);
      navigate(createPageUrl("ADPortal"));
      return;
    }
    setActiveSport(sport);
    setShowSportPicker(false);
    if (user) await base44.auth.updateMe({ active_sport: sport });
  };

  const userType = user?.user_type || "coach";
  const isPlayer = userType === "player";
  const isParent = userType === "parent" || user?.parent_role;

  const filteredNav = user?.role === "super_admin"
    ? [{ label: "Teams", page: "UserManagement", icon: UserCog, roles: null }]
    : isPlayer ? playerNavItems
    : isParent ? parentNavItems
    : navItems.filter((item) => {
        if (!item.roles) return true;
        if (item.roles.includes(user?.role)) return true;
        if (!item.roles.includes(effectiveRole)) return false;
        return true;
      });

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-800 ${collapsed ? "justify-center" : ""}`}>
        <img
          src={
            (isPlayer || isParent || user?.team_id)
              ? (teamLogo || SUITE_LOGO)
              : (SPORT_LOGOS[activeSport] || SUITE_LOGO)
          }
          alt={brandName}
          className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
        />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="text-white font-black text-xl tracking-tight">{brandPrefix}<span style={{ color: "var(--color-primary, #3b82f6)" }}>{brandSuffix}</span></span>
            <p className="text-gray-500 text-xs capitalize">{SPORT_LABELS[activeSport] || "Football"} Systems</p>
            {/* Sport switcher */}
            {(isAD || assignedSports.length > 1) && !user?.primary_sport && (
              <div className="relative mt-1">
                <button onClick={() => setShowSportPicker(v => !v)}
                  className="flex items-center gap-1 text-gray-500 hover:text-white text-xs transition-colors">
                  Switch sport <ChevronDown className="w-3 h-3" />
                </button>
                {showSportPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 min-w-36 overflow-hidden">
                    {(isAD ? ["nxgensports", ...Object.keys(SPORT_NAMES).filter(s => s !== "nxgensports")] : assignedSports).map(s => (
                      <button key={s} onClick={() => switchSport(s)}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${activeSport === s ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                        style={activeSport === s ? { backgroundColor: "var(--color-primary,#3b82f6)22", color: "var(--color-primary,#3b82f6)" } : {}}>
                        {SPORT_LABELS[s] || s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {(isAD && activeSport === "nxgensports" ? [] : filteredNav).map(({ label, page, icon: Icon }) => {
          const active = currentPageName === page;
          return (
            <Link key={page} to={createPageUrl(page)} onClick={() => setMobileOpen(false)}
              style={active ? { backgroundColor: "var(--color-primary, #3b82f6)" } : {}}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${active ? "text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
              {collapsed && (
                <div className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-700">
                  {label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings + User */}
      <div className="border-t border-gray-800 p-2 space-y-1">
        <Link to={createPageUrl("Settings")} onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${currentPageName === "Settings" ? "text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
          style={currentPageName === "Settings" ? { backgroundColor: "var(--color-primary, #3b82f6)" } : {}}>
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </Link>
        {user && (
          <div className={`p-2 ${collapsed ? "flex justify-center" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--color-primary, #3b82f6)" }}>
                <span className="text-white text-xs font-bold">{user.full_name?.[0] || user.email?.[0] || "C"}</span>
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user.full_name || "Coach"}</p>
                  <p className="text-gray-500 text-xs capitalize">
                    {coachingRole.replace(/_/g, " ")}
                    {user?.is_associate_head_coach && <span className="text-cyan-400 ml-1">(AC)</span>}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Redirect root — ADs go to ADPortal, everyone else to Dashboard
  const location = useLocation();
  if (location.pathname === "/" || location.pathname === "") {
    const isAthlDir = effectiveRole === "athletic_director" || user?.role === "admin" && user?.coaching_role === "athletic_director";
    if (isAD && !isHeadCoach) {
      return <Navigate to={createPageUrl("ADPortal")} replace />;
    }
    return <Navigate to="/Dashboard" replace />;
  }

  const sportContextValue = {
    activeSport,
    user,
    isAD,
    isHeadCoach,
    isSuperAdmin,
    canEditAll,
    teamId: user?.team_id,
    sportFilter: { sport: activeSport, ...(user?.team_id ? { team_id: user.team_id } : {}) },
    switchSport,
  };

  return (
    <SportContext.Provider value={sportContextValue}>
    <EnrollmentCheck>
      <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 bg-[#111111] border-r border-gray-800 transition-all duration-300 relative ${collapsed ? "w-16" : "w-56"}`}>
        {sidebarContent}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all z-10"
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--color-primary, #3b82f6)"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = ""}>
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ pointerEvents: "all" }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[#111111] border-r border-gray-800 z-50" onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-gray-800 safe-area-top">
          {currentPageName !== "Dashboard" && currentPageName !== "ADPortal" ? (
            <button onClick={() => navigate(-1)} className="text-gray-400 p-1 flex items-center gap-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-8" />
          )}
          <span className="text-white font-black text-lg">{brandPrefix}<span style={{ color: "var(--color-primary, #3b82f6)" }}>{brandSuffix}</span></span>
          <div className="w-8" />
        </header>

        {/* Mobile Bottom Tab Bar */}
        {!isPlayer && !isParent && !isSuperAdmin && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-gray-800 z-50 flex items-stretch"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {[
            { label: "Home", page: isAD ? "ADPortal" : "Dashboard", icon: Home },
            { label: "NxLab", page: "NxLab", icon: Clapperboard },
            { label: "Messages", page: "Messages", icon: MessageSquare },
            { label: "Settings", page: "Settings", icon: Settings },
            ].map(({ label, page, icon: Icon }) => {
            const active = currentPageName === page;
            return (
              <Link key={page} to={createPageUrl(page)}
                onClick={() => {
                  // Save scroll before leaving, restore after navigating
                  const container = document.getElementById("main-scroll-container");
                  if (container) scrollPositions.current[currentPageName] = container.scrollTop;
                  requestAnimationFrame(() => {
                    const next = document.getElementById("main-scroll-container");
                    if (next) next.scrollTop = scrollPositions.current[page] || 0;
                  });
                }}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all"
                style={active ? { color: "var(--color-primary,#3b82f6)" } : { color: "#6b7280" }}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
            })}
          </nav>
        )}

        <main className="flex-1 overflow-y-auto relative safe-area-bottom" style={{ paddingBottom: undefined }}
          ref={el => {
            if (el) {
              if (window.innerWidth < 768) el.style.paddingBottom = 'calc(env(safe-area-inset-bottom, 0px) + 64px)';
              else el.style.paddingBottom = '';
            }
          }}
          onScroll={e => { scrollPositions.current[currentPageName] = e.currentTarget.scrollTop; }}
          id="main-scroll-container"
        >
          {pageLoading && (
            <div className="absolute inset-0 bg-[#0a0a0a] z-50 flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-gray-800 border-t-[var(--color-primary,#f97316)] rounded-full animate-spin absolute" />
                <img src={SPORT_LOGOS[activeSport] || SUITE_LOGO} alt={brandName} className="w-8 h-8 rounded-lg object-cover" />
              </div>
            </div>
          )}
          <div key={currentPageName} className="page-transition min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
    </EnrollmentCheck>
    </SportContext.Provider>
  );
}