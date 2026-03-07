import { ChevronDown, ChevronUp, Edit, Trash2, ExternalLink, Brain, Zap } from "lucide-react";

export default function OpponentCard({ opponent, expanded, onToggleExpand, onEdit, onDelete, onAIReport, onDeepAnalysis, aiLoading, aiTarget, deepAnalysisLoading, deepAnalysisTarget }) {
  const locationBadge = { home: "bg-green-500/20 text-green-400", away: "bg-red-500/20 text-red-400", neutral: "bg-yellow-500/20 text-yellow-400" };
  
  return (
    <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-white font-bold">{opponent.name}</h3>
            {opponent.record && <span className="text-gray-500 text-sm">({opponent.record})</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full ${locationBadge[opponent.location]}`}>{opponent.location}</span>
          </div>
          <div className="flex gap-3 text-xs text-gray-500 flex-wrap"><span>{opponent.game_date}</span>{opponent.conference && <span>· {opponent.conference}</span>}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {opponent.hudl_link && <a href={opponent.hudl_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-1.5 rounded-lg text-xs hover:bg-blue-500/20"><ExternalLink className="w-3.5 h-3.5" /> Hudl</a>}
          <button onClick={() => onDeepAnalysis(opponent)} disabled={deepAnalysisLoading && deepAnalysisTarget === opponent.id}
            className="flex items-center gap-1 bg-teal-500/10 border border-teal-500/30 text-teal-400 px-2 py-1.5 rounded-lg text-xs hover:bg-teal-500/20">
            <Brain className={`w-3.5 h-3.5 ${deepAnalysisLoading && deepAnalysisTarget === opponent.id ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{deepAnalysisLoading && deepAnalysisTarget === opponent.id ? "Analyzing..." : "Nx Analysis"}</span>
          </button>
          <button onClick={() => onAIReport(opponent)} disabled={aiLoading && aiTarget === opponent.id}
            className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2 py-1.5 rounded-lg text-xs hover:bg-orange-500/20">
            <Zap className={`w-3.5 h-3.5 ${aiLoading && aiTarget === opponent.id ? "animate-pulse" : ""}`} />
            <span className="hidden md:inline">{aiLoading && aiTarget === opponent.id ? "Scouting..." : "Nx Scout"}</span>
          </button>
          <button onClick={() => onEdit(opponent)} className="text-gray-500 hover:text-orange-500 p-1.5"><Edit className="w-4 h-4" /></button>
          <button onClick={() => onDelete(opponent.id)} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
          <button onClick={() => onToggleExpand(opponent.id)} className="text-gray-500 hover:text-white p-1.5">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-3">
          {[{ label: "Offensive Tendency", val: opponent.offensive_tendency }, { label: "Defensive Tendency", val: opponent.defensive_tendency }, { label: "Key Players", val: opponent.key_players }, { label: "Strengths", val: opponent.strengths }, { label: "Weaknesses", val: opponent.weaknesses }, { label: "Notes", val: opponent.notes }].filter(i => i.val).map(({ label, val }) => (
            <div key={label}><p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</p><p className="text-gray-300 text-sm">{val}</p></div>
          ))}
          {opponent.ai_scout_report && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2"><Zap className="w-3.5 h-3.5 text-orange-500" /><span className="text-orange-400 text-xs font-medium">Nx Scout Report</span></div>
              <p className="text-gray-300 text-sm whitespace-pre-line">{opponent.ai_scout_report}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}