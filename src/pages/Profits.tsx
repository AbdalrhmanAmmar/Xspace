import React, { useState, useEffect } from "react";
import { DollarSign, Package, Users, Calendar, CreditCard } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Revenue {
  hourlyRevenue: number;
  subscriptionRevenue: number;
  reservationRevenue: number;
  productRevenue: number;
  totalRevenue: number;
  productProfit: number; // ✅ صافي الربح من المنتجات
}

interface RevenueByPeriod {
  daily: Revenue;
  weekly: Revenue;
  monthly: Revenue;
}

function Profits() {
  const [revenue, setRevenue] = useState<RevenueByPeriod>({
    daily: { hourlyRevenue: 0, subscriptionRevenue: 0, reservationRevenue: 0, productRevenue: 0, totalRevenue: 0, productProfit: 0 },
    weekly: { hourlyRevenue: 0, subscriptionRevenue: 0, reservationRevenue: 0, productRevenue: 0, totalRevenue: 0, productProfit: 0 },
    monthly: { hourlyRevenue: 0, subscriptionRevenue: 0, reservationRevenue: 0, productRevenue: 0, totalRevenue: 0, productProfit: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // جلب بيانات الزيارات العادية
      const { data: visitsData } = await supabase.from("visits").select("total_amount, created_at");
      
      // جلب بيانات الزيارات المحذوفة
      const { data: deletedVisitsData } = await supabase.from("deleted_visit").select("total_amount, start_time, time_amount, product_amount");

      // دمج بيانات الزيارات العادية والمحذوفة
      const allVisitsData = [
        ...(visitsData || []).map(v => ({ 
          amount: parseFloat(v.total_amount) || 0,
          created_at: v.created_at 
        })),
        ...(deletedVisitsData || []).map(v => ({ 
          amount: parseFloat(v.total_amount) || parseFloat(v.time_amount) || 0,
          created_at: v.start_time 
        }))
      ];

      const { data: subscriptionsData } = await supabase.from("subscriptions").select("price, created_at");
      const { data: reservationsData } = await supabase.from("reservations").select("total_price, created_at");

      // جلب بيانات منتجات الزيارات العادية
      const { data: visitProductsData } = await supabase.from("visit_products").select("price, quantity, created_at");
      
      // جلب بيانات منتجات الزيارات المحذوفة
      const { data: deletedVisitProductsData } = await supabase.from("deleted_visit_products").select("price, quantity, created_at");
      
      // جلب بيانات مبيعات المنتجات
      const { data: productSalesData } = await supabase.from("product_sales").select("price, buy_price, quantity, created_at");

      // دمج جميع بيانات المنتجات
      const allProductsData = [
        ...(visitProductsData || []),
        ...(deletedVisitProductsData || []),
        ...(productSalesData || [])
      ];

      const calculatePeriodRevenue = (startDate: Date): Revenue => {
        // إيرادات الزيارات (الساعات) - تشمل العادية والمحذوفة
        const hourlyRevenue = allVisitsData
          .filter(v => new Date(v.created_at) >= startDate)
          .reduce((sum, v) => sum + (v.amount || 0), 0);

        // إيرادات الاشتراكات
        const subscriptionRevenue = (subscriptionsData || [])
          .filter(s => new Date(s.created_at) >= startDate)
          .reduce((sum, s) => sum + (s.price || 0), 0);

        // إيرادات الحجوزات
        const reservationRevenue = (reservationsData || [])
          .filter(r => new Date(r.created_at) >= startDate)
          .reduce((sum, r) => sum + (r.total_price || 0), 0);

        // إيرادات المنتجات - تشمل العادية والمحذوفة
        const productRevenue = allProductsData
          .filter(p => new Date(p.created_at) >= startDate)
          .reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (p.quantity || 1)), 0);

        // صافي ربح المنتجات (سعر البيع - سعر الشراء) - فقط من product_sales
        const productProfit = (productSalesData || [])
          .filter(p => new Date(p.created_at) >= startDate)
          .reduce((sum, p) => {
            const sellPrice = parseFloat(p.price) || 0;
            const buyPrice = parseFloat(p.buy_price) || 0;
            const quantity = p.quantity || 1;
            return sum + ((sellPrice - buyPrice) * quantity);
          }, 0);

        // إجمالي الإيرادات
        const totalRevenue = hourlyRevenue + subscriptionRevenue + reservationRevenue + productRevenue;

        return {
          hourlyRevenue,
          subscriptionRevenue,
          reservationRevenue,
          productRevenue,
          totalRevenue,
          productProfit,
        };
      };

      setRevenue({
        daily: calculatePeriodRevenue(startOfDay),
        weekly: calculatePeriodRevenue(startOfWeek),
        monthly: calculatePeriodRevenue(startOfMonth),
      });
    } catch (err) {
      console.error("Error fetching revenue:", err);
      setError("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
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

  const PeriodSection = ({ title, data }: { title: string; data: Revenue }) => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RevenueCard title="إيرادات الساعات (شامل المحذوف)" icon={Users} amount={data.hourlyRevenue} color="bg-blue-600" />
        <RevenueCard title="إيرادات الاشتراكات" icon={CreditCard} amount={data.subscriptionRevenue} color="bg-green-600" />
        <RevenueCard title="إيرادات الحجوزات" icon={Calendar} amount={data.reservationRevenue} color="bg-purple-600" />
        <RevenueCard title="إيرادات المنتجات (شامل المحذوف)" icon={Package} amount={data.productRevenue} color="bg-orange-600" />
        <RevenueCard title="صافي ربح المنتجات" icon={DollarSign} amount={data.productProfit} color="bg-lime-600" />
        <div className="md:col-span-2 lg:col-span-3">
          <RevenueCard title="إجمالي الإيرادات" icon={DollarSign} amount={data.totalRevenue} color="bg-emerald-600" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-8">الأرباح والإيرادات (شامل المحذوف)</h1>
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">{error}</div>}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl text-slate-400">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <div className="space-y-12">
            <PeriodSection title="إيرادات اليوم" data={revenue.daily} />
            <PeriodSection title="إيرادات الأسبوع" data={revenue.weekly} />
            <PeriodSection title="إيرادات الشهر" data={revenue.monthly} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Profits;