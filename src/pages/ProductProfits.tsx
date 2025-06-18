import React, { useState, useEffect } from "react";
import { TrendingUp, Package, DollarSign, Search, Filter, Calendar, BarChart3 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { DateRangePicker } from "../components/DateRangePicker";

interface ProductProfit {
  id: string;
  name: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalQuantitySold: number;
  averageProfit: number;
  profitMargin: number;
  salesCount: number;
  buyPrice: number;
  sellPrice: number;
}

interface ProductSale {
  id: string;
  product_id: string;
  price: number;
  buy_price: number;
  quantity: number;
  profit: number;
  created_at: string;
  product_name: string;
}

const ProductProfits = () => {
  const [productProfits, setProductProfits] = useState<ProductProfit[]>([]);
  const [filteredProfits, setFilteredProfits] = useState<ProductProfit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'profit' | 'revenue' | 'margin' | 'quantity'>('profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date()
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProductProfits();
    }
  }, [user, dateRange]);

  useEffect(() => {
    filterAndSortProfits();
  }, [productProfits, searchTerm, sortBy, sortOrder]);

  const fetchProductProfits = async () => {
    try {
      setLoading(true);
      setError(null);

      // جلب جميع المبيعات في النطاق الزمني المحدد
      const { data: salesData, error: salesError } = await supabase
        .from("product_sales")
        .select(`
          *,
          products (name)
        `)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;

      // جلب مبيعات من visit_products
      const { data: visitProductsData, error: visitProductsError } = await supabase
        .from("visit_products")
        .select(`
          *,
          products (name, buyPrice)
        `)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (visitProductsError) throw visitProductsError;

      // جلب مبيعات من deleted_visit_products
      const { data: deletedVisitProductsData, error: deletedVisitProductsError } = await supabase
        .from("deleted_visit_products")
        .select(`
          *,
          products (name, buyPrice)
        `)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (deletedVisitProductsError) throw deletedVisitProductsError;

      // دمج جميع البيانات
      const allSales: ProductSale[] = [
        ...(salesData || []).map(sale => ({
          id: sale.id,
          product_id: sale.product_id,
          price: sale.price,
          buy_price: sale.buy_price || 0,
          quantity: sale.quantity,
          profit: sale.profit || (sale.price - (sale.buy_price || 0)) * sale.quantity,
          created_at: sale.created_at,
          product_name: sale.products?.name || "منتج محذوف"
        })),
        ...(visitProductsData || []).map(vp => ({
          id: vp.id,
          product_id: vp.product_id,
          price: vp.price,
          buy_price: vp.products?.buyPrice ? parseFloat(vp.products.buyPrice) : 0,
          quantity: vp.quantity,
          profit: (vp.price - (vp.products?.buyPrice ? parseFloat(vp.products.buyPrice) : 0)) * vp.quantity,
          created_at: vp.created_at,
          product_name: vp.products?.name || "منتج محذوف"
        })),
        ...(deletedVisitProductsData || []).map(dvp => ({
          id: dvp.id,
          product_id: dvp.product_id,
          price: dvp.price,
          buy_price: dvp.products?.buyPrice ? parseFloat(dvp.products.buyPrice) : 0,
          quantity: dvp.quantity,
          profit: (dvp.price - (dvp.products?.buyPrice ? parseFloat(dvp.products.buyPrice) : 0)) * dvp.quantity,
          created_at: dvp.created_at,
          product_name: dvp.products?.name || "منتج محذوف"
        }))
      ];

      // تجميع البيانات حسب المنتج
      const productMap = new Map<string, ProductProfit>();

      allSales.forEach(sale => {
        if (!sale.product_id) return;

        const existing = productMap.get(sale.product_id);
        const revenue = sale.price * sale.quantity;
        const cost = sale.buy_price * sale.quantity;
        const profit = sale.profit;

        if (existing) {
          existing.totalRevenue += revenue;
          existing.totalCost += cost;
          existing.totalProfit += profit;
          existing.totalQuantitySold += sale.quantity;
          existing.salesCount += 1;
        } else {
          productMap.set(sale.product_id, {
            id: sale.product_id,
            name: sale.product_name,
            totalRevenue: revenue,
            totalCost: cost,
            totalProfit: profit,
            totalQuantitySold: sale.quantity,
            averageProfit: 0,
            profitMargin: 0,
            salesCount: 1,
            buyPrice: sale.buy_price,
            sellPrice: sale.price
          });
        }
      });

      // حساب المتوسطات والنسب
      const profits = Array.from(productMap.values()).map(product => ({
        ...product,
        averageProfit: product.totalProfit / product.salesCount,
        profitMargin: product.totalRevenue > 0 ? (product.totalProfit / product.totalRevenue) * 100 : 0
      }));

      setProductProfits(profits);
    } catch (err) {
      console.error("Error fetching product profits:", err);
      setError("حدث خطأ أثناء تحميل أرباح المنتجات");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProfits = () => {
    let filtered = productProfits;

    // تصفية حسب البحث
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ترتيب البيانات
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'profit':
          aValue = a.totalProfit;
          bValue = b.totalProfit;
          break;
        case 'revenue':
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case 'margin':
          aValue = a.profitMargin;
          bValue = b.profitMargin;
          break;
        case 'quantity':
          aValue = a.totalQuantitySold;
          bValue = b.totalQuantitySold;
          break;
        default:
          aValue = a.totalProfit;
          bValue = b.totalProfit;
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    setFilteredProfits(filtered);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-EG")} جنيه`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const getTotalStats = () => {
    return filteredProfits.reduce(
      (acc, product) => ({
        totalRevenue: acc.totalRevenue + product.totalRevenue,
        totalProfit: acc.totalProfit + product.totalProfit,
        totalQuantity: acc.totalQuantity + product.totalQuantitySold,
        totalProducts: acc.totalProducts + 1
      }),
      { totalRevenue: 0, totalProfit: 0, totalQuantity: 0, totalProducts: 0 }
    );
  };

  const totalStats = getTotalStats();
  const overallProfitMargin = totalStats.totalRevenue > 0 
    ? (totalStats.totalProfit / totalStats.totalRevenue) * 100 
    : 0;

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-400" />
            أرباح المنتجات بالتفصيل
          </h1>
          
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onChange={(start, end) => setDateRange({ start, end })}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* إحصائيات إجمالية */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
            <h3 className="text-sm font-medium text-slate-400 mb-2">إجمالي الإيرادات</h3>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalStats.totalRevenue)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
            <h3 className="text-sm font-medium text-slate-400 mb-2">إجمالي الأرباح</h3>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalStats.totalProfit)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
            <h3 className="text-sm font-medium text-slate-400 mb-2">هامش الربح الإجمالي</h3>
            <p className="text-2xl font-bold text-blue-400">{formatPercentage(overallProfitMargin)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
            <h3 className="text-sm font-medium text-slate-400 mb-2">عدد المنتجات</h3>
            <p className="text-2xl font-bold text-white">{totalStats.totalProducts}</p>
          </div>
        </div>

        {/* أدوات البحث والتصفية */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full pl-4 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400"
                dir="rtl"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="profit">ترتيب حسب الربح</option>
                <option value="revenue">ترتيب حسب الإيرادات</option>
                <option value="margin">ترتيب حسب هامش الربح</option>
                <option value="quantity">ترتيب حسب الكمية</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700"
              >
                {sortOrder === 'desc' ? 'تنازلي' : 'تصاعدي'}
              </button>
            </div>
          </div>
        </div>

        {/* قائمة المنتجات */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredProfits.length === 0 ? (
          <div className="bg-slate-800/50 p-8 rounded-xl text-center">
            <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">
              {searchTerm ? "لا توجد منتجات مطابقة للبحث" : "لا توجد بيانات أرباح للفترة المحددة"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProfits.map((product, index) => (
              <div
                key={product.id}
                className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20 hover:border-blue-500/50 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-500/20 p-3 rounded-lg">
                      <span className="text-blue-400 font-bold text-lg">#{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{product.name}</h3>
                      <p className="text-slate-400">
                        {product.salesCount} عملية بيع • {product.totalQuantitySold} قطعة مباعة
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <div className="text-center">
                      <p className="text-sm text-slate-400">إجمالي الإيرادات</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(product.totalRevenue)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-400">إجمالي التكلفة</p>
                      <p className="text-lg font-bold text-red-400">{formatCurrency(product.totalCost)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-400">صافي الربح</p>
                      <p className="text-lg font-bold text-green-400">{formatCurrency(product.totalProfit)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-400">هامش الربح</p>
                      <p className="text-lg font-bold text-blue-400">{formatPercentage(product.profitMargin)}</p>
                    </div>
                  </div>
                </div>

                {/* شريط تقدم هامش الربح */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">هامش الربح</span>
                    <span className="text-sm text-blue-400">{formatPercentage(product.profitMargin)}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(product.profitMargin, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* تفاصيل إضافية */}
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">متوسط الربح:</span>
                      <span className="text-white ml-2">{formatCurrency(product.averageProfit)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">سعر البيع:</span>
                      <span className="text-white ml-2">{formatCurrency(product.sellPrice)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">سعر الشراء:</span>
                      <span className="text-white ml-2">{formatCurrency(product.buyPrice)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">الربح لكل قطعة:</span>
                      <span className="text-green-400 ml-2">{formatCurrency(product.sellPrice - product.buyPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductProfits;