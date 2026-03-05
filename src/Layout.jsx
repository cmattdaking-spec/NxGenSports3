import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Users, BookOpen, Target, Calendar, Activity,
  ChevronLeft, ChevronRight, Home, Shield, Zap,
  Menu, X, TrendingUp, ClipboardList, Crosshair, BarChart2
} from "lucide-react";

const navItems = [
  { label: "Dashboard", page: "Dashboard", icon: Home },
  { label: "Roster", page: "Roster", icon: Users },
  { label: "Depth Chart", page: "DepthChart", icon: TrendingUp },
  { label: "Playbook", page: "Playbook", icon: BookOpen },
  { label: "Game Plans", page: "GamePlan", icon: Target },
  { label: "Practice", page: "Practice", icon: ClipboardList },
  { label: "Scouting", page: "Scouting", icon: Crosshair },
  { label: "Health", page: "PlayerHealth", icon: Activity },
  { label: "Analytics", page: "Analytics", icon: BarChart2 },
];

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const role = user?.role || "coach";

  const filteredNav = navItems.filter(item => {
    if (role === "position_coach" && item.page === "GamePlan") return false;
    return true;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-800 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-9 h-9 rounded-lg nxdown-gradient flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-white font-black text-xl tracking-tight">Nx<span className="text-orange-500">Down</span></span>
            <p className="text-gray-500 text-xs">Coaching Platform</p>
          </div>
        )}
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${active
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
            >
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

      {/* User */}
      {user && (
        <div className={`border-t border-gray-800 p-3 ${collapsed ? "flex justify-center" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user.full_name?.[0] || user.email?.[0] || "C"}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.full_name || "Coach"}</p>
                <p className="text-gray-500 text-xs capitalize">{role.replace("_", " ")}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 bg-[#111111] border-r border-gray-800 transition-all duration-300 relative ${collapsed ? "w-16" : "w-56"}`}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-orange-500 transition-all z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[#111111] border-r border-gray-800 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-gray-800">
          <button onClick={() => setMobileOpen(true)} className="text-gray-400">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-white font-black text-lg">Nx<span className="text-orange-500">Down</span></span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}