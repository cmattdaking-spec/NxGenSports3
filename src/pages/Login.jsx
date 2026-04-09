import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

const NXGEN_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/29e077944_generated_image.png";

const LEGAL_UPDATED = "March 14, 2026";

function LegalDisclosure() {
  return (
    <div className="space-y-2">
      <details className="rounded-xl border border-gray-800 bg-[#151515] px-3 py-2">
        <summary className="cursor-pointer list-none text-xs font-semibold text-[#E8E8E8]">
          Terms &amp; Conditions
        </summary>
        <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-[#9CA3AF]">
          <p>Last updated: {LEGAL_UPDATED}</p>
          <p>NxGenSports provides school-managed access to team operations, athlete development, communication, scheduling, and performance data.</p>
          <p>You are responsible for keeping your login credentials secure and using the platform lawfully. You may not access records outside your assigned school, sport, team, or role.</p>
        </div>
      </details>
      <details className="rounded-xl border border-gray-800 bg-[#151515] px-3 py-2">
        <summary className="cursor-pointer list-none text-xs font-semibold text-[#E8E8E8]">
          Privacy Policy
        </summary>
        <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-[#9CA3AF]">
          <p>Last updated: {LEGAL_UPDATED}</p>
          <p>NxGenSports collects account details, school and team affiliation data, and usage data to deliver the platform. Data is shared with program administrators based on your assigned role. NxGenSports does not sell personal information.</p>
        </div>
      </details>
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFAToken, setTwoFAToken] = useState(null);
  const [twoFACode, setTwoFACode] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    setError("");
    try {
      const data = await base44.auth.login(email, password);
      if (data.requires_2fa) {
        setTwoFAToken(data.temp_token);
      } else {
        onSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    if (!twoFACode || twoFACode.length < 6) { setError("Enter a 6-digit code."); return; }
    setLoading(true);
    setError("");
    try {
      const data = await base44.auth.verify2FA(twoFAToken, twoFACode);
      onSuccess(data.user);
    } catch (err) {
      setError(err.message || "Invalid 2FA code.");
    } finally {
      setLoading(false);
    }
  };

  if (twoFAToken) {
    return (
      <form onSubmit={handle2FAVerify} className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#E8E8E8]">Two-Factor Authentication</p>
          <p className="text-xs text-[#9CA3AF]">Enter the 6-digit code from your authenticator app, or use a backup code.</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Verification Code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={twoFACode}
            onChange={e => { setTwoFACode(e.target.value.replace(/\s/g, "")); setError(""); }}
            placeholder="000000"
            className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white text-center tracking-[0.3em] font-mono outline-none focus:border-[#00F2FF] transition-colors"
            data-testid="2fa-code-input"
            autoFocus
            required
          />
        </div>
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2" data-testid="2fa-error">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          data-testid="2fa-verify-button"
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)", color: "#121212" }}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
        <button type="button" onClick={() => { setTwoFAToken(null); setTwoFACode(""); setError(""); }}
          className="w-full text-xs text-gray-400 hover:text-[#00F2FF] transition-colors">
          Back to login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          placeholder="coach@school.edu"
          className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
          data-testid="login-email-input"
          required
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-400">Password</label>
          <button type="button" onClick={onForgotPassword} className="text-xs text-[#00F2FF] hover:underline" data-testid="forgot-password-link">
            Forgot password?
          </button>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(""); }}
          placeholder="••••••••"
          className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
          data-testid="login-password-input"
          required
        />
      </div>
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2" data-testid="login-error">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        data-testid="login-submit-button"
        className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)", color: "#121212" }}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

// ─── Forgot Password Form ─────────────────────────────────────────────────────
function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMsg({ text: "", type: "" });
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMsg({ text: "If that email exists, a reset link has been sent. Check your inbox.", type: "success" });
    } catch {
      setMsg({ text: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs text-[#00F2FF] hover:underline">
        ← Back to sign in
      </button>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#E8E8E8]">Forgot your password?</p>
        <p className="text-xs text-[#9CA3AF]">Enter your email and we'll send you a reset link.</p>
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="coach@school.edu"
          className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
          data-testid="forgot-email-input"
          required
        />
      </div>
      {msg.text && (
        <div className={`text-xs rounded-xl px-3 py-2 ${msg.type === "success" ? "text-green-400 bg-green-500/10 border border-green-500/30" : "text-red-400 bg-red-500/10 border border-red-500/30"}`}>
          {msg.text}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !email}
        data-testid="forgot-submit-button"
        className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)", color: "#121212" }}
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}


function InviteAcceptForm({ inviteToken, onSuccess }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.auth.getInvite(inviteToken)
      .then(inv => { setInvite(inv); setLoading(false); })
      .catch(err => { setError(err.message || "Invalid or expired invite link."); setLoading(false); });
  }, [inviteToken]);

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!password || password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    setError("");
    try {
      const data = await base44.auth.acceptInvite(inviteToken, password, invite?.poc_name || "");
      onSuccess(data.user);
    } catch (err) {
      setError(err.message || "Failed to accept invite.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-gray-600 border-t-[#00F2FF] rounded-full animate-spin" />
    </div>
  );

  if (error && !invite) return (
    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
      {error}
    </div>
  );

  return (
    <form onSubmit={handleAccept} className="space-y-4">
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-3 text-xs text-gray-400 space-y-1">
        <p><span className="text-white font-semibold">{invite?.poc_name || `${invite?.first_name || ""} ${invite?.last_name || ""}`.trim()}</span></p>
        <p>{invite?.email}</p>
        {invite?.school_name && <p>{invite.school_name}</p>}
        {invite?.coaching_role && (
          <p className="capitalize">{invite.coaching_role.replace(/_/g, " ")}</p>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Create Password</label>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(""); }}
          placeholder="Min. 8 characters"
          className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
          data-testid="invite-password-input"
          required
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
          placeholder="Re-enter password"
          className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
          data-testid="invite-confirm-password-input"
          required
        />
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        data-testid="invite-accept-button"
        className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)", color: "#121212" }}
      >
        {submitting ? "Setting up account..." : "Accept Invite & Continue"}
      </button>
    </form>
  );
}

// ─── Parent Signup Form ───────────────────────────────────────────────────────
const SPORT_OPTIONS = [
  { id: "football", label: "Football" },
  { id: "basketball", label: "Basketball" },
  { id: "baseball", label: "Baseball" },
  { id: "soccer", label: "Soccer" },
  { id: "volleyball", label: "Volleyball" },
  { id: "tennis", label: "Tennis" },
  { id: "track", label: "Track & Field" },
  { id: "wrestling", label: "Wrestling" },
];

function ParentSignupForm({ onBack }) {
  const [formData, setFormData] = useState({ firstName: "", lastName: "", school: "", position: "", sports: [] });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("listAllSchools")
      .then(res => { setSchools(res.data?.schools || []); setSchoolsLoading(false); })
      .catch(() => { setSchools([]); setSchoolsLoading(false); });
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSportToggle = sportId => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.includes(sportId) ? prev.sports.filter(id => id !== sportId) : [...prev.sports, sportId]
    }));
  };

  const handleSignUp = async e => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.school) {
      setError("Please fill in all required fields."); return;
    }
    if (formData.sports.length === 0) {
      setError("Please select at least one sport."); return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await base44.functions.invoke("createParentUser", {
        first_name: formData.firstName, last_name: formData.lastName,
        school_id: formData.school, assigned_sports: formData.sports, position: formData.position,
      });
      if (response.data?.success) {
        setSuccess("Parent account created! Awaiting approval before you can access athlete information.");
        setFormData({ firstName: "", lastName: "", school: "", position: "", sports: [] });
      } else throw new Error(response.data?.error || "Failed to create account");
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs text-[#00F2FF] hover:underline">
        ← Back to login
      </button>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#E8E8E8]">Create your parent account</p>
        <p className="text-xs text-[#9CA3AF]">Join NxGenSports to follow your athlete's progress.</p>
      </div>

      {success && (
        <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">{success}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">First Name</label>
          <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange}
            className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF]" required />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Last Name</label>
          <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange}
            className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF]" required />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">School</label>
        {schoolsLoading ? (
          <div className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-400">Loading schools...</div>
        ) : (
          <select name="school" value={formData.school} onChange={handleInputChange}
            className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF]" required>
            <option value="">Select your school</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.school_name}</option>)}
          </select>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Relationship to Athlete</label>
        <select name="position" value={formData.position} onChange={handleInputChange}
          className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF]" required>
          <option value="">Select relationship</option>
          <option value="parent">Parent</option>
          <option value="guardian">Guardian</option>
          <option value="family">Family Member</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Sports to Follow</label>
        <div className="flex flex-wrap gap-2">
          {SPORT_OPTIONS.map(sport => (
            <button key={sport.id} type="button" onClick={() => handleSportToggle(sport.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${formData.sports.includes(sport.id) ? "bg-[#00F2FF] text-black border-transparent" : "bg-[#181818] text-gray-400 border-gray-700 hover:border-gray-600"}`}>
              {sport.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</div>
      )}

      <button type="submit" disabled={submitting}
        className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)", color: "#121212" }}>
        {submitting ? "Processing..." : "Continue to secure login"}
      </button>
    </form>
  );
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [inviteToken, setInviteToken] = useState(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-primary", "#00F2FF");
    document.documentElement.style.setProperty("--color-secondary", "#E8E8E8");

    // Check for invite token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite_token");
    if (token) setInviteToken(token);
  }, []);

  const handleSuccess = (user) => {
    if (setUser) setUser(user);
    if (user?.profile_verified === false) {
      navigate(createPageUrl("ProfileVerify"), { replace: true });
    } else {
      navigate(createPageUrl("Dashboard"), { replace: true });
    }
    window.location.reload();
  };

  const isInviteMode = !!inviteToken;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#121212" }}>
      <div className="w-full max-w-md rounded-3xl p-8 border relative overflow-hidden"
        style={{
          borderColor: "rgba(232,232,232,0.08)",
          background: "radial-gradient(circle at top, rgba(0,242,255,0.12), transparent 55%) #121212"
        }}>
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "conic-gradient(from 140deg, #00F2FF, #1A4BBD, #00F2FF)" }} />

        <div className="relative space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-md opacity-50" style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)" }} />
              <img src={NXGEN_LOGO} alt="NxGenSports" className="relative w-14 h-14 rounded-2xl object-cover border border-[rgba(232,232,232,0.18)]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: "#E8E8E8" }}>
                Nx<span style={{ color: "#00F2FF" }}>GenSports</span>
              </h1>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>NxGeneration Multi-Sports Systems</p>
            </div>
          </div>

          {/* Content */}
          {isInviteMode ? (
            <>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#E8E8E8]">You've been invited</p>
                <p className="text-xs text-[#9CA3AF]">Set your password to activate your account.</p>
              </div>
              <InviteAcceptForm inviteToken={inviteToken} onSuccess={handleSuccess} />
            </>
          ) : mode === "signup" ? (
            <ParentSignupForm onBack={() => setMode("login")} />
          ) : mode === "forgot" ? (
            <ForgotPasswordForm onBack={() => setMode("login")} />
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#E8E8E8]">Sign in to your program</p>
                <p className="text-xs text-[#9CA3AF]">Secure access for Athletic Directors, coaches, staff, and athletes.</p>
              </div>
              <LoginForm onSuccess={handleSuccess} onForgotPassword={() => setMode("forgot")} />
              <div className="text-center">
                <button onClick={() => setMode("signup")} className="text-xs text-[#00F2FF] hover:underline" data-testid="signup-link">
                  New to NxGenSports? Sign up here
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ backgroundColor: "#1F2933" }} />
            <span className="text-[10px]" style={{ color: "#6B7280" }}>NxGenSports Single Sign-On</span>
            <div className="h-px flex-1" style={{ backgroundColor: "#1F2933" }} />
          </div>
          <div className="flex flex-col gap-1.5 text-[10px]" style={{ color: "#6B7280" }}>
            <p>For access issues, contact your Athletic Director or NxGenSports support.</p>
            <p>By continuing, you agree to the NxGenSports Terms &amp; Conditions and Privacy Policy below.</p>
          </div>
          <LegalDisclosure />
        </div>
      </div>
    </div>
  );
}
