import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Attendance {
  id: string;
  name: string;
  timestamp: string;
  type: "in" | "out";
}

const AttendanceTracker = () => {
  const [name, setName] = useState("");
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const fetchAttendance = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select("id, name, timestamp, type")
      .order("timestamp", { ascending: false });
    if (data) setAttendanceList(data);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleAttendance = async () => {
    if (!name) return;

    const { data: existing, error: existingError } = await supabase
      .from("attendance")
      .select("*")
      .eq("name", name)
      .order("timestamp", { ascending: false })
      .limit(1);

    const lastEntry = existing?.[0];
    const newType = lastEntry?.type === "in" ? "out" : "in";

    const { error } = await supabase.from("attendance").insert([
      { name, type: newType },
    ]);

    if (error) {
      setMessage("❌ حدث خطأ أثناء التسجيل.");
    } else {
      setMessage(`✅ تم تسجيل ${newType === "in" ? "الحضور" : "الانصراف"} بنجاح.`);
      setName("");
      fetchAttendance();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gradient-to-b from-slate-900 to-slate-800 text-white rounded-xl shadow-lg space-y-6">
      <h2 className="text-3xl font-bold text-center">📋 نظام الحضور والانصراف</h2>
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اكتب اسمك"
          className="flex-1 p-3 rounded bg-slate-800 text-white border border-slate-700"
        />
        <button
          onClick={handleAttendance}
          className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded text-white"
        >
          تسجيل
        </button>
      </div>
      {message && <p className="text-center text-emerald-400 font-medium">{message}</p>}
      <div className="space-y-3">
        <h3 className="text-xl font-semibold">📅 السجل اليومي:</h3>
        {attendanceList.length === 0 ? (
          <p className="text-slate-400">لا يوجد سجلات بعد.</p>
        ) : (
          <div className="space-y-2">
            {attendanceList.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center"
              >
                <span className="font-medium">{entry.name}</span>
                <span className="text-sm text-slate-400">
                  {new Date(entry.timestamp).toLocaleTimeString("ar-EG")}
                </span>
                <span
                  className={
                    entry.type === "in"
                      ? "text-green-400 font-semibold"
                      : "text-red-400 font-semibold"
                  }
                >
                  {entry.type === "in" ? "حضور" : "انصراف"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTracker;
