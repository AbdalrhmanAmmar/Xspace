import { Search, Trash2 } from "lucide-react";

interface VisitsListProps {
  visits: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectVisit: (visit: any) => void;
  onDeleteVisit: (id: string) => void;
  loading: boolean;
}

export const VisitsList = ({
  visits,
  searchTerm,
  setSearchTerm,
  onSelectVisit,
  onDeleteVisit,
  loading,
}: VisitsListProps) => {
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
        {visits.map((visit) => (
          <div
            key={visit.id}
            className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-colors flex justify-between"
            onClick={() => onSelectVisit(visit)}
          >
            {/* تفاصيل الزيارة */}
            <button
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
      </div>
    </div>
  );
};
