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

type TimeFilter = "daily" | "weekly" | "monthly" | "custom";

function Profits() {
  const [revenue, setRevenue] = useState<RevenueByPeriod>({
    daily: {
      hourlyRevenue: 0,
      subscriptionRevenue: 0,
      reservationRevenue: 0,
      productRevenue: 0,
      totalRevenue: 0,
      productProfit: 0,
    },
    weekly: {
      hourlyRevenue: 0,
      subscriptionRevenue: 0,
      reservationRevenue: 0,
      productRevenue: 0,
      totalRevenue: 0,
      productProfit: 0,
    },
    monthly: {
      hourlyRevenue: 0,
      subscriptionRevenue: 0,
      reservationRevenue: 0,
      productRevenue: 0,
      totalRevenue: 0,
      productProfit: 0,
    },
    custom: {
      hourlyRevenue: 0,
      subscriptionRevenue: 0,
      reservationRevenue: 0,
      productRevenue: 0,
      totalRevenue: 0,
      productProfit: 0,
    },
  });
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("daily");
  const [customDate, setCustomDate] = useState<Date | null>(new Date());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchRevenue();
  }, [timeFilter, customDate]);

  const fetchRevenue = async (selectedDate?: Date) => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const startOfWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - now.getDay()
      );
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const calculateFromOriginalTables = async (
        startDate: Date,
        endDate?: Date
      ): Promise<Revenue> => {
        const { data: visitsData } = await supabase
          .from("visits")
          .select("total_amount, created_at");
        const { data: deletedVisitsData } = await supabase
          .from("deleted_visit")
          .select("total_amount, start_time, time_amount, product_amount");

        const allVisitsData = [
          ...(visitsData || []).map((v) => ({
            amount: parseFloat(v.total_amount) || 0,
            created_at: v.created_at,
          })),
          ...(deletedVisitsData || []).map((v) => ({
            amount:
              parseFloat(v.total_amount) || parseFloat(v.time_amount) || 0,
            created_at: v.start_time,
          })),
        ];

        const { data: subscriptionsData } = await supabase
          .from("subscriptions")
          .select("price, created_at");
        const { data: reservationsData } = await supabase
          .from("reservations")
          .select("total_price, created_at");

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

        const filterByDate = (date: string) => {
          const created = new Date(date);
          if (endDate) {
            return created >= startDate && created <= endDate;
          }
          return created >= startDate;
        };

        const hourlyRevenue = allVisitsData
          .filter((v) => filterByDate(v.created_at))
          .reduce((sum, v) => sum + (v.amount || 0), 0);
        const subscriptionRevenue = (subscriptionsData || [])
          .filter((s) => filterByDate(s.created_at))
          .reduce((sum, s) => sum + (s.price || 0), 0);
        const reservationRevenue = (reservationsData || [])
          .filter((r) => filterByDate(r.created_at))
          .reduce((sum, r) => sum + (r.total_price || 0), 0);

        // حساب إيرادات المنتجات (السعر × الكمية)
        const productRevenue = allProductsData
          .filter((p) => filterByDate(p.created_at))
          .reduce((sum, p) => {
            const price = parseFloat(p.price) || 0;
            const quantity = p.quantity || 1;
            return sum + price * quantity;
          }, 0);

        // حساب صافي ربح المنتجات
        let productProfit = allProductsData
          .filter((p) => filterByDate(p.created_at))
          .reduce((sum, p) => {
            if (p.profit !== undefined) {
              // إذا كان حقل الربح موجودًا (مثل في product_sales)
              return sum + (parseFloat(p.profit) || 0);
            } else {
              // إذا لم يكن حقل الربح موجودًا (مثل في visit_products)
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

        return {
          hourlyRevenue,
          subscriptionRevenue,
          reservationRevenue,
          productRevenue,
          totalRevenue,
          productProfit,
        };
      };

      const getRevenueData = async (
        date: Date,
        period: "daily" | "weekly" | "monthly" | "custom"
      ): Promise<Revenue> => {
        const dateString = date.toISOString().split("T")[0];

        const { data: archiveData, error: archiveError } = await supabase
          .from("profit_archive")
          .select("*")
          .eq("date", dateString)
          .single();

        if (archiveData && !archiveError) {
          return {
            hourlyRevenue: parseFloat(archiveData.hourly_revenue) || 0,
            subscriptionRevenue:
              parseFloat(archiveData.subscription_revenue) || 0,
            reservationRevenue:
              parseFloat(archiveData.reservation_revenue) || 0,
            productRevenue: parseFloat(archiveData.product_revenue) || 0,
            productProfit: parseFloat(archiveData.product_profit) || 0,
            totalRevenue: parseFloat(archiveData.total_revenue) || 0,
          };
        }

        let startDate: Date, endDate: Date;

        if (period === "daily") {
          startDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          );
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        } else if (period === "weekly") {
          startDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() - date.getDay()
          );
          endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (period === "monthly") {
          startDate = new Date(date.getFullYear(), date.getMonth(), 1);
          endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        } else {
          startDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          );
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        }

        return await calculateFromOriginalTables(startDate, endDate);
      };

      let dailyData: Revenue,
        weeklyData: Revenue,
        monthlyData: Revenue,
        customData: Revenue;

      if (timeFilter === "daily") {
        dailyData = await getRevenueData(now, "daily");
        weeklyData = await getRevenueData(now, "weekly");
        monthlyData = await getRevenueData(now, "monthly");
        customData = dailyData;
      } else if (timeFilter === "weekly") {
        dailyData = await getRevenueData(now, "daily");
        weeklyData = await getRevenueData(now, "weekly");
        monthlyData = await getRevenueData(now, "monthly");
        customData = weeklyData;
      } else if (timeFilter === "monthly") {
        dailyData = await getRevenueData(now, "daily");
        weeklyData = await getRevenueData(now, "weekly");
        monthlyData = await getRevenueData(now, "monthly");
        customData = monthlyData;
      } else if (timeFilter === "custom" && customDate) {
        dailyData = await getRevenueData(now, "daily");
        weeklyData = await getRevenueData(now, "weekly");
        monthlyData = await getRevenueData(now, "monthly");
        customData = await getRevenueData(customDate, "custom");
      } else {
        dailyData = await getRevenueData(now, "daily");
        weeklyData = await getRevenueData(now, "weekly");
        monthlyData = await getRevenueData(now, "monthly");
        customData = dailyData;
      }

      setRevenue({
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData,
        custom: customData,
      });

      // حفظ البيانات اليومية في الأرشيف إذا لم تكن موجودة
      const today = new Date().toISOString().split("T")[0];
      const { data: existingArchive } = await supabase
        .from("profit_archive")
        .select("id")
        .eq("date", today)
        .single();

      if (!existingArchive) {
        try {
          await supabase.from("profit_archive").upsert(
            [
              {
                date: today,
                hourly_revenue: dailyData.hourlyRevenue,
                subscription_revenue: dailyData.subscriptionRevenue,
                reservation_revenue: dailyData.reservationRevenue,
                product_revenue: dailyData.productRevenue,
                product_profit: dailyData.productProfit,
                total_revenue: dailyData.totalRevenue,
                maintenance: 0,
                daily_expenses: 0,
                salaries: 0,
                total_expenses: 0,
                net_profit: dailyData.totalRevenue + dailyData.productProfit,
                notes: "تم الحفظ تلقائيًا من Profits component",
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: ["date"] }
          );
        } catch (archiveError) {
          console.error("فشل حفظ البيانات في الأرشيف:", archiveError);
        }
      }
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
    setIsEditing(false);
    setSuccessMessage(null);
    if (filter !== "custom") {
      fetchRevenue();
    } else if (customDate) {
      fetchRevenue(customDate);
    }
  };

  const startEditing = () => {
    setEditingRevenue({ ...revenue[timeFilter] });
    setIsEditing(true);
    setSuccessMessage(null);
    setError(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingRevenue(null);
    setSuccessMessage(null);
    setError(null);
  };

  const saveEdits = async () => {
    if (!editingRevenue) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const updatedRevenue = {
        ...revenue,
        [timeFilter]: editingRevenue,
      };
      setRevenue(updatedRevenue);

      let dateToSave: string;

      if (timeFilter === "daily") {
        dateToSave = new Date().toISOString().split("T")[0];
      } else if (timeFilter === "custom" && customDate) {
        dateToSave = customDate.toISOString().split("T")[0];
      } else {
        dateToSave = new Date().toISOString().split("T")[0];
      }

      const { error } = await supabase.from("profit_archive").upsert(
        [
          {
            date: dateToSave,
            hourly_revenue: editingRevenue.hourlyRevenue,
            subscription_revenue: editingRevenue.subscriptionRevenue,
            reservation_revenue: editingRevenue.reservationRevenue,
            product_revenue: editingRevenue.productRevenue,
            product_profit: editingRevenue.productProfit,
            total_revenue: editingRevenue.totalRevenue,
            maintenance: 0,
            daily_expenses: 0,
            salaries: 0,
            total_expenses: 0,
            net_profit:
              editingRevenue.totalRevenue + editingRevenue.productProfit,
            notes: "تم التعديل يدويًا من Profits component",
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: ["date"] }
      );

      if (error) {
        throw error;
      }

      const { data: savedData, error: readError } = await supabase
        .from("profit_archive")
        .select("*")
        .eq("date", dateToSave)
        .single();

      if (readError) {
        console.warn("تعذر التحقق من الحفظ:", readError);
      } else {
        console.log("تم التحقق من الحفظ بنجاح:", savedData);
      }

      setSuccessMessage(`تم حفظ البيانات بنجاح للتاريخ ${dateToSave}`);
      setIsEditing(false);
      setEditingRevenue(null);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error saving edits:", err);
      setError("حدث خطأ أثناء حفظ التعديلات: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleRevenueChange = (field: keyof Revenue, value: string) => {
    if (!editingRevenue) return;

    const numValue = parseFloat(value) || 0;
    const updatedRevenue = {
      ...editingRevenue,
      [field]: numValue,
    };

    if (field !== "totalRevenue") {
      updatedRevenue.totalRevenue =
        updatedRevenue.hourlyRevenue +
        updatedRevenue.subscriptionRevenue +
        updatedRevenue.reservationRevenue +
        updatedRevenue.productRevenue;
    }

    setEditingRevenue(updatedRevenue);
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
    <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
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
              step="0.01"
              min="0"
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

  const TimeFilterButton = ({
    value,
    label,
    onClick,
  }: {
    value: TimeFilter;
    label: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-colors ${
        timeFilter === value
          ? "bg-blue-600 text-white"
          : "bg-white/10 text-slate-300 hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white">
            الأرباح والإيرادات (شامل المحذوف)
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="flex gap-2 bg-white/10 backdrop-blur-lg p-1 rounded-lg border border-white/20">
              <TimeFilterButton
                value="daily"
                label="اليوم"
                onClick={() => handleFilterChange("daily")}
              />
              <TimeFilterButton
                value="weekly"
                label="الأسبوع"
                onClick={() => handleFilterChange("weekly")}
              />
              <TimeFilterButton
                value="monthly"
                label="الشهر"
                onClick={() => handleFilterChange("monthly")}
              />
              <TimeFilterButton
                value="custom"
                label="اختر تاريخ"
                onClick={() => handleFilterChange("custom")}
              />
            </div>

            {timeFilter === "custom" && (
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

        <div className="flex justify-end mb-4">
          {!isEditing ? (
            <button
              onClick={startEditing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              تعديل الأرقام
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveEdits}
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>
              <button
                onClick={cancelEditing}
                disabled={loading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                إلغاء
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg mb-6">
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl text-slate-400">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {timeFilter === "custom" && customDate && (
              <h2 className="text-xl font-semibold text-white">
                {timeFilter === "monthly"
                  ? `إيرادات شهر ${customDate.toLocaleDateString("ar-EG", {
                      month: "long",
                      year: "numeric",
                    })}`
                  : `إيرادات يوم ${customDate.toLocaleDateString("ar-EG")}`}
              </h2>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <RevenueCard
                title="إيرادات الساعات (شامل المحذوف)"
                icon={Users}
                amount={
                  isEditing
                    ? editingRevenue?.hourlyRevenue || 0
                    : revenue[timeFilter].hourlyRevenue
                }
                color="bg-blue-600"
                field="hourlyRevenue"
              />
              <RevenueCard
                title="إيرادات الاشتراكات"
                icon={CreditCard}
                amount={
                  isEditing
                    ? editingRevenue?.subscriptionRevenue || 0
                    : revenue[timeFilter].subscriptionRevenue
                }
                color="bg-green-600"
                field="subscriptionRevenue"
              />
              <RevenueCard
                title="إيرادات الحجوزات"
                icon={CalendarIcon}
                amount={
                  isEditing
                    ? editingRevenue?.reservationRevenue || 0
                    : revenue[timeFilter].reservationRevenue
                }
                color="bg-purple-600"
                field="reservationRevenue"
              />
              <RevenueCard
                title="إيرادات المنتجات (شامل المحذوف)"
                icon={Package}
                amount={
                  isEditing
                    ? editingRevenue?.productRevenue || 0
                    : revenue[timeFilter].productRevenue
                }
                color="bg-orange-600"
                field="productRevenue"
              />
              <RevenueCard
                title="صافي ربح المنتجات (شامل المحذوف)"
                icon={DollarSign}
                amount={
                  isEditing
                    ? editingRevenue?.productProfit || 0
                    : revenue[timeFilter].productProfit
                }
                color="bg-lime-600"
                field="productProfit"
              />
              <div className="md:col-span-2 lg:col-span-3">
                <RevenueCard
                  title="إجمالي الإيرادات"
                  icon={DollarSign}
                  amount={
                    isEditing
                      ? editingRevenue?.totalRevenue || 0
                      : revenue[timeFilter].totalRevenue
                  }
                  color="bg-emerald-600"
                  field="totalRevenue"
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
