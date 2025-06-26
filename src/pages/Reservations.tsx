import React, { useState, useEffect } from "react";
import { Trash2, X, Settings, Check, Calendar, ChevronLeft, ChevronRight, Play, Square, Phone, Search } from "lucide-react";
import { DbReservation, HALLS } from "../types/client";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

// أولا، أضف هذا النوع في أعلى الملف مع الأنواع الأخرى
type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly';

interface HallPrices {
  largeHall: number;
  smallHall: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  hasLargeHallReservations: boolean;
  hasSmallHallReservations: boolean;
}

interface ReservationWithProfit extends DbReservation {
  depositPaid: boolean;
  remainingPaid: boolean;
  phone?: string;
}

interface FormData {
  clientName: string;
  phone: string;
  date: string;
  startTime: string;
  endTime: string;
  hallName: string;
  deposit: string;
  recurrence: RecurrenceType;
  recurrenceEndDate?: string;
  occurrences?: number;
}

export const Reservations = () => {
  const [reservations, setReservations] = useState<ReservationWithProfit[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<ReservationWithProfit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<"large" | "small">("large");
const [formData, setFormData] = useState<FormData>({
  clientName: "",
  phone: "",
  date: "",
  startTime: "",
  endTime: "",
  hallName: HALLS.LARGE,
  deposit: "",
  recurrence: "none",
  recurrenceEndDate: "",
  occurrences: 1,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [editingReservation, setEditingReservation] = useState<ReservationWithProfit | null>(null);
  const [editEndTime, setEditEndTime] = useState("");

  useEffect(() => {
    if (user) {
      fetchReservations();
      fetchPrices();
    }
  }, [user]);

  useEffect(() => {
    filterReservations();
  }, [reservations, selectedDate, searchQuery]);

  const formatTimeTo12Hour = (time24: string) => {
    if (!time24) return "";
    
    const [hours, minutes] = time24.split(':');
    const hoursNum = parseInt(hours);
    const period = hoursNum >= 12 ? 'PM' : 'AM';
    const hours12 = hoursNum % 12 || 12;
    
    return `${hours12}:${minutes} ${period}`;
  };

  const generateRecurringDates = (startDate: string, recurrence: RecurrenceType, endDate?: string, occurrences?: number): string[] => {
  const dates: string[] = [startDate];
  if (recurrence === 'none') return dates;

  const start = new Date(startDate);
  let current = new Date(start);
  let count = 1;

  while (true) {
    if (recurrence === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else if (recurrence === 'biweekly') {
      current.setDate(current.getDate() + 14);
    } else if (recurrence === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    }

    // التوقف إذا وصلنا لتاريخ الانتهاء
    if (endDate && new Date(current) > new Date(endDate)) {
      break;
    }

    // التوقف إذا وصلنا لعدد التكرارات المطلوب
    if (occurrences && count >= occurrences) {
      break;
    }

    dates.push(current.toISOString().split('T')[0]);
    count++;
  }

  return dates;
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
        hasLargeHallReservations: false,
        hasSmallHallReservations: false
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      
      const hasLargeHallReservations = reservations.some(res => {
        const resDate = new Date(`${res.date}T${res.time}`);
        return (
          res.hallName === HALLS.LARGE &&
          resDate.getDate() === dayDate.getDate() &&
          resDate.getMonth() === dayDate.getMonth() &&
          resDate.getFullYear() === dayDate.getFullYear()
        );
      });
      
      const hasSmallHallReservations = reservations.some(res => {
        const resDate = new Date(`${res.date}T${res.time}`);
        return (
          res.hallName === HALLS.SMALL &&
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
        hasLargeHallReservations,
        hasSmallHallReservations
      });
    }
    
    // Days from next month
    const daysToAdd = 42 - days.length;
    for (let i = 1; i <= daysToAdd; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        isSelected: false,
        hasLargeHallReservations: false,
        hasSmallHallReservations: false
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
    let filtered = [...reservations];

    if (selectedDate) {
      filtered = filtered.filter(reservation => {
        const date = new Date(`${reservation.date}T${reservation.time}`);
        return date.toDateString() === selectedDate.toDateString();
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(reservation => 
        reservation.clientName.toLowerCase().includes(query) ||
        (reservation.phone && reservation.phone.includes(query))
      );
    }

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
        .select(`
          *,
          clients (name, phone),
          reservation_profits (type, amount)
        `)
        .order("start_time", { ascending: false });

      if (error) throw error;

      const formattedReservations = (data || []).map((res) => {
        const profits = res.reservation_profits || [];
        const depositPaid = profits.some((p: any) => p.type === 'deposit');
        const remainingPaid = profits.some((p: any) => p.type === 'remaining');

        return {
          id: res.id,
          clientName: res.clients?.name || "",
          phone: res.clients?.phone || "",
          date: new Date(res.start_time).toISOString().split("T")[0],
          time: new Date(res.start_time).toTimeString().split(" ")[0].slice(0, 5),
          endTime: new Date(res.end_time).toTimeString().split(" ")[0].slice(0, 5),
          duration: {
            hours: Math.floor(res.duration_minutes / 60),
            minutes: res.duration_minutes % 60,
          },
          hallName: res.hall_name,
          deposit: res.deposit_amount,
          totalPrice: res.total_price,
          status: res.status || 'pending',
          startedAt: res.started_at,
          depositPaid,
          remainingPaid,
        };
      });

      setReservations(formattedReservations);
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setError("حدث خطأ أثناء تحميل الحجوزات");
    } finally {
      setLoading(false);
    }
  };

  const checkTimeConflict = async (startTime: string, endTime: string, hallName: string, excludeId?: string) => {
    try {
      let query = supabase
        .from("reservations")
        .select("*")
        .eq("hall_name", hallName)
        .neq("status", "cancelled")
        .or(`and(start_time.lte.${endTime},end_time.gte.${startTime})`);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

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

  const addToTodayProfits = async (amount: number, type: 'deposit' | 'remaining', reservationId: string) => {
    try {
      const { error } = await supabase
        .from("reservation_profits")
        .insert([{
          reservation_id: reservationId,
          amount: amount,
          type: type,
          date: new Date().toISOString().split('T')[0]
        }]);

      if (error) throw error;
    } catch (err) {
      console.error("Error adding to profits:", err);
      throw err;
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

    const durationInMinutes = calculateDuration(formData.startTime, formData.endTime);
    if (durationInMinutes <= 0) {
      setError("وقت النهاية يجب أن يكون بعد وقت البداية");
      return;
    }

    // إنشاء أو البحث عن العميل
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .insert([
        {
          name: formData.clientName,
          phone: formData.phone,
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

    // إنشاء الحجوزات المتكررة
    const dates = generateRecurringDates(
      formData.date,
      formData.recurrence,
      formData.recurrenceEndDate,
      formData.occurrences
    );

    const reservationPromises = dates.map(async (date) => {
      const startDateTime = new Date(`${date}T${formData.startTime}`);
      const endDateTime = new Date(`${date}T${formData.endTime}`);

      const hasConflict = await checkTimeConflict(
        startDateTime.toISOString(),
        endDateTime.toISOString(),
        formData.hallName
      );

      if (hasConflict) {
        throw new Error(`هذا الموعد محجوز بالفعل في تاريخ ${date}، يرجى اختيار موعد آخر`);
      }

      const { data: reservationData, error: reservationError } = await supabase
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
            status: "pending",
            is_recurring: formData.recurrence !== 'none',
            recurrence_type: formData.recurrence,
            recurrence_end_date: formData.recurrenceEndDate || null,
          },
        ])
        .select()
        .single();

      if (reservationError) throw reservationError;

      if (Number(formData.deposit) > 0) {
        await addToTodayProfits(Number(formData.deposit), 'deposit', reservationData.id);
      }

      return reservationData;
    });

    await Promise.all(reservationPromises);
    await fetchReservations();

    // إعادة تعيين النموذج
    setFormData({
      clientName: "",
      phone: "",
      date: "",
      startTime: "",
      endTime: "",
      hallName: HALLS.LARGE,
      deposit: "",
      recurrence: "none",
      recurrenceEndDate: "",
      occurrences: 1,
    });
    setSelectedType("large");
  } catch (err: any) {
    console.error("Error saving reservation:", err);
    setError(err.message || "حدث خطأ أثناء حفظ الحجز");
  } finally {
    setLoading(false);
  }
};

  const handleStartReservation = async (reservation: ReservationWithProfit) => {
    if (!confirm("هل أنت متأكد من بدء هذا الحجز؟")) return;

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          status: "started",
          started_at: new Date().toISOString()
        })
        .eq("id", reservation.id);

      if (updateError) throw updateError;

      const remainingAmount = reservation.totalPrice - reservation.deposit;
      if (remainingAmount > 0) {
        await addToTodayProfits(remainingAmount, 'remaining', reservation.id);
      }

      await fetchReservations();
    } catch (err: any) {
      console.error("Error starting reservation:", err);
      setError(err.message || "حدث خطأ أثناء بدء الحجز");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (reservation: ReservationWithProfit) => {
    if (!confirm("هل أنت متأكد من إلغاء هذا الحجز؟")) return;

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservation.id);

      if (updateError) throw updateError;

      await fetchReservations();
    } catch (err: any) {
      console.error("Error cancelling reservation:", err);
      setError(err.message || "حدث خطأ أثناء إلغاء الحجز");
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

  const handleUpdateReservationTime = async () => {
    if (!editingReservation || !editEndTime) return;

    try {
      setLoading(true);
      setError(null);

      const durationInMinutes = calculateDuration(editingReservation.time, editEndTime);
      if (durationInMinutes <= 0) {
        setError("وقت النهاية يجب أن يكون بعد وقت البداية");
        return;
      }

      const startDateTime = new Date(`${editingReservation.date}T${editingReservation.time}`);
      const endDateTime = new Date(`${editingReservation.date}T${editEndTime}`);

      const hasConflict = await checkTimeConflict(
        startDateTime.toISOString(),
        endDateTime.toISOString(),
        editingReservation.hallName,
        editingReservation.id
      );

      if (hasConflict) {
        setError("هذا الموعد محجوز بالفعل، يرجى اختيار موعد آخر");
        return;
      }

      const hallPrice = editingReservation.hallName === HALLS.LARGE ? prices.largeHall : prices.smallHall;
      const totalPrice = (hallPrice / 60) * durationInMinutes;

      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          end_time: endDateTime.toISOString(),
          duration_minutes: durationInMinutes,
          total_price: totalPrice,
        })
        .eq("id", editingReservation.id);

      if (updateError) throw updateError;

      await fetchReservations();
      setEditingReservation(null);
      setEditEndTime("");
    } catch (err: any) {
      console.error("Error updating reservation time:", err);
      setError(err.message || "حدث خطأ أثناء تحديث وقت الحجز");
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'started':
        return 'bg-blue-500/20 text-blue-400';
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'started':
        return 'بدأ';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
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
      <div className="max-w-7xl mx-auto p-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6">حجز جديد</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="أدخل رقم الهاتف"
                    dir="ltr"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        ? "bg-orange-600 text-white border-orange-700"
                        : "bg-slate-800 text-orange-200 border-slate-600 hover:bg-slate-700"
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
                        ? "bg-indigo-600 text-white border-indigo-700"
                        : "bg-slate-800 text-indigo-200 border-slate-600 hover:bg-slate-700"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-blue-200 mb-2">
      التكرار
    </label>
    <select
      value={formData.recurrence}
      onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as RecurrenceType })}
      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      disabled={loading}
    >
      <option value="none">بدون تكرار</option>
      <option value="weekly">أسبوعي</option>
      <option value="biweekly">كل أسبوعين</option>
      <option value="monthly">شهري</option>
    </select>
  </div>

  {formData.recurrence !== 'none' && (
    <div>
      <label className="block text-sm font-medium text-blue-200 mb-2">
        تاريخ الانتهاء (اختياري)
      </label>
      <input
        type="date"
        value={formData.recurrenceEndDate}
        onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
        className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={loading}
      />
      <p className="text-xs text-slate-400 mt-1">اتركه فارغًا إذا كنت تريد تحديد عدد التكرارات</p>
    </div>
  )}

  {formData.recurrence !== 'none' && !formData.recurrenceEndDate && (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-blue-200 mb-2">
        عدد التكرارات (بما في ذلك الحجز الأصلي)
      </label>
      <input
        type="number"
        min="1"
        max="52"
        value={formData.occurrences}
        onChange={(e) => setFormData({ ...formData, occurrences: Number(e.target.value) })}
        className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={loading}
      />
    </div>
  )}
</div>
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
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
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
                  className={`h-12 rounded-lg flex flex-col items-center justify-center text-sm relative
                    ${day.isCurrentMonth ? 'text-white' : 'text-slate-500'}
                    ${day.isSelected ? 'bg-blue-600 text-white' : ''}
                    ${!day.isCurrentMonth ? 'opacity-50' : ''}
                    hover:bg-slate-600 transition-colors`}
                >
                  <span>{day.date.getDate()}</span>
                  {day.hasLargeHallReservations && (
                    <span className="absolute bottom-1 w-2 h-2 rounded-full bg-orange-400"></span>
                  )}
                  {day.hasSmallHallReservations && (
                    <span className="absolute bottom-1 w-2 h-2 rounded-full bg-indigo-400"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reservations List */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-white">
              {selectedDate 
                ? `الحجوزات في ${selectedDate.toLocaleDateString('ar-EG')}`
                : 'جميع الحجوزات'}
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث باسم العميل أو رقم الهاتف"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="rtl"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredReservations.length > 0 ? (
              filteredReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className={`bg-white/10 backdrop-blur-lg p-6 rounded-xl border ${
                    reservation.hallName === HALLS.LARGE 
                      ? 'border-orange-500/30' 
                      : 'border-indigo-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          {reservation.clientName}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reservation.status)}`}>
                          {getStatusText(reservation.status)}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-blue-200">
                          التاريخ: {reservation.date}
                        </p>
                        <p className="text-blue-200">
                          وقت البداية: {formatTimeTo12Hour(reservation.time)}
                        </p>
                        <p className="text-blue-200">
                          وقت الانتهاء: {formatTimeTo12Hour(reservation.endTime)}
                        </p>
                        <p className="text-blue-200">
                          المدة: {formatDurationDisplay(
                            reservation.duration.hours * 60 +
                              reservation.duration.minutes
                          )}
                        </p>
                        <p className={`${
                          reservation.hallName === HALLS.LARGE 
                            ? 'text-orange-400' 
                            : 'text-indigo-400'
                        }`}>
                          القاعة: {reservation.hallName}
                        </p>
                        {reservation.phone && (
                          <p className="text-blue-200 flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {reservation.phone}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <p className="text-white">
                          الإجمالي: {formatCurrency(reservation.totalPrice)}
                        </p>
                        <p className="text-emerald-400">
                          العربون: {formatCurrency(reservation.deposit)}
                          {reservation.depositPaid && <span className="text-green-400 mr-2">✓ تم إضافته للأرباح</span>}
                        </p>
                        <p className="text-blue-400">
                          المتبقي: {formatCurrency(reservation.totalPrice - reservation.deposit)}
                          {reservation.remainingPaid && <span className="text-green-400 mr-2">✓ تم إضافته للأرباح</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {reservation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStartReservation(reservation)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            disabled={loading}
                          >
                            <Play className="h-4 w-4" />
                            بدء الحجز
                          </button>
                          <button
                            onClick={() => handleCancelReservation(reservation)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                            disabled={loading}
                          >
                            <Square className="h-4 w-4" />
                            إلغاء الحجز
                          </button>
                        </>
                      )}
                      {editingReservation?.id === reservation.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="time"
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                          />
                          <button
                            onClick={handleUpdateReservationTime}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            disabled={loading}
                          >
                            حفظ التعديل
                          </button>
                          <button
                            onClick={() => {
                              setEditingReservation(null);
                              setEditEndTime("");
                            }}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingReservation(reservation);
                            setEditEndTime(reservation.endTime);
                          }}
                          className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                          disabled={loading}
                        >
                          تعديل وقت الانتهاء
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(reservation.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-2"
                        disabled={loading}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-slate-800/50 rounded-lg">
                <p className="text-slate-400">لا توجد حجوزات</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};