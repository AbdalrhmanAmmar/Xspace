import React, { useState, useEffect } from "react";
import { Trash2, X, Settings, Check, Calendar } from "lucide-react";
import { DbReservation, HALLS } from "../types/client";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface HallPrices {
  largeHall: number;
  smallHall: number;
}

export const Reservations = () => {
  const [reservations, setReservations] = useState<DbReservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<DbReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<"large" | "small">("large");
  const [formData, setFormData] = useState({
    clientName: "",
   ate: "", 
    time: "",
    durationRange: "60",
    hallName: HALLS.LARGE,
    deposit: "",
  });
  const [prices, setPrices] = useState<HallPrices>({
    largeHall: 90,
    smallHall: 45,
  });
  const [priceFormData, setPriceFormData] = useState<HallPrices>({
    largeHall: 90,
    smallHall: 45,
  });
  const [weekFilter, setWeekFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchReservations();
      fetchPrices();
    }
  }, [user]);

  useEffect(() => {
    filterReservations();
  }, [reservations, weekFilter]);

  const filterReservations = () => {
    if (weekFilter === "all") {
      setFilteredReservations(reservations);
      return;
    }

    const filtered = reservations.filter(reservation => {
      const date = new Date(`${reservation.date}T${reservation.time}`);
      const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, etc.
      
      // Convert to Arabic week days (0=الأحد, 1=الإثنين, etc.)
      return (weekFilter === "0" && dayOfWeek === 0) || 
             (weekFilter === "1" && dayOfWeek === 1) ||
             (weekFilter === "2" && dayOfWeek === 2) ||
             (weekFilter === "3" && dayOfWeek === 3) ||
             (weekFilter === "4" && dayOfWeek === 4) ||
             (weekFilter === "5" && dayOfWeek === 5) ||
             (weekFilter === "6" && dayOfWeek === 6);
    });

    setFilteredReservations(filtered);
  };

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase
        .from("hall_prices")
        .select("*")
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          await supabase.from("hall_prices").insert([
            {
              large_hall_price: 90,
              small_hall_price: 45,
            },
          ]);
        } else {
          throw error;
        }
      } else if (data) {
        setPrices({
          largeHall: data.large_hall_price,
          smallHall: data.small_hall_price,
        });
        setPriceFormData({
          largeHall: data.large_hall_price,
          smallHall: data.small_hall_price,
        });
      }
    } catch (err) {
      console.error("Error fetching hall prices:", err);
      setError("حدث خطأ أثناء تحميل أسعار القاعات");
    }
  };

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reservations")
        .select(
          `
          *,
          clients (
            name
          )
        `
        )
        .order("start_time", { ascending: false });

      if (error) throw error;

      const formattedReservations = (data || []).map((res) => ({
        id: res.id,
        clientName: res.clients?.name || "",
        date: new Date(res.start_time).toISOString().split("T")[0],
        time: new Date(res.start_time).toTimeString().split(" ")[0].slice(0, 5),
        duration: {
          hours: Math.floor(res.duration_minutes / 60),
          minutes: res.duration_minutes % 60,
        },
        hallName: res.hall_name,
        deposit: res.deposit_amount,
        totalPrice: res.total_price,
      }));

      setReservations(formattedReservations);
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setError("حدث خطأ أثناء تحميل الحجوزات");
    } finally {
      setLoading(false);
    }
  };

  const checkTimeConflict = async (startTime: string, endTime: string, hallName: string) => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("hall_name", hallName)
        .or(`and(start_time.lte.${endTime},end_time.gte.${startTime})`);

      if (error) throw error;
      return (data && data.length > 0);
    } catch (err) {
      console.error("Error checking time conflict:", err);
      return true; // To be safe, assume conflict if there's an error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("يجب تسجيل الدخول أولاً");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Calculate reservation details
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const durationInMinutes = parseInt(formData.durationRange);
      const endDateTime = new Date(
        startDateTime.getTime() + durationInMinutes * 60000
      );

      // Check for time conflict
      const hasConflict = await checkTimeConflict(
        startDateTime.toISOString(),
        endDateTime.toISOString(),
        formData.hallName
      );

      if (hasConflict) {
        setError("هذا الموعد محجوز بالفعل، يرجى اختيار موعد آخر");
        return;
      }

      // Create or get client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert([
          {
            name: formData.clientName,
            is_new_client: true,
            last_visit: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (clientError && clientError.code !== "23505") throw clientError;

      let clientId = clientData?.id;
      if (!clientId) {
        const { data: existingClient, error: searchError } = await supabase
          .from("clients")
          .select("id")
          .eq("name", formData.clientName)
          .single();

        if (searchError) throw searchError;
        clientId = existingClient.id;
      }

      // Determine price
      const hallPrice = formData.hallName === HALLS.LARGE ? prices.largeHall : prices.smallHall;
      const totalPrice = (hallPrice / 60) * durationInMinutes;

      // Create reservation
      const { error: reservationError } = await supabase
        .from("reservations")
        .insert([
          {
            client_id: clientId,
            hall_name: formData.hallName,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            duration_minutes: durationInMinutes,
            total_price: totalPrice,
            deposit_amount: Number(formData.deposit) || 0,
            status: "active",
          },
        ]);

      if (reservationError) throw reservationError;

      await fetchReservations();
      setFormData({
        clientName: "",
        date: "",
        time: "",
        durationRange: "60",
        hallName: HALLS.LARGE,
        deposit: "",
      });
      setSelectedType("large");
    } catch (err: any) {
      console.error("Error saving reservation:", err);
      setError(err.message || "حدث خطأ أثناء حفظ الحجز");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحجز؟")) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchReservations();
    } catch (err: any) {
      console.error("Error deleting reservation:", err);
      setError(err.message || "حدث خطأ أثناء حذف الحجز");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from("hall_prices")
        .update({
          large_hall_price: priceFormData.largeHall,
          small_hall_price: priceFormData.smallHall,
        })
        .eq("id", 1);

      if (error) throw error;

      setPrices(priceFormData);
      setShowSettings(false);
    } catch (err: any) {
      console.error("Error saving prices:", err);
      setError(err.message || "حدث خطأ أثناء حفظ الأسعار");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-EG")} جنيه`;
  };

  const formatDurationDisplay = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ""}`;
  };

  const calculateTotalPrice = (
    hallName: string,
    durationInMinutes: number
  ) => {
    const hallPrice = hallName === HALLS.LARGE ? prices.largeHall : prices.smallHall;
    return (hallPrice / 60) * durationInMinutes;
  };

  const getDurationColor = (minutes: number) => {
    const percentage = (minutes / 480) * 100;
    if (percentage <= 33) return "#22c55e"; // green-500
    if (percentage <= 66) return "#eab308"; // yellow-500
    return "#ef4444"; // red-500
  };

  const getDayName = (dayIndex: string) => {
    const days = {
      "0": "الأحد",
      "1": "الإثنين",
      "2": "الثلاثاء",
      "3": "الأربعاء",
      "4": "الخميس",
      "5": "الجمعة",
      "6": "السبت"
    };
    return days[dayIndex as keyof typeof days] || "الكل";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">يجب تسجيل الدخول أولاً</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">الحجوزات</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-600 transition-colors flex items-center gap-2"
          >
            <Settings className="h-5 w-5" />
            إعدادات الأسعار
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  إعدادات أسعار القاعات
                </h2>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setPriceFormData(prices);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSavePrices} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    سعر القاعة الكبيرة (بالساعة)
                  </label>
                  <input
                    type="number"
                    value={priceFormData.largeHall}
                    onChange={(e) =>
                      setPriceFormData({
                        ...priceFormData,
                        largeHall: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    سعر القاعة الصغيرة (بالساعة)
                  </label>
                  <input
                    type="number"
                    value={priceFormData.smallHall}
                    onChange={(e) =>
                      setPriceFormData({
                        ...priceFormData,
                        smallHall: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-6 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  <Check className="h-5 w-5" />
                  {loading ? "جاري الحفظ..." : "حفظ الأسعار"}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">حجز جديد</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                اسم العميل
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="أدخل اسم العميل"
                dir="rtl"
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  الوقت
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                المدة: {formatDurationDisplay(parseInt(formData.durationRange))}
              </label>
              <div className="relative">
                <input
                  type="range"
                  value={formData.durationRange}
                  onChange={(e) =>
                    setFormData({ ...formData, durationRange: e.target.value })
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  min="15"
                  max="480"
                  step="15"
                  disabled={loading}
                  style={{
                    background: `linear-gradient(to left, ${getDurationColor(
                      parseInt(formData.durationRange)
                    )} 0%, ${getDurationColor(
                      parseInt(formData.durationRange)
                    )} ${
                      (parseInt(formData.durationRange) / 480) * 100
                    }%, #334155 ${
                      (parseInt(formData.durationRange) / 480) * 100
                    }%, #334155 100%)`,
                  }}
                />
                <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-sm text-blue-200">
                  <span>15 دقيقة</span>
                  <span>8 ساعات</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-200 mb-2">
                اختار نوع القاعة
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType("large");
                    setFormData({
                      ...formData,
                      hallName: HALLS.LARGE,
                    });
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    selectedType === "large"
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-slate-800 text-blue-200 border-slate-600 hover:bg-slate-700"
                  }`}
                  disabled={loading}
                >
                  قاعة كبيرة - {formatCurrency(prices.largeHall)}/ساعة
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedType("small");
                    setFormData({
                      ...formData,
                      hallName: HALLS.SMALL,
                    });
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    selectedType === "small"
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-slate-800 text-blue-200 border-slate-600 hover:bg-slate-700"
                  }`}
                  disabled={loading}
                >
                  قاعة صغيرة - {formatCurrency(prices.smallHall)}/ساعة
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                العربون (جنيه)
              </label>
              <input
                type="number"
                value={formData.deposit}
                onChange={(e) =>
                  setFormData({ ...formData, deposit: e.target.value })
                }
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="أدخل مبلغ العربون"
                dir="rtl"
                min="0"
                required
                disabled={loading}
              />
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <p className="text-blue-200">
                سعر الساعة:{" "}
                {formatCurrency(
                  formData.hallName === HALLS.LARGE ? prices.largeHall : prices.smallHall
                )}
              </p>
              <p className="text-white font-bold mt-2">
                التكلفة الإجمالية:{" "}
                {formatCurrency(
                  calculateTotalPrice(
                    formData.hallName,
                    parseInt(formData.durationRange)
                  )
                )}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "جاري الحفظ..." : "تأكيد الحجز"}
            </button>
          </form>
        </div>

        {/* Weekday Filter */}
        <div className="mb-6 bg-slate-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            تصفية حسب اليوم
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setWeekFilter("all")}
              className={`px-3 py-1 rounded-lg text-sm ${
                weekFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-blue-200 hover:bg-slate-600"
              }`}
            >
              الكل
            </button>
            {["0", "1", "2", "3", "4", "5", "6"].map((day) => (
              <button
                key={day}
                onClick={() => setWeekFilter(day)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  weekFilter === day
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-blue-200 hover:bg-slate-600"
                }`}
              >
                {getDayName(day)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <div
              key={reservation.id}
              className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {reservation.clientName}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-blue-200">
                      {reservation.date} - {reservation.time}
                    </p>
                    <p className="text-blue-200">
                      {formatDurationDisplay(
                        reservation.duration.hours * 60 +
                          reservation.duration.minutes
                      )}
                    </p>
                    <p className="text-blue-200">{reservation.hallName}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-white">
                      الإجمالي: {formatCurrency(reservation.totalPrice)}
                    </p>
                    <p className="text-emerald-400">
                      العربون: {formatCurrency(reservation.deposit)}
                    </p>
                    <p className="text-blue-400">
                      المتبقي:{" "}
                      {formatCurrency(
                        reservation.totalPrice - reservation.deposit
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(reservation.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  disabled={loading}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}

          {!loading && filteredReservations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-slate-400">لا توجد حجوزات حالياً</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};