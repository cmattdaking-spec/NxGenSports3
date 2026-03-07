// Extended presence dot: online, away, dnd, offline + custom status tooltip
export default function PresenceDot({ status = "offline", customStatus, size = "sm" }) {
  const s = size === "sm" ? "w-2 h-2" : "w-3 h-3";
  const config = {
    online: { color: "bg-green-400", label: "Online" },
    away:   { color: "bg-yellow-400", label: "Away" },
    dnd:    { color: "bg-red-500",   label: "Do Not Disturb" },
    offline:{ color: "bg-gray-600",  label: "Offline" },
  };
  const { color, label } = config[status] || config.offline;
  const tooltip = customStatus ? `${label} · ${customStatus}` : label;
  return (
    <span
      className={`${s} rounded-full flex-shrink-0 ${color}`}
      title={tooltip}
    />
  );
}