import React, { useState, useEffect } from "react";
import { Plus, X, User, Percent, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface Partner {
  id?: string;
  name: string;
  percentage: number;
  created_at?: string;
}

const Partners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartner, setNewPartner] = useState<Partner>({ name: "", percentage: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [netProfit, setNetProfit] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPartners();
      fetchNetProfit();
    }
  }, [user]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPartners(data || []);
    } catch (err) {
      console.error("Error fetching partners:", err);
      setError("حدث خطأ أثناء جلب بيانات الشركاء");
    } finally {
      setLoading(false);
    }
  };

  const fetchNetProfit = async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch net profit from profit_archive
      const { data, error } = await supabase
        .from("profit_archive")
        .select("net_profit")
        .eq("date", today)
        .single();

      if (error) throw error;
      setNetProfit(data?.net_profit || 0);
    } catch (err) {
      console.error("Error fetching net profit:", err);
      setError("حدث خطأ أثناء جلب صافي الربح");
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate total percentage won't exceed 100%
    const totalPercentage = partners.reduce((sum, p) => sum + p.percentage, 0) + newPartner.percentage;
    if (totalPercentage > 100) {
      setError("إجمالي النسب المئوية لا يمكن أن يتجاوز 100%");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("partners")
        .insert([newPartner])
        .select()
        .single();

      if (error) throw error;

      setPartners([...partners, data]);
      setNewPartner({ name: "", percentage: 0 });
    } catch (err) {
      console.error("Error adding partner:", err);
      setError("حدث خطأ أثناء إضافة الشريك");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePartner = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("partners")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPartners(partners.filter(p => p.id !== id));
    } catch (err) {
      console.error("Error deleting partner:", err);
      setError("حدث خطأ أثناء حذف الشريك");
    } finally {
      setLoading(false);
    }
  };

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
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">توزيع الأرباح على الشركاء</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Net Profit Summary */}
        <div className="bg-emerald-500/10 backdrop-blur-lg p-6 rounded-xl border border-emerald-500/20 mb-8">
          <h3 className="text-sm font-medium text-emerald-400 mb-2">
            صافي الربح اليومي المتاح للتوزيع
          </h3>
          <p className="text-3xl font-bold text-emerald-400">
            {formatCurrency(netProfit)}
          </p>
        </div>

        {/* Add Partner Form */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">إضافة شريك جديد</h2>
          <form onSubmit={handleAddPartner} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  اسم الشريك
                </label>
                <input
                  type="text"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  النسبة المئوية (%)
                </label>
                <input
                  type="number"
                  value={newPartner.percentage || ""}
                  onChange={(e) => setNewPartner({ ...newPartner, percentage: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              <Plus className="h-5 w-5" />
              {loading ? "جاري الإضافة..." : "إضافة شريك"}
            </button>
          </form>
        </div>

        {/* Partners List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mb-4">قائمة الشركاء</h2>
          
          {loading && partners.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-400 mt-4">جاري تحميل بيانات الشركاء...</p>
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-lg">
              <p className="text-xl text-slate-400">لا يوجد شركاء مسجلين</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-slate-800/50 rounded-lg border border-slate-700">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-6 py-3 text-right text-sm font-medium text-slate-300">#</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-slate-300">اسم الشريك</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-slate-300">النسبة المئوية</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-slate-300">المبلغ المستحق</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-slate-300">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((partner, index) => (
                    <tr key={partner.id || index} className="border-b border-slate-700 hover:bg-slate-800/30">
                      <td className="px-6 py-4 text-slate-300">{index + 1}</td>
                      <td className="px-6 py-4 text-white font-medium flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-400" />
                        {partner.name}
                      </td>
                      <td className="px-6 py-4 text-slate-300 flex items-center gap-2">
                        <Percent className="h-5 w-5 text-yellow-400" />
                        {partner.percentage}%
                      </td>
                      <td className="px-6 py-4 text-emerald-400 font-medium">
                        {formatCurrency((netProfit * partner.percentage) / 100)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => partner.id && handleDeletePartner(partner.id)}
                          className="text-red-400 hover:text-red-300 p-2"
                          disabled={loading}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-800/70 font-bold">
                    <td className="px-6 py-4 text-slate-300">المجموع</td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-white">
                      {partners.reduce((sum, p) => sum + p.percentage, 0)}%
                    </td>
                    <td className="px-6 py-4 text-emerald-400">
                      {formatCurrency((netProfit * partners.reduce((sum, p) => sum + p.percentage, 0)) / 100)}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Partners;