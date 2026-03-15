import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const SPORT_LABELS = {
  football: "Football",
  boys_football: "Boys Football",
  girls_football: "Girls Football",
  girls_flag_football: "Girls Flag Football",
  boys_basketball: "Boys Basketball",
  girls_basketball: "Girls Basketball",
  boys_baseball: "Boys Baseball",
  girls_softball: "Girls Softball",
  boys_soccer: "Boys Soccer",
  girls_soccer: "Girls Soccer",
  girls_volleyball: "Girls Volleyball",
  boys_boxing: "Boys Boxing",
  girls_boxing: "Girls Boxing",
  boys_golf: "Boys Golf",
  girls_golf: "Girls Golf",
  boys_tennis: "Boys Tennis",
  girls_tennis: "Girls Tennis",
  boys_wrestling: "Boys Wrestling",
  girls_wrestling: "Girls Wrestling",
  boys_cross_country: "Boys Cross Country",
  girls_cross_country: "Girls Cross Country",
  boys_track: "Boys Track & Field",
  girls_track: "Girls Track & Field",
  boys_lacrosse: "Boys Lacrosse",
  girls_lacrosse: "Girls Lacrosse",
};

export default function ProfileVerify() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [sports, setSports] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => {
        setUser(u);
        setFullName(u?.full_name || u?.first_name || "");
        setPosition(u?.position || "");
        setSports(u?.assigned_sports || []);
      })
      .catch(() => setError("Unable to load your profile."))
      .finally(() => setLoading(false));
  }, []);

  const toggleSport = (sport) => {
    setSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleConfirm = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const allowedSports = (user.assigned_sports || []).filter((s) =>
        sports.includes(s)
      );

      await base44.auth.updateMe({
        full_name: fullName || user.full_name,
        position: position || undefined,
        assigned_sports: allowedSports,
        profile_verified: true,
      });

      navigate(createPageUrl("Dashboard"), { replace: true });
    } catch (e) {
      setError(e?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-[var(--color-primary,#00F2FF)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <p className="text-gray-400 text-sm">Unable to load user.</p>
      </div>
    );
  }

  const assignedSports = user.assigned_sports || [];

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#121212" }}>
      <div className="w-full max-w-lg rounded-3xl p-8 border bg-[#111111] border-gray-800 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "conic-gradient(from 140deg, #00F2FF, #1A4BBD, #00F2FF)" }} />

        <div className="relative space-y-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Confirm your profile
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              We use this to connect you to the correct school, sport, and staff.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">School</label>
                <div className="text-sm text-gray-300 bg-[#181818] border border-gray-700 rounded-xl px-3 py-2">
                  {user.school_name || "Assigned by your Athletic Director"}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Team ID</label>
                <div className="text-sm text-gray-300 bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 font-mono">
                  {user.team_id || "—"}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Primary Position (optional)</label>
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. QB, WR, Midfielder"
                className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            {assignedSports.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 mb-2 block">
                  Sport(s) you play / coach
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  These were assigned by your Athletic Director. You can deselect sports that do not apply.
                </p>
                <div className="flex flex-wrap gap-2">
                    {assignedSports.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSport(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        sports.includes(s)
                          ? "bg-[var(--color-primary,#00F2FF)] text-black border-transparent"
                          : "bg-[#181818] text-gray-400 border-gray-700"
                      }`}
                    >
                      {SPORT_LABELS[s] || s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={saving || !fullName}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)", color: "#121212" }}
          >
            {saving ? "Saving..." : "Confirm & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
