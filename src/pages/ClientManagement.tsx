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
  Edit,
  ShoppingCart,
} from "lucide-react";
import type { Client, Visit } from "../types/client";
import type { Product, CartItem } from "../types/product";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Spinner } from "../components/Spinner";
import { SaleModal } from "../components/SaleModal";

interface ClientSubscription {
  id: string;
  type: string;
  endDate: Date;
  remainingDays: number;
}
interface Visit {
  id: string;
  clientName: string;
  startTime: Date;
  endTime?: Date;
  products: CartItem[];
  totalAmount?: number;
  isPaused: boolean;
  pauseHistory: Pause[];
  numberOfPeople?: number; // أضف هذا الحقل
  type?: "default" | "big" | "small"; // أضف هذا الحقل
}

interface ClientWithSubscription extends Client {
  subscription?: ClientSubscription;
}

export const ClientManagement = () => {
  const [numberOfPeople, setNumberOfPeople] = useState(1);

  const [clients, setClients] = useState<ClientWithSubscription[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
const [visitType, setVisitType] = useState<"default" | "small" | "big">("default");
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
  });
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<CartItem[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState(1);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  //time
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editedStartTime, setEditedStartTime] = useState("");
  const [editedEndTime, setEditedEndTime] = useState("");
  const [isCalculated, setIsCalculated] = useState(false);
  const [product, Setproduct]=useState<number>(0)

  const HOUR_RATE = 10;
  const HOUR_RATE_FIRST = 10;
  const HOUR_RATE_NEXT = 5;

  //edit-time
  const formatDateTimeForInput = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  useEffect(() => {
    if (selectedVisit) {
      setEditedStartTime(formatDateTimeForInput(selectedVisit.startTime));
      setEditedEndTime(
        selectedVisit.endTime
          ? formatDateTimeForInput(selectedVisit.endTime)
          : ""
      );
    }
  }, [selectedVisit]);
  useEffect(() => {
    if (user) {
      fetchClients();
      fetchProducts();
      fetchVisits();
    }
  }, [user]);

const handlevisit=(visit)=>{
  setSelectedVisit(visit)
  Setproduct(0)
}

  const calculateVisitStats = () => {
    let ongoing = 0;
    let finished = 0;
    let paused = 0;

    visits.forEach((visit) => {
      if (visit.endTime) {
        finished++;
      } else if (visit.isPaused) {
        paused++;
      } else {
        ongoing++;
      }
    });

    return { ongoing, finished, paused };
  };

  const saveTimeChanges = async () => {
    if (!selectedVisit) return;

    try {
      setLoading(true);

      const updates: any = {
        start_time: new Date(editedStartTime).toISOString(),
      };

      if (editedEndTime) {
        updates.end_time = new Date(editedEndTime).toISOString();
      }

      const { error } = await supabase
        .from("visits")
        .update(updates)
        .eq("id", selectedVisit.id);

      if (error) throw error;

      // تحديث حالة الزيارة المحلية
      setSelectedVisit({
        ...selectedVisit,
        startTime: new Date(editedStartTime),
      
        endTime: editedEndTime ? new Date(editedEndTime) : undefined,
      });

      // تحديث قائمة الزيارات
      setVisits(
        visits.map((v) =>
          v.id === selectedVisit.id
            ? {
                ...v,
                startTime: new Date(editedStartTime),
                endTime: editedEndTime ? new Date(editedEndTime) : undefined,
              }
            : v
        )
      );

      setIsEditingTime(false);
    } catch (err) {
      console.error("Error updating visit time:", err);
      setError("حدث خطأ أثناء تحديث وقت الزيارة");
    } finally {
      setLoading(false);
    }
  };
console.log(product)
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
      .select(`
        *,
        clients (
          name
        ),
product_sales (
  *,
  products (
    id,
    name,
    price
  )
),

        visit_pauses (
          start_time,
          end_time
        )
      `)
      .order("created_at", { ascending: false });

    if (visitsError) throw visitsError;

    const formattedVisits = (visitsData || []).map((visit) => ({
      id: visit.id,
      clientName: visit.clients?.name || "",
      startTime: new Date(visit.start_time),
      endTime: visit.end_time ? new Date(visit.end_time) : undefined,
products:
  visit.product_sales?.map((ps: any) => ({
    id: ps.products?.id,
    name: ps.products?.name,
    price: ps.price,
    quantity: ps.quantity,
  })) || [],

      totalAmount: visit.total_amount,
      isPaused: visit.is_paused,
      numberOfPeople: visit.number_of_people || 1,
      pauseHistory:
        visit.visit_pauses?.map((pause: any) => ({
          startTime: new Date(pause.start_time),
          endTime: pause.end_time ? new Date(pause.end_time) : undefined,
        })) || [],
      type: visit.type || "default", // ✅ النوع يُحمّل الآن بنجاح
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
        });
      } else {
        setClientStatus("new");
      }
    } catch (err) {
      console.error("Error checking client:", err);
      setError("حدث خطأ أثناء التحقق من بيانات العميل");
    }
  };

