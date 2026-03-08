import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, ChevronLeft, ChevronRight, Target } from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import LiveGameTracker from "../components/schedule/LiveGameTracker";
import ScoutPreviewModal from "../components/schedule/ScoutPreviewModal";
import GameCard from "../components/schedule/GameCard";
import { SpinnerLoader } from "../components/SkeletonLoader";



export default function GameSchedule() {
  const [opponents, setOpponents] = useState([]);
  const [players, setPlayers] = useState([]);
  const [gamePlans, setGamePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filterLevel, setFilterLevel] = useState("all");
  const [scoutModal, setScoutModal] = useState(null);
  const [liveTracker, setLiveTracker] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      try {
        const [u, op, pl, gp] = await Promise.all([
          base44.auth.me().catch(() => null),
          base44.entities.Opponent.list("game_date"),
          base44.entities.Player.list(),
          base44.entities.GamePlan.list()
        ]);
        setUser(u);
        setOpponents(op);
        setPlayers(pl);
        setGamePlans(gp);
        const byUnit = { offense: pl.filter(p => p.unit === "offense" && p.status === "active").length, defense: pl.filter(p => p.unit === "defense" && p.status === "active").length, special_teams: pl.filter(p => p.unit === "special_teams" && p.status === "active").length };
        const injured = pl.filter(p => p.status === "injured").length;
        setTeamPreview({ total: pl.length, byUnit, injured });
      } catch (err) {
        console.error("Error loading game schedule data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const today = new Date();
  today.setHours(0,0,0,0);

  const upcoming = opponents.filter(o => new Date(o.game_date) >= today).sort((a,b) => new Date(a.game_date) - new Date(b.game_date));
  const past = opponents.filter(o => new Date(o.game_date) < today).sort((a,b) => new Date(b.game_date) - new Date(a.game_date));

  const filtered = (list) => list.filter(o => filterLevel === "all" || !o.level || o.level === filterLevel);

  const getGamePlan = (opponent) => gamePlans.find(gp => gp.opponent === opponent.name);





  // Calendar helper functions
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  const getGamesForDate = (date) => {
    return opponents.filter(opp => {
      const gameDate = new Date(opp.game_date);
      return gameDate.getFullYear() === date.getFullYear() && 
             gameDate.getMonth() === date.getMonth() && 
             gameDate.getDate() === date.getDate();
    });
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const handleScout = (opponent) => {
    setScoutModal(opponent);
  };

  if (loading) return <LoadingScreen />;

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];
  
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Game <span style={{ color: "var(--color-primary,#f97316)" }}>Schedule</span></h1>
          <p className="text-gray-500 text-sm">{opponents.length} games scheduled</p>
        </div>
        <Link to={createPageUrl("Scouting")}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
          <Target className="w-4 h-4" /> Scouting
        </Link>
      </div>

      {/* Calendar */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
        {/* Month Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-white font-bold text-lg">{monthName}</h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-0 border-b border-gray-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-gray-500 text-xs font-semibold border-r border-gray-800 last:border-r-0 bg-[#0f0f0f]">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-0">
          {days.map((day, idx) => {
            const gameDate = day ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) : null;
            const gamesOnDay = day ? getGamesForDate(gameDate) : [];
            const isToday = day && new Date().toDateString() === gameDate.toDateString();
            
            return (
              <div key={idx} className={`min-h-24 p-2 border-r border-b border-gray-800 last:border-r-0 ${!day ? 'bg-[#0f0f0f]' : ''}`}>
                {day && (
                  <div className={`h-full flex flex-col ${isToday ? 'bg-[var(--color-primary,#f97316)]/10 rounded-lg p-2' : ''}`}>
                    <div className={`text-sm font-semibold ${isToday ? 'text-[var(--color-primary,#f97316)]' : 'text-gray-400'}`}>
                      {day}
                    </div>
                    {gamesOnDay.length > 0 && (
                      <div className="mt-1 space-y-1 flex-1">
                        {gamesOnDay.map(game => (
                          <div key={game.id} 
                            onClick={() => setExpanded(expanded === game.id ? null : game.id)}
                            className="text-xs p-1 rounded cursor-pointer transition-all"
                            style={{ backgroundColor: "var(--color-primary,#f97316)22", color: "var(--color-primary,#f97316)" }}>
                            <div className="font-semibold truncate">vs {game.name}</div>
                            <div className="text-[10px] opacity-75">{game.location}</div>
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
      </div>

      {/* Selected Game Details */}
      {expanded && opponents.find(o => o.id === expanded) && (
        <div className="mt-6 space-y-3">
          <h2 className="text-gray-500 text-xs uppercase tracking-wider">Selected Game</h2>
          <GameCard
            opponent={opponents.find(o => o.id === expanded)}
            plan={getGamePlan(opponents.find(o => o.id === expanded))}
            isPast={new Date(opponents.find(o => o.id === expanded)?.game_date) < new Date()}
            expanded={true}
            onToggleExpand={setExpanded}
            onScout={handleScout}
            onTrack={setLiveTracker}
            onRefresh={() => base44.entities.Opponent.list("game_date").then(setOpponents)}
          />
        </div>
      )}

      {opponents.length === 0 && (
        <div className="text-center py-20">
          <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">No games scheduled yet.</p>
          <Link to={createPageUrl("Scouting")} className="text-sm px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
            Add Opponents
          </Link>
        </div>
      )}

      {/* Live Game Tracker */}
      {liveTracker && <LiveGameTracker opponent={liveTracker} onClose={() => setLiveTracker(null)} />}

      {/* Scout Preview Modal */}
      {scoutModal && <ScoutPreviewModal opponent={scoutModal} onClose={() => setScoutModal(null)} />}
    </div>
  );
}