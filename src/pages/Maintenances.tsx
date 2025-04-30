import React, { useState, useEffect } from "react";
import { Wrench, Plus, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface Maintenance {
  id: string;
  description: string;
  cost: number;
  date: Date;
}

interface Revenue {
  total: number;
}

const Maintenances = () => {
  const [maintenanceRecords, setMaintenanceRecords] = useState<Maintenance[]>(
    []
  );
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    description: "",
    cost: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (user) {
      fetchMaintenanceRecords();
      fetchTotalRevenue();
    }
  }, [user]);

  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("maintenance")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      setMaintenanceRecords(
        data.map((record) => ({
          ...record,
          date: new Date(record.date),
        }))
      );
    } catch (err) {
      console.error("Error fetching maintenance records:", err);
      setError("حدث خطأ أثناء تحميل سجلات الصيانة");
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

      const { error } = await supabase.from("maintenance").insert([
        {
          description: formData.description,
          cost: Number(formData.cost),
          date: new Date(formData.date).toISOString(),
        },
      ]);

      if (error) throw error;

      await fetchMaintenanceRecords();
      setFormData({
        description: "",
        cost: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowAddForm(false);
    } catch (err: any) {
      console.error("Error saving maintenance record:", err);
      setError(err.message || "حدث خطأ أثناء حفظ سجل الصيانة");
    } finally {
      setLoading(false);
    }
  };

  const totalMaintenanceCost = maintenanceRecords.reduce(
    (sum, record) => sum + record.cost,
    0
  );
  const netProfit = totalRevenue - totalMaintenanceCost;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-EG")} جنيه`;
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
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wrench className="h-8 w-8 text-blue-400" />
            الصيانة
          </h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            إضافة صيانة
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              تكاليف الصيانة
            </h3>
            <p className="text-2xl font-bold text-red-400">
              {formatCurrency(totalMaintenanceCost)}
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
        </div>

        {/* Add Maintenance Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  إضافة سجل صيانة
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
                    وصف الصيانة
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
                    التكلفة (جنيه)
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
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

        {/* Maintenance Records */}
        <div className="space-y-4">
          {maintenanceRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {record.description}
                  </h3>
                  <p className="text-slate-400 mt-2">
                    {record.date.toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <p className="text-xl font-bold text-red-400">
                  {formatCurrency(record.cost)}
                </p>
              </div>
            </div>
          ))}

          {!loading && maintenanceRecords.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-slate-400">لا توجد سجلات صيانة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Maintenances;
