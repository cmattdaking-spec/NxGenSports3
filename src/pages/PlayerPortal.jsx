import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CalendarDays, Activity, GraduationCap, MessageSquare, FlaskConical, Megaphone } from "lucide-react";

export default function PlayerPortal() {
  const [user, setUser] = useState(null);
  const [nextGame, setNextGame] = useState(null);

  useEffect(() => {
    base44.auth
      .me()
      .then(async (u) => {
        setUser(u);
        const games = await base44.entities.Opponent.list("game_date");
        const now = new Date();
        setNextGame(
          games.find((g) => new Date(g.game_date) >= now) || null
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Player Portal</h1>
          <p className="text-gray-500 text-sm">
            Welcome back{" "}
            <span className="text-white font-semibold">
              {user?.full_name?.split(" ")[0] || "Athlete"}
            </span>
            {user?.school_name && (
              <span className="text-gray-600">
                {" "}
                · {user.school_name}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to={createPageUrl("NxAnnouncement")}
          className="bg-[#141414] border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
            <span className="text-sm font-semibold text-white">NxAnnouncement</span>
          </div>
          <p className="text-gray-500 text-sm">
            View the latest team and program announcements.
          </p>
        </Link>

        <Link
          to={createPageUrl("GameSchedule")}
          className="bg-[#141414] border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
            <span className="text-sm font-semibold text-white">Next Game</span>
          </div>
          {nextGame ? (
            <>
              <p className="text-white text-lg font-bold">vs {nextGame.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {nextGame.game_date} · {nextGame.location}
              </p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">
              No upcoming game scheduled.
            </p>
          )}
        </Link>

        <Link
          to={createPageUrl("PlayerHealth")}
          className="bg-[#141414] border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
            <span className="text-sm font-semibold text-white">
              My Health
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            Check availability, updates, and trainer notes.
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          to={createPageUrl("AcademicEligibility")}
          className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-2 hover:border-gray-700 transition-all"
        >
          <GraduationCap className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
          <span className="text-xs text-white font-medium">Eligibility</span>
        </Link>
        <Link
          to={createPageUrl("PlayerHealth")}
          className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-2 hover:border-gray-700 transition-all"
        >
          <Activity className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
          <span className="text-xs text-white font-medium">My Health</span>
        </Link>
        <Link
          to={createPageUrl("Messages")}
          className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-2 hover:border-gray-700 transition-all"
        >
          <MessageSquare className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
          <span className="text-xs text-white font-medium">NxMessages</span>
        </Link>
        <Link
          to={createPageUrl("NxAnnouncement")}
          className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-2 hover:border-gray-700 transition-all"
        >
          <Megaphone className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
          <span className="text-xs text-white font-medium">Announcements</span>
        </Link>
      </div>
    </div>
  );
}
