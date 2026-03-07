import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Settings as SettingsIcon, LogOut, Palette, Check, User, Shield, Bell, Lock, Eye, EyeOff, Upload, Building2, BookOpen } from "lucide-react";
import UsersSection from "../components/settings/UsersSection";
import TeamLanguagePanel from "../components/settings/TeamLanguagePanel";

const COLOR_SCHEMES = [
  { name: "NxDown Default", primary: "#3b82f6", secondary: "#1d4ed8", preview: "bg-blue-500" },
  { name: "Crimson & Gold", primary: "#DC143C", secondary: "#FFD700", preview: "bg-red-600" },
  { name: "Navy & Gold", primary: "#003087", secondary: "#FFB81C", preview: "bg-blue-900" },
  { name: "Forest Green & White", primary: "#228B22", secondary: "#FFFFFF", preview: "bg-green-700" },
  { name: "Purple & Gold", primary: "#4B0082", secondary: "#FFD700", preview: "bg-purple-900" },
  { name: "Orange & Black", primary: "#FF6600", secondary: "#1a1a1a", preview: "bg-orange-500" },
  { name: "Scarlet & Gray", primary: "#BB0000", secondary: "#666666", preview: "bg-red-700" },
  { name: "Royal Blue & White", primary: "#4169E1", secondary: "#FFFFFF", preview: "bg-blue-600" },
  { name: "Maroon & Gold", primary: "#800000", secondary: "#FFD700", preview: "bg-red-900" },
  { name: "Black & Gold", primary: "#1a1a1a", secondary: "#FFD700", preview: "bg-yellow-500" },
  { name: "Custom", primary: "", secondary: "", preview: "" },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [currentScheme, setCurrentScheme] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customPrimary, setCustomPrimary] = useState("#3b82f6");
  const [customSecondary, setCustomSecondary] = useState("#1d4ed8");
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [settings, setSettings] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const canChangeColors = user?.role === "head_coach" || user?.role === "admin";
  const [logoUploading, setLogoUploading] = useState(false);
  const [teamLogo, setTeamLogo] = useState(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setTeamLogo(file_url);
    await base44.auth.updateMe({ team_logo_url: file_url });
    setLogoUploading(false);
  };

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setNotificationsEnabled(u?.notifications_enabled || false); setTeamLogo(u?.team_logo_url || null); }).catch(() => {});
    base44.entities.AppSettings.list().then((list) => {
      if (list.length > 0) {
        setSettings(list[0]);
        const match = COLOR_SCHEMES.find(s => s.primary === list[0].primary_color);
        setSelectedScheme(match || COLOR_SCHEMES[COLOR_SCHEMES.length - 1]);
        setCustomPrimary(list[0].primary_color || "#3b82f6");
        setCustomSecondary(list[0].secondary_color || "#1d4ed8");
      } else {
        setSelectedScheme(COLOR_SCHEMES[0]);
      }
    });
  }, []);

  const handleSaveColors = async () => {
    if (!canChangeColors) return;
    setSaving(true);
    const primary = selectedScheme?.name === "Custom" ? customPrimary : selectedScheme?.primary;
    const secondary = selectedScheme?.name === "Custom" ? customSecondary : selectedScheme?.secondary;
    const data = {
      primary_color: primary,
      secondary_color: secondary,
      scheme_name: selectedScheme?.name || "Custom",
      updated_by: user?.email,
    };
    if (settings?.id) {
      await base44.entities.AppSettings.update(settings.id, data);
    } else {
      const created = await base44.entities.AppSettings.create(data);
      setSettings(created);
    }
    // Apply CSS variables
    document.documentElement.style.setProperty("--color-primary", primary);
    document.documentElement.style.setProperty("--color-secondary", secondary);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwError("All fields are required."); return; }
    if (pwForm.next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    setPwSaving(true);
    await base44.auth.changePassword(pwForm.current, pwForm.next);
    setPwSaving(false);
    setPwSuccess(true);
    setPwForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setPwSuccess(false), 3000);
  };

  const handleToggleNotifications = async () => {
    setNotifSaving(true);
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    await base44.auth.updateMe({ notifications_enabled: newVal });
    setNotifSaving(false);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="bg-[#0a0a0a] min-h-full p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary,#3b82f6)]/20 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-[var(--color-primary,#3b82f6)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your account and app preferences</p>
        </div>
      </div>

      {/* Profile Card */}
      {user && (
        <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" /> Profile
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--color-primary,#3b82f6)] flex items-center justify-center text-white text-xl font-black">
              {user.full_name?.[0] || user.email?.[0] || "C"}
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{user.full_name || "Coach"}</p>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="w-3 h-3 text-[var(--color-primary,#3b82f6)]" />
                <span className="text-xs text-[var(--color-primary,#3b82f6)] capitalize font-medium">
                  {user.role?.replace(/_/g, " ") || "Coach"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Logo */}
      {canChangeColors && (
        <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-bold mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" /> Team Logo
          </h2>
          <p className="text-gray-500 text-xs mb-4">Upload your school or team logo. Displayed on your team portal.</p>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-gray-700 bg-[#1a1a1a] flex items-center justify-center overflow-hidden flex-shrink-0">
              {teamLogo
                ? <img src={teamLogo} alt="Team Logo" className="w-full h-full object-contain p-1" />
                : <Building2 className="w-8 h-8 text-gray-700" />
              }
            </div>
            <div className="space-y-2 flex-1">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 text-sm cursor-pointer transition-all w-fit">
                <Upload className="w-4 h-4" />
                {logoUploading ? "Uploading..." : teamLogo ? "Change Logo" : "Upload Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
              </label>
              <p className="text-gray-600 text-xs">PNG, JPG or SVG recommended. Square logos work best.</p>
            </div>
          </div>
        </div>
      )}

      {/* Color Scheme */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" /> School Colors
        </h2>
        {!canChangeColors && (
          <p className="text-yellow-500/80 text-xs mb-4 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Only Head Coach or Athletic Director can change colors
          </p>
        )}
        {canChangeColors && (
          <p className="text-gray-500 text-xs mb-4">Select a preset or customize to match your school colors</p>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          {COLOR_SCHEMES.filter(s => s.name !== "Custom").map((scheme) => (
            <button
              key={scheme.name}
              disabled={!canChangeColors}
              onClick={() => setSelectedScheme(scheme)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                selectedScheme?.name === scheme.name
                  ? "border-[var(--color-primary,#3b82f6)] bg-[var(--color-primary,#3b82f6)]/10"
                  : "border-gray-700 hover:border-gray-600"
              } ${!canChangeColors ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className={`w-6 h-6 rounded-full ${scheme.preview} flex-shrink-0`} style={{ backgroundColor: scheme.primary }} />
              <span className="text-gray-300 text-xs font-medium truncate">{scheme.name}</span>
              {selectedScheme?.name === scheme.name && <Check className="w-3 h-3 text-[var(--color-primary,#3b82f6)] ml-auto flex-shrink-0" />}
            </button>
          ))}
        </div>

        {/* Custom */}
        <div
          className={`p-3 rounded-xl border transition-all mb-4 ${
            selectedScheme?.name === "Custom"
              ? "border-[var(--color-primary,#3b82f6)] bg-[var(--color-primary,#3b82f6)]/10"
              : "border-gray-700"
          } ${!canChangeColors ? "opacity-50 pointer-events-none" : ""}`}
        >
          <button className="flex items-center gap-2 w-full mb-3" onClick={() => canChangeColors && setSelectedScheme(COLOR_SCHEMES[COLOR_SCHEMES.length - 1])}>
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-500" />
            <span className="text-gray-300 text-xs font-medium">Custom Colors</span>
            {selectedScheme?.name === "Custom" && <Check className="w-3 h-3 text-[var(--color-primary,#3b82f6)] ml-auto" />}
          </button>
          {selectedScheme?.name === "Custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Primary</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={customPrimary} onChange={e => setCustomPrimary(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                  <span className="text-gray-400 text-xs">{customPrimary}</span>
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Secondary</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={customSecondary} onChange={e => setCustomSecondary(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                  <span className="text-gray-400 text-xs">{customSecondary}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {canChangeColors && (
          <button
            onClick={handleSaveColors}
            disabled={saving}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all text-white"
            style={{ backgroundColor: "var(--color-primary, #3b82f6)" }}
          >
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Color Scheme"}
          </button>
        )}
      </div>

      {/* Push Notifications */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" /> Push Notifications
        </h2>
        <p className="text-gray-500 text-xs mb-4">Get notified about team updates, messages, and alerts</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Enable Notifications</p>
            <p className="text-gray-500 text-xs mt-0.5">{notificationsEnabled ? "You will receive push notifications" : "Notifications are off"}</p>
          </div>
          <button
            onClick={handleToggleNotifications}
            disabled={notifSaving}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${notificationsEnabled ? "bg-[var(--color-primary,#3b82f6)]" : "bg-gray-700"} disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${notificationsEnabled ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[var(--color-primary,#3b82f6)]" /> Change Password
        </h2>
        <p className="text-gray-500 text-xs mb-4">Update your account password</p>
        <div className="space-y-3">
          {[
            { key: "current", label: "Current Password" },
            { key: "next", label: "New Password" },
            { key: "confirm", label: "Confirm New Password" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-gray-400 text-xs mb-1 block">{label}</label>
              <div className="relative">
                <input
                  type={showPw[key] ? "text" : "password"}
                  value={pwForm[key]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-gray-700 text-white px-3 py-2 pr-9 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary,#3b82f6)]"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))} className="absolute right-2 top-2 text-gray-500 hover:text-gray-300">
                  {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
          {pwSuccess && <p className="text-green-400 text-xs">✓ Password changed successfully!</p>}
          <button
            onClick={handleChangePassword}
            disabled={pwSaving}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all text-white"
            style={{ backgroundColor: "var(--color-primary, #3b82f6)" }}
          >
            {pwSaving ? "Saving..." : "Update Password"}
          </button>
        </div>
      </div>

      {/* Users / Staff Management — admin, AD, HC only */}
      {user && ["admin", "athletic_director", "head_coach"].includes(user.role) && (
        <UsersSection currentUser={user} />
      )}

      {/* Logout */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">Account</h2>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-3 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-all text-red-400"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}