import React, { useState, useEffect } from "react";
import { Trash2, X, Settings, Check, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { DbReservation, HALLS } from "../types/client";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface HallPrices {
  largeHall: number;
  smallHall: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  hasReservations: boolean;
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
    date: "",
    startTime: "",
    endTime: "",
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      fetchReservations();
      fetchPrices();
    }
  }, [user]);

  useEffect(() => {
    filterReservations();
  }, [reservations, selectedDate]);

  const formatTimeTo12Hour = (time24: string) => {
    if (!time24) return "";
    
    const [hours, minutes] = time24.split(':');
    const hoursNum = parseInt(hours);
    const period = hoursNum >= 12 ? 'PM' : 'AM';
    const hours12 = hoursNum % 12 || 12;
    
    return `${hours12}:${minutes} ${period}`;
  };

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days: CalendarDay[] = [];
    
    // Days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
        isSelected: false,
        hasReservations: false
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const hasReservations = reservations.some(res => {
        const resDate = new Date(`${res.date}T${res.time}`);
        return (
          resDate.getDate() === dayDate.getDate() &&
          resDate.getMonth() === dayDate.getMonth() &&
          resDate.getFullYear() === dayDate.getFullYear()
        );
      });
      
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        isSelected: selectedDate ? 
          dayDate.toDateString() === selectedDate.toDateString() : false,
        hasReservations
      });
    }
    
    // Days from next month
    const daysToAdd = 42 - days.length;
    for (let i = 1; i <= daysToAdd; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        isSelected: false,
        hasReservations: false
      });
    }
    
    return days;
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getMonthName = () => {
    return new Intl.DateTimeFormat('ar-EG', { 
      month: 'long', 
      year: 'numeric' 
    }).format(currentMonth);
  };

  const filterReservations = () => {
    if (!selectedDate) {
      setFilteredReservations(reservations);
      return;
    }

    const filtered = reservations.filter(reservation => {
      const date = new Date(`${reservation.date}T${reservation.time}`);
      return date.toDateString() === selectedDate.toDateString();
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
              large_hall_price: 100,
              small_hall_price: 50,
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
      return true;
    }
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60);
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

      const durationInMinutes = calculateDuration(formData.startTime, formData.endTime);
      if (durationInMinutes <= 0) {
        setError("وقت النهاية يجب أن يكون بعد وقت البداية");
        return;
      }

      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      const hasConflict = await checkTimeConflict(
        startDateTime.toISOString(),
        endDateTime.toISOString(),
        formData.hallName
      );

      if (hasConflict) {
        setError("هذا الموعد محجوز بالفعل، يرجى اختيار موعد آخر");
        return;
      }

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

      const hallPrice = formData.hallName === HALLS.LARGE ? prices.largeHall : prices.smallHall;
      const totalPrice = (hallPrice / 60) * durationInMinutes;

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
        startTime: "",
        endTime: "",
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
    startTime: string,
    endTime: string
  ) => {
    const durationInMinutes = calculateDuration(startTime, endTime);
    const hallPrice = hallName === HALLS.LARGE ? prices.largeHall : prices.smallHall;
    return (hallPrice / 60) * durationInMinutes;
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
      <div className="max-w-6xl mx-auto p-6">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    وقت البداية
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    وقت النهاية
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
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
              <p className="text-blue-200">
                المدة:{" "}
                {formData.startTime && formData.endTime ? (
                  formatDurationDisplay(calculateDuration(formData.startTime, formData.endTime))
                ) : (
                  "0 ساعة"
                )}
              </p>
              <p className="text-white font-bold mt-2">
                التكلفة الإجمالية:{" "}
                {formData.startTime && formData.endTime ? (
                  formatCurrency(
                    calculateTotalPrice(
                      formData.hallName,
                      formData.startTime,
                      formData.endTime
                    )
                  )
                ) : (
                  "0 جنيه"
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

        {/* Calendar Section */}
        <div className="mb-6 bg-slate-800/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              التقويم الشهري
            </h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={prevMonth}
                className="text-blue-200 hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="text-white font-medium">
                {getMonthName()}
              </span>
              <button 
                onClick={nextMonth}
                className="text-blue-200 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
              <div key={day} className="text-center text-blue-200 text-sm py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentMonth).map((day, index) => (
              <button
                key={index}
                onClick={() => {
                  if (day.isCurrentMonth) {
                    setSelectedDate(day.date);
                  }
                }}
                className={`h-14 rounded-lg flex flex-col items-center justify-center text-sm
                  ${day.isCurrentMonth ? 'text-white' : 'text-slate-500'}
                  ${day.isSelected ? 'bg-blue-600 text-white' : ''}
                  ${day.hasReservations && !day.isSelected ? 'bg-slate-700' : ''}
                  ${!day.isCurrentMonth ? 'opacity-50' : ''}
                  hover:bg-slate-600 transition-colors`}
              >
                <span>{day.date.getDate()}</span>
                {day.hasReservations && (
                  <span className="w-1 h-1 rounded-full bg-blue-400 mt-1"></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Reservations for Selected Date */}
        {selectedDate && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4">
              الحجوزات في {selectedDate.toLocaleDateString('ar-EG')}
            </h3>
            <div className="space-y-4">
              {filteredReservations.length > 0 ? (
                filteredReservations.map((reservation) => (
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
                            الوقت: {formatTimeTo12Hour(reservation.time)}
                          </p>
                          <p className="text-blue-200">
                            المدة: {formatDurationDisplay(
                              reservation.duration.hours * 60 +
                                reservation.duration.minutes
                            )}
                          </p>
                          <p className="text-blue-200">القاعة: {reservation.hallName}</p>
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
                ))
              ) : (
                <div className="text-center py-8 bg-slate-800/50 rounded-lg">
                  <p className="text-slate-400">لا توجد حجوزات في هذا اليوم</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};