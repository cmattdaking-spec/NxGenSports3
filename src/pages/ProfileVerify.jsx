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
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [schoolCodeError, setSchoolCodeError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
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

  const lookUpSchoolCode = async () => {
    const code = schoolCode.trim().toUpperCase();
    if (!code) return;
    setLookingUp(true);
    setSchoolCodeError("");
    setSchoolInfo(null);
    try {
      const res = await base44.functions.invoke("joinSchoolByCode", { school_code: code });
      if (res.data?.error) {
        setSchoolCodeError(res.data.error);
      } else if (res.data?.school) {
        setSchoolInfo(res.data.school);
        // Refresh user to pick up updated school fields
        const updated = await base44.auth.me();
        setUser(updated);
        if (updated?.assigned_sports?.length && sports.length === 0) {
          setSports(updated.assigned_sports);
        }
      }
    } catch (e) {
      setSchoolCodeError(e?.message || "Failed to look up school code.");
    } finally {
      setLookingUp(false);
    }
  };

  const toggleSport = (sport) => {
    setSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleConfirm = async () => {
    if (!user) return;
    // Require a school to be connected before confirming
    const hasSchool = user.team_id || user.school_code || schoolInfo;
    if (!hasSchool) {
      setError("Please enter your school code to connect your account to a school.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // If user has assigned_sports from an invite, only allow those; otherwise use self-selected sports
      const invitedSports = user.assigned_sports || [];
      const allowedSports = invitedSports.length > 0
        ? invitedSports.filter((s) => sports.includes(s))
        : sports;

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
  const resolvedSchoolName = schoolInfo?.school_name || user.school_name;
  const hasSchool = !!(user.team_id || user.school_code || schoolInfo);

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

            {/* School section: show assigned school or code entry */}
            {hasSchool ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">School</label>
                  <div className="text-sm text-gray-300 bg-[#181818] border border-gray-700 rounded-xl px-3 py-2">
                    {resolvedSchoolName || "Assigned by your Athletic Director"}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">School Code</label>
                  <div className="text-sm text-gray-300 bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 font-mono">
                    {schoolInfo?.school_code || user.school_code || user.team_id || "—"}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  School Code <span className="text-red-400">*</span>
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Enter the school code provided by your Athletic Director to connect your account.
                </p>
                <div className="flex gap-2">
                  <input
                    value={schoolCode}
                    onChange={(e) => { setSchoolCode(e.target.value.toUpperCase()); setSchoolCodeError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && lookUpSchoolCode()}
                    placeholder="e.g. XABCD1"
                    maxLength={8}
                    className="flex-1 bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={lookUpSchoolCode}
                    disabled={lookingUp || !schoolCode.trim()}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)" }}
                  >
                    {lookingUp ? "..." : "Join"}
                  </button>
                </div>
                {schoolCodeError && (
                  <p className="text-xs text-red-400 mt-1.5">{schoolCodeError}</p>
                )}
              </div>
            )}

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
            disabled={saving || !fullName || !hasSchool}
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
