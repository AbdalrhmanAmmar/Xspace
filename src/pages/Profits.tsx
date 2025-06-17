import React, { useState, useEffect } from "react";
import { DollarSign, Package, Users, Calendar as CalendarIcon, CreditCard } from "lucide-react";
import { supabase } from "../lib/supabase";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ar } from "date-fns/locale";

interface Revenue {
  hourlyRevenue: number;
  subscriptionRevenue: number;
  reservationRevenue: number;
  productRevenue: number;
  totalRevenue: number;
  productProfit: number;
}

interface RevenueByPeriod {
  daily: Revenue;
  weekly: Revenue;
  monthly: Revenue;
  custom: Revenue;
}

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'custom';

function Profits() {
  const [revenue, setRevenue] = useState<RevenueByPeriod>({
    daily: { hourlyRevenue: 0, subscriptionRevenue: 0, reservationRevenue: 0, productRevenue: 0, totalRevenue: 0, productProfit: 0 },
    weekly: { hourlyRevenue: 0, subscriptionRevenue: 0, reservationRevenue: 0, productRevenue: 0, totalRevenue: 0, productProfit: 0 },
    monthly: { hourlyRevenue: 0, subscriptionRevenue: 0, reservationRevenue: 0, productRevenue: 0, totalRevenue: 0, productProfit: 0 },
    custom: { hourlyRevenue: 0, subscriptionRevenue: 0, reservationRevenue: 0, productRevenue: 0, totalRevenue: 0, productProfit: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('daily');
  const [customDate, setCustomDate] = useState<Date | null>(new Date());

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async (selectedDate?: Date) => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: visitsData } = await supabase.from("visits").select("total_amount, created_at");
      const { data: deletedVisitsData } = await supabase.from("deleted_visit").select("total_amount, start_time, time_amount, product_amount");

      const allVisitsData = [
        ...(visitsData || []).map(v => ({ amount: parseFloat(v.total_amount) || 0, created_at: v.created_at })),
        ...(deletedVisitsData || []).map(v => ({ amount: parseFloat(v.total_amount) || parseFloat(v.time_amount) || 0, created_at: v.start_time }))
      ];

      const { data: subscriptionsData } = await supabase.from("subscriptions").select("price, created_at");
      const { data: reservationsData } = await supabase.from("reservations").select("total_price, created_at");

      const { data: visitProductsData } = await supabase.from("visit_products").select("price, quantity, created_at");
      const { data: deletedVisitProductsData } = await supabase.from("deleted_visit_products").select("price, quantity, created_at");
      const { data: productSalesData } = await supabase.from("product_sales").select("price, buy_price, quantity, created_at");

      const allProductsData = [
        ...(visitProductsData || []),
        ...(deletedVisitProductsData || []),
        ...(productSalesData || [])
      ];

      const calculatePeriodRevenue = (startDate: Date, endDate?: Date): Revenue => {
        const filterByDate = (date: string) => {
          const created = new Date(date);
          if (endDate) {
            return created >= startDate && created <= endDate;
          }
          return created >= startDate;
        };

        const hourlyRevenue = allVisitsData.filter(v => filterByDate(v.created_at)).reduce((sum, v) => sum + (v.amount || 0), 0);
        const subscriptionRevenue = (subscriptionsData || []).filter(s => filterByDate(s.created_at)).reduce((sum, s) => sum + (s.price || 0), 0);
        const reservationRevenue = (reservationsData || []).filter(r => filterByDate(r.created_at)).reduce((sum, r) => sum + (r.total_price || 0), 0);
        const productRevenue = allProductsData.filter(p => filterByDate(p.created_at)).reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (p.quantity || 1)), 0);

        let productProfit = 0;

        productProfit += (productSalesData || []).filter(p => filterByDate(p.created_at)).reduce((sum, p) => {
          const sellPrice = parseFloat(p.price) || 0;
          const buyPrice = p.buy_price !== undefined ? parseFloat(p.buy_price) : sellPrice * 0.7;
          const quantity = p.quantity || 1;
          return sum + ((sellPrice - buyPrice) * quantity);
        }, 0);

        const totalRevenue = hourlyRevenue + subscriptionRevenue + reservationRevenue + productRevenue;

        return { hourlyRevenue, subscriptionRevenue, reservationRevenue, productRevenue, totalRevenue, productProfit };
      };

      const dailyData = calculatePeriodRevenue(startOfDay);
      const weeklyData = calculatePeriodRevenue(startOfWeek);
      const monthlyData = calculatePeriodRevenue(startOfMonth);
      const customData = selectedDate 
        ? calculatePeriodRevenue(
            new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()),
            timeFilter === 'monthly' 
              ? new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
              : undefined
          )
        : { hourlyRevenue: 0, subscriptionRevenue: 0, reservationRevenue: 0, productRevenue: 0, totalRevenue: 0, productProfit: 0 };

      setRevenue({
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData,
        custom: customData
      });

      const today = new Date().toISOString().split("T")[0];
      await supabase.from("profit_archive").upsert([
        {
          date: today,
          hourly_revenue: dailyData.hourlyRevenue,
          subscription_revenue: dailyData.subscriptionRevenue,
          reservation_revenue: dailyData.reservationRevenue,
          product_revenue: dailyData.productRevenue,
          total_revenue: dailyData.totalRevenue,
          net_profit: dailyData.productProfit,
          maintenance: 0,
          daily_expenses: 0,
          salaries: 0,
          total_expenses: 0,
          notes: "تم الحفظ تلقائيًا من Profits component",
          updated_at: new Date().toISOString()
        }
      ], { onConflict: ["date"] });
    } catch (err) {
      console.error("Error fetching revenue:", err);
      setError("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: Date | null) => {
    setCustomDate(date);
    if (date) {
      fetchRevenue(date);
    }
  };

  const handleFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    if (filter !== 'custom') {
      fetchRevenue();
    } else if (customDate) {
      fetchRevenue(customDate);
    }
  };

  const formatCurrency = (amount: number) => `${amount.toLocaleString("ar-EG")} جنيه`;

  const RevenueCard = ({ title, icon: Icon, amount, color }: { title: string; icon: any; amount: number; color: string }) => (
    <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-400">{title}</h3>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(amount)}</p>
        </div>
      </div>
    </div>
  );

  const TimeFilterButton = ({ value, label, onClick }: { value: TimeFilter; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-colors ${
        timeFilter === value 
          ? 'bg-blue-600 text-white' 
          : 'bg-white/10 text-slate-300 hover:bg-white/20'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white">الأرباح والإيرادات (شامل المحذوف)</h1>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="flex gap-2 bg-white/10 backdrop-blur-lg p-1 rounded-lg border border-white/20">
              <TimeFilterButton value="daily" label="اليوم" onClick={() => handleFilterChange('daily')} />
              <TimeFilterButton value="weekly" label="الأسبوع" onClick={() => handleFilterChange('weekly')} />
              <TimeFilterButton value="monthly" label="الشهر" onClick={() => handleFilterChange('monthly')} />
              <TimeFilterButton value="custom" label="اختر تاريخ" onClick={() => handleFilterChange('custom')} />
            </div>

            {timeFilter === 'custom' && (
              <div className="relative z-50">
                <DatePicker
                  selected={customDate}
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
          </div>
        </div>
        
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">{error}</div>}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl text-slate-400">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {timeFilter === 'custom' && customDate && (
              <h2 className="text-xl font-semibold text-white">
                {timeFilter === 'monthly' 
                  ? `إيرادات شهر ${customDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`
                  : `إيرادات يوم ${customDate.toLocaleDateString('ar-EG')}`}
              </h2>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <RevenueCard 
                title="إيرادات الساعات (شامل المحذوف)" 
                icon={Users} 
                amount={revenue[timeFilter].hourlyRevenue} 
                color="bg-blue-600" 
              />
              <RevenueCard 
                title="إيرادات الاشتراكات" 
                icon={CreditCard} 
                amount={revenue[timeFilter].subscriptionRevenue} 
                color="bg-green-600" 
              />
              <RevenueCard 
                title="إيرادات الحجوزات" 
                icon={CalendarIcon} 
                amount={revenue[timeFilter].reservationRevenue} 
                color="bg-purple-600" 
              />
              <RevenueCard 
                title="إيرادات المنتجات (شامل المحذوف)" 
                icon={Package} 
                amount={revenue[timeFilter].productRevenue} 
                color="bg-orange-600" 
              />
              <RevenueCard 
                title="صافي ربح المنتجات (شامل المحذوف)" 
                icon={DollarSign} 
                amount={revenue[timeFilter].productProfit} 
                color="bg-lime-600" 
              />
              <div className="md:col-span-2 lg:col-span-3">
                <RevenueCard 
                  title="إجمالي الإيرادات" 
                  icon={DollarSign} 
                  amount={revenue[timeFilter].totalRevenue} 
                  color="bg-emerald-600" 
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profits;