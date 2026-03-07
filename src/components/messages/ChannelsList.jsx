import { Hash, Plus, Lock, Volume2 } from "lucide-react";

const DEFAULT_CHANNELS = [
  { id: "general", name: "General", icon: Hash, description: "Team-wide announcements" },
  { id: "offense", name: "Offense", icon: Hash, description: "Offensive unit channel" },
  { id: "defense", name: "Defense", icon: Hash, description: "Defensive unit channel" },
  { id: "special_teams", name: "Special Teams", icon: Hash, description: "Special teams channel" },
  { id: "strength_conditioning", name: "S&C", icon: Hash, description: "Strength & conditioning" },
  { id: "recruiting", name: "Recruiting", icon: Hash, description: "Recruiting discussion" },
];

export { DEFAULT_CHANNELS };

export default function ChannelsList({ activeChannelId, onSelect }) {
  return (
    <div className="mb-2">
      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-3 mb-1">Channels</p>
      {DEFAULT_CHANNELS.map(ch => {
        const Icon = ch.icon;
        const active = activeChannelId === ch.id;
        return (
          <button
            key={ch.id}
            onClick={() => onSelect(ch)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${active ? "text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
            style={active ? { backgroundColor: "var(--color-primary,#3b82f6)22", color: "var(--color-primary,#3b82f6)" } : {}}
          >
            <Hash className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-sm">{ch.name}</span>
          </button>
        );
      })}
    </div>
  );
}