import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CalendarDays, Activity, MessageSquare, Megaphone, Users, GraduationCap, Clapperboard, Star, BarChart2 } from "lucide-react";

export default function ParentPortal() {
  const [user, setUser] = useState(null);
  const [player, setPlayer] = useState(null);
  const [nextGame, setNextGame] = useState(null);

  useEffect(() => {
    base44.auth
      .me()
      .then(async (u) => {
        setUser(u);
        const linkedId = u?.linked_player_id || u?.linked_player_ids?.[0];
        if (linkedId) {
          const p = await base44.asServiceRole.entities.Player.get(linkedId);
          setPlayer(p);
        }
        const games = await base44.entities.Opponent.list("game_date");
        const now = new Date();
        setNextGame(
          games.find((g) => new Date(g.game_date) >= now) || null
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Parent Portal</h1>
          <p className="text-gray-500 text-sm">
            Welcome{" "}
            <span className="text-white font-semibold">
              {user?.full_name?.split(" ")[0] || "Parent"}
            </span>
            {player && (
              <span className="text-gray-600">
                {" "}
                · {player.first_name} {player.last_name}
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
            <span className="text-sm font-semibold text-white">
              NxAnnouncement
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            See the latest updates from your athlete&apos;s program.
          </p>
        </Link>

        <Link
          to={createPageUrl("GameSchedule")}
          className="bg-[#141414] border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
            <span className="text-sm font-semibold text-white">
              Upcoming Game
            </span>
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
          to={createPageUrl("Roster")}
          className="bg-[#141414] border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
            <span className="text-sm font-semibold text-white">
              Team Roster
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            View roster in read-only mode.
          </p>
        </Link>

        <Link
          to={createPageUrl("AcademicEligibility")}
          className="bg-[#141414] border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
            <span className="text-sm font-semibold text-white">Eligibility</span>
          </div>
          <p className="text-gray-500 text-sm">
            See eligibility for your linked player(s).
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link
          to={createPageUrl("GameSchedule")}
          className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-2 hover:border-gray-700 transition-all"
        >
          <CalendarDays className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
          <span className="text-xs text-white font-medium">Schedule</span>
        </Link>
        <Link
          to={createPageUrl("PlayerHealth")}
          className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-2 hover:border-gray-700 transition-all"
        >
          <Activity className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
          <span className="text-xs text-white font-medium">
            Health
          </span>
        </Link>
        <Link
          to={createPageUrl("FilmRoom")}
          className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-2 hover:border-gray-700 transition-all"
        >
          <Clapperboard className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
          <span className="text-xs text-white font-medium">Film</span>
        </Link>
        <Link
          to={createPageUrl("Recruiting")}
          className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-2 hover:border-gray-700 transition-all"
        >
          <Star className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
          <span className="text-xs text-white font-medium">Recruiting</span>
        </Link>
        <Link
          to={createPageUrl("Messages")}
          className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-2 hover:border-gray-700 transition-all"
        >
          <MessageSquare className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
          <span className="text-xs text-white font-medium">NxMessages</span>
        </Link>
        <Link
          to={createPageUrl("PerformanceAnalytics")}
          className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-2 hover:border-gray-700 transition-all"
        >
          <BarChart2 className="w-4 h-4 text-[var(--color-primary,#00F2FF)]" />
          <span className="text-xs text-white font-medium">Analytics</span>
        </Link>
      </div>
    </div>
  );
}
