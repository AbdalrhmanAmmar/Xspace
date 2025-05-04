import React from "react";
import { Search, Trash2, Users } from "lucide-react";
import { Visit } from "../../types/client";

interface VisitListProps {
  visits: Visit[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectVisit: (visit: Visit) => void;
  onDeleteVisit: (visitId: string) => void;
  loading: boolean;
}

export const VisitList: React.FC<VisitListProps> = ({
  visits,
  searchTerm,
  setSearchTerm,
  onSelectVisit,
  onDeleteVisit,
  loading,
}) => {
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "مساءً" : "صباحاً";
    const twelveHour = hours % 12 || 12;
    return `${twelveHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const filteredVisits = visits.filter((visit) =>
    visit.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Users className="h-5 w-5" />
          سجل الزيارات
        </h2>
        <div className="relative w-64">
          <Search className="absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن عميل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="rtl"
          />
        </div>
      </div>
      <div className="space-y-4">
        {filteredVisits.map((visit) => (
          <div
            key={visit.id}
            className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-colors flex justify-between"
            onClick={() => onSelectVisit(visit)}
          >
            <div className="flex justify-between items-center w-full">
              <div>
                <h4 className="text-white font-medium">{visit.clientName}</h4>
                <p className="text-sm text-blue-200">
                  {formatDate(visit.startTime)} - {formatTime(visit.startTime)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-6">
                {visit.endTime ? (
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                    منتهية
                  </span>
                ) : visit.isPaused ? (
                  <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
                    متوقفة مؤقتاً
                  </span>
                ) : (
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                    جارية
                  </span>
                )}
              </div>
            </div>
            <button
              className="text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteVisit(visit.id);
              }}
              disabled={loading}
            >
              <Trash2 />
            </button>
          </div>
        ))}
        {filteredVisits.length === 0 && (
          <p className="text-center text-slate-400 py-8">
            لا توجد زيارات مطابقة للبحث
          </p>
        )}
      </div>
    </div>
  );
};
