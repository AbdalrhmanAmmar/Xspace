import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Package,
  Users,
  Calendar as CalendarIcon,
  CreditCard,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ar } from "date-fns/locale";

type TimeFilter = "daily" | "weekly" | "monthly" | "custom";

interface Revenue {
  hourlyRevenue: number;
  subscriptionRevenue: number;
  reservationRevenue: number;
  productRevenue: number;
  totalRevenue: number;
  productProfit: number;
}

function Profits() {
  const [revenue, setRevenue] = useState<Revenue>({
    hourlyRevenue: 0,
    subscriptionRevenue: 0,
    reservationRevenue: 0,
    productRevenue: 0,
    totalRevenue: 0,
    productProfit: 0,
  });

  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("daily");
  const [customDate, setCustomDate] = useState<Date | null>(new Date());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchRevenue();
  }, [timeFilter, customDate]);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (timeFilter === "daily") {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
      } else if (timeFilter === "weekly") {
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - now.getDay());
        firstDayOfWeek.setHours(0, 0, 0, 0);
        startDate = firstDayOfWeek;
        endDate = new Date(firstDayOfWeek);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (timeFilter === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else {
        if (!customDate) return;
        startDate = new Date(customDate);
        endDate = new Date(customDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const filterByDate = (date: string) => {
        const created = new Date(date).getTime();
        return created >= startDate.getTime() && created <= endDate.getTime();
      };

      const { data: visitsData } = await supabase
        .from("visits")
        .select("total_amount, created_at");

      const { data: deletedVisitsData } = await supabase
        .from("deleted_visit")
        .select("total_amount, start_time, time_amount");

      const allVisitsData = [
        ...(visitsData || []).map((v) => ({
          amount: parseFloat(v.total_amount) || 0,
          created_at: v.created_at,
        })),
        ...(deletedVisitsData || []).map((v) => ({
          amount: parseFloat(v.total_amount) || parseFloat(v.time_amount) || 0,
          created_at: v.start_time,
        })),
      ];

      const { data: subscriptionsData } = await supabase
        .from("subscriptions")
        .select("price, created_at");

      const { data: reservationProfitsData } = await supabase
        .from("reservation_profits")
        .select("amount, created_at");

      const { data: visitProductsData } = await supabase
        .from("visit_products")
        .select("price, quantity, created_at");

      const { data: deletedVisitProductsData } = await supabase
        .from("deleted_visit_products")
        .select("price, quantity, created_at");

      const { data: productSalesData } = await supabase
        .from("product_sales")
        .select("price, buy_price, quantity, profit, created_at");

      const allProductsData = [
        ...(visitProductsData || []),
        ...(deletedVisitProductsData || []),
        ...(productSalesData || []),
      ];

      const hourlyRevenue = allVisitsData
        .filter((v) => filterByDate(v.created_at))
        .reduce((sum, v) => sum + (v.amount || 0), 0);

      const subscriptionRevenue = (subscriptionsData || [])
        .filter((s) => filterByDate(s.created_at))
        .reduce((sum, s) => sum + (s.price || 0), 0);

      const reservationRevenue = (reservationProfitsData || [])
        .filter((r) => filterByDate(r.created_at))
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

      const productRevenue = allProductsData
        .filter((p) => filterByDate(p.created_at))
        .reduce((sum, p) => {
          const price = parseFloat(p.price) || 0;
          const quantity = p.quantity || 1;
          return sum + price * quantity;
        }, 0);

      const productProfit = allProductsData
        .filter((p) => filterByDate(p.created_at))
        .reduce((sum, p) => {
          if (p.profit !== undefined) {
            return sum + (parseFloat(p.profit) || 0);
          } else {
            const sellPrice = parseFloat(p.price) || 0;
            const buyPrice =
              p.buy_price !== undefined
                ? parseFloat(p.buy_price)
                : sellPrice * 0.7;
            const quantity = p.quantity || 1;
            return sum + (sellPrice - buyPrice) * quantity;
          }
        }, 0);

      const totalRevenue =
        hourlyRevenue +
        subscriptionRevenue +
        reservationRevenue +
        productRevenue;

      const calculatedRevenue: Revenue = {
        hourlyRevenue,
        subscriptionRevenue,
        reservationRevenue,
        productRevenue,
        totalRevenue,
        productProfit,
      };

      setRevenue(calculatedRevenue);
    } catch (err: any) {
      console.error("حدث خطأ:", err);
      setError("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleRevenueChange = (field: keyof Revenue, value: string) => {
    if (!editingRevenue) return;
    const numValue = parseFloat(value) || 0;
    const updated = { ...editingRevenue, [field]: numValue };
    if (field !== "totalRevenue") {
      updated.totalRevenue =
        updated.hourlyRevenue +
        updated.subscriptionRevenue +
        updated.reservationRevenue +
        updated.productRevenue;
    }
    setEditingRevenue(updated);
  };

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString("ar-EG")} جنيه`;

  const RevenueCard = ({
    title,
    icon: Icon,
    amount,
    color,
    field,
  }: {
    title: string;
    icon: any;
    amount: number;
    color: string;
    field?: keyof Revenue;
  }) => (
    <div className="bg-white/10 p-6 rounded-xl border border-white/20">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-400">{title}</h3>
          {isEditing && field ? (
            <input
              type="number"
              value={editingRevenue?.[field] || 0}
              onChange={(e) => handleRevenueChange(field, e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded p-2 text-white mt-1"
            />
          ) : (
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(amount)}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">الأرباح والإيرادات المباشرة</h1>
          
          {timeFilter === "custom" && (
            <div className="relative">
              <DatePicker
                selected={customDate}
                onChange={(date) => setCustomDate(date)}
                locale={ar}
                dateFormat="yyyy/MM/dd"
                placeholderText="اختر تاريخ"
                className="bg-white/10 backdrop-blur-lg border border-white/20 text-white p-2 rounded-lg w-full md:w-48 text-center"
                wrapperClassName="w-full md:w-auto"
                calendarClassName="bg-slate-800 border border-white/20"
                dayClassName={() => "text-white hover:bg-blue-600"}
                monthClassName={() => "text-white"}
                yearClassName={() => "text-white"}
                popperClassName="z-50"
                popperPlacement="bottom-end"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                isClearable
                clearButtonClassName="text-white hover:text-blue-300"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {(["daily", "weekly", "monthly", "custom"] as TimeFilter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => {
                  setTimeFilter(f);
                  setIsEditing(false);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  timeFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-slate-300 hover:bg-white/20"
                }`}
              >
                {f === "daily"
                  ? "اليوم"
                  : f === "weekly"
                  ? "الأسبوع"
                  : f === "monthly"
                  ? "الشهر"
                  : "تاريخ مخصص"}
              </button>
            )
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-slate-300 text-lg">جاري التحميل...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RevenueCard
              title="إيرادات الساعات"
              icon={Users}
              amount={revenue.hourlyRevenue}
              color="bg-blue-600"
            />
            <RevenueCard
              title="إيرادات الاشتراكات"
              icon={CreditCard}
              amount={revenue.subscriptionRevenue}
              color="bg-green-600"
            />
            <RevenueCard
              title="إيرادات الحجوزات"
              icon={CalendarIcon}
              amount={revenue.reservationRevenue}
              color="bg-purple-600"
            />
            <RevenueCard
              title="إيرادات المنتجات"
              icon={Package}
              amount={revenue.productRevenue}
              color="bg-orange-600"
            />
            <RevenueCard
              title="صافي ربح المنتجات"
              icon={DollarSign}
              amount={revenue.productProfit}
              color="bg-lime-500"
            />
            <RevenueCard
              title="إجمالي الإيرادات"
              icon={DollarSign}
              amount={revenue.totalRevenue}
              color="bg-emerald-600"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Profits;