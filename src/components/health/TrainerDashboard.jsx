import { useMemo } from "react";
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, Flame, Heart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const AVAIL_CFG = {
  full: { color: "#22c55e", label: "Full" },
  limited: { color: "#eab308", label: "Limited" },
  day_to_day: { color: "#f97316", label: "Day-to-Day" },
  out: { color: "#ef4444", label: "Out" },
};

const INJURY_COLORS = ["#f97316","#ef4444","#a855f7","#3b82f6","#22c55e","#eab308","#ec4899"];

export default function TrainerDashboard({ records, players, workouts }) {
  // Latest record per player
  const latestByPlayer = useMemo(() => {
    const map = {};
    records.forEach(r => {
      if (!map[r.player_id] || new Date(r.date) > new Date(map[r.player_id].date))
        map[r.player_id] = r;
    });
    return map;
  }, [records]);

  // Availability breakdown
  const availCounts = useMemo(() => {
    const counts = { full: 0, limited: 0, day_to_day: 0, out: 0 };
    Object.values(latestByPlayer).forEach(r => { if (counts[r.availability] !== undefined) counts[r.availability]++; });
    return counts;
  }, [latestByPlayer]);

  const availPieData = Object.entries(availCounts).map(([k, v]) => ({ name: AVAIL_CFG[k].label, value: v, color: AVAIL_CFG[k].color }));
  const totalTracked = Object.values(availCounts).reduce((s, v) => s + v, 0);

  // Injury type breakdown (last 60 days)
  const injuryTypeCounts = useMemo(() => {
    const map = {};
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
    records.forEach(r => {
      if (r.injury_type && new Date(r.date) >= cutoff) {
        map[r.injury_type] = (map[r.injury_type] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
  }, [records]);

  // Recent health timeline (last 14 days)
  const timeline = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString([], { month: "short", day: "numeric" });
      const dayRecords = records.filter(r => r.date === d.toISOString().split("T")[0]);
      days.push({
        label,
        out: dayRecords.filter(r => r.availability === "out").length,
        limited: dayRecords.filter(r => r.availability === "limited" || r.availability === "day_to_day").length,
        full: dayRecords.filter(r => r.availability === "full").length,
      });
    }
    return days;
  }, [records]);

  // Players not cleared to play
  const notCleared = Object.values(latestByPlayer).filter(r => !r.cleared_to_play);

  // High workload alert
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentHighWorkouts = workouts.filter(w => new Date(w.date) >= sevenDaysAgo && (w.intensity === "high" || w.intensity === "max") && w.status === "completed");

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {recentHighWorkouts.length >= 3 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
          <Flame className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-400 font-semibold text-sm">High Training Load Alert</p>
            <p className="text-gray-300 text-sm mt-0.5">{recentHighWorkouts.length} high-intensity sessions in 7 days. Monitor recovery closely.</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Full Go", count: availCounts.full, icon: CheckCircle, color: "text-green-400", bg: "border-green-500/20 bg-green-500/5" },
          { label: "Limited", count: availCounts.limited, icon: Clock, color: "text-yellow-400", bg: "border-yellow-500/20 bg-yellow-500/5" },
          { label: "Day-to-Day", count: availCounts.day_to_day, icon: Activity, color: "text-orange-400", bg: "border-orange-500/20 bg-orange-500/5" },
          { label: "Out", count: availCounts.out, icon: AlertTriangle, color: "text-red-400", bg: "border-red-500/20 bg-red-500/5" },
        ].map(({ label, count, icon: Icon, color, bg }) => (
          <div key={label} className={`p-4 rounded-xl border ${bg}`}>
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <p className={`text-3xl font-black ${color}`}>{count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Availability Pie */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
            Availability Breakdown
            <span className="text-gray-500 text-xs ml-auto">{totalTracked} tracked</span>
          </h3>
          {totalTracked === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No health records logged yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={140}>
                <PieChart>
                  <Pie data={availPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                    {availPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {availPieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-400 text-xs">{d.name}</span>
                    <span className="text-white text-xs font-bold ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Injury Types */}
        <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" />
            Injury Types (Last 60 Days)
          </h3>
          {injuryTypeCounts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No injuries logged in the last 60 days</p>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={injuryTypeCounts} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} width={90} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #374151", color: "#fff", fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {injuryTypeCounts.map((_, i) => <Cell key={i} fill={INJURY_COLORS[i % INJURY_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 14-Day Timeline */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
          14-Day Health Activity
        </h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={timeline}>
            <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 9 }} interval={1} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #374151", color: "#fff", fontSize: 11 }} />
            <Bar dataKey="out" stackId="a" fill="#ef4444" name="Out" radius={[0,0,0,0]} />
            <Bar dataKey="limited" stackId="a" fill="#f97316" name="Limited" />
            <Bar dataKey="full" stackId="a" fill="#22c55e" name="Full" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Not Cleared to Play */}
      {notCleared.length > 0 && (
        <div className="bg-[#141414] border border-red-500/20 rounded-xl p-5">
          <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Not Cleared to Play ({notCleared.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {notCleared.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2">
                <div>
                  <p className="text-white text-sm font-medium">{r.player_name}</p>
                  <p className="text-gray-500 text-xs">{r.injury_type || "Reason not specified"} {r.estimated_return ? `· Est. return ${r.estimated_return}` : ""}</p>
                </div>
                <span className="text-red-400 text-xs bg-red-500/20 px-2 py-0.5 rounded-full">{r.availability?.replace("_"," ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}