const handleSubmit = async (e: React.FormEvent, type: "default" | "small" | "big") => {
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
        })
        .eq("id", clientId);

      if (updateError) throw updateError;
    }

    // Create visit - هنا تم إصلاح المشكلة
    const { data: visitData, error: visitError } = await supabase
      .from("visits")
      .insert([
        {
          client_id: clientId,
          start_time: currentDate.toISOString(),
          is_paused: false,
          number_of_people: numberOfPeople,
          type: type, // ✅ استخدام المعامل type المرسل للدالة
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
      numberOfPeople: numberOfPeople,
      pauseHistory: [],
      type: type, // ✅ استخدام المعامل type المرسل للدالة
    };

    setVisits((prev) => [visitObj, ...prev]);
    setSelectedProducts([]);
    setFormData({ name: "", phone: "", job: "" });
    setClientStatus(null);
    setNumberOfPeople(1);
    // لا نحتاج لإعادة تعيين visitType لأننا نستخدم المعامل المرسل

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
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "مساءً" : "صباحاً";
    const twelveHour = hours % 12 || 12;

    return `${twelveHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
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

const calculateTimeCost = (
  hours: number,
  numberOfPeople: number = 1,
  type: "default" | "big" | "small" = "default"
): number => {
  if (hours === 0) return 0;
  
  switch (type) {
    case "big":
      return 100 * hours * numberOfPeople;
    case "small":
      return 50 * hours * numberOfPeople;
    case "default":
    default:
      return hours === 1
        ? HOUR_RATE_FIRST * numberOfPeople
        : (HOUR_RATE_FIRST + (hours - 1) * HOUR_RATE_NEXT) * numberOfPeople;
  }
};
const calculateTotalAmount = (visit: Visit): number => {
  const productsTotal = visit.products.reduce(
    (sum, p) => sum + p.price * p.quantity,
    0
  );
  const hours = calculateVisitDuration(visit);
  const timeTotal = calculateTimeCost(
    hours,
    visit.numberOfPeople || 1,
    visit.type || "default" // ✅ استخدام النوع من الزيارة
  );
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
    const visit = visits.find((v) => v.id === visitId);

    if (visit?.isPaused) {
      await resumeVisit(visitId);
    }

    const hours = calculateVisitDuration(visit!);
    const timeCost = calculateTimeCost(
      hours,
      visit?.numberOfPeople || 1,
      visit?.type || "default"
    );

    const { error } = await supabase
      .from("visits")
      .update({
        end_time: currentTime,
        time_amount: timeCost,
        number_of_people: visit?.numberOfPeople || 1,
      })
      .eq("id", visitId);

    if (error) throw error;

    await fetchVisits();
    setIsCalculated(true);
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

    // إضافة المنتج إلى جدول product_sales
    const { data, error } = await supabase
      .from("product_sales")
      .insert([
        {
          visit_id: selectedVisit.id,
          product_id: product.id,
          price: product.price,
          quantity: newProductQuantity,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // ✅ تقليل كمية المنتج من المخزون
    await supabase.rpc("decrement_product_quantity", {
      product_id: product.id,
      decrement_by: newProductQuantity
    });

    // تحديث الحالة المحلية
    setSelectedVisit({
      ...selectedVisit,
      products: [
        ...selectedVisit.products,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: newProductQuantity,
        },
      ],
    });

    // إعادة تعيين الحقول
    setNewProductId("");
    setNewProductQuantity(1);
    setProductSearchTerm("");

    // تحديث البيانات في الخلفية
    fetchVisits().catch(console.error);
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

    // حذف المنتج من جدول product_sales
    const { error } = await supabase
      .from("product_sales")
      .delete()
      .eq("visit_id", selectedVisit.id)
      .eq("product_id", productId);

    if (error) throw error;

    // تحديث البيانات
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

const deleteAllVisits = async () => {
  if (!user) {
    setError("يجب تسجيل الدخول أولاً");
    return false;
  }

  try {
    setIsDeleting(true);
    setError(null);

    // 1. جلب جميع الزيارات الحالية مع تاريخ الزيارة الأصلي
    const { data: allVisits, error: visitsError } = await supabase
      .from("visits")
      .select("*");
    if (visitsError) throw visitsError;

    // 2. جلب جميع منتجات الزيارات
    const { data: allVisitProducts, error: productsError } = await supabase
      .from("visit_products")
      .select("*");
    if (productsError) throw productsError;

    // 3. نقل الزيارات إلى الأرشيف مع الاحتفاظ بالتاريخ الأصلي
    if (allVisits?.length > 0) {
      const { error: archiveError } = await supabase
        .from("deleted_visit")
        .insert(
          allVisits.map(visit => ({
            ...visit,
            id: crypto.randomUUID(), // توليد معرف جديد
            original_visit_date: visit.visit_date, // حفظ تاريخ الزيارة الأصلي
            deleted_at: new Date().toISOString() // تاريخ الحذف
          }))
        );
      if (archiveError) throw archiveError;
    }

    // 4. حذف جميع السجلات المرتبطة
    await supabase.from("visit_products").delete().not("id", "is", null);
    await supabase.from("visit_pauses").delete().not("id", "is", null);

    // 5. حذف جميع الزيارات الأصلية
    const { error: deleteError } = await supabase
      .from("visits")
      .delete()
      .not("id", "is", null);
    if (deleteError) throw deleteError;

    // 6. تحديث الواجهة
    setVisits([]);
    setSelectedVisit(null);
    setShowDeleteAllModal(false);

    alert("تم أرشفة جميع الزيارات بنجاح مع الاحتفاظ بتاريخ الزيارة الأصلي");
    return true;
  } catch (err) {
    console.error("فشل في أرشفة الزيارات:", err);
    setError(err?.message || "حدث خطأ أثناء أرشفة الزيارات");
    return false;
  } finally {
    setIsDeleting(false);
  }
};





const filteredVisits = visits
  .filter((visit) =>
    visit.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .sort((a, b) => {
    const getStatusRank = (v: Visit) => {
      if (!v.endTime && !v.isPaused) return 0;     // جارية
      if (v.isPaused) return 1;                    // متوقفة
      if (v.endTime) return 2;                     // منتهية
      return 3; // fallback
    };

    return getStatusRank(a) - getStatusRank(b);
  });




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

            <div className="flex justify-between">
              <button
                onClick={() => setIsSaleModalOpen(true)}
                className="bg-purple-500/20 text-purple-400 gap-4 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                عملية بيع
              </button>

              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                مسح الكل
              </button>
            </div>

            <div className="flex gap-4 mt-3">
              <div className="bg-blue-500/20 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-xs text-blue-300">
                  جارية:{" "}
                  {visits
                    .filter((v) => !v.endTime && !v.isPaused)
                    .reduce(
                      (sum, visit) => sum + (visit.numberOfPeople || 1),
                      0
                    )}
                </span>
              </div>
              <div className="bg-yellow-500/20 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span className="text-xs text-yellow-300">
                  متوقفة: {visits.filter((v) => v.isPaused).length}
                </span>
              </div>
              <div className="bg-green-500/20 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-xs text-green-300">
                  منتهية:{" "}
                  {
                    visits
                      .filter((v) => v.endTime) // الفلترة للزيارات المنتهية فقط
                      .reduce(
                        (sum, visit) => sum + (visit.numberOfPeople || 1),
                        0
                      ) // جمع عدد الأشخاص
                  }
                </span>
              </div>
            </div>

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

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  عدد الأشخاص
                </label>
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg border border-slate-700 px-3 w-full">
                  <button
                    type="button"
                    onClick={() =>
                      setNumberOfPeople((prev) => Math.max(1, prev - 1))
                    }
                    className="text-slate-400 hover:text-white"
                    disabled={numberOfPeople <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-white flex-1 text-center">
                    {numberOfPeople}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNumberOfPeople((prev) => prev + 1)}
                    className="text-slate-400 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
<div className="flex gap-4">
  <button
    type="button"
    onClick={(e) => handleSubmit(e, "default")}
    disabled={loading}
    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700"
  >
    {loading ? "..." : "تسجيل زيارة عادية"}
  </button>
  <button
    type="button"
    onClick={(e) => handleSubmit(e, "big")}
    disabled={loading}
    className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-yellow-700"
  >
    {loading ? "..." : "قاعة كبيرة"}
  </button>
  <button
    type="button"
    onClick={(e) => handleSubmit(e, "small")}
    disabled={loading}
    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700"
  >
    {loading ? "..." : "قاعة صغيرة"}
  </button>
</div>

            </form>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 h-[600px] overflow-y-scroll">
            <div className="flex items-center justify-between mb-6 sticky top-0 border-slate-700 px-6">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  سجل الزيارات
                </h2>
              </div>
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
                  onClick={() => handlevisit(visit)}
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
<span
  className={`px-3 py-1 rounded-full text-sm ${
    visit.endTime
      ? "bg-green-500/20 text-green-400"
      : visit.isPaused
      ? "bg-yellow-500/20 text-yellow-400"
      : "bg-blue-500/20 text-blue-400"
  }`}
>
  {visit.endTime
    ? "منتهية"
    : visit.isPaused
    ? "متوقفة مؤقتاً"
    : "جارية"}{" "}
  •{" "}
  {visit.type === "big"
    ? "قاعة كبيرة"
    : visit.type === "small"
    ? "قاعة صغيرة"
    : "عادية"}
</span>

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
                      عدد الأشخاص
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          const newNum = Math.max(
                            1,
                            (selectedVisit.numberOfPeople || 1) - 1
                          );
                          setSelectedVisit({
                            ...selectedVisit,
                            numberOfPeople: newNum,
                          });
                        }}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-white px-2">
                        {selectedVisit.numberOfPeople || 1}
                      </span>
                      <button
                        onClick={() => {
                          const newNum =
                            (selectedVisit.numberOfPeople || 1) + 1;
                          setSelectedVisit({
                            ...selectedVisit,
                            numberOfPeople: newNum,
                          });
                        }}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

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

                    <button
                      onClick={() => setIsEditingTime(!isEditingTime)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {isEditingTime ? <X size={16} /> : <Edit size={16} />}
                    </button>

                    <p className="text-white">
                      {formatDate(selectedVisit.startTime)} -{" "}
                      {formatTime(selectedVisit.startTime)}
                    </p>
                  </div>
                  {isEditingTime ? (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          وقت البدء
                        </label>
                        <input
                          type="datetime-local"
                          value={editedStartTime}
                          onChange={(e) => setEditedStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          وقت الانتهاء
                        </label>
                        <input
                          type="datetime-local"
                          value={editedEndTime}
                          onChange={(e) => setEditedEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                          disabled={!selectedVisit.endTime} // تعطيل إذا لم يكن هناك وقت انتهاء
                        />
                      </div>
                      <button
                        onClick={saveTimeChanges}
                        disabled={loading}
                        className="mt-2 bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        حفظ التعديلات
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-white">عدد الاشخاص</p>
                      <span className="text-white">{numberOfPeople}</span>
                      <p className="text-white">
                        البدء: {formatDate(selectedVisit.startTime)} -{" "}
                        {formatTime(selectedVisit.startTime)}
                      </p>
                      {selectedVisit.endTime && (
                        <p className="text-white mt-1">
                          الانتهاء: {formatDate(selectedVisit.endTime)} -{" "}
                          {formatTime(selectedVisit.endTime)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
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
                        {selectedVisit.numberOfPeople || 1} أشخاص
                      </span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>تكلفة الوقت:</span>
                      <span>
                        {formatCurrency(
                          calculateTimeCost(
                            calculateVisitDuration(selectedVisit),
                            selectedVisit.numberOfPeople || 1,
                            selectedVisit.type || "default"
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-600">
                      <span>الإجمالي:</span>
                      <span>
                       {formatCurrency(calculateTotalAmount(selectedVisit) + product)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                {!isCalculated ? (
                  <>
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
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedVisit(null);
                      setIsCalculated(false); // إعادة تعيين الحالة للمرة القادمة
                    }}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                  >
                    إغلاق
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <SaleModal
      Setproduct={Setproduct}
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        products={products}
        
      />
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                تأكيد حذف جميع الزيارات
              </h3>
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-slate-300 mb-6">
              هل أنت متأكد من رغبتك في حذف{" "}
              <span className="font-bold text-white">جميع الزيارات</span>؟<br />
              لا يمكن التراجع عن هذه العملية.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 text-white bg-slate-600 hover:bg-slate-700 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={deleteAllVisits}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    جاري الحذف...
                    <Spinner />
                  </>
                ) : (
                  "نعم، احذف الكل"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
