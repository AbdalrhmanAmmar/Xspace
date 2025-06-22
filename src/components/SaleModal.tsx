import React, { useState, useEffect } from "react";
import { X, Plus, Minus, ShoppingCart, Link as LinkIcon, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Product } from "../types/product";
import { Spinner } from "./Spinner";

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleComplete: () => void;
  Setproduct: (total: number) => void;
}

export const SaleModal = ({ isOpen, onClose, onSaleComplete, Setproduct }: SaleModalProps) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<{ id: string; quantity: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [saleTotal, setSaleTotal] = useState(0);
  const [saleProfit, setSaleProfit] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchLinkedProducts();
      Setproduct(0);
    } else {
      setSearchTerm("");
      setCart([]);
      setError(null);
      setShowSuccessModal(false);
      setDebugInfo(null);
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", {
        error: err,
        timestamp: new Date().toISOString()
      });
      setError("حدث خطأ أثناء تحميل المنتجات");
    } finally {
      setLoading(false);
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
      console.error("Error fetching linked products:", {
        error: err,
        timestamp: new Date().toISOString()
      });
      setError("حدث خطأ أثناء تحميل المنتجات المرتبطة");
    }
  };

  const addToCart = (productId: string) => {
    setError(null);
    const product = products.find(p => p.id === productId);
    if (!product) {
      setError("المنتج غير موجود");
      return;
    }

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
    setError(null);
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
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const calculateProfit = () => {
    let totalProfit = 0;
    
    cart.forEach(item => {
      const mainProduct = products.find(p => p.id === item.id);
      if (!mainProduct) return;
      
      const mainProductProfit = (mainProduct.price - (mainProduct.buyPrice || 0)) * item.quantity;
      totalProfit += mainProductProfit;
      
      linkedProducts
        .filter(lp => lp.main_product_id === mainProduct.id)
        .forEach(link => {
          const linkedProduct = products.find(p => p.id === link.linked_product_id);
          if (!linkedProduct) return;
          
          const linkedQuantity = link.quantity * item.quantity;
          const linkedProfit = (linkedProduct.price - (linkedProduct.buyPrice || 0)) * linkedQuantity;
          totalProfit += linkedProfit;
        });
    });
    
    return totalProfit;
  };

const handleSubmit = async () => {
  if (cart.length === 0) {
    setError("يجب إضافة منتجات للسلة أولاً");
    return;
  }

  try {
    setLoading(true);
    setError(null);
    
    // 1. التحقق من توفر المنتجات والكميات
    const availabilityCheck = await checkProductsAvailability();
    if (!availabilityCheck.available) {
      throw new Error(availabilityCheck.message);
    }

    // 2. تحديث الكميات في قاعدة البيانات
    await updateProductsQuantities();

    // 3. تسجيل عملية البيع
    const saleResult = await recordSale();
    
    if (saleResult.error) {
      throw saleResult.error;
    }

    setShowSuccessModal(true);
  } catch (err: any) {
    handleSaleError(err);
  } finally {
    setLoading(false);
  }
};

// الدوال المساعدة الجديدة
const checkProductsAvailability = async () => {
  const results = [];
  
  for (const item of cart) {
    const product = products.find(p => p.id === item.id);
    if (!product) {
      return {
        available: false,
        message: `المنتج غير موجود (ID: ${item.id})`
      };
    }

    if (product.quantity < item.quantity) {
      return {
        available: false,
        message: `الكمية غير كافية لـ ${product.name} (المطلوب: ${item.quantity}، المتاح: ${product.quantity})`
      };
    }

    // التحقق من المنتجات المرتبطة
    const linkedItems = linkedProducts.filter(lp => lp.main_product_id === item.id);
    for (const link of linkedItems) {
      const linkedProduct = products.find(p => p.id === link.linked_product_id);
      if (!linkedProduct) continue;

      const neededQuantity = link.quantity * item.quantity;
      if (linkedProduct.quantity < neededQuantity) {
        return {
          available: false,
          message: `الكمية غير كافية للمنتج المرتبط ${linkedProduct.name} (المطلوب: ${neededQuantity}، المتاح: ${linkedProduct.quantity})`
        };
      }
    }
  }

  return { available: true };
};

const updateProductsQuantities = async () => {
  const updates = [];

  for (const item of cart) {
    // تقليل كمية المنتج الأساسي
    updates.push(
      supabase.rpc('decrement_product_quantity', {
        product_id: item.id,
        decrement_by: item.quantity
      })
    );

    // تقليل كمية المنتجات المرتبطة
    const linkedItems = linkedProducts.filter(lp => lp.main_product_id === item.id);
    for (const link of linkedItems) {
      updates.push(
        supabase.rpc('decrement_product_quantity', {
          product_id: link.linked_product_id,
          decrement_by: link.quantity * item.quantity
        })
      );
    }
  }

  const results = await Promise.all(updates);
  results.forEach(result => {
    if (result.error) throw result.error;
  });
};


const recordSale = async () => {
  const salesData = [];
  
  for (const item of cart) {
    const product = products.find(p => p.id === item.id);
    if (!product) continue;

    salesData.push({
      product_id: item.id,
      price: product.price,
      buy_price: product.buyPrice || 0,
      quantity: item.quantity,
      profit: (product.price - (product.buyPrice || 0)) * item.quantity,
      created_at: new Date().toISOString()
    });

    // إضافة المنتجات المرتبطة
    const linkedItems = linkedProducts.filter(lp => lp.main_product_id === item.id);
    for (const link of linkedItems) {
      const linkedProduct = products.find(p => p.id === link.linked_product_id);
      if (!linkedProduct) continue;

      const linkedQuantity = link.quantity * item.quantity;
      salesData.push({
        product_id: link.linked_product_id,
        price: linkedProduct.price,
        buy_price: linkedProduct.buyPrice || 0,
        quantity: linkedQuantity,
        profit: (linkedProduct.price - (linkedProduct.buyPrice || 0)) * linkedQuantity,
        created_at: new Date().toISOString()
      });
    }
  }

  return await supabase.from('product_sales').insert(salesData);
};

const handleSaleError = (err: any) => {
  console.error("Sale processing failed:", {
    error: err,
    cartItems: cart.map(item => ({
      id: item.id,
      product: products.find(p => p.id === item.id)?.name,
      quantity: item.quantity
    })),
    time: new Date().toISOString()
  });

  setError(`
    فشل إتمام عملية البيع:
    ${err.message || 'سبب غير معروف'}
    الرجاء مراجعة السجلات لمزيد من التفاصيل
  `);
};

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setCart([]);
    onSaleComplete();
    onClose();
    Setproduct(0);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Sale Modal */}
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
    <div className="font-bold">خطأ في عملية البيع:</div>
    <div>{error}</div>

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
                  className={`bg-slate-700/50 p-3 rounded-lg border ${
                    product.quantity > 0 ? "border-slate-600" : "border-red-500/50"
                  }`}
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
                      <p className={`text-xs ${
                        product.quantity > 0 ? "text-slate-500" : "text-red-400"
                      }`}>
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
                      .map(link => {
                        const linkedProduct = products.find(p => p.id === link.linked_product_id);
                        if (!linkedProduct) return null;
                        
                        return (
                          <div
                            key={link.id}
                            className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-600/50"
                          >
                            <div className="flex items-center gap-2">
                              <LinkIcon className="h-3 w-3 text-blue-400" />
                              <span className="text-slate-300 text-sm">
                                {linkedProduct.name}
                              </span>
                              <span className="text-slate-400 text-xs">
                                ({link.quantity}x لكل وحدة)
                              </span>
                              <span className="text-slate-400 text-xs">
                                الكمية الإجمالية: {link.quantity * (cart.find(item => item.id === product.id)?.quantity || 0)}
                              </span>
                            </div>
                          </div>
                        );
                      })
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
                      <React.Fragment key={item.id}>
                        <div className="flex justify-between text-slate-300">
                          <span>{product.name} (×{item.quantity})</span>
                          <span>{(product.price * item.quantity).toLocaleString("ar-EG")} جنيه</span>
                        </div>
                        
                        {linkedProducts
                          .filter(lp => lp.main_product_id === product.id)
                          .map(link => {
                            const linkedProduct = products.find(p => p.id === link.linked_product_id);
                            if (!linkedProduct) return null;
                            
                            const linkedQuantity = link.quantity * item.quantity;
                            return (
                              <div key={link.id} className="flex justify-between text-slate-400 text-sm pl-4">
                                <span className="flex items-center gap-1">
                                  <LinkIcon className="h-3 w-3 text-blue-400" />
                                  {linkedProduct.name} (×{linkedQuantity})
                                </span>
                                <span>{(linkedProduct.price * linkedQuantity).toLocaleString("ar-EG")} جنيه</span>
                              </div>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}
                  <div className="border-t border-slate-600 pt-2 mt-2">
                    <div className="flex justify-between text-white font-bold">
                      <span>الإجمالي:</span>
                      <span>{calculateTotal().toLocaleString("ar-EG")} جنيه</span>
                    </div>
                    <div className="flex justify-between text-green-400 text-sm mt-1">
                      <span>صافي الربح:</span>
                      <span>{calculateProfit().toLocaleString("ar-EG")} جنيه</span>
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">تمت العملية بنجاح!</h3>
              <p className="text-slate-300 mb-2">
                إجمالي المبلغ: <span className="font-bold text-white">{saleTotal.toLocaleString("ar-EG")} جنيه</span>
              </p>
              <p className="text-slate-300 mb-4">
                صافي الربح: <span className="font-bold text-green-400">{saleProfit.toLocaleString("ar-EG")} جنيه</span>
              </p>
              <button
                onClick={closeSuccessModal}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                تم
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};