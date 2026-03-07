// Simple presence dot component
// Shows online/offline status as a colored dot

export default function PresenceDot({ isOnline, size = "sm" }) {
  const s = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  return (
    <span
      className={`${s} rounded-full flex-shrink-0 ${isOnline ? "bg-green-400" : "bg-gray-600"}`}
      title={isOnline ? "Online" : "Offline"}
    />
  );
}