import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Lock } from "lucide-react";

/**
 * AuthGuard — wraps any page/section to enforce role-based access.
 * Usage: <AuthGuard roles={["admin","head_coach"]}> ... </AuthGuard>
 * If roles is omitted, just checks for authenticated user.
 */
export default function AuthGuard({ children, roles = null, teamRequired = true }) {
  const [status, setStatus] = useState("loading"); // loading | allowed | denied
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u) { setStatus("denied"); return; }
      setUser(u);

      const coachRole = u.coaching_role;
      const appRole = u.role;

      // Super admins always pass
      if (appRole === "super_admin" || appRole === "admin") { setStatus("allowed"); return; }

      // Team isolation: if teamRequired, user must have a team assigned
      if (teamRequired && !u.team_id) { setStatus("denied"); return; }

      // Role check
      if (roles) {
        const effectiveRole = u.is_associate_head_coach ? "associate_head_coach" : coachRole;
        const hasRole = roles.includes(appRole) || roles.includes(coachRole) || roles.includes(effectiveRole);
        setStatus(hasRole ? "allowed" : "denied");
      } else {
        setStatus("allowed");
      }
    }).catch(() => setStatus("denied"));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <div className="w-5 h-5 border-2 border-gray-700 border-t-[var(--color-primary,#3b82f6)] rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-white font-bold text-lg">Access Restricted</p>
          <p className="text-gray-500 text-sm mt-1">You don't have permission to view this page.</p>
          {roles && <p className="text-gray-700 text-xs mt-2">Required: {roles.join(", ")}</p>}
        </div>
      </div>
    );
  }

  return children;
}