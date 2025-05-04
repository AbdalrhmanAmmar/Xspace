import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Search,
  Clock,
  Calendar,
  User,
  PlusCircle,
  X,
  Check,
  Settings,
  LayoutGrid,
  LayoutList,
  Edit2,
  Trash2,
  Square,
} from "lucide-react";
import type { Subscription } from "../types/client";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface SubscriptionPrices {
  weekly: number;
  halfMonthly: number;
  monthly: number;
}

interface SubscriptionDay {
  date: string;
  checked: boolean;
}

export const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    clientName: "",
    type: "أسبوعي" as "أسبوعي" | "نصف شهري" | "شهري",
    isFlexible: false,
  });
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null);
  const [prices, setPrices] = useState<SubscriptionPrices>({
    weekly: 150,
    halfMonthly: 300,
    monthly: 500,
  });
  const [priceFormData, setPriceFormData] = useState<SubscriptionPrices>({
    weekly: 150,
    halfMonthly: 300,
    monthly: 500,
  });
  const [showDaysModal, setShowDaysModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [subscriptionDays, setSubscriptionDays] = useState<SubscriptionDay[]>(
    []
  );

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
      fetchPrices();
    }
  }, [user]);

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_prices")
        .select("*")
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          await supabase.from("subscription_prices").insert([
            {
              weekly: 150,
              half_monthly: 300,
              monthly: 500,
            },
          ]);
        } else {
          throw error;
        }
      } else if (data) {
        setPrices({
          weekly: data.weekly,
          halfMonthly: data.half_monthly,
          monthly: data.monthly,
        });
        setPriceFormData({
          weekly: data.weekly,
          halfMonthly: data.half_monthly,
          monthly: data.monthly,
        });
      }
    } catch (err) {
      console.error("Error fetching prices:", err);
      setError("حدث خطأ أثناء تحميل الأسعار");
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          `
          *,
          clients (
            name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedSubscriptions = (data || []).map((sub) => ({
        id: sub.id,
        clientName: sub.clients.name,
        type: sub.type,
        startDate: new Date(sub.start_date),
        endDate: new Date(sub.end_date),
        price: sub.price,
        status: calculateStatus(new Date(sub.end_date)),
        totalDays: sub.total_days,
        remainingDays: calculateRemainingDays(new Date(sub.end_date)),
        isFlexible: sub.is_flexible,
        days: sub.days || [],
      }));

      setSubscriptions(formattedSubscriptions);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      setError("حدث خطأ أثناء تحميل الاشتراكات");
    } finally {
      setLoading(false);
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

      // Create client if doesn't exist
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

      // If client already exists, get their ID
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

      const startDate = new Date();
      let totalDays = 0;
      let validityDays = 0;

      // تحديد عدد الأيام وفترة الصلاحية حسب نوع الاشتراك
      if (formData.type === "أسبوعي") {
        totalDays = 7;
        validityDays = 14; // 7 أيام خلال 14 يوم
      } else if (formData.type === "نصف شهري") {
        totalDays = 15;
        validityDays = 30; // 15 يوم خلال 30 يوم
      } else {
        totalDays = 30;
        validityDays = 60; // 30 يوم خلال 60 يوم
      }

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + validityDays);

      const price =
        formData.type === "أسبوعي"
          ? prices.weekly
          : formData.type === "نصف شهري"
          ? prices.halfMonthly
          : prices.monthly;

      // إنشاء مصفوفة الأيام
      const days = Array(totalDays)
        .fill(null)
        .map(() => ({
          date: "",
          checked: false,
        }));

      if (editingSubscription) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            type: formData.type,
            price,
            total_days: totalDays,
            remaining_days: totalDays,
            is_flexible: formData.isFlexible,
            updated_at: new Date().toISOString(),
            days: days,
          })
          .eq("id", editingSubscription.id);

        if (updateError) throw updateError;
      } else {
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .insert([
            {
              client_id: clientId,
              type: formData.type,
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              price,
              total_days: totalDays,
              remaining_days: totalDays,
              is_flexible: formData.isFlexible,
              days: days,
            },
          ]);

        if (subscriptionError) throw subscriptionError;
      }

      await fetchSubscriptions();
      setFormData({
        clientName: "",
        type: "أسبوعي",
        isFlexible: false,
      });
      setShowAddForm(false);
      setEditingSubscription(null);
    } catch (err: any) {
      console.error("Error saving subscription:", err);
      setError(err.message || "حدث خطأ أثناء حفظ الاشتراك");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      clientName: subscription.clientName,
      type: subscription.type as "أسبوعي" | "نصف شهري" | "شهري",
      isFlexible: subscription.isFlexible,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاشتراك؟")) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchSubscriptions();
    } catch (err: any) {
      console.error("Error deleting subscription:", err);
      setError(err.message || "حدث خطأ أثناء حذف الاشتراك");
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
        .from("subscription_prices")
        .update({
          weekly: priceFormData.weekly,
          half_monthly: priceFormData.halfMonthly,
          monthly: priceFormData.monthly,
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

  const calculateRemainingDays = (endDate: Date) => {
    const now = new Date().getTime();
    const end = endDate.getTime();
    const remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, remainingDays);
  };

  const calculateStatus = (endDate: Date) => {
    const remainingDays = calculateRemainingDays(endDate);
    if (remainingDays === 0) return "منتهي";
    if (remainingDays <= 3) return "قريباً";
    return "نشط";
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleClientNameClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setSubscriptionDays(
      subscription.days ||
        Array(subscription.totalDays)
          .fill(null)
          .map(() => ({
            date: "",
            checked: false,
          }))
    );
    setShowDaysModal(true);
  };

  const handleDayCheck = (index: number) => {
    const newDays = [...subscriptionDays];
    newDays[index] = {
      ...newDays[index],
      checked: !newDays[index]?.checked,
      date: newDays[index]?.date || new Date().toISOString(),
    };
    setSubscriptionDays(newDays);
  };

  const saveSubscriptionDays = async () => {
    if (!selectedSubscription) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          days: subscriptionDays,
        })
        .eq("id", selectedSubscription.id);

      if (error) throw error;

      await fetchSubscriptions();
      setShowDaysModal(false);
    } catch (err: any) {
      console.error("Error saving subscription days:", err);
      setError(err.message || "حدث خطأ أثناء حفظ أيام الاشتراك");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) =>
    sub.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-blue-400" />
            الاشتراكات
          </h1>
          <div className="flex items-center gap-4">
            <div className="bg-slate-800 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutList className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <Settings className="h-5 w-5" />
              إعدادات الأسعار
            </button>
            <button
              onClick={() => {
                setEditingSubscription(null);
                setFormData({
                  clientName: "",
                  type: "أسبوعي",
                  isFlexible: false,
                });
                setShowAddForm(true);
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              اشتراك جديد
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  إعدادات الأسعار
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
                    سعر الاشتراك الأسبوعي
                  </label>
                  <input
                    type="number"
                    value={priceFormData.weekly}
                    onChange={(e) =>
                      setPriceFormData({
                        ...priceFormData,
                        weekly: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    سعر الاشتراك النصف شهري
                  </label>
                  <input
                    type="number"
                    value={priceFormData.halfMonthly}
                    onChange={(e) =>
                      setPriceFormData({
                        ...priceFormData,
                        halfMonthly: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    سعر الاشتراك الشهري
                  </label>
                  <input
                    type="number"
                    value={priceFormData.monthly}
                    onChange={(e) =>
                      setPriceFormData({
                        ...priceFormData,
                        monthly: Number(e.target.value),
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

        {/* Add/Edit Subscription Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingSubscription ? "تعديل اشتراك" : "إضافة اشتراك جديد"}
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingSubscription(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    اسم العميل
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) =>
                      setFormData({ ...formData, clientName: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    dir="rtl"
                    disabled={editingSubscription !== null}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    نوع الاشتراك
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as typeof formData.type,
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="rtl"
                  >
                    <option value="أسبوعي">
                      أسبوعي - {prices.weekly} جنيه (7 أيام خلال 14 يوم)
                    </option>
                    <option value="نصف شهري">
                      نصف شهري - {prices.halfMonthly} جنيه (15 يوم خلال 30 يوم)
                    </option>
                    <option value="شهري">
                      شهري - {prices.monthly} جنيه (30 يوم خلال 60 يوم)
                    </option>
                  </select>
                </div>

                {formData.type === "نصف شهري" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="flexible"
                      checked={formData.isFlexible}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isFlexible: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-slate-600 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="flexible"
                      className="text-sm text-slate-300"
                    >
                      أيام متفرقة (15 يوم غير متتالية)
                    </label>
                  </div>
                )}

                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">
                    تفاصيل الاشتراك:
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex justify-between">
                      <span>عدد الأيام:</span>
                      <span>
                        {formData.type === "أسبوعي"
                          ? 7
                          : formData.type === "نصف شهري"
                          ? 15
                          : 30}{" "}
                        يوم
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>فترة الصلاحية:</span>
                      <span>
                        {formData.type === "أسبوعي"
                          ? "14 يوم"
                          : formData.type === "نصف شهري"
                          ? "30 يوم"
                          : "60 يوم"}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>السعر:</span>
                      <span>
                        {formData.type === "أسبوعي"
                          ? prices.weekly
                          : formData.type === "نصف شهري"
                          ? prices.halfMonthly
                          : prices.monthly}{" "}
                        جنيه
                      </span>
                    </li>
                    {formData.type === "نصف شهري" && formData.isFlexible && (
                      <li className="text-yellow-400 mt-2">
                        * يمكن استخدام الأيام في أي وقت خلال الشهر
                      </li>
                    )}
                  </ul>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-6 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  <Check className="h-5 w-5" />
                  {loading
                    ? "جاري الحفظ..."
                    : editingSubscription
                    ? "تحديث الاشتراك"
                    : "تأكيد الاشتراك"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute right-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن اشتراك..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-12 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            dir="rtl"
          />
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSubscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20 hover:border-blue-500/50 transition-all hover:scale-105"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3
                        className="text-xl font-semibold text-white cursor-pointer hover:text-blue-400"
                        onClick={() => handleClientNameClick(subscription)}
                      >
                        {subscription.clientName}
                      </h3>
                      <p className="text-slate-400 mt-1">
                        {subscription.type}
                        {subscription.isFlexible && " - أيام متفرقة"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(subscription)}
                        className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(subscription.id)}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          subscription.status === "نشط"
                            ? "bg-green-500/20 text-green-400"
                            : subscription.status === "منتهي"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {subscription.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="h-4 w-4" />
                        <span>من: {formatDate(subscription.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="h-4 w-4" />
                        <span>إلى: {formatDate(subscription.endDate)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-300">
                        <User className="h-4 w-4" />
                        <span>الأيام الكلية: {subscription.totalDays}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="h-4 w-4" />
                        <span>المتبقي: {subscription.remainingDays} يوم</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">قيمة الاشتراك:</span>
                      <span className="text-xl font-bold text-white">
                        {subscription.price.toLocaleString("ar-SA")} جنيه
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                    العميل
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                    النوع
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                    تاريخ البداية
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                    تاريخ النهاية
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                    المتبقي
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                    السعر
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                    الحالة
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((subscription) => (
                  <tr
                    key={subscription.id}
                    className="border-b border-slate-700/50 hover:bg-white/5"
                  >
                    <td
                      className="px-6 py-4 text-white cursor-pointer hover:text-blue-400"
                      onClick={() => handleClientNameClick(subscription)}
                    >
                      {subscription.clientName}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {subscription.type}
                      {subscription.isFlexible && " - أيام متفرقة"}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {formatDate(subscription.startDate)}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {formatDate(subscription.endDate)}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {subscription.remainingDays} يوم
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {subscription.price.toLocaleString("ar-SA")} جنيه
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          subscription.status === "نشط"
                            ? "bg-green-500/20 text-green-400"
                            : subscription.status === "منتهي"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {subscription.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(subscription)}
                          className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(subscription.id)}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Days Modal */}
        {showDaysModal && selectedSubscription && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  أيام الاشتراك - {selectedSubscription.clientName}
                </h2>
                <button
                  onClick={() => setShowDaysModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">
                    نوع الاشتراك: {selectedSubscription.type}
                  </span>
                  <span className="text-slate-300">
                    الأيام المستخدمة:{" "}
                    {subscriptionDays.filter((day) => day.checked).length} من{" "}
                    {selectedSubscription.totalDays}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-6">
                {Array.from({ length: selectedSubscription.totalDays }).map(
                  (_, index) => (
                    <button
                      key={index}
                      onClick={() => handleDayCheck(index)}
                      className={`p-4 rounded-lg flex items-center justify-center ${
                        subscriptionDays[index]?.checked
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      <Square className="h-5 w-5" />
                      <span className="mr-2">يوم {index + 1}</span>
                    </button>
                  )
                )}
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDaysModal(false)}
                  className="px-6 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={saveSubscriptionDays}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-slate-400">
              لا توجد اشتراكات مطابقة للبحث
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
