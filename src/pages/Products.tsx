import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  Package,
  Edit2,
  Trash2,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Link as LinkIcon,
  ChevronDown,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Category = {
  id: string;
  name: string;
  created_at?: string;
};

type Product = {
  id: string;
  name: string;
  buyPrice: string | null;
  price: number;
  quantity: number;
  category_id?: string | null;
  category?: Category | null;
};

type LinkedProduct = {
  id: string;
  mainProductId: string;
  linkedProductId: string;
  quantity: number;
  linkedProduct?: Product;
};

type CartItem = Product & {
  quantity: number;
  linkedItems?: CartItem[];
};

export const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<LinkedProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    buyPrice: "",
    price: "",
    quantity: "",
    categoryId: "",
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [selectedLinkedProducts, setSelectedLinkedProducts] = useState<
    { productId: string; quantity: number }[]
  >([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchLinkedProducts();
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Error loading categories");
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*, category:category_id(*)");

      if (error) throw error;

      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Error loading products");
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("linked_products")
        .select(`*, linkedProduct:linked_product_id(*)`)
        .order("created_at");

      if (error) throw error;

      setLinkedProducts(
        data.map((item) => ({
          id: item.id,
          mainProductId: item.main_product_id,
          linkedProductId: item.linked_product_id,
          quantity: item.quantity,
          linkedProduct: item.linkedProduct,
        }))
      );
    } catch (err) {
      console.error("Error fetching linked products:", err);
      setError("Error loading linked products");
    }
  };

  const handleEdit = async (product: Product) => {
    try {
      setLoading(true);
      const { data: linkedData, error: linkedError } = await supabase
        .from("linked_products")
        .select(`id, linked_product_id, quantity`)
        .eq("main_product_id", product.id);

      if (linkedError) throw linkedError;

      setEditingProduct(product);
      setFormData({
        name: product.name,
        buyPrice: product.buyPrice || "",
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        categoryId: product.category_id || "",
      });

      setSelectedLinkedProducts(
        linkedData.map((item) => ({
          productId: item.linked_product_id,
          quantity: item.quantity,
        }))
      );
    } catch (err) {
      console.error("Error fetching linked products:", err);
      setError("Error loading linked products");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please login first");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const productData = {
        name: formData.name,
        buyPrice: formData.buyPrice || null,
        price: Number(formData.price),
        quantity: Number(formData.quantity),
        category_id: formData.categoryId || null,
      };

      if (editingProduct) {
        const { error: productError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (productError) throw productError;

        const { error: deleteError } = await supabase
          .from("linked_products")
          .delete()
          .eq("main_product_id", editingProduct.id);

        if (deleteError) throw deleteError;

        if (selectedLinkedProducts.length > 0) {
          const linkedProductsData = selectedLinkedProducts.map((item) => ({
            main_product_id: editingProduct.id,
            linked_product_id: item.productId,
            quantity: item.quantity,
          }));

          const { error: linkError } = await supabase
            .from("linked_products")
            .insert(linkedProductsData);

          if (linkError) throw linkError;
        }
      } else {
        const { data: newProduct, error: productError } = await supabase
          .from("products")
          .insert([productData])
          .select()
          .single();

        if (productError) throw productError;

        if (selectedLinkedProducts.length > 0) {
          const linkedProductsData = selectedLinkedProducts.map((item) => ({
            main_product_id: newProduct.id,
            linked_product_id: item.productId,
            quantity: item.quantity,
          }));

          const { error: linkError } = await supabase
            .from("linked_products")
            .insert(linkedProductsData);

          if (linkError) throw linkError;
        }
      }

      await fetchProducts();
      await fetchLinkedProducts();
      setFormData({
        name: "",
        buyPrice: "",
        price: "",
        quantity: "",
        categoryId: "",
      });
      setSelectedLinkedProducts([]);
      setEditingProduct(null);
      setShowCategoryDropdown(false);
    } catch (err: any) {
      console.error("Error saving product:", err);
      setError(err.message || "Error saving product");
    } finally {
      setLoading(false);
    }
  };

  const addNewCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .insert([{ name: newCategoryName.trim() }])
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setFormData({ ...formData, categoryId: data.id });
      setNewCategoryName("");
      setShowAddCategoryForm(false);
    } catch (err: any) {
      console.error("Error adding category:", err);
      setError(err.message || "Error adding category");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      setError("This product is currently unavailable");
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);

      if (existingItem) {
        if (existingItem.quantity + 1 > product.quantity) {
          setError("Sorry, requested quantity not available");
          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                linkedItems: getLinkedItems(product.id, item.quantity + 1),
              }
            : item
        );
      }

      const linkedItems = getLinkedItems(product.id, 1);
      return [...currentCart, { ...product, quantity: 1, linkedItems }];
    });
  };

  const getLinkedItems = (productId: string, mainQuantity: number): CartItem[] => {
    const productLinks = linkedProducts.filter(
      (link) => link.mainProductId === productId
    );

    return productLinks
      .map((link) => {
        const linkedProduct = products.find((p) => p.id === link.linkedProductId);
        if (!linkedProduct) return null;

        return {
          ...linkedProduct,
          quantity: link.quantity * mainQuantity,
        };
      })
      .filter((item): item is CartItem => item !== null);
  };

  const removeFromCart = (productId: string) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === productId);
      if (!existingItem) return currentCart;

      if (existingItem.quantity === 1) {
        return currentCart.filter((item) => item.id !== productId);
      }

      return currentCart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: item.quantity - 1,
              linkedItems: getLinkedItems(productId, item.quantity - 1),
            }
          : item
      );
    });
  };

  const handleAddLinkedProduct = () => {
    setSelectedLinkedProducts([
      ...selectedLinkedProducts,
      { productId: "", quantity: 1 },
    ]);
  };

  const handleRemoveLinkedProduct = (index: number) => {
    setSelectedLinkedProducts(
      selectedLinkedProducts.filter((_, i) => i !== index)
    );
  };

  const updateLinkedProduct = (
    index: number,
    field: "productId" | "quantity",
    value: string | number
  ) => {
    setSelectedLinkedProducts(
      selectedLinkedProducts.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} EGP`;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          ادارة المنتجات
        </h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        <div>فئات</div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingProduct ? "تعديل المنتج" : "ادخل منتج جديد"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  اسم المنتج
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ادخل اسم المنتج"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  سعر الجملة
                </label>
                <input
                  type="number"
                  value={formData.buyPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, buyPrice: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ادخل سعر الجملة"
                  disabled={loading}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  السعر (EGP)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ادخل السعر (EGP)"
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
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أدخل الكمية"
                  min="0"
                  disabled={loading}
                  required
                />
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  الفئة
                </label>
                <div
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center cursor-pointer"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <span>
                    {formData.categoryId
                      ? categories.find((c) => c.id === formData.categoryId)
                          ?.name
                      : "اختر الفئة"}
                  </span>
                  <ChevronDown className="h-5 w-5" />
                </div>

                {showCategoryDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="px-4 py-2 hover:bg-slate-700 cursor-pointer"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            categoryId: category.id,
                          });
                          setShowCategoryDropdown(false);
                        }}
                      >
                        {category.name}
                      </div>
                    ))}
                    <div
                      className="px-4 py-2 text-blue-400 hover:bg-slate-700 cursor-pointer border-t border-slate-700"
                      onClick={() => {
                        setShowAddCategoryForm(true);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      + Add New Category
                    </div>
                  </div>
                )}
              </div>

              {/* Add New Category Form */}
              {showAddCategoryForm && (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="text-white mb-3">Add New Category</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="ادخل فئة جديدة"
                    />
                    <button
                      type="button"
                      onClick={addNewCategory}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg"
                      disabled={loading}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryForm(false)}
                      className="bg-slate-700 text-white px-3 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Linked Products Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-blue-200">
                    المنتجات المرتبطة
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLinkedProduct}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة منتج مرتبط
                  </button>
                </div>

                {selectedLinkedProducts.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-center bg-slate-800/50 p-3 rounded-lg"
                  >
                    <select
                      value={item.productId}
                      onChange={(e) =>
                        updateLinkedProduct(index, "productId", e.target.value)
                      }
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="">Select product</option>
                      {products
                        .filter((p) => p.id !== editingProduct?.id)
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLinkedProduct(
                          index,
                          "quantity",
                          parseInt(e.target.value)
                        )
                      }
                      min="1"
                      className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLinkedProduct(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="h-5 w-5" />
                  {loading
                    ? "Saving..."
                    : editingProduct
                    ? "Update Product"
                    : "Add Product"}
                </button>
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      setFormData({
                        name: "",
                        buyPrice: "",
                        price: "",
                        quantity: "",
                        categoryId: "",
                      });
                      setSelectedLinkedProducts([]);
                    }}
                    className="flex-1 bg-slate-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Products List */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6">
              قائمة المنتجات
            </h2>
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
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{product.name}</p>
                        {linkedProducts.some(
                          (lp) => lp.mainProductId === product.id
                        ) && (
                          <LinkIcon className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      {product.category && (
                        <p className="text-purple-300 text-sm">
                          Category: {product.category.name}
                        </p>
                      )}

                      <div className="flex items-center gap-2">

                      
                      <p className="text-black text-sm bg-red-500 rounded-md px-1 inline-block">
                        {product.buyPrice == null
                          ? "لا يوجد سعر جملة"
                          : `سعر الجملة: ${formatCurrency(
                              parseFloat(product.buyPrice)
                            )}`}
                      </p>
                      <p className="text-black rounded-md text-sm bg-green-500 px-1 inline-block">
                        السعر: {formatCurrency(product.price)}
                      </p>
                      </div>
                      <p className="text-blue-200 text-sm">
                       الكمية المتاحة: {product.quantity}
                      </p>

                      {/* Show linked products */}
                      {linkedProducts
                        .filter((lp) => lp.mainProductId === product.id)
                        .map((lp) => (
                          <p
                            key={lp.id}
                            className="text-slate-400 text-sm flex items-center gap-1"
                          >
                            <LinkIcon className="h-3 w-3" />
                            {lp.linkedProduct?.name} ({lp.quantity}x)
                          </p>
                        ))}
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
                        onClick={() => addToCart(product)}
                        className={`p-2 ${
                          product.quantity > 0
                            ? "text-green-400 hover:bg-slate-700"
                            : "text-gray-500 cursor-not-allowed"
                        } rounded-lg transition-colors`}
                        disabled={product.quantity === 0 || loading}
                      >
                        <ShoppingCart className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
              {!loading && products.length === 0 && (
                <p className="text-center text-blue-200">No products found</p>
              )}
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-6">
                Shopping Cart
              </h2>
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-white font-medium">{item.name}</p>
                        {item.category && (
                          <p className="text-purple-300 text-sm">
                            Category: {item.category.name}
                          </p>
                        )}
                        <p className="text-blue-200 text-sm">
                          {item.quantity} × {formatCurrency(item.price)} ={" "}
                          {formatCurrency(item.quantity * item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-white px-2">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="p-2 text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Linked Items */}
                    {item.linkedItems?.map((linkedItem) => (
                      <div
                        key={linkedItem.id}
                        className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50 flex items-center justify-between ml-6"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="h-3 w-3 text-blue-400" />
                            <p className="text-slate-300">{linkedItem.name}</p>
                          </div>
                          <p className="text-slate-400 text-sm">
                            {linkedItem.quantity} ×{" "}
                            {formatCurrency(linkedItem.price)} ={" "}
                            {formatCurrency(
                              linkedItem.quantity * linkedItem.price
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                <div className="pt-4 border-t border-slate-700">
                  <div className="flex justify-between items-center text-xl font-bold text-white">
                    <span>Total:</span>
                    <span>
                      {formatCurrency(
                        cart.reduce((total, item) => {
                          const itemTotal = item.price * item.quantity;
                          const linkedItemsTotal = (
                            item.linkedItems || []
                          ).reduce(
                            (sum, linkedItem) =>
                              sum + linkedItem.price * linkedItem.quantity,
                            0
                          );
                          return total + itemTotal + linkedItemsTotal;
                        }, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};