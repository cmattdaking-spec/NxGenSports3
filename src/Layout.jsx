import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Users, BookOpen, Target, Calendar, Activity,
  ChevronLeft, ChevronRight, Home, Shield, Zap,
  Menu, X, TrendingUp, ClipboardList, Crosshair, BarChart2,
  ListVideo, MessageSquare, Settings, GraduationCap, UserCog } from
"lucide-react";


const navItems = [
{ label: "Dashboard", page: "Dashboard", icon: Home, roles: null },
{ label: "Roster", page: "Roster", icon: Users, roles: null },
{ label: "Depth Chart", page: "DepthChart", icon: TrendingUp, roles: null },
{ label: "Playbook", page: "Playbook", icon: BookOpen, roles: ["admin","head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","position_coach","trainer"] },
{ label: "Game Plans", page: "GamePlan", icon: Target, roles: ["admin","head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","position_coach","trainer"] },
{ label: "Practice", page: "Practice", icon: ClipboardList, roles: null },
{ label: "Scouting", page: "Scouting", icon: Crosshair, roles: ["admin","head_coach","offensive_coordinator","defensive_coordinator","special_teams_coordinator","position_coach","trainer"] },
{ label: "Health", page: "PlayerHealth", icon: Activity, roles: null },
{ label: "Eligibility", page: "AcademicEligibility", icon: GraduationCap, roles: null },
{ label: "Analytics", page: "Analytics", icon: BarChart2, roles: null },
{ label: "Playlists", page: "Playlists", icon: ListVideo, roles: null },
{ label: "Messages", page: "Messages", icon: MessageSquare, roles: null },
{ label: "Users", page: "UserManagement", icon: UserCog, roles: ["admin", "head_coach", "athletic_director"] },
];


export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [prevPage, setPrevPage] = useState(currentPageName);

  useEffect(() => {
    if (currentPageName !== prevPage) {
      setPrevPage(currentPageName);
      setPageLoading(true);
      const t = setTimeout(() => setPageLoading(false), 600);
      return () => clearTimeout(t);
    }
  }, [currentPageName]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    // Load saved color scheme and apply CSS variables
    base44.entities.AppSettings.list().then((list) => {
      if (list.length > 0 && list[0].primary_color) {
        document.documentElement.style.setProperty("--color-primary", list[0].primary_color);
        document.documentElement.style.setProperty("--color-secondary", list[0].secondary_color || list[0].primary_color);
      }
    }).catch(() => {});
  }, []);

  const role = user?.role || "coach";

  const filteredNav = navItems.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    return true;
  });

  const SidebarContent = () =>
  <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-800 ${collapsed ? "justify-center" : ""}`}>
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8dea6f5ebfce20bad2a8c/871a00698_image_aaa46895.png"
          alt="NxDown"
          className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
        />
        {!collapsed &&
      <div>
            <span className="text-white font-black text-xl tracking-tight">Nx<span style={{ color: "var(--color-primary, #3b82f6)" }}>Down</span></span>
            <p className="text-gray-500 text-xs">Next-Gen Football Systems</p>
          </div>
      }
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map(({ label, page, icon: Icon }) => {
        const active = currentPageName === page;
        return (
          <Link
            key={page}
            to={createPageUrl(page)}
            onClick={() => setMobileOpen(false)}
            style={active ? { backgroundColor: "var(--color-primary, #3b82f6)" } : {}}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${active ?
            "text-white shadow-lg" :
            "text-gray-400 hover:text-white hover:bg-white/5"}`
            }>

              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
              {collapsed &&
            <div className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-700">
                  {label}
                </div>
            }
            </Link>);

      })}
      </nav>

      {/* Settings + User */}
      <div className={`border-t border-gray-800 p-2 space-y-1`}>
        <Link
          to={createPageUrl("Settings")}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
            ${currentPageName === "Settings"
              ? "bg-[var(--color-primary,#3b82f6)] text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-white/5"}`
          }
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </Link>
        {user &&
          <div className={`p-2 ${collapsed ? "flex justify-center" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--color-primary, #3b82f6)" }}>
                <span className="text-white text-xs font-bold">
                  {user.full_name?.[0] || user.email?.[0] || "C"}
                </span>
              </div>
              {!collapsed &&
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user.full_name || "Coach"}</p>
                  <p className="text-gray-500 text-xs capitalize">{role.replace(/_/g, " ")}</p>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>;


  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 bg-[#111111] border-r border-gray-800 transition-all duration-300 relative ${collapsed ? "w-16" : "w-56"}`}>

        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all z-10"
          style={{ '--hover-bg': 'var(--color-primary, #3b82f6)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-primary, #3b82f6)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>

          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen &&
      <div className="fixed inset-0 z-40 md:hidden" style={{ pointerEvents: "all" }}>
        <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
        <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[#111111] border-r border-gray-800 z-50" onClick={e => e.stopPropagation()}>
          <SidebarContent />
        </aside>
      </div>
      }

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-gray-800">
          <button onClick={() => setMobileOpen(true)} className="text-gray-400 p-1">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-white font-black text-lg">Nx<span style={{ color: "var(--color-primary, #3b82f6)" }}>Down</span></span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto relative">
          {pageLoading && (
            <div className="absolute inset-0 bg-[#0a0a0a] z-50 flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-gray-800 border-t-[var(--color-primary,#f97316)] rounded-full animate-spin absolute" />
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8dea6f5ebfce20bad2a8c/871a00698_image_aaa46895.png"
                  alt="NxDown"
                  className="w-8 h-8 rounded-lg object-cover"
                />
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>);

}