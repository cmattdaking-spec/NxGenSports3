import { useState, useCallback } from "react";

/**
 * usePullToRefresh — reusable pull-to-refresh for mobile list views.
 * Usage:
 *   const { refreshing, pullDelta, handlers } = usePullToRefresh(onRefresh);
 *   <div {...handlers}>
 *     {(refreshing || pullDelta > 20) && <PullIndicator delta={pullDelta} refreshing={refreshing} />}
 *     ...content...
 *   </div>
 */
export default function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullStart, setPullStart] = useState(0);
  const [pullDelta, setPullDelta] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
    setPullDelta(0);
  }, [onRefresh]);

  const onTouchStart = (e) => setPullStart(e.touches[0].clientY);
  const onTouchMove = (e) => {
    const delta = e.touches[0].clientY - pullStart;
    if (delta > 0 && window.scrollY === 0) setPullDelta(Math.min(delta, 80));
  };
  const onTouchEnd = () => {
    if (pullDelta > 60) handleRefresh();
    else setPullDelta(0);
  };

  return {
    refreshing,
    pullDelta,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}

export function PullIndicator({ delta, refreshing }) {
  if (!refreshing && delta <= 20) return null;
  return (
    <div className="flex justify-center py-2 -mt-2 mb-2">
      <div
        className={`w-5 h-5 border-2 border-gray-600 border-t-[var(--color-primary,#f97316)] rounded-full ${refreshing ? "animate-spin" : ""}`}
        style={{ transform: refreshing ? "" : `rotate(${delta * 4}deg)` }}
      />
    </div>
  );
}