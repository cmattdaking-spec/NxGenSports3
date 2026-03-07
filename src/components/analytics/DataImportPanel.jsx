import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Link2, FileText, Loader2, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

const SOURCES = [
  { id: "hudl", label: "Hudl", color: "#e8401b", desc: "Paste Hudl Assist export CSV or URL" },
  { id: "odk", label: "ODK / XPS", color: "#1b6fe8", desc: "Import ODK play-by-play CSV export" },
  { id: "maxpreps", label: "MaxPreps", color: "#d4080a", desc: "MaxPreps game stats export" },
  { id: "catapult", label: "Catapult GPS", color: "#00c48c", desc: "Catapult/GPS biometric CSV" },
  { id: "sportscode", label: "Sportscode", color: "#7c3aed", desc: "Sportscode XML or CSV export" },
  { id: "csv_upload", label: "Generic CSV", color: "#6b7280", desc: "Any CSV with headers" },
];

const IMPORT_TYPES = [
  { id: "game_film", label: "Game Film Tags" },
  { id: "play_by_play", label: "Play-by-Play" },
  { id: "player_stats", label: "Player Stats" },
  { id: "biometric", label: "Biometric / GPS" },
  { id: "opponent_scout", label: "Opponent Scout Data" },
];

export default function DataImportPanel({ onImported }) {
  const [source, setSource] = useState("hudl");
  const [importType, setImportType] = useState("play_by_play");
  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // {type: 'success'|'error', msg}

  const selectedSource = SOURCES.find(s => s.id === source);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setRawText(ev.target.result);
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!title || !rawText) return;
    setLoading(true);
    setStatus(null);
    // AI parse + analyze the raw data
    const aiRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a sports data analyst. Parse and analyze this ${selectedSource.label} ${importType.replace(/_/g, " ")} export data for a football team.\n\nGame: ${opponent ? `vs ${opponent}` : "unknown opponent"} ${gameDate || ""}\n\nRaw Data:\n${rawText.slice(0, 8000)}\n\nProvide:\n1. DATA SUMMARY — what was imported (play count, player count, etc.)\n2. KEY PERFORMANCE INDICATORS — top metrics extracted\n3. NOTABLE TRENDS — patterns in the data\n4. COACHING INSIGHTS — 3-5 actionable takeaways based on the data\n5. FLAGS — any data quality issues or standout outliers\n\nBe specific and data-driven. Reference actual values from the data.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          record_count: { type: "number" },
          kpis: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" }, trend: { type: "string" } } } },
          trends: { type: "array", items: { type: "string" } },
          coaching_insights: { type: "array", items: { type: "string" } },
          flags: { type: "array", items: { type: "string" } }
        }
      }
    });

    const record = await base44.entities.PerformanceImport.create({
      source,
      import_type: importType,
      title,
      opponent,
      game_date: gameDate,
      raw_data: rawText.slice(0, 50000),
      ai_analysis: JSON.stringify(aiRes),
      record_count: aiRes.record_count || 0,
      processed: true,
    });

    setLoading(false);
    setStatus({ type: "success", msg: `Imported ${aiRes.record_count || "?"} records from ${selectedSource.label}` });
    setTitle(""); setOpponent(""); setGameDate(""); setRawText(""); setFile(null);
    onImported?.(record, aiRes);
  };

  return (
    <div className="space-y-5">
      {/* Source selector */}
      <div>
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Data Source</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SOURCES.map(s => (
            <button key={s.id} onClick={() => setSource(s.id)}
              className={`p-3 rounded-xl border text-left transition-all ${source === s.id ? "border-opacity-100" : "border-gray-800 bg-[#141414] hover:border-gray-600"}`}
              style={source === s.id ? { borderColor: s.color, backgroundColor: s.color + "18" } : {}}>
              <p className="text-white text-xs font-bold" style={source === s.id ? { color: s.color } : {}}>{s.label}</p>
              <p className="text-gray-600 text-xs mt-0.5 leading-tight">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Import type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">Import Type</label>
          <select value={importType} onChange={e => setImportType(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm">
            {IMPORT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">Session Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder={`${selectedSource.label} Import – Week 5`}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">Opponent</label>
          <input value={opponent} onChange={e => setOpponent(e.target.value)}
            placeholder="e.g. Riverside High"
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">Game Date</label>
          <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm" />
        </div>
      </div>

      {/* CSV Upload or paste */}
      <div>
        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
          Upload CSV / Paste Data *
        </label>
        <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-700 bg-[#141414] text-gray-400 text-sm cursor-pointer hover:border-gray-500 hover:text-gray-300 transition-all mb-2">
          <Upload className="w-4 h-4 flex-shrink-0" />
          {file ? <span className="text-green-400">{file.name}</span> : <span>Click to upload CSV file</span>}
          <input type="file" accept=".csv,.txt,.xml" className="hidden" onChange={handleFileChange} />
        </label>
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          rows={5}
          placeholder={`Paste raw CSV/data from ${selectedSource.label} here, or upload a file above...`}
          className="w-full bg-[#141414] border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-xs font-mono resize-none"
        />
      </div>

      {status && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${status.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {status.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {status.msg}
        </div>
      )}

      <button onClick={handleImport} disabled={loading || !title || !rawText}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
        style={{ backgroundColor: "var(--color-primary,#f97316)" }}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing & Analyzing...</> : <><FileText className="w-4 h-4" /> Import & AI Analyze</>}
      </button>
    </div>
  );
}