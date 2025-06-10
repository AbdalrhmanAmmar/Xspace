import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { DateRangePicker } from "../components/DateRangePicker";

// Register ChartJS components once at module scope
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

interface SalesPoint {
  date: string;
  quantity: number;
}

interface ProductPerformance {
  id: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
  salesOverTime: SalesPoint[];
}

/**
 * Helper to format numbers using the Arabic‑Egypt locale
 */
const formatNumber = (n?: number) => (n ?? 0).toLocaleString("ar-EG");

export const ProductPerformanceChart: React.FC = () => {
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([]);
  const [worstProducts, setWorstProducts] = useState<ProductPerformance[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductPerformance | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => ({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date(),
  }));

  /**
   * Fetch aggregated performance for all products between the chosen dates.
   * Uses the PostgreSQL function `product_performance(start_date, end_date)`
   * that must exist on the backend.
   */
  const fetchProductPerformance = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc("product_performance", {
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
      });

      if (error) throw error;

      // Ensure we always deal with an array
      const products: ProductPerformance[] = (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        totalSold: Number(row.total_sold ?? 0),
        totalRevenue: Number(row.total_revenue ?? 0),
        salesOverTime: row.sales_over_time ?? [],
      }));

      // Sort by total sold descending
      const sorted = [...products].sort((a, b) => b.totalSold - a.totalSold);

      // Cap to 5 items (or fewer if dataset smaller)
      const cap = Math.min(5, sorted.length);
      setTopProducts(sorted.slice(0, cap));
      setWorstProducts(sorted.slice(-cap).reverse());

      // Auto‑select first product if nothing selected
      if (!selectedProduct && sorted.length > 0) {
        setSelectedProduct(sorted[0]);
      }
    } catch (err: any) {
      console.error("Error fetching product performance", err);
      setError(err.message ?? "خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  // Fetch whenever the dateRange changes
  useEffect(() => {
    fetchProductPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  /* ========================
   *   Chart.js Datasets
   * ======================*/

  const barChartData = React.useMemo(() => {
    if (topProducts.length === 0 && worstProducts.length === 0) return undefined;

    const labels = [...topProducts, ...worstProducts].map((p) => p.name);

    return {
      labels,
      datasets: [
        {
          label: "الكمية المباعة",
          data: [...topProducts, ...worstProducts].map((p) => p.totalSold),
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
        {
          label: "الإيرادات (ج.م)",
          data: [...topProducts, ...worstProducts].map((p) => p.totalRevenue),
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [topProducts, worstProducts]);

  const lineChartData = React.useMemo(() => {
    if (!selectedProduct) return undefined;

    return {
      labels: selectedProduct.salesOverTime.map((s) => s.date),
      datasets: [
        {
          label: `الكمية المباعة – ${selectedProduct.name}`,
          data: selectedProduct.salesOverTime.map((s) => s.quantity),
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          tension: 0.1,
        },
      ],
    };
  }, [selectedProduct]);

  /* ========================
   *   Chart.js Options
   * ======================*/
  const commonFont = { family: "Tajawal, sans-serif" } as const;

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: {
        display: true,
        text: "أفضل وأسوأ المنتجات حسب الكمية المباعة",
        font: { size: 16, ...commonFont },
      },
    },
    scales: {
      x: { ticks: { font: commonFont } },
      y: { ticks: { font: commonFont } },
    },
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: {
        display: true,
        text: `أداء ${selectedProduct?.name ?? "المنتج"} عبر الزمن`,
        font: { size: 16, ...commonFont },
      },
    },
    scales: {
      x: { ticks: { font: commonFont } },
      y: { ticks: { font: commonFont } },
    },
  };

  /* ========================
   *        RENDER
   * ======================*/

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-white">أداء المنتجات</h2>
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onChange={(start, end) => setDateRange({ start, end })}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* ───────────────────────── Top / Worst Lists ───────────────────────── */}
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              لا توجد مبيعات في النطاق الزمني المختار.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Best */}
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-4">أفضل المنتجات</h3>
                <div className="space-y-3">
                  {topProducts.map((p) => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
            /* Highlight selected */
                        selectedProduct?.id === p.id
                          ? "bg-blue-500/20 border border-blue-500/30"
                          : "bg-slate-700/50 hover:bg-slate-700/70"
                      }`}
                      onClick={() => setSelectedProduct(p)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">{p.name}</span>
                        <div className="flex gap-4">
                          <span className="text-green-400">{p.totalSold} وحدة</span>
                          <span className="text-blue-300">{formatNumber(p.totalRevenue)} ج.م</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Worst */}
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-4">أسوأ المنتجات</h3>
                <div className="space-y-3">
                  {worstProducts.map((p) => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
            selectedProduct?.id === p.id
              ? "bg-blue-500/20 border border-blue-500/30"
              : "bg-slate-700/50 hover:bg-slate-700/70"
          }`}
                      onClick={() => setSelectedProduct(p)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">{p.name}</span>
                        <div className="flex gap-4">
                          <span className="text-red-400">{p.totalSold} وحدة</span>
                          <span className="text-blue-300">{formatNumber(p.totalRevenue)} ج.م</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────── Bar Chart ───────────────────────── */}
          {barChartData && (
            <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
              <Bar options={barChartOptions} data={barChartData} />
            </div>
          )}

          {/* ───────────────────────── Line Chart ───────────────────────── */}
          {selectedProduct && lineChartData && (
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <Line options={lineChartOptions} data={lineChartData} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
