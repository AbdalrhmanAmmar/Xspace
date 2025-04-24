import React, { useState, useEffect } from 'react';
import { PlusCircle, Package, Edit2, Trash2, ShoppingCart } from 'lucide-react';
import type { Product, CartItem, Checkout } from '../types/product';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    quantity: '',
  });

  // سعر الساعة بالجنيه المصري
  const HOUR_RATE = 100;

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('حدث خطأ أثناء تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const productData = {
        name: formData.name,
        price: Number(formData.price),
        quantity: Number(formData.quantity),
      };

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        // Insert new product
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
      }

      // Refresh products list
      await fetchProducts();

      // Reset form
      setFormData({ name: '', price: '', quantity: '' });
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ المنتج');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchProducts();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.message || 'حدث خطأ أثناء حذف المنتج');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const existingCartItem = cart.find(item => item.id === product.id);
    const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
    
    if (currentCartQuantity + 1 <= product.quantity) {
      setCart(currentCart => {
        const existingItem = currentCart.find(item => item.id === product.id);
        if (existingItem) {
          return currentCart.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...currentCart, { ...product, quantity: 1 }];
      });
    } else {
      setError('عذراً، الكمية المطلوبة غير متوفرة');
    }
  };

  const startCheckout = () => {
    const startTime = new Date();
    setCheckout({
      products: cart,
      startTime,
      endTime: null,
      hallPrice: 0,
      totalPrice: cart.reduce((total, item) => total + (item.price * item.quantity), 0),
    });
  };

  const finishCheckout = async () => {
    if (checkout) {
      try {
        setLoading(true);
        const endTime = new Date();
        const hours = Math.ceil((endTime.getTime() - checkout.startTime.getTime()) / (1000 * 60 * 60));
        const hallPrice = hours * HOUR_RATE;
        const productsPrice = checkout.products.reduce((total, item) => total + (item.price * item.quantity), 0);

        // Update product quantities in database
        for (const item of checkout.products) {
          const product = products.find(p => p.id === item.id);
          if (!product) continue;

          const newQuantity = product.quantity - item.quantity;
          const { error } = await supabase
            .from('products')
            .update({ 
              quantity: newQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          if (error) throw error;
        }

        setCheckout({
          ...checkout,
          endTime,
          hallPrice,
          totalPrice: hallPrice + productsPrice,
        });
        setCart([]);
        
        await fetchProducts();
      } catch (err: any) {
        console.error('Error finishing checkout:', err);
        setError(err.message || 'حدث خطأ أثناء إتمام عملية البيع');
      } finally {
        setLoading(false);
      }
    }
  };

  // تنسيق العملة بالجنيه المصري
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('ar-EG')} جنيه`;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">إدارة المنتجات</h1>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* نموذج إضافة/تعديل المنتج */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  اسم المنتج
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أدخل اسم المنتج"
                  dir="rtl"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  السعر (جنيه)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أدخل السعر بالجنيه المصري"
                  dir="rtl"
                  disabled={loading}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  الكمية
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أدخل الكمية"
                  dir="rtl"
                  min="0"
                  disabled={loading}
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="h-5 w-5" />
                  {loading ? 'جاري الحفظ...' : editingProduct ? 'تحديث المنتج' : 'إضافة المنتج'}
                </button>
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      setFormData({ name: '', price: '', quantity: '' });
                    }}
                    className="flex-1 bg-slate-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                    disabled={loading}
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* قائمة المنتجات */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6">قائمة المنتجات</h2>
            <div className="space-y-4">
              {loading && products.length === 0 ? (
                <p className="text-center text-blue-200">جاري تحميل المنتجات...</p>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-white font-medium">{product.name}</p>
                      <p className="text-blue-200 text-sm">
                        {formatCurrency(product.price)}
                      </p>
                      <p className="text-blue-200 text-sm">
                        الكمية المتوفرة: {product.quantity}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                        disabled={loading}
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        disabled={loading}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => addToCart(product)}
                        className={`p-2 ${product.quantity > 0 ? 'text-green-400 hover:bg-slate-700' : 'text-gray-500 cursor-not-allowed'} rounded-lg transition-colors`}
                        disabled={product.quantity === 0 || loading}
                      >
                        <ShoppingCart className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
              {!loading && products.length === 0 && (
                <p className="text-center text-blue-200">لا توجد منتجات حالياً</p>
              )}
            </div>
          </div>

          {/* سلة المشتريات والحساب */}
          {(cart.length > 0 || checkout) && (
            <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-6">الفاتورة</h2>
              
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-blue-200 text-sm">
                        {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)}
                      </p>
                    </div>
                  </div>
                ))}

                {checkout && (
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="space-y-2">
                      <p className="text-white">
                        وقت البدء: {checkout.startTime.toLocaleTimeString('ar-SA')}
                      </p>
                      {checkout.endTime && (
                        <>
                          <p className="text-white">
                            وقت الانتهاء: {checkout.endTime.toLocaleTimeString('ar-SA')}
                          </p>
                          <p className="text-white">
                            تكلفة القاعة: {formatCurrency(checkout.hallPrice)}
                          </p>
                          <p className="text-white font-bold">
                            المجموع الكلي: {formatCurrency(checkout.totalPrice)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {!checkout && (
                  <button
                    onClick={startCheckout}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={loading}
                  >
                    بدء الحساب
                  </button>
                )}

                {checkout && !checkout.endTime && (
                  <button
                    onClick={finishCheckout}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    {loading ? 'جاري إتمام العملية...' : 'إنهاء الحساب'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};