import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Clock, X } from "lucide-react";

const ROLE_LABELS = {
  head_coach: "Head Coach", associate_head_coach: "Associate Head Coach",
  offensive_coordinator: "Offensive Coordinator", defensive_coordinator: "Defensive Coordinator",
  special_teams_coordinator: "Special Teams Coordinator",
  strength_conditioning_coordinator: "S&C Coordinator",
  position_coach: "Position Coach", trainer: "Trainer", player: "Player",
  athletic_director: "Athletic Director",
};

const SPORT_LABELS = {
  football:"Football", basketball:"Basketball", baseball:"Baseball", softball:"Softball",
  soccer:"Soccer", volleyball:"Volleyball", boxing:"Boxing", golf:"Golf",
  tennis:"Tennis", wrestling:"Wrestling", cross_country:"Cross Country", track:"Track", lacrosse:"Lacrosse"
};

export default function PendingInvites({ teamId, onRevoked }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    if (!teamId) { setLoading(false); return; }
    base44.entities.Invite.filter({ team_id: teamId, status: "pending" }, "-created_date")
      .then(list => { setInvites(list); setLoading(false); })
      .catch(() => setLoading(false));
  }, [teamId]);

  const revoke = async (invite) => {
    if (!window.confirm(`Revoke invitation for ${invite.email}?`)) return;
    setRevoking(invite.id);
    await base44.entities.Invite.update(invite.id, { status: "expired" });
    setInvites(prev => prev.filter(i => i.id !== invite.id));
    setRevoking(null);
    onRevoked?.();
  };

  if (loading) return null;
  if (invites.length === 0) return null;

  return (
    <div className="bg-[#141414] border border-yellow-500/20 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
        <Clock className="w-4 h-4 text-yellow-400" />
        <p className="text-yellow-400 text-sm font-semibold">Pending Invitations ({invites.length})</p>
        <p className="text-gray-500 text-xs ml-1">— awaiting sign-up</p>
      </div>
      <div className="divide-y divide-gray-800">
        {invites.map(invite => (
          <div key={invite.id} className="flex items-center gap-4 px-5 py-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Mail className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white text-sm font-medium">{invite.poc_name || invite.email}</p>
                <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                  Pending
                </span>
                {invite.coaching_role && (
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                    {ROLE_LABELS[invite.coaching_role] || invite.coaching_role}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{invite.email}</p>
              {invite.assigned_sports?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {invite.assigned_sports.map(s => (
                    <span key={s} className="text-xs bg-purple-500/15 text-purple-400 px-1.5 rounded capitalize">
                      {SPORT_LABELS[s] || s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => revoke(invite)} disabled={revoking === invite.id}
              title="Revoke invite"
              className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}