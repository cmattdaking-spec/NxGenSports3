import { ChevronDown, ChevronUp, Shield, Swords, Target, Gamepad2, TrendingUp, Brain } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const LEVEL_COLOR = {
  Varsity: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  JV: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Freshman: "bg-green-500/20 text-green-400 border-green-500/30"
};

export default function GameCard({ opponent, plan, isPast, expanded, onToggleExpand, onScout, onTrack }) {
  return (
    <div className={`bg-[#141414] border rounded-xl overflow-hidden transition-all ${isPast ? "opacity-70 border-gray-800" : "border-gray-800 hover:border-gray-700"}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-white font-bold text-lg">vs. {opponent.name}</h3>
              {opponent.level && <span className={`text-xs px-2 py-0.5 rounded-full border ${LEVEL_COLOR[opponent.level] || "bg-gray-500/20 text-gray-400"}`}>{opponent.level}</span>}
              {opponent.record && <span className="text-gray-500 text-xs">({opponent.record})</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span>{opponent.game_date}</span>
              {opponent.location && <span>{opponent.location}</span>}
              {opponent.conference && <span>· {opponent.conference}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isPast && (
              <button onClick={() => onScout(opponent)}
                className="flex items-center gap-1 bg-teal-500/10 border border-teal-500/30 text-teal-400 px-2 py-1.5 rounded-lg text-xs hover:bg-teal-500/20 transition-all">
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Scout</span>
              </button>
            )}
            {plan && (
              <Link to={createPageUrl("GamePlan")} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs border transition-all"
                style={{ backgroundColor: "var(--color-primary,#f97316)15", borderColor: "var(--color-primary,#f97316)40", color: "var(--color-primary,#f97316)" }}>
                <Target className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Plan</span>
              </Link>
            )}
            <button onClick={() => onTrack(opponent)}
              className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white px-2 py-1.5 rounded-lg text-xs transition-all">
              <Gamepad2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Track</span>
            </button>
            <button onClick={() => onToggleExpand(opponent.id)} className="text-gray-500 hover:text-white p-1.5">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-800 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {opponent.offensive_tendency && (
            <div className="bg-[#1a1a1a] rounded-lg p-3 border border-orange-500/15">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Swords className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Offensive Tendency</span>
              </div>
              <p className="text-gray-300 text-sm">{opponent.offensive_tendency}</p>
            </div>
          )}
          {opponent.defensive_tendency && (
            <div className="bg-[#1a1a1a] rounded-lg p-3 border border-blue-500/15">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Defensive Tendency</span>
              </div>
              <p className="text-gray-300 text-sm">{opponent.defensive_tendency}</p>
            </div>
          )}
          {opponent.key_players && (
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Key Players to Watch</p>
              <p className="text-gray-300 text-sm">{opponent.key_players}</p>
            </div>
          )}
          {opponent.weaknesses && (
            <div className="bg-[#1a1a1a] rounded-lg p-3 border border-green-500/15">
              <p className="text-green-400 text-xs uppercase tracking-wider mb-1">Exploitable Weaknesses</p>
              <p className="text-gray-300 text-sm">{opponent.weaknesses}</p>
            </div>
          )}
          {opponent.hudl_link && (
            <div className="col-span-2">
              <a href={opponent.hudl_link} target="_blank" rel="noreferrer" className="text-blue-400 text-sm hover:underline flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> View on Hudl
              </a>
            </div>
          )}
          {!opponent.offensive_tendency && !opponent.defensive_tendency && !opponent.key_players && (
            <div className="col-span-2">
              <p className="text-gray-600 text-sm">No scouting data yet. <Link to={createPageUrl("Scouting")} className="text-blue-400 hover:underline">Add scouting info →</Link></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}