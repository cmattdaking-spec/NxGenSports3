import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const NXGEN_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/29e077944_generated_image.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-primary", "#00F2FF");
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setMsg({ text: "Invalid or missing reset token. Request a new one.", type: "error" });
    } else {
      setToken(t);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 8) { setMsg({ text: "Password must be at least 8 characters.", type: "error" }); return; }
    if (password !== confirm) { setMsg({ text: "Passwords do not match.", type: "error" }); return; }
    setLoading(true);
    setMsg({ text: "", type: "" });
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to reset password");
      setDone(true);
      setMsg({ text: "Password updated! Redirecting to sign in...", type: "success" });
      setTimeout(() => navigate(createPageUrl("Login"), { replace: true }), 2500);
    } catch (err) {
      setMsg({ text: err.message || "Something went wrong.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#121212" }}>
      <div className="w-full max-w-md rounded-3xl p-8 border relative overflow-hidden"
        style={{ borderColor: "rgba(232,232,232,0.08)", background: "radial-gradient(circle at top, rgba(0,242,255,0.12), transparent 55%) #121212" }}>
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "conic-gradient(from 140deg, #00F2FF, #1A4BBD, #00F2FF)" }} />

        <div className="relative space-y-6">
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

          {done ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-[#E8E8E8]">Password updated!</p>
              <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
                {msg.text}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#E8E8E8]">Set a new password</p>
                <p className="text-xs text-[#9CA3AF]">Choose a strong password for your account.</p>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setMsg({ text: "", type: "" }); }}
                  placeholder="Min. 8 characters"
                  className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
                  data-testid="reset-password-input"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setMsg({ text: "", type: "" }); }}
                  placeholder="Re-enter password"
                  className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
                  data-testid="reset-confirm-input"
                  required
                />
              </div>

              {msg.text && (
                <div className={`text-xs rounded-xl px-3 py-2 ${msg.type === "success" ? "text-green-400 bg-green-500/10 border border-green-500/30" : "text-red-400 bg-red-500/10 border border-red-500/30"}`}
                  data-testid="reset-message">
                  {msg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                data-testid="reset-submit-button"
                className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)", color: "#121212" }}
              >
                {loading ? "Updating..." : "Update password"}
              </button>

              <div className="text-center">
                <button type="button" onClick={() => navigate(createPageUrl("Login"))}
                  className="text-xs text-[#00F2FF] hover:underline">
                  ← Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
