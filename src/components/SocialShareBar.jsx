import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Twitter, Instagram, Facebook, Send } from "lucide-react";

/**
 * SocialShareBar
 * 
 * Lightweight sharing for NxGenSports content.
 * Visible only to:
 * - Athletic Directors
 * - Head Coaches
 * - Players
 */
export default function SocialShareBar({ label = "Share to social", size = "sm" }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (!user) return null;

  const coachRole = user.coaching_role;
  const isAD = coachRole === "athletic_director";
  const isHeadCoach = coachRole === "head_coach";
  const isPlayer = user.user_type === "player";

  if (!isAD && !isHeadCoach && !isPlayer) return null;

  const baseText = isPlayer
    ? `Competing with ${user.school_name || "my team"} on NxGenSports.`
    : `Program update from ${user.school_name || "our program"} on NxGenSports.`;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const openWindow = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShare = (platform) => {
    const text = encodeURIComponent(baseText);
    const url = encodeURIComponent(shareUrl);

    switch (platform) {
      case "twitter":
        openWindow(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
        break;
      case "facebook":
        openWindow(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
        break;
      case "instagram":
      case "snapchat":
        // Mobile-first generic share; falls back silently on desktop.
        if (navigator.share) {
          navigator.share({
            title: "NxGenSports",
            text: baseText,
            url: shareUrl || undefined,
          }).catch(() => {});
        } else {
          // As a fallback, just open the profile site so the user can post manually.
          openWindow(
            platform === "instagram"
              ? "https://www.instagram.com"
              : "https://www.snapchat.com"
          );
        }
        break;
      default:
        break;
    }
  };

  const btnBase =
    "inline-flex items-center justify-center rounded-full border border-gray-700 bg-[#151515] text-gray-300 hover:text-white hover:border-gray-500 transition-colors";
  const btnSize = size === "lg" ? "w-9 h-9" : "w-8 h-8";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <button
        type="button"
        onClick={() => handleShare("twitter")}
        className={`${btnBase} ${btnSize}`}
        title="Post to Twitter / X"
      >
        <Twitter className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => handleShare("instagram")}
        className={`${btnBase} ${btnSize}`}
        title="Share via Instagram"
      >
        <Instagram className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => handleShare("snapchat")}
        className={`${btnBase} ${btnSize}`}
        title="Share via Snapchat"
      >
        <Send className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => handleShare("facebook")}
        className={`${btnBase} ${btnSize}`}
        title="Post to Facebook"
      >
        <Facebook className="w-4 h-4" />
      </button>
    </div>
  );
}

