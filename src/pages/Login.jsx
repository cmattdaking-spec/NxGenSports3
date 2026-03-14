import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const NXGEN_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/29e077944_generated_image.png";

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

export default function Login() {
  const { navigateToLogin } = useAuth();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    school: "",
    position: "",
    sports: [],
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState("");

  useEffect(() => {
    // Ensure brand colors are applied even before app settings load
    document.documentElement.style.setProperty("--color-primary", "#00F2FF");
    document.documentElement.style.setProperty("--color-secondary", "#E8E8E8");
  }, []);

  useEffect(() => {
    // Fetch schools from the superadmin endpoint
    const loadSchools = async () => {
      try {
        setSchoolsLoading(true);
        setSchoolsError("");
        const response = await base44.functions.invoke("listAllSchools");
        const schoolsData = response.data?.schools || [];
        setSchools(schoolsData);
      } catch (err) {
        console.error("Failed to load schools:", err);
        setSchoolsError("Failed to load schools. Please try again.");
        // Fallback to empty array
        setSchools([]);
      } finally {
        setSchoolsLoading(false);
      }
    };

    loadSchools();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(""); // Clear error when user starts typing
  };

  const handleSportToggle = (sportId) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.includes(sportId)
        ? prev.sports.filter(id => id !== sportId)
        : [...prev.sports, sportId]
    }));
    setError("");
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.school) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.sports.length === 0) {
      setError("Please select at least one sport.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Create parent user account
      const response = await base44.functions.invoke("createParentUser", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        schoolId: formData.school,
        assignedSports: formData.sports,
        position: formData.position,
      });

      if (response.data?.success) {
        // Account created successfully
        setSuccess("Parent account created successfully! Awaiting superadmin approval before you can access athlete information.");
        // Clear form
        setFormData({
          firstName: "",
          lastName: "",
          school: "",
          position: "",
          sports: [],
        });
        // Redirect after showing success message
        setTimeout(() => {
          navigateToLogin();
        }, 3000);
      } else {
        throw new Error(response.data?.error || "Failed to create account");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    navigateToLogin();
  };

  // Simple branded login view
  if (!isSignUpMode) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#121212" }}
      >
        <div className="w-full max-w-md rounded-3xl p-8 border relative overflow-hidden"
          style={{
            borderColor: "rgba(232,232,232,0.08)",
            background: "radial-gradient(circle at top, rgba(0,242,255,0.12), transparent 55%) #121212"
          }}>
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10 blur-3xl"
            style={{ background: "conic-gradient(from 140deg, #00F2FF, #1A4BBD, #00F2FF)" }} />

          <div className="relative space-y-6">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl blur-md opacity-50"
                  style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)" }} />
                <img
                  src={NXGEN_LOGO}
                  alt="NxGenSports"
                  className="relative w-14 h-14 rounded-2xl object-cover border border-[rgba(232,232,232,0.18)]"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight"
                  style={{ color: "#E8E8E8" }}>
                  Nx<span style={{ color: "#00F2FF" }}>GenSports</span>
                </h1>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  NxGeneration Multi-Sports Systems
                </p>
              </div>
            </div>

            {/* Header Text */}
            <div className="space-y-2">
              <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>
                Sign in to your program
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>
                Secure access for Athletic Directors, coaches, staff, and athletes.
                All accounts are isolated by school and sport.
              </p>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[rgba(0,242,255,0.2)]"
              style={{
                background: "linear-gradient(135deg, #00F2FF, #1A4BBD)",
                color: "#121212",
              }}
            >
              Continue to secure login
            </button>

            {/* Sign Up Link */}
            <div className="text-center">
              <button
                onClick={() => setIsSignUpMode(true)}
                className="text-xs text-[#00F2FF] hover:underline"
              >
                New to NxGenSports? Sign up here
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ backgroundColor: "#1F2933" }} />
              <span className="text-[10px]" style={{ color: "#6B7280" }}>
                NxGenSports Single Sign-On
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: "#1F2933" }} />
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-1.5 text-[10px]" style={{ color: "#6B7280" }}>
              <p>
                For access issues, contact your Athletic Director or NxGenSports support.
              </p>
              <p>
                By continuing, you agree to the platform's privacy and security policies.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sign up form view
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#121212" }}
    >
      <div className="w-full max-w-lg rounded-3xl p-8 border relative overflow-hidden"
        style={{
          borderColor: "rgba(232,232,232,0.08)",
          background: "radial-gradient(circle at top, rgba(0,242,255,0.12), transparent 55%) #121212"
        }}>
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "conic-gradient(from 140deg, #00F2FF, #1A4BBD, #00F2FF)" }} />

        <div className="relative space-y-6">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-md opacity-50"
                style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)" }} />
              <img
                src={NXGEN_LOGO}
                alt="NxGenSports"
                className="relative w-14 h-14 rounded-2xl object-cover border border-[rgba(232,232,232,0.18)]"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight"
                style={{ color: "#E8E8E8" }}>
                Nx<span style={{ color: "#00F2FF" }}>GenSports</span>
              </h1>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                NxGeneration Multi-Sports Systems
              </p>
            </div>
          </div>

          {/* Header Text */}
          <div className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>
              Create your account
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>
              Join NxGenSports as a parent. You'll be able to follow your athlete's progress
              once connected to their team.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
                  required
                />
              </div>
            </div>

            {/* School */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">School</label>
              {schoolsLoading ? (
                <div className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-400">
                  Loading schools...
                </div>
              ) : schoolsError ? (
                <div className="w-full bg-[#181818] border border-red-500/30 rounded-xl px-3 py-2 text-sm text-red-400">
                  {schoolsError}
                </div>
              ) : (
                <select
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
                  required
                >
                  <option value="" className="bg-[#181818]">Select your school</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id} className="bg-[#181818]">
                      {school.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Position */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Relationship to Athlete (optional)</label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder="e.g. Parent, Guardian, Coach"
                className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
              />
            </div>

            {/* Sports */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                Sport(s) your athlete participates in
              </label>
              <p className="text-[11px] text-gray-500 mb-2">
                Select all that apply
              </p>
              <div className="flex flex-wrap gap-2">
                {SPORT_OPTIONS.map(sport => (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => handleSportToggle(sport.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      formData.sports.includes(sport.id)
                        ? "bg-[#00F2FF] text-black border-transparent"
                        : "bg-[#181818] text-gray-400 border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    {sport.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[rgba(0,242,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{
                background: "linear-gradient(135deg, #00F2FF, #1A4BBD)",
                color: "#121212",
              }}
            >
              {isSubmitting ? "Creating account..." : "Create parent account"}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center">
            <button
              onClick={() => setIsSignUpMode(false)}
              className="text-xs text-[#00F2FF] hover:underline"
            >
              Already have an account? Sign in
            </button>
          </div>

          {/* Info about superadmin approval */}
          <div className="text-xs text-gray-500 bg-gray-800/50 rounded-xl px-3 py-2">
            <p className="font-medium mb-1">Note:</p>
            <p>Parent accounts require approval from a super administrator before you can access athlete information. You'll be notified once your account is activated.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#121212" }}
    >
      <div className="w-full max-w-lg rounded-3xl p-8 border relative overflow-hidden"
        style={{
          borderColor: "rgba(232,232,232,0.08)",
          background: "radial-gradient(circle at top, rgba(0,242,255,0.12), transparent 55%) #121212"
        }}>
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "conic-gradient(from 140deg, #00F2FF, #1A4BBD, #00F2FF)" }} />

        <div className="relative space-y-6">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-md opacity-50"
                style={{ background: "linear-gradient(135deg, #00F2FF, #1A4BBD)" }} />
              <img
                src={NXGEN_LOGO}
                alt="NxGenSports"
                className="relative w-14 h-14 rounded-2xl object-cover border border-[rgba(232,232,232,0.18)]"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight"
                style={{ color: "#E8E8E8" }}>
                Nx<span style={{ color: "#00F2FF" }}>GenSports</span>
              </h1>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                NxGeneration Multi-Sports Systems
              </p>
            </div>
          </div>

          {/* Header Text */}
          <div className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>
              Sign in to your program
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>
              Secure access for Athletic Directors, coaches, staff, and athletes.
              All accounts are isolated by school and sport.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
                  required
                />
              </div>
            </div>

            {/* School */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">School</label>
              {schoolsLoading ? (
                <div className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-400">
                  Loading schools...
                </div>
              ) : schoolsError ? (
                <div className="w-full bg-[#181818] border border-red-500/30 rounded-xl px-3 py-2 text-sm text-red-400">
                  {schoolsError}
                </div>
              ) : (
                <select
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
                  required
                >
                  <option value="" className="bg-[#181818]">Select your school</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id} className="bg-[#181818]">
                      {school.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Position */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Primary Position (optional)</label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder="e.g. QB, WR, Midfielder"
                className="w-full bg-[#181818] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00F2FF] transition-colors"
              />
            </div>

            {/* Sports */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                Sport(s) you play / coach
              </label>
              <p className="text-[11px] text-gray-500 mb-2">
                Select all that apply
              </p>
              <div className="flex flex-wrap gap-2">
                {SPORT_OPTIONS.map(sport => (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => handleSportToggle(sport.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      formData.sports.includes(sport.id)
                        ? "bg-[#00F2FF] text-black border-transparent"
                        : "bg-[#181818] text-gray-400 border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    {sport.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[rgba(0,242,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{
                background: "linear-gradient(135deg, #00F2FF, #1A4BBD)",
                color: "#121212",
              }}
            >
              {isSubmitting ? "Processing..." : "Continue to secure login"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ backgroundColor: "#1F2933" }} />
            <span className="text-[10px]" style={{ color: "#6B7280" }}>
              NxGenSports Single Sign-On
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: "#1F2933" }} />
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-1.5 text-[10px]" style={{ color: "#6B7280" }}>
            <p>
              For access issues, contact your Athletic Director or NxGenSports support.
            </p>
            <p>
              By continuing, you agree to the platform's privacy and security policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

