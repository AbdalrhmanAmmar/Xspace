import React, { useState, useEffect } from "react";
import { DollarSign, Package, Users, Calendar, CreditCard } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Revenue {
  hourlyRevenue: number;
  subscriptionRevenue: number;
  reservationRevenue: number;
  productRevenue: number;
  totalRevenue: number;
}

interface RevenueByPeriod {
  daily: Revenue;
  weekly: Revenue;
  monthly: Revenue;
}

function Profits() {
  const [revenue, setRevenue] = useState<RevenueByPeriod>({
    daily: {
      hourlyRevenue: 0,
      subscriptionRevenue: 0,
      reservationRevenue: 0,
      productRevenue: 0,
      totalRevenue: 0,
    },
    weekly: {
      hourlyRevenue: 0,
      subscriptionRevenue: 0,
      reservationRevenue: 0,
      productRevenue: 0,
      totalRevenue: 0,
    },
    monthly: {
      hourlyRevenue: 0,
      subscriptionRevenue: 0,
      reservationRevenue: 0,
      productRevenue: 0,
      totalRevenue: 0,
    },
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

      // Get current date ranges
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString();
      const startOfWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - now.getDay()
      ).toISOString();
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();

      // Fetch visits revenue (hourly)
      const { data: visitsData, error: visitsError } = await supabase
        .from("visits")
        .select("total_amount, created_at");

      if (visitsError) throw visitsError;

      // Fetch subscriptions revenue
      const { data: subscriptionsData, error: subscriptionsError } =
        await supabase.from("subscriptions").select("price, created_at");

      if (subscriptionsError) throw subscriptionsError;

      // Fetch reservations revenue
      const { data: reservationsData, error: reservationsError } =
        await supabase.from("reservations").select("total_price, created_at");

      if (reservationsError) throw reservationsError;

      // Fetch products revenue
      const { data: salesData, error: salesError } = await supabase
        .from("visit_products")
        .select("price, quantity, created_at");

      if (salesError) throw salesError;

      // Calculate revenue for each period
      const calculatePeriodRevenue = (startDate: string) => {
        const visits =
          visitsData
            ?.filter((v) => new Date(v.created_at) >= new Date(startDate))
            .reduce((sum, v) => sum + (v.total_amount || 0), 0) || 0;

        const subscriptions =
          subscriptionsData
            ?.filter((s) => new Date(s.created_at) >= new Date(startDate))
            .reduce((sum, s) => sum + (s.price || 0), 0) || 0;

        const reservations =
          reservationsData
            ?.filter((r) => new Date(r.created_at) >= new Date(startDate))
            .reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;

        const products =
          salesData
            ?.filter((s) => new Date(s.created_at) >= new Date(startDate))
            .reduce((sum, s) => sum + s.price * s.quantity, 0) || 0;

        return {
          hourlyRevenue: visits,
          subscriptionRevenue: subscriptions,
          reservationRevenue: reservations,
          productRevenue: products,
          totalRevenue: visits + subscriptions + reservations + products,
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

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-EG")} جنيه`;
  };

  const RevenueCard = ({
    title,
    icon: Icon,
    amount,
    color,
  }: {
    title: string;
    icon: any;
    amount: number;
    color: string;
  }) => (
    <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-400">{title}</h3>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(amount)}
          </p>
        </div>
      </div>
    </div>
  );

  const PeriodSection = ({ title, data }: { title: string; data: Revenue }) => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RevenueCard
          title="إيرادات الساعات"
          icon={Users}
          amount={data.hourlyRevenue}
          color="bg-blue-600"
        />
        <RevenueCard
          title="إيرادات الاشتراكات"
          icon={CreditCard}
          amount={data.subscriptionRevenue}
          color="bg-green-600"
        />
        <RevenueCard
          title="إيرادات الحجوزات"
          icon={Calendar}
          amount={data.reservationRevenue}
          color="bg-purple-600"
        />
        <RevenueCard
          title="إيرادات المنتجات"
          icon={Package}
          amount={data.productRevenue}
          color="bg-orange-600"
        />
        <div className="md:col-span-2 lg:col-span-3">
          <RevenueCard
            title="إجمالي الإيرادات"
            icon={DollarSign}
            amount={data.totalRevenue}
            color="bg-emerald-600"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-8">
          الأرباح والإيرادات
        </h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

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
