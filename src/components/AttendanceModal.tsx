import React, { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "../lib/supabase";

interface AttendanceModalProps {
  subscriptionId: string;
  totalDays: number;
  onClose: () => void;
  clientName: string;
  onAttendanceMarked: () => void; // Optional callback for when attendance is marked
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  subscriptionId,
  totalDays,
  onClose,
  clientName,
  onAttendanceMarked
}) => {
  const [attendance, setAttendance] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("subscription_days")
          .select("day_number")
          .eq("subscription_id", subscriptionId)
          .order("day_number", { ascending: true });

        if (error) throw error;

        const days = Array(totalDays).fill(false);
        data.forEach((entry) => {
          days[entry.day_number - 1] = true;
        });
        setAttendance(days);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [subscriptionId, totalDays]);

  const toggleDay = (index: number) => {
    const updated = [...attendance];
    updated[index] = !updated[index];
    setAttendance(updated);
  };

  const saveAttendance = async () => {
    console.log("Attendance state before saving:", attendance);

    setSaving(true);
    try {
        console.log("Attendance state before saving:", attendance);

      await supabase
        .from("subscription_days")
        .delete()
        .eq("subscription_id", subscriptionId);

      const daysToInsert = attendance
        .map((present, index) =>
          present ? { subscription_id: subscriptionId, day_number: index + 1 } : null
        )
        .filter(Boolean);

      if (daysToInsert.length > 0) {
        await supabase.from("subscription_days").insert(daysToInsert);
      }
      onAttendanceMarked();
      onClose();
    } catch (error) {
      console.error("Error saving attendance:", error);
    } finally {
      setSaving(false);
    }
  };

  const attendedDays = attendance.filter(Boolean).length;
  const attendancePercentage = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">تسجيل حضور العميل</h2>
            <p className="text-slate-400 mt-1">{clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse text-slate-400">جاري تحميل بيانات الحضور...</div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300">نسبة الحضور</span>
                <span className="font-medium text-white">
                  {attendedDays} من {totalDays} يوم ({attendancePercentage}%)
                </span>
                
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${attendancePercentage}%` }}
                ></div>
              </div>
            </div>

        <div className="mb-6">
  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(totalDays, 7)}, minmax(0, 1fr))` }}>
    {Array.from({ length: totalDays }).map((_, index) => (
      <button
        key={index}
        onClick={() => toggleDay(index)}
        className={`w-12 h-12 flex items-center justify-center rounded-md text-sm font-bold transition-colors border-2 ${
          attendance[index]
            ? "bg-green-600 text-white border-green-500 hover:bg-green-700"
            : "bg-slate-700 text-slate-400 border-slate-500 hover:bg-slate-600 hover:text-white"
        }`}
      >
        {index + 1}
      </button>
    ))}
  </div>
</div>

   

            {/* الأسطورة */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-600 border border-green-500"></div>
                  <span>حضور</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-slate-700 border border-slate-600"></div>
                  <span>غياب</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  onClick={saveAttendance}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                  disabled={saving}
                >
                  {saving ? "جاري الحفظ..." : <>
                    <Check className="h-4 w-4" />
                    حفظ الحضور
                  </>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};