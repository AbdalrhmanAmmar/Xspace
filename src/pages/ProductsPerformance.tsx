import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type ProductPerformance = {
  id: string;
  name: string;
  totalSales: number;
  totalQuantity: number;
  totalProfit: number;
  buyPrice: number | null;
  price: number;
  category?: {
    name: string;
  } | null;
};

export const ProductPerformance = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ProductPerformance;
    direction: "ascending" | "descending";
  }>({ key: "totalProfit", direction: "descending" });

  useEffect(() => {
    if (user) {
      fetchProductPerformance();
    }
  }, [user, dateRange]);

  const fetchProductPerformance = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = dateRange[0].startDate.toISOString().split("T")[0];
      const endDate = dateRange[0].endDate.toISOString().split("T")[0];

      const { data: salesData, error: salesError } = await supabase
        .from("product_sales")
        .select("product_id, price, buy_price, quantity, profit, created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (salesError) throw salesError;

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, buyPrice, price, category:category_id(name)");

      if (productsError) throw productsError;

      // Aggregate sales data by product
      const performanceMap = new Map<string, ProductPerformance>();

      // Initialize all products
      productsData?.forEach((product) => {
        performanceMap.set(product.id, {
          id: product.id,
          name: product.name,
          totalSales: 0,
          totalQuantity: 0,
          totalProfit: 0,
          buyPrice: product.buyPrice,
          price: product.price,
          category: product.category,
        });
      });

      // Process sales data
      salesData?.forEach((sale) => {
        const product = performanceMap.get(sale.product_id);
        if (product) {
          product.totalSales += sale.price * sale.quantity;
          product.totalQuantity += sale.quantity;
          product.totalProfit += sale.profit;
        }
      });

      setProducts(Array.from(performanceMap.values()));
    } catch (err: any) {
      console.error("Error fetching product performance:", err);
      setError(err.message || "Error loading product performance data");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof ProductPerformance) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "ascending" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "ascending" ? 1 : -1;
    }
    return 0;
  });

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} EGP`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB");
  };

  const chartData = sortedProducts
    .filter((p) => p.totalSales > 0)
    .slice(0, 10)
    .map((product) => ({
      name: product.name,
      sales: product.totalSales,
      profit: product.totalProfit,
    }));

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">أداء المنتجات</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <span>
                  {formatDate(dateRange[0].startDate)} - {formatDate(dateRange[0].endDate)}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {showDatePicker && (
                <div className="absolute z-10 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
                  <DateRangePicker
                    ranges={dateRange}
                    onChange={(item: any) => {
                      setDateRange([item.selection]);
                      setShowDatePicker(false);
                    }}
                    months={2}
                    direction="horizontal"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-lg ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                عرض جدولي
              </button>
              <button
                onClick={() => setViewMode("chart")}
                className={`px-4 py-2 rounded-lg ${
                  viewMode === "chart"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                عرض بياني
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : viewMode === "chart" ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              أفضل 10 منتجات حسب المبيعات
            </h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    tick={{ fill: "#e2e8f0" }}
                  />
                  <YAxis tick={{ fill: "#e2e8f0" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      value === value ? "المبيعات" : "الربح",
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="sales"
                    name="إجمالي المبيعات"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="profit"
                    name="صافي الربح"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center justify-end">
                        المنتج
                        {sortConfig.key === "name" && (
                          <span className="ml-1">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center justify-end">
                        الفئة
                        {sortConfig.key === "category" && (
                          <span className="ml-1">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("totalQuantity")}
                    >
                      <div className="flex items-center justify-end">
                        الكمية المباعة
                        {sortConfig.key === "totalQuantity" && (
                          <span className="ml-1">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("totalSales")}
                    >
                      <div className="flex items-center justify-end">
                        إجمالي المبيعات
                        {sortConfig.key === "totalSales" && (
                          <span className="ml-1">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("totalProfit")}
                    >
                      <div className="flex items-center justify-end">
                        صافي الربح
                        {sortConfig.key === "totalProfit" && (
                          <span className="ml-1">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider"
                    >
                      هامش الربح
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {sortedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-white">{product.name}</div>
                        <div className="text-slate-400 text-sm">
                          {formatCurrency(product.price)} للوحدة
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                        {product.category?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                        {product.totalQuantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-white">
                        {formatCurrency(product.totalSales)}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-right ${
                          product.totalProfit >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatCurrency(product.totalProfit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                        {product.totalSales > 0
                          ? `${Math.round(
                              (product.totalProfit / product.totalSales) * 100
                            )}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-800/50">
                  <tr>
                    <td
                      colSpan={2}
                      className="px-6 py-4 whitespace-nowrap text-right font-bold text-white"
                    >
                      الإجمالي
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-white">
                      {sortedProducts.reduce(
                        (sum, product) => sum + product.totalQuantity,
                        0
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-white">
                      {formatCurrency(
                        sortedProducts.reduce(
                          (sum, product) => sum + product.totalSales,
                          0
                        )
                      )}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-right font-bold ${
                        sortedProducts.reduce(
                          (sum, product) => sum + product.totalProfit,
                          0
                        ) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatCurrency(
                        sortedProducts.reduce(
                          (sum, product) => sum + product.totalProfit,
                          0
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-white">
                      {sortedProducts.reduce(
                        (sum, product) => sum + product.totalSales,
                        0
                      ) > 0
                        ? `${Math.round(
                            (sortedProducts.reduce(
                              (sum, product) => sum + product.totalProfit,
                              0
                            ) /
                              sortedProducts.reduce(
                                (sum, product) => sum + product.totalSales,
                                0
                              )) *
                              100
                          )}%`
                        : "-"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};