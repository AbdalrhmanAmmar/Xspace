export const StatsCards = ({ visits }: { visits: any[] }) => {
  const stats = {
    ongoing: visits.filter((v) => !v.endTime && !v.isPaused).length,
    paused: visits.filter((v) => v.isPaused).length,
    finished: visits.filter((v) => v.endTime).length,
  };

  return (
    <div className="flex gap-4 mt-3">
      <div className="bg-blue-500/20 px-3 py-1 rounded-full flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        <span className="text-xs text-blue-300">جارية: {stats.ongoing}</span>
      </div>
      {/* بطاقات أخرى */}
    </div>
  );
};
