import React, { useState, useEffect } from "react";
import { Wrench, Plus, X, Calendar as CalendarIcon, Filter } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import ar from "date-fns/locale/ar";

registerLocale('ar', ar);

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  category: "maintenance" | "daily_expenses" | "salaries";
}

interface Revenue {
  total: number;
}

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "maintenance" as "maintenance" | "daily_expenses" | "salaries",
  });
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const formatGregorianDate = (date: Date) => {
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchTotalRevenue();
    }
  }, [user, timeFilter, selectedDate]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      let startDate, endDate;
      const date = selectedDate || new Date();
      
      if (timeFilter === 'daily') {
        startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
        endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();
      } else if (timeFilter === 'weekly') {
        startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay()).toISOString();
        endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + 7).toISOString();
      } else if (timeFilter === 'monthly') {
        startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();
      } else { // custom
        startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
        endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();
      }
      
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) throw error;

      setExpenses(
        data.map((record) => ({
          ...record,
          date: new Date(record.date),
        }))
      );

      // Update profit archive
      const today = new Date().toISOString().split("T")[0];
      const maintenance = getCategoryTotal("maintenance");
      const dailyExpenses = getCategoryTotal("daily_expenses");
      const salaries = getCategoryTotal("salaries");
      const totalExp = maintenance + dailyExpenses + salaries;
      const net = totalRevenue - totalExp;

      const { error: archiveError } = await supabase.from("profit_archive").upsert([
        {
          date: today,
          maintenance,
          daily_expenses: dailyExpenses,
          salaries,
          total_expenses: totalExp,
          net_profit: net,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: ['date'] });

      if (archiveError) {
        console.error("فشل حفظ البيانات في profit_archive:", archiveError);
      }
    } catch (err) {
      console.error("Error fetching expenses:", err);
      setError("حدث خطأ أثناء تحميل السجلات");
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalRevenue = async () => {
    try {
      // Get total from visits
      const { data: visitsData, error: visitsError } = await supabase
        .from("visits")
        .select("total_amount");

      if (visitsError) throw visitsError;

      // Get total from subscriptions
      const { data: subscriptionsData, error: subscriptionsError } =
        await supabase.from("subscriptions").select("price");

      if (subscriptionsError) throw subscriptionsError;

      // Get total from reservations
      const { data: reservationsData, error: reservationsError } =
        await supabase.from("reservations").select("total_price");

      if (reservationsError) throw reservationsError;

      const totalFromVisits = (visitsData || []).reduce(
        (sum, visit) => sum + (visit.total_amount || 0),
        0
      );
      const totalFromSubscriptions = (subscriptionsData || []).reduce(
        (sum, sub) => sum + (sub.price || 0),
        0
      );
      const totalFromReservations = (reservationsData || []).reduce(
        (sum, res) => sum + (res.total_price || 0),
        0
      );

      setTotalRevenue(
        totalFromVisits + totalFromSubscriptions + totalFromReservations
      );
    } catch (err) {
      console.error("Error fetching revenue:", err);
      setError("حدث خطأ أثناء حساب الإيرادات");
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

      const { error } = await supabase.from("expenses").insert([
        {
          description: formData.description,
          amount: Number(formData.amount),
          date: new Date(formData.date).toISOString(),
          category: formData.category,
        },
      ]);

      if (error) throw error;

      await fetchExpenses();
      setFormData({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "maintenance",
      });
      setShowAddForm(false);
    } catch (err: any) {
      console.error("Error saving expense record:", err);
      setError(err?.message || JSON.stringify(err) || "حدث خطأ أثناء حفظ السجل");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTotal = (category: string) => {
    return expenses
      .filter((expense) => expense.category === category)
      .reduce((sum, record) => sum + record.amount, 0);
  };

  const totalMaintenance = getCategoryTotal("maintenance");
  const totalDailyExpenses = getCategoryTotal("daily_expenses");
  const totalSalaries = getCategoryTotal("salaries");
  const totalExpenses = expenses.reduce((sum, record) => sum + record.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-EG")} جنيه`;
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case "maintenance":
        return "صيانة";
      case "daily_expenses":
        return "مصروف يومي";
      case "salaries":
        return "مرتبات";
      default:
        return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "maintenance":
        return "text-blue-400";
      case "daily_expenses":
        return "text-yellow-400";
      case "salaries":
        return "text-purple-400";
      default:
        return "text-white";
    }
  };

  const TimeFilterButton = ({ value, label }: { value: typeof timeFilter; label: string }) => (
    <button
      onClick={() => {
        setTimeFilter(value);
        if (value !== 'custom') {
          setSelectedDate(new Date());
        }
      }}
      className={`px-4 py-2 rounded-lg transition-colors ${
        timeFilter === value 
          ? 'bg-blue-600 text-white' 
          : 'bg-white/10 text-slate-300 hover:bg-white/20'
      }`}
    >
      {label}
    </button>
  );

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      setTimeFilter('custom');
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wrench className="h-8 w-8 text-blue-400" />
            المصروفات
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="flex gap-2 bg-white/10 backdrop-blur-lg p-1 rounded-lg border border-white/20">
              <TimeFilterButton value="daily" label="اليوم" />
              <TimeFilterButton value="weekly" label="الأسبوع" />
              <TimeFilterButton value="monthly" label="الشهر" />
              <TimeFilterButton value="custom" label="اختر تاريخ" />
            </div>

            {timeFilter === 'custom' && (
              <div className="relative z-50">
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  locale={ar}
                  dateFormat="yyyy/MM/dd"
                  placeholderText="اختر تاريخ"
                  className="bg-white/10 backdrop-blur-lg border border-white/20 text-white p-2 rounded-lg w-full sm:w-48 text-center"
                  isClearable
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  withPortal
                  popperPlacement="bottom-end"
                  popperClassName="z-50"
                  calendarClassName="bg-slate-800 border border-white/20 text-white"
                  wrapperClassName="z-50"
                />
              </div>
            )}
            
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              إضافة مصروف
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
            <h3 className="text-sm font-medium text-slate-400 mb-2">
              إجمالي الإيرادات
            </h3>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
            <h3 className="text-sm font-medium text-slate-400 mb-2">
              إجمالي المصروفات
            </h3>
            <p className="text-2xl font-bold text-red-400">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
            <h3 className="text-sm font-medium text-slate-400 mb-2">
              صافي الربح
            </h3>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCurrency(netProfit)}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
            <h3 className="text-sm font-medium text-slate-400 mb-2">
              الفترة المحددة
            </h3>
            <p className="text-xl font-bold text-white">
              {timeFilter === 'daily' && selectedDate && formatGregorianDate(selectedDate)}
              {timeFilter === 'weekly' && selectedDate && `أسبوع ${selectedDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`}
              {timeFilter === 'monthly' && selectedDate && `${selectedDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`}
              {timeFilter === 'custom' && selectedDate && formatGregorianDate(selectedDate)}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-500/10 backdrop-blur-lg p-6 rounded-xl border border-blue-500/20">
            <h3 className="text-sm font-medium text-blue-400 mb-2">
              إجمالي الصيانة
            </h3>
            <p className="text-2xl font-bold text-blue-400">
              {formatCurrency(totalMaintenance)}
            </p>
          </div>
          <div className="bg-yellow-500/10 backdrop-blur-lg p-6 rounded-xl border border-yellow-500/20">
            <h3 className="text-sm font-medium text-yellow-400 mb-2">
              إجمالي المصروف اليومي
            </h3>
            <p className="text-2xl font-bold text-yellow-400">
              {formatCurrency(totalDailyExpenses)}
            </p>
          </div>
          <div className="bg-purple-500/10 backdrop-blur-lg p-6 rounded-xl border border-purple-500/20">
            <h3 className="text-sm font-medium text-purple-400 mb-2">
              إجمالي المرتبات
            </h3>
            <p className="text-2xl font-bold text-purple-400">
              {formatCurrency(totalSalaries)}
            </p>
          </div>
        </div>

        {/* Add Expense Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  إضافة مصروف جديد
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    وصف المصروف
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    المبلغ (جنيه)
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                    required
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    التصنيف
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="maintenance">صيانة</option>
                    <option value="daily_expenses">مصروف يومي</option>
                    <option value="salaries">مرتبات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-6"
                  disabled={loading}
                >
                  {loading ? "جاري الحفظ..." : "حفظ"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Expenses Records */}
        <div className="space-y-4">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-white">
                      {expense.description}
                    </h3>
                    <span className={`text-sm px-2 py-1 rounded-full ${getCategoryColor(expense.category)} bg-opacity-20`}>
                      {getCategoryName(expense.category)}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-2">
                    {formatGregorianDate(expense.date)}
                  </p>
                </div>
                <p className="text-xl font-bold text-red-400">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
            </div>
          ))}

          {!loading && expenses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-slate-400">لا توجد سجلات مصروفات</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Expenses;