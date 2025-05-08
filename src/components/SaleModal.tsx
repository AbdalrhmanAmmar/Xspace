import React, { useState, useEffect } from "react";
import { X, Plus, Minus, ShoppingCart, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Product } from "../types/product";
import { Spinner } from "./Spinner";

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleComplete: () => void;
}

export const SaleModal = ({ isOpen, onClose, onSaleComplete }: SaleModalProps) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<{ id: string; quantity: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchLinkedProducts();
    } else {
      setSearchTerm("");
      setCart([]);
      setError(null);
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("حدث خطأ أثناء تحميل المنتجات");
    }
  };

  const fetchLinkedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("linked_products")
        .select(`*, linkedProduct:linked_product_id(*)`);
      if (error) throw error;
      setLinkedProducts(data || []);
    } catch (err) {
      console.error("Error fetching linked products:", err);
      setError("حدث خطأ أثناء تحميل المنتجات المرتبطة");
    }
  };

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.quantity <= 0) {
      setError("هذا المنتج غير متوفر حالياً");
      return;
    }

    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === productId);
      
      if (existingItem) {
        if (existingItem.quantity + 1 > product.quantity) {
          setError("عذراً، الكمية المطلوبة غير متوفرة");
          return currentCart;
        }
        return currentCart.map(item =>
          item.id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...currentCart, { id: productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === productId);
      if (!existingItem) return currentCart;

      if (existingItem.quantity === 1) {
        return currentCart.filter(item => item.id !== productId);
      }

      return currentCart.map(item =>
        item.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const product = products.find(p => p.id === item.id);
      if (!product) return total;
      return total + (product.price * item.quantity);
    }, 0);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      setError("يجب إضافة منتجات للسلة أولاً");
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
      // Process each product in the cart
      for (const item of cart) {
        const { data: result, error: checkError } = await supabase
          .rpc("check_and_update_product_quantities", {
            product_id: item.id,
            quantity_needed: item.quantity,
          });
  
        if (checkError) throw checkError;
  
        if (!result.success) {
          throw new Error(result.error_message);
        }
      }
  
      const total = calculateTotal(); // ✅ حساب المجموع قبل تصفير السلة
  
      onSaleComplete(); // استدعاء الكولباك إن أردت استخدامه في الأعلى مثلاً
      alert(`تمت عملية البيع بنجاح! الإجمالي: ${total.toLocaleString("ar-EG")} جنيه`);
  
      setCart([]); // ✅ بعد الحساب
      onClose();
    } catch (err: any) {
      console.error("Error processing sale:", err);
      setError(err.message || "حدث خطأ أثناء معالجة عملية البيع");
    } finally {
      setLoading(false);
    }
  };
  

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            عملية بيع جديدة
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
          {/* Search Products */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>

          {/* Products List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-slate-700/50 p-3 rounded-lg border border-slate-600"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white">{product.name}</span>
                      {linkedProducts.some(lp => lp.main_product_id === product.id) && (
                        <LinkIcon className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {product.price.toLocaleString("ar-EG")} جنيه
                    </p>
                    <p className="text-xs text-slate-500">
                      المتوفر: {product.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cart.find(item => item.id === product.id)?.quantity > 0 ? (
                      <>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="p-1 text-red-400 hover:bg-slate-600 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-white px-2">
                          {cart.find(item => item.id === product.id)?.quantity || 0}
                        </span>
                        <button
                          onClick={() => addToCart(product.id)}
                          className="p-1 text-green-400 hover:bg-slate-600 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => addToCart(product.id)}
                        disabled={product.quantity === 0}
                        className={`p-2 ${
                          product.quantity > 0
                            ? "text-green-400 hover:bg-slate-600"
                            : "text-gray-500 cursor-not-allowed"
                        } rounded transition-colors`}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Show linked products */}
                {cart.find(item => item.id === product.id) && 
                  linkedProducts
                    .filter(lp => lp.main_product_id === product.id)
                    .map(link => (
                      <div
                        key={link.id}
                        className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-600/50"
                      >
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-3 w-3 text-blue-400" />
                          <span className="text-slate-300 text-sm">
                            {link.linkedProduct.name}
                          </span>
                          <span className="text-slate-400 text-xs">
                            ({link.quantity}x)
                          </span>
                        </div>
                      </div>
                    ))
                }
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-3">ملخص السلة</h3>
              <div className="space-y-2">
                {cart.map(item => {
                  const product = products.find(p => p.id === item.id);
                  if (!product) return null;
                  return (
                    <div key={item.id} className="flex justify-between text-slate-300">
                      <span>{product.name} (×{item.quantity})</span>
                      <span>{(product.price * item.quantity).toLocaleString("ar-EG")} جنيه</span>
                    </div>
                  );
                })}
                <div className="border-t border-slate-600 pt-2 mt-2">
                  <div className="flex justify-between text-white font-bold">
                    <span>الإجمالي:</span>
                    <span>{calculateTotal().toLocaleString("ar-EG")} جنيه</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 text-white py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || cart.length === 0}
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
    </div>
  );
};