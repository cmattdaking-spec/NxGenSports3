import { useEffect, useState } from "react";

export function SkeletonLine({ width = "w-full", height = "h-4" }) {
  return <div className={`${width} ${height} bg-gray-800 rounded animate-pulse`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
      <SkeletonLine width="w-3/4" height="h-5" />
      <SkeletonLine width="w-1/2" height="h-4" />
      <div className="space-y-2 pt-2">
        <SkeletonLine height="h-3" />
        <SkeletonLine width="w-5/6" height="h-3" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-[#141414] border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex gap-4 p-4 border-b border-gray-800">
        {Array(cols).fill(0).map((_, i) => <SkeletonLine key={i} width={`w-${i === 0 ? '32' : '20'}`} height="h-4" />)}
      </div>
      {Array(rows).fill(0).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 p-4 border-b border-gray-800 last:border-b-0">
          {Array(cols).fill(0).map((_, colIdx) => <SkeletonLine key={colIdx} width={`w-${colIdx === 0 ? '32' : '20'}`} height="h-4" />)}
        </div>
      ))}
    </div>
  );
}

export function SpinnerLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-gray-800 border-t-[var(--color-primary,#f97316)] rounded-full animate-spin" />
    </div>
  );
}