import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  startDate, 
  endDate, 
  onChange 
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  const applyDateRange = () => {
    onChange(tempStart, tempEnd);
    setShowPicker(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700/70 text-white px-4 py-2 rounded-lg transition-colors"
      >
        <Calendar className="h-4 w-4" />
        <span>
          {formatDate(startDate)} - {formatDate(endDate)}
        </span>
      </button>

      {showPicker && (
        <div className="absolute right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 p-4 w-64">
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">من</label>
              <input
                type="date"
                value={tempStart.toISOString().split('T')[0]}
                onChange={(e) => setTempStart(new Date(e.target.value))}
                className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">إلى</label>
              <input
                type="date"
                value={tempEnd.toISOString().split('T')[0]}
                onChange={(e) => setTempEnd(new Date(e.target.value))}
                className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPicker(false)}
                className="px-3 py-1 text-sm text-white bg-slate-600 hover:bg-slate-700 rounded"
              >
                إلغاء
              </button>
              <button
                onClick={applyDateRange}
                className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};