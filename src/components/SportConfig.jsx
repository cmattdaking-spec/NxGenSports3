/**
 * Central sport configuration — drives positions, units, terminology,
 * play categories, and AI prompt context for every sport.
 * Consume via useSportConfig(activeSport) hook.
 */

const FOOTBALL_OFFENSE = ["QB","X","Z","W","Y","A","FB","H","LT","LG","C","RG","RT"];
const FOOTBALL_DEFENSE = ["DE","DT","NT","OLB","MLB","ILB","CB","SS","FS"];
const FOOTBALL_SPECIAL = ["K","P","LS"];

const CONFIGS = {
  // ─── BASKETBALL ─────────────────────────────────────────────────────────
  basketball: {
    sportFamily: "basketball",
    brand: "NxBucket",
    termDepthChart: "Rotation Chart",
    termPlay: "Play",
    termPlaybook: "Playbook",
    aiPersona: "elite basketball coach and strategist",

    units: ["offense", "defense"],
    unitLabels: { offense: "Offense", defense: "Defense" },

    positions: {
      offense: ["PG","SG","SF","PF","C_BB"],
      defense: ["PG","SG","SF","PF","C_BB"],
    },
    positionLabels: {
      PG: "PG", SG: "SG", SF: "SF", PF: "PF", C_BB: "C",
    },
    positionDesc: {
      PG: "Point Guard", SG: "Shooting Guard", SF: "Small Forward",
      PF: "Power Forward", C_BB: "Center",
    },

    playCategories: [
      "set_play","fast_break","zone_offense","motion","inbound",
      "man_defense","zone_defense","press","transition","out_of_bounds"
    ],
    playCategoryColors: {
      set_play:       "bg-blue-500/20 text-blue-400",
      fast_break:     "bg-orange-500/20 text-orange-400",
      zone_offense:   "bg-purple-500/20 text-purple-400",
      motion:         "bg-teal-500/20 text-teal-400",
      inbound:        "bg-yellow-500/20 text-yellow-400",
      man_defense:    "bg-red-500/20 text-red-400",
      zone_defense:   "bg-indigo-500/20 text-indigo-400",
      press:          "bg-pink-500/20 text-pink-400",
      transition:     "bg-green-500/20 text-green-400",
      out_of_bounds:  "bg-gray-500/20 text-gray-400",
    },

    depthSlots: ["Starter", "6th Man", "3rd", "4th"],

    gamePlanSections: [
      { key: "scripted_plays",   label: "Opening Sets",         color: "text-blue-400" },
      { key: "red_zone_plays",   label: "End-of-Quarter Plays", color: "text-red-400" },
      { key: "third_down_plays", label: "Inbound / ATO Plays",  color: "text-yellow-400" },
      { key: "two_minute_plays", label: "Last-Shot / Late-Game",color: "text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Opponent Tendencies & Defensive Schemes",

    practiceFocusPlaceholder: "e.g. Pick & Roll Defense, Transition Offense, Free Throw Shooting",
    practicePeriodUnits: ["team","offense","defense","individual","conditioning","film","walkthrough"],

    aiPracticeContext: (focus, opponentContext) =>
      `You are an elite high school/college basketball head coach generating a complete practice plan.
Focus: ${focus || "General preparation"}
${opponentContext}
Structure the practice with warm-up, skill work (ballhandling, shooting, post), team offense sets, team defense, competitive drills, and cool-down.
Use basketball-specific drills: shell drill, 5-on-5, pick & roll coverage, closeouts, free throws, transition, 3-man weave, etc.
Be specific with coaching points for each period.`,

    aiDepthChartContext: (unit, playerData, positionList) =>
      `You are an elite basketball head coach building a rotation chart.
Suggest an optimal ${unit} rotation for the following players.
Consider: health/availability, fatigue, foul trouble tendencies, and matchup versatility.
Players:
${playerData}
Provide rotation depth for positions: ${positionList}
Highlight any health or load concerns. Identify any players who can play multiple positions (switchable defenders, combo guards, etc.).`,

    aiPlaybookContext: (existing) =>
      `You are an elite basketball coach and strategist. Suggest 5 highly effective plays or sets for a high school/college basketball team.
Existing plays: ${existing || "None yet"}
For each play provide:
- Play name (reference real concepts: Horns, Floppy, Spain Pick & Roll, etc.)
- Type: set_play / fast_break / zone_offense / motion / inbound / man_defense / zone_defense / press
- Brief description (player movement, screens, reads)
- Best situation (vs. zone, late clock, after timeout, transition)
Be specific and practical.`,

    aiGamePlanContext: (opponent, players) =>
      `You are an elite basketball scout and head coach building a comprehensive game plan.
Opponent: ${opponent?.name || "Unknown"} on ${opponent?.game_date || "TBD"} (${opponent?.location || ""})
Offensive Tendency: ${opponent?.offensive_tendency || "Unknown"}
Defensive Tendency: ${opponent?.defensive_tendency || "Unknown"}
Key Players: ${opponent?.key_players || "Unknown"}
Their Strengths: ${opponent?.strengths || "Unknown"}
Their Weaknesses: ${opponent?.weaknesses || "Unknown"}
Our Roster: ${players?.length || 0} available players
Generate a full basketball game plan: primary defensive scheme, offensive attack plan, key matchup assignments, inbound plays, end-of-game situations, and halftime adjustment triggers.`,
  },

  // ─── FOOTBALL (default) ──────────────────────────────────────────────────
  football: {
    sportFamily: "football",
    brand: "NxDown",
    termDepthChart: "Depth Chart",
    termPlay: "Play",
    termPlaybook: "Playbook",
    aiPersona: "elite football coach and coordinator",

    units: ["offense", "defense", "special_teams"],
    unitLabels: { offense: "Offense", defense: "Defense", special_teams: "Special Teams" },

    positions: {
      offense: FOOTBALL_OFFENSE,
      defense: FOOTBALL_DEFENSE,
      special_teams: FOOTBALL_SPECIAL,
    },
    positionLabels: {},
    positionDesc: {},

    playCategories: ["run","pass","screen","play_action","blitz","coverage","zone","man","punt","kick","return"],
    playCategoryColors: {
      run: "bg-green-500/20 text-green-400", pass: "bg-blue-500/20 text-blue-400",
      screen: "bg-cyan-500/20 text-cyan-400", play_action: "bg-teal-500/20 text-teal-400",
      blitz: "bg-red-500/20 text-red-400", coverage: "bg-yellow-500/20 text-yellow-400",
      zone: "bg-teal-600/20 text-teal-300", man: "bg-sky-500/20 text-sky-400",
      punt: "bg-gray-500/20 text-gray-400", kick: "bg-gray-500/20 text-gray-400",
      return: "bg-indigo-500/20 text-indigo-400",
    },

    depthSlots: ["1st", "2nd", "3rd", "4th"],

    gamePlanSections: [
      { key: "scripted_plays",   label: "Opening Script",  color: "text-blue-400" },
      { key: "red_zone_plays",   label: "Red Zone",        color: "text-red-400" },
      { key: "third_down_plays", label: "3rd Down",        color: "text-yellow-400" },
      { key: "two_minute_plays", label: "2-Minute Drill",  color: "text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Key Tendencies",

    practiceFocusPlaceholder: "e.g. Red Zone, Pass Rush, 3rd Down Conversion...",
    practicePeriodUnits: ["team","offense","defense","special_teams","individual","conditioning","film"],

    aiPracticeContext: (focus, opponentContext) =>
      `You are an elite football head coach generating a complete practice plan.
Focus: ${focus || "General preparation"}
${opponentContext}
Structure with warm-up, individual, group, team periods, and cool-down. Include specific drill names and coaching points.`,

    aiDepthChartContext: (unit, playerData, positionList) =>
      `You are a football coaching assistant for NxDown. Based on the following ${unit} players, suggest an optimal depth chart.
Factor in player READINESS (S&C load and health status). OUT players should not start; High Load/Fatigued players go lower.
Players:
${playerData}
Provide depth chart recommendations for: ${positionList}
Note any S&C-related readiness concerns.`,

    aiPlaybookContext: (existing) =>
      `You are a football offensive/defensive coordinator AI. Suggest 5 highly effective plays that would complement this team's existing playbook.
Existing plays: ${existing || "None yet"}
Provide: play name, formation, category (run/pass/screen/play_action/blitz/coverage/zone/man), brief description, best down & distance.
Be specific and practical.`,

    aiGamePlanContext: (opponent, players) =>
      `You are an elite football coach building a comprehensive game plan.
Opponent: ${opponent?.name || "Unknown"} on ${opponent?.game_date || "TBD"}
Offensive Tendency: ${opponent?.offensive_tendency || "Unknown"}
Defensive Tendency: ${opponent?.defensive_tendency || "Unknown"}
Key Players: ${opponent?.key_players || "Unknown"}
Weaknesses: ${opponent?.weaknesses || "Unknown"}
Our Roster: ${players?.length || 0} available players`,
  },
};

const BASKETBALL_SPORTS = new Set([
  "basketball","boys_basketball","girls_basketball"
]);

export function getSportConfig(sport) {
  if (!sport) return CONFIGS.football;
  if (BASKETBALL_SPORTS.has(sport.toLowerCase())) return CONFIGS.basketball;
  return CONFIGS.football;
}

export function useSportConfig(activeSport) {
  return getSportConfig(activeSport);
}