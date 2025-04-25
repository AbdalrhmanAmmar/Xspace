import React, { useState, useEffect } from "react";
import {
  Users,

  Plus,
  Minus,
  Pause,
  Play,
  StopCircle,
  Trash2,
  X,
  Search,
} from "lucide-react";
import type { Client, Visit } from "../types/client";
import type { Product, CartItem } from "../types/product";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface ClientSubscription {
  id: string;
  type: string;
  endDate: Date;
  remainingDays: number;
}

interface ClientWithSubscription extends Client {
  subscription?: ClientSubscription;
}

export const ClientManagement = () => {
  const [clients, setClients] = useState<ClientWithSubscription[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientStatus, setClientStatus] = useState<"new" | "existing" | null>(
    null
  );
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    job: "",
    age: "",
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<CartItem[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState(1);

  const HOUR_RATE = 10;
  const HOUR_RATE_FIRST = 10;
  const HOUR_RATE_NEXT = 5;

  useEffect(() => {
    if (user) {
      fetchClients();
      fetchProducts();
      fetchVisits();
    }
  }, [user]);

  useEffect(() => {
    setFilteredProducts(
      products.filter((product) =>
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
      )
    );
  }, [productSearchTerm, products]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          *,
          subscriptions (
            id,
            type,
            end_date,
            remaining_days
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedClients: ClientWithSubscription[] = (data || []).map(
        (client) => {
          const activeSubscription = client.subscriptions?.find(
            (sub) =>
              sub.status === "active" && new Date(sub.end_date) > new Date()
          );

          return {
            id: client.id,
            name: client.name,
            phone: client.phone || undefined,
            job: client.job || undefined,
            age: client.age || undefined,
            lastVisit: new Date(client.last_visit),
            createdAt: new Date(client.created_at),
            isNewClient: client.is_new_client,
            subscription: activeSubscription
              ? {
                  id: activeSubscription.id,
                  type: activeSubscription.type,
                  endDate: new Date(activeSubscription.end_date),
                  remainingDays: activeSubscription.remaining_days,
                }
              : undefined,
          };
        }
      );

      setClients(formattedClients);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError("حدث خطأ أثناء تحميل بيانات العملاء");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;

      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("حدث خطأ أثناء تحميل المنتجات");
    }
  };

  const fetchVisits = async () => {
    try {
      const { data: visitsData, error: visitsError } = await supabase
        .from("visits")
        .select(
          `
          *,
          clients (
            name
          ),
          visit_products (
            *,
            products (*)
          ),
          visit_pauses (*)
        `
        )
        .order("created_at", { ascending: false });

      if (visitsError) throw visitsError;

      const formattedVisits = (visitsData || []).map((visit) => ({
        id: visit.id,
        clientName: visit.clients?.name || "",
        startTime: new Date(visit.start_time),
        endTime: visit.end_time ? new Date(visit.end_time) : undefined,
        products:
          visit.visit_products?.map((vp: any) => ({
            id: vp.products?.id,
            name: vp.products?.name,
            price: vp.price,
            quantity: vp.quantity,
          })) || [],
        totalAmount: visit.total_amount,
        isPaused: visit.is_paused,
        pauseHistory:
          visit.visit_pauses?.map((pause: any) => ({
            startTime: new Date(pause.start_time),
            endTime: pause.end_time ? new Date(pause.end_time) : undefined,
          })) || [],
      }));

      setVisits(formattedVisits);
    } catch (err) {
      console.error("Error fetching visits:", err);
      setError("حدث خطأ أثناء تحميل الزيارات");
    }
  };

  const checkClientExists = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          *,
          subscriptions (
            id,
            type,
            end_date,
            remaining_days,
            status
          )
        `
        )
        .ilike("name", name)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setClientStatus("existing");
        setFormData({
          name: data.name,
          phone: data.phone || "",
          job: data.job || "",
          age: data.age?.toString() || "",
        });
      } else {
        setClientStatus("new");
      }
    } catch (err) {
      console.error("Error checking client:", err);
      setError("حدث خطأ أثناء التحقق من بيانات العميل");
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
      const currentDate = new Date();

      // Create or update client
      let clientId: string;
      if (clientStatus === "new") {
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .insert([
            {
              name: formData.name,
              phone: formData.phone || null,
              job: formData.job || null,
              age: formData.age ? parseInt(formData.age) : null,
              is_new_client: true,
              last_visit: currentDate.toISOString(),
            },
          ])
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = clientData.id;
      } else {
        const { data: existingClient, error: clientError } = await supabase
          .from("clients")
          .select("id")
          .eq("name", formData.name)
          .single();

        if (clientError) throw clientError;
        clientId = existingClient.id;

        // Update client's last visit
        const { error: updateError } = await supabase
          .from("clients")
          .update({
            last_visit: currentDate.toISOString(),
            phone: formData.phone || null,
            job: formData.job || null,
            age: formData.age ? parseInt(formData.age) : null,
          })
          .eq("id", clientId);

        if (updateError) throw updateError;
      }

      // Create visit
      const { data: visitData, error: visitError } = await supabase
        .from("visits")
        .insert([
          {
            client_id: clientId,
            start_time: currentDate.toISOString(),
            is_paused: false,
          },
        ])
        .select()
        .single();

      if (visitError) throw visitError;

      const visitId = visitData.id;

      const visitObj: Visit = {
        id: visitId,
        clientName: formData.name,
        startTime: currentDate,
        products: [],
        isPaused: false,
        pauseHistory: [],
      };

      setVisits((prev) => [visitObj, ...prev]);
      setSelectedProducts([]);
      setFormData({ name: "", phone: "", job: "", age: "" });
      setClientStatus(null);

      // Refresh data
      await Promise.all([fetchClients(), fetchVisits()]);
    } catch (err: any) {
      console.error("Error saving visit:", err);
      setError(err.message || "حدث خطأ أثناء حفظ بيانات الزيارة");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const calculateVisitDuration = (visit: Visit): number => {
    let totalMilliseconds: number;

    if (!visit.endTime) {
      totalMilliseconds = new Date().getTime() - visit.startTime.getTime();
    } else {
      totalMilliseconds = visit.endTime.getTime() - visit.startTime.getTime();
    }

    visit.pauseHistory.forEach((pause) => {
      const pauseEnd = pause.endTime || new Date();
      totalMilliseconds -= pauseEnd.getTime() - pause.startTime.getTime();
    });

    const totalMinutes = Math.floor(totalMilliseconds / (1000 * 60));

    if (totalMinutes < 15) {
      return 0;
    }

    const fullHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return remainingMinutes >= 15 ? fullHours + 1 : fullHours;
  };

  const calculateTimeCost = (hours: number): number => {
    if (hours === 0) return 0;
    if (hours === 1) return HOUR_RATE_FIRST;
    return HOUR_RATE_FIRST + (hours - 1) * HOUR_RATE_NEXT;
  };

  const calculateTotalAmount = (visit: Visit): number => {
    const productsTotal = visit.products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );
    const hours = calculateVisitDuration(visit);
    const timeTotal = calculateTimeCost(hours);
    return productsTotal + timeTotal;
  };

  const pauseVisit = async (visitId: string) => {
    try {
      setLoading(true);
      const currentTime = new Date().toISOString();

      // Add pause record
      const { error: pauseError } = await supabase.from("visit_pauses").insert([
        {
          visit_id: visitId,
          start_time: currentTime,
        },
      ]);

      if (pauseError) throw pauseError;

      // Update visit status
      const { error: visitError } = await supabase
        .from("visits")
        .update({
          is_paused: true,
        })
        .eq("id", visitId);

      if (visitError) throw visitError;

      // Refresh visits
      await fetchVisits();
      setSelectedVisit(visits.find((v) => v.id === visitId) || null);
    } catch (err) {
      console.error("Error pausing visit:", err);
      setError("حدث خطأ أثناء إيقاف الزيارة مؤقتاً");
    } finally {
      setLoading(false);
    }
  };

  const resumeVisit = async (visitId: string) => {
    try {
      setLoading(true);
      const currentTime = new Date().toISOString();

      // Get the latest pause record
      const { data: pauses, error: pauseError } = await supabase
        .from("visit_pauses")
        .select("*")
        .eq("visit_id", visitId)
        .is("end_time", null)
        .order("start_time", { ascending: false })
        .limit(1);

      if (pauseError) throw pauseError;
      if (!pauses || pauses.length === 0)
        throw new Error("No active pause found");

      // Update pause record with end time
      const { error: updatePauseError } = await supabase
        .from("visit_pauses")
        .update({
          end_time: currentTime,
        })
        .eq("id", pauses[0].id);

      if (updatePauseError) throw updatePauseError;

      // Update visit status
      const { error: visitError } = await supabase
        .from("visits")
        .update({
          is_paused: false,
        })
        .eq("id", visitId);

      if (visitError) throw visitError;

      // Refresh visits
      await fetchVisits();
      setSelectedVisit(visits.find((v) => v.id === visitId) || null);
    } catch (err) {
      console.error("Error resuming visit:", err);
      setError("حدث خطأ أثناء استئناف الزيارة");
    } finally {
      setLoading(false);
    }
  };

  const endVisit = async (visitId: string) => {
    try {
      setLoading(true);
      const currentTime = new Date().toISOString();

      // If visit is paused, resume it first
      const visit = visits.find((v) => v.id === visitId);
      if (visit?.isPaused) {
        await resumeVisit(visitId);
      }

      // Calculate total amount
      const totalAmount = calculateTotalAmount(
        visit || visits.find((v) => v.id === visitId)!
      );

      // Update visit with end time and total amount
      const { error } = await supabase
        .from("visits")
        .update({
          end_time: currentTime,
          total_amount: totalAmount,
        })
        .eq("id", visitId);

      if (error) throw error;

      // Refresh visits
      await fetchVisits();
      setSelectedVisit(visits.find((v) => v.id === visitId) || null);
    } catch (err) {
      console.error("Error ending visit:", err);
      setError("حدث خطأ أثناء إنهاء الزيارة");
    } finally {
      setLoading(false);
    }
  };

  const addProductToVisit = async () => {
    if (!newProductId || !selectedVisit) return;

    try {
      setLoading(true);
      const product = products.find((p) => p.id === newProductId);
      if (!product) throw new Error("Product not found");

      // Add product to visit
      const { error } = await supabase.from("visit_products").insert([
        {
          visit_id: selectedVisit.id,
          product_id: product.id,
          price: product.price,
          quantity: newProductQuantity,
        },
      ]);

      if (error) throw error;

      // Refresh visits
      await fetchVisits();
      setSelectedVisit(visits.find((v) => v.id === selectedVisit.id) || null);

      // Reset form
      setNewProductId("");
      setNewProductQuantity(1);
      setProductSearchTerm("");
    } catch (err) {
      console.error("Error adding product:", err);
      setError("حدث خطأ أثناء إضافة المنتج");
    } finally {
      setLoading(false);
    }
  };

  const removeProductFromVisit = async (productId: string) => {
    if (!selectedVisit) return;

    try {
      setLoading(true);

      // Remove product from visit
      const { error } = await supabase
        .from("visit_products")
        .delete()
        .eq("visit_id", selectedVisit.id)
        .eq("product_id", productId);

      if (error) throw error;

      // Refresh visits
      await fetchVisits();
      setSelectedVisit(visits.find((v) => v.id === selectedVisit.id) || null);
    } catch (err) {
      console.error("Error removing product:", err);
      setError("حدث خطأ أثناء إزالة المنتج");
    } finally {
      setLoading(false);
    }
  };

  const deleteVisitRecord = async (visitId: string) => {
    if (!user) {
      setError("يجب تسجيل الدخول أولاً");
      return false;
    }

    if (!visitId) {
      setError("معرف الزيارة غير صالح");
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. التحقق من وجود الزيارة أولاً
      const { data: visitData, error: visitError } = await supabase
        .from("visits")
        .select("*")
        .eq("id", visitId)
        .single();

      if (visitError || !visitData) {
        throw new Error("الزيارة غير موجودة");
      }

      // 2. حذف جميع السجلات المرتبطة
      await supabase.from("visit_products").delete().eq("visit_id", visitId);
      await supabase.from("visit_pauses").delete().eq("visit_id", visitId);

      // 3. حذف الزيارة نفسها
      const { error: deleteError } = await supabase
        .from("visits")
        .delete()
        .eq("id", visitId);

      if (deleteError) throw deleteError;

      // 4. تحديث الواجهة
      setVisits((prev) => prev.filter((v) => v.id !== visitId));

      // إذا كانت الزيارة المحذوفة هي المحددة حالياً، نغلق المودال
      if (selectedVisit?.id === visitId) {
        setSelectedVisit(null);
      }

      // إظهار رسالة نجاح
      alert("تم حذف الزيارة بنجاح");
      return true;
    } catch (err) {
      console.error("فشل في حذف الزيارة:", err);
      setError(err?.message || "حدث خطأ أثناء حذف الزيارة");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = visits.filter((visit) =>
    visit.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-EG")} جنيه`;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          إدارة الزيارات
        </h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Users className="h-5 w-5" />
              تسجيل زيارة
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  اسم العميل
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (e.target.value.length >= 3) {
                        checkClientExists(e.target.value);
                      } else {
                        setClientStatus(null);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="أدخل اسم العميل"
                    dir="rtl"
                    disabled={loading}
                    required
                  />
                  {clientStatus && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          clientStatus === "new"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {clientStatus === "new" ? "عميل جديد" : "عميل حالي"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {clientStatus === "new" && (
                <>
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
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      العمر
                    </label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) =>
                        setFormData({ ...formData, age: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أدخل العمر"
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      التخصص الدراسي
                    </label>
                    <input
                      type="text"
                      value={formData.job}
                      onChange={(e) =>
                        setFormData({ ...formData, job: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أدخل التخصص الدراسي"
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "جاري الحفظ..." : "تسجيل زيارة"}
              </button>
            </form>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">سجل الزيارات</h2>
              <div className="relative w-64">
                <Search className="absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث عن عميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-colors flex justify-between"
                  onClick={() => setSelectedVisit(visit)}
                >
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <h4 className="text-white font-medium">
                        {visit.clientName}
                      </h4>
                      <p className="text-sm text-blue-200">
                        {formatDate(visit.startTime)} -{" "}
                        {formatTime(visit.startTime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-6">
                      {visit.endTime ? (
                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                          منتهية
                        </span>
                      ) : visit.isPaused ? (
                        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
                          متوقفة مؤقتاً
                        </span>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                          جارية
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteVisitRecord(visit.id);
                    }}
                    disabled={loading}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
              {filteredVisits.length === 0 && (
                <p className="text-center text-slate-400 py-8">
                  لا توجد زيارات مطابقة للبحث
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Visit Details Modal */}
        {selectedVisit && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  تفاصيل الزيارة
                </h2>
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-300 mb-1">
                      العميل
                    </h3>
                    <p className="text-white">{selectedVisit.clientName}</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-300 mb-1">
                      التاريخ والوقت
                    </h3>
                    <p className="text-white">
                      {formatDate(selectedVisit.startTime)} -{" "}
                      {formatTime(selectedVisit.startTime)}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-slate-300 mb-1">
                    حالة الزيارة
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedVisit.endTime ? (
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                        منتهية
                      </span>
                    ) : selectedVisit.isPaused ? (
                      <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
                        متوقفة مؤقتاً
                      </span>
                    ) : (
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                        جارية
                      </span>
                    )}

                    <div className="text-white flex-1 text-right">
                      <span>
                        المدة: {calculateVisitDuration(selectedVisit)} ساعة
                      </span>
                    </div>
                  </div>
                </div>

                {!selectedVisit.endTime && (
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">
                      إدارة الزيارة
                    </h3>
                  </div>
                )}

                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">
                    إضافة منتجات
                  </h3>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        onFocus={() => setIsProductDropdownOpen(true)}
                        onBlur={() =>
                          setTimeout(() => setIsProductDropdownOpen(false), 200)
                        }
                        placeholder="ابحث عن منتج..."
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading || !!selectedVisit.endTime}
                      />

                      {isProductDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                              <div
                                key={product.id}
                                onClick={() => {
                                  setNewProductId(product.id);
                                  setProductSearchTerm(
                                    `${product.name} - ${formatCurrency(
                                      product.price
                                    )}`
                                  );
                                  setIsProductDropdownOpen(false);
                                }}
                                className="px-4 py-2 hover:bg-slate-700 cursor-pointer flex justify-between text-white"
                              >
                                <span>{product.name}</span>
                                <span>{formatCurrency(product.price)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-slate-400">
                              لا توجد منتجات مطابقة
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg border border-slate-700 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          setNewProductQuantity((prev) => Math.max(1, prev - 1))
                        }
                        className="text-slate-400 hover:text-white"
                        disabled={newProductQuantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-white">{newProductQuantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setNewProductQuantity((prev) => prev + 1)
                        }
                        className="text-slate-400 hover:text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={addProductToVisit}
                      disabled={
                        !newProductId || loading || !!selectedVisit.endTime
                      }
                      className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      إضافة
                    </button>
                  </div>
                </div>

                {selectedVisit.products.length > 0 && (
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">
                      المنتجات
                    </h3>
                    <div className="space-y-2">
                      {selectedVisit.products.map((product) => (
                        <div
                          key={product.id}
                          className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-white">{product.name}</span>
                            <span className="text-slate-400">
                              ({product.quantity}x)
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-white">
                              {formatCurrency(product.price * product.quantity)}
                            </span>
                            {!selectedVisit.endTime && (
                              <button
                                onClick={() =>
                                  removeProductFromVisit(product.id)
                                }
                                disabled={loading}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">
                    ملخص الزيارة
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-white">
                      <span>المنتجات:</span>
                      <span>
                        {formatCurrency(
                          selectedVisit.products.reduce(
                            (sum, p) => sum + p.price * p.quantity,
                            0
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>مدة الزيارة:</span>
                      <span>
                        {calculateVisitDuration(selectedVisit)} ساعة ×{" "}
                        {formatCurrency(HOUR_RATE)}
                      </span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>تكلفة الوقت:</span>
                      <span>
                        {formatCurrency(
                          calculateVisitDuration(selectedVisit) * HOUR_RATE
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-600">
                      <span>الإجمالي:</span>
                      <span>
                        {formatCurrency(calculateTotalAmount(selectedVisit))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                {selectedVisit.isPaused ? (
                  <button
                    onClick={() => resumeVisit(selectedVisit.id)}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    استئناف
                  </button>
                ) : (
                  <button
                    onClick={() => pauseVisit(selectedVisit.id)}
                    disabled={loading}
                    className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    <Pause className="h-4 w-4" />
                    إيقاف مؤقت
                  </button>
                )}

                <button
                  onClick={() => endVisit(selectedVisit.id)}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <StopCircle className="h-4 w-4" />
                  إنهاء الزيارة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
