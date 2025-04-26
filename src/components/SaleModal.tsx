// components/SaleModal.tsx
import { useState, useEffect } from "react";
import { X, Plus, Minus, ShoppingCart } from "lucide-react";
import type { Product, CartItem } from "../types/product";
import { Spinner } from "./Spinner";

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSaleComplete: (total: number) => void;
}

export const SaleModal = ({
  isOpen,
  onClose,
  products,
  onSaleComplete,
}: SaleModalProps) => {
  const [selectedProducts, setSelectedProducts] = useState<CartItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilteredProducts(
      products.filter((product) =>
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
      )
    );
  }, [productSearchTerm, products]);

  useEffect(() => {
    if (isOpen) {
      setSelectedProducts([]);
      setProductSearchTerm("");
      setError(null);
    }
  }, [isOpen]);

  const addProduct = (product: Product) => {
    const existingProduct = selectedProducts.find((p) => p.id === product.id);

    if (existingProduct) {
      setSelectedProducts(
        selectedProducts.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ]);
    }

    setProductSearchTerm("");
    setIsProductDropdownOpen(false);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(
      selectedProducts.filter((product) => product.id !== productId)
    );
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setSelectedProducts(
      selectedProducts.map((product) =>
        product.id === productId
          ? { ...product, quantity: newQuantity }
          : product
      )
    );
  };

  const calculateTotal = () => {
    return selectedProducts.reduce(
      (sum, product) => sum + product.price * product.quantity,
      0
    );
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-EG")} جنيه`;
  };

  // في نهاية دالة handleSubmit في SaleModal.tsx
  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      setError("يجب إضافة منتجات على الأقل");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const total = calculateTotal();
      onSaleComplete(total);

      // إعادة تعيين الحالة بعد اكتمال العملية
      setSelectedProducts([]);
      setProductSearchTerm("");

      onClose();
    } catch (err) {
      console.error("Error processing sale:", err);
      setError("حدث خطأ أثناء معالجة عملية البيع");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            عملية بيع
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              إضافة منتجات
            </h3>
            <div className="relative">
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
                disabled={loading}
              />

              {isProductDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => addProduct(product)}
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
          </div>

          {selectedProducts.length > 0 && (
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-300 mb-3">
                المنتجات المختارة
              </h3>
              <div className="space-y-2">
                {selectedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateQuantity(product.id, product.quantity - 1)
                          }
                          className="text-slate-400 hover:text-white p-1"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-white px-1">
                          {product.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(product.id, product.quantity + 1)
                          }
                          className="text-slate-400 hover:text-white p-1"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-white">
                        {formatCurrency(product.price * product.quantity)}
                      </span>
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-700/50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              ملخص العملية
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-white">
                <span>عدد المنتجات:</span>
                <span>{selectedProducts.length}</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-600">
                <span>الإجمالي:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-600 text-white py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedProducts.length === 0}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                جاري المعالجة...
                <Spinner />
              </>
            ) : (
              "تأكيد البيع"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
