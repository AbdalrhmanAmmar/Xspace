import React from "react";
import { Visit } from "../../types/client";

interface VisitStatsProps {
  visits: Visit[];
}

export const VisitStats: React.FC<VisitStatsProps> = ({ visits }) => {
  const stats = visits.reduce(
    (acc, visit) => {
      if (visit.endTime) {
        acc.finished += visit.numberOfPeople || 1;
      } else if (visit.isPaused) {
        acc.paused += 1;
      } else {
        acc.ongoing += visit.numberOfPeople || 1;
      }
      return acc;
    },
    { ongoing: 0, paused: 0, finished: 0 }
  );

  return (
    <div className="flex gap-4 mt-3">
      <div className="bg-blue-500/20 px-3 py-1 rounded-full flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        <span className="text-xs text-blue-300">جارية: {stats.ongoing}</span>
      </div>
      <div className="bg-yellow-500/20 px-3 py-1 rounded-full flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
        <span className="text-xs text-yellow-300">متوقفة: {stats.paused}</span>
      </div>
      <div className="bg-green-500/20 px-3 py-1 rounded-full flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-500"></span>
        <span className="text-xs text-green-300">منتهية: {stats.finished}</span>
      </div>
    </div>
  );
};
