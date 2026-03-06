import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertCircle, Brain, FileText, Plus } from "lucide-react";

const HEALTH_EDIT_ROLES = ["admin", "head_coach", "trainer"];

export default function MedicalTab({ players }) {
  const [docs, setDocs] = useState([]);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.PlayerDocument.list().then(setDocs);
  }, []);

  const canEdit = user && HEALTH_EDIT_ROLES.includes(user.role);
  const getDoc = (playerId) => docs.find(d => d.player_id === playerId);

  const toggleField = async (player, field, value) => {
    if (!canEdit) return;
    const existing = getDoc(player.id);
    setSaving(prev => ({ ...prev, [`${player.id}_${field}`]: true }));
    const data = {
      player_id: player.id,
      player_name: `${player.first_name} ${player.last_name}`,
      [field]: value,
      ...(field === "concussion_test_date" ? {} : {}),
    };
    if (existing) {
      const updated = await base44.entities.PlayerDocument.update(existing.id, data);
      setDocs(prev => prev.map(d => d.id === existing.id ? { ...d, ...data } : d));
    } else {
      const created = await base44.entities.PlayerDocument.create(data);
      setDocs(prev => [...prev, created]);
    }
    setSaving(prev => ({ ...prev, [`${player.id}_${field}`]: false }));
  };

  const concussionActive = docs.filter(d => d.concussion_protocol_active).length;
  const baselineDone = docs.filter(d => d.concussion_baseline_done).length;
  const medFormsComplete = docs.filter(d => d.medical_forms_complete).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#141414] border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-red-400">{concussionActive}</p>
          <p className="text-gray-500 text-xs mt-0.5">In Concussion Protocol</p>
        </div>
        <div className="bg-[#141414] border border-blue-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-blue-400">{baselineDone}</p>
          <p className="text-gray-500 text-xs mt-0.5">Baseline Tests Done</p>
        </div>
        <div className="bg-[#141414] border border-green-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-green-400">{medFormsComplete}</p>
          <p className="text-gray-500 text-xs mt-0.5">Medical Forms Complete</p>
        </div>
      </div>

      {!canEdit && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
          View only — only Head Coach or Trainer can update medical records.
        </div>
      )}

      {/* Player Medical Table */}
      <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <Brain className="w-4 h-4 text-red-400" />
          <span className="text-white font-semibold text-sm">Concussion & Medical Records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Player</th>
                <th className="text-center text-gray-500 text-xs font-medium px-4 py-3">Baseline Test</th>
                <th className="text-center text-gray-500 text-xs font-medium px-4 py-3">Protocol Active</th>
                <th className="text-center text-gray-500 text-xs font-medium px-4 py-3">Medical Forms</th>
                <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Concussion Notes</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => {
                const doc = getDoc(p.id);
                const baselineDone = doc?.concussion_baseline_done || false;
                const protocolActive = doc?.concussion_protocol_active || false;
                const medComplete = doc?.medical_forms_complete || false;

                return (
                  <tr key={p.id} className={`border-b border-gray-800/50 hover:bg-white/2 transition-colors ${protocolActive ? "bg-red-500/5" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {protocolActive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                        <div>
                          <p className="text-white text-sm font-medium">{p.first_name} {p.last_name}</p>
                          <p className="text-gray-500 text-xs">{p.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canEdit ? (
                        <button onClick={() => toggleField(p, "concussion_baseline_done", !baselineDone)}
                          disabled={saving[`${p.id}_concussion_baseline_done`]}
                          className={`relative w-11 h-6 rounded-full transition-all duration-300 ${baselineDone ? "bg-green-500" : "bg-gray-700"} disabled:opacity-50`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${baselineDone ? "left-5" : "left-0.5"}`} />
                        </button>
                      ) : (
                        baselineDone
                          ? <span className="text-green-400 text-xs">✓ Done</span>
                          : <span className="text-gray-500 text-xs">— Not done</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canEdit ? (
                        <button onClick={() => toggleField(p, "concussion_protocol_active", !protocolActive)}
                          disabled={saving[`${p.id}_concussion_protocol_active`]}
                          className={`relative w-11 h-6 rounded-full transition-all duration-300 ${protocolActive ? "bg-red-500" : "bg-gray-700"} disabled:opacity-50`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${protocolActive ? "left-5" : "left-0.5"}`} />
                        </button>
                      ) : (
                        protocolActive
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs"><AlertCircle className="w-3 h-3" /> Active</span>
                          : <span className="text-gray-500 text-xs">Clear</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canEdit ? (
                        <button onClick={() => toggleField(p, "medical_forms_complete", !medComplete)}
                          disabled={saving[`${p.id}_medical_forms_complete`]}
                          className={`relative w-11 h-6 rounded-full transition-all duration-300 ${medComplete ? "bg-green-500" : "bg-gray-700"} disabled:opacity-50`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${medComplete ? "left-5" : "left-0.5"}`} />
                        </button>
                      ) : (
                        medComplete
                          ? <span className="text-green-400 text-xs">✓ Complete</span>
                          : <span className="text-gray-500 text-xs">Incomplete</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc?.concussion_notes
                        ? <p className="text-gray-400 text-xs">{doc.concussion_notes}</p>
                        : <span className="text-gray-600 text-xs">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}