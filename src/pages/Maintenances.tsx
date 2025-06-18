import React, { useState, useEffect } from "react";
import { Wrench, Plus, X, Calendar as CalendarIcon, Filter, User, Trash2, ChevronDown, Search } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import ar from "date-fns/locale/ar";

registerLocale('ar', ar);

interface ExpensePerson {
  id: string;
  person_name: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  category: "maintenance" | "daily_expenses" | "salaries";
  people?: ExpensePerson[];
}

interface Revenue {
  totalRevenue: number;
  hourlyRevenue: number;
  subscriptionRevenue: number;
  reservationRevenue: number;
  productRevenue: number;
  productProfit: number;
}

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<Revenue>({
    totalRevenue: 0,
    hourlyRevenue: 0,
    subscriptionRevenue: 0,
    reservationRevenue: 0,
    productRevenue: 0,
    productProfit: 0
  });
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
  const [peopleNames, setPeopleNames] = useState<string[]>([""]);
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [personSearchTerm, setPersonSearchTerm] = useState("");

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
      fetchSavedNames();
    }
  }, [user, timeFilter, selectedDate]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, personSearchTerm]);

  const filterExpenses = () => {
    if (!personSearchTerm.trim()) {
      setFilteredExpenses(expenses);
      return;
    }

    const searchTermLower = personSearchTerm.toLowerCase();
    const filtered = expenses.filter(expense => {
      // بحث في وصف المصروف
      if (expense.description.toLowerCase().includes(searchTermLower)) {
        return true;
      }
      
      // بحث في أسماء الأشخاص
      if (expense.people && expense.people.length > 0) {
        return expense.people.some(person => 
          person.person_name.toLowerCase().includes(searchTermLower)
        );
      }
      
      return false;
    });
    
    setFilteredExpenses(filtered);
  };

  const fetchSavedNames = async () => {
    try {
      const { data, error } = await supabase
        .from("expense_people")
        .select("person_name")
        .order("person_name");

      if (error) throw error;

      // استخراج الأسماء الفريدة
      const uniqueNames = [...new Set(data.map(item => item.person_name))];
      setSavedNames(uniqueNames);
    } catch (err) {
      console.error("Error fetching saved names:", err);
    }
  };

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
        .select(`
          *,
          expense_people (
            id,
            person_name
          )
        `)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) throw error;

      const formattedExpenses = data.map((record) => ({
        ...record,
        date: new Date(record.date),
        people: record.expense_people || []
      }));

      setExpenses(formattedExpenses);
      setFilteredExpenses(formattedExpenses);

      // Update profit archive
      const today = new Date().toISOString().split("T")[0];
      const maintenance = getCategoryTotal("maintenance");
      const dailyExpenses = getCategoryTotal("daily_expenses");
      const salaries = getCategoryTotal("salaries");
      const totalExp = maintenance + dailyExpenses + salaries;
      const net = totalRevenue.totalRevenue - totalExp;

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
      const date = selectedDate || new Date();
      const dateString = date.toISOString().split('T')[0];
      
      console.log(`محاولة جلب الإيرادات للتاريخ: ${dateString}`);
      
      // محاولة جلب البيانات من profit_archive أولاً
      const { data: archiveData, error: archiveError } = await supabase
        .from("profit_archive")
        .select("*")
        .eq("date", dateString)
        .single();

      if (archiveData && !archiveError) {
        console.log(`تم جلب الإيرادات من الأرشيف للتاريخ ${dateString}:`, archiveData);
        setTotalRevenue({
          totalRevenue: parseFloat(archiveData.total_revenue) || 0,
          hourlyRevenue: parseFloat(archiveData.hourly_revenue) || 0,
          subscriptionRevenue: parseFloat(archiveData.subscription_revenue) || 0,
          reservationRevenue: parseFloat(archiveData.reservation_revenue) || 0,
          productRevenue: parseFloat(archiveData.product_revenue) || 0,
          productProfit: parseFloat(archiveData.product_profit) || 0,
        });
        return;
      }

      // إذا لم توجد في الأرشيف، احسبها من الجداول الأصلية
      console.log(`لم توجد إيرادات في الأرشيف للتاريخ ${dateString}، سيتم الحساب من الجداول الأصلية`);
      
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Get total from visits (including deleted)
      const { data: visitsData, error: visitsError } = await supabase
        .from("visits")
        .select("total_amount, created_at")
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", endOfDay.toISOString());

      if (visitsError) throw visitsError;

      const { data: deletedVisitsData, error: deletedVisitsError } = await supabase
        .from("deleted_visit")
        .select("total_amount, start_time, time_amount")
        .gte("start_time", startOfDay.toISOString())
        .lt("start_time", endOfDay.toISOString());

      if (deletedVisitsError) throw deletedVisitsError;

      // Get total from subscriptions
      const { data: subscriptionsData, error: subscriptionsError } =
        await supabase
          .from("subscriptions")
          .select("price, created_at")
          .gte("created_at", startOfDay.toISOString())
          .lt("created_at", endOfDay.toISOString());

      if (subscriptionsError) throw subscriptionsError;

      // Get total from reservations
      const { data: reservationsData, error: reservationsError } =
        await supabase
          .from("reservations")
          .select("total_price, created_at")
          .gte("created_at", startOfDay.toISOString())
          .lt("created_at", endOfDay.toISOString());

      if (reservationsError) throw reservationsError;

      // Get product revenue and profit
      const { data: visitProductsData } = await supabase
        .from("visit_products")
        .select("price, quantity, created_at")
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", endOfDay.toISOString());

      const { data: deletedVisitProductsData } = await supabase
        .from("deleted_visit_products")
        .select("price, quantity, created_at")
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", endOfDay.toISOString());

      const { data: productSalesData } = await supabase
        .from("product_sales")
        .select("price, buy_price, quantity, profit, created_at")
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", endOfDay.toISOString());

      // Calculate revenues
      const hourlyRevenue = [
        ...(visitsData || []).map(v => parseFloat(v.total_amount) || 0),
        ...(deletedVisitsData || []).map(v => parseFloat(v.total_amount) || parseFloat(v.time_amount) || 0)
      ].reduce((sum, amount) => sum + amount, 0);

      const subscriptionRevenue = (subscriptionsData || []).reduce(
        (sum, sub) => sum + (sub.price || 0),
        0
      );

      const reservationRevenue = (reservationsData || []).reduce(
        (sum, res) => sum + (res.total_price || 0),
        0
      );

      const productRevenue = [
        ...(visitProductsData || []),
        ...(deletedVisitProductsData || []),
        ...(productSalesData || [])
      ].reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (p.quantity || 1)), 0);

      const productProfit = (productSalesData || []).reduce((sum, sale) => sum + (sale.profit || 0), 0);

      const totalRev = hourlyRevenue + subscriptionRevenue + reservationRevenue + productRevenue;

      setTotalRevenue({
        totalRevenue: totalRev,
        hourlyRevenue,
        subscriptionRevenue,
        reservationRevenue,
        productRevenue,
        productProfit
      });

      // حفظ البيانات في الأرشيف إذا لم تكن موجودة
      try {
        await supabase.from("profit_archive").upsert([
          {
            date: dateString,
            hourly_revenue: hourlyRevenue,
            subscription_revenue: subscriptionRevenue,
            reservation_revenue: reservationRevenue,
            product_revenue: productRevenue,
            product_profit: productProfit,
            total_revenue: totalRev,
            maintenance: 0,
            daily_expenses: 0,
            salaries: 0,
            total_expenses: 0,
            net_profit: totalRev + productProfit,
            notes: "تم الحفظ تلقائيًا من Maintenances component",
            updated_at: new Date().toISOString()
          }
        ], { onConflict: ["date"] });
        console.log(`تم حفظ الإيرادات في الأرشيف للتاريخ ${dateString}`);
      } catch (archiveError) {
        console.error("فشل حفظ الإيرادات في profit_archive:", archiveError);
      }

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

      // إنشاء المصروف
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert([
          {
            description: formData.description,
            amount: Number(formData.amount),
            date: new Date(formData.date).toISOString(),
            category: formData.category,
          },
        ])
        .select()
        .single();

      if (expenseError) throw expenseError;

      // إضافة أسماء الأشخاص إذا كان المصروف يومي
      if (formData.category === "daily_expenses" && peopleNames.some(name => name.trim())) {
        const validNames = peopleNames.filter(name => name.trim());
        const peopleData = validNames.map(name => ({
          expense_id: expenseData.id,
          person_name: name.trim()
        }));

        const { error: peopleError } = await supabase
          .from("expense_people")
          .insert(peopleData);

        if (peopleError) throw peopleError;
      }

      await fetchExpenses();
      await fetchSavedNames(); // تحديث قائمة الأسماء المحفوظة
      setFormData({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "maintenance",
      });
      setPeopleNames([""]);
      setShowAddForm(false);
    } catch (err: any) {
      console.error("Error saving expense record:", err);
      setError(err?.message || JSON.stringify(err) || "حدث خطأ أثناء حفظ السجل");
    } finally {
      setLoading(false);
    }
  };

  const addPersonField = () => {
    setPeopleNames([...peopleNames, ""]);
  };

  const removePersonField = (index: number) => {
    if (peopleNames.length > 1) {
      setPeopleNames(peopleNames.filter((_, i) => i !== index));
    }
  };

  const updatePersonName = (index: number, name: string) => {
    const updated = [...peopleNames];
    updated[index] = name;
    setPeopleNames(updated);
  };

  const selectSavedName = (index: number, selectedName: string) => {
    const updated = [...peopleNames];
    updated[index] = selectedName;
    setPeopleNames(updated);
  };

  const getCategoryTotal = (category: string) => {
    return filteredExpenses
      .filter((expense) => expense.category === category)
      .reduce((sum, record) => sum + record.amount, 0);
  };

  const totalMaintenance = getCategoryTotal("maintenance");
  const totalDailyExpenses = getCategoryTotal("daily_expenses");
  const totalSalaries = getCategoryTotal("salaries");
  const totalExpenses = filteredExpenses.reduce((sum, record) => sum + record.amount, 0);
  const netProfit = totalRevenue.totalRevenue - totalExpenses;

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
          <h1 className="text-3xl font-bold text-white">المصروفات</h1>
          
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

        {/* بحث عن مصروف حسب اسم الشخص */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={personSearchTerm}
              onChange={(e) => setPersonSearchTerm(e.target.value)}
              placeholder="ابحث عن مصروف أو اسم شخص..."
              className="w-full pl-4 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400"
              dir="rtl"
            />
          </div>
          {personSearchTerm && (
            <div className="mt-2 text-sm text-slate-400">
              {filteredExpenses.length === 0 
                ? "لا توجد نتائج مطابقة للبحث" 
                : `تم العثور على ${filteredExpenses.length} نتيجة`}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
            <h3 className="text-sm font-medium text-slate-400 mb-2">
              إجمالي الإيرادات (من الأرشيف)
            </h3>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(totalRevenue.totalRevenue)}
            </p>
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              <div>الساعات: {formatCurrency(totalRevenue.hourlyRevenue)}</div>
              <div>الاشتراكات: {formatCurrency(totalRevenue.subscriptionRevenue)}</div>
              <div>الحجوزات: {formatCurrency(totalRevenue.reservationRevenue)}</div>
              <div>المنتجات: {formatCurrency(totalRevenue.productRevenue)}</div>
              <div>ربح المنتجات: {formatCurrency(totalRevenue.productProfit)}</div>
            </div>
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
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  إضافة مصروف جديد
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setPeopleNames([""]);
                  }}
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
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        category: e.target.value as any,
                      });
                      // إعادة تعيين أسماء الأشخاص عند تغيير التصنيف
                      if (e.target.value !== "daily_expenses") {
                        setPeopleNames([""]);
                      }
                    }}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="maintenance">صيانة</option>
                    <option value="daily_expenses">مصروف يومي</option>
                    <option value="salaries">مرتبات</option>
                  </select>
                </div>

                {/* إضافة أسماء الأشخاص للمصروف اليومي */}
                {formData.category === "daily_expenses" && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-slate-300">
                        أسماء الأشخاص (اختياري)
                      </label>
                      <button
                        type="button"
                        onClick={addPersonField}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        إضافة شخص
                      </button>
                    </div>
                    <div className="space-y-2">
                      {peopleNames.map((name, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => updatePersonName(index, e.target.value)}
                              placeholder={`اسم الشخص ${index + 1}`}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                              dir="rtl"
                            />
                            {savedNames.length > 0 && (
                              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                                <button
                                  type="button"
                                  className="text-slate-400 hover:text-white"
                                  onClick={() => {
                                    const dropdown = document.getElementById(`names-dropdown-${index}`);
                                    if (dropdown) {
                                      dropdown.classList.toggle('hidden');
                                    }
                                  }}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                                <div 
                                  id={`names-dropdown-${index}`}
                                  className="absolute left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 hidden"
                                >
                                  {savedNames.map((savedName, i) => (
                                    <div
                                      key={i}
                                      className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-white text-right"
                                      onClick={() => {
                                        selectSavedName(index, savedName);
                                        const dropdown = document.getElementById(`names-dropdown-${index}`);
                                        if (dropdown) {
                                          dropdown.classList.add('hidden');
                                        }
                                      }}
                                    >
                                      {savedName}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {peopleNames.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePersonField(index)}
                              className="text-red-400 hover:text-red-300 p-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
          {loading && filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-400 mt-4">جاري تحميل المصروفات...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-lg">
              <p className="text-xl text-slate-400">
                {personSearchTerm ? "لا توجد نتائج مطابقة للبحث" : "لا توجد سجلات مصروفات"}
              </p>
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className={`bg-white/10 backdrop-blur-lg p-6 rounded-xl border ${
                  personSearchTerm && expense.people?.some(p => p.person_name.toLowerCase().includes(personSearchTerm.toLowerCase()))
                    ? "border-yellow-500/50"
                    : "border-white/20"
                } transition-all`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
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
                    
                    {/* عرض أسماء الأشخاص إذا كان مصروف يومي */}
                    {expense.category === "daily_expenses" && expense.people && expense.people.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-slate-300 mb-2 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          الأشخاص:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {expense.people.map((person) => (
                            <span
                              key={person.id}
                              className={`px-2 py-1 rounded-full text-sm ${
                                personSearchTerm && person.person_name.toLowerCase().includes(personSearchTerm.toLowerCase())
                                  ? "bg-yellow-500/40 text-yellow-200 font-bold"
                                  : "bg-yellow-500/20 text-yellow-300"
                              }`}
                            >
                              {person.person_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xl font-bold text-red-400">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Expenses;