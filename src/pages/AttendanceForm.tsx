import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FiCheckCircle, FiXCircle, FiClock, FiUser, FiLogIn, FiLogOut, FiDollarSign } from "react-icons/fi";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import 'dayjs/locale/ar';

dayjs.extend(relativeTime);
dayjs.locale('ar');

interface Attendance {
  id: string;
  name: string;
  timestamp: string;
  type: "in" | "out";
  daily_profits?: {
    total: number;
    details: Array<{
      type: string;
      amount: number;
    }>;
  } | null;
}

const AttendanceTracker = () => {
  const [name, setName] = useState("");
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [message, setMessage] = useState<{text: string, type: "success" | "error"} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, name, timestamp, type, daily_profits")
        .order("timestamp", { ascending: false });
      
      if (error) throw error;
      if (data) setAttendanceList(data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setMessage({text: "حدث خطأ أثناء جلب السجلات", type: "error"});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchDailyProfits = async (employeeName: string) => {
    try {
      const today = dayjs().startOf('day').toISOString();
      
      const { data, error } = await supabase
        .from("daily_profits")
        .select("total_revenue, revenue_type")
        .gte("created_at", today)
        .eq("employee_name", employeeName);

      if (error) throw error;

      if (!data || data.length === 0) return null;

      const total = data.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
      const details = data.map(item => ({
        type: item.revenue_type,
        amount: item.total_revenue || 0
      }));

      return { total, details };
    } catch (error) {
      console.error("Error fetching daily profits:", error);
      return null;
    }
  };

  const handleAttendance = async () => {
    if (!name.trim()) {
      setMessage({text: "الرجاء إدخال اسم الموظف", type: "error"});
      return;
    }

    setIsLoading(true);
    try {
      const { data: existing, error: existingError } = await supabase
        .from("attendance")
        .select("*")
        .eq("name", name)
        .order("timestamp", { ascending: false })
        .limit(1);

      if (existingError) throw existingError;

      const lastEntry = existing?.[0];
      const newType = lastEntry?.type === "in" ? "out" : "in";
      let dailyProfits = null;

      // إذا كان انصراف، جلب أرباح اليوم
      if (newType === "out") {
        dailyProfits = await fetchDailyProfits(name);
      }

      const { error } = await supabase
        .from("attendance")
        .insert([{ 
          name, 
          type: newType,
          daily_profits: dailyProfits 
        }]);

      if (error) throw error;

      setMessage({
        text: `تم تسجيل ${newType === "in" ? "الحضور" : "الانصراف"} بنجاح`,
        type: "success"
      });
      setName("");
      fetchAttendance();
    } catch (error) {
      console.error("Error recording attendance:", error);
      setMessage({text: "حدث خطأ أثناء التسجيل", type: "error"});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gradient-to-b from-slate-900 to-slate-800 text-white rounded-xl shadow-lg space-y-6">
      <h2 className="text-3xl font-bold text-center flex items-center justify-center gap-2">
        <FiClock className="text-emerald-400" />
        نظام الحضور والانصراف
      </h2>
      
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اكتب اسم الموظف"
            className="w-full p-3 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onKeyPress={(e) => e.key === "Enter" && handleAttendance()}
          />
          <FiUser className="absolute left-3 top-3.5 text-slate-500" />
        </div>
        <button
          onClick={handleAttendance}
          disabled={isLoading}
          className={`flex items-center gap-2 px-6 py-3 rounded text-white ${
            isLoading ? "bg-slate-700 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isLoading ? "جاري المعالجة..." : (
            <>
              <FiCheckCircle />
              تسجيل
            </>
          )}
        </button>
      </div>
      
      {message && (
        <div className={`p-3 rounded text-center font-medium ${
          message.type === "success" 
            ? "bg-emerald-900/30 text-emerald-300" 
            : "bg-red-900/30 text-red-300"
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <FiClock className="text-blue-400" />
          السجل اليومي:
        </h3>
        
        {isLoading && attendanceList.length === 0 ? (
          <p className="text-center text-slate-400">جاري تحميل السجلات...</p>
        ) : attendanceList.length === 0 ? (
          <p className="text-slate-400 text-center">لا يوجد سجلات بعد.</p>
        ) : (
          <div className="space-y-2">
            {attendanceList.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-800 p-3 rounded border border-slate-700"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      entry.type === "in" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"
                    }`}>
                      {entry.type === "in" ? <FiLogIn /> : <FiLogOut />}
                    </div>
                    <span className="font-medium">{entry.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">
                      {dayjs(entry.timestamp).format("hh:mm A")}
                    </span>
                    <span className={`font-semibold ${
                      entry.type === "in" ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {entry.type === "in" ? "حضور" : "انصراف"}
                    </span>
                  </div>
                </div>
                
                {entry.type === "out" && entry.daily_profits && (
                  <div className="mt-3 ml-12 pl-2 border-l-2 border-slate-700">
                    <div className="bg-slate-800/50 rounded p-2">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <FiDollarSign />
                        <span className="font-medium">أرباح اليوم:</span>
                        <span className="font-bold">{entry.daily_profits.total.toFixed(2)} ر.س</span>
                      </div>
                      
                      {entry.daily_profits.details.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 mt-1 text-sm text-slate-300">
                          {entry.daily_profits.details.map((detail, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="text-slate-400">{detail.type}:</span>
                              <span>{detail.amount.toFixed(2)} ر.س</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTracker;