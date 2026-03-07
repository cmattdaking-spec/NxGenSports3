import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Zap, X, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";

const RISK_COLORS = {
  high: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", badge: "bg-red-500/20 text-red-400" },
  medium: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-400" },
  low: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", badge: "bg-green-500/20 text-green-400" },
};

export default function InjuryRisk({ players, stats, healthRecords, workouts }) {
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerReport, setPlayerReport] = useState("");
  const [playerLoading, setPlayerLoading] = useState(false);

  // Calculate local risk indicators per player
  const playerRisks = players.map(player => {
    const pStats = stats.filter(s => s.player_id === player.id).sort((a, b) => b.week - a.week);
    const recentHealth = healthRecords.filter(h => h.player_id === player.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestHealth = recentHealth[0];
    const recentWorkouts = workouts.filter(w => w.player_ids?.includes(player.id) || w.level === player.levels?.[0]);

    // Recent snap count trend (fatigue indicator)
    const recentSnaps = pStats.slice(0, 3).map(s => s.snap_count || 0);
    const avgSnaps = recentSnaps.length ? recentSnaps.reduce((a, b) => a + b, 0) / recentSnaps.length : 0;
    const highLoadWorkouts = recentWorkouts.filter(w => w.intensity === "high" || w.intensity === "max").length;

    // Derive risk level
    let riskScore = 0;
    if (latestHealth?.availability === "limited") riskScore += 2;
    if (latestHealth?.availability === "out") riskScore += 4;
    if (latestHealth?.availability === "day_to_day") riskScore += 3;
    if (highLoadWorkouts >= 3) riskScore += 2;
    if (avgSnaps > 60) riskScore += 1;
    if (recentHealth.length >= 2) riskScore += 1; // repeated health entries = concern

    const riskLevel = riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";

    const factors = [];
    if (latestHealth?.availability !== "full" && latestHealth) factors.push(`Status: ${latestHealth.availability?.replace(/_/g, " ")}`);
    if (highLoadWorkouts >= 3) factors.push(`${highLoadWorkouts} high-intensity workouts recently`);
    if (avgSnaps > 60) factors.push(`High avg snap count (${avgSnaps.toFixed(0)})`);
    if (recentHealth.length >= 2) factors.push("Multiple health entries on record");
    if (latestHealth?.injury_type) factors.push(`Injury: ${latestHealth.injury_type}`);

    return { player, riskLevel, riskScore, factors, latestHealth, avgSnaps, highLoadWorkouts };
  }).sort((a, b) => b.riskScore - a.riskScore);

  const highRisk = playerRisks.filter(p => p.riskLevel === "high");
  const medRisk = playerRisks.filter(p => p.riskLevel === "medium");
  const lowRisk = playerRisks.filter(p => p.riskLevel === "low");

  const getTeamRiskReport = async () => {
    setAiLoading(true);
    setAiReport("");
    const summary = playerRisks.map(p => ({
      name: `${p.player.first_name} ${p.player.last_name}`,
      position: p.player.position,
      risk: p.riskLevel,
      factors: p.factors,
      recentStatus: p.latestHealth?.availability,
      injury: p.latestHealth?.injury_type,
      snaps: p.avgSnaps.toFixed(0),
      highLoadWorkouts: p.highLoadWorkouts,
    }));
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a sports medicine and injury prevention expert for a football team. Based on the following player risk data, provide a team-wide injury prevention report:\n\n${JSON.stringify(summary, null, 2)}\n\nProvide:\n1. Team injury risk summary\n2. Top 3 highest-risk players and specific prevention protocols\n3. Training load recommendations\n4. Recovery protocols for at-risk players\n5. Return-to-play timeline estimates for injured players\n\nBe specific, clinically informed, and actionable.`,
    });
    setAiReport(res);
    setAiLoading(false);
  };

  const getPlayerRiskReport = async (playerRisk) => {
    setSelectedPlayer(playerRisk);
    setPlayerLoading(true);
    setPlayerReport("");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a sports medicine expert. Analyze this player's injury risk profile:\n\nPlayer: ${playerRisk.player.first_name} ${playerRisk.player.last_name} (${playerRisk.player.position})\nRisk Level: ${playerRisk.riskLevel}\nRisk Factors: ${playerRisk.factors.join(", ")}\nAvg Snaps/Game: ${playerRisk.avgSnaps.toFixed(0)}\nHigh-Load Workouts (recent): ${playerRisk.highLoadWorkouts}\nCurrent Health Status: ${playerRisk.latestHealth?.availability || "full"}\nInjury: ${playerRisk.latestHealth?.injury_type || "none"}\n\nProvide:\n1. Risk assessment explanation\n2. Specific injury prevention exercises\n3. Load management recommendations\n4. Red flags to watch for\n5. Expected recovery trajectory (if injured)`,
    });
    setPlayerReport(res);
    setPlayerLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "High Risk", count: highRisk.length, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
          { label: "Medium Risk", count: medRisk.length, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
          { label: "Low Risk", count: lowRisk.length, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`border rounded-xl p-4 text-center ${bg}`}>
            <p className={`text-3xl font-black ${color}`}>{count}</p>
            <p className="text-gray-400 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* AI Team Report button */}
      <div className="flex justify-end">
        <button onClick={getTeamRiskReport} disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
          style={{ color: "var(--color-primary,#f97316)", borderColor: "var(--color-primary,#f97316)4d", backgroundColor: "var(--color-primary,#f97316)1a" }}>
          <Zap className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} />
          {aiLoading ? "Analyzing Risk..." : "AI Team Risk Report"}
        </button>
      </div>

      {/* AI report */}
      {aiReport && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: "var(--color-primary,#f97316)1a", borderColor: "var(--color-primary,#f97316)4d" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: "var(--color-primary,#f97316)" }} />
              <span className="font-medium text-sm" style={{ color: "var(--color-primary,#f97316)" }}>Team Injury Risk & Prevention Report</span>
            </div>
            <button onClick={() => setAiReport("")} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-gray-300 text-sm whitespace-pre-line">{aiReport}</p>
        </div>
      )}

      {/* Player risk list */}
      <div className="space-y-2">
        {playerRisks.map(({ player, riskLevel, factors, latestHealth }) => {
          const c = RISK_COLORS[riskLevel];
          return (
            <div key={player.id} className={`border rounded-xl p-4 ${c.bg} ${c.border}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--color-primary,#f97316)22" }}>
                    <span className="text-xs font-bold" style={{ color: "var(--color-primary,#f97316)" }}>{player.number || "—"}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{player.first_name} {player.last_name}</p>
                    <p className="text-gray-500 text-xs">{player.position} · {player.year}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
                    {riskLevel.toUpperCase()} RISK
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {latestHealth?.availability && latestHealth.availability !== "full" && (
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full capitalize">
                      {latestHealth.availability.replace(/_/g, " ")}
                    </span>
                  )}
                  <button onClick={() => getPlayerRiskReport({ player, riskLevel, factors, latestHealth, avgSnaps: 0, highLoadWorkouts: 0 })}
                    className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-all">
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                    Analyze
                  </button>
                </div>
              </div>
              {factors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {factors.map((f, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`}>{f}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Individual player report modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-700 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-400" />
                <h2 className="text-white font-bold">Injury Risk Profile — {selectedPlayer.player.first_name} {selectedPlayer.player.last_name}</h2>
              </div>
              <button onClick={() => { setSelectedPlayer(null); setPlayerReport(""); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              {playerLoading ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Analyzing risk profile...</p>
                </div>
              ) : (
                <p className="text-gray-300 text-sm whitespace-pre-line">{playerReport}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}