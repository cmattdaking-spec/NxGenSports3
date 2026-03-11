/**
 * NxGenSports — Central Sport Configuration
 * Single source of truth for all sport-specific logic.
 * Every page/component reads from here — no hardcoded sport logic elsewhere.
 */

// ─── FOOTBALL POSITIONS ──────────────────────────────────────────────────────
const FB_OFF = ["QB","X","Z","W","Y","A","FB","H","LT","LG","C","RG","RT"];
const FB_DEF = ["DE","DT","NT","OLB","MLB","ILB","CB","SS","FS"];
const FB_ST  = ["K","P","LS"];

// ─── CONFIGS ─────────────────────────────────────────────────────────────────
const CONFIGS = {

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTBALL
  // ══════════════════════════════════════════════════════════════════════════
  football: {
    sportFamily: "football",
    brand: "NxDown",
    termDepthChart: "Depth Chart",
    termPlaybook: "Playbook",
    termPlay: "Play",
    aiPersona: "elite football coach and coordinator",

    units: ["offense","defense","special_teams"],
    unitLabels: { offense:"Offense", defense:"Defense", special_teams:"Special Teams" },

    positions: {
      offense: FB_OFF,
      defense: FB_DEF,
      special_teams: FB_ST,
    },
    positionLabels: {},
    positionDesc: {
      QB:"Quarterback", X:"Split End", Z:"Flanker", W:"Slot", Y:"Tight End",
      A:"H-Back", FB:"Fullback", H:"Halfback",
      LT:"Left Tackle", LG:"Left Guard", C:"Center", RG:"Right Guard", RT:"Right Tackle",
      DE:"Defensive End", DT:"Defensive Tackle", NT:"Nose Tackle",
      OLB:"Outside Linebacker", MLB:"Middle Linebacker", ILB:"Inside Linebacker",
      CB:"Cornerback", SS:"Strong Safety", FS:"Free Safety",
      K:"Kicker", P:"Punter", LS:"Long Snapper",
    },

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"offensive_coordinator", label:"Offensive Coordinator" },
      { value:"defensive_coordinator", label:"Defensive Coordinator" },
      { value:"special_teams_coordinator", label:"Special Teams Coordinator" },
      { value:"position_coach", label:"Position Coach" },
      { value:"strength_conditioning_coordinator", label:"S&C Coordinator" },
      { value:"trainer", label:"Athletic Trainer" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["run","pass","screen","play_action","blitz","coverage","zone","man","punt","kick","return"],
    playCategoryColors: {
      run:"bg-green-500/20 text-green-400", pass:"bg-blue-500/20 text-blue-400",
      screen:"bg-cyan-500/20 text-cyan-400", play_action:"bg-teal-500/20 text-teal-400",
      blitz:"bg-red-500/20 text-red-400", coverage:"bg-yellow-500/20 text-yellow-400",
      zone:"bg-teal-600/20 text-teal-300", man:"bg-sky-500/20 text-sky-400",
      punt:"bg-gray-500/20 text-gray-400", kick:"bg-gray-500/20 text-gray-400",
      return:"bg-indigo-500/20 text-indigo-400",
    },

    depthSlots: ["1st","2nd","3rd","4th"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Opening Script",  color:"text-blue-400" },
      { key:"red_zone_plays",   label:"Red Zone",        color:"text-red-400" },
      { key:"third_down_plays", label:"3rd Down",        color:"text-yellow-400" },
      { key:"two_minute_plays", label:"2-Minute Drill",  color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Opponent Tendencies",

    practiceFocusPlaceholder: "e.g. Red Zone, Pass Rush, 3rd Down Conversion...",
    practicePeriodUnits: ["team","offense","defense","special_teams","individual","conditioning","film"],

    injuryTypes: ["ACL","MCL","Concussion","Hamstring","Shoulder","Ankle Sprain","Knee","Back","Fracture","Contusion","Hip Flexor","Rotator Cuff"],

    statsFields: [
      { key:"passing_yards",    label:"Pass Yds",   group:"Passing" },
      { key:"completions",      label:"Comp",       group:"Passing" },
      { key:"attempts",         label:"Att",        group:"Passing" },
      { key:"touchdowns",       label:"TD",         group:"Passing" },
      { key:"interceptions",    label:"INT",        group:"Passing" },
      { key:"rushing_yards",    label:"Rush Yds",   group:"Rushing" },
      { key:"receptions",       label:"Rec",        group:"Receiving" },
      { key:"receiving_yards",  label:"Rec Yds",    group:"Receiving" },
      { key:"tackles",          label:"Tackles",    group:"Defense" },
      { key:"sacks",            label:"Sacks",      group:"Defense" },
      { key:"forced_fumbles",   label:"FF",         group:"Defense" },
      { key:"pass_deflections", label:"PD",         group:"Defense" },
      { key:"snap_count",       label:"Snaps",      group:"General" },
      { key:"grade",            label:"Grade",      group:"General" },
    ],

    measurables: [
      { key:"forty_time",   label:'40-Yard Dash (s)',   unit:"s" },
      { key:"bench_reps",   label:"225lb Bench Reps",  unit:"reps" },
      { key:"vertical_jump",label:"Vertical Jump",     unit:"in" },
      { key:"broad_jump",   label:"Broad Jump",        unit:"in" },
      { key:"three_cone",   label:"3-Cone (s)",        unit:"s" },
      { key:"shuttle_time", label:"20yd Shuttle (s)",  unit:"s" },
      { key:"height",       label:"Height",            unit:"" },
      { key:"weight",       label:"Weight (lbs)",      unit:"lbs" },
    ],

    analyticsMetrics: ["passing_yards","rushing_yards","touchdowns","sacks","tackles","grade"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite football head coach generating a complete practice plan.
Focus: ${focus || "General preparation"}
${oppCtx}
Structure with warm-up, individual, group, team periods, and cool-down. Include specific drill names and coaching points.`,

    aiDepthChartContext: (unit, playerData, posList) =>
      `You are a football coaching assistant. Based on the following ${unit} players, suggest an optimal depth chart.
Factor in health status and S&C load — OUT players should not start; fatigued players go lower.
Players:\n${playerData}\nProvide depth for: ${posList}. Note any readiness concerns.`,

    aiPlaybookContext: (existing) =>
      `You are a football coordinator AI. Suggest 5 effective plays to complement this playbook.
Existing plays: ${existing || "None yet"}
For each: play name, formation, category, description, best down & distance.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite football coach. Build a game plan vs ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"}.
Offensive tendency: ${opp?.offensive_tendency || "Unknown"}
Defensive tendency: ${opp?.defensive_tendency || "Unknown"}
Key players: ${opp?.key_players || "Unknown"}
Weaknesses: ${opp?.weaknesses || "Unknown"}
Roster: ${players?.length || 0} available.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BASKETBALL
  // ══════════════════════════════════════════════════════════════════════════
  basketball: {
    sportFamily: "basketball",
    brand: "NxBucket",
    termDepthChart: "Rotation Chart",
    termPlaybook: "Playbook",
    termPlay: "Set",
    aiPersona: "elite basketball coach and strategist",

    units: ["offense","defense"],
    unitLabels: { offense:"Offense", defense:"Defense" },

    positions: {
      offense: ["PG","SG","SF","PF","C_BB"],
      defense: ["PG","SG","SF","PF","C_BB"],
    },
    positionLabels: { C_BB:"C" },
    positionDesc: { PG:"Point Guard", SG:"Shooting Guard", SF:"Small Forward", PF:"Power Forward", C_BB:"Center" },

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"associate_head_coach", label:"Associate Head Coach" },
      { value:"assistant_coach", label:"Assistant Coach" },
      { value:"strength_conditioning_coordinator", label:"S&C Coordinator" },
      { value:"trainer", label:"Athletic Trainer" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["set_play","fast_break","zone_offense","motion","inbound","man_defense","zone_defense","press","transition","out_of_bounds"],
    playCategoryColors: {
      set_play:"bg-blue-500/20 text-blue-400", fast_break:"bg-orange-500/20 text-orange-400",
      zone_offense:"bg-purple-500/20 text-purple-400", motion:"bg-teal-500/20 text-teal-400",
      inbound:"bg-yellow-500/20 text-yellow-400", man_defense:"bg-red-500/20 text-red-400",
      zone_defense:"bg-indigo-500/20 text-indigo-400", press:"bg-pink-500/20 text-pink-400",
      transition:"bg-green-500/20 text-green-400", out_of_bounds:"bg-gray-500/20 text-gray-400",
    },

    depthSlots: ["Starter","6th Man","3rd","4th"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Opening Sets",          color:"text-blue-400" },
      { key:"red_zone_plays",   label:"End-of-Quarter Plays",  color:"text-red-400" },
      { key:"third_down_plays", label:"Inbound / ATO Plays",   color:"text-yellow-400" },
      { key:"two_minute_plays", label:"Last-Shot / Late-Game", color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Opponent Defensive/Offensive Schemes",

    practiceFocusPlaceholder: "e.g. Pick & Roll Defense, Transition Offense, Free Throws...",
    practicePeriodUnits: ["team","offense","defense","individual","conditioning","film","walkthrough"],

    injuryTypes: ["Ankle Sprain","ACL","Knee","Finger","Back","Hamstring","Concussion","Shoulder","Patellar Tendinitis","Hip Flexor"],

    statsFields: [
      { key:"points",                   label:"PTS",   group:"Offense" },
      { key:"rebounds",                 label:"REB",   group:"General" },
      { key:"assists",                  label:"AST",   group:"General" },
      { key:"steals",                   label:"STL",   group:"Defense" },
      { key:"blocks",                   label:"BLK",   group:"Defense" },
      { key:"turnovers",                label:"TO",    group:"General" },
      { key:"field_goals_made",         label:"FGM",   group:"Shooting" },
      { key:"field_goals_attempted",    label:"FGA",   group:"Shooting" },
      { key:"three_pointers_made",      label:"3PM",   group:"Shooting" },
      { key:"three_pointers_attempted", label:"3PA",   group:"Shooting" },
      { key:"free_throws_made",         label:"FTM",   group:"Shooting" },
      { key:"free_throws_attempted",    label:"FTA",   group:"Shooting" },
      { key:"minutes_played",           label:"MIN",   group:"General" },
      { key:"fouls",                    label:"PF",    group:"General" },
    ],

    measurables: [
      { key:"height",         label:"Height",              unit:"" },
      { key:"weight",         label:"Weight (lbs)",        unit:"lbs" },
      { key:"vertical_jump",  label:"Vertical Jump",       unit:"in" },
      { key:"wingspan",       label:"Wingspan",            unit:"in" },
      { key:"lane_agility",   label:"Lane Agility (s)",    unit:"s" },
      { key:"three_quarter_sprint", label:"3/4 Sprint (s)", unit:"s" },
    ],

    analyticsMetrics: ["points","rebounds","assists","steals","blocks","turnovers"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite basketball head coach generating a complete practice plan.
Focus: ${focus || "General preparation"}
${oppCtx}
Structure: warm-up, skill work, team offense, team defense, competitive drills, cool-down.
Use specific drills: shell drill, 5-on-5, pick & roll coverage, closeouts, free throws, 3-man weave, etc.`,

    aiDepthChartContext: (unit, playerData, posList) =>
      `You are an elite basketball head coach building a rotation chart.
Suggest optimal ${unit} rotation. Consider health, fatigue, foul tendencies, matchup versatility.
Players:\n${playerData}\nPositions: ${posList}\nIdentify multi-position players.`,

    aiPlaybookContext: (existing) =>
      `You are an elite basketball coach. Suggest 5 effective plays for a high school/college team.
Existing plays: ${existing || "None yet"}
For each: name, type, description (movement/screens/reads), best situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite basketball scout and head coach.
Opponent: ${opp?.name || "Unknown"} (${opp?.location || ""}) on ${opp?.game_date || "TBD"}
Offensive tendency: ${opp?.offensive_tendency || "Unknown"}
Defensive tendency: ${opp?.defensive_tendency || "Unknown"}
Key players: ${opp?.key_players || "Unknown"}
Generate: primary defensive scheme, offensive attack plan, matchup assignments, inbound plays, late-game situations.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BASEBALL / SOFTBALL
  // ══════════════════════════════════════════════════════════════════════════
  baseball: {
    sportFamily: "baseball",
    brand: "NxPitch",
    termDepthChart: "Lineup Card",
    termPlaybook: "Signal Book",
    termPlay: "Play",
    aiPersona: "elite baseball/softball coach",

    units: ["offense","defense"],
    unitLabels: { offense:"Hitting", defense:"Pitching/Fielding" },

    positions: {
      offense: ["SP","P_BASE","C_BASE","1B","2B","3B","SS_BASE","LF","CF","RF","DH"],
      defense: ["SP","P_BASE","C_BASE","1B","2B","3B","SS_BASE","LF","CF","RF"],
    },
    positionLabels: { SP:"SP", P_BASE:"RP", C_BASE:"C", SS_BASE:"SS" },
    positionDesc: {
      SP:"Starting Pitcher", P_BASE:"Relief Pitcher", C_BASE:"Catcher",
      "1B":"First Base", "2B":"Second Base", "3B":"Third Base", SS_BASE:"Shortstop",
      LF:"Left Field", CF:"Center Field", RF:"Right Field", DH:"Designated Hitter",
    },

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"pitching_coach", label:"Pitching Coach" },
      { value:"hitting_coach", label:"Hitting Coach" },
      { value:"fielding_coach", label:"Fielding Coach" },
      { value:"strength_conditioning_coordinator", label:"S&C Coordinator" },
      { value:"trainer", label:"Athletic Trainer" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["pitching_strategy","batting_order","fielding_shift","base_running","situational_hitting","bunt_play","pickoff","defensive_play"],
    playCategoryColors: {
      pitching_strategy:"bg-blue-500/20 text-blue-400", batting_order:"bg-orange-500/20 text-orange-400",
      fielding_shift:"bg-purple-500/20 text-purple-400", base_running:"bg-green-500/20 text-green-400",
      situational_hitting:"bg-yellow-500/20 text-yellow-400", bunt_play:"bg-teal-500/20 text-teal-400",
      pickoff:"bg-red-500/20 text-red-400", defensive_play:"bg-gray-500/20 text-gray-400",
    },

    depthSlots: ["Starter","Backup","3rd"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Batting Order",         color:"text-blue-400" },
      { key:"red_zone_plays",   label:"Pitching Rotation",     color:"text-red-400" },
      { key:"third_down_plays", label:"Situational Hitting",   color:"text-yellow-400" },
      { key:"two_minute_plays", label:"Late Inning Strategy",  color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Opponent Pitching & Hitting Tendencies",

    practiceFocusPlaceholder: "e.g. Live BP, Fielding Fundamentals, Baserunning...",
    practicePeriodUnits: ["team","pitching","hitting","fielding","baserunning","conditioning","film"],

    injuryTypes: ["UCL / Tommy John","Rotator Cuff","Hamstring","Oblique","Blister","Shin Splints","Elbow","Shoulder","Back","Knee"],

    statsFields: [
      { key:"at_bats",          label:"AB",   group:"Hitting" },
      { key:"hits",             label:"H",    group:"Hitting" },
      { key:"runs",             label:"R",    group:"Hitting" },
      { key:"rbis",             label:"RBI",  group:"Hitting" },
      { key:"walks",            label:"BB",   group:"Hitting" },
      { key:"strikeouts_batting",label:"K",   group:"Hitting" },
      { key:"stolen_bases",     label:"SB",   group:"Hitting" },
      { key:"errors",           label:"E",    group:"Fielding" },
      { key:"innings_pitched",  label:"IP",   group:"Pitching" },
      { key:"earned_runs",      label:"ER",   group:"Pitching" },
      { key:"era",              label:"ERA",  group:"Pitching" },
      { key:"strikeouts",       label:"SO",   group:"Pitching" },
    ],

    measurables: [
      { key:"height",        label:"Height",                unit:"" },
      { key:"weight",        label:"Weight (lbs)",          unit:"lbs" },
      { key:"sixty_time",    label:"60-Yard Dash (s)",      unit:"s" },
      { key:"exit_velocity", label:"Exit Velocity (mph)",   unit:"mph" },
      { key:"arm_strength",  label:"Arm Strength (mph)",    unit:"mph" },
      { key:"pop_time",      label:"Pop Time (s)",          unit:"s" },
    ],

    analyticsMetrics: ["hits","rbis","era","strikeouts","stolen_bases","errors"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite baseball/softball head coach generating a complete practice plan.
Focus: ${focus || "General preparation"}
${oppCtx}
Structure: warm-up, throwing program, fielding, batting practice (live BP / tee / soft toss), situational drills, cool-down/stretch.`,

    aiDepthChartContext: (unit, playerData, posList) =>
      `You are a baseball/softball coach building a lineup card.
Suggest optimal ${unit} lineup considering health, handedness matchups, and current form.
Players:\n${playerData}\nPositions: ${posList}`,

    aiPlaybookContext: (existing) =>
      `You are an elite baseball/softball coach. Suggest 5 effective plays or strategies.
Existing signals/plays: ${existing || "None yet"}
For each: name, type (pitching_strategy/situational_hitting/base_running/etc.), description, best situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite baseball/softball coach building a game plan.
Opponent: ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"}
Pitching tendency: ${opp?.offensive_tendency || "Unknown"}
Defensive tendency: ${opp?.defensive_tendency || "Unknown"}
Key players: ${opp?.key_players || "Unknown"}
Generate: batting order rationale, pitching matchup strategy, defensive positioning, situational hitting plans.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SOCCER
  // ══════════════════════════════════════════════════════════════════════════
  soccer: {
    sportFamily: "soccer",
    brand: "NxGoal",
    termDepthChart: "Starting XI",
    termPlaybook: "Tactical Guide",
    termPlay: "Set Piece",
    aiPersona: "elite soccer coach and tactician",

    units: ["offense","defense"],
    unitLabels: { offense:"Attack", defense:"Defense" },

    positions: {
      offense: ["GK","DEF","MID","FWD","LW","RW"],
      defense: ["GK","DEF","MID","LW","RW"],
    },
    positionLabels: {},
    positionDesc: { GK:"Goalkeeper", DEF:"Defender", MID:"Midfielder", FWD:"Forward", LW:"Left Wing", RW:"Right Wing" },

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"assistant_coach", label:"Assistant Coach" },
      { value:"goalkeeper_coach", label:"Goalkeeper Coach" },
      { value:"strength_conditioning_coordinator", label:"S&C Coordinator" },
      { value:"trainer", label:"Athletic Trainer" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["set_piece","corner_kick","free_kick","penalty","counter_attack","pressing","defensive_shape","formation_shift"],
    playCategoryColors: {
      set_piece:"bg-blue-500/20 text-blue-400", corner_kick:"bg-orange-500/20 text-orange-400",
      free_kick:"bg-yellow-500/20 text-yellow-400", penalty:"bg-red-500/20 text-red-400",
      counter_attack:"bg-green-500/20 text-green-400", pressing:"bg-purple-500/20 text-purple-400",
      defensive_shape:"bg-teal-500/20 text-teal-400", formation_shift:"bg-gray-500/20 text-gray-400",
    },

    depthSlots: ["Starter","Backup","3rd"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Set Pieces",       color:"text-blue-400" },
      { key:"red_zone_plays",   label:"Attack Patterns",  color:"text-orange-400" },
      { key:"third_down_plays", label:"Defensive Shape",  color:"text-teal-400" },
      { key:"two_minute_plays", label:"Final Minutes",    color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Opponent Formation & Pressing Tendencies",

    practiceFocusPlaceholder: "e.g. Set Pieces, Pressing, Defensive Shape, Finishing...",
    practicePeriodUnits: ["team","attack","defense","set_pieces","individual","conditioning","film"],

    injuryTypes: ["ACL","Hamstring","Ankle Sprain","Groin","Concussion","Knee","Shin Splints","Hip Flexor","Quad","Calf"],

    statsFields: [
      { key:"goals",            label:"G",     group:"Offense" },
      { key:"assists_soccer",   label:"A",     group:"Offense" },
      { key:"shots",            label:"Shots", group:"Offense" },
      { key:"shots_on_goal",    label:"SOG",   group:"Offense" },
      { key:"saves_soccer",     label:"Saves", group:"GK" },
      { key:"minutes_played_soccer", label:"MIN", group:"General" },
      { key:"yellow_cards",     label:"YC",    group:"Discipline" },
      { key:"red_cards",        label:"RC",    group:"Discipline" },
    ],

    measurables: [
      { key:"height",       label:"Height",           unit:"" },
      { key:"weight",       label:"Weight (lbs)",     unit:"lbs" },
      { key:"forty_time",   label:"40-Yard Dash (s)", unit:"s" },
      { key:"vertical_jump",label:"Vertical Jump",    unit:"in" },
    ],

    analyticsMetrics: ["goals","assists_soccer","shots_on_goal","saves_soccer","yellow_cards"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite soccer head coach generating a complete practice plan.
Focus: ${focus || "General preparation"}
${oppCtx}
Structure: warm-up (rondos, passing patterns), technical work, tactical shape, small-sided games, set pieces, cool-down.`,

    aiDepthChartContext: (unit, playerData, posList) =>
      `You are a soccer coach building a starting lineup.
Suggest optimal ${unit} XI and subs. Consider fitness, suspension, and tactical matchups.
Players:\n${playerData}\nPositions: ${posList}`,

    aiPlaybookContext: (existing) =>
      `You are an elite soccer tactician. Suggest 5 effective set pieces or tactical patterns.
Existing plays: ${existing || "None yet"}
For each: name, type, description, best situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite soccer coach building a game plan.
Opponent: ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"} (${opp?.location || ""})
Formation tendency: ${opp?.offensive_tendency || "Unknown"}
Press/defensive tendency: ${opp?.defensive_tendency || "Unknown"}
Key players: ${opp?.key_players || "Unknown"}
Generate: formation, pressing triggers, set piece assignments, substitution plan.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VOLLEYBALL
  // ══════════════════════════════════════════════════════════════════════════
  volleyball: {
    sportFamily: "volleyball",
    brand: "NxSet",
    termDepthChart: "Rotation Order",
    termPlaybook: "System Book",
    termPlay: "Set",
    aiPersona: "elite volleyball coach",

    units: ["offense","defense"],
    unitLabels: { offense:"Offense", defense:"Defense" },

    positions: {
      offense: ["S_SET","OH","MB","RS","OPP","L"],
      defense: ["S_SET","OH","MB","RS","OPP","L"],
    },
    positionLabels: { S_SET:"S", OH:"OH", MB:"MB", RS:"RS", OPP:"OPP", L:"L" },
    positionDesc: { S_SET:"Setter", OH:"Outside Hitter", MB:"Middle Blocker", RS:"Right Side", OPP:"Opposite", L:"Libero" },

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"assistant_coach", label:"Assistant Coach" },
      { value:"strength_conditioning_coordinator", label:"S&C Coordinator" },
      { value:"trainer", label:"Athletic Trainer" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["serve_receive","offensive_set","defensive_system","blocking_scheme","serving_strategy","transition","out_of_system","quick_attack"],
    playCategoryColors: {
      serve_receive:"bg-blue-500/20 text-blue-400", offensive_set:"bg-orange-500/20 text-orange-400",
      defensive_system:"bg-teal-500/20 text-teal-400", blocking_scheme:"bg-purple-500/20 text-purple-400",
      serving_strategy:"bg-yellow-500/20 text-yellow-400", transition:"bg-green-500/20 text-green-400",
      out_of_system:"bg-red-500/20 text-red-400", quick_attack:"bg-cyan-500/20 text-cyan-400",
    },

    depthSlots: ["Starter","Backup","3rd"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Serve Receive System", color:"text-blue-400" },
      { key:"red_zone_plays",   label:"Offensive Schemes",    color:"text-orange-400" },
      { key:"third_down_plays", label:"Defensive System",     color:"text-teal-400" },
      { key:"two_minute_plays", label:"Rotation Adjustments", color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Opponent Serving & Offensive Tendencies",

    practiceFocusPlaceholder: "e.g. Serve Receive, Blocking, 6-Rotation, Serving Zones...",
    practicePeriodUnits: ["team","serve_receive","offense","defense","serve","individual","conditioning"],

    injuryTypes: ["Ankle Sprain","Patellar Tendinitis","Finger","Shoulder","Back","Concussion","Knee","Wrist","Hip Flexor"],

    statsFields: [
      { key:"kills",             label:"Kills",   group:"Offense" },
      { key:"aces_volleyball",   label:"Aces",    group:"Serving" },
      { key:"digs",              label:"Digs",    group:"Defense" },
      { key:"blocks_volleyball", label:"Blocks",  group:"Defense" },
      { key:"assists_volleyball",label:"Assists", group:"Setting" },
      { key:"hitting_errors",    label:"Errors",  group:"General" },
      { key:"service_errors",    label:"Svc Err", group:"Serving" },
    ],

    measurables: [
      { key:"height",        label:"Height",             unit:"" },
      { key:"weight",        label:"Weight (lbs)",       unit:"lbs" },
      { key:"vertical_jump", label:"Standing Vertical",  unit:"in" },
      { key:"approach_jump", label:"Approach Jump",      unit:"in" },
      { key:"block_jump",    label:"Block Jump",         unit:"in" },
    ],

    analyticsMetrics: ["kills","digs","aces_volleyball","blocks_volleyball","assists_volleyball","hitting_errors"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite volleyball head coach generating a practice plan.
Focus: ${focus || "General preparation"}
${oppCtx}
Structure: warm-up, serve/receive, offensive system, defensive system, full 6v6, serving, cool-down.`,

    aiDepthChartContext: (unit, playerData, posList) =>
      `You are a volleyball coach building a rotation order.
Suggest optimal 6-rotation lineup for ${unit} considering serve receive and blocking matchups.
Players:\n${playerData}\nPositions: ${posList}`,

    aiPlaybookContext: (existing) =>
      `You are an elite volleyball coach. Suggest 5 effective offensive sets or defensive schemes.
Existing systems: ${existing || "None yet"}
For each: name, type, description, best situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite volleyball coach building a match plan.
Opponent: ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"}
Offensive tendency: ${opp?.offensive_tendency || "Unknown"}
Serving/defensive tendency: ${opp?.defensive_tendency || "Unknown"}
Key players: ${opp?.key_players || "Unknown"}
Generate: serving targets, reception formation, offensive packages, blocking assignments.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BOXING
  // ══════════════════════════════════════════════════════════════════════════
  boxing: {
    sportFamily: "boxing",
    brand: "NxRound",
    termDepthChart: "Weight Class Lineup",
    termPlaybook: "Fight Strategy",
    termPlay: "Combination",
    aiPersona: "elite boxing coach and trainer",

    units: ["offense","defense"],
    unitLabels: { offense:"Offense", defense:"Defense" },

    positions: {
      offense: ["BOX"],
      defense: ["BOX"],
    },
    positionLabels: { BOX:"Boxer" },
    positionDesc: { BOX:"Boxer" },

    staffRoles: [
      { value:"head_coach", label:"Head Coach / Head Trainer" },
      { value:"assistant_coach", label:"Corner Coach" },
      { value:"strength_conditioning_coordinator", label:"S&C Coordinator" },
      { value:"trainer", label:"Cutman / Trainer" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["combination","defense_shell","footwork","counter_punch","body_attack","ring_strategy","clinch","pressure"],
    playCategoryColors: {
      combination:"bg-red-500/20 text-red-400", defense_shell:"bg-blue-500/20 text-blue-400",
      footwork:"bg-green-500/20 text-green-400", counter_punch:"bg-orange-500/20 text-orange-400",
      body_attack:"bg-yellow-500/20 text-yellow-400", ring_strategy:"bg-purple-500/20 text-purple-400",
      clinch:"bg-gray-500/20 text-gray-400", pressure:"bg-teal-500/20 text-teal-400",
    },

    depthSlots: ["Starter","Alternate"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Opening Strategy",       color:"text-blue-400" },
      { key:"red_zone_plays",   label:"Mid-Fight Adjustments",  color:"text-red-400" },
      { key:"third_down_plays", label:"Combination Sequences",  color:"text-yellow-400" },
      { key:"two_minute_plays", label:"Final Round Plan",       color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Opponent Style & Tendencies",

    practiceFocusPlaceholder: "e.g. Combinations, Defensive Footwork, Body Shots, Sparring...",
    practicePeriodUnits: ["team","sparring","bag_work","pad_work","footwork","conditioning","film"],

    injuryTypes: ["Cut","Nose","Hand / Knuckle","Rib","Eye","Shoulder","Concussion","Wrist","Back","Ankle"],

    statsFields: [
      { key:"rounds_won",       label:"Rounds Won",     group:"Performance" },
      { key:"knockdowns",       label:"KDs",            group:"Performance" },
      { key:"punches_landed",   label:"Landed",         group:"Accuracy" },
      { key:"punches_thrown",   label:"Thrown",         group:"Accuracy" },
    ],

    measurables: [
      { key:"height",   label:"Height",       unit:"" },
      { key:"weight",   label:"Weight (lbs)", unit:"lbs" },
      { key:"reach",    label:"Reach",        unit:"in" },
    ],

    analyticsMetrics: ["rounds_won","knockdowns","punches_landed","punches_thrown"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite boxing coach generating a training session plan.
Focus: ${focus || "General preparation"}
${oppCtx}
Structure: warm-up, shadowboxing, bag work, pad work / sparring, conditioning, cool-down.`,

    aiDepthChartContext: (unit, playerData, posList) =>
      `You are a boxing coach building a weight class lineup.
Assign boxers to weight classes based on current weight and readiness.
Players:\n${playerData}`,

    aiPlaybookContext: (existing) =>
      `You are an elite boxing trainer. Suggest 5 effective combinations or fight strategies.
Existing strategies: ${existing || "None yet"}
For each: name, type, technique sequence, best situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite boxing trainer building a fight plan.
Opponent: ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"}
Style/tendency: ${opp?.offensive_tendency || "Unknown"}
Weaknesses: ${opp?.weaknesses || "Unknown"}
Generate: opening strategy, round-by-round approach, combination priorities, defensive shell.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GOLF
  // ══════════════════════════════════════════════════════════════════════════
  golf: {
    sportFamily: "golf",
    brand: "NxHole",
    termDepthChart: "Flight Order",
    termPlaybook: "Course Book",
    termPlay: "Strategy",
    aiPersona: "elite golf coach",

    units: ["offense"],
    unitLabels: { offense:"Individual" },

    positions: {
      offense: ["PG_GOLF"],
    },
    positionLabels: { PG_GOLF:"Golfer" },
    positionDesc: { PG_GOLF:"Golfer" },

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"assistant_coach", label:"Assistant Coach" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["tee_strategy","approach","short_game","putting","course_management","wind_adjustment","scrambling"],
    playCategoryColors: {
      tee_strategy:"bg-green-500/20 text-green-400", approach:"bg-blue-500/20 text-blue-400",
      short_game:"bg-yellow-500/20 text-yellow-400", putting:"bg-teal-500/20 text-teal-400",
      course_management:"bg-purple-500/20 text-purple-400", wind_adjustment:"bg-gray-500/20 text-gray-400",
      scrambling:"bg-orange-500/20 text-orange-400",
    },

    depthSlots: ["#1","#2","#3","#4","#5","Alternate"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Course Strategy",    color:"text-green-400" },
      { key:"red_zone_plays",   label:"Scoring Holes",      color:"text-blue-400" },
      { key:"third_down_plays", label:"Par 3 Approach",     color:"text-yellow-400" },
      { key:"two_minute_plays", label:"Closing Holes",      color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Course Conditions & Opponent Tendencies",

    practiceFocusPlaceholder: "e.g. Short Game, Driving Accuracy, Putting, Course Management...",
    practicePeriodUnits: ["driving_range","short_game","putting","on_course","mental_game","conditioning"],

    injuryTypes: ["Back","Wrist","Elbow (Golfer's Elbow)","Shoulder","Hip","Knee","Neck"],

    statsFields: [
      { key:"score",                 label:"Score",   group:"General" },
      { key:"par_score",             label:"vs Par",  group:"General" },
      { key:"fairways_hit",          label:"FIR",     group:"Driving" },
      { key:"greens_in_regulation",  label:"GIR",     group:"Approach" },
      { key:"putts",                 label:"Putts",   group:"Putting" },
    ],

    measurables: [
      { key:"height",            label:"Height",                unit:"" },
      { key:"weight",            label:"Weight (lbs)",          unit:"lbs" },
      { key:"driving_distance",  label:"Driving Distance (yds)",unit:"yds" },
      { key:"handicap",          label:"Handicap",              unit:"" },
    ],

    analyticsMetrics: ["score","par_score","fairways_hit","greens_in_regulation","putts"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite golf coach generating a practice plan.
Focus: ${focus || "General improvement"}
${oppCtx}
Structure: warm-up, driving range (full swing), approach shots, short game (chipping/pitching), putting, on-course simulation.`,

    aiDepthChartContext: (unit, playerData, _) =>
      `You are a golf coach setting a flight/lineup order.
Assign players to lineup positions 1-5 based on scoring average, current form, and match conditions.
Players:\n${playerData}`,

    aiPlaybookContext: (existing) =>
      `You are an elite golf coach. Suggest 5 course management strategies or shot patterns.
Existing strategies: ${existing || "None yet"}
For each: name, type, description, best situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite golf coach building a match plan.
Opponent: ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"}
Course conditions: ${opp?.offensive_tendency || "Unknown"}
Team: ${players?.length || 0} players
Generate: lineup order rationale, course strategy by hole type, weather adjustments.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TENNIS
  // ══════════════════════════════════════════════════════════════════════════
  tennis: {
    sportFamily: "tennis",
    brand: "NxServe",
    termDepthChart: "Lineup",
    termPlaybook: "Strategy Guide",
    termPlay: "Pattern",
    aiPersona: "elite tennis coach",

    units: ["offense","defense"],
    unitLabels: { offense:"Singles", defense:"Doubles" },

    positions: {
      offense: ["S1","S2","S3","S4","S5","S6","D1","D2","D3"],
      defense: ["S1","S2","S3","S4","S5","S6","D1","D2","D3"],
    },
    positionLabels: { S1:"#1 Singles", S2:"#2 Singles", S3:"#3 Singles", S4:"#4 Singles", S5:"#5 Singles", S6:"#6 Singles", D1:"#1 Doubles", D2:"#2 Doubles", D3:"#3 Doubles" },
    positionDesc: {},

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"assistant_coach", label:"Assistant Coach" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["serve_pattern","return_strategy","net_approach","baseline_rally","doubles_formation","lob","drop_shot","tiebreak"],
    playCategoryColors: {
      serve_pattern:"bg-blue-500/20 text-blue-400", return_strategy:"bg-orange-500/20 text-orange-400",
      net_approach:"bg-green-500/20 text-green-400", baseline_rally:"bg-yellow-500/20 text-yellow-400",
      doubles_formation:"bg-purple-500/20 text-purple-400", lob:"bg-teal-500/20 text-teal-400",
      drop_shot:"bg-red-500/20 text-red-400", tiebreak:"bg-gray-500/20 text-gray-400",
    },

    depthSlots: ["Starter","Alternate"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Serve Strategy",    color:"text-blue-400" },
      { key:"red_zone_plays",   label:"Return Game",       color:"text-orange-400" },
      { key:"third_down_plays", label:"Net Game",          color:"text-green-400" },
      { key:"two_minute_plays", label:"Tiebreak Plan",     color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Opponent Serve & Rally Tendencies",

    practiceFocusPlaceholder: "e.g. Serve & Return, Net Play, Match Tiebreaks, Doubles Positioning...",
    practicePeriodUnits: ["team","singles_drills","doubles_drills","serve_return","match_play","conditioning","film"],

    injuryTypes: ["Shoulder","Elbow (Tennis Elbow)","Wrist","Ankle","Back","Knee","Calf","Hip"],

    statsFields: [
      { key:"sets_won",          label:"Sets",    group:"Match" },
      { key:"games_won",         label:"Games",   group:"Match" },
      { key:"aces_tennis",       label:"Aces",    group:"Serving" },
      { key:"double_faults",     label:"DFs",     group:"Serving" },
      { key:"first_serve_pct",   label:"1st Srv%",group:"Serving" },
    ],

    measurables: [
      { key:"height",      label:"Height",           unit:"" },
      { key:"weight",      label:"Weight (lbs)",     unit:"lbs" },
      { key:"serve_speed", label:"Serve Speed (mph)",unit:"mph" },
    ],

    analyticsMetrics: ["sets_won","games_won","aces_tennis","double_faults","first_serve_pct"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite tennis coach generating a practice plan.
Focus: ${focus || "General improvement"}
${oppCtx}
Structure: warm-up (footwork, mini-tennis), groundstroke drilling, serve/return, point play, doubles work, conditioning.`,

    aiDepthChartContext: (unit, playerData, _) =>
      `You are a tennis coach building a lineup (singles 1-6, doubles 1-3).
Assign players based on ranking, form, and opponent matchups.
Players:\n${playerData}`,

    aiPlaybookContext: (existing) =>
      `You are an elite tennis coach. Suggest 5 effective tactical patterns or strategies.
Existing patterns: ${existing || "None yet"}
For each: name, type, description, best situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite tennis coach building a match plan.
Opponent: ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"}
Playing style: ${opp?.offensive_tendency || "Unknown"}
Key players: ${opp?.key_players || "Unknown"}
Generate: singles lineup with rationale, doubles pairings, tactical notes per matchup.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WRESTLING
  // ══════════════════════════════════════════════════════════════════════════
  wrestling: {
    sportFamily: "wrestling",
    brand: "NxMatch",
    termDepthChart: "Weight Class Lineup",
    termPlaybook: "Move Chart",
    termPlay: "Sequence",
    aiPersona: "elite wrestling coach",

    units: ["offense","defense"],
    unitLabels: { offense:"Offense", defense:"Defense" },

    positions: {
      offense: ["106","113","120","126","132","138","144","150","157","165","175","190","215","285"],
      defense: ["106","113","120","126","132","138","144","150","157","165","175","190","215","285"],
    },
    positionLabels: {},
    positionDesc: {},

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"assistant_coach", label:"Assistant Coach" },
      { value:"strength_conditioning_coordinator", label:"S&C Coordinator" },
      { value:"trainer", label:"Athletic Trainer" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["takedown","escape","reversal","pinning_combo","ride_out","neutral_defense","scramble","counter"],
    playCategoryColors: {
      takedown:"bg-red-500/20 text-red-400", escape:"bg-green-500/20 text-green-400",
      reversal:"bg-blue-500/20 text-blue-400", pinning_combo:"bg-yellow-500/20 text-yellow-400",
      ride_out:"bg-orange-500/20 text-orange-400", neutral_defense:"bg-teal-500/20 text-teal-400",
      scramble:"bg-purple-500/20 text-purple-400", counter:"bg-gray-500/20 text-gray-400",
    },

    depthSlots: ["Starter","Backup"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Neutral Position",    color:"text-blue-400" },
      { key:"red_zone_plays",   label:"Takedown Setups",     color:"text-red-400" },
      { key:"third_down_plays", label:"Top Position",        color:"text-yellow-400" },
      { key:"two_minute_plays", label:"Escape / Reversal",   color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Opponent Tendencies & Preferred Moves",

    practiceFocusPlaceholder: "e.g. Double Leg, Mat Escapes, Pinning Combinations, Riding...",
    practicePeriodUnits: ["team","drilling","live_wrestling","conditioning","film","individual"],

    injuryTypes: ["Cauliflower Ear","Shoulder","Knee","Neck","Skin Condition","Concussion","Rib","Ankle","Wrist"],

    statsFields: [
      { key:"pins",             label:"Pins",       group:"Match Results" },
      { key:"technical_falls",  label:"TF",         group:"Match Results" },
      { key:"major_decisions",  label:"MD",         group:"Match Results" },
      { key:"decisions",        label:"Dec",        group:"Match Results" },
      { key:"takedowns",        label:"TD",         group:"Points" },
      { key:"escapes",          label:"Esc",        group:"Points" },
    ],

    measurables: [
      { key:"weight",    label:"Weight (lbs)", unit:"lbs" },
      { key:"height",    label:"Height",       unit:"" },
    ],

    analyticsMetrics: ["pins","technical_falls","major_decisions","decisions","takedowns","escapes"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite wrestling coach generating a practice plan.
Focus: ${focus || "General preparation"}
${oppCtx}
Structure: warm-up, drilling (stance/motion, shots, sprawls), live drilling, situational wrestling, conditioning.`,

    aiDepthChartContext: (unit, playerData, _) =>
      `You are a wrestling coach assigning weight classes.
Place wrestlers in optimal weight classes based on current weight and competitive readiness.
Players:\n${playerData}`,

    aiPlaybookContext: (existing) =>
      `You are an elite wrestling coach. Suggest 5 effective move sequences or strategies.
Existing sequences: ${existing || "None yet"}
For each: name, type, steps, best situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite wrestling coach building a dual meet plan.
Opponent: ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"}
Their tendencies: ${opp?.offensive_tendency || "Unknown"}
Key wrestlers: ${opp?.key_players || "Unknown"}
Generate: weight class matchup notes, bonus point opportunities, forfeit/bump strategy.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CROSS COUNTRY
  // ══════════════════════════════════════════════════════════════════════════
  cross_country: {
    sportFamily: "cross_country",
    brand: "NxRace",
    termDepthChart: "Race Lineup",
    termPlaybook: "Race Plan",
    termPlay: "Tactic",
    aiPersona: "elite cross country and distance running coach",

    units: ["offense"],
    unitLabels: { offense:"Team" },

    positions: {
      offense: ["1","2","3","4","5","6","7"],
    },
    positionLabels: {},
    positionDesc: {},

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"assistant_coach", label:"Assistant Coach" },
      { value:"strength_conditioning_coordinator", label:"S&C Coordinator" },
      { value:"trainer", label:"Athletic Trainer" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["race_strategy","pacing","pack_running","hill_tactics","kick_finish","weather_adjustment","mental_prep"],
    playCategoryColors: {
      race_strategy:"bg-blue-500/20 text-blue-400", pacing:"bg-green-500/20 text-green-400",
      pack_running:"bg-orange-500/20 text-orange-400", hill_tactics:"bg-red-500/20 text-red-400",
      kick_finish:"bg-yellow-500/20 text-yellow-400", weather_adjustment:"bg-gray-500/20 text-gray-400",
      mental_prep:"bg-purple-500/20 text-purple-400",
    },

    depthSlots: ["#1","#2","#3","#4"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Race Plan",       color:"text-blue-400" },
      { key:"red_zone_plays",   label:"Pace Strategy",   color:"text-green-400" },
      { key:"third_down_plays", label:"Pack Tactics",    color:"text-orange-400" },
      { key:"two_minute_plays", label:"Kick Finish",     color:"text-yellow-400" },
    ],
    gamePlanKeyTendenciesLabel: "Course Profile & Opponent Strengths",

    practiceFocusPlaceholder: "e.g. Tempo Run, Interval Work, Long Run, Hill Training...",
    practicePeriodUnits: ["team","easy_run","tempo","intervals","hills","long_run","recovery","film"],

    injuryTypes: ["Shin Splints","Stress Fracture","IT Band","Plantar Fasciitis","Ankle Sprain","Knee","Achilles","Hip Flexor","Back"],

    statsFields: [
      { key:"finish_time",    label:"Finish Time", group:"Race" },
      { key:"finish_place",   label:"Place",       group:"Race" },
      { key:"personal_record",label:"PR",          group:"General" },
    ],

    measurables: [
      { key:"height",    label:"Height",          unit:"" },
      { key:"weight",    label:"Weight (lbs)",    unit:"lbs" },
      { key:"vo2_max",   label:"VO2 Max",         unit:"" },
      { key:"mile_pr",   label:"Mile PR",         unit:"" },
      { key:"five_k_pr", label:"5K PR",           unit:"" },
    ],

    analyticsMetrics: ["finish_time","finish_place","personal_record"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite cross country coach generating a training plan.
Focus: ${focus || "General preparation"}
${oppCtx}
Structure: warm-up, main workout (intervals/tempo/long run), cool-down, stretching. Include mileage targets and RPE guidance.`,

    aiDepthChartContext: (unit, playerData, _) =>
      `You are a cross country coach setting a race lineup (positions 1-7).
Rank runners based on recent times, fitness, and course suitability.
Runners:\n${playerData}`,

    aiPlaybookContext: (existing) =>
      `You are an elite cross country coach. Suggest 5 effective race strategies or training tactics.
Existing plans: ${existing || "None yet"}
For each: name, type, description, best situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite cross country coach building a race plan.
Meet: ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"}
Course profile: ${opp?.offensive_tendency || "Unknown"}
Key competitors: ${opp?.key_players || "Unknown"}
Generate: pack strategy, target splits, displacement goals, kick timing.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TRACK & FIELD
  // ══════════════════════════════════════════════════════════════════════════
  track: {
    sportFamily: "track",
    brand: "NxRace",
    termDepthChart: "Event Roster",
    termPlaybook: "Event Guide",
    termPlay: "Strategy",
    aiPersona: "elite track & field coach",

    units: ["offense"],
    unitLabels: { offense:"Events" },

    positions: {
      offense: ["SP_TRACK","MR","LH","TH","JMP","RELAY","MULTI"],
    },
    positionLabels: { SP_TRACK:"Sprinter", MR:"Distance", LH:"Hurdles", TH:"Throws", JMP:"Jumps", RELAY:"Relay", MULTI:"Multi-Event" },
    positionDesc: { SP_TRACK:"Sprinter", MR:"Distance Runner", LH:"Hurdler", TH:"Thrower", JMP:"Jumper", RELAY:"Relay Runner", MULTI:"Multi-Event Athlete" },

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"sprints_coach", label:"Sprints Coach" },
      { value:"distance_coach", label:"Distance Coach" },
      { value:"jumps_coach", label:"Jumps Coach" },
      { value:"throws_coach", label:"Throws Coach" },
      { value:"strength_conditioning_coordinator", label:"S&C Coordinator" },
      { value:"trainer", label:"Athletic Trainer" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["race_strategy","relay_exchange","field_event_approach","block_start","pacing","taper","mental_prep"],
    playCategoryColors: {
      race_strategy:"bg-blue-500/20 text-blue-400", relay_exchange:"bg-orange-500/20 text-orange-400",
      field_event_approach:"bg-green-500/20 text-green-400", block_start:"bg-red-500/20 text-red-400",
      pacing:"bg-yellow-500/20 text-yellow-400", taper:"bg-teal-500/20 text-teal-400",
      mental_prep:"bg-purple-500/20 text-purple-400",
    },

    depthSlots: ["Primary","Backup","Alternate"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Event Strategy",  color:"text-blue-400" },
      { key:"red_zone_plays",   label:"Relay Order",     color:"text-orange-400" },
      { key:"third_down_plays", label:"Field Events",    color:"text-green-400" },
      { key:"two_minute_plays", label:"Finals Plan",     color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Meet Conditions & Competition Level",

    practiceFocusPlaceholder: "e.g. Block Starts, Relay Exchanges, Long Jump Approach, 400m Conditioning...",
    practicePeriodUnits: ["team","sprints","distance","hurdles","jumps","throws","relay","conditioning","film"],

    injuryTypes: ["Hamstring","Shin Splints","Stress Fracture","Ankle Sprain","Knee","Achilles","IT Band","Hip Flexor","Back"],

    statsFields: [
      { key:"finish_time",    label:"Time",         group:"Running" },
      { key:"finish_place",   label:"Place",        group:"General" },
      { key:"distance_thrown",label:"Distance",     group:"Field" },
      { key:"height_cleared", label:"Height",       group:"Field" },
      { key:"personal_record",label:"PR",           group:"General" },
      { key:"event_name",     label:"Event",        group:"General" },
    ],

    measurables: [
      { key:"height",       label:"Height",            unit:"" },
      { key:"weight",       label:"Weight (lbs)",      unit:"lbs" },
      { key:"forty_time",   label:"40-Yard Dash (s)",  unit:"s" },
      { key:"vertical_jump",label:"Vertical Jump",     unit:"in" },
    ],

    analyticsMetrics: ["finish_time","finish_place","personal_record","distance_thrown","height_cleared"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite track & field coach generating a training plan.
Focus: ${focus || "General preparation"}
${oppCtx}
Structure by event groups: sprints, distance, hurdles, jumps, throws. Include volume, intensity, and technical cues.`,

    aiDepthChartContext: (unit, playerData, _) =>
      `You are a track & field coach assigning athletes to events.
Optimize event assignments based on athlete strengths, personal records, and meet scoring strategy.
Athletes:\n${playerData}`,

    aiPlaybookContext: (existing) =>
      `You are an elite track & field coach. Suggest 5 effective event strategies or relay plans.
Existing plans: ${existing || "None yet"}
For each: name, event type, description, competitive situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite track & field coach building a meet strategy.
Meet: ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"}
Conditions: ${opp?.offensive_tendency || "Unknown"}
Generate: event entry priorities, relay lineups, scoring projection, double/triple event scheduling.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LACROSSE
  // ══════════════════════════════════════════════════════════════════════════
  lacrosse: {
    sportFamily: "lacrosse",
    brand: "NxCage",
    termDepthChart: "Depth Chart",
    termPlaybook: "Playbook",
    termPlay: "Play",
    aiPersona: "elite lacrosse coach",

    units: ["offense","defense"],
    unitLabels: { offense:"Offense", defense:"Defense" },

    positions: {
      offense: ["A_LAX","MF_LAX","WR_LAX","G_LAX"],
      defense: ["A_LAX","MF_LAX","D","G_LAX"],
    },
    positionLabels: { A_LAX:"ATT", MF_LAX:"MID", WR_LAX:"LSM", D:"DEF", G_LAX:"GK" },
    positionDesc: { A_LAX:"Attack", MF_LAX:"Midfield", WR_LAX:"Long Stick Midfield", D:"Defense", G_LAX:"Goalkeeper" },

    staffRoles: [
      { value:"head_coach", label:"Head Coach" },
      { value:"offensive_coordinator", label:"Offensive Coordinator" },
      { value:"defensive_coordinator", label:"Defensive Coordinator" },
      { value:"goalkeeper_coach", label:"Goalkeeper Coach" },
      { value:"strength_conditioning_coordinator", label:"S&C Coordinator" },
      { value:"trainer", label:"Athletic Trainer" },
      { value:"athletic_director", label:"Athletic Director" },
    ],

    playCategories: ["settled_offense","fast_break","man_up","man_down","clear","ride","set_defense","transition"],
    playCategoryColors: {
      settled_offense:"bg-blue-500/20 text-blue-400", fast_break:"bg-orange-500/20 text-orange-400",
      man_up:"bg-green-500/20 text-green-400", man_down:"bg-red-500/20 text-red-400",
      clear:"bg-teal-500/20 text-teal-400", ride:"bg-yellow-500/20 text-yellow-400",
      set_defense:"bg-purple-500/20 text-purple-400", transition:"bg-gray-500/20 text-gray-400",
    },

    depthSlots: ["1st","2nd","3rd"],

    gamePlanSections: [
      { key:"scripted_plays",   label:"Opening Sets",     color:"text-blue-400" },
      { key:"red_zone_plays",   label:"Crease Attack",    color:"text-orange-400" },
      { key:"third_down_plays", label:"Man-Up Plays",     color:"text-green-400" },
      { key:"two_minute_plays", label:"Final Possession", color:"text-purple-400" },
    ],
    gamePlanKeyTendenciesLabel: "Opponent Defensive Scheme & Ride Tendencies",

    practiceFocusPlaceholder: "e.g. Man-Up Offense, Clearing, Ground Balls, Settled Offense...",
    practicePeriodUnits: ["team","offense","defense","man_up_down","individual","conditioning","film"],

    injuryTypes: ["Concussion","Shoulder","Ankle Sprain","Knee","ACL","Wrist","Back","Hand","Hip"],

    statsFields: [
      { key:"goals_lax",          label:"G",    group:"Offense" },
      { key:"assists_lax",        label:"A",    group:"Offense" },
      { key:"shots_lax",          label:"Shots",group:"Offense" },
      { key:"ground_balls",       label:"GB",   group:"General" },
      { key:"caused_turnovers",   label:"CT",   group:"Defense" },
      { key:"saves_lax",          label:"Saves",group:"GK" },
    ],

    measurables: [
      { key:"height",       label:"Height",            unit:"" },
      { key:"weight",       label:"Weight (lbs)",      unit:"lbs" },
      { key:"forty_time",   label:"40-Yard Dash (s)",  unit:"s" },
      { key:"vertical_jump",label:"Vertical Jump",     unit:"in" },
    ],

    analyticsMetrics: ["goals_lax","assists_lax","shots_lax","ground_balls","caused_turnovers","saves_lax"],

    aiPracticeContext: (focus, oppCtx) =>
      `You are an elite lacrosse head coach generating a practice plan.
Focus: ${focus || "General preparation"}
${oppCtx}
Structure: warm-up, individual skill, unit work (offense/defense), team 6v6, man-up/man-down, conditioning.`,

    aiDepthChartContext: (unit, playerData, posList) =>
      `You are a lacrosse coach building a depth chart for ${unit}.
Consider health, speed, stick skills, and matchup advantages.
Players:\n${playerData}\nPositions: ${posList}`,

    aiPlaybookContext: (existing) =>
      `You are an elite lacrosse coach. Suggest 5 effective offensive or defensive plays.
Existing plays: ${existing || "None yet"}
For each: name, type, player movement description, best situation.`,

    aiGamePlanContext: (opp, players) =>
      `You are an elite lacrosse coach building a game plan.
Opponent: ${opp?.name || "Unknown"} on ${opp?.game_date || "TBD"}
Offensive tendency: ${opp?.offensive_tendency || "Unknown"}
Defensive scheme: ${opp?.defensive_tendency || "Unknown"}
Key players: ${opp?.key_players || "Unknown"}
Generate: defensive scheme, offensive sets, clear strategy, man-up/man-down packages.`,
  },
};

// ─── SPORT FAMILY MAP ────────────────────────────────────────────────────────
const SPORT_FAMILY_MAP = {
  football:           "football",
  girls_flag_football:"football",
  boys_basketball:    "basketball",
  girls_basketball:   "basketball",
  boys_baseball:      "baseball",
  girls_softball:     "baseball",
  boys_soccer:        "soccer",
  girls_soccer:       "soccer",
  girls_volleyball:   "volleyball",
  boys_boxing:        "boxing",
  girls_boxing:       "boxing",
  boys_golf:          "golf",
  girls_golf:         "golf",
  boys_tennis:        "tennis",
  girls_tennis:       "tennis",
  boys_wrestling:     "wrestling",
  girls_wrestling:    "wrestling",
  boys_cross_country: "cross_country",
  girls_cross_country:"cross_country",
  boys_track:         "track",
  girls_track:        "track",
  boys_lacrosse:      "lacrosse",
  girls_lacrosse:     "lacrosse",
};

export function getSportFamily(sport) {
  if (!sport) return "football";
  return SPORT_FAMILY_MAP[sport.toLowerCase()] || "football";
}

export function getSportConfig(sport) {
  return CONFIGS[getSportFamily(sport)] || CONFIGS.football;
}

export function useSportConfig(activeSport) {
  return getSportConfig(activeSport);
}